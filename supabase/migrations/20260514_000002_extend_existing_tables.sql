-- Application tables — all keyed by household_id with soft delete + timestamps.
-- Column shapes mirror the TS types in lib/types.ts.

create or replace function public.attach_touch_trigger(table_name text)
returns void as $$
begin
  execute format(
    'create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()',
    table_name, table_name
  );
end;
$$ language plpgsql;

create table public.accounts (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking','savings','credit','cash','investment')),
  starting_balance numeric not null default 0,
  currency text not null,
  color text not null default '#6366f1',
  icon text not null default 'Wallet',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('accounts');

create table public.categories (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  type text not null check (type in ('income','expense','both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('categories');

create table public.tags (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('tags');

create table public.transactions (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null check (type in ('income','expense','transfer')),
  amount numeric not null,
  currency text not null,
  description text not null,
  category_id text,
  account_id text not null,
  to_account_id text,
  tag_ids jsonb not null default '[]'::jsonb,
  date timestamptz not null,
  status text not null check (status in ('pending','paid','received','projected')),
  notes text,
  attachments jsonb,
  recurring_id text,
  splits jsonb,
  projected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('transactions');

create table public.recurring_rules (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense','transfer')),
  amount numeric not null,
  currency text not null,
  category_id text,
  account_id text not null,
  to_account_id text,
  tag_ids jsonb not null default '[]'::jsonb,
  notes text,
  frequency text not null check (frequency in ('daily','weekly','biweekly','monthly','yearly')),
  start_date timestamptz not null,
  end_date timestamptz,
  day_of_month int,
  autopay boolean not null default false,
  active boolean not null default true,
  last_generated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('recurring_rules');

create table public.savings_goals (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  target numeric not null,
  current numeric not null default 0,
  deadline timestamptz,
  color text not null,
  icon text not null,
  account_id text,
  contributions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('savings_goals');

create table public.budgets (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  category_id text not null,
  amount numeric not null,
  period text not null check (period in ('weekly','monthly','yearly')),
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('budgets');

create table public.notes (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  color text,
  tag_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('notes');

create table public.reminders (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  date timestamptz not null,
  recurring text check (recurring in ('daily','weekly','biweekly','monthly','yearly')),
  done boolean not null default false,
  linked_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
select public.attach_touch_trigger('reminders');
