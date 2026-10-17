-- Keep confirmed service tickets as limited security records when an account
-- is deleted. All other account-related cleanup is scoped to one user and is
-- performed transactionally by prepare_account_deletion_impl below.

-- Tickets become independent, read-only snapshots rather than children of jobs.
alter table public.tickets add column id uuid default gen_random_uuid();
alter table public.tickets add column client_id uuid;
alter table public.tickets add column provider_id uuid;
alter table public.tickets add column archived_status text;
alter table public.tickets add column archived_at timestamptz;

update public.tickets t
set client_id = j.client_id,
    provider_id = j.provider_id
from public.jobs j
where t.job_id = j.id;

update public.tickets set id = gen_random_uuid() where id is null;
alter table public.tickets alter column id set not null;
alter table public.tickets drop constraint tickets_pkey;
alter table public.tickets alter column job_id drop not null;
alter table public.tickets add constraint tickets_pkey primary key (id);

alter table public.tickets drop constraint tickets_job_id_fkey;
alter table public.tickets add constraint tickets_job_id_fkey
  foreign key (job_id) references public.jobs(id) on delete set null;
alter table public.tickets add constraint tickets_client_id_fkey
  foreign key (client_id) references auth.users(id) on delete set null;
alter table public.tickets add constraint tickets_provider_id_fkey
  foreign key (provider_id) references auth.users(id) on delete set null;
create unique index tickets_active_job_unique on public.tickets(job_id) where job_id is not null;

create function private.set_ticket_participants()
returns trigger language plpgsql set search_path = '' as $$
begin
  select j.client_id, j.provider_id
    into new.client_id, new.provider_id
  from public.jobs j
  where j.id = new.job_id;
  if not found then
    raise exception 'No se encontró el trabajo para este ticket.';
  end if;
  return new;
end $$;
revoke all on function private.set_ticket_participants() from public, anon, authenticated;
create trigger set_ticket_participants_before_insert
  before insert on public.tickets
  for each row execute function private.set_ticket_participants();

create function private.capture_ticket_archive_before_job_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.tickets
  set archived_status = old.status,
      archived_at = coalesce(archived_at, now())
  where job_id = old.id;
  return old;
end $$;
revoke all on function private.capture_ticket_archive_before_job_delete() from public, anon, authenticated;
create trigger capture_ticket_archive_before_job_delete
  before delete on public.jobs
  for each row execute function private.capture_ticket_archive_before_job_delete();

drop policy if exists tickets_read on public.tickets;
create policy tickets_read on public.tickets for select to authenticated
  using (client_id = (select auth.uid()) or provider_id = (select auth.uid()));

-- A server-only operation cleans only rows owned by, or shared with, the
-- authenticated account being deleted. It intentionally leaves ticket rows.
create function private.prepare_account_deletion_impl(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_job_ids uuid[] := array[]::uuid[];
  v_client_request_ids uuid[] := array[]::uuid[];
  v_provider_request_ids uuid[] := array[]::uuid[];
  v_review_job_ids uuid[] := array[]::uuid[];
  v_report_ids uuid[] := array[]::uuid[];
begin
  if p_user_id is null or not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'account_not_found';
  end if;

  select coalesce(array_agg(j.id), array[]::uuid[])
    into v_job_ids
  from public.jobs j
  where j.client_id = p_user_id or j.provider_id = p_user_id;

  select coalesce(array_agg(r.id), array[]::uuid[])
    into v_client_request_ids
  from public.service_requests r
  where r.client_id = p_user_id;

  select coalesce(array_agg(distinct j.request_id), array[]::uuid[])
    into v_provider_request_ids
  from public.jobs j
  where j.provider_id = p_user_id and j.client_id <> p_user_id;

  select coalesce(array_agg(distinct r.job_id), array[]::uuid[])
    into v_review_job_ids
  from public.reviews r
  where r.job_id = any(v_job_ids)
     or r.client_id = p_user_id
     or r.provider_id = p_user_id;

  select coalesce(array_agg(r.id), array[]::uuid[])
    into v_report_ids
  from public.service_reports r
  where r.job_id = any(v_job_ids) or r.reporter_id = p_user_id;

  -- Cancel contracted services left without their selected provider and
  -- remove the address that had been shared for those jobs.
  update public.service_requests
  set status = 'cancelled'
  where id = any(v_provider_request_ids) and status = 'contracted';

  update public.report_appeals set reviewer_id = null where reviewer_id = p_user_id;
  delete from public.report_appeals
  where report_id = any(v_report_ids) or appellant_id = p_user_id;
  delete from public.service_reports where id = any(v_report_ids);

  delete from public.conversation_messages
  where job_id = any(v_job_ids) or sender_id = p_user_id;
  delete from private.review_actions
  where reviewer_id = p_user_id or job_id = any(v_review_job_ids);
  delete from public.reviews
  where job_id = any(v_review_job_ids)
     or client_id = p_user_id
     or provider_id = p_user_id;
  delete from private.provider_reviews
  where reviewer_id = p_user_id or provider_id = p_user_id;
  delete from public.job_events
  where job_id = any(v_job_ids) or actor_id = p_user_id;

  -- The trigger snapshots each job's status; the FK then detaches the ticket.
  delete from public.jobs where id = any(v_job_ids);

  delete from public.quote_versions
  where request_id = any(v_client_request_ids) or provider_id = p_user_id;
  delete from public.request_invites
  where request_id = any(v_client_request_ids) or provider_id = p_user_id;
  delete from public.request_addresses
  where client_id = p_user_id
     or request_id = any(v_client_request_ids)
     or request_id = any(v_provider_request_ids);
  delete from public.service_requests where client_id = p_user_id;

  delete from public.opportunity_interests oi
  where oi.provider_id = p_user_id
     or exists (
       select 1 from public.opportunities o
       where o.id = oi.opportunity_id and o.client_id = p_user_id
     );
  delete from public.opportunities where client_id = p_user_id;

  delete from public.push_outbox
  where recipient_id = p_user_id
     or notification_id in (select n.id from public.notifications n where n.recipient_id = p_user_id);
  delete from public.notifications where recipient_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.push_devices where user_id = p_user_id;

  delete from public.provider_categories where provider_id = p_user_id;
  delete from private.staff where user_id = p_user_id;
  delete from public.provider_profiles where id = p_user_id;
  delete from public.profiles where id = p_user_id;
end $$;
revoke all on function private.prepare_account_deletion_impl(uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.prepare_account_deletion_impl(uuid) to service_role;

create function public.prepare_account_deletion(p_user_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform private.prepare_account_deletion_impl(p_user_id);
end $$;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
