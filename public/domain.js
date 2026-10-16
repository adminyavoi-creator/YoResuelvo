export const providers=[
{id:'e1',name:'Electricidad del Centro',category:'Electricidad',city:'Delicias',rating:4.8,reviews:24,price:350,about:'Instalaciones, contactos y diagnóstico eléctrico.'},
{id:'e2',name:'Soluciones Eléctricas Norte',category:'Electricidad',city:'Delicias',rating:4.6,reviews:12,price:300,about:'Mantenimiento eléctrico residencial y comercial.'},
{id:'p1',name:'Plomería Río San Pedro',category:'Plomería',city:'Meoqui',rating:4.7,reviews:18,price:280,about:'Fugas, llaves y mantenimiento hidráulico.'},
{id:'c1',name:'Cerrajería Regional',category:'Cerrajería',city:'Delicias',rating:4.9,reviews:31,price:250,about:'Cerraduras y duplicados; acredita acceso al inmueble.'},
{id:'m1',name:'Mandados en tu Zona',category:'Mandados',city:'Saucillo',rating:4.5,reviews:9,price:80,about:'Recados y entregas locales con alcance acordado.'},
{id:'l1',name:'Limpieza Casa Clara',category:'Limpieza',city:'Rosales',rating:4.8,reviews:16,price:450,about:'Limpieza programada de hogares y oficinas.'}];
export function search(list,q,city,category){const term=q.trim().toLocaleLowerCase('es');return list.filter(p=>(!city||p.city===city)&&(!category||p.category===category)&&`${p.name} ${p.category} ${p.about}`.toLocaleLowerCase('es').includes(term));}
export function toggleCompare(ids,id){return ids.includes(id)?ids.filter(x=>x!==id):ids.length<3?[...ids,id]:ids;}
export function makeTicket(provider,description){if(!provider||description.trim().length<10)throw Error('Describe el servicio con al menos 10 caracteres.');return {id:'DEMO-'+crypto.randomUUID(),date:new Date().toISOString(),provider:provider.name,category:provider.category,city:provider.city,description:description.trim(),status:'Solicitud demo',notice:'No confirma contratación ni precio. No es factura ni comprobante de pago.'};}
