# Arquitectura y límites del piloto
## Decisión
La app comparte React + TypeScript + Vite entre la PWA y el contenedor Android de Capacitor 8, con Supabase Auth/Postgres en un proyecto independiente de Oficia. La demo previa permanece en `/demo/`. El shell PWA y el manifiesto están implementados; datos y acciones requieren conexión. Storage para adjuntos sigue pendiente. El esquema se mantiene en migraciones versionadas; el despliegue y los datos reales se describen en `ESTADO_FASES.md`.

## Modelo de datos propuesto
| Entidad | Datos y reglas |
|---|---|
| profiles | auth user, nombre privado, preferencias; propietario únicamente |
| provider_profiles | presentación pública sin domicilio particular; aprobación controlada |
| categories, specialties, municipalities | catálogo público administrado |
| provider_specialties, service_areas | relaciones de cobertura y especialidad |
| verification_records | revisiones privadas y alcance exacto de distintivo |
| requests, request_invites | cliente, descripción, municipio; dirección en tabla privada separada |
| quotes, quote_versions | prestador invitado, conceptos, MXN, vigencia; versión enviada inmutable |
| jobs | cliente, prestador, versión aceptada, agenda, estado; una por solicitud |
| job_events | historial inmutable de estados, actor, fecha y razón |
| tickets | folio generado en servidor, versión de acuerdo, referencia a job; acceso de partes |
| messages, attachments | participantes y archivos privados por servicio |
| reviews, review_reports | una reseña por job/cliente; solo completados |
| notifications, audit_log | destinatario privado; auditoría interna |

UUID como claves; timestamps UTC y visualización America/Chihuahua. Importes numéricos decimales, nunca floats. Folio con secuencia de servidor, independiente del UUID. Índices por categoría/municipio, participante/fecha y estados; paginación de catálogo y mensajes.

## Seguridad y concurrencia
RLS en todas las tablas expuestas, permisos explícitos mínimos y pruebas con dos clientes y dos técnicos. Catálogo y perfil aprobado se leen públicamente mediante proyección sin datos privados; direcciones, teléfono y evidencias no se mezclan en perfiles públicos. UPDATE con USING y WITH CHECK; propiedad y campos privilegiados protegidos también por privilegios de columna/funciones controladas. Roles en tabla administrativa o app_metadata administrada, jamás user_metadata editable.

## Acceso a cuentas
Supabase Auth gestiona sesión PKCE persistente, correo/contraseña, confirmación, recuperación y actualización de contraseña. Google es el acceso principal preparado en web y Android; Android abre el proveedor en navegador y vuelve por `mx.yoresuelvo.app://auth/callback`. La intención guardada solo determina el recorrido inicial: una cuenta puede solicitar y ofrecer servicios, y elegir “Ofrecer” no aprueba el perfil ni concede permisos de moderación. Google requiere el cliente OAuth propio, configuración del proveedor Supabase y allowlist de retorno.

La PWA usa Firebase Messaging en el service worker; Android usa `@capacitor/push-notifications`. El registro está ligado a una instalación y a su usuario, con RLS de lectura propia y RPCs acotados para registrar/desactivar. Los avisos internos entran a `push_outbox` solo si el usuario dio consentimiento. La Edge Function `yoresuelvo-push-worker` requiere JWT `service_role`, respeta preferencias y envía por FCM. Su tarea `pg_cron`/`pg_net` usa secretos en Supabase Vault; la llave privada Firebase es un secreto de Edge Function. Ninguna llave privada se incluye en el navegador o repositorio.

Aceptación mediante operación transaccional en servidor: autenticar cliente propietario, validar invitación/prestador aprobado, bloquear solicitud, verificar vigencia y versión, impedir segundo job con UNIQUE(request_id), insertar job/ticket/evento y cerrar ofertas restantes. La API no acepta precio ni actor como fuente de verdad. Restricción UNIQUE(job_id, client_id) y validación de finalización para reseñas. Transiciones se validan en servidor y se auditan; no basta ocultar botones.

Storage privado, URLs firmadas breves, límite de tamaño/tipo, limpieza de metadatos y revisión de archivos. Ningún secreto/service_role en navegador. No registrar cuerpos de mensajes ni direcciones en logs. Tickets no públicos por conocer su folio. Política de conservación y eliminación pendiente de definición operativa.

## Entornos
Proyecto Supabase nuevo e independiente de Oficia; desarrollo/pruebas y producción separados. Vercel Preview conectado solo a datos de prueba. Variables públicas: URL y clave publicable de Supabase; secreto administrativo solo en servidor si es indispensable. Validar documentación vigente antes de instalar paquetes, generar migraciones o configurar OAuth; fijar versiones y lockfile.

## Despliegue preparado
Vite publica `dist/` y copia la demo anterior en `/demo/`. El retorno Android y la PWA están preparados en código; quedan la configuración externa de OAuth/Firebase y la programación del worker. Antes de abrir el piloto externo: probar restauración, validar categorías y prestadores reales, recorrer el flujo completo en dispositivos y aprobar el piloto. Sin pagos dentro de la aplicación.

## Pruebas requeridas
Unitarias: estados, vigencias, cotizaciones. Integración: RLS por rol, invitados, dirección privada, concurrencia, reseñas. E2E: alta→búsqueda→cotización→contratación→ticket→cierre→reseña. Operación: duplicados por reintento, desconexión, recuperación de sesión, cancelación, disputas y eliminación. Estado actual: prueba SQL transaccional ejecutada contra Supabase con datos revertidos; E2E y dispositivos reales pendientes.
