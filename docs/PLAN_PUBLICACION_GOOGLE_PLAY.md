# Ruta de publicación Android · YoResuelvo!

**Actualizado:** 19 de octubre de 2026  
**Estado:** PWA y pista interna de Google Play están en `0.3.1` / código `3`. El AAB está activo y disponible para verificadores internos; aún no hay publicación pública. La ficha sigue en borrador y requiere capturas reales de teléfono y revisión de los formularios aplicables. Ver [`AUDITORIA_PENDIENTES_2026-10-19.md`](AUDITORIA_PENDIENTES_2026-10-19.md) para los bloqueadores y criterios de cierre.

## Release interno · 0.3.1 (3)

El release incluye un mapa OSM interactivo y una vista de prueba `/?demo=mapa` con cuatro perfiles ficticios, imágenes ilustrativas y calificaciones simuladas. Los datos viven en el frontend y no requieren migración ni escritura en Supabase; la acción de solicitar está deshabilitada en esa vista. La ruta está desplegada en Vercel y el AAB `0.3.1 (3)` está activo en la pista interna. El mapa y los datos ficticios no representan oferta real.

La vista del mapa se revisó en producción y muestra la advertencia de datos ficticios y la atribución de OpenStreetMap. Sigue pendiente la instalación desde Play en un Android físico y la prueba de apertura de ficha desde marcador/tarjeta. La ficha de Play no está enviada a revisión pública.

## Punto de partida comprobado

- Play Console está abierta en la cuenta de desarrollador de tipo personal. Los datos principales del perfil y sus verificaciones siguen vigentes. No se copian identificadores de cuenta ni datos personales al repositorio.
- La app `YoResuelvo!` está creada; el track interno está activo, mientras la ficha de tienda y sus formularios continúan en borrador. Idioma predeterminado: español (Latinoamérica), `es-419`; tipo: Aplicación; distribución: gratuita.
- Paquete Android: `mx.yoresuelvo.app`. La sección Verificación de desarrolladores de Android ya muestra el paquete como **Registrado**, con tres claves asociadas. Tras crear el primer AAB firmado hay que confirmar que la clave de carga elegida coincide con la registrada.
- La ficha predeterminada tiene textos, icono de 512 × 512 y gráfico de funciones guardados como borrador; faltan de 2 a 8 capturas actuales de teléfono. Revisar el estado de cada declaración de Contenido de la app antes de enviar; su estado completo no se volvió a auditar en este corte.
- Se guardaron las declaraciones factuales de que la app no contiene anuncios, no es gubernamental, no ofrece funciones financieras ni de salud y no usa el ID de publicidad de Android. Aún no se enviaron cambios a revisión.
- La categoría guardada es `Vivienda y hogar`. El correo público de contacto de la ficha reutiliza el correo de desarrollador que ya aparece en el perfil público; teléfono y sitio web de soporte de esta app aún no se configuraron.
- Capacitor comparte la app React/Vite con la PWA.
- `compileSdkVersion = 36` y `targetSdkVersion = 36`, requisito vigente para nuevas apps y actualizaciones desde el 31 de agosto de 2026.
- Existe `npm run android:aab`, que ejecuta `bundleRelease`. Hay una llave de carga protegida fuera del repo; el `signingConfig` aún debe conectarse a esa llave sin copiarla al repositorio.
- `android/app/google-services.json` está presente localmente para el proyecto Firebase de YoResuelvo!; no se ha hecho una compilación release que valide Google Services ni una entrega FCM en dispositivo.
- `release-version.json` fija `versionName = 0.3.1`, `versionCode = 3`; Android y la PWA leen/comprueban el mismo número durante el build. Producción PWA y pista interna están alineadas.
- Play aceptó el AAB `0.3.1 (3)` y lo muestra activo en prueba interna. La validación pendiente es instalarlo desde Play en un dispositivo físico y recorrer Auth, deep links, solicitudes, chat, baja y push; el entorno de trabajo no tiene `adb` ni emulador disponible.
- La fecha de creación de la cuenta aún no se confirmó; verificarla para determinar si aplica el requisito de 12 testers/14 días antes de solicitar producción.
- La consola y las herramientas de desarrollo no reemplazan una prueba instalada en un Android real.

## Bloqueadores de producción que se atienden antes de solicitar revisión

1. **Eliminar cuenta y datos:** la política acordada borra los datos asociados a la cuenta, incluidas conversaciones y reseñas; cancela solicitudes contratadas cuyo proveedor seleccionado se elimina; y conserva el ticket del servicio como snapshot de seguridad, desvinculado de la cuenta. La migración `account_deletion_cascades` y la Edge Function `delete-account` v1 ya están activas en Supabase producción. No se ejecutó ninguna baja durante el despliegue. Antes de enviar la app a revisión, falta publicar/verificar la ruta web de eliminación y completar una prueba de extremo a extremo con una cuenta controlada, comprobando la cancelación, la eliminación de datos y la conservación del ticket.
2. **Seguridad de contenido y usuarios:** YoResuelvo publica perfiles, imágenes, reseñas y ofrece chat. Antes de revisión se deben publicar reglas de contenido, habilitar reporte de perfiles y contenido, bloqueo de usuarios, flujo de moderación y canal de soporte. El reporte actual está asociado al ticket; no basta para reportar cualquier perfil público.
3. **Privacidad y transparencia:** el borrador de política y términos existe localmente, identifica al responsable de YoResuelvo! y usa el correo público del perfil de desarrollador; publicar las páginas y revisar la descripción de retención antes de completar Data safety. Declarar Supabase Auth, base de datos, Storage, FCM y SDK con el comportamiento real.
4. **Artefacto y firma:** AAB `0.3.1 (3)` cargado y activo en la pista interna. Mantener la llave de carga fuera del repositorio y probar la instalación/update desde Play antes de preparar otra versión.
5. **Arte de tienda y operación:** icono y gráfico 1024 × 500 guardados; subir capturas reales y completar identidad, clasificación, declaraciones y acceso para revisión. Revisar el registro de paquete Android tras la puesta al día de verificación de septiembre de 2026.

### Estado actual de configuración en Play Console

La creación de la app y la subida del release interno `0.3.1 (3)` están completadas. El borrador de ficha no se ha enviado a revisión pública. Antes de enviar, verificar en consola privacidad, acceso, clasificación, público, Seguridad de los datos, política pública, proceso probado de eliminación y moderación de UGC. No declarar cumplimiento general mientras sigan abiertos estos requisitos.

## Ruta secuencial de lanzamiento

| Paso | Trabajo | Salida comprobable | Bloquea |
|---|---|---|---|
| 0. Confirmar Play Console | Verificar administrador y tipo de cuenta, datos del desarrollador, app `YoResuelvo!`, paquete Android y registro de verificación | App borrador creada; paquete `mx.yoresuelvo.app` registrado | Todos |
| 1. Cerrar seguridad de producto | Implementar eliminación de cuenta y ruta web; términos de uso y reglas UGC; reporte de usuario/perfil/contenido, bloquear, ocultar y moderar; soporte y apelación | Pruebas funcionales de eliminación y moderación; URLs públicas de políticas | Carga a revisión |
| 2. Completar contenido de Play | Crear ficha con nombre, descripciones, ícono, feature graphic, capturas actuales, categoría, contacto y URL de privacidad; llenar App content, Data safety, clasificación IARC, anuncios y acceso de revisión | Formularios guardados y revisión previa sin declaraciones faltantes | Revisión de cada track |
| 3. Preparar el release Android | `0.3.1 (3)` está firmado/cargado; mantener paquete y `versionCode` creciente para próximos releases y proteger la llave | Release interno activo; firma fuera del repo | Prueba desde Play |
| 4. Instalar y validar | Instalar `0.3.1 (3)` desde Play en dispositivo físico; probar firma/update, Auth/deep links, solicitudes, perfiles, baja, chat, red y FCM foreground/background | Checklist en dispositivo con evidencia y hallazgos registrados | Closed testing |
| 5. Completar pista de prueba | Confirmar grupo interno; corregir hallazgos; preparar closed testing y verificar elegibilidad de cuenta | Evidencia de prueba, feedback y respuestas de política | Solicitud de acceso a producción |
| 6. Closed testing | Publicar release firmado, invitar testers, recoger feedback, observar crashes/ANR y corregir; mantener testers optados-in y versión disponible | Evidencia de participación, incidencias, respuestas y nueva carga si hubo cambios | Producción, según tipo de cuenta |
| 7. Solicitar acceso a producción | Si la cuenta es personal creada después del 13 nov 2023: completar closed test con al menos 12 testers optados-in continuamente durante 14 días y contestar las preguntas de acceso en Play Console. Si no aplica, seguir las puertas visibles en la cuenta | Producción habilitada por Google y formularios respondidos | Release de producción |
| 8. Despliegue gradual | Subir el AAB aprobado a Production, revisar países/dispositivos, notas de versión y porcentaje de lanzamiento; empezar con porcentaje pequeño, monitorear Android Vitals, reseñas y soporte; pausar o retroceder si aparece regresión | Versión pública estable y responsable de guardia/soporte asignado | Escala a 100% |
| 9. Operación continua | Versionar cada cambio, incrementar `versionCode`, revisar políticas, API objetivo anual, Android Vitals, FCM, errores y solicitudes de eliminación; probar antes en interno/cerrado | Cadencia de actualización y plan de respuesta a incidentes | Releases posteriores |

### Comandos actuales del proyecto

```sh
npm ci
npm run build
npm test
npm run test:release
npm run android:sync
npm run android:aab
```

El AAB `0.3.1 (3)` ya está cargado. Ejecuta `npm run android:aab` solo para un nuevo release, incrementa el código de versión y conserva la llave/contraseñas fuera del repositorio, Vercel y el bundle web.

## Identidad visual de la versión

La app y la PWA usan la opción 06 · Profunda: azul `#223745`, naranja `#C64F1D`, miel `#F2B441`, arcilla `#E9B99D` y marfil `#FFF7ED`. El icono 512 × 512 mantiene transparencia exterior; los recursos 192 × 192, 180 × 180, launcher adaptativo y splash Android parten del mismo arte aprobado. Revisar el recorte final en Play Console y en máscaras del launcher antes de publicar.

## Seguridad de firma y Firebase

- Play App Signing: Google conserva la clave de firma de distribución; YoResuelvo conserva una llave de carga separada para subir actualizaciones.
- Guardar keystore y passwords en un almacén seguro y respaldado, con acceso limitado; documentar recuperación. No generar una segunda llave sin plan de rotación.
- El `google-services.json` descargado contiene configuración de Firebase del cliente Android. Mantenerlo fuera del repo público según la decisión actual; para CI, inyectarlo como archivo secreto protegido. Nunca poner la cuenta de servicio FCM, service role de Supabase o llave privada en `VITE_*` ni dentro de la app.
- Para marcar FCM listo: compilar, instalar desde track, permitir notificaciones, registrar token, enviar mensaje de prueba por el worker de producción, verificar app foreground/background/terminada, tocar y comprobar deep link, retirar permiso y comprobar bajas/token inválido.

## Ruta inspirada en Oficiá, adaptada

Se conserva el aprendizaje de Oficiá: un solo frontend para web/PWA y Capacitor, backend Supabase independiente con Auth/RLS/migraciones, Firebase para mensajería, entrega por etapas y validación operativa antes de escalar. La ruta de Android sigue esa misma disciplina:

1. **Fundación:** paquete, Auth, sesión y deep links.
2. **Flujo de oferta:** catálogo, perfil y disponibilidad.
3. **Acuerdo completo:** solicitud → cotización → aceptación → ticket → chat/cierre.
4. **Confianza:** reportes, bloqueo, reseñas verificadas, privacidad y eliminación.
5. **Calidad:** pruebas locales, integración real, Android interno y closed testing.
6. **Lanzamiento:** producción gradual, soporte y métricas.

Se toman patrones y aprendizajes, no cuentas, datos, credenciales ni infraestructura de Oficiá. El AAB de Play usa exclusivamente Supabase, Firebase, dominio y package ID de YoResuelvo.

## Requisitos oficiales consultados

- [Requisitos vigentes de API objetivo](https://support.google.com/googleplay/android-developer/answer/11926878): API 36 desde 31 ago 2026 para apps nuevas y actualizaciones.
- [Pruebas para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465): 12 testers y 14 días continuos para cuentas personales posteriores al 13 nov 2023.
- [Firmar la app y Play App Signing](https://developer.android.com/studio/publish/app-signing).
- [Configuración de ficha y app en Play Console](https://support.google.com/googleplay/android-developer/answer/9859152).
- [Eliminar cuenta y datos](https://support.google.com/googleplay/android-developer/answer/13327111).
- [Política de contenido generado por usuarios](https://support.google.com/googleplay/android-developer/answer/9876937).
- [Verificación de desarrolladores Android](https://developer.android.com/developer-verification).

## Criterio de salida

No declarar producción lista hasta tener: cuenta/paquete verificados; bloqueadores de seguridad resueltos; aviso de privacidad, eliminación y Data safety consistentes; AAB firmado y validado; Internal y closed testing aprobados; testing de FCM en Android; autorización de producción si aplica; release revisado por Google y plan de soporte activo.

## Verificación de ficha · 19 de octubre de 2026

La ficha predeterminada `YoResuelvo!` (es-419) conserva nombre, descripción, icono 512×512 y gráfico 1024×500 en borrador. El release interno `0.3.1 (3)` está activo; faltan de 2 a 8 capturas reales de teléfono. Revisar el estado de formularios y declaraciones antes de enviar. El texto de Operaciones no debe prometer respuesta inmediata mientras no haya staff asignado.
