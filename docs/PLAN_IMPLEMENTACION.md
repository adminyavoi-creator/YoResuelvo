# Plan de implementación · YoResuelvo! con referencia Oficia

**Actualizado:** 19 de octubre de 2026  
**Estado:** PWA de producción y pista interna de Google Play en `0.3.1 (3)`. El mapa OSM de demostración está publicado; el AAB está disponible para verificadores internos. La fase de piloto sigue abierta: faltan revisión focal de seguridad, pruebas E2E en Android físico, soporte humano asignado, datos reales con consentimiento y cierre de la ficha de Play. La auditoría detallada está en [`AUDITORIA_PENDIENTES_2026-10-19.md`](AUDITORIA_PENDIENTES_2026-10-19.md).

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

## Herramientas que debe ofrecer YoResuelvo!

Esta matriz separa lo que ya está en el código de lo que todavía requiere conexión real, verificación o desarrollo. “Implementado” describe la base técnica; no significa que el flujo haya pasado el piloto de campo.

### Herramientas de cara a clientes y especialistas

| Área | Herramientas necesarias | Estado actual | Siguiente criterio de aceptación |
|---|---|---|---|
| Entrada | Google como acceso principal, correo y recuperación; sesión persistente; intención inicial “busco” u “ofrezco”; cuenta con ambos recorridos | Código React/Supabase y retorno nativo preparados | Completar configuración OAuth, probar altas, sesiones, recuperación, cierre de sesión y deep link en web y Android. |
| Descubrimiento | Búsqueda por nombre/tarea, filtros por oficio y municipio, categorías visuales y perfiles disponibles/aprobados | Búsqueda y filtros básicos implementados | Probar búsqueda con el catálogo real, estados vacíos y errores de red. La cercanía GPS no está implementada. |
| Perfil especialista | Nombre público, bio, años, especialidades, municipio, disponibilidad y hasta cinco fotos | Formulario, carga y visualización en el modelo implementados | Aprobar perfiles reales, revisar consentimiento y contenido, y ajustar galería/carrusel en distintos tamaños de pantalla. |
| Comparación | Seleccionar varias personas y comparar reseñas verificadas y propuesta para el mismo trabajo | Flujo de perfiles, solicitudes y cotizaciones implementado | Validar que la interfaz compare alcance equivalente, desglose total, fecha, vigencia y exclusiones; no ordenar solo por precio. |
| Solicitud | Categoría, municipio, título, alcance y horario preferido; invitación a máximo cinco especialistas | Implementado | E2E con dos cuentas; añadir adjuntos solo después de Storage privado, límites, escaneo/moderación y eliminación comprobados. |
| Cotización | Alcance incluido, materiales, exclusiones, mano de obra, materiales, traslado, fecha propuesta y vigencia; versiones inmutables | Implementado con aceptación transaccional única | Probar ofertas vencidas, editadas, duplicadas y aceptadas en paralelo; el servidor debe conservar una sola aceptación. |
| Servicio y ticket | Agenda, estados, motivo de cancelación/incidencia, dirección privada, folio, acuerdo e historial imprimible | Implementado | Probar todos los estados y permisos con cliente, especialista y tercero; el ticket archivado no expone chats, reseñas ni dirección. |
| Mensajería | Conversación privada por servicio, avisos de mensaje y acceso desde ticket | Mensajes persistentes implementados; Realtime, adjuntos y confirmaciones de lectura todavía no están implementados | Verificar aislamiento entre trabajos; después decidir si el piloto requiere Realtime y añadir señales de entrega/no leído solo con consistencia garantizada. |
| Reputación y seguridad | Una reseña por cliente y trabajo completado, incidencias, moderación y apelación | Reglas y vistas de moderación/apelación implementadas | Probar abuso y moderación. Añadir reporte general de perfil/contenido y bloqueo de usuarios antes de la disponibilidad pública. |
| Avisos | Bandeja interna, preferencias, push PWA y Android, ruta al abrir notificación | Bandeja y canal FCM preparados | Validar credenciales/worker programado, permiso denegado, token inválido y estados foreground/background/terminada en teléfono físico. |
| Cuenta y privacidad | Ver datos propios, exportar, actualizar preferencias y eliminar cuenta desde app y web | Exportación, enlaces y función de borrado implementados | Probar el borrado con una cuenta controlada y comprobar exactamente: reseñas/chats borrados, servicios del proveedor cancelados y ticket conservado sin vínculo personal. |

### Herramientas operativas y de plataforma

| Capa | Herramienta | Uso y control requerido |
|---|---|---|
| App web | Vite, React y TypeScript | Interfaz adaptable y validación estática con `npm run typecheck`; conservar rutas públicas de privacidad, términos y baja. |
| App Android | Capacitor 8, Android Studio y Gradle | Empaquetar el mismo frontend; probar OAuth de retorno, permisos push, navegación al tocar avisos, teclado, rotación/tamaños y accesibilidad. |
| PWA | Manifiesto, service worker y Firebase Messaging | Instalable y shell offline. Las operaciones que guardan datos requieren red; informar claramente si no hay conexión y no perder formularios. |
| Identidad | Supabase Auth PKCE | Google/correo, sesiones y recuperación. Nunca autorizar por metadatos editables del usuario. |
| Datos y permisos | Supabase Postgres, migraciones SQL, RLS y RPC transaccionales | Aislamiento por cliente/especialista/operador; aceptación y transiciones validadas en servidor; probar accesos permitidos y denegados. |
| Fotos y archivos | Supabase Storage | Fotos aprobadas del perfil pueden ser públicas; direcciones, documentos y adjuntos de servicios deben ser privados, con URL temporal, validación de tipo/tamaño y borrado. |
| Funciones servidor | Supabase Edge Functions | Ejecutar baja y worker push con secretos en servidor; nunca incluir `service_role` o cuenta de servicio Firebase en `VITE_*` o en el bundle. |
| Push | Firebase Cloud Messaging + cola Supabase | Respetar consentimiento/preferencias, token por instalación, reintentos limitados y desactivación de tokens inválidos. Probar entrega real antes de declarar listo. |
| Hosting y versiones | Vercel + GitHub/CI del repositorio | Preview conectada a datos de prueba; producción separada; build reproducible, revisión por cambios y rollback documentado. |
| Calidad | `npm test`, `npm run test:release`, SQL de integración y pruebas E2E/dispositivo | Cubrir reglas de dominio, RLS, concurrencia, autorización, navegación, sesión, eliminación y avisos. Los smoke checks no sustituyen E2E ni piloto. |
| Publicación | Android Studio/Gradle + Play Console | Keystore de carga y Play App Signing protegidos; generar AAB firmado, subir a prueba interna/cerrada y monitorear antes del lanzamiento gradual. |
| Operación | Métricas agregadas y bitácora de moderación | Medir embudo y calidad de oferta con muestra; excluir cuerpo de mensajes, domicilios y tokens de los logs y reportes generales. |

### Orden recomendado para terminar el piloto

1. Cerrar OAuth y recuperación con cuentas reales; poblar el catálogo solo con especialistas que hayan aceptado participar y pasado revisión.
2. Ejecutar el flujo completo cliente–especialista, incluidos propuestas, aceptación concurrente, dirección privada, ticket, cancelación, chat, cierre y reseña.
3. Añadir reporte y bloqueo generales y cerrar revisión de RLS/RPC para todos los datos públicos, privados y administrativos.
4. Probar exportación y eliminación con cuenta controlada; revisar respaldo restaurado, accesibilidad y procedimiento de soporte.
5. Configurar y validar FCM real en PWA y Android; corregir permisos y preferencias si una notificación no respeta la opción del usuario.
6. Probar Android en dispositivo físico y producir el AAB firmado; seguir la ruta de Internal testing, closed testing y release gradual documentada en `PLAN_PUBLICACION_GOOGLE_PLAY.md`.

La ubicación por radio, el mapa, favoritos, adjuntos de solicitud, correo transaccional y métricas personales de velocidad se mantienen como mejoras posteriores. Para publicar distancia o promedio de respuesta se definirá primero el permiso de ubicación, la fórmula, la muestra mínima y el estado cuando no existan datos.

## Plan por fases y criterios de salida

| Fase | Estado real | Cierre necesario |
|---|---|---|
| 0 · Producto y UX/UI | Propuesta 3 “Acción” y tablero visual existentes; se alinea el recorrido móvil en esta actualización. | Validar búsqueda, categorías, perfil y cotización con clientes y prestadores de Delicias; aprobar contenido y categorías iniciales. |
| 1 · Fundación y acceso | React/TS, Supabase Auth con sesión persistente PKCE, acceso inicial por Google preparado para web/Android, correo/contraseña, alta y recuperación. | Configurar el OAuth Client propio, habilitar Google en Supabase y permitir URL web y `mx.yoresuelvo.app://auth/callback`; probar el recorrido con cuentas reales. |
| 2 · Oferta local | Alta, revisión, categorías, cobertura, catálogo y disponibilidad implementados. | Aprobar prestadores reales y validar oficios, zona y datos publicados. Portafolio con fotos queda para una entrega posterior con consentimiento, control de acceso y moderación. |
| 3 · Solicitud y acuerdo | Solicitud, hasta cinco invitaciones, cotizaciones inmutables, aceptación única, ticket y dirección privada implementados. | E2E con dos cuentas reales: enviar, cotizar, comparar, aceptar, cambiar estado, cancelar y revisar que terceros no vean datos privados. Adjuntos siguen pendientes. |
| 4 · Confianza y soporte | Estados, historial, reseñas verificadas, avisos internos, mensajes, reportes, apelaciones, métricas y base de push están implementados. La cola y la Edge Function FCM se añadieron a Supabase. La política de baja acordada ya está implementada en Supabase producción. | Probar la baja con una cuenta controlada; configurar Firebase, credenciales y consentimiento; verificar entrega, preferencias, bajas de tokens, reintentos y retorno desde push en PWA/Android. |
| 5 · Piloto controlado | **Pendiente.** Una compilación aprobada no prueba la operación en campo. | Auditoría focal de RPC y RLS; accesibilidad; pruebas Android/iOS/escritorio; respaldo restaurado; política de privacidad, conservación y soporte; contratación piloto con usuarios reales y registro de incidencias. Solo entonces decidir apertura. |
| 6 · Release Android / Play | Paquete `mx.yoresuelvo.app`, `targetSdk 36`; release interno `0.3.1 (3)` activo; PWA alineada | Instalar desde Play en un dispositivo físico y verificar Auth/deep links, solicitudes, chat, push y actualización. Completar ficha, privacidad y UGC antes de prueba cerrada o producción. Ruta en [`PLAN_PUBLICACION_GOOGLE_PLAY.md`](PLAN_PUBLICACION_GOOGLE_PLAY.md). |

Los incrementos de comunicación, exportación, apelaciones, métricas y smoke checks que los documentos anteriores llamaban fases 6–13 están aplicados técnicamente. El alcance de eliminación quedó definido y desplegado en Supabase producción: borrar los datos asociados a la cuenta, incluidas conversaciones y reseñas; cancelar solicitudes contratadas cuyo proveedor seleccionado se elimina; y conservar solo el ticket como snapshot de seguridad, desvinculado de la cuenta. La migración `account_deletion_cascades` y la Edge Function `delete-account` v1 están activas. Durante el despliegue no se eliminó ninguna cuenta; falta probar el recorrido completo con una cuenta controlada y publicar/verificar la ruta web desde la app. La PWA instalada abre la landing; Android Capacitor mantiene su entrada en `index.html`. La canalización push está lista en código y base de datos; falta verificar secretos/worker de Supabase, el programador seguro y la entrega en dispositivos. Correo transaccional y adjuntos siguen pendientes; la fase 5 continúa abierta.

### Controles de confianza para la fase 5

Antes de un piloto se debe revisar la autorización de cada RPC y los permisos de acceso a datos, confirmar qué información es pública o privada, restaurar un respaldo y validar accesibilidad y soporte. El Security Advisor actual marca `pg_net` en el esquema público, `published_reviews()` ejecutable como SECURITY DEFINER por `anon` y 14 funciones SECURITY DEFINER ejecutables por usuarios autenticados; son hallazgos para revisar grants, búsqueda de `search_path` y controles internos, no fallos confirmados. Las tres tablas del esquema privado sin políticas RLS deben confirmarse como intencionales. El Performance Advisor reporta 27 índices sin uso en una base de muy poco tráfico; no retirarlos sin contrastar sus consultas y funciones. Estos controles no se consideran cerrados por una compilación o por pruebas de dominio; la fase 5 permanece pendiente hasta completar las verificaciones con el equipo y usuarios reales.

### Secuencia inmediata

1. Auditar el cliente OAuth de Google y redirects de Supabase existentes; registrar solo los aliases o callbacks que falten y completar un login/retorno Android real.
2. Verificar las apps web y Android ya registradas en el Firebase de YoResuelvo; confirmar las variables públicas en Vercel y mantener `google-services.json` local/secret de CI, fuera del Git público. Probar la compilación Gradle y una entrega FCM real.
3. Mantener la cuenta de servicio Firebase y JWT service role en Vault; nunca exponerlos a la app, GitHub público o variables VITE.
4. Completar el plan Play: eliminación de cuenta dentro/fuera de la app; reporte/bloqueo y moderación; políticas; ficha; declaraciones; acceso de revisión.
5. Instalar el AAB `0.3.1 (3)` desde la pista interna y probar Auth, deep links, solicitudes, chat, baja de cuenta, notificaciones FCM y actualización en Android físico.
6. Cerrar ficha de tienda, capturas reales, privacidad, seguridad de datos y moderación. Confirmar tipo/fecha de la cuenta; si es personal creada después del 13 de noviembre de 2023, cumplir 12 testers optados-in durante 14 días en prueba cerrada antes de solicitar acceso a producción.
7. Ejecutar un piloto controlado con operador asignado, cuentas de cliente/especialista y oferta real consentida. Restaurar un respaldo y validar accesibilidad antes de ampliar.
8. Tras habilitar producción y aprobar la revisión, desplegar gradualmente, observar Android Vitals, soporte y métricas y conservar capacidad de pausar el rollout.

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

## Iteración UX móvil · 17 de octubre de 2026

### Entrega en código

- **Inicio separado de Explorar.** Inicio muestra categorías populares como accesos, carrusel táctil de recomendaciones y perfiles ordenados por promedio de reseñas verificadas. Cuando no hay reseñas se indica “Sin reseñas”; la demanda de cada oficio aún no se mide, por lo que el orden de categorías usa el catálogo editorial. Las promociones no se inventan: queda un espacio reservado para campañas vigentes.
- **Explorar.** Conserva búsqueda, municipio, oficio, ficha y comparación. Incluye selector Lista/Mapa (OSM). Mapa tiene mosaicos OpenStreetMap, arrastre táctil, zoom y controles de recenter; un marcador lleva al perfil completo. La vista de prueba `/?demo=mapa` muestra cuatro ubicaciones ficticias alrededor del centro de Delicias, fotos de oficio y estrellas simuladas con aviso visible; el modo no usa Supabase ni permite enviar solicitudes. Los perfiles reales sin coordenadas siguen en la lista y no reciben un pin.
- **Solicitudes.** Filtros por todas, abiertas, contratadas y recibidas; cada tarjeta muestra número de cotizaciones y el total contratado o la menor propuesta recibida. La cotización sigue desglosada y el ticket conserva el acuerdo aceptado. El importe es el acordado entre partes, no un cobro procesado por la plataforma.
- **Chat.** La pestaña tiene un índice de conversaciones persistidas por trabajo contratado y lleva al chat dentro del ticket. Operaciones aparece arriba con identidad visual propia. En el siguiente incremento se añadieron tablas de soporte separadas, RLS y envío/lectura desde la interfaz; sin un operador asignado, no se puede garantizar respuesta humana.
- **Iconografía.** Hay pictogramas SVG propios para las doce categorías: electricidad, plomería, cerrajería, limpieza, mandados, refrigeración, albañilería, pintura, carpintería, jardinería, mecánica y soporte técnico. Mantener trazo uniforme, contraste miel/marfil y texto visible junto a cada icono.

### Próximos incrementos verificables

| Prioridad | Entrega | Dependencia y criterio de salida |
|---|---|---|
| P0 | QA de navegación Android/PWA | Verificar cambios repetidos entre cinco pestañas, vuelta desde ficha y ticket, teclado, scroll, gestos, datos lentos y reanudación en dispositivos físicos; sin pantalla congelada ni pérdida de formulario. |
| P0 | Soporte Operaciones real | Tablas, RLS, historial, envío y aviso a usuario implementados. No hay operador asignado. Falta probar aislamiento con dos cuentas y establecer guardias/tiempos de respuesta. No anunciar atención en tiempo real hasta el E2E. |
| P0 | QA del mapa OSM | Ruta pública `/?demo=mapa` confirmada en producción. En Android físico, comprobar tiles y atribución OSM, arrastre, zoom, filtros compartidos y apertura de ficha desde pin/tarjeta. Los fixtures llevan aviso; no se escriben en Supabase. |
| P1 | Ubicaciones reales | Definir zona pública aproximada con consentimiento y precisión reducida. Consultar solo perfiles aprobados; mostrar pin y calificación únicamente con reseñas verificadas. Mantener estado claro si un perfil no comparte ubicación. |
| P1 | Popularidad y promociones | Agregar métricas agregadas de solicitudes por oficio, ventana temporal y umbral mínimo; campañas con fechas, segmentación, estado, condiciones y revisión de Operaciones. Ordenar Inicio solo con datos válidos y explicar cuando no haya muestra. |
| P1 | Solicitudes y chats | Búsqueda y orden por fecha/estado; indicadores de no leídos basados en lecturas persistentes; vista de detalles con estados y monto de cada propuesta. Probar aceptación única concurrente y restricciones de acceso. |
| P2 | Contenido interactivo | CMS o tabla de tarjetas con imagen, texto alternativo, destino interno seguro, vigencia y métricas de apertura. Carrusel manual por tacto y teclado, sin reproducción automática obligatoria. |

### Secuencia de implementación

1. **Producción PWA y Play interno están alineados en 0.3.1 (3).** La ruta pública del mapa demo está en producción; validar pin a ficha y flujos completos en Android físico antes de cerrar QA de interfaz.
2. No se requiere migración de Supabase para los fixtures: conservarlos solo en el bundle de demo. Para datos reales, definir consentimiento y política antes de guardar coordenadas aproximadas con RLS.
3. Conectar campañas y popularidad solo a datos reales y métricas con muestra suficiente.
4. Durante el piloto controlado, medir abandono en Inicio→Perfil→Solicitud→Contrato, tasa de respuesta y errores por pantalla, sin registrar chat ni domicilio en analítica.
5. Corregir hallazgos, ampliar prueba cerrada y desplegar gradualmente con rollback listo.
