# Plan de implementación · YoResuelvo! con referencia Oficia

**Actualizado:** 17 de octubre de 2026  
**Estado:** base PWA/Capacitor y Supabase en producción; publicación de Android en Play no iniciada. Package ID y API objetivo están definidos; faltan auditoría de UGC/RLS, pruebas E2E controladas, llave de carga, AAB firmado, pruebas por tracks y elegibilidad de cuenta.

## Objetivo

Desarrollar YoResuelvo! con la experiencia simple de Oficia: entrar, explorar, conocer una oferta, compararla, solicitarla y dar seguimiento desde una sola app. El inventario cambia de oficinas y coworkings a personas que ofrecen servicios locales. Se conserva el alcance de YoResuelvo!: el acuerdo y el pago suceden entre las partes; la app no cobra ni promete una garantía financiera.

## Lo que tomamos de Oficia

La revisión se basó en el repositorio público [`adminyavoi-creator/Oficia-Delicias`](https://github.com/adminyavoi-creator/Oficia-Delicias), rama `main`, en particular `README.md`, `PLAN_DE_DESARROLLO.md`, `ARQUITECTURA_BACKEND.md`, `PLAN_PERFILES_Y_ANFITRIONES.md`, `package.json`, `src/components/RoleChoice.tsx`, `src/components/OwnerDashboard.tsx` y `src/backend.ts`.

| Área | Oficia | Aplicación a YoResuelvo! |
|---|---|---|
| Acceso | Elección clara de experiencia, sesión persistente y un panel diferente para anfitrión | “Necesito un servicio” y “Quiero ofrecer servicios” guían la entrada; una cuenta puede hacer ambas cosas. Elegir una intención no concede permisos. |
| Inicio | Ubicación, búsqueda, categorías y ofertas destacadas | Búsqueda por tarea, municipio y oficio; accesos visuales por categoría y prestadores aprobados. |
| Oferta | Ficha de un espacio con servicios, fotos y disponibilidad | Perfil público de la persona, oficios, municipio, disponibilidad, reseñas verificadas y, en una etapa posterior, portafolio con imágenes consentidas. |
| Comparación | Una misma necesidad comparada entre espacios | Cotizaciones para el mismo trabajo, comparadas por alcance, mano de obra, materiales, traslado, horario y exclusiones. El precio no se compara sin revisar qué incluye. |
| Gestión | Panel del dueño con inicio, inventario, solicitudes, tickets y perfil | Panel del prestador con actividad, perfil, solicitudes, cotizaciones y tickets. El cliente tiene su recorrido de solicitudes, tickets y perfil. |
| Cierre | Solicitud, estado visible y comprobante informativo | Cotización aceptada, ticket con folio e historial, dirección revelada solo a las partes y reseña tras completar el servicio. No es factura ni recibo de pago. |
| Operación | Aprobación de inventario, moderación y permiso interno de operaciones | Aprobación de perfiles y moderación con permisos controlados por Supabase; ninguna persona se autoaprueba ni se convierte en moderadora desde su perfil. |

## Estructura y tecnología observadas

**Oficia** comparte una interfaz Vite + React 19 y TypeScript entre web/PWA y Android. Usa Capacitor 8 para compilar el contenedor Android, Supabase Auth y Postgres con migraciones/RLS, Vercel para la web y Firebase Cloud Messaging mediante una Edge Function programada para push. El service worker conserva el shell de la app; los datos y acciones necesitan conexión. Sus perfiles de cliente/anfitrión quedan fijos al registrarse, y Operaciones es un permiso separado.

**YoResuelvo!** ya usa Vite 8, React 19, TypeScript 5.9 y `@supabase/supabase-js` 2.117; Supabase es un proyecto independiente de Oficia, y Vercel publica el frontend. El modelo propio incluye perfiles aprobados, oficios/cobertura, solicitudes, cotizaciones versionadas, aceptación transaccional, trabajos, tickets, direcciones privadas, mensajes, reseñas, incidencias, apelaciones, preferencias y métricas. La cuenta puede solicitar y ofrecer servicios: la intención inicial selecciona el primer recorrido y se recuerda para el retorno.

Se conservan la separación de proyectos, las migraciones y las políticas RLS de YoResuelvo!. No se trasladan datos, credenciales, configuración OAuth, cuentas bancarias ni secretos de Oficia. Para esta solicitud ya se prepararon Capacitor/Android, Google OAuth por navegador externo con enlace de retorno, almacenamiento persistente de la sesión y push web/Android con una cola protegida. La activación real requiere credenciales propias de Google y Firebase.

## Sistema de experiencia

La identidad aprobada es la opción 06 · Profunda: azul profundo `#223745`, naranja quemado `#C64F1D`, miel `#F2B441`, arcilla `#E9B99D` y marfil `#FFF7ED`. La PWA, Android, launcher, landing, navegación, controles y tarjetas comparten estos tokens; clientes y especialistas se diferencian también con imagen e iconografía, no solo por color. La entrada empieza con elección entre “Busco un servicio” y “Quiero ofrecer servicios”; Google es el botón principal y correo, registro y recuperación son alternativas. Una vez dentro, la cuenta puede cambiar de recorrido. La secuencia de pantallas queda así:

1. **Inicio:** municipio, búsqueda de una tarea, accesos a categorías y prestadores destacados.
2. **Perfil:** quién presta el servicio, qué realiza, zona, disponibilidad y reseñas que provienen de trabajos completados.
3. **Comparar:** varias cotizaciones del mismo encargo con alcance, importes desglosados, materiales, traslado, vigencia y horario.
4. **Ticket:** folio, acuerdo aceptado, participantes, fecha y estado; dirección exacta solo para cliente y prestador contratados.

En esta actualización se incorporan accesos móviles inferiores, categorías con iconos y una ficha consultable de prestador con solicitud y comparación. Las imágenes de portafolio y las tarifas orientativas no se simulan en perfiles reales: requieren datos consentidos y validados. La demo permanece identificada como ficticia.

### Entrada de la PWA y app Android

La PWA instalada inicia en `landing.html`, una bienvenida visual con acceso a buscar u ofrecer servicios y enlaces públicos a privacidad, términos y eliminación. El CTA entra al frontend de la app en `/`. Android Capacitor conserva su entrada actual en `index.html`; su inicio nativo no se reemplaza por la landing.

## Plan por fases y criterios de salida

| Fase | Estado real | Cierre necesario |
|---|---|---|
| 0 · Producto y UX/UI | Propuesta 3 “Acción” y tablero visual existentes; se alinea el recorrido móvil en esta actualización. | Validar búsqueda, categorías, perfil y cotización con clientes y prestadores de Delicias; aprobar contenido y categorías iniciales. |
| 1 · Fundación y acceso | React/TS, Supabase Auth con sesión persistente PKCE, acceso inicial por Google preparado para web/Android, correo/contraseña, alta y recuperación. | Configurar el OAuth Client propio, habilitar Google en Supabase y permitir URL web y `mx.yoresuelvo.app://auth/callback`; probar el recorrido con cuentas reales. |
| 2 · Oferta local | Alta, revisión, categorías, cobertura, catálogo y disponibilidad implementados. | Aprobar prestadores reales y validar oficios, zona y datos publicados. Portafolio con fotos queda para una entrega posterior con consentimiento, control de acceso y moderación. |
| 3 · Solicitud y acuerdo | Solicitud, hasta cinco invitaciones, cotizaciones inmutables, aceptación única, ticket y dirección privada implementados. | E2E con dos cuentas reales: enviar, cotizar, comparar, aceptar, cambiar estado, cancelar y revisar que terceros no vean datos privados. Adjuntos siguen pendientes. |
| 4 · Confianza y soporte | Estados, historial, reseñas verificadas, avisos internos, mensajes, reportes, apelaciones, métricas y base de push están implementados. La cola y la Edge Function FCM se añadieron a Supabase. La política de baja acordada ya está implementada en Supabase producción. | Probar la baja con una cuenta controlada; configurar Firebase, credenciales y consentimiento; verificar entrega, preferencias, bajas de tokens, reintentos y retorno desde push en PWA/Android. |
| 5 · Piloto controlado | **Pendiente.** Una compilación aprobada no prueba la operación en campo. | Auditoría focal de RPC y RLS; accesibilidad; pruebas Android/iOS/escritorio; respaldo restaurado; política de privacidad, conservación y soporte; contratación piloto con usuarios reales y registro de incidencias. Solo entonces decidir apertura. |
| 6 · Release Android / Play | Paquete `mx.yoresuelvo.app`, `targetSdk 36`, configuración Firebase Android local y comando `android:aab` presentes; firma release y ficha Play no configuradas | Resolver los bloqueadores de privacidad y contenido UGC, Play App Signing, AAB firmado y validado, internal/closed testing, requisito de acceso a producción si aplica y despliegue gradual. Ruta detallada en [`PLAN_PUBLICACION_GOOGLE_PLAY.md`](PLAN_PUBLICACION_GOOGLE_PLAY.md). |

Los incrementos de comunicación, exportación, apelaciones, métricas y smoke checks que los documentos anteriores llamaban fases 6–13 están aplicados técnicamente. El alcance de eliminación quedó definido y desplegado en Supabase producción: borrar los datos asociados a la cuenta, incluidas conversaciones y reseñas; cancelar solicitudes contratadas cuyo proveedor seleccionado se elimina; y conservar solo el ticket como snapshot de seguridad, desvinculado de la cuenta. La migración `account_deletion_cascades` y la Edge Function `delete-account` v1 están activas. Durante el despliegue no se eliminó ninguna cuenta; falta probar el recorrido completo con una cuenta controlada y publicar/verificar la ruta web desde la app. La PWA instalada abre la landing; Android Capacitor mantiene su entrada en `index.html`. La canalización push está lista en código y base de datos; falta verificar secretos/worker de Supabase, el programador seguro y la entrega en dispositivos. Correo transaccional y adjuntos siguen pendientes; la fase 5 continúa abierta.

### Controles de confianza para la fase 5

Antes de un piloto se debe revisar la autorización de cada RPC y los permisos de acceso a datos, confirmar qué información es pública o privada, restaurar un respaldo y validar accesibilidad y soporte. La revisión de Supabase del 17 de octubre no encontró FKs sin índice tras añadir índices a tickets y cola push. Siguen pendientes de revisión los avisos del Security Advisor por protección de contraseñas filtradas deshabilitada, `published_reviews()` ejecutable como SECURITY DEFINER sin sesión y funciones SECURITY DEFINER disponibles para usuarios autenticados; revisar sus grants y validaciones internas. Las tablas del esquema privado sin políticas RLS están deliberadamente cerradas. Estos controles no se consideran cerrados por una compilación o por pruebas de dominio; la fase 5 permanece pendiente hasta completar las verificaciones con el equipo y usuarios reales.

### Secuencia inmediata

1. Auditar el cliente OAuth de Google y redirects de Supabase existentes; registrar solo los aliases o callbacks que falten y completar un login/retorno Android real.
2. Verificar las apps web y Android ya registradas en el Firebase de YoResuelvo; confirmar las variables públicas en Vercel y mantener `google-services.json` local/secret de CI, fuera del Git público. Probar la compilación Gradle y una entrega FCM real.
3. Mantener la cuenta de servicio Firebase y JWT service role en Vault; nunca exponerlos a la app, GitHub público o variables VITE.
4. Completar el plan Play: eliminación de cuenta dentro/fuera de la app; reporte/bloqueo y moderación; políticas; ficha; declaraciones; acceso de revisión.
5. Crear llave de carga fuera de Git, configurar Play App Signing, generar el AAB release y probarlo en el track interno, incluidos Google Auth y FCM.
6. Ejecutar closed testing. Confirmar tipo/fecha de la cuenta: para cuentas personales nuevas aplican 12 testers optados-in continuos por 14 días antes de solicitar acceso a producción.
7. Tras habilitar producción, desplegar gradualmente, observar Android Vitals, soporte y métricas y conservar capacidad de pausar el rollout.
8. Completar la revisión focal RPC/RLS, accesibilidad, respaldo restaurado y soporte; cerrar también la fase 5 de piloto antes de considerar una apertura amplia.

## Decisiones y límites

- La intención “ofrecer” no otorga aprobación, privilegios de operación ni permiso de moderación.
- Google/Firebase son recursos separados de Oficia. El secreto OAuth y la cuenta de servicio Firebase no van en GitHub, en Vercel como valores públicos ni dentro del bundle del navegador.
- El perfil público no muestra domicilio, teléfono particular, documentos, direcciones ni adjuntos privados.
- Solo se muestran como verificados los resultados asociados a un servicio completado. No se inventan estrellas, reseñas, precios ni tiempos de respuesta.
- Las cotizaciones describen el trabajo; el pago se acuerda fuera de la app. No se implementan saldo, cobro, depósito ni comisión en este plan.
- La apertura de otro municipio depende de oferta aprobada, demanda y responsable operativo; no se activa solo por desplegar código.

## Documentos de seguimiento

- [Estado de fases y evidencias](ESTADO_FASES.md)
- [Plan integral de desarrollo](PLAN_DESARROLLO.md)
- [Arquitectura y límites del piloto](ARQUITECTURA.md)
- [Operación del piloto](PILOTO_OPERACION.md)
- [Lista de verificación de release](VERIFICACION_RELEASE.md)
- [Ruta de publicación en Google Play](PLAN_PUBLICACION_GOOGLE_PLAY.md)
