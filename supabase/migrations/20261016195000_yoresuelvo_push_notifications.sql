-- Notificaciones push por instalación, vinculadas al usuario autenticado.
-- El token FCM solo se registra después del consentimiento del usuario.

alter table public.notification_preferences
  drop constraint if exists notification_preferences_delivery_unconfigured;
alter table public.notification_preferences
  add constraint notification_preferences_email_unconfigured
  check (email_updates = false) not valid;
alter table public.notification_preferences
  validate constraint notification_preferences_email_unconfigured;
grant update(push_updates) on public.notification_preferences to authenticated;

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  installation_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('web','android')),
  token text not null check (char_length(token) between 80 and 4096),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_devices_user_active_idx on public.push_devices(user_id, platform) where is_active;
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant select(id,installation_id,platform,is_active) on public.push_devices to authenticated;
create policy push_devices_owner_read on public.push_devices
  for select to authenticated using (user_id = (select auth.uid()));

create table public.push_outbox (
  id bigint generated always as identity primary key,
  notification_id bigint not null unique references public.notifications(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  claimed_until timestamptz,
  next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0,
  sent_at timestamptz,
  last_error text
);
create index push_outbox_pending_idx on public.push_outbox(next_attempt_at, id)
  where sent_at is null;
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;
grant select, insert, update on public.push_outbox to service_role;
create policy push_outbox_worker_only on public.push_outbox
  for all to service_role using (true) with check (true);

create or replace function public.register_push_device(
  p_token text, p_platform text, p_installation_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_installation_id is null or p_platform not in ('web','android')
     or p_token is null or char_length(p_token) not between 80 and 4096 then
    raise exception 'invalid_push_device';
  end if;
  insert into public.push_devices(installation_id,user_id,platform,token,is_active,last_seen_at)
  values (p_installation_id,v_user,p_platform,p_token,true,now())
  on conflict (installation_id) do update set
    user_id=excluded.user_id, platform=excluded.platform, token=excluded.token,
    is_active=true, last_seen_at=now()
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.register_push_device(text,text,uuid) from public, anon;
grant execute on function public.register_push_device(text,text,uuid) to authenticated;

create or replace function public.deactivate_push_device(p_installation_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  update public.push_devices set is_active=false, last_seen_at=now()
   where installation_id=p_installation_id and user_id=auth.uid();
end;
$$;
revoke all on function public.deactivate_push_device(uuid) from public, anon;
grant execute on function public.deactivate_push_device(uuid) to authenticated;

create or replace function public.enqueue_yoresuelvo_push()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.notification_preferences p
     where p.user_id=new.recipient_id and p.push_updates
  ) then
    insert into public.push_outbox(notification_id,recipient_id)
    values (new.id,new.recipient_id)
    on conflict (notification_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.enqueue_yoresuelvo_push() from public, anon, authenticated;
drop trigger if exists enqueue_yoresuelvo_push_trigger on public.notifications;
create trigger enqueue_yoresuelvo_push_trigger
  after insert on public.notifications for each row execute function public.enqueue_yoresuelvo_push();

create or replace function public.claim_yoresuelvo_push_batch()
returns table (
  id bigint, notification_id bigint, recipient_id uuid, title text, body text, attempts integer
)
language sql security definer set search_path = '' as $$
  with candidates as (
    select q.id from public.push_outbox q
     where q.sent_at is null and q.next_attempt_at <= now()
       and (q.claimed_until is null or q.claimed_until < now())
     order by q.id limit 100 for update skip locked
  ), claimed as (
    update public.push_outbox q set claimed_until=now()+interval '2 minutes', attempts=q.attempts+1
     from candidates c where q.id=c.id
     returning q.id,q.notification_id,q.recipient_id,q.attempts
  )
  select c.id,c.notification_id,c.recipient_id,n.title,n.body,c.attempts
    from claimed c join public.notifications n on n.id=c.notification_id;
$$;
revoke all on function public.claim_yoresuelvo_push_batch() from public, anon, authenticated;
grant execute on function public.claim_yoresuelvo_push_batch() to service_role;

create or replace function public.finish_yoresuelvo_push(
  p_id bigint, p_error text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_error is null then
    update public.push_outbox set sent_at=now(),claimed_until=null,last_error=null where id=p_id;
  else
    update public.push_outbox set claimed_until=null,
      next_attempt_at=now()+least(interval '60 minutes', interval '1 minute' * power(2,least(attempts,6))),
      last_error=left(p_error,240)
     where id=p_id and sent_at is null;
  end if;
end;
$$;
revoke all on function public.finish_yoresuelvo_push(bigint,text) from public, anon, authenticated;
grant execute on function public.finish_yoresuelvo_push(bigint,text) to service_role;

grant select, update on public.push_devices to service_role;
grant select on public.notification_preferences, public.notifications to service_role;
