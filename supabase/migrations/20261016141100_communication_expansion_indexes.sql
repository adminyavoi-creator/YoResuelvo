-- Índices de apoyo para la fase de comunicación y oportunidades.
create index conversation_messages_sender_idx on public.conversation_messages(sender_id);
create index opportunities_client_idx on public.opportunities(client_id, created_at desc);
create index opportunities_category_idx on public.opportunities(category_slug);
