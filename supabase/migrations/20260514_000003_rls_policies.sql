-- Enable RLS and add household-membership policies on every app table.

create or replace function public.user_household_ids()
returns setof uuid
language sql stable
security definer
as $$
  select household_id from public.household_members where user_id = auth.uid();
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "members can read their households"
  on public.households for select
  using (id in (select public.user_household_ids()));

create policy "owner can update their households"
  on public.households for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "any auth user can create a household"
  on public.households for insert
  with check (owner_id = auth.uid());

create policy "owner can delete their households"
  on public.households for delete
  using (owner_id = auth.uid());

create policy "members can read their memberships"
  on public.household_members for select
  using (user_id = auth.uid() or household_id in (select public.user_household_ids()));

create policy "owners can manage memberships"
  on public.household_members for all
  using (
    household_id in (
      select id from public.households where owner_id = auth.uid()
    )
  )
  with check (
    household_id in (
      select id from public.households where owner_id = auth.uid()
    )
  );

do $$
declare
  t text;
  app_tables text[] := array[
    'accounts','categories','tags','transactions','recurring_rules',
    'savings_goals','budgets','notes','reminders'
  ];
begin
  foreach t in array app_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "members can read in their households" on public.%I
         for select using (household_id in (select public.user_household_ids()))',
      t
    );
    execute format(
      'create policy "members can write in their households" on public.%I
         for insert with check (household_id in (select public.user_household_ids()))',
      t
    );
    execute format(
      'create policy "members can update in their households" on public.%I
         for update using (household_id in (select public.user_household_ids()))
         with check (household_id in (select public.user_household_ids()))',
      t
    );
    execute format(
      'create policy "members can delete in their households" on public.%I
         for delete using (household_id in (select public.user_household_ids()))',
      t
    );
  end loop;
end $$;
