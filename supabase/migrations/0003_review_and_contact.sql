alter table if exists terminology_patterns
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

alter table if exists policies
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

alter table if exists conflicts
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz;

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  work_email text not null,
  company text not null,
  role text not null,
  company_size text not null,
  current_ai_tools jsonb not null default '[]'::jsonb,
  primary_use_case text not null,
  message text not null,
  source text not null default 'marketing_contact_page',
  created_at timestamptz not null default now()
);

create index if not exists contact_requests_created_idx
  on contact_requests(created_at desc);

alter table contact_requests enable row level security;
