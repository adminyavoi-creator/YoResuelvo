-- Keep ticket lookups and account-scoped cleanup efficient as usage grows.
create index tickets_client_account_idx on public.tickets(client_id, issued_at desc);
create index tickets_provider_account_idx on public.tickets(provider_id, issued_at desc);
create index push_outbox_recipient_idx on public.push_outbox(recipient_id, created_at desc);
