# Plan integral de desarrollo — YoResuelvo! · revisión 03
## 1. Objetivo
Conectar hogares y negocios de Delicias con prestadores de servicios para descubrir, comparar, solicitar cotizaciones y formalizar acuerdos mediante tickets. La plataforma no cobra al cliente, no retiene dinero y no opera billeteras. El pago se acuerda y realiza directamente entre las partes.

## Visión YoResuelvo!
Impulsar oportunidades de ingreso para personas con habilidades y facilitar soluciones para hogares y negocios. Dos entradas claras: Necesito resolver / Quiero ofrecer mis servicios. Reputación basada en trabajos completados y comparación por tarea, alcance y rangos orientativos de costos.

## 2. Cobertura y catálogo
Piloto en Delicias; expansión por oferta comprobada a Meoqui, Rosales, Saucillo, Camargo y Jiménez. Categorías iniciales: electricidad, cerrajería, plomería, mandados, limpieza, refrigeración, albañilería, pintura, carpintería, jardinería, mecánica y soporte técnico. Catálogo administrable; especialidades, cobertura, disponibilidad, modalidad presencial/remota y restricciones por servicio. No anunciar atención de emergencias públicas.

## 3. Roles
Visitante: catálogo, perfiles públicos y comparación. Cliente: cuenta, solicitudes, selección de cotización, mensajes, tickets y reseñas. Prestador: alta de perfil, especialidades, cobertura, portafolio, disponibilidad, cotizaciones y gestión de servicios. Moderador: reportes y contenido. Administrador: categorías, habilitación, incidentes y auditoría. Una cuenta puede ser cliente y prestador. El rol administrativo nunca se obtiene editando el perfil.

## 4. Recorrido principal
Buscar → filtrar por municipio/categoría/disponibilidad → comparar hasta tres prestadores → describir trabajo y horario → recibir cotizaciones → aceptar una versión → generar ticket → agendar → iniciar → técnico reporta terminación → cliente confirma → reseñar.

La dirección exacta se revela solo al prestador contratado. No publicar teléfonos particulares ni documentos de identidad. Antes de aceptar una cotización se muestran alcance, materiales incluidos, exclusiones, importe estimado o fijo, traslado, vigencia y condiciones de cancelación. Cualquier cambio exige nueva versión y consentimiento de ambas partes.

## 5. Módulos
- Inicio y catálogo con búsqueda, filtros, orden por relevancia, precio orientativo y reseñas; identificar anuncios pagados si existen en el futuro.
- Perfil con experiencia declarada, trabajos, horarios, cobertura y reseñas. Separar identidad revisada de habilitación profesional.
- Solicitudes con descripción, adjuntos privados, urgencia y agenda; invitación a prestadores elegidos, límite inicial de cinco para evitar spam.
- Cotizaciones versionadas y comparación de alcances; nunca ordenar ofertas no equivalentes solo por precio.
- Contratación con aceptación atómica, agenda, historial y mensajería privada.
- Ticket imprimible con folio único, fecha, partes, alcance, cotización aceptada, cambios y estado. No es CFDI ni comprobante de cobro.
- Reseñas de 1–5 estrellas, texto y respuesta del técnico; una por servicio completado, sin autorreseñas. Reportes y moderación trazables.
- Panel cliente y técnico; administración de catálogo, reportes, bloqueos y métricas.
- Notificaciones dentro de la aplicación; correo transaccional y push en fase posterior mediante proveedor configurado.

## 6. Estados y excepciones
Solicitud: borrador, abierta, contratada, cancelada, vencida. Cotización: enviada, sustituida, aceptada, rechazada, vencida. Servicio: confirmado, agendado, en_progreso, terminacion_reportada, completado, cancelado, en_disputa. Solo el cliente confirma completado; el administrador resuelve disputas con motivo auditado. Cancelación posterior al inicio debe pasar por incidencia. La plataforma documenta desacuerdos; no procesa reembolsos ni arbitra movimientos financieros.

## 7. Fases y estimación orientativa
| Fase | Duración estimada | Resultado y puerta de salida |
|---|---|---|
| 0 Definición | 1 semana | Identidad, entrevistas con clientes/técnicos, alcance y prototipo validados |
| 1 Fundación | 1–2 semanas | Repo, CI, entornos, Auth, RLS y catálogo; pruebas de aislamiento aprobadas |
| 2 Oferta | 2 semanas | Altas de técnicos, perfiles, moderación, búsqueda y comparación |
| 3 Contratación | 2–3 semanas | Solicitudes, cotizaciones versionadas, aceptación atómica, agenda y ticket |
| 4 Confianza | 2 semanas | Cierre, reseñas verificadas por servicio, reportes y paneles |
| 5 Piloto | 2 semanas | Pruebas móviles, accesibilidad, respaldo/restauración y piloto acotado |
| 6 Comunicación | Posterior | Mensajes privados por ticket, avisos y preferencias respetadas |
| 7 PWA/Android | Posterior | Instalación web, pruebas móviles y evaluación de Capacitor/push |
| 8 Expansión | Posterior | Cobertura verificable por municipio/oficio antes de abrir una zona |
| 9 Oportunidades | Posterior | Bolsa acotada por oficio/zona, intereses trazables y sin contacto público |

Total orientativo de las fases 0–5: 10–12 semanas con dedicación estable; las fases 6–9 se habilitan después del piloto y requieren medición de uso. El incremento técnico de las fases 1–4 se implementó para un piloto; la validación de la fase 5 y varios módulos del alcance completo siguen pendientes. Véase `ESTADO_FASES.md`.

## 8. Criterios de lanzamiento
Cero acceso cruzado entre clientes; ningún usuario puede autoasignarse administrador; aceptación concurrente produce una sola contratación; folios únicos; reseña solo de cliente con servicio completado; direcciones/adjuntos privados; historial de cambios; recuperación de cuenta; bajas y conservación definidas; ningún flujo solicita tarjeta o saldo. Pruebas en Android, iOS y escritorio. La demo no cuenta como verificación productiva.

## 9. Operación y medición
Indicadores: solicitudes válidas, tiempo a primera cotización, conversión a contratación, finalización, cancelaciones, reportes, reincidencia y prestadores activos por categoría/municipio. Mostrar promedios con volumen de muestra. Revisar semanalmente oferta insuficiente y servicios sin respuesta. Selección inicial orientativa de 20–30 técnicos y piloto de cuatro semanas, sin presentar estas metas como resultados reales.

## 10. Sostenibilidad y gobernanza
Piloto sin cobros de plataforma. A futuro evaluar suscripción de visibilidad o herramientas profesionales fuera del flujo de contratación; no implementar hasta decisión expresa. Definir responsable de soporte, tiempos de respuesta, proceso de apelación, política de contenido y tratamiento de datos antes del lanzamiento. El correo institucional no se ha creado: requiere dominio y proveedor; no inventar dirección operativa.

## 11. Rangos y oportunidades
Incorporar el módulo detallado en RANGOS_Y_OPORTUNIDADES.md desde la fase de definición. Antes de publicar precios, validar tareas/unidades con prestadores locales; los importes actuales son ficticios. La plataforma ofrece trazabilidad, soporte y mecanismos de reputación; no promete seguro, garantía financiera ni empleo garantizado.

## 12. Secuencia de implementación y responsabilidades
El calendario es relativo al inicio efectivo del desarrollo; no constituye una fecha comprometida.

| Semanas | Entrega | Responsable funcional | Verificación |
|---|---|---|---|
| 1 | Validación de marca, tareas y entrevistas | Producto y diseño | Flujo entendido por clientes y prestadores del piloto |
| 2–3 | Fundación, cuentas y permisos | Desarrollo | Pruebas de aislamiento y recuperación de cuenta |
| 4–5 | Perfil, catálogo y comparación | Desarrollo y operación | Alta aprobada, filtros y comparación móvil |
| 6–8 | Solicitudes, cotizaciones y tickets | Desarrollo | Una aceptación por solicitud, historial y ticket reproducible |
| 9–10 | Cierre, reseñas y moderación | Desarrollo y soporte | Solo participantes autorizados; reseñas de servicios terminados |
| 11–12 | Piloto y ajustes | Producto, soporte y desarrollo | Criterios del apartado 8 y decisión de lanzamiento |

Los roles anteriores son responsabilidades propuestas, aún sin personas asignadas. Los rangos se validan desde semana 1 y se publican solo con datos suficientes. El calendario adopta el extremo de 12 semanas de la estimación previa; esfuerzos simultáneos pueden reducirlo.

## 13. Estado verificable de la entrega
- Disponible: plan, identidad provisional, app React/TS, esquema Supabase y recorridos técnicos de las fases 1–4. Las migraciones y una prueba transaccional de permisos se ejecutaron en el proyecto independiente de YoResuelvo!.
- Pendiente: pruebas con personas y dispositivos reales, operación de soporte, respaldo restaurado, mensajería, adjuntos y validación de rangos locales. Ver `ESTADO_FASES.md` y `PILOTO_OPERACION.md`.
- Marca: propuesta visual original pendiente de cotejar con el logotipo maestro de Yavoi! y validar con el titular.

## 14. Inicio de fase 0 — propuesta 3 Acción

La fase 0 tiene una especificación en `FASE_0_UX_UI.md`. La demo ficticia se conservó en `/demo/`, y la aplicación real usa componentes React/TypeScript con la misma paleta. La investigación con personas de Delicias, el catálogo por tareas y la definición operativa siguen pendientes.
