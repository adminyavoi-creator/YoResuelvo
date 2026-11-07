-- Additive changes preserve the published 0.3.11 clients.
alter table public.provider_profiles add column price_min numeric(12,2), add column price_max numeric(12,2), add column price_unit text not null default 'Por servicio';
alter table public.provider_profiles add constraint provider_price_range check ((price_min is null and price_max is null) or (price_min is not null and price_max is not null and price_min>=0 and price_max>=price_min and price_max<=1000000)), add constraint provider_price_unit check(price_unit in ('Por servicio','Por hora','Por visita'));
grant update(price_min,price_max,price_unit) on public.provider_profiles to authenticated;
create table private.service_comparison_groups(id uuid primary key,client_id uuid not null references auth.users(id) on delete cascade,payload jsonb not null,created_at timestamptz not null default now());
alter table private.service_comparison_groups enable row level security;
revoke all on private.service_comparison_groups from public,anon,authenticated;
alter table private.service_cases add column request_group uuid references private.service_comparison_groups(id),add column accepted_snapshot jsonb;
create index service_cases_group_idx on private.service_cases(request_group);
create unique index service_cases_group_provider_idx on private.service_cases(request_group,provider_key) where request_group is not null;
create function private.create_service_comparison_impl(p_submission uuid,p_providers text[],p_title text,p_description text,p_address text,p_phone text,p_preferred timestamptz,p_media jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb; existing private.service_comparison_groups; provider text; cid uuid;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.';end if;
 if p_submission is null or coalesce(cardinality(p_providers),0) not between 1 and 3 or exists(select 1 from unnest(p_providers) v where v is null) or (select count(distinct v) from unnest(p_providers) v)<>cardinality(p_providers) then raise exception 'Selecciona de uno a tres expertos distintos.';end if;
 payload:=jsonb_build_object('providers',p_providers,'title',p_title,'description',p_description,'address',p_address,'phone',p_phone,'preferred',p_preferred,'media',p_media);
 perform pg_advisory_xact_lock(hashtextextended(p_submission::text,71));
 select * into existing from private.service_comparison_groups where id=p_submission;
 if found then
  if existing.client_id<>auth.uid() or existing.payload<>payload then raise exception 'La solicitud ya se envió con otros datos. Consulta Mis solicitudes.';end if;
 else
  insert into private.service_comparison_groups(id,client_id,payload) values(p_submission,auth.uid(),payload);
  foreach provider in array p_providers loop
   cid:=private.create_service_case_impl(provider,p_title,p_description,p_address,p_phone,p_preferred,p_media);
   update private.service_cases set request_group=p_submission where id=cid;
  end loop;
 end if;
 return (select jsonb_agg(id) from private.service_cases where request_group=p_submission and client_id=auth.uid());
end $$;
create function public.create_service_comparison(p_submission uuid,p_providers text[],p_title text,p_description text,p_address text,p_phone text,p_preferred timestamptz,p_media jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.create_service_comparison_impl(p_submission,p_providers,p_title,p_description,p_address,p_phone,p_preferred,p_media)$$;
revoke all on function private.create_service_comparison_impl(uuid,text[],text,text,text,text,timestamptz,jsonb),public.create_service_comparison(uuid,text[],text,text,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function private.create_service_comparison_impl(uuid,text[],text,text,text,text,timestamptz,jsonb),public.create_service_comparison(uuid,text[],text,text,text,text,timestamptz,jsonb) to authenticated;
create or replace function private.service_cases_impl() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión.';end if;
 return (select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('provider_name',coalesce(p.display_name,d.title),'client_name',cl.display_name,'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at),'[]') from private.service_case_events e where e.case_id=c.id)) order by c.created_at desc),'[]') from private.service_cases c left join public.provider_profiles p on p.id::text=c.provider_key left join private.demo_service_providers d on d.id=c.provider_key left join public.profiles cl on cl.id=c.client_id where c.client_id=auth.uid() or c.expert_id=auth.uid() or private.is_operations_staff());
end $$;
create or replace function private.respond_service_case_impl(p_id uuid,p_action text,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare c private.service_cases;
begin
 if auth.uid() is null then raise exception 'Inicia sesión.';end if;
 -- Lock before row locks so concurrent acceptances in one comparison serialize.
 perform pg_advisory_xact_lock(hashtextextended(request_group::text,71)) from private.service_cases where id=p_id and request_group is not null;
 select * into c from private.service_cases where id=p_id for update;
 if auth.uid() is null or c.id is null then raise exception 'Solicitud no disponible.';end if;
 if p_action in ('accept','decline') then
  if c.client_id<>auth.uid() or c.status<>'quoted' or c.quote_version is distinct from p_version then raise exception 'La cotización cambió. Revisa su versión vigente.';end if;
  if p_action='accept' then
   if c.request_group is not null and exists(select 1 from private.service_cases x where x.request_group=c.request_group and x.id<>c.id and x.accepted_at is not null) then raise exception 'Ya aceptaste otra propuesta para este requerimiento.';end if;
   if c.starts_at<=now() then raise exception 'El horario ofrecido ya pasó. Pide una nueva propuesta.';end if;
   if c.quote_expires_at<=now() then raise exception 'La cotización venció. Pide un nuevo horario.';end if;
   perform pg_advisory_xact_lock(hashtextextended(c.provider_key,42));
   if exists(select 1 from private.service_cases x where x.id<>c.id and x.provider_key=c.provider_key and x.status in ('booked','in_progress') and x.starts_at<c.ends_at and x.ends_at>c.starts_at)
    or exists(select 1 from private.demo_service_bookings b where b.provider_id=c.provider_key and b.status in ('requested','confirmed','in_progress') and b.starts_at<c.ends_at and b.ends_at>c.starts_at)
    or (not c.illustrative and exists(select 1 from public.provider_agenda a where a.provider_id=c.expert_id and a.starts_at<c.ends_at and a.ends_at>c.starts_at)) then raise exception 'El horario ya está ocupado. Solicita otro horario.';end if;
   update private.service_cases set status='booked',accepted_at=now(),accepted_version=quote_version,accepted_total=labor+materials+travel,accepted_snapshot=to_jsonb(c)||jsonb_build_object('provider_name',coalesce((select display_name from public.provider_profiles where id::text=c.provider_key),(select title from private.demo_service_providers where id=c.provider_key)),'client_name',(select display_name from public.profiles where id=c.client_id)),accepted_terms='Acepto el alcance, horario e importe y me comprometo a pagar directamente al experto según lo acordado.',updated_at=now() where id=p_id;
   if c.request_group is not null then
    insert into private.service_case_events(case_id,actor_id,action) select id,auth.uid(),'cancel' from private.service_cases where request_group=c.request_group and id<>p_id and status in ('requested','quoted');
    insert into public.notifications(recipient_id,title,body) select expert_id,'Solicitud cerrada','El cliente eligió otra propuesta.' from private.service_cases where request_group=c.request_group and id<>p_id and status in ('requested','quoted');
    update private.service_cases set status='cancelled',updated_at=now() where request_group=c.request_group and id<>p_id and status in ('requested','quoted');
   end if;
  else update private.service_cases set status='requested',updated_at=now() where id=p_id;end if;
 elsif p_action='cancel' then
  if auth.uid() not in (c.client_id,c.expert_id) and not private.is_operations_staff() then raise exception 'Sin permiso.';end if;
  if c.status in ('completed','cancelled') then raise exception 'El servicio ya terminó.';end if;
  update private.service_cases set status='cancelled',updated_at=now() where id=p_id;
 elsif p_action='start' then
  if c.expert_id<>auth.uid() or c.status<>'booked' then raise exception 'Solo el experto puede iniciar un servicio apartado.';end if;
  update private.service_cases set status='in_progress',updated_at=now() where id=p_id;
 elsif p_action='complete' then
  if c.client_id<>auth.uid() or c.status<>'in_progress' then raise exception 'El cliente debe confirmar la finalización.';end if;
  update private.service_cases set status='completed',updated_at=now() where id=p_id;
 else raise exception 'Acción inválida.';end if;
 insert into private.service_case_events(case_id,actor_id,action,snapshot) values(p_id,auth.uid(),p_action,jsonb_build_object('quote_version',c.quote_version));
 insert into public.notifications(recipient_id,title,body) values(case when auth.uid()=c.client_id then c.expert_id else c.client_id end,'Servicio actualizado',c.title);
end $$;
