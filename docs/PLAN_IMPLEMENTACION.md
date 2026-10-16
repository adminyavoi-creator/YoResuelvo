# Plan de implementación · YoResuelvo! con referencia Oficia

**Actualizado:** 16 de octubre de 2026  
**Estado:** fases técnicas 1–4 y los incrementos 6–13 ya están en el proyecto; fase 5 sigue abierta y bloquea un piloto externo amplio.

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

La referencia adjunta define el tablero cálido de YoResuelvo!: naranja, coral, terracota, marfil y tinta; marca visible, botones claros, tarjetas redondeadas y estados fáciles de distinguir. La entrada empieza con elección entre “Busco un servicio” y “Quiero ofrecer servicios”; Google es el botón principal y correo, registro y recuperación son alternativas. Una vez dentro, la cuenta puede cambiar de recorrido. La secuencia de pantallas queda así:

1. **Inicio:** municipio, búsqueda de una tarea, accesos a categorías y prestadores destacados.
2. **Perfil:** quién presta el servicio, qué realiza, zona, disponibilidad y reseñas que provienen de trabajos completados.
3. **Comparar:** varias cotizaciones del mismo encargo con alcance, importes desglosados, materiales, traslado, vigencia y horario.
4. **Ticket:** folio, acuerdo aceptado, participantes, fecha y estado; dirección exacta solo para cliente y prestador contratados.

En esta actualización se incorporan accesos móviles inferiores, categorías con iconos y una ficha consultable de prestador con solicitud y comparación. Las imágenes de portafolio y las tarifas orientativas no se simulan en perfiles reales: requieren datos consentidos y validados. La demo permanece identificada como ficticia.

## Plan por fases y criterios de salida

| Fase | Estado real | Cierre necesario |
|---|---|---|
| 0 · Producto y UX/UI | Propuesta 3 “Acción” y tablero visual existentes; se alinea el recorrido móvil en esta actualización. | Validar búsqueda, categorías, perfil y cotización con clientes y prestadores de Delicias; aprobar contenido y categorías iniciales. |
| 1 · Fundación y acceso | React/TS, Supabase Auth con sesión persistente PKCE, acceso inicial por Google preparado para web/Android, correo/contraseña, alta y recuperación. | Configurar el OAuth Client propio, habilitar Google en Supabase y permitir URL web y `mx.yoresuelvo.app://auth/callback`; probar el recorrido con cuentas reales. |
| 2 · Oferta local | Alta, revisión, categorías, cobertura, catálogo y disponibilidad implementados. | Aprobar prestadores reales y validar oficios, zona y datos publicados. Portafolio con fotos queda para una entrega posterior con consentimiento, control de acceso y moderación. |
| 3 · Solicitud y acuerdo | Solicitud, hasta cinco invitaciones, cotizaciones inmutables, aceptación única, ticket y dirección privada implementados. | E2E con dos cuentas reales: enviar, cotizar, comparar, aceptar, cambiar estado, cancelar y revisar que terceros no vean datos privados. Adjuntos siguen pendientes. |
| 4 · Confianza y soporte | Estados, historial, reseñas verificadas, avisos internos, mensajes, reportes, apelaciones, métricas y base de push están implementados. La cola y la Edge Function FCM se añadieron a Supabase. | Configurar Firebase, credenciales, consentimiento y tarea `pg_cron`; verificar entrega, preferencias, bajas de tokens, reintentos y retorno desde push en PWA/Android. |
| 5 · Piloto controlado | **Pendiente.** Una compilación aprobada no prueba la operación en campo. | Auditoría focal de RPC y RLS; accesibilidad; pruebas Android/iOS/escritorio; respaldo restaurado; política de privacidad, conservación y soporte; contratación piloto con usuarios reales y registro de incidencias. Solo entonces decidir apertura. |

Los incrementos de comunicación, privacidad, apelaciones, métricas y smoke checks que los documentos anteriores llamaban fases 6–13 están aplicados técnicamente. La PWA comparte la interfaz con el proyecto Android generado por Capacitor. La canalización push está lista en código y base de datos; el envío permanece apagado hasta configurar Firebase y el programador seguro. Correo transaccional y adjuntos siguen pendientes; la fase 5 continúa abierta.

### Controles de confianza para la fase 5

Antes de un piloto se debe revisar la autorización de cada RPC y los permisos de acceso a datos, confirmar qué información es pública o privada, restaurar un respaldo y validar accesibilidad y soporte. Estos controles no se consideran cerrados por una compilación o por pruebas de dominio; la fase 5 permanece pendiente hasta completar las verificaciones con el equipo y usuarios reales.

### Secuencia inmediata

1. Registrar un cliente OAuth de Google propio y configurar Provider Google/redirects en Supabase.
2. Crear las apps web y Android de YoResuelvo en Firebase; poner las variables públicas en Vercel y `google-services.json` en Android sin subirlo a Git.
3. Guardar `FIREBASE_SERVICE_ACCOUNT_JSON` como secreto de Edge Functions y la URL/JWT `service_role` del worker en Supabase Vault; después aplicar la migración de programación incluida.
4. Construir el APK, probar login/retorno y push en PWA y Android, incluidas preferencias y cierre de sesión.
5. Resolver revisión focal de RPC/RLS, accesibilidad, respaldo restaurado y soporte; ejecutar luego el piloto controlado de la fase 5.

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
