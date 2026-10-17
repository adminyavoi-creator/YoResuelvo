# Estado verificable de las fases 1–5 y plataforma

**Actualizado:** 17 de octubre de 2026. El estado distingue base técnica disponible de pruebas con personas, dispositivos y operación real.

| Fase | Implementado | Evidencia y límite |
| --- | --- | --- |
| 1 Fundación | React/TS, Supabase Auth persistente PKCE, acceso Google preparado para PWA/Android, correo, esquema y RLS | `npm ci`, compilación, migraciones y prueba de aislamiento. Falta configurar el OAuth Client/Provider Google y probar confirmación, recuperación y retorno nativo con cuentas reales. |
| 2 Oferta | Alta editable de prestador, oficio, municipio, disponibilidad, revisión humana, catálogo, comparación y carga de hasta cinco fotos de perfil | Un prestador no se autoaprueba. El catálogo aún requiere perfiles reales aprobados y validación presencial del contenido y consentimiento de las imágenes. |
| 3 Contratación | Solicitud a hasta cinco prestadores, cotizaciones inmutables por versión, aceptación transaccional única, ticket, dirección privada y mensajes privados añadidos en el incremento de comunicación | La prueba SQL bloquea una segunda contratación y el acceso de terceros a dirección/oferta. Falta E2E con personas; adjuntos permanecen pendientes. |
| 4 Confianza | Estados, historial, reseña única tras finalización, incidencias, avisos internos, apelaciones, métricas, exportación y flujo de eliminación de cuenta | La baja implementa el alcance aprobado: borra datos asociados, chats y reseñas; cancela servicios donde la persona eliminada era el proveedor seleccionado; conserva únicamente un ticket desvinculado. Falta el ensayo controlado de punta a punta. Push tiene código FCM y JSON Android del proyecto/paquete local; faltan secretos y prueba de entrega desde dispositivo físico. |
| 5 Piloto | Guía de operación, indicadores y criterios de salida | Aún no se realizaron entrevistas, pruebas con dispositivos Android/iOS, respaldo restaurado ni una contratación real. No se declara listo para lanzamiento público. |

La prueba de `tests/flow.integration.sql` se ejecutó contra el proyecto independiente de YoResuelvo! en una transacción revertida: aislamiento de dos clientes, dirección exclusiva para las partes, doble aceptación bloqueada, cuatro eventos de estado y una reseña por trabajo. El catálogo real permanece vacío hasta que una persona autorizada apruebe perfiles.

Los incrementos antes descritos como fases 6–13 (mensajería, preferencias/exportación, cobertura, oportunidades, apelaciones, métricas y smoke de release) tienen implementación técnica aplicada. La PWA y el proyecto Android Capacitor existen; el worker push y la migración de su tarea programada están en código, pero faltan confirmar secretos del entorno, ejecución programada y entrega real. Esto no equivale a piloto terminado: correo transaccional, adjuntos de solicitud y pruebas de dispositivos reales siguen pendientes. Consulta el [plan de implementación actualizado](PLAN_IMPLEMENTACION.md) y el catálogo de herramientas incluido allí.

## Controles antes del piloto

La fase 5 conserva como requisito una revisión de permisos y acceso a datos, además de restaurar un respaldo, validar accesibilidad y preparar la operación con usuarios. Esos controles siguen abiertos; completar las pruebas de dominio y una compilación no equivale a aprobar el piloto.

## Publicación Android en Google Play

| Componente | Estado | Pendiente |
| --- | --- | --- |
| Package/API | `mx.yoresuelvo.app`; `compileSdk` y `targetSdk` en 36 | Mantener API objetivo vigente para cada actualización. |
| Firebase Android | `google-services.json` local, project/package verificados | Compilar Gradle, instalar desde track y validar FCM foreground/background/terminada + navegación al abrir aviso. |
| Firma/AAB | El script `npm run android:aab` existe; `versionCode` actual 1 | Configurar llave de carga y Play App Signing fuera de Git; producir, revisar y validar el AAB firmado. |
| Play Console | Cuenta y ficha no verificadas en esta revisión | Confirmar titular/tipo/antigüedad de cuenta, identidad del desarrollador, registro de paquete y ficha/políticas. |
| Requisitos de producto | Solicitud de eliminación dentro de la app y página web presentes; moderación de perfiles/reseñas e incidencias de servicio implementadas | Ensayar eliminación con una cuenta controlada. Completar reporte de perfiles/contenido y bloqueo general de usuarios, y revisar el contenido generado por usuarios antes de producción. |
| Tracks | No hay AAB cargado a internal/closed/production en esta revisión | Probar internal; closed testing; si cuenta personal creada tras 13 nov 2023, mantener 12 testers optados-in durante 14 días consecutivos y solicitar acceso a producción. |

La app ya usa API 36, requisito de Google Play vigente desde el 31 de agosto de 2026 para apps nuevas y actualizaciones. El artefacto firmado, la experiencia de revisión y la entrega de FCM en teléfono siguen pendientes; no marcar la app como publicada en Google Play.

## Alcance restante antes del piloto externo

1. Verificar confirmación y recuperación de cuenta desde el dominio final y configurar correo transaccional con su remitente real.
2. Crear un operador por canal administrativo seguro; no conceder privilegios mediante metadatos editables por el usuario.
3. Probar el recorrido completo con cuentas reales de cliente y prestador, incluida aprobación, cotización, cancelación, incidencia y reseña.
4. Revisar accesibilidad con teclado y lector de pantalla y probar en Android, iOS y escritorio.
5. Restaurar un respaldo en proyecto aislado, documentar RPO/RTO, política de datos, responsable de soporte y procedimiento de apelación.
6. Validar categorías, cobertura y rangos orientativos con prestadores locales antes de anunciarlos como oferta real.
7. Antes de Google Play: completar firma/AAB, Play Console, Data safety, privacidad, ensayo de eliminación, controles UGC y requisitos de closed testing documentados en `PLAN_PUBLICACION_GOOGLE_PLAY.md`.

## Incremento técnico aplicado: fases 6–9

| Fase | Núcleo técnico | Límite de salida |
| --- | --- | --- |
| 6 Comunicación | Mensajes privados por ticket, avisos internos, preferencias y cola push con RLS/Edge Function; migración para programar el worker incluida | Confirmar los secretos en Vault/Edge Function, que la tarea corre en producción y la entrega FCM real; correo sigue pendiente. |
| 7 PWA/Android | Manifiesto PWA, shell y Capacitor Android con enlace OAuth; JSON de Google Services está local y package ID coincide | Falta compilar con Gradle, construir y firmar AAB, cargar a Play tracks y probar FCM/Auth en dispositivos físicos. La firma y el JSON no se publican como secretos en GitHub. |
| 8 Expansión | RPC de cobertura por municipio/oficio, calculada solo con perfiles aprobados y disponibles | No abrir un municipio sin oferta validada y responsable operativo. |
| 9 Oportunidades | Publicación e interés filtrados por oficio, municipio y prestador aprobado; sin teléfonos ni dirección | La conversión a contratación debe seguir el flujo de solicitud/cotización/ticket. |

## Incremento técnico aplicado: fases 10–13

| Fase | Núcleo técnico | Límite de salida |
| --- | --- | --- |
| 10 Privacidad | Exportación JSON local, RLS y preferencias de avisos; consentimiento push por instalación | Correo permanece bloqueado hasta tener proveedor; el usuario activa push en cada dispositivo. La exportación no es un mecanismo de borrado. |
| 11 Apelaciones | Apelación de una resolución durante 30 días, respuesta del moderador y reapertura auditada si se acepta | Las resoluciones anteriores a esta migración no tienen fecha de resolución fiable y por eso no son apelables desde el nuevo flujo. No es arbitraje financiero. |
| 12 Operación | Métricas agregadas de solicitudes, oferta activa, primera cotización, cierres, incidencias y apelaciones | El panel no muestra PII; porcentajes y medianas se interpretan junto a su tamaño de muestra. No se deben anunciar como resultados del piloto. |
| 13 Calidad de release | CI compila, prueba dominio y verifica manifest, service worker y bundles estáticos | No sustituye pruebas con usuarios, revisión de accesibilidad, instalación en dispositivos ni un respaldo restaurado. |

Las fases 10–13 amplían la base técnica en Supabase y la aplicación; no se declara lista la fase 5 ni autorizado el lanzamiento público. El proyecto conserva la protección SSO de Vercel; push no se considera operativo hasta verificar secretos y worker de Supabase, la tarea programada y la entrega desde Android físico.

## Corte comprobado · 17 de octubre de 2026, tarde

- Base YoResuelvo! activa: **1 cuenta**, **0 operadores**, **0 especialistas aprobados**, **0 solicitudes**, **0 trabajos** y **0 mensajes de servicio** al momento de la consulta. No existe aún un caso real para demostrar el recorrido cliente–especialista.
- Iteración de interfaz: Inicio y Explorar diferenciados, doce oficios con iconografía específica, carrusel táctil, mejor calificados con reseñas reales, filtro Lista/Mapa OSM regional, filtros de solicitudes, bandeja de conversaciones por trabajo y acceso a Operaciones. El mapa regional no muestra pines de especialistas porque no se han recogido coordenadas públicas consentidas.
- Soporte: migración `operations_support` aplicada; tablas `support_threads` y `support_messages` con RLS, canal privado por usuario y lectura/respuesta por staff. La interfaz se actualizó. Sin operadores asignados, los mensajes pueden quedar guardados pero no existe atención humana activa.
- Verificación: `npm run build`, `npm test` y `npm run test:release` pasan. La base confirmó RLS habilitado y cero hilos al terminar un ensayo transaccional revertido. El navegador local no pudo abrir servidor de desarrollo por restricción de escucha `EPERM`; faltan pruebas visuales y de dispositivo de esta versión.
- Play Console: texto, icono 512×512 y gráfico destacado 1024×500 guardados en la ficha en español. Faltan capturas de teléfono de la versión integrada. No se declara lista la publicación.
