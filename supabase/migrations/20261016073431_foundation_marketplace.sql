-- YoResuelvo! fases 1–3. Ejecutar únicamente en un proyecto independiente.
create schema if not exists private;
revoke all on schema private from public, anon;

create table public.categories (
  slug text primary key,
  name text not null,
  position integer not null default 0
);
create table public.municipalities (
  slug text primary key,
  name text not null,
  position integer not null default 0
);
insert into public.categories(slug,name,position) values
 ('electricidad','Electricidad',1),('plomeria','Plomería',2),('cerrajeria','Cerrajería',3),
 ('limpieza','Limpieza',4),('mandados','Mandados',5),('refrigeracion','Refrigeración',6),
 ('albanileria','Albañilería',7),('pintura','Pintura',8),('carpinteria','Carpintería',9),
 ('jardineria','Jardinería',10),('mecanica','Mecánica',11),('soporte-tecnico','Soporte técnico',12);
insert into public.municipalities(slug,name,position) values
 ('delicias','Delicias',1),('meoqui','Meoqui',2),('rosales','Rosales',3),
 ('saucillo','Saucillo',4),('camargo','Camargo',5),('jimenez','Jiménez',6);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  created_at timestamptz not null default now()
);
create table public.provider_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 3 and 80),
  bio text not null check (char_length(trim(bio)) between 20 and 800),
  municipality_slug text not null references public.municipalities(slug),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','suspended')),
  available boolean not null default true,
  created_at timestamptz not null default now()
);
create index provider_profiles_public_idx on public.provider_profiles(municipality_slug, created_at desc)
  where approval_status = 'approved' and available;
create table public.provider_categories (
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  category_slug text not null references public.categories(slug),
  primary key (provider_id, category_slug)
);
create index provider_categories_category_idx on public.provider_categories(category_slug, provider_id);
create table private.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator','admin'))
);
create table private.provider_reviews (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.provider_profiles(id),
  reviewer_id uuid not null references auth.users(id),
  status text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id),
  category_slug text not null references public.categories(slug),
  municipality_slug text not null references public.municipalities(slug),
  title text not null check (char_length(trim(title)) between 10 and 120),
  description text not null check (char_length(trim(description)) between 20 and 2000),
  preferred_at timestamptz,
  status text not null default 'open' check (status in ('open','contracted','cancelled','expired')),
  created_at timestamptz not null default now()
);
create index service_requests_client_idx on public.service_requests(client_id, created_at desc);
create table public.request_invites (
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id),
  created_at timestamptz not null default now(),
  primary key (request_id, provider_id)
);
create index request_invites_provider_idx on public.request_invites(provider_id, created_at desc);
create table public.request_addresses (
  request_id uuid primary key references public.service_requests(id) on delete cascade,
  client_id uuid not null references auth.users(id),
  address text not null check (char_length(trim(address)) between 10 and 300)
);
create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id),
  provider_id uuid not null references public.provider_profiles(id),
  version integer not null check (version > 0),
  scope text not null check (char_length(trim(scope)) between 20 and 1500),
  materials_note text not null default '',
  exclusions text not null default '',
  labor_amount numeric(12,2) not null check (labor_amount >= 0),
  materials_amount numeric(12,2) not null check (materials_amount >= 0),
  travel_amount numeric(12,2) not null check (travel_amount >= 0),
  total_amount numeric(12,2) generated always as (labor_amount + materials_amount + travel_amount) stored,
  expires_at timestamptz not null,
  proposed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, provider_id, version),
  foreign key (request_id, provider_id) references public.request_invites(request_id, provider_id)
);
create index quote_versions_request_idx on public.quote_versions(request_id, provider_id, version desc);
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests(id),
  quote_version_id uuid not null unique references public.quote_versions(id),
  client_id uuid not null references auth.users(id),
  provider_id uuid not null references public.provider_profiles(id),
  scheduled_at timestamptz,
  status text not null default 'confirmed' check (status in ('confirmed','scheduled','in_progress','completion_reported','completed','cancelled','disputed')),
  created_at timestamptz not null default now()
);
create index jobs_client_idx on public.jobs(client_id, created_at desc);
create index jobs_provider_idx on public.jobs(provider_id, created_at desc);
create sequence private.ticket_numbers;
create table public.tickets (
  job_id uuid primary key references public.jobs(id),
  folio text not null unique,
  agreement jsonb not null,
  issued_at timestamptz not null default now()
);

-- Las tablas expuestas niegan acceso por defecto y solo publican filas autorizadas.
alter table public.categories enable row level security;
alter table public.municipalities enable row level security;
alter table public.profiles enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.provider_categories enable row level security;
alter table public.service_requests enable row level security;
alter table public.request_invites enable row level security;
alter table public.request_addresses enable row level security;
alter table public.quote_versions enable row level security;
alter table public.jobs enable row level security;
alter table public.tickets enable row level security;
alter table private.staff enable row level security;
alter table private.provider_reviews enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.municipalities, public.provider_profiles, public.provider_categories to anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant insert(id,display_name,bio,municipality_slug,available) on public.provider_profiles to authenticated;
grant update(display_name,bio,municipality_slug,available) on public.provider_profiles to authenticated;
grant insert(provider_id,category_slug), delete on public.provider_categories to authenticated;
grant select on public.service_requests, public.request_invites, public.request_addresses,
  public.quote_versions, public.jobs, public.tickets to authenticated;
grant select on public.profiles to authenticated;
grant insert(request_id,client_id,address) on public.request_addresses to authenticated;
grant update(address) on public.request_addresses to authenticated;

create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy municipalities_read on public.municipalities for select to anon, authenticated using (true);
create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy provider_read on public.provider_profiles for select to anon, authenticated
  using (approval_status = 'approved' or id = (select auth.uid()));
create policy provider_insert on public.provider_profiles for insert to authenticated
  with check (id = (select auth.uid()) and approval_status = 'pending');
create policy provider_update on public.provider_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create function private.reset_approval_on_profile_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.display_name,new.bio,new.municipality_slug) is distinct from
     (old.display_name,old.bio,old.municipality_slug) and old.approval_status = 'approved' then
    new.approval_status := 'pending';
  end if;
  return new;
end $$;
create trigger reset_approval before update on public.provider_profiles
  for each row execute function private.reset_approval_on_profile_edit();
create policy provider_categories_read on public.provider_categories for select to anon, authenticated
  using (provider_id = (select auth.uid()) or exists (
    select 1 from public.provider_profiles p where p.id = provider_id and p.approval_status = 'approved'));
create policy provider_categories_insert on public.provider_categories for insert to authenticated
  with check (provider_id = (select auth.uid()));
create policy provider_categories_delete on public.provider_categories for delete to authenticated
  using (provider_id = (select auth.uid()));
create policy requests_read on public.service_requests for select to authenticated
  using (client_id = (select auth.uid()) or exists (
    select 1 from public.request_invites i where i.request_id = id and i.provider_id = (select auth.uid())));
create policy invites_read on public.request_invites for select to authenticated
  using (provider_id = (select auth.uid()));
create policy addresses_read on public.request_addresses for select to authenticated
  using (client_id = (select auth.uid()) or exists (
    select 1 from public.jobs j where j.request_id = public.request_addresses.request_id
      and j.provider_id = (select auth.uid())));
create policy addresses_insert on public.request_addresses for insert to authenticated
  with check (client_id = (select auth.uid()) and exists (
    select 1 from public.jobs j where j.request_id = public.request_addresses.request_id
      and j.client_id = (select auth.uid())));
create policy addresses_update on public.request_addresses for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
create policy quotes_read on public.quote_versions for select to authenticated
  using (provider_id = (select auth.uid()) or exists (
    select 1 from public.service_requests r where r.id = request_id and r.client_id = (select auth.uid())));
create policy jobs_read on public.jobs for select to authenticated
  using (client_id = (select auth.uid()) or provider_id = (select auth.uid()));
create policy tickets_read on public.tickets for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id
    and (j.client_id = (select auth.uid()) or j.provider_id = (select auth.uid()))));

-- Funciones privilegiadas fuera del esquema expuesto. Cada una comprueba actor y estado.
create function private.create_request_impl(
  p_category text, p_municipality text, p_title text, p_description text,
  p_provider_ids uuid[], p_preferred_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_client uuid := auth.uid(); v_count integer;
begin
  if v_client is null then raise exception 'Inicia sesión.'; end if;
  v_count := coalesce(array_length(p_provider_ids, 1), 0);
  if v_count < 1 or v_count > 5 or
     (select count(distinct x) from unnest(p_provider_ids) x) <> v_count then
    raise exception 'Elige entre uno y cinco prestadores diferentes.';
  end if;
  if char_length(trim(coalesce(p_title,''))) not between 10 and 120 or
     char_length(trim(coalesce(p_description,''))) not between 20 and 2000 then
    raise exception 'Describe el trabajo y el alcance.';
  end if;
  if (select count(*) from public.provider_profiles p
      join public.provider_categories pc on pc.provider_id = p.id
      where p.id = any(p_provider_ids) and p.id <> v_client and p.approval_status = 'approved'
        and p.available and p.municipality_slug = p_municipality
        and pc.category_slug = p_category) <> v_count then
    raise exception 'Uno de los prestadores no está disponible para esta tarea y municipio.';
  end if;
  insert into public.service_requests(client_id,category_slug,municipality_slug,title,description,preferred_at)
  values (v_client,p_category,p_municipality,trim(p_title),trim(p_description),p_preferred_at)
  returning id into v_id;
  insert into public.request_invites(request_id,provider_id)
    select v_id, x from unnest(p_provider_ids) x;
  return v_id;
end $$;

create function private.submit_quote_impl(
  p_request_id uuid, p_scope text, p_materials_note text, p_exclusions text,
  p_labor numeric, p_materials numeric, p_travel numeric,
  p_expires_at timestamptz, p_proposed_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_provider uuid := auth.uid(); v_request public.service_requests%rowtype; v_version integer; v_id uuid;
begin
  if v_provider is null then raise exception 'Inicia sesión.'; end if;
  select * into v_request from public.service_requests where id = p_request_id for update;
  if not found or v_request.status <> 'open' or not exists (
    select 1 from public.request_invites i join public.provider_profiles p on p.id = i.provider_id
    where i.request_id = p_request_id and i.provider_id = v_provider
      and p.approval_status = 'approved' and p.available
  ) then raise exception 'Solicitud no disponible.'; end if;
  if char_length(trim(coalesce(p_scope,''))) not between 20 and 1500
    or p_labor is null or p_materials is null or p_travel is null
    or p_labor < 0 or p_materials < 0 or p_travel < 0
    or p_labor + p_materials + p_travel <= 0
    or p_expires_at <= now() or p_expires_at > now() + interval '30 days'
    or (p_proposed_at is not null and p_proposed_at < now()) then
    raise exception 'Revisa el alcance, importe y vigencia.';
  end if;
  select coalesce(max(version),0) + 1 into v_version from public.quote_versions
    where request_id = p_request_id and provider_id = v_provider;
  insert into public.quote_versions(request_id,provider_id,version,scope,materials_note,exclusions,
    labor_amount,materials_amount,travel_amount,expires_at,proposed_at)
  values(p_request_id,v_provider,v_version,trim(p_scope),left(coalesce(p_materials_note,''),500),
    left(coalesce(p_exclusions,''),500),p_labor,p_materials,p_travel,p_expires_at,p_proposed_at)
  returning id into v_id;
  return v_id;
end $$;

create function private.accept_quote_impl(p_quote_id uuid)
returns table(job_id uuid, ticket_folio text)
language plpgsql security definer set search_path = '' as $$
declare v_quote public.quote_versions%rowtype; v_request public.service_requests%rowtype;
  v_job uuid; v_folio text; v_snapshot jsonb;
begin
  if auth.uid() is null then raise exception 'Inicia sesión.'; end if;
  select * into v_quote from public.quote_versions where id = p_quote_id;
  if not found then raise exception 'Cotización no encontrada.'; end if;
  select * into v_request from public.service_requests where id = v_quote.request_id for update;
  if v_request.client_id <> auth.uid() or v_request.status <> 'open'
    or v_quote.expires_at <= now()
    or exists (select 1 from public.quote_versions q where q.request_id = v_quote.request_id
      and q.provider_id = v_quote.provider_id and q.version > v_quote.version)
    or not exists (select 1 from public.provider_profiles p where p.id = v_quote.provider_id
      and p.approval_status = 'approved') then
    raise exception 'La cotización ya no se puede aceptar.';
  end if;
  insert into public.jobs(request_id,quote_version_id,client_id,provider_id,scheduled_at)
  values(v_request.id,v_quote.id,v_request.client_id,v_quote.provider_id,
    coalesce(v_quote.proposed_at,v_request.preferred_at))
  returning id into v_job;
  update public.service_requests set status = 'contracted' where id = v_request.id;
  v_folio := 'YR-' || lpad(nextval('private.ticket_numbers')::text, 8, '0');
  v_snapshot := jsonb_build_object('request_title',v_request.title,'category',v_request.category_slug,
    'municipality',v_request.municipality_slug,'scope',v_quote.scope,
    'materials_note',v_quote.materials_note,'exclusions',v_quote.exclusions,
    'labor_amount',v_quote.labor_amount,'materials_amount',v_quote.materials_amount,
    'travel_amount',v_quote.travel_amount,'total_amount',v_quote.total_amount,
    'quote_version',v_quote.version,'scheduled_at',coalesce(v_quote.proposed_at,v_request.preferred_at));
  insert into public.tickets(job_id,folio,agreement) values(v_job,v_folio,v_snapshot);
  return query select v_job, v_folio;
end $$;

create function private.review_provider_impl(p_provider_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.staff s where s.user_id = auth.uid()
      and s.role in ('moderator','admin')) then raise exception 'Acceso denegado.'; end if;
  if p_status not in ('approved','rejected','suspended') then raise exception 'Estado inválido.'; end if;
  if char_length(trim(coalesce(p_reason,''))) not between 10 and 500 then
    raise exception 'Indica un motivo de al menos diez caracteres.';
  end if;
  update public.provider_profiles set approval_status = p_status where id = p_provider_id;
  if not found then raise exception 'Perfil no encontrado.'; end if;
  insert into private.provider_reviews(provider_id,reviewer_id,status,reason)
  values (p_provider_id,auth.uid(),p_status,trim(p_reason));
end $$;

create function private.pending_providers_impl()
returns table(id uuid, display_name text, bio text, municipality_slug text)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.staff s where s.user_id = auth.uid()
      and s.role in ('moderator','admin')) then raise exception 'Acceso denegado.'; end if;
  return query select p.id,p.display_name,p.bio,p.municipality_slug
    from public.provider_profiles p where p.approval_status = 'pending'
    order by p.created_at;
end $$;

create function public.create_request(
  p_category text, p_municipality text, p_title text, p_description text,
  p_provider_ids uuid[], p_preferred_at timestamptz default null
) returns uuid language sql security invoker set search_path = '' as $$
  select private.create_request_impl(p_category,p_municipality,p_title,p_description,p_provider_ids,p_preferred_at)
$$;
create function public.submit_quote(
  p_request_id uuid, p_scope text, p_materials_note text, p_exclusions text,
  p_labor numeric, p_materials numeric, p_travel numeric,
  p_expires_at timestamptz, p_proposed_at timestamptz default null
) returns uuid language sql security invoker set search_path = '' as $$
  select private.submit_quote_impl(p_request_id,p_scope,p_materials_note,p_exclusions,
    p_labor,p_materials,p_travel,p_expires_at,p_proposed_at)
$$;
create function public.accept_quote(p_quote_id uuid)
returns table(job_id uuid, ticket_folio text)
language sql security invoker set search_path = '' as $$
  select * from private.accept_quote_impl(p_quote_id)
$$;
create function public.review_provider(p_provider_id uuid, p_status text, p_reason text)
returns void language sql security invoker set search_path = '' as $$
  select private.review_provider_impl(p_provider_id,p_status,p_reason)
$$;
create function public.pending_providers()
returns table(id uuid, display_name text, bio text, municipality_slug text)
language sql security invoker set search_path = '' as $$
  select * from private.pending_providers_impl()
$$;
create function private.staff_role_impl()
returns text language sql security definer set search_path = '' as $$
  select role from private.staff where user_id = auth.uid()
$$;
create function public.staff_role()
returns text language sql security invoker set search_path = '' as $$
  select private.staff_role_impl()
$$;

revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.create_request(text,text,text,text,uuid[],timestamptz),
  public.submit_quote(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz),
  public.accept_quote(uuid), public.review_provider(uuid,text,text),
  public.pending_providers(), public.staff_role() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.create_request_impl(text,text,text,text,uuid[],timestamptz),
  private.submit_quote_impl(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz),
  private.accept_quote_impl(uuid), private.review_provider_impl(uuid,text,text),
  private.pending_providers_impl(), private.staff_role_impl() to authenticated;
grant execute on function public.create_request(text,text,text,text,uuid[],timestamptz),
  public.submit_quote(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz),
  public.accept_quote(uuid), public.review_provider(uuid,text,text),
  public.pending_providers(), public.staff_role() to authenticated;
