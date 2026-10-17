# Ruta de publicación Android · YoResuelvo!

**Actualizado:** 17 de octubre de 2026  
**Estado:** app creada como borrador en Play Console; preparación técnica parcial. Todavía no existe un AAB firmado y validado ni una ficha de Play Store lista para revisión.

## Punto de partida comprobado

- Play Console está abierta en la cuenta de desarrollador `TheLogosDev`, de tipo personal. Los datos principales del perfil del desarrollador y sus verificaciones siguen vigentes. No se copian datos personales al repositorio.
- La app `YoResuelvo!` ya está creada y aparece como borrador en Play Console. Idioma predeterminado: español (Latinoamérica), `es-419`; tipo: Aplicación; distribución: gratuita.
- Paquete Android: `mx.yoresuelvo.app`. La sección Verificación de desarrolladores de Android ya muestra el paquete como **Registrado**, con tres claves asociadas. Tras crear el primer AAB firmado hay que confirmar que la clave de carga elegida coincide con la registrada.
- En Contenido de la app siguen pendientes cinco declaraciones: política de privacidad, detalles de acceso, clasificación del contenido, público objetivo y Seguridad de los datos. La ficha predeterminada de Play Store ya tiene textos guardados como borrador, pero faltan el ícono de tienda, el gráfico de funciones y entre dos y ocho capturas reales de teléfono.
- Se guardaron las declaraciones factuales de que la app no contiene anuncios, no es gubernamental, no ofrece funciones financieras ni de salud y no usa el ID de publicidad de Android. Aún no se enviaron cambios a revisión.
- La categoría guardada es `Vivienda y hogar`. El correo público de contacto de la ficha reutiliza el correo de desarrollador que ya aparece en el perfil público; teléfono y sitio web de soporte de esta app aún no se configuraron.
- Capacitor comparte la app React/Vite con la PWA.
- `compileSdkVersion = 36` y `targetSdkVersion = 36`, requisito vigente para nuevas apps y actualizaciones desde el 31 de agosto de 2026.
- Existe `npm run android:aab`, que ejecuta `bundleRelease`, pero el proyecto no tiene configurado `signingConfig` de release.
- `android/app/google-services.json` está presente localmente para Firebase `yoresuelvo-2822f`; no se ha hecho una compilación release que valide Google Services ni una entrega FCM en dispositivo.
- `versionCode = 1`, `versionName = 1.0`.
- La fecha de creación de la cuenta aún no se confirmó; verificarla para determinar si aplica el requisito de 12 testers/14 días antes de solicitar producción.
- La consola y las herramientas de desarrollo no reemplazan una prueba instalada en un Android real.

## Bloqueadores de producción que se atienden antes de solicitar revisión

1. **Eliminar cuenta y datos:** hoy la app exporta datos, pero no ofrece solicitud de eliminación dentro de la app ni un enlace web público para solicitarla. Hay que diseñar eliminación con Supabase Auth, datos propios, Storage, auditoría y las retenciones legales/operativas que correspondan; publicar también el recurso web de solicitud.
2. **Seguridad de contenido y usuarios:** YoResuelvo publica perfiles, imágenes, reseñas y ofrece chat. Antes de revisión se deben publicar reglas de contenido, habilitar reporte de perfiles y contenido, bloqueo de usuarios, flujo de moderación y canal de soporte. El reporte actual está asociado al ticket; no basta para reportar cualquier perfil público.
3. **Privacidad y transparencia:** publicar una política de privacidad accesible desde la app y Play Store; completar Data safety con un inventario real de Supabase Auth, base de datos, Storage, FCM y SDK incluidos. La declaración debe corresponder al comportamiento y al aviso de privacidad.
4. **Artefacto y firma:** crear llave de carga, guardarla fuera del repo y configurar firma de release. Activar Play App Signing en la primera carga; no publicar credenciales ni archivos de firma en GitHub, Vercel o el bundle.
5. **Operación de Play:** completar identidad y verificación de desarrollador, ficha de tienda, clasificación de contenido, declaraciones de la app y datos de acceso para revisión. Revisar el registro del paquete Android tras la puesta al día de verificación para desarrolladores de septiembre de 2026.

### Estado actual de configuración en Play Console

La creación de la app ya se completó en la cuenta. No se ha enviado el borrador de ficha, las declaraciones ni una versión a revisión. Las declaraciones sobre privacidad, acceso, clasificación, público y Seguridad de los datos deben completarse después de publicar la política y el proceso de eliminación, preparar un acceso de prueba seguro y cerrar la moderación del contenido generado por usuarios. No declarar cumplimiento general mientras sigan abiertos estos requisitos.

## Ruta secuencial de lanzamiento

| Paso | Trabajo | Salida comprobable | Bloquea |
|---|---|---|---|
| 0. Confirmar Play Console | Verificar administrador y tipo de cuenta, datos del desarrollador, app `YoResuelvo!`, paquete Android y registro de verificación | App borrador creada; paquete `mx.yoresuelvo.app` registrado | Todos |
| 1. Cerrar seguridad de producto | Implementar eliminación de cuenta y ruta web; términos de uso y reglas UGC; reporte de usuario/perfil/contenido, bloquear, ocultar y moderar; soporte y apelación | Pruebas funcionales de eliminación y moderación; URLs públicas de políticas | Carga a revisión |
| 2. Completar contenido de Play | Crear ficha con nombre, descripciones, ícono, feature graphic, capturas actuales, categoría, contacto y URL de privacidad; llenar App content, Data safety, clasificación IARC, anuncios y acceso de revisión | Formularios guardados y revisión previa sin declaraciones faltantes | Revisión de cada track |
| 3. Preparar el release Android | Confirmar paquete estable, `versionCode` creciente, `versionName`, API 36; proteger y aplicar llave de carga; dejar Play App Signing activado en la primera carga; verificar Firebase para Android/web y variables necesarias | Build de release firmado y configuración de Play App Signing | Subida de AAB |
| 4. Generar y validar AAB | Ejecutar build limpio, compilar `bundleRelease`, analizar artefacto y revisar firma, paquete, API, permisos, tamaños y recursos; probar instalación/sesión/push desde una versión equivalente | `android/app/build/outputs/bundle/release/app-release.aab` validado y asociado a commit/tag | Track interno |
| 5. Prueba interna | Subir AAB a Internal testing, instalarlo desde Play en dispositivos del equipo; probar Google Auth y deep link, sesión persistente, solicitudes, perfiles, reportes, eliminación, chat, permisos/notificaciones, offline/red y actualización | Checklist por dispositivo con errores corregidos y feedback registrado | Closed testing/producción |
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

La última orden todavía no producirá un AAB aceptable para Google Play hasta que exista una configuración de firma release con llave de carga. Antes de ejecutarla en producción: revisar `android/app/build.gradle`, asegurar que Gradle no puede leer credenciales desde el repo, generar el bundle, validar firma y hacer carga primero en Internal testing.

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
