# Estado verificable de las fases 1–5

| Fase | Implementado | Evidencia y límite |
| --- | --- | --- |
| 1 Fundación | React/TS, compilación reproducible, Auth, esquema y RLS de tablas públicas | `npm ci`, `npm run build`, migraciones y prueba de aislamiento. Falta confirmar y recuperar cuentas con correo real desde el dominio final, y cerrar la revisión focal de RPC/RLS indicada abajo. |
| 2 Oferta | Alta editable de prestador, oficio, municipio, disponibilidad, revisión humana, catálogo y comparación | Un prestador no se autoaprueba. El catálogo aún no tiene perfiles reales aprobados ni validación presencial; no hay portafolio de imágenes. |
| 3 Contratación | Solicitud a hasta cinco prestadores, cotizaciones inmutables por versión, aceptación transaccional única, ticket, dirección privada y mensajes privados añadidos en el incremento de comunicación | La prueba SQL bloquea una segunda contratación y el acceso de terceros a dirección/oferta. Falta E2E con personas; adjuntos permanecen pendientes. |
| 4 Confianza | Estados, historial, reseña única tras finalización, incidencias, avisos internos, apelaciones y métricas agregadas | La lógica técnica está implementada; las pruebas con actores reales, la operación de soporte y la revisión humana de casos siguen pendientes. |
| 5 Piloto | Guía de operación, indicadores y criterios de salida | Aún no se realizaron entrevistas, pruebas con dispositivos Android/iOS, respaldo restaurado ni una contratación real. No se declara listo para lanzamiento público. |

La prueba de `tests/flow.integration.sql` se ejecutó contra el proyecto independiente de YoResuelvo! en una transacción revertida: aislamiento de dos clientes, dirección exclusiva para las partes, doble aceptación bloqueada, cuatro eventos de estado y una reseña por trabajo. El catálogo real permanece vacío hasta que una persona autorizada apruebe perfiles.

Los incrementos antes descritos como fases 6–13 (mensajería, preferencias/exportación, cobertura, oportunidades, apelaciones, métricas y smoke de release) tienen implementación técnica aplicada. No equivalen a piloto terminado: correo/push y adjuntos no están habilitados, y Capacitor/Android nativo de YoResuelvo! no se ha implementado. Consulta el [plan de implementación actualizado](PLAN_IMPLEMENTACION.md).

## Revisión actual de Supabase

En la lectura del Security Advisor del 16 de octubre de 2026 se observaron 12 RPC `SECURITY DEFINER` ejecutables por `authenticated`, una (`published_reviews`) ejecutable por `anon`, y tres tablas `private` con RLS sin políticas. El Performance Advisor informa 25 índices no usados. Antes del piloto se debe verificar el cuerpo, `search_path`, grants y autorización interna de cada función; comprobar que la RPC pública solo devuelve reseñas publicadas; y documentar el aislamiento previsto del esquema privado. Los índices son avisos informativos para revisar después de obtener carga real, no se borran a ciegas.

## Alcance restante antes del piloto externo

1. Verificar confirmación y recuperación de cuenta desde el dominio final y configurar correo transaccional con su remitente real.
2. Crear un operador por canal administrativo seguro; no conceder privilegios mediante metadatos editables por el usuario.
3. Probar el recorrido completo con cuentas reales de cliente y prestador, incluida aprobación, cotización, cancelación, incidencia y reseña.
4. Revisar accesibilidad con teclado y lector de pantalla y probar en Android, iOS y escritorio.
5. Restaurar un respaldo en proyecto aislado, documentar RPO/RTO, política de datos, responsable de soporte y procedimiento de apelación.
6. Validar categorías, cobertura y rangos orientativos con prestadores locales antes de anunciarlos como oferta real.

## Incremento preparado: fases 6–9

| Fase | Núcleo técnico | Límite de salida |
| --- | --- | --- |
| 6 Comunicación | Mensajes privados ligados a un ticket, con RLS por participantes y aviso interno opcional | Correo/push siguen desactivados hasta contar con proveedor y consentimiento verificable. |
| 7 PWA/Android | Manifiesto instalable y caché de contingencia de la interfaz | Capacitor, APK y push requieren pruebas físicas Android/iOS; no se declaran listos. |
| 8 Expansión | RPC de cobertura por municipio/oficio, calculada solo con perfiles aprobados y disponibles | No abrir un municipio sin oferta validada y responsable operativo. |
| 9 Oportunidades | Publicación e interés filtrados por oficio, municipio y prestador aprobado; sin teléfonos ni dirección | La conversión a contratación debe seguir el flujo de solicitud/cotización/ticket. |

## Incremento preparado: fases 10–13

| Fase | Núcleo técnico | Límite de salida |
| --- | --- | --- |
| 10 Privacidad | Exportación JSON descargada localmente, consultas limitadas por RLS y preferencia de avisos dentro de la app | Correo y push siguen bloqueados en base de datos hasta tener proveedor, pruebas y consentimiento. La exportación no es un mecanismo de borrado de cuenta. |
| 11 Apelaciones | Apelación de una resolución durante 30 días, respuesta del moderador y reapertura auditada si se acepta | Las resoluciones anteriores a esta migración no tienen fecha de resolución fiable y por eso no son apelables desde el nuevo flujo. No es arbitraje financiero. |
| 12 Operación | Métricas agregadas de solicitudes, oferta activa, primera cotización, cierres, incidencias y apelaciones | El panel no muestra PII; porcentajes y medianas se interpretan junto a su tamaño de muestra. No se deben anunciar como resultados del piloto. |
| 13 Calidad de release | CI compila, prueba dominio y verifica manifest, service worker y bundles estáticos | No sustituye pruebas con usuarios, revisión de accesibilidad, instalación en dispositivos ni un respaldo restaurado. |

Las fases 10–13 amplían la base técnica en Supabase y la aplicación; no se declara lista la fase 5 ni autorizado el lanzamiento público. El proyecto conserva la protección SSO de Vercel y la PWA no habilita push ni correo.
