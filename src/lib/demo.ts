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
  { id: 'demo-1', display_name: 'Electricidad del Centro', bio: 'Instalaciones y diagnóstico eléctrico residencial. Perfil de ejemplo.', municipality_slug: 'delicias', approval_status: 'approved', available: true, categories: ['electricidad'] },
  { id: 'demo-2', display_name: 'Soluciones Eléctricas Norte', bio: 'Mantenimiento de contactos e instalaciones. Perfil de ejemplo.', municipality_slug: 'delicias', approval_status: 'approved', available: true, categories: ['electricidad'] },
  { id: 'demo-3', display_name: 'Plomería Río San Pedro', bio: 'Fugas, llaves y mantenimiento hidráulico. Perfil de ejemplo.', municipality_slug: 'meoqui', approval_status: 'approved', available: true, categories: ['plomeria'] },
  { id: 'demo-4', display_name: 'Cerrajería Regional', bio: 'Cerraduras y duplicados con acceso autorizado. Perfil de ejemplo.', municipality_slug: 'delicias', approval_status: 'approved', available: true, categories: ['cerrajeria'] },
  { id: 'demo-5', display_name: 'Limpieza Casa Clara', bio: 'Limpieza programada para hogares y negocios. Perfil de ejemplo.', municipality_slug: 'rosales', approval_status: 'approved', available: true, categories: ['limpieza'] }
];
