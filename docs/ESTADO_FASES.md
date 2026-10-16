# Estado verificable de las fases 1–5

| Fase | Implementado | Evidencia y límite |
| --- | --- | --- |
| 1 Fundación | React/TS, compilación reproducible, Auth, esquema y RLS de tablas públicas | `npm ci`, `npm run build`, migraciones y prueba de aislamiento. Falta una ejecución de confirmación y recuperación por correo desde el dominio de preview. |
| 2 Oferta | Alta editable de prestador, oficio, municipio, disponibilidad, revisión humana, catálogo y comparación | Un prestador no se autoaprueba. No hay perfiles reales cargados ni validación presencial de credenciales. |
| 3 Contratación | Solicitud a hasta cinco prestadores, cotizaciones inmutables por versión, aceptación transaccional única, ticket y dirección privada | La prueba SQL comprueba un solo trabajo por solicitud y que un tercero no ve la dirección ni la oferta. Mensajería y adjuntos quedan fuera de este incremento. |
| 4 Confianza | Estados, historial, reseña única tras finalización, incidencias, avisos y panel de moderación de reseñas | El circuito de apelación y las pruebas con actores reales requieren operación humana. |
| 5 Piloto | Guía de operación, indicadores y criterios de salida | Aún no se realizaron entrevistas, pruebas con dispositivos Android/iOS, respaldo restaurado ni una contratación real. No se declara listo para lanzamiento público. |

La prueba de `tests/flow.integration.sql` se ejecutó contra el proyecto independiente de YoResuelvo! en una transacción revertida: aislamiento de dos clientes, dirección exclusiva para las partes, doble aceptación bloqueada, cuatro eventos de estado y una reseña por trabajo. El catálogo real permanece vacío hasta que una persona autorizada apruebe perfiles.

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
