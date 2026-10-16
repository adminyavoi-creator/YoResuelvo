-- Public RPCs retain their existing role grants. Their owners also own the private
-- implementations, so the wrappers can call them without granting private EXECUTE
-- to anon or authenticated. Every wrapper pins an empty search_path and preserves
-- the checks in its private implementation.
create or replace function public.create_request(
  p_category text, p_municipality text, p_title text, p_description text,
  p_provider_ids uuid[], p_preferred_at timestamptz default null
) returns uuid language sql security definer set search_path = '' as $$
  select private.create_request_impl(p_category,p_municipality,p_title,p_description,p_provider_ids,p_preferred_at)
$$;

create or replace function public.submit_quote(
  p_request_id uuid, p_scope text, p_materials_note text, p_exclusions text,
  p_labor numeric, p_materials numeric, p_travel numeric,
  p_expires_at timestamptz, p_proposed_at timestamptz default null
) returns uuid language sql security definer set search_path = '' as $$
  select private.submit_quote_impl(p_request_id,p_scope,p_materials_note,p_exclusions,
    p_labor,p_materials,p_travel,p_expires_at,p_proposed_at)
$$;

create or replace function public.accept_quote(p_quote_id uuid)
returns table(job_id uuid, ticket_folio text)
language sql security definer set search_path = '' as $$
  select * from private.accept_quote_impl(p_quote_id)
$$;

create or replace function public.review_provider(p_provider_id uuid, p_status text, p_reason text)
returns void language sql security definer set search_path = '' as $$
  select private.review_provider_impl(p_provider_id,p_status,p_reason)
$$;

create or replace function public.pending_providers()
returns table(id uuid, display_name text, bio text, municipality_slug text)
language sql security definer set search_path = '' as $$
  select * from private.pending_providers_impl()
$$;

create or replace function public.staff_role()
returns text language sql security definer set search_path = '' as $$
  select private.staff_role_impl()
$$;

create or replace function public.set_job_status(p_job_id uuid,p_next text,p_reason text default null)
returns void language sql security definer set search_path = '' as $$
  select private.set_job_status_impl(p_job_id,p_next,p_reason)
$$;

create or replace function public.create_review(p_job_id uuid,p_rating smallint,p_body text)
returns void language sql security definer set search_path = '' as $$
  select private.create_review_impl(p_job_id,p_rating,p_body)
$$;

create or replace function public.published_reviews()
returns table(provider_id uuid,rating smallint,body text,created_at timestamptz)
language sql security definer set search_path = '' as $$
  select * from private.published_reviews_impl()
$$;

create or replace function public.pending_reports()
returns table(id uuid,job_id uuid,reason text,created_at timestamptz)
language sql security definer set search_path = '' as $$
  select * from private.pending_reports_impl()
$$;

create or replace function public.moderate_review(p_job_id uuid,p_published boolean,p_reason text)
returns void language sql security definer set search_path = '' as $$
  select private.moderate_review_impl(p_job_id,p_published,p_reason)
$$;

create or replace function public.review_queue()
returns table(job_id uuid,provider_id uuid,rating smallint,body text,published boolean,created_at timestamptz)
language sql security definer set search_path = '' as $$
  select * from private.review_queue_impl()
$$;
