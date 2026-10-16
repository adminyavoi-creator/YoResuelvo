# Operación del piloto acotado

## Antes de invitar personas

- Confirmar URL, clave publicable, dominios de retorno de Auth y correo de confirmación y recuperación. Mantener el proyecto de Oficia completamente separado.
- Ejecutar `npm ci`, `npm run build`, `npm test`; aplicar migraciones en orden y volver a ejecutar `tests/flow.integration.sql` en una transacción que revierte los datos.
- Revisar los asesores de seguridad y rendimiento de Supabase. Las tablas `private` sin políticas RLS son de denegación total directa y se usan mediante funciones controladas.
- Asignar el primer operador por consola administrativa segura; comprobar la identidad antes de modificar `private.staff`.
- Restaurar un respaldo en un proyecto aislado; medir tiempo y pérdida máxima, y registrar evidencia. No probar restauración encima del proyecto de uso.

## Recorrido de aceptación

| Actor | Acción | Resultado esperado |
| --- | --- | --- |
| Prestador | Registra perfil y oficios | Queda pendiente; no aparece públicamente |
| Operador | Aprueba con motivo | Perfil aparece en catálogo |
| Cliente | Compara y solicita cotización | Solo invitados pueden cotizar |
| Prestador | Envía alcance, materiales, exclusiones y montos | Cliente ve versión y vigencia |
| Cliente | Acepta una versión | Un solo trabajo y ticket con folio; otras propuestas ya no son aceptables |
| Cliente | Guarda dirección exacta | Solo partes contratantes pueden leerla |
| Prestador y cliente | Inician, reportan y confirman terminación | Historial de estados con actor y fecha |
| Cliente | Reseña | Una por trabajo terminado; promedio público basado en reseñas reales |
| Partes y operador | Reportan y resuelven incidencia | Motivo auditable; no se alteran pagos externos |

## Salida del piloto

Registrar fecha, dispositivo, navegador, actor y resultado de cada caso. La decisión de lanzamiento exige cero fugas entre cuentas; una aceptación por solicitud; flujo de correo comprobado; restauración documentada; permisos y moderación revisados; responsables de soporte y tratamiento de datos asignados. Evaluar semanalmente solicitudes válidas, tiempo hasta primera cotización, conversión, cancelaciones, reportes y prestadores activos. El piloto no presupone cifras alcanzadas.
