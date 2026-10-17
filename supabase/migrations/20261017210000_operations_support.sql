-- Separate support conversations from private job chats.
create table public.support_threads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.support_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.support_threads(user_id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 1500),
  created_at timestamptz not null default now()
);
create index support_messages_thread_idx on public.support_messages(user_id, created_at, id);
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_threads, public.support_messages from anon, authenticated;
grant select, insert on public.support_threads, public.support_messages to authenticated;
grant usage, select on sequence public.support_messages_id_seq to authenticated;

create policy support_threads_read on public.support_threads for select to authenticated
  using (user_id = (select auth.uid()) or (select public.staff_role()) in ('moderator','admin'));
create policy support_threads_create on public.support_threads for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy support_messages_read on public.support_messages for select to authenticated
  using (user_id = (select auth.uid()) or (select public.staff_role()) in ('moderator','admin'));
create policy support_messages_create on public.support_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and
    (user_id = (select auth.uid()) or (select public.staff_role()) in ('moderator','admin')));

create function private.support_message_notice()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.support_threads set updated_at = new.created_at where user_id = new.user_id;
  if new.sender_id is distinct from new.user_id
    and coalesce((select p.in_app from public.notification_preferences p where p.user_id = new.user_id), true) then
    insert into public.notifications(recipient_id,title,body)
    values(new.user_id,'Respuesta de Operaciones','Tienes un mensaje en el chat de soporte.');
  end if;
  return new;
end $$;
revoke all on function private.support_message_notice() from public, anon, authenticated;
create trigger support_message_notice after insert on public.support_messages
  for each row execute function private.support_message_notice();
