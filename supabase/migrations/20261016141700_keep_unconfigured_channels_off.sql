-- No permitir activar canales sin proveedor ni consentimiento operativo.
alter table public.notification_preferences
  add constraint notification_preferences_delivery_unconfigured
  check (email_updates=false and push_updates=false) not valid;
revoke update(email_updates,push_updates) on public.notification_preferences from authenticated;
