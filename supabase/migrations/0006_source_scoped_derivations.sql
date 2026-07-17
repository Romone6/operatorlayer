alter table scenarios
  add column if not exists source_id uuid references sources(id) on delete cascade;

alter table conflicts
  add column if not exists source_id uuid references sources(id) on delete cascade;

create index if not exists scenarios_source_id_idx on scenarios(source_id);
create index if not exists conflicts_source_id_idx on conflicts(source_id);
