-- Los wrappers públicos de la primera fase siguen necesitando invocar estas funciones.
grant execute on function private.create_request_impl(text,text,text,text,uuid[],timestamptz),
  private.submit_quote_impl(uuid,text,text,text,numeric,numeric,numeric,timestamptz,timestamptz),
  private.accept_quote_impl(uuid),private.review_provider_impl(uuid,text,text),
  private.pending_providers_impl(),private.staff_role_impl() to authenticated;
