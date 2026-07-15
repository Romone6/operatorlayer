alter table if exists users
  drop constraint if exists users_role_check;

alter table if exists users
  add constraint users_role_check
  check (role in ('owner', 'admin', 'reviewer', 'analyst', 'member'));

alter table if exists users
  alter column role set default 'member';

create table if not exists member_invites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  email text not null,
  role text not null,
  invite_token text not null unique,
  status text not null default 'pending',
  invited_by uuid references users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_by uuid references users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint member_invites_role_check check (role in ('owner', 'admin', 'reviewer', 'analyst', 'member')),
  constraint member_invites_status_check check (status in ('pending', 'accepted', 'revoked', 'expired'))
);

create index if not exists member_invites_org_created_idx
  on member_invites(organisation_id, created_at desc);

create unique index if not exists member_invites_org_email_pending_idx
  on member_invites(organisation_id, email)
  where status = 'pending';

alter table member_invites enable row level security;

create policy org_access_member_invites on member_invites
  for all using (organisation_id = current_user_org_id())
  with check (organisation_id = current_user_org_id());
