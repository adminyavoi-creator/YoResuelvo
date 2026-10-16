-- Verifica la restricción después de confirmar que no existen preferencias previas activas.
alter table public.notification_preferences
  validate constraint notification_preferences_delivery_unconfigured;
