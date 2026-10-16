# YoResuelvo!

Plataforma regional de servicios para Delicias y municipios cercanos. La dirección visual «Acción» emplea naranja, terracota, coral, marfil y tinta.

## Estado

Implementación de piloto web sobre React, TypeScript, Vite y un proyecto Supabase independiente. El catálogo público inicia sin prestadores reales; el alta requiere revisión humana. No se procesan pagos. La demo visual previa permanece en `/demo/` con perfiles ficticios.

Las fases 1–4 tienen los flujos técnicos principales: Auth por correo, catálogo, alta y aprobación de prestadores, solicitudes, cotizaciones versionadas, aceptación atómica, ticket imprimible, dirección privada, estados de servicio, reseñas de trabajos completados, avisos e incidencias. La fase 5 requiere validación con personas y dispositivos reales antes de lanzar públicamente. Véase [estado y criterios](docs/ESTADO_FASES.md).

## Desarrollo

Node.js 20.19+ o 22.12+.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configurar en `.env.local` la URL y la clave **publicable** del proyecto Supabase de YoResuelvo!; nunca usar `service_role` en el cliente. Sin variables, se muestra la vista visual ficticia. Ejecutar `npm run build` y `npm test`. Las migraciones versionadas están en `supabase/migrations/`; la prueba transaccional con identidades simuladas está en `tests/flow.integration.sql` y revierte sus datos.

## Despliegue

Vercel: framework Vite, comando `npm run build`, directorio `dist`. Definir `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` para el entorno de preview. Configurar URL de sitio y redirecciones de correo de Supabase para el dominio concreto antes de probar recuperación y confirmación. Revisar [operación del piloto](docs/PILOTO_OPERACION.md) antes de habilitar usuarios externos.

Repositorio: [adminyavoi-creator/YoResuelvo](https://github.com/adminyavoi-creator/YoResuelvo).

Un ticket registra el acuerdo de servicio; no es factura ni comprobante de pago.
