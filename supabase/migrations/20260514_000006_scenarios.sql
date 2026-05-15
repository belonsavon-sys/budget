create table public.what_if_scenarios (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  start_date timestamptz not null,
  end_date timestamptz,
  pinned boolean not null default false,
  color text not null default '#c2410c',
  icon text not null default 'Sparkles',
  deltas jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('what_if_scenarios');

alter table public.what_if_scenarios enable row level security;

create policy "members can read scenarios"
  on public.what_if_scenarios for select
  using (household_id in (select public.user_household_ids()));
create policy "members can insert scenarios"
  on public.what_if_scenarios for insert
  with check (household_id in (select public.user_household_ids()));
create policy "members can update scenarios"
  on public.what_if_scenarios for update
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));
create policy "members can delete scenarios"
  on public.what_if_scenarios for delete
  using (household_id in (select public.user_household_ids()));

create index scenarios_household_pinned_idx on public.what_if_scenarios (household_id, pinned, updated_at desc);
