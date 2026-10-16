-- Prueba transaccional: todos los datos ficticios se eliminan con ROLLBACK.
begin;
create temporary table test_results(metric text, observed text);
grant insert,select on test_results to authenticated;
insert into auth.users(id,aud,role,email,created_at,updated_at) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated','yr-test-client-a@example.invalid',now(),now()),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated','yr-test-client-b@example.invalid',now(),now()),
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated','yr-test-provider-a@example.invalid',now(),now());
insert into public.provider_profiles(id,display_name,bio,municipality_slug,approval_status) values
 ('33333333-3333-4333-8333-333333333333','Técnico de prueba',
  'Experiencia ficticia de prueba en instalaciones eléctricas.','delicias','approved');
insert into public.provider_categories(provider_id,category_slug)
 values('33333333-3333-4333-8333-333333333333','electricidad');

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.create_request('electricidad','delicias',
  'Revisar tres contactos de prueba','Hay tres contactos sin energía en una casa ficticia.',
  array['33333333-3333-4333-8333-333333333333']::uuid[],now()+interval '3 days');
insert into test_results select 'cliente_ve_solicitud',count(*)::text from public.service_requests;

select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
insert into test_results select 'prestador_ve_invitacion',count(*)::text from public.service_requests;
select public.submit_quote(
  (select id from public.service_requests where title='Revisar tres contactos de prueba'),
  'Diagnóstico y revisión de tres contactos eléctricos en la vivienda ficticia.',
  'Sin materiales incluidos','No incluye reparación de cableado oculto',
  450,0,50,now()+interval '7 days',now()+interval '3 days');

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
insert into test_results select 'ajeno_ve_solicitud',count(*)::text from public.service_requests;
insert into test_results select 'ajeno_ve_cotizacion',count(*)::text from public.quote_versions;
insert into test_results select 'ajeno_ve_ticket',count(*)::text from public.tickets;
do $$ begin
  begin
    perform public.accept_quote((select id from public.quote_versions limit 1));
    insert into test_results values('ajeno_puede_aceptar','sí');
  exception when others then
    insert into test_results values('ajeno_puede_aceptar','no');
  end;
end $$;

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select * from public.accept_quote((select id from public.quote_versions limit 1));
insert into test_results select 'jobs_por_solicitud',count(*)::text from public.jobs;
insert into test_results select 'ticket_emitido',count(*)::text from public.tickets;
do $$ begin
  begin
    perform public.accept_quote((select id from public.quote_versions limit 1));
    insert into test_results values('doble_aceptacion','sí');
  exception when others then
    insert into test_results values('doble_aceptacion','no');
  end;
end $$;
insert into public.request_addresses(request_id,client_id,address)
 select id,'11111111-1111-4111-8111-111111111111',
   'Calle de ejemplo 123, Delicias, Chihuahua' from public.service_requests;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
insert into test_results select 'ajeno_ve_direccion',count(*)::text from public.request_addresses;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
insert into test_results select 'contratado_ve_direccion',count(*)::text from public.request_addresses;
select public.set_job_status((select id from public.jobs),'in_progress',null);
select public.set_job_status((select id from public.jobs),'completion_reported',null);
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select public.set_job_status((select id from public.jobs),'completed',null);
select public.create_review((select id from public.jobs),5::smallint,
  'Trabajo de prueba completado con el alcance y el importe acordados.');
insert into test_results select 'resenas_por_trabajo',count(*)::text from public.reviews;
insert into test_results select 'eventos_de_estado',count(*)::text from public.job_events;
reset role;
select * from test_results order by metric;
rollback;
