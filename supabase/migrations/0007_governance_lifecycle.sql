create table if not exists reviewed_examples (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  scenario_id uuid references scenarios(id) on delete set null,
  evaluation_id uuid references evaluations(id) on delete set null,
  example_type text not null check (example_type in ('approved', 'rejected')),
  input_message text not null,
  response_text text not null,
  rationale text not null,
  reviewed_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists reviewed_examples_org_created_idx on reviewed_examples(organisation_id, created_at desc);

create table if not exists feedback_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  scenario_id uuid references scenarios(id) on delete set null,
  evaluation_id uuid references evaluations(id) on delete set null,
  outcome text not null check (outcome in ('accepted', 'edited', 'rejected', 'escalated')),
  rationale text not null,
  corrected_draft text,
  source text not null check (source in ('manual', 'import')),
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_records_org_created_idx on feedback_records(organisation_id, created_at desc);

alter table reviewed_examples enable row level security;
alter table feedback_records enable row level security;

create policy org_access_reviewed_examples on reviewed_examples for all using (organisation_id = current_user_org_id()) with check (organisation_id = current_user_org_id());
create policy org_access_feedback_records on feedback_records for all using (organisation_id = current_user_org_id()) with check (organisation_id = current_user_org_id());
