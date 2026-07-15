create table if not exists organisation_settings (
  organisation_id uuid primary key references organisations(id) on delete cascade,
  default_tone text not null default 'consultative',
  pricing_approval_threshold numeric not null default 10,
  refund_approval_threshold numeric not null default 500,
  data_retention_days int not null default 365,
  model_provider text not null default 'openai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organisation_settings_model_provider_idx
  on organisation_settings(model_provider);

create table if not exists review_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  action text not null,
  actor_id text not null,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint review_events_item_type_check check (item_type in ('policy', 'terminology', 'conflict')),
  constraint review_events_action_check check (action in ('approve', 'edit', 'reject', 'mark_outdated', 'request_reprocessing'))
);

create index if not exists review_events_org_created_idx
  on review_events(organisation_id, created_at desc);

alter table organisation_settings enable row level security;
alter table review_events enable row level security;

create policy org_access_organisation_settings on organisation_settings
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

create policy org_access_review_events on review_events
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());

