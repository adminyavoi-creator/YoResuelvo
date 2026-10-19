# Auditoría de pendientes y mejoras · YoResuelvo!

**Corte:** 19 de octubre de 2026  
**Propósito:** distinguir lo que ya está cargado de lo que aún requiere una prueba, una decisión de producto o trabajo operativo. La prioridad P0 significa que bloquea un piloto confiable o la publicación pública; P1 es la siguiente mejora de producto; P2 es optimización posterior.

## Resumen ejecutivo

La versión `0.3.1 (3)` ya está desplegada en la PWA y activa en la pista interna de Google Play. El mapa de demostración está disponible en `/?demo=mapa`, identificado expresamente como ficticio y sin escritura en Supabase. El AAB y el código del release no son pendientes de carga.

El proyecto todavía no está listo para un piloto con usuarios reales: la base tiene 0 especialistas aprobados, 0 solicitudes y 0 trabajos; no hay operador asignado; no se ha probado la app desde Play en un Android físico; y la entrega de push no se ha confirmado en un dispositivo. La ficha de Play necesita capturas reales de teléfono y una revisión final de sus declaraciones. No hay publicación pública.

## Inventario de estado verificado

| Área | Estado observado | Qué significa |
|---|---|---|
| GitHub | PR del release de mapa fusionado en `main`, commit `702f3cb` | Código publicado; no quedan archivos de código de ese release por cargar. |
| Vercel | Proyecto `yo-resuelvo`, producción `READY`, versión `0.3.1` | PWA y mapa de demo publicados. |
| Google Play | `0.3.1 (3)` activo en prueba interna, AAB 4.41 MB | Verificadores internos pueden acceder; el público no. |
| Ficha de Play | Icono y gráfico guardados; capturas de teléfono vacías | Cargar de 2 a 8 capturas actuales de la app y revisar los formularios antes de enviar. |
| Supabase | 20 migraciones aplicadas, 24 tablas públicas, RLS habilitado | Infraestructura técnica activa; el catálogo y la actividad reales siguen vacíos. |
| Datos reales | 0 especialistas, perfiles, solicitudes, trabajos y mensajes de servicio; 1 dispositivo push y 0 elementos en `push_outbox` | Los cuatro perfiles y sus estrellas del mapa son fixtures de demostración, no oferta ni reputación reales. |
| Push | Worker v2 y tarea por minuto activos | La programación está configurada; no demuestra que un teléfono haya recibido y abierto una notificación. |

## Bloqueadores P0

| Prioridad | Pendiente concreto | Mejora o acción necesaria | Criterio verificable de cierre |
|---|---|---|---|
| P0 | QA de Android real | Instalar `0.3.1 (3)` desde la pista interna. Probar inicio de sesión y retorno por deep link, navegación, mapa, solicitud, chat, reanudación y actualización. | Checklist completada en al menos un dispositivo físico; errores y resultados registrados. El clic de marcador/tarjeta hacia una ficha todavía no quedó confirmado. |
| P0 | Entrega push real | Enviar una notificación de prueba a un dispositivo optado; probar app abierta, en segundo plano y terminada; tocarla y verificar destino; revisar token inválido y preferencias. | Evento recibido en cada estado probado y navegación correcta; registrar dispositivo/versión y resultado sin guardar el token en el informe. |
| P0 | Operación humana | Designar responsable de soporte, canal, horarios, tiempos de respuesta, escalamiento y cobertura de reportes/apelaciones. Actualmente no hay operadores asignados. | Responsable y guardia documentados; prueba de conversación de soporte entre dos cuentas y una respuesta del operador. |
| P0 | Prueba E2E de contratación | Con dos cuentas de prueba aprobadas, recorrer alta/revisión, solicitud, cotización, aceptación, ticket, chat, cierre, reseña y cancelación; comprobar que terceros no leen dirección ni mensajes. | Recorrido repetible con evidencia y sin acceso cruzado; la aceptación concurrente solo produce una contratación. |
| P0 | Revisión focal de seguridad Supabase | Revisar grants, `search_path`, sesión y validaciones internas para `public.published_reviews()` y las 14 funciones `SECURITY DEFINER` concedidas a `authenticated`; revisar por qué `pg_net` está en `public`. Confirmar que las tres tablas privadas sin políticas RLS están cerradas intencionalmente. | Cada aviso clasificado como intencional o corregido; pruebas de permisos anon/authenticated documentadas. Los avisos del advisor son pistas de revisión, no vulnerabilidades confirmadas. |
| P0 | Eliminación y UGC | Ensayar la baja con cuenta controlada y comprobar datos eliminados, conversación, reseña, cancelación y ticket snapshot. Completar reporte/bloqueo de perfiles y contenido general, reglas UGC y proceso de moderación. | Prueba de baja aprobada; perfil/contenido se puede reportar y bloquear; operador puede resolver con motivo y queda historial. |
| P0 | Capturas y ficha de Play | Capturar pantallas actuales de la app real en un teléfono Android, con texto legible y sin fixtures presentados como reales; subir de 2 a 8 capturas. Revisar privacidad, acceso, clasificación, público y Seguridad de datos en consola. | Capturas guardadas en la ficha y todos los formularios aplicables revisados; ficha lista para revisión cuando se decida solicitarla. |
| P0 | Preparación del piloto | Validar accesibilidad con teclado/lector de pantalla, restaurar una copia de seguridad en proyecto aislado y conseguir oferta real con consentimiento y categorías revisadas. | Restauración demostrada; lista de problemas de accesibilidad cerrada; piloto pequeño aprobado por producto y operación. |

## Mejoras de producto P1

| Área | Mejora específica | Dependencia y salida |
|---|---|---|
| Catálogo y mapa | Reemplazar fixtures solo cuando existan prestadores aprobados; guardar y mostrar zona aproximada con consentimiento. Mantener los perfiles sin ubicación en la lista. | Fuente de consentimiento y precisión documentadas; ningún domicilio exacto en el mapa público. |
| Inicio y popularidad | El orden actual de categorías es editorial. Calcular demanda por oficio/municipio y periodo con muestra mínima; no llamar “popular” a datos sin volumen suficiente. | Métrica agregada definida, umbral y periodo visibles; comportamiento vacío cuando no haya muestra. |
| Promociones | Crear campañas con vigencia, segmentación, condiciones y aprobación de Operaciones; etiquetar publicidad o contenido promocional. | Control administrativo y reglas de publicación; campañas vencidas no se muestran. |
| Solicitudes | Añadir adjuntos privados para fotos del problema, validación de tipo/tamaño, permisos y borrado. | Storage privado, políticas de acceso probadas y consentimiento para datos del inmueble. |
| Chat | Implementar confirmaciones de lectura persistentes, estados vacíos/error y reintentos; mantener mensajes vinculados a un servicio confirmado. | Lecturas aisladas por participante y prueba sin acceso a conversaciones ajenas. |
| Contacto | Configurar correo transaccional para confirmación, recuperación y eventos que lo requieran; mantener la UI clara cuando el proveedor no esté configurado. | Remitente propio verificado, pruebas de entrega y rebote; no mostrar “enviado” si no hubo entrega. |
| Preferencias | Completar controles por canal y evento, incluyendo baja de push por instalación y enlace directo al servicio. | Prueba de consentimiento/retirada en PWA y Android. |
| Favoritos y contenido | Favoritos y tarjetas de inicio administrables con texto alternativo, destino interno seguro y vigencia. | Solo después de operar el piloto; navegación por teclado y lector de pantalla. |
| Soporte y métricas | Separar los indicadores técnicos de métricas de negocio; mostrar denominador y periodo y suprimir resultados con muestras pequeñas. | Panel agregado sin PII, chat ni domicilio; validar con datos reales antes de publicar cifras. |

## Mejoras P2

- Refinar gestos y diseño del carrusel en tamaños de pantalla pequeños, teclado y movimiento reducido.
- Añadir estados claros de red lenta, sin conexión, error de carga y recuperación de borradores.
- Revisar contraste, texto alternativo y consistencia visual de los doce iconos.
- Revisar los 27 índices que Performance Advisor marca como no usados cuando exista tráfico representativo. No eliminarlos mientras la actividad sea demasiado baja para medir su utilidad.

## Orden de ejecución

1. **Cerrar release:** instalación Android, login/deep links, mapa y navegación; después FCM real.
2. **Cerrar confianza:** revisión focal de RLS/RPC, baja de cuenta, UGC, operador y respaldo restaurado.
3. **Ejecutar E2E y piloto acotado:** dos cuentas, especialista real aprobado y un caso de solicitud a reseña con consentimiento.
4. **Completar Play:** capturas reales, declaraciones verificadas y confirmación del requisito de prueba cerrada según tipo/fecha de la cuenta.
5. **Priorizar P1 con datos del piloto:** primero adjuntos y estados de error; después correo, lecturas, favoritos, demanda y promociones según uso observado.

## Límites y evidencia

- La demo `/?demo=mapa` muestra perfiles, ubicaciones, fotografías y calificaciones ficticias; no se deben convertir en oferta, reseñas ni métricas reales.
- Se revisó el estado del repositorio, deployment, Play Console, tablas/funciones/migraciones y advisors de Supabase. Los formularios de contenido de Play no se reauditaron campo por campo; se marcan para revisión final.
- No se realizó una instalación Android física ni una entrega FCM real. El intento de abrir una ficha desde el mapa no terminó de manera concluyente y permanece en la lista de QA.
- Las capturas de Play deben salir de la app real. No se generaron imágenes simuladas para cubrir ese requisito.
- El reporte no contiene direcciones de correo, credenciales, identificadores de proyectos ni datos personales de verificadores.

## Referencias internas

- [`ESTADO_FASES.md`](ESTADO_FASES.md)
- [`PLAN_IMPLEMENTACION.md`](PLAN_IMPLEMENTACION.md)
- [`PLAN_PUBLICACION_GOOGLE_PLAY.md`](PLAN_PUBLICACION_GOOGLE_PLAY.md)
