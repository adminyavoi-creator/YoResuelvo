-- Aplicar después de guardar los dos secretos requeridos en Supabase Vault:
--   yoresuelvo_push_function_url       URL completa de la Edge Function
--   yoresuelvo_push_service_role_key   JWT service_role del proyecto
-- La clave Firebase vive como FIREBASE_SERVICE_ACCOUNT_JSON en los secretos
-- de Edge Functions; no se copia a la base de datos ni al repositorio.
create extension if not exists pg_net;
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from vault.secrets where name='yoresuelvo_push_function_url')
     or not exists (select 1 from vault.secrets where name='yoresuelvo_push_service_role_key') then
    raise exception 'Configura los secretos de YoResuelvo push en Supabase Vault antes de aplicar esta migración.';
  end if;
end
$$;

select cron.schedule(
  'yoresuelvo-push-worker-every-minute',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name='yoresuelvo_push_function_url'),
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='yoresuelvo_push_service_role_key')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $job$
);
