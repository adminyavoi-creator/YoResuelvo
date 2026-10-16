# Verificación de release — YoResuelvo!

Esta lista es una puerta de salida, no evidencia de que el piloto ya se haya completado. Un build verde confirma artefactos; no confirma operación ni seguridad de punta a punta.

## Automatizado en CI

- [ ] `npm ci` instala desde el lockfile.
- [ ] `npm run build` ejecuta TypeScript y genera la app Vite.
- [ ] `npm test` pasa las pruebas de dominio.
- [ ] `npm run test:release` valida HTML, manifiesto PWA, service worker y bundles; falla si detecta un marcador de clave secreta en JavaScript.
- [ ] La preview de Vercel llega a `READY` para el commit exacto revisado; no desactivar Deployment Protection/SSO.

## Revisión funcional y privacidad

- [ ] Confirmación y recuperación de cuenta desde el dominio de preview, con correos reales configurados.
- [ ] Aislamiento con cuentas distintas: solicitudes, cotizaciones, direcciones, mensajes, notificaciones, apelaciones y exportaciones.
- [ ] Verificar que un usuario no puede asignarse rol de moderación/administración.
- [ ] Probar resolución y apelación dentro/fuera de 30 días; aceptación debe reabrir el servicio y dejar evento auditado.
- [ ] Confirmar que preferencias `in_app` se respetan y que correo/push permanecen apagados mientras no haya proveedor y consentimiento.
- [ ] Revisar manualmente que el JSON exportado se descarga localmente y solo contiene registros propios o de servicios donde la cuenta participa.
- [ ] Acordar aviso de privacidad, conservación/baja de datos y responsable/canal de soporte antes de incorporar personas externas.

## Validación previa al piloto

- [ ] Recorrer contratación con cuentas reales de cliente y prestador, desde solicitud hasta reseña.
- [ ] Revisar navegación con teclado, foco visible, zoom, lector de pantalla y contraste.
- [ ] Instalar y probar en Android, iOS y escritorio; documentar cualquier límite del modo offline.
- [ ] Validar categorías, cobertura y rangos con prestadores locales; no presentar ejemplos ficticios como oferta real.
- [ ] Restaurar un respaldo en un proyecto aislado y documentar RPO/RTO.
- [ ] Asignar responsables de soporte y apelaciones; acordar tiempos de respuesta y revisión semanal de métricas con tamaños de muestra.
- [ ] Confirmar que no hay pagos, billeteras ni promesas de seguro/garantía financiera dentro de la plataforma.

Solo declarar listo el piloto cuando estén cerrados los controles manuales aplicables y exista aprobación de producto/operación.
