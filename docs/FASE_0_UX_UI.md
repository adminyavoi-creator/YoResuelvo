# Fase 0 en marcha — propuesta 3 «Acción»

## Decisión de producto

YoResuelvo! inicia en Delicias y la región con dos entradas: «Necesito resolver» y «Quiero ofrecer mis servicios». El MVP conecta clientes y prestadores de distintos oficios, permite buscar y comparar, solicitar y cotizar, aceptar un acuerdo, emitir un ticket y reseñar un trabajo completado. El pago se acuerda directamente entre las partes; la aplicación no procesa pagos ni mantiene saldo.

La dirección visual es la ruta 03 Acción: naranja `#F4772C`, terracota `#C55B2B`, tostado `#8C3D24`, coral `#FF9E66`, marfil `#FFF9F4` y tinta `#2D211D`. Fixora es referencia de energía cromática; el símbolo «Y» y la composición pertenecen a YoResuelvo!. Verde y amarillo no forman parte de la paleta.

La lámina de identidad naranja sirve como referencia para el logotipo, los pictogramas, la jerarquía y las superficies. Sus nombres, teléfonos, correo, ticket y perfiles son ejemplos visuales. Frases como «profesionales verificados», «agenda en minutos» o «trabajo de confianza» no se publicarán como funcionalidades o garantías hasta que existan procesos y datos que las respalden. El SVG actual es provisional; el símbolo final debe trazarse en vector y comprobarse a 16, 32 y 192 px.

## Entregables de esta fase

| Entregable | Estado | Evidencia / siguiente paso |
|---|---|---|
| Dirección de marca y pantalla principal | Prototipo local | `IDENTIDAD.md`, `public/`, `assets/identity/ui-ruta-03-accion.webp` |
| Dos recorridos explicados | Prototipo local | Búsqueda y comparación funcionales; sección «Tu trabajo, paso a paso» para prestadores |
| Componentes y reglas visuales | Especificados | Apartado siguiente; comprobar en móvil y con usuarios |
| Catálogo inicial por tareas y unidades | Por validar | Entrevistas a prestadores de Delicias; `RANGOS_Y_OPORTUNIDADES.md` |
| Flujos completos de solicitud y cotización | Por diseñar y probar | Wireframes de estados, errores y cambios de alcance |
| Prueba con clientes y prestadores | Pendiente | No se ha realizado investigación de campo |

## Sistema UX/UI para implementación

| Elemento | Regla de diseño | Estados requeridos |
|---|---|---|
| Botón principal | Naranja de acción `#B44816` con texto blanco, altura mínima 44 px; naranja vivo `#F4772C` como acento | Normal, hover, foco, deshabilitado, espera, error |
| Botón secundario | Blanco, borde cálido y texto tostado | Normal, hover, foco, deshabilitado |
| Tarjeta de prestador | Superficie blanca, radio 18 px, oficio, zona, experiencia, reseñas y acción | Cargando, nueva cuenta sin reseñas, disponible, pausado |
| Filtros | Búsqueda, municipio y categoría con etiqueta accesible | Vacío, aplicado, sin resultados, error |
| Comparación | Máximo tres prestadores y columnas equivalentes | Ninguno, uno, dos, tres; diferencias de alcance explícitas |
| Cotización | Alcance, materiales, exclusiones, traslado, vigencia, total MXN | Borrador, enviada, sustituida, aceptada, vencida |
| Ticket | Folio, partes, versión aceptada, fecha y estados | Confirmado, en curso, terminación reportada, completado, disputa |

Texto normal y fondos deben alcanzar WCAG 2.2 AA antes del piloto. El naranja vivo con blanco solo ofrece una relación aproximada de 2.79:1, por lo que se reserva para acentos; el naranja de acción con blanco ofrece aproximadamente 5.41:1. El color jamás será la única señal de estado. Usar iconos de trazo uniforme, tamaño táctil mínimo de 44 px, foco visible y etiquetas persistentes en formularios. Evitar distintivos «verificado» sin un proceso definido y evidencia real. En datos de ejemplo, mostrar «demo» junto a puntuaciones e importes.

## Flujos para prototipar y validar

1. **Cliente:** buscar tarea y municipio → revisar perfil → comparar hasta tres → describir trabajo → enviar solicitud → comparar cotizaciones con el mismo alcance → aceptar versión → consultar ticket → confirmar terminación → reseñar.
2. **Prestador:** definir oficios, tareas, cobertura y disponibilidad → enviar perfil a revisión → recibir solicitud pertinente → cotizar alcance y total → actualizar mediante nueva versión → realizar trabajo → reportar terminación.
3. **Excepciones:** cero resultados, prestador sin reseñas, solicitud sin respuesta, cotización vencida, doble aceptación, cambios de alcance, cancelación, disputa y pérdida de conexión.

La demo actual solo ejecuta búsqueda, comparación y tickets locales de ejemplo. La ruta de prestador explica la experiencia planeada; aún no da de alta perfiles ni envía solicitudes.

## Validación de la primera semana

Probar los dos recorridos con al menos cinco clientes potenciales y cinco prestadores de oficios distintos en Delicias. Es una meta de investigación, no una entrevista ya realizada. Pedir que completen tareas sin explicar la interfaz y registrar éxito, dudas, tiempo y errores. Preguntar por alcance, materiales, traslado, cancelaciones, confianza y forma de pactar un servicio. Nunca presentar rangos ficticios como precios locales.

**Criterio de salida:** nombres y acciones comprensibles para ambos perfiles; categorías iniciales acordadas; tareas/unidades priorizadas; prototipo móvil revisado; estados y políticas de cancelación definidos; problemas de comprensión registrados y corregidos. La fase 1 puede preparar código y entornos locales mientras se recaba esta validación, pero publicar datos o habilitar contrataciones reales depende de ella.

## Primer bloque de construcción

1. Convertir el prototipo aprobado en React + TypeScript + Vite con componentes y tokens, manteniendo los dos recorridos y los estados vacíos.
2. Definir el esquema, permisos y pruebas de aislamiento de cuentas para el nuevo proyecto de YoResuelvo!, independiente de otras aplicaciones.
3. Implementar primero catálogo y perfiles; después solicitudes, cotizaciones versionadas, aceptación transaccional y tickets.
4. Probar el flujo integral, accesibilidad, privacidad, restauración y operación antes del piloto.

No hay fecha contractual ni presupuesto asignados. Las semanas del `PLAN_DESARROLLO.md` son estimaciones desde el inicio efectivo del trabajo con equipo y decisiones operativas disponibles.
