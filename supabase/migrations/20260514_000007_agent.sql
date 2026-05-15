create table public.agent_actions (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  ts timestamptz not null default now(),
  actor text not null check (actor in ('user','agent')),
  tier text not null check (tier in ('auto','confirm','explicit')),
  tool text not null,
  args jsonb not null,
  result jsonb,
  inverse jsonb,
  undone_at timestamptz,
  parent_action_id text,
  rationale text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('agent_actions');

create index agent_actions_household_ts_idx on public.agent_actions (household_id, ts desc);
create index agent_actions_undone_idx on public.agent_actions (household_id, undone_at) where undone_at is null;

create table public.agent_memory (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null check (kind in ('preference','fact','rule')),
  text text not null,
  source text not null check (source in ('user-taught','agent-inferred')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('agent_memory');

create index agent_memory_household_idx on public.agent_memory (household_id) where deleted_at is null;

alter table public.agent_actions enable row level security;
alter table public.agent_memory enable row level security;

create policy "members read agent_actions"
  on public.agent_actions for select
  using (household_id in (select public.user_household_ids()));
create policy "members write agent_actions"
  on public.agent_actions for insert
  with check (household_id in (select public.user_household_ids()));
create policy "members update agent_actions"
  on public.agent_actions for update
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));
create policy "members delete agent_actions"
  on public.agent_actions for delete
  using (household_id in (select public.user_household_ids()));

create policy "members read agent_memory"
  on public.agent_memory for select
  using (household_id in (select public.user_household_ids()));
create policy "members write agent_memory"
  on public.agent_memory for insert
  with check (household_id in (select public.user_household_ids()));
create policy "members update agent_memory"
  on public.agent_memory for update
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));
create policy "members delete agent_memory"
  on public.agent_memory for delete
  using (household_id in (select public.user_household_ids()));
