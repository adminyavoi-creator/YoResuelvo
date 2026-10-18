import type { Category, Municipality, Provider } from './types';

export const demoCategories: Category[] = [
  { slug: 'electricidad', name: 'Electricidad', position: 1 },
  { slug: 'plomeria', name: 'Plomería', position: 2 },
  { slug: 'cerrajeria', name: 'Cerrajería', position: 3 },
  { slug: 'limpieza', name: 'Limpieza', position: 4 },
  { slug: 'mandados', name: 'Mandados', position: 5 }
];
export const demoMunicipalities: Municipality[] = [
  { slug: 'delicias', name: 'Delicias', position: 1 },
  { slug: 'meoqui', name: 'Meoqui', position: 2 },
  { slug: 'rosales', name: 'Rosales', position: 3 },
  { slug: 'saucillo', name: 'Saucillo', position: 4 }
];
export const demoProviders: Provider[] = [
  { id: 'demo-electricidad', display_name: 'Alex Ríos · Electricidad', bio: 'Instalaciones, cambio de contactos y diagnóstico residencial. Perfil ficticio para validar la vista del mapa.', municipality_slug: 'delicias', approval_status: 'approved', available: true, categories: ['electricidad'], years_experience: 8, specialties: ['Instalaciones', 'Iluminación', 'Diagnóstico'], demo_location: { latitude: 28.198, longitude: -105.485 } },
  { id: 'demo-plomeria', display_name: 'Marta Salas · Plomería', bio: 'Reparación de fugas, llaves y mantenimiento de tinacos. Perfil ficticio para pruebas.', municipality_slug: 'delicias', approval_status: 'approved', available: true, categories: ['plomeria'], years_experience: 6, specialties: ['Fugas', 'Grifería', 'Tinacos'], demo_location: { latitude: 28.204, longitude: -105.455 } },
  { id: 'demo-cerrajeria', display_name: 'Taller Llave Norte · Cerrajería', bio: 'Cambio y mantenimiento de cerraduras con autorización de la persona solicitante. Perfil de demostración.', municipality_slug: 'delicias', approval_status: 'approved', available: true, categories: ['cerrajeria'], years_experience: 11, specialties: ['Cerraduras', 'Duplicados', 'Mantenimiento'], demo_location: { latitude: 28.184, longitude: -105.451 } },
  { id: 'demo-limpieza', display_name: 'Casa Clara · Limpieza', bio: 'Limpieza programada para hogares y pequeños negocios. Datos ficticios para revisar filtros y marcadores.', municipality_slug: 'delicias', approval_status: 'approved', available: true, categories: ['limpieza'], years_experience: 5, specialties: ['Limpieza profunda', 'Oficinas', 'Mantenimiento'], demo_location: { latitude: 28.178, longitude: -105.482 } }
];

/** These clearly labeled fixture reviews exist only in the demo bundle, never in Supabase. */
export const demoReviews = demoProviders.map((provider, index) => ({
  provider_id: provider.id,
  rating: [5, 4, 5, 4][index],
  body: 'Calificación ficticia para probar la etiqueta de estrellas del mapa.',
  created_at: '2026-10-01T12:00:00.000Z'
}));
