# Estado verificable de las fases y plataforma

**Actualizado:** 19 de octubre de 2026. Este corte separa la entrega técnica, el release en prueba interna y la preparación operativa del piloto.

## Corte de versiones y publicación

- **PWA:** `0.3.1` desplegada en producción en [yo-resuelvo.vercel.app](https://yo-resuelvo.vercel.app/), desde `main`, commit `702f3cb` (`702f3cb6918f7a92c486f745b981d51357241e9a`). Vercel reporta el despliegue como `READY`.
- **Android:** `0.3.1 (3)` está activa en la pista interna de Google Play y disponible para verificadores. El AAB es de 4.41 MB según Play Console. No hay release público.
- **Mapa de demostración:** `/?demo=mapa` está desplegado. Muestra cuatro perfiles ficticios con imágenes, ubicaciones y estrellas de ejemplo claramente señaladas; es de solo lectura y no crea perfiles ni solicitudes en Supabase. OpenStreetMap acredita los mosaicos.
- **Ficha Play:** icono y gráfico destacados guardados; la sección de capturas de teléfono está vacía y pide de 2 a 8 imágenes reales. La ficha continúa en borrador. Revisar el estado de cada declaración de contenido antes de enviar.

## Fases de producto

| Fase | Estado | Evidencia y cierre pendiente |
|---|---|---|
| 1. Fundación | Base técnica aplicada | React/TypeScript, Auth, esquema y RLS desplegados. Terminar pruebas reales de OAuth, confirmación, recuperación y retorno por deep link. |
| 2. Oferta local | Base técnica aplicada; oferta real vacía | Catálogo, perfiles, categorías, cobertura y revisión técnica disponibles. Hay 0 especialistas aprobados: incorporar perfiles solo tras validar identidad, oficio, zona y consentimiento del contenido. |
| 3. Solicitud y acuerdo | Flujo implementado; sin casos reales | Solicitudes, cotizaciones versionadas, aceptación única, ticket y chat persistente. Faltan adjuntos seguros y recorrido E2E de dos cuentas. |
| 4. Confianza y soporte | Código y controles base aplicados | Reseñas verificadas, incidencias, avisos, apelaciones y eliminación de cuenta. Ensayar baja, reportes y moderación; no hay operador asignado ni soporte humano activo. |
| 5. Piloto | **Pendiente** | No hay solicitudes ni trabajos reales. Faltan instalación y pruebas en Android físico, operador, accesibilidad, restauración de respaldo y recorrido piloto consentido. |

Las fases técnicas posteriores (push, preferencias, exportación, cobertura, oportunidades, apelaciones, métricas y smoke checks) están implementadas. No equivalen a validar un piloto ni a tener resultados reales.

## Estado de backend y datos

- Supabase está activo; se verificaron 20 migraciones aplicadas y 24 tablas en `public`, con RLS habilitado.
- Conteos del corte: 12 categorías, 6 municipios, **0** perfiles, especialistas, solicitudes, trabajos, conversaciones/mensajes de servicio y elementos en la cola push. Hay 1 dispositivo push registrado. Esto confirma que la demo del mapa no se guardó como oferta real.
- `yoresuelvo-push-worker` v2 y `delete-account` v1 están activos. La tarea `yoresuelvo-push-worker-every-minute` está programada y activa. Falta probar una entrega push real de principio a fin.
- Security Advisor: revisar `pg_net` en el esquema público, `public.published_reviews()` con ejecución `SECURITY DEFINER` disponible para `anon` y 14 RPC `SECURITY DEFINER` disponibles para usuarios autenticados. Verificar grants, `search_path` y validaciones; los avisos requieren revisión y no se han confirmado como vulnerabilidades.
- Tres tablas del esquema privado aparecen sin políticas RLS y deben confirmarse como intencionalmente inaccesibles. Performance Advisor reporta 27 índices sin uso; evaluarlos con consultas reales antes de cualquier retiro.

## Google Play

| Componente | Estado actual | Pendiente |
|---|---|---|
| Paquete/API | `mx.yoresuelvo.app`, API objetivo 36 | Mantener el nivel objetivo vigente para futuros releases. |
| AAB/release | `0.3.1 (3)` activo en prueba interna | Instalar desde Play en Android físico y guardar resultados de Auth, deep links, mapas, solicitudes, baja y actualización. |
| FCM | Worker y tarea programada activos; 1 dispositivo registrado, cola vacía | Verificar entrega en primer plano, segundo plano y app terminada; tocar aviso y comprobar deep link. |
| Ficha | Icono y gráfico guardados; borrador sin capturas de teléfono | Subir de 2 a 8 capturas actuales de la app; revisar declaraciones/políticas y acceso de revisión. |
| Lanzamiento público | No solicitado | Completar protección de UGC y eliminación probada; verificar elegibilidad y requisitos de prueba cerrada. |

## Orden de trabajo recomendado

1. **P0 — Prueba instalada:** instalar `0.3.1 (3)` desde Play en Android físico; validar Auth, navegación, apertura de ficha desde mapa, solicitud, chat, baja y push.
2. **P0 — Seguridad y privacidad:** revisión focal de RPC/RLS y avisos de Supabase; probar eliminación con una cuenta controlada; completar reporte/bloqueo general y moderación.
3. **P0 — Piloto operable:** designar operador y tiempos de soporte; hacer E2E con cuentas de cliente y especialista; restaurar un respaldo y revisar accesibilidad.
4. **P0 — Ficha Play:** capturas reales y actuales; revisar y completar formularios aplicables. Confirmar tipo y antigüedad de la cuenta para decidir las condiciones de prueba cerrada.
5. **P1 — Oferta real:** conseguir perfiles aprobados y consentimiento; definir cobertura aproximada sin exponer domicilios; validar categorías y rangos con prestadores locales.
6. **P1 — Mejoras de producto:** adjuntos privados a solicitudes, correo transaccional, lecturas persistentes de chat, favoritos, estados vacíos/error y métricas de popularidad con muestra suficiente.

Para criterios de cierre, prioridad por impacto y mejoras detalladas, consulte [`AUDITORIA_PENDIENTES_2026-10-19.md`](AUDITORIA_PENDIENTES_2026-10-19.md), [`PLAN_IMPLEMENTACION.md`](PLAN_IMPLEMENTACION.md) y [`PLAN_PUBLICACION_GOOGLE_PLAY.md`](PLAN_PUBLICACION_GOOGLE_PLAY.md).
