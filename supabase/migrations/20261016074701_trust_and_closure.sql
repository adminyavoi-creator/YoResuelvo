-- Cierre verificable, reseñas por trabajo y operación. No maneja pagos.
create table public.job_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs(id),
  actor_id uuid references auth.users(id),
  previous_status text,
  next_status text not null,
  reason text,
  created_at timestamptz not null default now()
);
create index job_events_job_idx on public.job_events(job_id,created_at);
create table public.reviews (
  job_id uuid primary key references public.jobs(id),
  client_id uuid not null references auth.users(id),
  provider_id uuid not null references public.provider_profiles(id),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 20 and 1000),
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create index reviews_provider_idx on public.reviews(provider_id,created_at desc) where published;
create table private.review_actions (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.reviews(job_id),
  reviewer_id uuid not null references auth.users(id),
  published boolean not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create table public.service_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  reporter_id uuid not null references auth.users(id),
  reason text not null check (char_length(trim(reason)) between 10 and 1000),
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  created_at timestamptz not null default now()
);
create index reports_open_idx on public.service_reports(created_at) where status='open';
create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references auth.users(id),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_id,created_at desc);

alter table public.job_events enable row level security;
alter table public.reviews enable row level security;
alter table public.service_reports enable row level security;
alter table public.notifications enable row level security;
alter table private.review_actions enable row level security;
revoke all on public.job_events,public.reviews,public.service_reports,public.notifications from anon,authenticated;
grant select on public.job_events,public.reviews,public.service_reports,public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

create policy events_participants on public.job_events for select to authenticated
  using (exists (select 1 from public.jobs j where j.id=job_id
    and (j.client_id=(select auth.uid()) or j.provider_id=(select auth.uid()))));
create policy reviews_participants on public.reviews for select to authenticated
  using (client_id=(select auth.uid()) or provider_id=(select auth.uid()));
create policy reports_author on public.service_reports for select to authenticated
  using (reporter_id=(select auth.uid()));
create policy notifications_owner on public.notifications for select to authenticated
  using (recipient_id=(select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (recipient_id=(select auth.uid()))
  with check (recipient_id=(select auth.uid()));

create function private.record_job_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then
    insert into public.job_events(job_id,actor_id,previous_status,next_status,reason)
    values(new.id,auth.uid(),null,new.status,null);
    insert into public.notifications(recipient_id,title,body)
    values(new.provider_id,'Servicio acordado','Tienes un servicio confirmado; revisa el ticket.');
  elsif new.status is distinct from old.status then
    insert into public.job_events(job_id,actor_id,previous_status,next_status,reason)
    values(new.id,auth.uid(),old.status,new.status,nullif(current_setting('app.job_reason',true),''));
    insert into public.notifications(recipient_id,title,body)
    values(case when auth.uid()=new.client_id then new.provider_id else new.client_id end,
      'Estado de servicio actualizado','Revisa el estado del servicio en YoResuelvo!.');
  end if;
  return new;
end $$;
create trigger jobs_audit after insert or update of status on public.jobs
  for each row execute function private.record_job_event();

create function private.notify_quote()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.notifications(recipient_id,title,body)
    select r.client_id,'Nueva cotización','Revisa la versión '||new.version||' de una cotización.'
    from public.service_requests r where r.id=new.request_id;
  return new;
end $$;
create trigger quotes_notify after insert on public.quote_versions
  for each row execute function private.notify_quote();

create function private.set_job_status_impl(p_job_id uuid,p_next text,p_reason text default null)
returns void language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype; v_actor uuid:=auth.uid(); v_staff boolean;
begin
  if v_actor is null then raise exception 'Inicia sesión.'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Servicio no encontrado.'; end if;
  v_staff := exists (select 1 from private.staff s where s.user_id=v_actor and s.role in ('moderator','admin'));
  if not (
    (v_actor=v_job.provider_id and
      ((v_job.status='confirmed' and p_next='scheduled' and v_job.scheduled_at is not null)
       or (v_job.status in ('confirmed','scheduled') and p_next='in_progress')
       or (v_job.status='in_progress' and p_next='completion_reported')
       or (v_job.status in ('confirmed','scheduled','in_progress','completion_reported') and p_next='disputed')))
    or (v_actor=v_job.client_id and
      ((v_job.status='completion_reported' and p_next='completed')
       or (v_job.status in ('confirmed','scheduled') and p_next='cancelled')
       or (v_job.status in ('confirmed','scheduled','in_progress','completion_reported') and p_next='disputed')))
    or (v_staff and v_job.status='disputed' and p_next in ('completed','cancelled'))
  ) then raise exception 'Esta transición no está permitida.'; end if;
  if p_next in ('disputed','cancelled') and char_length(trim(coalesce(p_reason,''))) < 10 then
    raise exception 'Explica el motivo con al menos diez caracteres.';
  end if;
  if v_staff and v_job.status='disputed' and char_length(trim(coalesce(p_reason,''))) < 10 then
    raise exception 'Registra el motivo de la resolución.';
  end if;
  perform set_config('app.job_reason',coalesce(left(trim(p_reason),1000),''),true);
  update public.jobs set status=p_next where id=p_job_id;
  if p_next='cancelled' then update public.service_requests set status='cancelled' where id=v_job.request_id; end if;
  if p_next='disputed' then
    insert into public.service_reports(job_id,reporter_id,reason)
    values(p_job_id,v_actor,left(trim(p_reason),1000));
  elsif v_staff and v_job.status='disputed' then
    update public.service_reports set status='resolved',resolution=left(trim(coalesce(p_reason,'')),1000)
    where job_id=p_job_id and status='open';
  end if;
end $$;
create function public.set_job_status(p_job_id uuid,p_next text,p_reason text default null)
returns void language sql security invoker set search_path='' as $$
  select private.set_job_status_impl(p_job_id,p_next,p_reason)
$$;

create function private.create_review_impl(p_job_id uuid,p_rating smallint,p_body text)
returns void language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;
begin
  select * into v_job from public.jobs where id=p_job_id;
  if not found or v_job.client_id<>auth.uid() or v_job.status<>'completed' then
    raise exception 'Solo el cliente de un servicio completado puede reseñar.';
  end if;
  insert into public.reviews(job_id,client_id,provider_id,rating,body)
    values(p_job_id,v_job.client_id,v_job.provider_id,p_rating,trim(p_body));
  insert into public.notifications(recipient_id,title,body)
    values(v_job.provider_id,'Nueva reseña','El cliente ha publicado una reseña sobre el trabajo.');
end $$;
create function public.create_review(p_job_id uuid,p_rating smallint,p_body text)
returns void language sql security invoker set search_path='' as $$
  select private.create_review_impl(p_job_id,p_rating,p_body)
$$;

create function private.published_reviews_impl()
returns table(provider_id uuid,rating smallint,body text,created_at timestamptz)
language sql security definer set search_path='' as $$
  select r.provider_id,r.rating,r.body,r.created_at from public.reviews r
    join public.provider_profiles p on p.id=r.provider_id
    where r.published and p.approval_status='approved'
    order by r.created_at desc limit 1000
$$;
create function public.published_reviews()
returns table(provider_id uuid,rating smallint,body text,created_at timestamptz)
language sql security invoker set search_path='' as $$
  select * from private.published_reviews_impl()
$$;

create function private.pending_reports_impl()
returns table(id uuid,job_id uuid,reason text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from private.staff s where s.user_id=auth.uid()
    and s.role in ('moderator','admin')) then raise exception 'Acceso denegado.'; end if;
  return query select r.id,r.job_id,r.reason,r.created_at
    from public.service_reports r where r.status='open' order by r.created_at;
end $$;
create function public.pending_reports()
returns table(id uuid,job_id uuid,reason text,created_at timestamptz)
language sql security invoker set search_path='' as $$
  select * from private.pending_reports_impl()
$$;

create function private.moderate_review_impl(p_job_id uuid,p_published boolean,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from private.staff s where s.user_id=auth.uid()
    and s.role in ('moderator','admin')) then raise exception 'Acceso denegado.'; end if;
  if char_length(trim(coalesce(p_reason,''))) < 10 then raise exception 'Indica el motivo.'; end if;
  update public.reviews set published=p_published where job_id=p_job_id;
  if not found then raise exception 'Reseña no encontrada.'; end if;
  insert into private.review_actions(job_id,reviewer_id,published,reason)
    values(p_job_id,auth.uid(),p_published,trim(p_reason));
end $$;
create function public.moderate_review(p_job_id uuid,p_published boolean,p_reason text)
returns void language sql security invoker set search_path='' as $$
  select private.moderate_review_impl(p_job_id,p_published,p_reason)
$$;

-- La función de evento de la plataforma no debe aparecer como RPC ejecutable.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.set_job_status(uuid,text,text),public.create_review(uuid,smallint,text),
  public.published_reviews(),public.pending_reports(),public.moderate_review(uuid,boolean,text)
  from public,anon,authenticated;
grant execute on function private.set_job_status_impl(uuid,text,text),
  private.create_review_impl(uuid,smallint,text),private.pending_reports_impl(),
  private.moderate_review_impl(uuid,boolean,text) to authenticated;
grant execute on function public.set_job_status(uuid,text,text),public.create_review(uuid,smallint,text),
  public.pending_reports(),public.moderate_review(uuid,boolean,text) to authenticated;
grant usage on schema private to anon;
grant execute on function private.published_reviews_impl() to anon,authenticated;
grant execute on function public.published_reviews() to anon,authenticated;

create index provider_reviews_provider_idx on private.provider_reviews(provider_id);
create index provider_reviews_reviewer_idx on private.provider_reviews(reviewer_id);
create index quote_versions_provider_idx on public.quote_versions(provider_id);
create index request_addresses_client_idx on public.request_addresses(client_id);
create index service_requests_category_idx on public.service_requests(category_slug);
create index service_requests_municipality_idx on public.service_requests(municipality_slug);
