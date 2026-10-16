-- Cover remaining foreign keys used by deletion checks and operational lookups.
create index review_actions_job_idx on private.review_actions(job_id);
create index review_actions_reviewer_idx on private.review_actions(reviewer_id);
create index job_events_actor_idx on public.job_events(actor_id);
create index reviews_client_idx on public.reviews(client_id);
create index service_reports_job_idx on public.service_reports(job_id);
create index service_reports_reporter_idx on public.service_reports(reporter_id);
