begin;
select set_config('request.jwt.claim.sub',(select user_id::text from private.staff where role='admin' limit 1),true);
set local role authenticated;
do $$declare sid uuid:=gen_random_uuid(); ids jsonb; again jsonb; a uuid; b uuid; start_at timestamptz:=now()+interval '200 days'; before_count int;
begin
 ids:=public.create_service_comparison(sid,array['demo-refrigeracion','demo-mandados'],'Validación de servicio','Requerimiento privado para verificar propuestas y acuerdo.','Domicilio de validación 123','6391234567',start_at,'[]');
 again:=public.create_service_comparison(sid,array['demo-refrigeracion','demo-mandados'],'Validación de servicio','Requerimiento privado para verificar propuestas y acuerdo.','Domicilio de validación 123','6391234567',start_at,'[]');
 if jsonb_array_length(ids)<>2 or ids<>again then raise exception 'Replay is not idempotent';end if;
 begin
  perform public.create_service_comparison(sid,array['demo-refrigeracion'],'Cambiar solicitud','Requerimiento privado para verificar propuestas y acuerdo.','Domicilio de validación 123','6391234567',start_at,'[]');
  raise exception 'Changed replay accepted';
 exception when others then if sqlerrm='Changed replay accepted' then raise;end if;end;
 before_count:=jsonb_array_length(public.service_cases());
 begin
  perform public.create_service_comparison(gen_random_uuid(),array['demo-refrigeracion','demo-does-not-exist'],'Solicitud inválida','Requerimiento privado para verificar propuestas y acuerdo.','Domicilio de validación 123','6391234567',start_at,'[]');
  raise exception 'Partial request accepted';
 exception when others then if sqlerrm='Partial request accepted' then raise;end if;end;
 if jsonb_array_length(public.service_cases())<>before_count then raise exception 'Atomic request failed';end if;
 a:=(ids->>0)::uuid;b:=(ids->>1)::uuid;
 perform public.quote_service_case(a,'Trabajo completo para validar aceptación y total.','Incluye materiales y traslado.',1000,500,100,start_at,start_at+interval '1 hour');
 perform public.quote_service_case(b,'Trabajo alternativo para validar comparación y cierre.','Incluye materiales y traslado.',900,500,100,start_at,start_at+interval '1 hour');
 perform public.respond_service_case(a,'accept',1);
 if not exists(select 1 from jsonb_array_elements(public.service_cases()) c where c->>'id'=a::text and c->>'accepted_total'='1600.00' and c->'accepted_snapshot'->>'scope'='Trabajo completo para validar aceptación y total.' and c->'accepted_snapshot'->>'provider_name' is not null) then raise exception 'Agreement snapshot missing';end if;
 if not exists(select 1 from jsonb_array_elements(public.service_cases()) c where c->>'id'=b::text and c->>'status'='cancelled') then raise exception 'Alternative remains open';end if;
 begin perform public.respond_service_case(b,'accept',1);raise exception 'Second acceptance allowed';exception when others then if sqlerrm='Second acceptance allowed' then raise;end if;end;
 if has_function_privilege('anon','public.create_service_comparison(uuid,text[],text,text,text,text,timestamptz,jsonb)','execute') then raise exception 'Anonymous comparison allowed';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 if public.service_cases()<>'[]'::jsonb then raise exception 'Private agreements exposed';end if;
end$$;
reset role;
rollback;
select 'comparison, replay, atomicity, accepted snapshot, single agreement and privacy verified; all test data rolled back' as result;
