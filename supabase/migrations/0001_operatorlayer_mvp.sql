create extension if not exists "pgcrypto";

create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  risk_tolerance text not null default 'medium',
  auto_send_allowed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  organisation_id uuid not null references organisations(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  title text not null,
  source_type text not null,
  authority_level text,
  file_url text,
  raw_text text,
  processing_status text not null default 'uploaded',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_status_check check (processing_status in ('uploaded', 'extracting', 'extracted', 'failed'))
);

create table if not exists source_chunks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  chunk_index int not null,
  chunk_text text not null,
  chunk_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists source_chunks_source_id_chunk_index_idx on source_chunks(source_id, chunk_index);

create table if not exists terminology_patterns (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  phrase text not null,
  normalised_phrase text,
  frequency int not null default 0,
  scenario_id uuid,
  status text not null default 'suggested',
  recommendation text,
  source_evidence jsonb not null default '[]'::jsonb,
  outcome_signal jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  rule_type text,
  description text,
  severity text,
  status text not null default 'suggested',
  structured_rule jsonb not null default '{}'::jsonb,
  source_evidence jsonb not null default '[]'::jsonb,
  confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  name text not null,
  category text,
  description text,
  risk_level text,
  trigger_phrases jsonb not null default '[]'::jsonb,
  approved_response_flow jsonb not null default '[]'::jsonb,
  forbidden_behaviours jsonb not null default '[]'::jsonb,
  evaluation_rubric jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists examples (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  scenario_id uuid references scenarios(id) on delete set null,
  example_type text not null,
  customer_message text,
  response_text text,
  why_good_or_bad jsonb not null default '{}'::jsonb,
  source_evidence jsonb not null default '[]'::jsonb,
  outcome text,
  created_at timestamptz not null default now()
);

create table if not exists conflicts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  conflict_type text,
  severity text,
  manual_rule text,
  historical_pattern text,
  recommended_resolution text,
  status text not null default 'needs_review',
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  scenario_id uuid references scenarios(id) on delete set null,
  input_message text,
  original_draft text,
  repaired_draft text,
  detected_phrases jsonb not null default '[]'::jsonb,
  missing_required_elements jsonb not null default '[]'::jsonb,
  policy_violations jsonb not null default '[]'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  approval_required boolean not null default false,
  repair_required boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists exports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  export_type text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table organisations enable row level security;
alter table users enable row level security;
alter table sources enable row level security;
alter table source_chunks enable row level security;
alter table terminology_patterns enable row level security;
alter table policies enable row level security;
alter table scenarios enable row level security;
alter table examples enable row level security;
alter table conflicts enable row level security;
alter table evaluations enable row level security;
alter table exports enable row level security;

create or replace function current_user_org_id()
returns uuid
language sql
stable
as $$
  select organisation_id from users where id = auth.uid() limit 1
$$;

create policy org_select_organisations on organisations
  for select using (id = current_user_org_id());
create policy org_update_organisations on organisations
  for update using (id = current_user_org_id());

create policy org_access_users on users
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_sources on sources
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_source_chunks on source_chunks
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_terminology_patterns on terminology_patterns
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_policies on policies
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_scenarios on scenarios
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_examples on examples
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_conflicts on conflicts
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_evaluations on evaluations
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_exports on exports
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());
