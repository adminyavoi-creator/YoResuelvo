-- Cubre la clave foránea del revisor en el registro de apelaciones.
create index report_appeals_reviewer_idx on public.report_appeals(reviewer_id);
