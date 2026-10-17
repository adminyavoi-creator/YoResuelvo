alter table public.provider_profiles
  add column if not exists years_experience smallint check (years_experience between 0 and 60),
  add column if not exists specialties text[] not null default '{}'::text[] check (cardinality(specialties) <= 8),
  add column if not exists photo_paths text[] not null default '{}'::text[] check (cardinality(photo_paths) <= 5);

grant select(years_experience, specialties, photo_paths) on public.provider_profiles to anon, authenticated;
grant insert(years_experience, specialties, photo_paths) on public.provider_profiles to authenticated;
grant update(years_experience, specialties, photo_paths) on public.provider_profiles to authenticated;

create or replace function private.reset_approval_on_profile_edit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.display_name,new.bio,new.municipality_slug,new.years_experience,new.specialties,new.photo_paths) is distinct from
     (old.display_name,old.bio,old.municipality_slug,old.years_experience,old.specialties,old.photo_paths)
     and old.approval_status = 'approved' then
    new.approval_status := 'pending';
  end if;
  return new;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('provider-photos','provider-photos',true,4000000,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "provider_photos_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "provider_photos_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "provider_photos_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'provider-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
