-- Fases 10–13: privacidad, apelaciones, métricas agregadas y calidad de release.
-- No agrega pagos, correo ni notificaciones push.

-- La persona controla los avisos dentro de la app. Las preferencias de email y
-- push siguen apagadas hasta configurar y verificar sus proveedores.
create or replace function private.honor_notification_preference()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if coalesce((select p.in_app from public.notification_preferences p where p.user_id=new.recipient_id),true)=false then
    return null;
  end if;
  return new;
end $$;
revoke all on function private.honor_notification_preference() from public,anon,authenticated;
create trigger honor_notification_preference
  before insert on public.notifications
  for each row execute function private.honor_notification_preference();

-- Una resolución anterior se conserva; el historial temporal solo comienza
-- a poblarse con resoluciones realizadas a partir de esta migración.
alter table public.service_reports add column resolved_at timestamptz;
create function private.stamp_report_resolution()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.status is distinct from old.status and new.status='resolved' then
    new.resolved_at:=coalesce(new.resolved_at,now());
  elsif new.status is distinct from old.status and new.status='open' then
    new.resolved_at:=null;
  end if;
  return new;
end $$;
revoke all on function private.stamp_report_resolution() from public,anon,authenticated;
create trigger stamp_report_resolution
  before update of status on public.service_reports
  for each row execute function private.stamp_report_resolution();

create table public.report_appeals (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.service_reports(id) on delete cascade,
  appellant_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 20 and 1000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  response text,
  reviewer_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(report_id,appellant_id)
);
create index report_appeals_pending_idx on public.report_appeals(created_at desc) where status='pending';
create index report_appeals_appellant_idx on public.report_appeals(appellant_id,created_at desc);
alter table public.report_appeals enable row level security;
revoke all on public.report_appeals from public,anon,authenticated;
grant select on public.report_appeals to authenticated;
create policy report_appeals_appellant_read on public.report_appeals for select to authenticated
  using (appellant_id=(select auth.uid()));

create function private.my_appeals_impl()
returns table(
  report_id uuid, job_id uuid, resolved_at timestamptz, appeal_id uuid,
  appeal_reason text, appeal_status text, response text, appeal_created_at timestamptz,
  can_appeal boolean
)
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Inicia sesión.'; end if;
  return query
  select r.id,r.job_id,r.resolved_at,a.id,a.reason,a.status,a.response,a.created_at,
    (a.id is null and r.resolved_at>=now()-interval '30 days' and j.status in ('completed','cancelled'))
  from public.service_reports r
  join public.jobs j on j.id=r.job_id
  left join public.report_appeals a on a.report_id=r.id and a.appellant_id=v_actor
  where r.status='resolved' and r.resolved_at is not null
    and (j.client_id=v_actor or j.provider_id=v_actor)
  order by r.resolved_at desc;
end $$;

create function private.file_report_appeal_impl(p_report_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_job_id uuid; v_appeal_id uuid; v_other uuid;
begin
  if v_actor is null then raise exception 'Inicia sesión.'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 20 and 1000 then
    raise exception 'Explica la apelación con entre 20 y 1000 caracteres.';
  end if;
  select j.id,case when j.client_id=v_actor then j.provider_id else j.client_id end
    into v_job_id,v_other
  from public.service_reports r join public.jobs j on j.id=r.job_id
  where r.id=p_report_id and r.status='resolved' and r.resolved_at>=now()-interval '30 days'
    and j.status in ('completed','cancelled') and (j.client_id=v_actor or j.provider_id=v_actor)
  for update of r,j;
  if v_job_id is null then raise exception 'La resolución no admite apelación o el plazo de 30 días venció.'; end if;
  insert into public.report_appeals(report_id,appellant_id,reason)
  values(p_report_id,v_actor,trim(p_reason)) returning id into v_appeal_id;
  insert into public.notifications(recipient_id,title,body)
  values(v_other,'Resolución apelada','La resolución de un servicio fue apelada y será revisada.');
  return v_appeal_id;
exception when unique_violation then
  raise exception 'Ya enviaste una apelación para esta resolución.';
end $$;

create function private.pending_appeals_impl()
returns table(id uuid,report_id uuid,job_id uuid,appellant_id uuid,reason text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from private.staff s where s.user_id=auth.uid() and s.role in ('moderator','admin')) then
    raise exception 'Acceso denegado.';
  end if;
  return query select a.id,a.report_id,r.job_id,a.appellant_id,a.reason,a.created_at
    from public.report_appeals a join public.service_reports r on r.id=a.report_id
    where a.status='pending' order by a.created_at;
end $$;

create function private.review_report_appeal_impl(p_appeal_id uuid,p_status text,p_response text)
returns void language plpgsql security definer set search_path='' as $$
declare v_appeal public.report_appeals%rowtype; v_report public.service_reports%rowtype; v_job public.jobs%rowtype;
begin
  if not exists (select 1 from private.staff s where s.user_id=auth.uid() and s.role in ('moderator','admin')) then
    raise exception 'Acceso denegado.';
  end if;
  if p_status not in ('accepted','rejected') or char_length(trim(coalesce(p_response,''))) not between 10 and 1000 then
    raise exception 'Selecciona una decisión y registra una respuesta de entre 10 y 1000 caracteres.';
  end if;
  select * into v_appeal from public.report_appeals where id=p_appeal_id for update;
  if not found or v_appeal.status<>'pending' then raise exception 'La apelación ya fue revisada o no existe.'; end if;
  select * into v_report from public.service_reports where id=v_appeal.report_id for update;
  select * into v_job from public.jobs where id=v_report.job_id for update;
  if p_status='accepted' then
    if v_job.status not in ('completed','cancelled') then raise exception 'El servicio ya no está en un estado apelable.'; end if;
    perform set_config('app.job_reason','Apelación aceptada: '||left(trim(p_response),900),true);
    update public.jobs set status='disputed' where id=v_job.id;
    insert into public.service_reports(job_id,reporter_id,reason)
      values(v_job.id,v_appeal.appellant_id,left('Reapertura por apelación aceptada: '||trim(p_response),1000));
  end if;
  update public.report_appeals set status=p_status,response=trim(p_response),reviewer_id=auth.uid(),reviewed_at=now()
    where id=p_appeal_id;
  insert into public.notifications(recipient_id,title,body)
    values(v_appeal.appellant_id,'Apelación revisada',
      case when p_status='accepted' then 'La apelación fue aceptada; el servicio volvió a revisión.'
      else 'La apelación fue revisada. Consulta la respuesta en tu ticket.' end);
end $$;

create function private.operational_metrics_impl()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_requests_total bigint; v_requests_open bigint; v_requests_contracted bigint;
  v_providers_active bigint; v_jobs_completed bigint; v_jobs_disputed bigint;
  v_reports_open bigint; v_appeals_open bigint; v_quote_sample bigint; v_median_minutes numeric;
  v_areas jsonb;
begin
  if not exists (select 1 from private.staff s where s.user_id=auth.uid() and s.role in ('moderator','admin')) then
    raise exception 'Acceso denegado.';
  end if;
  select count(*),count(*) filter (where r.status='open'),
    count(*) filter (where exists(select 1 from public.jobs j where j.request_id=r.id))
    into v_requests_total,v_requests_open,v_requests_contracted from public.service_requests r;
  select count(*) into v_providers_active from public.provider_profiles p
    where p.approval_status='approved' and p.available;
  select count(*) filter (where j.status='completed'),count(*) filter (where j.status='disputed')
    into v_jobs_completed,v_jobs_disputed from public.jobs j;
  select count(*) into v_reports_open from public.service_reports r where r.status='open';
  select count(*) into v_appeals_open from public.report_appeals a where a.status='pending';
  select count(*),round((percentile_cont(0.5) within group (order by extract(epoch from (q.first_quote-r.created_at))/60))::numeric,1)
    into v_quote_sample,v_median_minutes
  from public.service_requests r
  join lateral (select min(qv.created_at) as first_quote from public.quote_versions qv where qv.request_id=r.id) q
    on q.first_quote is not null
  where r.status not in ('cancelled','expired');
  select coalesce(jsonb_agg(jsonb_build_object(
    'municipality_slug',x.municipality_slug,'category_slug',x.category_slug,'provider_count',x.provider_count
  ) order by x.municipality_slug,x.category_slug),'[]'::jsonb) into v_areas
  from (
    select p.municipality_slug,pc.category_slug,count(*) as provider_count
    from public.provider_profiles p join public.provider_categories pc on pc.provider_id=p.id
    where p.approval_status='approved' and p.available
    group by p.municipality_slug,pc.category_slug
  ) x;
  return jsonb_build_object(
    'requests_total',v_requests_total,'requests_open',v_requests_open,'requests_contracted',v_requests_contracted,
    'conversion_pct',case when v_requests_total=0 then null else round(v_requests_contracted::numeric*100/v_requests_total,1) end,
    'providers_active',v_providers_active,'jobs_completed',v_jobs_completed,'jobs_disputed',v_jobs_disputed,
    'reports_open',v_reports_open,'appeals_open',v_appeals_open,'quote_sample_size',v_quote_sample,
    'median_first_quote_minutes',v_median_minutes,'providers_by_area',v_areas
  );
end $$;

create function public.my_appeals()
returns table(report_id uuid,job_id uuid,resolved_at timestamptz,appeal_id uuid,appeal_reason text,appeal_status text,response text,appeal_created_at timestamptz,can_appeal boolean)
language sql security invoker set search_path='' as $$ select * from private.my_appeals_impl() $$;
create function public.file_report_appeal(p_report_id uuid,p_reason text)
returns uuid language sql security invoker set search_path='' as $$ select private.file_report_appeal_impl(p_report_id,p_reason) $$;
create function public.pending_appeals()
returns table(id uuid,report_id uuid,job_id uuid,appellant_id uuid,reason text,created_at timestamptz)
language sql security invoker set search_path='' as $$ select * from private.pending_appeals_impl() $$;
create function public.review_report_appeal(p_appeal_id uuid,p_status text,p_response text)
returns void language sql security invoker set search_path='' as $$ select private.review_report_appeal_impl(p_appeal_id,p_status,p_response) $$;
create function public.operational_metrics()
returns jsonb language sql security invoker set search_path='' as $$ select private.operational_metrics_impl() $$;

revoke all on function private.my_appeals_impl(),private.file_report_appeal_impl(uuid,text),
  private.pending_appeals_impl(),private.review_report_appeal_impl(uuid,text,text),
  private.operational_metrics_impl() from public,anon,authenticated;
revoke all on function public.my_appeals(),public.file_report_appeal(uuid,text),public.pending_appeals(),
  public.review_report_appeal(uuid,text,text),public.operational_metrics() from public,anon,authenticated;
grant execute on function private.my_appeals_impl(),private.file_report_appeal_impl(uuid,text),
  private.pending_appeals_impl(),private.review_report_appeal_impl(uuid,text,text),private.operational_metrics_impl()
  to authenticated;
grant execute on function public.my_appeals(),public.file_report_appeal(uuid,text),public.pending_appeals(),
  public.review_report_appeal(uuid,text,text),public.operational_metrics() to authenticated;
