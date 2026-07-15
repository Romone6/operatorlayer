create table if not exists processing_jobs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  source_id uuid references sources(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  attempts int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint processing_jobs_status_check check (status in ('queued', 'running', 'succeeded', 'failed', 'dead_letter'))
);

create index if not exists processing_jobs_org_status_created_idx
  on processing_jobs(organisation_id, status, created_at);

create table if not exists ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  source_id uuid references sources(id) on delete cascade,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ingestion_logs_org_created_idx
  on ingestion_logs(organisation_id, created_at desc);

alter table processing_jobs enable row level security;
alter table ingestion_logs enable row level security;

create policy org_access_processing_jobs on processing_jobs
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_ingestion_logs on ingestion_logs
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());
