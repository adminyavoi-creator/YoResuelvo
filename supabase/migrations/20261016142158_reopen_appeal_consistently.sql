-- Al aceptar una apelación, conserva coherencia de solicitud y cierra duplicados del mismo servicio.
create or replace function private.review_report_appeal_impl(p_appeal_id uuid,p_status text,p_response text)
returns void language plpgsql security definer set search_path='' as $$
declare v_appeal public.report_appeals%rowtype; v_report public.service_reports%rowtype; v_job public.jobs%rowtype;
begin
  if not exists (select 1 from private.staff s where s.user_id=auth.uid() and s.role in ('moderator','admin')) then
    raise exception 'Acceso denegado.';
  end if;
  if p_status not in ('accepted','rejected') or char_length(trim(coalesce(p_response,''))) not between 10 and 1000 then
    raise exception 'Selecciona una decisión y registra una respuesta de entre 10 y 1000 caracteres.';
  end if;
  select * into v_appeal from public.report_appeals where id=p_appeal_id for update;
  if not found or v_appeal.status<>'pending' then raise exception 'La apelación ya fue revisada o no existe.'; end if;
  select * into v_report from public.service_reports where id=v_appeal.report_id for update;
  select * into v_job from public.jobs where id=v_report.job_id for update;
  if p_status='accepted' then
    if v_job.status not in ('completed','cancelled') then raise exception 'El servicio ya no está en un estado apelable.'; end if;
    perform set_config('app.job_reason','Apelación aceptada: '||left(trim(p_response),900),true);
    update public.jobs set status='disputed' where id=v_job.id;
    update public.service_requests set status='contracted' where id=v_job.request_id;
    insert into public.service_reports(job_id,reporter_id,reason)
      values(v_job.id,v_appeal.appellant_id,left('Reapertura por apelación aceptada: '||trim(p_response),1000));
    with closed as (
      update public.report_appeals a set status='rejected',
        response='Se cerró esta apelación porque otra revisión del mismo servicio fue aceptada y el caso se reabrió.',
        reviewer_id=auth.uid(),reviewed_at=now()
      from public.service_reports r
      where r.id=a.report_id and r.job_id=v_job.id and a.id<>v_appeal.id and a.status='pending'
      returning a.appellant_id
    )
    insert into public.notifications(recipient_id,title,body)
      select c.appellant_id,'Apelación cerrada','Otra apelación reabrió este servicio; revisa la respuesta en tu ticket.' from closed c;
  end if;
  update public.report_appeals set status=p_status,response=trim(p_response),reviewer_id=auth.uid(),reviewed_at=now()
    where id=p_appeal_id;
  if p_status='rejected' then
    insert into public.notifications(recipient_id,title,body)
      values(v_appeal.appellant_id,'Apelación revisada','La apelación fue revisada. Consulta la respuesta en tu ticket.');
  else
    insert into public.notifications(recipient_id,title,body)
      values(v_job.provider_id,'Revisión reabierta','La apelación se aceptó y el servicio volvió a revisión.');
  end if;
end $$;
