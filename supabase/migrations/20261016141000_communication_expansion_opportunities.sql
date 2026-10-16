-- Fases 6–9: conversaciones privadas, preferencias, cobertura territorial
-- y bolsa de oportunidades. No almacena teléfonos, pagos ni adjuntos.

create table public.conversation_messages (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null check (char_length(trim(body)) between 1 and 1500),
  created_at timestamptz not null default now()
);
create index conversation_messages_job_idx on public.conversation_messages(job_id, created_at);

create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  in_app boolean not null default true,
  email_updates boolean not null default false,
  push_updates boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id),
  category_slug text not null references public.categories(slug),
  municipality_slug text not null references public.municipalities(slug),
  title text not null check (char_length(trim(title)) between 10 and 120),
  description text not null check (char_length(trim(description)) between 20 and 1200),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index opportunities_open_idx on public.opportunities(municipality_slug, category_slug, created_at desc) where status = 'open';

create table public.opportunity_interests (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  note text not null default '' check (char_length(trim(note)) <= 500),
  status text not null default 'sent' check (status in ('sent','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key(opportunity_id, provider_id)
);
create index opportunity_interests_provider_idx on public.opportunity_interests(provider_id, created_at desc);

alter table public.conversation_messages enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_interests enable row level security;
revoke all on public.conversation_messages, public.notification_preferences, public.opportunities, public.opportunity_interests from anon, authenticated;
grant select on public.conversation_messages, public.opportunities, public.opportunity_interests to authenticated;
grant select, insert, update(user_id,in_app,email_updates,push_updates,updated_at) on public.notification_preferences to authenticated;

create policy messages_participants_read on public.conversation_messages for select to authenticated
  using (exists (select 1 from public.jobs j where j.id=job_id and (j.client_id=(select auth.uid()) or j.provider_id=(select auth.uid()))));
create policy preferences_owner_read on public.notification_preferences for select to authenticated using (user_id=(select auth.uid()));
create policy preferences_owner_insert on public.notification_preferences for insert to authenticated with check (user_id=(select auth.uid()));
create policy preferences_owner_update on public.notification_preferences for update to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy opportunities_relevant_read on public.opportunities for select to authenticated using (
  client_id=(select auth.uid()) or (status='open' and exists (
    select 1 from public.provider_profiles p join public.provider_categories pc on pc.provider_id=p.id
    where p.id=(select auth.uid()) and p.approval_status='approved' and p.available
      and p.municipality_slug=opportunities.municipality_slug and pc.category_slug=opportunities.category_slug
  ))
);
create policy opportunity_interests_participants_read on public.opportunity_interests for select to authenticated using (
  provider_id=(select auth.uid()) or exists (select 1 from public.opportunities o where o.id=opportunity_id and o.client_id=(select auth.uid()))
);

create function private.send_job_message_impl(p_job_id uuid, p_body text)
returns bigint language plpgsql security definer set search_path='' as $$
declare v_id bigint; v_actor uuid:=auth.uid(); v_recipient uuid;
begin
  if v_actor is null then raise exception 'Inicia sesión.'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 1500 then raise exception 'El mensaje debe tener entre 1 y 1500 caracteres.'; end if;
  select case when j.client_id=v_actor then j.provider_id else j.client_id end into v_recipient
  from public.jobs j where j.id=p_job_id and (j.client_id=v_actor or j.provider_id=v_actor);
  if v_recipient is null then raise exception 'No participas en este servicio.'; end if;
  insert into public.conversation_messages(job_id,sender_id,body) values(p_job_id,v_actor,trim(p_body)) returning id into v_id;
  if coalesce((select in_app from public.notification_preferences where user_id=v_recipient),true) then
    insert into public.notifications(recipient_id,title,body) values(v_recipient,'Nuevo mensaje','Tienes un mensaje sobre un servicio.');
  end if;
  return v_id;
end $$;
create function public.send_job_message(p_job_id uuid,p_body text)
returns bigint language sql security invoker set search_path='' as $$ select private.send_job_message_impl(p_job_id,p_body) $$;

create function private.create_opportunity_impl(p_category text,p_municipality text,p_title text,p_description text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Inicia sesión.'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 10 and 120 or char_length(trim(coalesce(p_description,''))) not between 20 and 1200 then
    raise exception 'Revisa el título y la descripción de la oportunidad.';
  end if;
  insert into public.opportunities(client_id,category_slug,municipality_slug,title,description)
  values(v_actor,p_category,p_municipality,trim(p_title),trim(p_description)) returning id into v_id;
  return v_id;
end $$;
create function public.create_opportunity(p_category text,p_municipality text,p_title text,p_description text)
returns uuid language sql security invoker set search_path='' as $$ select private.create_opportunity_impl(p_category,p_municipality,p_title,p_description) $$;

create function private.express_interest_impl(p_opportunity_id uuid,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare v_provider uuid:=auth.uid(); v_client uuid;
begin
  if v_provider is null then raise exception 'Inicia sesión.'; end if;
  if char_length(trim(coalesce(p_note,''))) > 500 then raise exception 'La nota es demasiado extensa.'; end if;
  select o.client_id into v_client from public.opportunities o join public.provider_profiles p on p.id=v_provider
    join public.provider_categories pc on pc.provider_id=p.id and pc.category_slug=o.category_slug
    where o.id=p_opportunity_id and o.status='open' and p.approval_status='approved' and p.available and p.municipality_slug=o.municipality_slug;
  if v_client is null then raise exception 'Esta oportunidad no está disponible para tu perfil.'; end if;
  insert into public.opportunity_interests(opportunity_id,provider_id,note) values(p_opportunity_id,v_provider,trim(coalesce(p_note,'')));
  if coalesce((select in_app from public.notification_preferences where user_id=v_client),true) then
    insert into public.notifications(recipient_id,title,body) values(v_client,'Nueva persona interesada','Un prestador manifestó interés en tu oportunidad.');
  end if;
end $$;
create function public.express_interest(p_opportunity_id uuid,p_note text default '')
returns void language sql security invoker set search_path='' as $$ select private.express_interest_impl(p_opportunity_id,p_note) $$;

create function public.market_coverage()
returns table(municipality_slug text,category_slug text,provider_count bigint)
language sql security invoker set search_path='' as $$
  select p.municipality_slug,pc.category_slug,count(*) from public.provider_profiles p
  join public.provider_categories pc on pc.provider_id=p.id where p.approval_status='approved' and p.available
  group by p.municipality_slug,pc.category_slug
$$;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.send_job_message(uuid,text),public.create_opportunity(text,text,text,text),public.express_interest(uuid,text),public.market_coverage() from public,anon,authenticated;
grant execute on function private.send_job_message_impl(uuid,text),private.create_opportunity_impl(text,text,text,text),private.express_interest_impl(uuid,text) to authenticated;
grant execute on function public.send_job_message(uuid,text),public.create_opportunity(text,text,text,text),public.express_interest(uuid,text),public.market_coverage() to authenticated;
