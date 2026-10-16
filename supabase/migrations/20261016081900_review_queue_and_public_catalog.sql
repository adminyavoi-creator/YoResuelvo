-- Restore anonymous review projection and expose a staff-only moderation queue.
grant execute on function public.published_reviews() to anon,authenticated;

create function private.review_queue_impl()
returns table(job_id uuid,provider_id uuid,rating smallint,body text,published boolean,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if not exists (select 1 from private.staff s where s.user_id=auth.uid()
    and s.role in ('moderator','admin')) then raise exception 'Acceso denegado.'; end if;
  return query select r.job_id,r.provider_id,r.rating,r.body,r.published,r.created_at
    from public.reviews r order by r.created_at desc limit 200;
end $$;
create function public.review_queue()
returns table(job_id uuid,provider_id uuid,rating smallint,body text,published boolean,created_at timestamptz)
language sql security invoker set search_path='' as $$
  select * from private.review_queue_impl()
$$;
revoke all on function private.review_queue_impl(),public.review_queue() from public,anon,authenticated;
grant execute on function private.review_queue_impl(),public.review_queue() to authenticated;
