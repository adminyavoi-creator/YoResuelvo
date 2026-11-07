# YoResuelvo! 0.3.12 · código 14

## Base verificada
Play Console, aplicación YoResuelvo!, prueba interna: 0.3.11, código 13, disponible para verificadores internos, lanzamiento 7 noviembre 2026 a las 03:13 (Chihuahua). Comprobado el 7 de noviembre desde Chrome. El ZIP recibido declara 0.3.11 / 13 en release-version.json, package.json, lockfile y manifiesto PWA; Android toma la versión de release-version.json. No se certifica identidad byte a byte del código fuente con el AAB de Play.
SHA-256 del ZIP original: 914447f486825cbf54a4d6eec48ea97e635e991a470766b6a063746e97c20a9e.

## Cambios
- Ficha con portada, retrato, estrellas calculadas desde las reseñas recibidas y pestañas Trabajos, Reseñas y Acerca de; acciones fijas Comparar y Solicitar cotización.
- Rango orientativo opcional editable en un perfil profesional existente; sin cifras inventadas. Un perfil sin rango muestra A cotizar. El rango no sustituye el importe aceptado.
- Una solicitud privada para hasta tres expertos, envío atómico y reintentos con identificador estable para evitar duplicados. La tabla compara únicamente cotizaciones de ese mismo requerimiento.
- Al aceptar una cotización, el servidor serializa el grupo, comprueba versión, vigencia y agenda, conserva una copia de los datos aceptados y cierra las alternativas. No se cobra dentro de la app.
- Ver acuerdo: folio completo, partes, contacto, domicilio, alcance, materiales, costos, horario, versión y aceptación. Impresión/PDF nativa Android y compartir mediante el selector del sistema; HTML imprimible y Web Share en navegador.
- Cambio de caché PWA. Dependencia @capacitor/share fijada a 8.0.3.

## Validación realizada
TypeScript, build web, sincronización Capacitor Android, 18 pruebas de unidad y prueba de empaquetado web. Prueba transaccional en Supabase de envío atómico, reintento, rechazo de cambios en reintento, selección única, copia aceptada y privacidad; todos los datos de prueba se revirtieron.
Migración aditiva expert_profile_agreement_comparison aplicada en Supabase; las funciones anteriores siguen disponibles para 0.3.11.
Revisión de seguridad: tablas privadas con RLS y sin acceso directo, RPC pública invoker con validaciones privadas de identidad. Los avisos preexistentes del proyecto no se modificaron como parte de esta entrega.

## Pendientes reales
No se generó AAB en este entorno. Gradle no pudo descargar su distribución (Network is unreachable); además el ZIP excluye la clave de firma, google-services.json y el entorno local. La compilación y firma deben ejecutarse con la configuración existente del Mac. El código Java nuevo de impresión y el selector de compartir requieren compilación y prueba física. No se ha verificado visualmente esta entrega en teléfono ni publicado en Play o Vercel.
El permiso INSERT para los campos de precio fue rechazado por revisión automática. La migración entregada no incorpora ese permiso. El registro nuevo conserva el formulario previo, sin campos de precio; el rango aparece al editar un perfil existente, con permisos UPDATE ya aplicados. No se intentó ejecutar el permiso rechazado por otra vía.

## Instalar y compilar
1. Descomprimir la actualización y ejecutar `bash actualizar-y-compilar.command` desde esa carpeta.
2. El instalador comprueba que cada archivo cambiado coincide con el ZIP base o con esta actualización. Si encuentra cambios ajenos, se detiene sin sobrescribirlos. Respalda los archivos que reemplazará y conserva entorno, claves y configuración Firebase del Mac.
3. Instala dependencias, valida configuración local, sincroniza Android, compila y verifica la firma.
4. Resultado esperado: artifacts/YoResuelvo-0.3.12-codigo-14-interna.aab. El mismo artefacto puede usarse en prueba cerrada seleccionándolo desde la biblioteca de Play después de cargarlo; no se debe volver a cargar un archivo diferente con el mismo código.
5. Antes de cargarlo, confirmar que el código 14 no se haya utilizado en otro segmento o borrador. Solo se comprobó la prueba interna activa, código 13.

## Recorrido de revisión en teléfono
Cliente → Explorar → ficha: abrir las tres pestañas y revisar retrato/portada sin estirar. Comparar hasta tres expertos → completar un solo formulario → comprobar recepción desde Experto y Operaciones → cotizar → comparar costos/horarios → aceptar una propuesta → comprobar reserva y cierre de alternativas → Ver acuerdo → compartir e imprimir/guardar PDF. Reabrir y confirmar la persistencia. Revisar un experto sin fotos, sin reseñas y sin rango; validar cancelación, cotización vencida y horario ocupado. Para simulaciones administradas, seleccionar perfiles ilustrativos gestionados por Operaciones.
