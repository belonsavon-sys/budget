-- Multi-tenant containers and membership
create extension if not exists "uuid-ossp";

create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text), 0, 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')) default 'editor',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- A trigger to insert the owner as the first member
create or replace function public.add_owner_as_member()
returns trigger as $$
begin
  insert into public.household_members (household_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger households_add_owner
after insert on public.households
for each row execute function public.add_owner_as_member();

-- updated_at autoupdater
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger households_touch
before update on public.households
for each row execute function public.touch_updated_at();
