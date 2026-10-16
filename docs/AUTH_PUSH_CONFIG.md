# Configuración final de acceso y push

El código de YoResuelvo ya contiene el inicio con Google, sesión persistente, retorno Android, PWA, registro de dispositivos push y Edge Function. Estos valores pertenecen a recursos propios de YoResuelvo; no copiar credenciales de Oficia.

## Google Auth

1. En Google Cloud, crea un OAuth Client de tipo **Web application** para el proyecto de YoResuelvo. En JavaScript origins agrega los dominios de producción de YoResuelvo que estén activos en Vercel; el código usa el `origin` actual para regresar.
2. En el callback autorizado de Google agrega `https://oilpmedqwwbbzbtzwmzl.supabase.co/auth/v1/callback`.
3. En Supabase → Authentication → Providers → Google, activa el proveedor y guarda el Client ID y Client Secret.
4. En Supabase → Authentication → URL Configuration, conserva los redirects web ya usados para correo y agrega los aliases web que estén activos y `mx.yoresuelvo.app://auth/callback`.
5. Verifica el logo/nombre de YoResuelvo y los scopes mínimos `openid`, correo y perfil en Google Auth Platform.

La pantalla muestra Google primero y mantiene el acceso existente por correo/contraseña, crear cuenta, confirmación y recuperación. En Android se abre Google en el navegador del sistema y se intercambia el código PKCE al volver por el deep link. La intención cliente/prestador se recuerda localmente y solo orienta la navegación; permisos de prestador aprobado y moderación siguen definidos por Supabase/RLS.

## Firebase Messaging web y Android

1. En un proyecto Firebase de YoResuelvo registra una app **Web** y una app **Android** con paquete `mx.yoresuelvo.app`; habilita Firebase Cloud Messaging.
2. Para web, genera una clave Web Push (VAPID) y crea estas variables en Vercel para Production y Preview:

   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_VAPID_KEY`

   Son configuración pública del SDK web. La clave privada de cuenta de servicio nunca se pone en variables `VITE_`.

3. Descarga el `google-services.json` de la app Android y colócalo en `android/app/google-services.json`. No lo subas al repositorio.
4. Crea una cuenta de servicio de Firebase con permiso para enviar mensajes FCM HTTP v1 y guarda el JSON como secreto de Supabase Edge Functions: `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. En Supabase Vault guarda los secretos `yoresuelvo_push_function_url` (URL completa de la función) y `yoresuelvo_push_service_role_key` (JWT service role del proyecto). No los pongas en GitHub ni Vercel.
6. Después aplica `supabase/migrations/20261016200000_schedule_yoresuelvo_push_worker.sql`; registra `pg_cron`/`pg_net` para invocar la función cada minuto con ese JWT interno.

El usuario debe activar las notificaciones en cada instalación. La tabla `push_devices` no permite lectura cruzada ni alta directa: las RPC validan la sesión y asocian la instalación actual. El trigger solo encola notificaciones cuando la preferencia `push_updates` está activada. La Edge Function exige JWT service role, revisa preferencia y tokens, y desactiva registros FCM vencidos.

## Verificación

```sh
npm run build
npm test
npm run test:release
npm run android:debug
```

Después instalar el APK en un Android físico y probar Google, sesión recordada, elección de recorrido, permiso push, aviso en segundo plano, navegación al abrirlo y cierre de sesión. También probar la PWA desde un origen HTTPS. La fase de piloto sigue abierta hasta completar estas pruebas, revisión de RPC/RLS, restauración y validación operativa.
