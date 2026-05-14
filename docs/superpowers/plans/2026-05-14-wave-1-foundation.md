# Wave 1 · Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the budget PWA from a single-device localStorage app to a multi-device, auth-gated, Supabase-backed app — while keeping every existing page functioning.

**Architecture:** Add Supabase Postgres as source-of-truth (RLS by `household_id`), Supabase Auth for sign-in (magic link only for v1), a Zustand⇄Supabase sync engine with offline queue, and a migration shim that imports existing localStorage data on first sign-in. Auth is **optional** at runtime — unsigned users keep using localStorage like today; signed-in users get cloud sync.

**Tech Stack:**
- Next.js 16.2.6 App Router · React 19.2 · Turbopack (in place)
- `@supabase/supabase-js` + `@supabase/ssr` (new)
- Zustand 5 (in place) — augmented with sync middleware
- Vitest + @testing-library/react (new — for unit tests on pure logic)
- Service Worker (vanilla, registered via `next/script` from the root layout) for offline write replay
- Supabase MCP tools available (`mcp__claude_ai_Supabase__*`) for provisioning — manual fallback documented

**Spec reference:** `docs/superpowers/specs/2026-05-14-agentic-budget-platform-design.md` §10 Wave 1.

**Exit criteria:** App still functions for non-signed-in users; signed-in user can (a) see the migration prompt, (b) import their localStorage data, (c) open the app on a second browser, sign in, and see the same data within 2 seconds of edits on the first.

---

## File Structure

### New files
- `.env.local.example` — env var template
- `supabase/migrations/20260514_000001_households.sql`
- `supabase/migrations/20260514_000002_extend_existing_tables.sql`
- `supabase/migrations/20260514_000003_rls_policies.sql`
- `supabase/migrations/20260514_000004_indexes.sql`
- `lib/db.ts` — Supabase browser/server client factories
- `lib/db.types.ts` — generated Postgres types (overwritten on regen)
- `lib/auth/client.ts` — sign-in/sign-out helpers
- `lib/auth/context.tsx` — `AuthProvider` + `useAuth()`
- `lib/household/context.tsx` — `HouseholdProvider` + `useHousehold()`
- `lib/household/bootstrap.ts` — ensure-default-household on first sign-in
- `lib/migration/detect.ts` — does localStorage have legacy data?
- `lib/migration/import.ts` — port localStorage payload into Supabase
- `lib/migration/types.ts` — `LegacyPayload` shape
- `lib/sync/sync-engine.ts` — Zustand⇄Supabase bidirectional sync
- `lib/sync/offline-queue.ts` — IndexedDB queue + replay
- `lib/sync/sync-bindings.ts` — table↔store-slice map + `rowToApp` / `appToRow`
- `lib/realtime.ts` — `useRealtime<T>(table)` hook
- `app/(auth)/sign-in/page.tsx` — magic-link form
- `app/auth/callback/route.ts` — auth code exchange
- `components/Auth/SignInForm.tsx`
- `components/Migration/MigrationPrompt.tsx`
- `components/Sw/SwRegister.tsx` — client component that registers the SW
- `public/sw-sync.js` — service worker
- `vitest.config.ts`
- `tests/setup.ts`
- `tests/unit/migration/detect.test.ts`
- `tests/unit/migration/import.test.ts`
- `tests/unit/sync/offline-queue.test.ts`

### Modified files
- `package.json` — new deps + scripts
- `app/layout.tsx` — wrap in AuthProvider + HouseholdProvider, mount SwRegister + MigrationPrompt
- `lib/store.ts` — wire sync engine when authenticated
- `lib/types.ts` — add `currentHouseholdId` to `AppState`
- `components/PinGate.tsx` — coexist with auth (PIN is local lock; auth is identity)
- `.gitignore` — add `.env.local`, `supabase/.temp/`

---

## Prerequisites (run once before Task 1)

- [ ] **P1.** Verify dev server is reachable.

```bash
cd /Users/pierrebelonsavon/Documents/budget
npm run dev -- -p 3001
```

Open `http://localhost:3001` — should load the existing app. Kill the server (Ctrl-C) when satisfied; tasks below restart it as needed.

- [ ] **P2.** Confirm Supabase MCP access works.

The assistant will run `mcp__claude_ai_Supabase__list_organizations` to list Pierre's orgs. If MCP fails, switch to manual fallback documented in Task 2.

---

## Task 1: Add dependencies and dev tooling

**Files:**
- Modify: `package.json`
- Create: `.env.local.example`
- Modify: `.gitignore`

- [ ] **Step 1: Install Supabase + test deps**

```bash
cd /Users/pierrebelonsavon/Documents/budget
npm install @supabase/supabase-js@^2.45.0 @supabase/ssr@^0.5.0
npm install -D vitest@^2.0.0 @testing-library/react@^16.0.0 @testing-library/jest-dom@^6.5.0 jsdom@^25.0.0 happy-dom@^15.0.0
```

Expected: clean install, no peer-dep warnings about React 19. If you see a React 19 warning from `@testing-library/react`, that's expected — its peer range supports React 19.

- [ ] **Step 2: Add npm scripts**

Edit `package.json`. Replace the `scripts` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui",
  "types:gen": "echo 'Run via Supabase MCP or: npx supabase gen types typescript --project-id <id> > lib/db.types.ts'"
},
```

- [ ] **Step 3: Create `.env.local.example`**

Content:

```
# Public — safe to expose to the browser
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY

# Server-only (used in Route Handlers / Server Actions)
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
```

Write the file at `/Users/pierrebelonsavon/Documents/budget/.env.local.example` with the content above.

- [ ] **Step 4: Update `.gitignore`**

Append these lines to `/Users/pierrebelonsavon/Documents/budget/.gitignore`:

```
.env.local
.env*.local
supabase/.temp/
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.local.example .gitignore
git commit -m "chore: add Supabase + Vitest dependencies and env scaffolding"
```

---

## Task 2: Provision Supabase project

**Files:**
- Create: `.env.local` (locally only — not committed)
- Create: `supabase/.gitkeep`

This task uses MCP tools when possible, with manual fallback steps for Pierre.

- [ ] **Step 1: List existing Supabase orgs (MCP)**

The assistant runs `mcp__claude_ai_Supabase__list_organizations`. Pierre should see his orgs in the response. If MCP returns an error (not authorized / token missing), skip to Step 2b.

- [ ] **Step 2a: List existing projects (MCP)**

Run `mcp__claude_ai_Supabase__list_projects`. If Pierre already has a project named "budget" or similar, use it. Otherwise continue to Step 3.

- [ ] **Step 2b: Manual fallback — provision via web console**

If MCP is unavailable:
1. Open https://supabase.com/dashboard in a browser.
2. Click "New project". Org: any. Name: `budget`. Region: closest to Pierre. Database password: generate and store in a password manager.
3. Wait for provisioning (~90 seconds).
4. From Project Settings → API, copy `Project URL` and `anon public key` and `service_role secret key`.
5. Skip to Step 4.

- [ ] **Step 3: Create new project via MCP**

Run `mcp__claude_ai_Supabase__get_cost` with `type=project` and the org id to see the cost (free tier should be $0). Then `mcp__claude_ai_Supabase__confirm_cost` with the returned id. Then `mcp__claude_ai_Supabase__create_project` with name `budget`, the org id, the confirmed cost id, and a region close to Pierre (e.g. `us-east-1` or `eu-west-1`).

Wait ~90 seconds. Then `mcp__claude_ai_Supabase__get_project` to confirm `status = "ACTIVE_HEALTHY"`.

- [ ] **Step 4: Capture project URL and keys**

Run `mcp__claude_ai_Supabase__get_project_url` and `mcp__claude_ai_Supabase__get_publishable_keys` to get the URL and anon key.

For the service-role key (needed server-side), Pierre must copy it manually from Project Settings → API in the web console (MCP intentionally does not expose it).

- [ ] **Step 5: Write `.env.local`**

Create `/Users/pierrebelonsavon/Documents/budget/.env.local` with the real values:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

- [ ] **Step 6: Commit the placeholder folder**

```bash
mkdir -p /Users/pierrebelonsavon/Documents/budget/supabase/migrations
touch /Users/pierrebelonsavon/Documents/budget/supabase/.gitkeep
git add supabase/.gitkeep
git commit -m "chore: scaffold supabase/ directory"
```

---

## Task 3: Schema migrations — households + members

**Files:**
- Create: `supabase/migrations/20260514_000001_households.sql`

- [ ] **Step 1: Write the SQL migration**

Write `/Users/pierrebelonsavon/Documents/budget/supabase/migrations/20260514_000001_households.sql` with:

```sql
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
```

- [ ] **Step 2: Apply the migration via MCP**

Run `mcp__claude_ai_Supabase__apply_migration` with `project_id=<budget>`, `name=20260514_000001_households`, and `query=<contents of the SQL file above>`.

Expected: success response. If error mentions "extension already exists", that's fine.

- [ ] **Step 3: Verify schema**

Run `mcp__claude_ai_Supabase__list_tables` with `schemas=['public']`. Expected to see `households` and `household_members` in the response.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260514_000001_households.sql
git commit -m "feat(db): add households + household_members schema with trigger"
```

---

## Task 4: Schema migrations — extend existing tables

**Files:**
- Create: `supabase/migrations/20260514_000002_extend_existing_tables.sql`

This creates the 9 application tables (accounts, categories, tags, transactions, recurring_rules, savings_goals, budgets, notes, reminders) — they live in Supabase, not localStorage, going forward. Every table carries `household_id`, `created_at`, `updated_at`, `deleted_at`.

- [ ] **Step 1: Write the SQL migration**

Write `/Users/pierrebelonsavon/Documents/budget/supabase/migrations/20260514_000002_extend_existing_tables.sql` with:

```sql
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
```

- [ ] **Step 2: Apply via MCP**

Run `mcp__claude_ai_Supabase__apply_migration` with `name=20260514_000002_extend_existing_tables` and the SQL contents as the query.

Expected: success. If error mentions a check constraint clash, double-check the enum values match the TS types.

- [ ] **Step 3: Verify**

Run `mcp__claude_ai_Supabase__list_tables` with `schemas=['public']`. Expect 11 tables total (`households`, `household_members`, plus the 9 above).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260514_000002_extend_existing_tables.sql
git commit -m "feat(db): create all application tables with household_id and soft delete"
```

---

## Task 5: Schema migrations — Row Level Security policies

**Files:**
- Create: `supabase/migrations/20260514_000003_rls_policies.sql`

- [ ] **Step 1: Write the SQL migration**

Write `/Users/pierrebelonsavon/Documents/budget/supabase/migrations/20260514_000003_rls_policies.sql` with:

```sql
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
```

- [ ] **Step 2: Apply via MCP**

Run `mcp__claude_ai_Supabase__apply_migration` with `name=20260514_000003_rls_policies` and the SQL above.

- [ ] **Step 3: Confirm RLS is on**

Run `mcp__claude_ai_Supabase__get_advisors` with `type=security`. The "RLS disabled" advisory should NOT mention any of our application tables. (Other tables — Supabase internals — may have notices, ignore those.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260514_000003_rls_policies.sql
git commit -m "feat(db): enable RLS and household-membership policies on all tables"
```

---

## Task 6: Schema migrations — indexes

**Files:**
- Create: `supabase/migrations/20260514_000004_indexes.sql`

- [ ] **Step 1: Write the SQL migration**

Write `/Users/pierrebelonsavon/Documents/budget/supabase/migrations/20260514_000004_indexes.sql` with:

```sql
create index transactions_household_date_idx on public.transactions (household_id, date desc);
create index transactions_account_idx on public.transactions (household_id, account_id);
create index transactions_category_idx on public.transactions (household_id, category_id);
create index transactions_recurring_idx on public.transactions (household_id, recurring_id);
create index recurring_household_idx on public.recurring_rules (household_id, active) where deleted_at is null;
create index budgets_household_category_idx on public.budgets (household_id, category_id);
create index goals_household_idx on public.savings_goals (household_id) where deleted_at is null;
create index notes_household_pinned_idx on public.notes (household_id, pinned, updated_at desc);
create index reminders_household_date_idx on public.reminders (household_id, date) where done = false;
create index household_members_user_idx on public.household_members (user_id);
```

- [ ] **Step 2: Apply via MCP**

Run `mcp__claude_ai_Supabase__apply_migration` with `name=20260514_000004_indexes` and the SQL above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260514_000004_indexes.sql
git commit -m "feat(db): add hot-path indexes on household_id + access patterns"
```

---

## Task 7: Generate TypeScript types from Supabase

**Files:**
- Create: `lib/db.types.ts`

- [ ] **Step 1: Generate via MCP**

Run `mcp__claude_ai_Supabase__generate_typescript_types` for the budget project. The response will be a TypeScript file's contents.

- [ ] **Step 2: Save to `lib/db.types.ts`**

Write the generated content verbatim to `/Users/pierrebelonsavon/Documents/budget/lib/db.types.ts`. Top of the file should start with:

```ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      // ...generated...
```

- [ ] **Step 3: Sanity-check the types**

Open `lib/db.types.ts` and confirm:
- `Database['public']['Tables']` contains entries for `accounts`, `transactions`, `households`, `household_members`, and the other 8 tables.
- Each table has `Row`, `Insert`, `Update` sub-types.

If a table is missing, re-run Step 1.

- [ ] **Step 4: Commit**

```bash
git add lib/db.types.ts
git commit -m "feat(db): generate TypeScript types from Supabase schema"
```

---

## Task 8: Create Supabase client (lib/db.ts)

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: Write the browser + server client factories**

Write `/Users/pierrebelonsavon/Documents/budget/lib/db.ts`:

```ts
import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./db.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill it in."
  );
}

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserSupabase() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase() called on the server. Use getServerSupabase().");
  }
  if (!browserClient) browserClient = createBrowserClient<Database>(url, anon);
  return browserClient;
}

export function getServerSupabase(cookieStore: {
  get: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options?: CookieOptions) => void;
}) {
  return createServerClient<Database>(url, anon, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => cookieStore.set?.(name, value, options),
      remove: (name, options) => cookieStore.set?.(name, "", { ...options, maxAge: 0 }),
    },
  });
}

export type AppDB = Database["public"]["Tables"];
```

- [ ] **Step 2: Smoke-test from the browser**

Start the dev server:

```bash
npm run dev -- -p 3001
```

In a browser DevTools console at `http://localhost:3001`, run:

```js
const { getBrowserSupabase } = await import("/lib/db.ts");
const sb = getBrowserSupabase();
const { data, error } = await sb.from("households").select("*");
console.log({ data, error });
```

Expected: `data: [], error: null` (you're not signed in yet, RLS returns empty list — no error).

If error mentions "Missing NEXT_PUBLIC_SUPABASE_URL", check `.env.local`.

Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts
git commit -m "feat(db): add typed Supabase browser + server client factories"
```

---

## Task 9: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/unit/.gitkeep`

- [ ] **Step 1: Write `vitest.config.ts`**

Write `/Users/pierrebelonsavon/Documents/budget/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 2: Write `tests/setup.ts`**

Write `/Users/pierrebelonsavon/Documents/budget/tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";

if (typeof localStorage === "undefined") {
  const store = new Map<string, string>();
  // @ts-expect-error test polyfill
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}
```

- [ ] **Step 3: Create empty test dir**

```bash
mkdir -p /Users/pierrebelonsavon/Documents/budget/tests/unit/migration /Users/pierrebelonsavon/Documents/budget/tests/unit/sync
touch /Users/pierrebelonsavon/Documents/budget/tests/unit/.gitkeep
```

- [ ] **Step 4: Verify it runs**

```bash
npm test
```

Expected: "No test files found" — Vitest runs but finds nothing yet. That's the green light.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/
git commit -m "chore: configure Vitest + happy-dom for unit tests"
```

---

## Task 10: Migration detection logic

**Files:**
- Create: `lib/migration/types.ts`
- Create: `lib/migration/detect.ts`
- Test: `tests/unit/migration/detect.test.ts`

The Zustand store currently persists under the key `budget-store-v1` in localStorage. This task adds a pure function that reads that key and returns whether legacy data is present.

- [ ] **Step 1: Write the types**

Write `/Users/pierrebelonsavon/Documents/budget/lib/migration/types.ts`:

```ts
import type {
  Account, Category, Tag, Transaction, RecurringRule,
  SavingsGoal, Budget, Note, Reminder, Settings,
} from "../types";

export interface LegacyPayload {
  accounts: Account[];
  categories: Category[];
  tags: Tag[];
  transactions: Transaction[];
  recurring: RecurringRule[];
  goals: SavingsGoal[];
  budgets: Budget[];
  notes: Note[];
  reminders: Reminder[];
  settings: Settings;
}

export interface LegacyDataReport {
  has: boolean;
  counts: {
    accounts: number;
    categories: number;
    tags: number;
    transactions: number;
    recurring: number;
    goals: number;
    budgets: number;
    notes: number;
    reminders: number;
  };
  payload: LegacyPayload | null;
}

export const LEGACY_STORE_KEY = "budget-store-v1";
```

- [ ] **Step 2: Write the failing test**

Write `/Users/pierrebelonsavon/Documents/budget/tests/unit/migration/detect.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { detectLegacyData } from "../../../lib/migration/detect";
import { LEGACY_STORE_KEY } from "../../../lib/migration/types";

describe("detectLegacyData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns has=false when no localStorage entry exists", () => {
    const r = detectLegacyData();
    expect(r.has).toBe(false);
    expect(r.payload).toBeNull();
    expect(r.counts.transactions).toBe(0);
  });

  it("returns has=false for an empty / defaulted store (no txns, no extra accounts)", () => {
    localStorage.setItem(
      LEGACY_STORE_KEY,
      JSON.stringify({
        state: {
          accounts: [
            { id: "a-checking", name: "Checking", type: "checking", startingBalance: 0,
              currency: "USD", color: "#6366f1", icon: "Wallet", archived: false }
          ],
          categories: [], tags: [], transactions: [], recurring: [],
          goals: [], budgets: [], notes: [], reminders: [],
          settings: {}, hydrated: true,
        },
        version: 0,
      })
    );
    const r = detectLegacyData();
    expect(r.has).toBe(false);
  });

  it("returns has=true when there are real transactions", () => {
    localStorage.setItem(
      LEGACY_STORE_KEY,
      JSON.stringify({
        state: {
          accounts: [], categories: [], tags: [],
          transactions: [
            { id: "x-1", type: "expense", amount: 12.5, currency: "USD",
              description: "coffee", accountId: "a-checking", tagIds: [],
              date: "2026-05-14", status: "paid" }
          ],
          recurring: [], goals: [], budgets: [], notes: [], reminders: [],
          settings: {}, hydrated: true,
        },
        version: 0,
      })
    );
    const r = detectLegacyData();
    expect(r.has).toBe(true);
    expect(r.counts.transactions).toBe(1);
    expect(r.payload?.transactions[0].id).toBe("x-1");
  });

  it("treats malformed JSON as no data", () => {
    localStorage.setItem(LEGACY_STORE_KEY, "{not json");
    expect(detectLegacyData().has).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test, watch it fail**

```bash
npm test -- detect
```

Expected: FAIL — `Cannot find module './lib/migration/detect'`.

- [ ] **Step 4: Implement `detect.ts`**

Write `/Users/pierrebelonsavon/Documents/budget/lib/migration/detect.ts`:

```ts
import { LEGACY_STORE_KEY, type LegacyDataReport, type LegacyPayload } from "./types";

const EMPTY_REPORT: LegacyDataReport = {
  has: false,
  payload: null,
  counts: {
    accounts: 0, categories: 0, tags: 0, transactions: 0,
    recurring: 0, goals: 0, budgets: 0, notes: 0, reminders: 0,
  },
};

export function detectLegacyData(): LegacyDataReport {
  if (typeof localStorage === "undefined") return EMPTY_REPORT;
  const raw = localStorage.getItem(LEGACY_STORE_KEY);
  if (!raw) return EMPTY_REPORT;

  let parsed: { state?: Partial<LegacyPayload> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_REPORT;
  }
  const s = parsed.state ?? {};
  const payload: LegacyPayload = {
    accounts: s.accounts ?? [],
    categories: s.categories ?? [],
    tags: s.tags ?? [],
    transactions: s.transactions ?? [],
    recurring: s.recurring ?? [],
    goals: s.goals ?? [],
    budgets: s.budgets ?? [],
    notes: s.notes ?? [],
    reminders: s.reminders ?? [],
    settings: s.settings ?? ({} as LegacyPayload["settings"]),
  };

  // "Has data" means any of the user-content arrays are non-empty.
  // The default starter ships with one Checking account + default categories — we ignore both.
  const userContent =
    payload.transactions.length +
    payload.tags.length +
    payload.recurring.length +
    payload.goals.length +
    payload.budgets.length +
    payload.notes.length +
    payload.reminders.length +
    Math.max(0, payload.accounts.length - 1);

  return {
    has: userContent > 0,
    payload,
    counts: {
      accounts: payload.accounts.length,
      categories: payload.categories.length,
      tags: payload.tags.length,
      transactions: payload.transactions.length,
      recurring: payload.recurring.length,
      goals: payload.goals.length,
      budgets: payload.budgets.length,
      notes: payload.notes.length,
      reminders: payload.reminders.length,
    },
  };
}
```

- [ ] **Step 5: Run the test, watch it pass**

```bash
npm test -- detect
```

Expected: PASS, 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/migration/types.ts lib/migration/detect.ts tests/unit/migration/detect.test.ts
git commit -m "feat(migration): detect legacy localStorage payload"
```

---

## Task 11: Migration import logic

**Files:**
- Create: `lib/migration/import.ts`
- Test: `tests/unit/migration/import.test.ts`

This task implements the pure mapping from a `LegacyPayload` to a set of Supabase insert payloads, plus the orchestrator that runs the inserts.

- [ ] **Step 1: Write the failing test**

Write `/Users/pierrebelonsavon/Documents/budget/tests/unit/migration/import.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapPayloadToInserts } from "../../../lib/migration/import";
import type { LegacyPayload } from "../../../lib/migration/types";

const HID = "11111111-1111-1111-1111-111111111111";

const samplePayload = (): LegacyPayload => ({
  accounts: [
    { id: "a-1", name: "Main", type: "checking", startingBalance: 100,
      currency: "USD", color: "#000", icon: "Wallet", archived: false }
  ],
  categories: [
    { id: "c-1", name: "Food", icon: "Utensils", color: "#f59e0b", type: "expense" }
  ],
  tags: [{ id: "t-1", name: "fun", color: "#a78bfa" }],
  transactions: [
    { id: "x-1", type: "expense", amount: 12.5, currency: "USD",
      description: "coffee", accountId: "a-1", categoryId: "c-1",
      tagIds: ["t-1"], date: "2026-05-14T00:00:00Z", status: "paid" }
  ],
  recurring: [],
  goals: [],
  budgets: [],
  notes: [],
  reminders: [],
  settings: {
    userName: "Pierre", currency: "USD", gradientFrom: "#a78bfa", gradientVia: "#f472b6",
    gradientTo: "#fb923c", themeMode: "auto", pinEnabled: false, soundEnabled: false,
    hapticsEnabled: true, weekStartsMonday: false, showProjected: true,
  },
});

describe("mapPayloadToInserts", () => {
  it("attaches household_id to every row", () => {
    const inserts = mapPayloadToInserts(samplePayload(), HID);
    expect(inserts.accounts[0].household_id).toBe(HID);
    expect(inserts.transactions[0].household_id).toBe(HID);
    expect(inserts.categories[0].household_id).toBe(HID);
    expect(inserts.tags[0].household_id).toBe(HID);
  });

  it("renames camelCase TS fields to snake_case DB columns", () => {
    const inserts = mapPayloadToInserts(samplePayload(), HID);
    expect(inserts.accounts[0]).toMatchObject({
      id: "a-1",
      starting_balance: 100,
      household_id: HID,
    });
    expect(inserts.transactions[0]).toMatchObject({
      id: "x-1",
      account_id: "a-1",
      category_id: "c-1",
      tag_ids: ["t-1"],
    });
  });

  it("emits empty arrays for tables with no rows", () => {
    const inserts = mapPayloadToInserts(samplePayload(), HID);
    expect(inserts.recurring_rules).toEqual([]);
    expect(inserts.savings_goals).toEqual([]);
    expect(inserts.budgets).toEqual([]);
    expect(inserts.notes).toEqual([]);
    expect(inserts.reminders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test, watch it fail**

```bash
npm test -- import
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `import.ts`**

Write `/Users/pierrebelonsavon/Documents/budget/lib/migration/import.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db.types";
import type { LegacyPayload } from "./types";

type DB = Database["public"]["Tables"];
type Insert<T extends keyof DB> = DB[T]["Insert"];

export interface InsertBundle {
  accounts: Insert<"accounts">[];
  categories: Insert<"categories">[];
  tags: Insert<"tags">[];
  transactions: Insert<"transactions">[];
  recurring_rules: Insert<"recurring_rules">[];
  savings_goals: Insert<"savings_goals">[];
  budgets: Insert<"budgets">[];
  notes: Insert<"notes">[];
  reminders: Insert<"reminders">[];
}

/** Pure mapping: legacy TS payload → snake_case DB rows tagged with household_id. */
export function mapPayloadToInserts(p: LegacyPayload, householdId: string): InsertBundle {
  return {
    accounts: p.accounts.map((a) => ({
      id: a.id, household_id: householdId, name: a.name, type: a.type,
      starting_balance: a.startingBalance, currency: a.currency, color: a.color,
      icon: a.icon, archived: a.archived,
    })),
    categories: p.categories.map((c) => ({
      id: c.id, household_id: householdId, name: c.name, icon: c.icon, color: c.color, type: c.type,
    })),
    tags: p.tags.map((t) => ({
      id: t.id, household_id: householdId, name: t.name, color: t.color,
    })),
    transactions: p.transactions.map((x) => ({
      id: x.id, household_id: householdId, type: x.type, amount: x.amount,
      currency: x.currency, description: x.description, category_id: x.categoryId ?? null,
      account_id: x.accountId, to_account_id: x.toAccountId ?? null,
      tag_ids: x.tagIds, date: x.date, status: x.status, notes: x.notes ?? null,
      attachments: (x.attachments ?? null) as never, recurring_id: x.recurringId ?? null,
      splits: (x.splits ?? null) as never, projected: x.projected ?? false,
    })),
    recurring_rules: p.recurring.map((r) => ({
      id: r.id, household_id: householdId, name: r.name, type: r.type, amount: r.amount,
      currency: r.currency, category_id: r.categoryId ?? null, account_id: r.accountId,
      to_account_id: r.toAccountId ?? null, tag_ids: r.tagIds, notes: r.notes ?? null,
      frequency: r.frequency, start_date: r.startDate, end_date: r.endDate ?? null,
      day_of_month: r.dayOfMonth ?? null, autopay: r.autopay, active: r.active,
      last_generated: r.lastGenerated ?? null,
    })),
    savings_goals: p.goals.map((g) => ({
      id: g.id, household_id: householdId, name: g.name, target: g.target,
      current: g.current, deadline: g.deadline ?? null, color: g.color, icon: g.icon,
      account_id: g.accountId ?? null, contributions: g.contributions as never,
    })),
    budgets: p.budgets.map((b) => ({
      id: b.id, household_id: householdId, category_id: b.categoryId,
      amount: b.amount, period: b.period, rollover: b.rollover,
    })),
    notes: p.notes.map((n) => ({
      id: n.id, household_id: householdId, title: n.title, content: n.content,
      pinned: n.pinned, color: n.color ?? null, tag_ids: n.tagIds,
    })),
    reminders: p.reminders.map((r) => ({
      id: r.id, household_id: householdId, title: r.title, date: r.date,
      recurring: r.recurring ?? null, done: r.done,
      linked_transaction_id: r.linkedTransactionId ?? null,
    })),
  };
}

/** Orchestrator: insert every row in batched upserts. Returns counts per table. */
export async function importLocalToSupabase(
  payload: LegacyPayload,
  householdId: string,
  client: SupabaseClient<Database>
): Promise<{ inserted: Record<keyof InsertBundle, number>; errors: string[] }> {
  const bundle = mapPayloadToInserts(payload, householdId);
  const errors: string[] = [];
  const inserted: Record<keyof InsertBundle, number> = {
    accounts: 0, categories: 0, tags: 0, transactions: 0, recurring_rules: 0,
    savings_goals: 0, budgets: 0, notes: 0, reminders: 0,
  };

  // Parents first, then transactions, then dependents.
  const order: (keyof InsertBundle)[] = [
    "accounts", "categories", "tags",
    "recurring_rules", "savings_goals", "budgets",
    "transactions", "notes", "reminders",
  ];

  for (const table of order) {
    const rows = bundle[table];
    if (rows.length === 0) continue;
    const { error, count } = await client
      .from(table)
      .upsert(rows as never, { onConflict: "id", count: "exact" });
    if (error) {
      errors.push(`${table}: ${error.message}`);
    } else {
      inserted[table] = count ?? rows.length;
    }
  }
  return { inserted, errors };
}
```

- [ ] **Step 4: Run the test, watch it pass**

```bash
npm test -- import
```

Expected: PASS, 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/migration/import.ts tests/unit/migration/import.test.ts
git commit -m "feat(migration): map legacy payload to Supabase inserts + orchestrator"
```

---

## Task 12: Auth context and helpers

**Files:**
- Create: `lib/auth/client.ts`
- Create: `lib/auth/context.tsx`

- [ ] **Step 1: Write auth client helpers**

Write `/Users/pierrebelonsavon/Documents/budget/lib/auth/client.ts`:

```ts
"use client";
import { getBrowserSupabase } from "../db";

export async function sendMagicLink(email: string) {
  const sb = getBrowserSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { ok: !error, error: error?.message };
}

export async function signOut() {
  const sb = getBrowserSupabase();
  await sb.auth.signOut();
}

export async function getCurrentUser() {
  const sb = getBrowserSupabase();
  const { data } = await sb.auth.getUser();
  return data.user;
}
```

- [ ] **Step 2: Write the AuthProvider context**

Write `/Users/pierrebelonsavon/Documents/budget/lib/auth/context.tsx`:

```tsx
"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "../db";

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const sb = getBrowserSupabase();
    let cancelled = false;

    sb.auth.getUser().then(({ data }) => {
      if (!cancelled) setState({ user: data.user, loading: false });
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/auth/
git commit -m "feat(auth): add Supabase auth client helpers and AuthProvider"
```

---

## Task 13: Sign-in page and auth callback

**Files:**
- Create: `components/Auth/SignInForm.tsx`
- Create: `app/(auth)/sign-in/page.tsx`
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Write the SignInForm component**

Write `/Users/pierrebelonsavon/Documents/budget/components/Auth/SignInForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import { sendMagicLink } from "@/lib/auth/client";
import { motion } from "framer-motion";
import { Mail, Check } from "lucide-react";

type State = "idle" | "sending" | "sent" | "error";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setError(undefined);
    const { ok, error: err } = await sendMagicLink(email.trim());
    if (ok) {
      setState("sent");
    } else {
      setState("error");
      setError(err);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm glass p-7 space-y-4"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">Sign in</span>
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          We'll email you a magic link. No password needed.
        </p>
      </div>

      {state !== "sent" && (
        <>
          <label className="block">
            <span className="text-xs text-[var(--muted)] uppercase tracking-wider">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-transparent border border-[var(--card-border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--grad-via)]/40"
              placeholder="you@example.com"
              disabled={state === "sending"}
            />
          </label>
          <button
            type="submit"
            disabled={state === "sending" || !email}
            className="tap w-full gradient-fill text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {state === "error" && (
            <p className="text-sm text-red-500">{error ?? "Something went wrong."}</p>
          )}
        </>
      )}

      {state === "sent" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center text-center gap-3 py-2"
        >
          <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center">
            <Check size={24} className="text-green-500" />
          </div>
          <div>
            <div className="font-medium">Check your email</div>
            <div className="text-sm text-[var(--muted)] mt-1 flex items-center gap-1.5 justify-center">
              <Mail size={14} /> {email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="text-xs text-[var(--muted)] hover:underline"
          >
            Use a different email
          </button>
        </motion.div>
      )}
    </motion.form>
  );
}
```

- [ ] **Step 2: Write the sign-in page**

Write `/Users/pierrebelonsavon/Documents/budget/app/(auth)/sign-in/page.tsx`:

```tsx
import SignInForm from "@/components/Auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="min-h-[calc(100dvh-3rem)] flex items-center justify-center px-4">
      <SignInForm />
    </div>
  );
}
```

- [ ] **Step 3: Write the auth callback route**

Write `/Users/pierrebelonsavon/Documents/budget/app/auth/callback/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const sb = getServerSupabase(cookieStore);
    await sb.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
```

- [ ] **Step 4: Smoke-test the sign-in page**

```bash
npm run dev -- -p 3001
```

Navigate to `http://localhost:3001/sign-in`. Expected: the form renders. Type an email, submit. Expected: green check + "Check your email" message. Pierre should receive a magic-link email at that address.

(If the email doesn't arrive, check Supabase Project Settings → Authentication → Email Templates is enabled. Free tier sends 4 emails/hour by default.)

Click the magic link in the email. Expected: browser redirects to `/auth/callback?code=...` and then to `/`. You're now signed in. (We don't have UI to show this yet — proved in Task 15.)

Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add components/Auth/ "app/(auth)" app/auth/
git commit -m "feat(auth): add /sign-in page with magic link + OAuth callback handler"
```

---

## Task 14: Household bootstrap

**Files:**
- Create: `lib/household/bootstrap.ts`
- Create: `lib/household/context.tsx`

- [ ] **Step 1: Write the bootstrap helper**

Write `/Users/pierrebelonsavon/Documents/budget/lib/household/bootstrap.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db.types";

export interface BootstrapResult {
  householdId: string;
  isNew: boolean;
}

/** Ensures the authenticated user has at least one household; returns its id. */
export async function ensureDefaultHousehold(
  client: SupabaseClient<Database>,
  userId: string
): Promise<BootstrapResult> {
  const { data: existing, error: readErr } = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1);
  if (readErr) throw readErr;
  if (existing && existing.length > 0) {
    return { householdId: existing[0].household_id, isNew: false };
  }

  const { data: created, error: insErr } = await client
    .from("households")
    .insert({ name: "My budget", owner_id: userId })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return { householdId: created.id, isNew: true };
}
```

- [ ] **Step 2: Write a placeholder context (Task 19 expands it with sync)**

Write `/Users/pierrebelonsavon/Documents/budget/lib/household/context.tsx`:

```tsx
"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "../db";
import { useAuth } from "../auth/context";
import { ensureDefaultHousehold } from "./bootstrap";

interface HouseholdState {
  householdId: string | null;
  isNew: boolean;
  loading: boolean;
}

const Ctx = createContext<HouseholdState>({ householdId: null, isNew: false, loading: false });

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<HouseholdState>({ householdId: null, isNew: false, loading: false });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ householdId: null, isNew: false, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const sb = getBrowserSupabase();
    ensureDefaultHousehold(sb, user.id)
      .then(({ householdId, isNew }) => setState({ householdId, isNew, loading: false }))
      .catch(() => setState({ householdId: null, isNew: false, loading: false }));
  }, [user, authLoading]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useHousehold() {
  return useContext(Ctx);
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/household/
git commit -m "feat(household): ensure-default-household helper and HouseholdProvider"
```

---

## Task 15: Wire providers into root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Read current layout**

Open `/Users/pierrebelonsavon/Documents/budget/app/layout.tsx` and confirm it currently wraps the app in `ThemeBridge`, `Aurora`, `PinGate`, etc.

- [ ] **Step 2: Add the two providers as nested wrappers**

Edit `/Users/pierrebelonsavon/Documents/budget/app/layout.tsx`. Add new imports near the top (preserve existing ones):

```tsx
import { AuthProvider } from "@/lib/auth/context";
import { HouseholdProvider } from "@/lib/household/context";
```

Replace the `<body>` block's children with:

```tsx
<body className="min-h-full">
  <AuthProvider>
    <HouseholdProvider>
      <ThemeBridge />
      <Aurora />
      <PinGate>
        <Nav />
        <main className="md:pl-64 pb-28 md:pb-8 pt-4 px-4 md:px-8 safe-top max-w-6xl mx-auto md:mx-0">
          {children}
        </main>
        <QuickAddFAB />
      </PinGate>
    </HouseholdProvider>
  </AuthProvider>
</body>
```

(Keep the existing `<html>` wrapper, fonts, metadata exactly as they were.)

- [ ] **Step 3: Smoke-test**

```bash
npm run dev -- -p 3001
```

Open `http://localhost:3001` → existing app renders (you're not signed in). DevTools console: no React errors. Then go to `/sign-in`, sign in via the magic-link flow you tested in Task 13. After clicking the link and being redirected back, in DevTools console run:

```js
const { data } = await (await import("/lib/db.ts")).getBrowserSupabase().auth.getUser();
console.log(data.user?.email);
```

Expected: your email. Run:

```js
const { data: rows } = await (await import("/lib/db.ts")).getBrowserSupabase().from("households").select("*");
console.log(rows);
```

Expected: one household named "My budget" owned by you. (HouseholdProvider has created it.)

Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(app): wrap layout in AuthProvider + HouseholdProvider"
```

---

## Task 16: Migration prompt UI

**Files:**
- Create: `components/Migration/MigrationPrompt.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write the MigrationPrompt component**

Write `/Users/pierrebelonsavon/Documents/budget/components/Migration/MigrationPrompt.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Sparkles, X } from "lucide-react";
import { detectLegacyData } from "@/lib/migration/detect";
import { importLocalToSupabase } from "@/lib/migration/import";
import type { LegacyDataReport } from "@/lib/migration/types";
import { getBrowserSupabase } from "@/lib/db";
import { useAuth } from "@/lib/auth/context";
import { useHousehold } from "@/lib/household/context";

const DISMISS_KEY = "budget-migration-prompt-dismissed-v1";

export default function MigrationPrompt() {
  const { user, loading: authLoading } = useAuth();
  const { householdId, isNew, loading: hhLoading } = useHousehold();
  const [report, setReport] = useState<LegacyDataReport | null>(null);
  const [state, setState] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    }
  }, []);

  useEffect(() => {
    if (authLoading || hhLoading) return;
    if (!user || !householdId || !isNew || dismissed) {
      setReport(null);
      return;
    }
    setReport(detectLegacyData());
  }, [authLoading, hhLoading, user, householdId, isNew, dismissed]);

  const show = useMemo(
    () => !!report?.has && state !== "done",
    [report, state]
  );

  async function doImport() {
    if (!report?.payload || !householdId) return;
    setState("importing");
    setErrorMsg(undefined);
    const sb = getBrowserSupabase();
    const { inserted, errors } = await importLocalToSupabase(report.payload, householdId, sb);
    if (errors.length) {
      setErrorMsg(errors.join("; "));
      setState("error");
      return;
    }
    setCounts(inserted);
    setState("done");
    localStorage.setItem(DISMISS_KEY, "1");
  }

  function startFresh() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="w-full max-w-md glass p-6 relative"
          >
            <button
              onClick={startFresh}
              aria-label="Dismiss"
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-[var(--hover)]"
            >
              <X size={16} />
            </button>

            {state === "done" ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 text-green-500">
                  <Sparkles size={18} />
                  <h2 className="text-lg font-semibold">All set</h2>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  Imported {counts?.transactions ?? 0} transactions, {counts?.accounts ?? 0} accounts,
                  and {counts?.savings_goals ?? 0} goals. You can now use the app from any device.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl gradient-fill flex items-center justify-center text-white">
                    <Upload size={18} />
                  </div>
                  <h2 className="text-lg font-semibold">Bring your data along?</h2>
                </div>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  We found existing data on this device.
                  Import it so you can pick up where you left off — across all your devices.
                </p>
                <div className="rounded-xl bg-[var(--hover)] p-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
                  {(["transactions","accounts","recurring","goals","budgets","notes","reminders"] as const).map((k) =>
                    report?.counts[k] ? (
                      <span key={k} className="tabular-nums">
                        <strong>{report.counts[k]}</strong>{" "}
                        <span className="text-[var(--muted)]">{k}</span>
                      </span>
                    ) : null
                  )}
                </div>
                {state === "error" && (
                  <div className="text-sm text-red-500">{errorMsg ?? "Import failed."}</div>
                )}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={doImport}
                    disabled={state === "importing"}
                    className="tap flex-1 gradient-fill text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
                  >
                    {state === "importing" ? "Importing…" : "Import everything"}
                  </button>
                  <button
                    onClick={startFresh}
                    disabled={state === "importing"}
                    className="tap px-4 py-2.5 rounded-xl text-sm hover:bg-[var(--hover)]"
                  >
                    Start fresh
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Mount the prompt in layout**

Edit `/Users/pierrebelonsavon/Documents/budget/app/layout.tsx`. Add the import:

```tsx
import MigrationPrompt from "@/components/Migration/MigrationPrompt";
```

Inside the `<HouseholdProvider>`, after the existing `<PinGate>` block, insert:

```tsx
<MigrationPrompt />
```

(It's z-index 60, sits over everything.)

- [ ] **Step 3: Smoke-test**

```bash
npm run dev -- -p 3001
```

1. Sign out (DevTools): `await (await import("/lib/db.ts")).getBrowserSupabase().auth.signOut()`
2. Without signing in, add a few transactions in the existing UI so localStorage has data.
3. Confirm in DevTools that `localStorage.getItem("budget-store-v1")` shows data.
4. Reset migration-prompt dismissal: `localStorage.removeItem("budget-migration-prompt-dismissed-v1")`.
5. Sign in via magic link.
6. After the redirect back to `/`, the migration prompt should appear after ~1s with counts of your test data.
7. Click "Import everything". Expected: "All set" with imported counts.
8. In DevTools, query: `await (await import("/lib/db.ts")).getBrowserSupabase().from("transactions").select("*").then(r => console.log(r.data))`. Expected: your imported transactions.

Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add components/Migration/ app/layout.tsx
git commit -m "feat(migration): prompt on first sign-in to import legacy localStorage data"
```

---

## Task 17: Realtime hook

**Files:**
- Create: `lib/realtime.ts`

- [ ] **Step 1: Write the hook**

Write `/Users/pierrebelonsavon/Documents/budget/lib/realtime.ts`:

```ts
"use client";
import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./db";
import type { Database } from "./db.types";

type TableName = keyof Database["public"]["Tables"];

interface UseRealtimeOpts<T extends TableName> {
  table: T;
  householdId: string | null;
  onInsert?: (row: Database["public"]["Tables"][T]["Row"]) => void;
  onUpdate?: (row: Database["public"]["Tables"][T]["Row"]) => void;
  onDelete?: (row: Database["public"]["Tables"][T]["Row"]) => void;
}

export function useRealtime<T extends TableName>(opts: UseRealtimeOpts<T>) {
  useEffect(() => {
    if (!opts.householdId) return;
    const sb = getBrowserSupabase();
    const channel = sb
      .channel(`realtime:${String(opts.table)}:${opts.householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: String(opts.table),
          filter: `household_id=eq.${opts.householdId}`,
        },
        (payload: RealtimePostgresChangesPayload<Database["public"]["Tables"][T]["Row"]>) => {
          if (payload.eventType === "INSERT" && opts.onInsert) {
            opts.onInsert(payload.new as Database["public"]["Tables"][T]["Row"]);
          } else if (payload.eventType === "UPDATE" && opts.onUpdate) {
            opts.onUpdate(payload.new as Database["public"]["Tables"][T]["Row"]);
          } else if (payload.eventType === "DELETE" && opts.onDelete) {
            opts.onDelete(payload.old as Database["public"]["Tables"][T]["Row"]);
          }
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.table, opts.householdId]);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/realtime.ts
git commit -m "feat(realtime): typed useRealtime hook filtered by household_id"
```

---

## Task 18: Offline write queue (TDD)

**Files:**
- Create: `lib/sync/offline-queue.ts`
- Test: `tests/unit/sync/offline-queue.test.ts`

The queue stores pending writes in IndexedDB. On reconnect, replay in FIFO order.

- [ ] **Step 1: Write the failing test**

Write `/Users/pierrebelonsavon/Documents/budget/tests/unit/sync/offline-queue.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { OfflineQueue, type PendingOp } from "../../../lib/sync/offline-queue";

const op = (table: string, kind: PendingOp["kind"], row: object): Omit<PendingOp, "id" | "queuedAt"> => ({
  table, kind, row,
});

describe("OfflineQueue", () => {
  let q: OfflineQueue;

  beforeEach(async () => {
    q = new OfflineQueue("test-q-" + Math.random().toString(36).slice(2));
    await q.clear();
  });

  it("starts empty", async () => {
    expect(await q.size()).toBe(0);
    expect(await q.list()).toEqual([]);
  });

  it("enqueues and assigns ids in order", async () => {
    await q.enqueue(op("transactions", "upsert", { id: "x-1", amount: 10 }));
    await q.enqueue(op("transactions", "upsert", { id: "x-2", amount: 20 }));
    const items = await q.list();
    expect(items.length).toBe(2);
    expect(items[0].row).toMatchObject({ id: "x-1" });
    expect(items[1].row).toMatchObject({ id: "x-2" });
    expect(items[0].id < items[1].id).toBe(true);
  });

  it("removeIds deletes specific entries", async () => {
    const a = await q.enqueue(op("transactions", "upsert", { id: "x-1" }));
    const b = await q.enqueue(op("transactions", "upsert", { id: "x-2" }));
    await q.removeIds([a]);
    const items = await q.list();
    expect(items.map(i => i.id)).toEqual([b]);
  });

  it("clear empties the queue", async () => {
    await q.enqueue(op("transactions", "upsert", { id: "x-1" }));
    await q.clear();
    expect(await q.size()).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, watch it fail**

```bash
npm test -- offline-queue
```

Expected: module not found.

- [ ] **Step 3: Implement the queue**

Write `/Users/pierrebelonsavon/Documents/budget/lib/sync/offline-queue.ts`:

```ts
export interface PendingOp {
  id: number;
  queuedAt: number;
  table: string;
  kind: "upsert" | "delete";
  row: object;
}

const DB_NAME = "budget-offline-queue";
const STORE = "ops";

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class OfflineQueue {
  private dbName: string;
  constructor(scope = DB_NAME) {
    this.dbName = scope;
  }

  async enqueue(op: Omit<PendingOp, "id" | "queuedAt">): Promise<number> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).add({ ...op, queuedAt: Date.now() } as PendingOp);
      req.onsuccess = () => resolve(req.result as number);
      req.onerror = () => reject(req.error);
    });
  }

  async list(): Promise<PendingOp[]> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PendingOp[]);
      req.onerror = () => reject(req.error);
    });
  }

  async size(): Promise<number> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async removeIds(ids: number[]): Promise<void> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const id of ids) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await openDb(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

- [ ] **Step 4: Run the test, watch it pass**

```bash
npm test -- offline-queue
```

Expected: PASS, 4 tests green. happy-dom ships an in-memory IndexedDB shim.

- [ ] **Step 5: Commit**

```bash
git add lib/sync/offline-queue.ts tests/unit/sync/offline-queue.test.ts
git commit -m "feat(sync): IndexedDB-backed offline write queue with FIFO ordering"
```

---

## Task 19: Sync bindings, sync engine, store integration

**Files:**
- Create: `lib/sync/sync-bindings.ts`
- Create: `lib/sync/sync-engine.ts`
- Modify: `lib/store.ts`
- Modify: `lib/types.ts`
- Modify: `lib/household/context.tsx`

This is the integration point. When a user is signed in, every Zustand mutation flows through the sync engine: optimistic local update → enqueue to Supabase (or queue offline). Realtime events from Supabase reconcile back into Zustand.

- [ ] **Step 1: Define table↔slice bindings + row<->app converters**

Write `/Users/pierrebelonsavon/Documents/budget/lib/sync/sync-bindings.ts`:

```ts
import type { Database } from "../db.types";
import type {
  Account, Category, Tag, Transaction, RecurringRule,
  SavingsGoal, Budget, Note, Reminder,
} from "../types";

type DB = Database["public"]["Tables"];

export const rowToApp = {
  accounts: (r: DB["accounts"]["Row"]): Account => ({
    id: r.id, name: r.name, type: r.type as Account["type"],
    startingBalance: Number(r.starting_balance), currency: r.currency as Account["currency"],
    color: r.color, icon: r.icon, archived: r.archived,
  }),
  categories: (r: DB["categories"]["Row"]): Category => ({
    id: r.id, name: r.name, icon: r.icon, color: r.color, type: r.type as Category["type"],
  }),
  tags: (r: DB["tags"]["Row"]): Tag => ({ id: r.id, name: r.name, color: r.color }),
  transactions: (r: DB["transactions"]["Row"]): Transaction => ({
    id: r.id, type: r.type as Transaction["type"], amount: Number(r.amount),
    currency: r.currency as Transaction["currency"], description: r.description,
    categoryId: r.category_id ?? undefined, accountId: r.account_id,
    toAccountId: r.to_account_id ?? undefined,
    tagIds: (r.tag_ids as string[]) ?? [],
    date: r.date, status: r.status as Transaction["status"],
    notes: r.notes ?? undefined,
    attachments: (r.attachments as Transaction["attachments"]) ?? undefined,
    recurringId: r.recurring_id ?? undefined,
    splits: (r.splits as Transaction["splits"]) ?? undefined,
    projected: r.projected,
  }),
  recurring_rules: (r: DB["recurring_rules"]["Row"]): RecurringRule => ({
    id: r.id, name: r.name, type: r.type as RecurringRule["type"],
    amount: Number(r.amount), currency: r.currency as RecurringRule["currency"],
    categoryId: r.category_id ?? undefined, accountId: r.account_id,
    toAccountId: r.to_account_id ?? undefined,
    tagIds: (r.tag_ids as string[]) ?? [],
    notes: r.notes ?? undefined,
    frequency: r.frequency as RecurringRule["frequency"],
    startDate: r.start_date, endDate: r.end_date ?? undefined,
    dayOfMonth: r.day_of_month ?? undefined,
    autopay: r.autopay, active: r.active,
    lastGenerated: r.last_generated ?? undefined,
  }),
  savings_goals: (r: DB["savings_goals"]["Row"]): SavingsGoal => ({
    id: r.id, name: r.name, target: Number(r.target), current: Number(r.current),
    deadline: r.deadline ?? undefined, color: r.color, icon: r.icon,
    accountId: r.account_id ?? undefined,
    contributions: (r.contributions as SavingsGoal["contributions"]) ?? [],
  }),
  budgets: (r: DB["budgets"]["Row"]): Budget => ({
    id: r.id, categoryId: r.category_id, amount: Number(r.amount),
    period: r.period as Budget["period"], rollover: r.rollover,
  }),
  notes: (r: DB["notes"]["Row"]): Note => ({
    id: r.id, title: r.title, content: r.content,
    createdAt: r.created_at, updatedAt: r.updated_at,
    pinned: r.pinned, color: r.color ?? undefined,
    tagIds: (r.tag_ids as string[]) ?? [],
  }),
  reminders: (r: DB["reminders"]["Row"]): Reminder => ({
    id: r.id, title: r.title, date: r.date,
    recurring: (r.recurring ?? undefined) as Reminder["recurring"],
    done: r.done, linkedTransactionId: r.linked_transaction_id ?? undefined,
  }),
};

export const appToRow = {
  accounts: (a: Account, householdId: string): DB["accounts"]["Insert"] => ({
    id: a.id, household_id: householdId, name: a.name, type: a.type,
    starting_balance: a.startingBalance, currency: a.currency, color: a.color,
    icon: a.icon, archived: a.archived,
  }),
  categories: (c: Category, householdId: string): DB["categories"]["Insert"] => ({
    id: c.id, household_id: householdId, name: c.name, icon: c.icon, color: c.color, type: c.type,
  }),
  tags: (t: Tag, householdId: string): DB["tags"]["Insert"] => ({
    id: t.id, household_id: householdId, name: t.name, color: t.color,
  }),
  transactions: (x: Transaction, householdId: string): DB["transactions"]["Insert"] => ({
    id: x.id, household_id: householdId, type: x.type, amount: x.amount, currency: x.currency,
    description: x.description, category_id: x.categoryId ?? null, account_id: x.accountId,
    to_account_id: x.toAccountId ?? null, tag_ids: x.tagIds, date: x.date, status: x.status,
    notes: x.notes ?? null, attachments: (x.attachments ?? null) as never,
    recurring_id: x.recurringId ?? null, splits: (x.splits ?? null) as never,
    projected: x.projected ?? false,
  }),
  recurring_rules: (r: RecurringRule, householdId: string): DB["recurring_rules"]["Insert"] => ({
    id: r.id, household_id: householdId, name: r.name, type: r.type, amount: r.amount,
    currency: r.currency, category_id: r.categoryId ?? null, account_id: r.accountId,
    to_account_id: r.toAccountId ?? null, tag_ids: r.tagIds, notes: r.notes ?? null,
    frequency: r.frequency, start_date: r.startDate, end_date: r.endDate ?? null,
    day_of_month: r.dayOfMonth ?? null, autopay: r.autopay, active: r.active,
    last_generated: r.lastGenerated ?? null,
  }),
  savings_goals: (g: SavingsGoal, householdId: string): DB["savings_goals"]["Insert"] => ({
    id: g.id, household_id: householdId, name: g.name, target: g.target, current: g.current,
    deadline: g.deadline ?? null, color: g.color, icon: g.icon, account_id: g.accountId ?? null,
    contributions: g.contributions as never,
  }),
  budgets: (b: Budget, householdId: string): DB["budgets"]["Insert"] => ({
    id: b.id, household_id: householdId, category_id: b.categoryId,
    amount: b.amount, period: b.period, rollover: b.rollover,
  }),
  notes: (n: Note, householdId: string): DB["notes"]["Insert"] => ({
    id: n.id, household_id: householdId, title: n.title, content: n.content,
    pinned: n.pinned, color: n.color ?? null, tag_ids: n.tagIds,
  }),
  reminders: (rm: Reminder, householdId: string): DB["reminders"]["Insert"] => ({
    id: rm.id, household_id: householdId, title: rm.title, date: rm.date,
    recurring: rm.recurring ?? null, done: rm.done,
    linked_transaction_id: rm.linkedTransactionId ?? null,
  }),
};

/** Slice key in the Zustand store, indexed by DB table name. */
export const tableToSlice: Record<keyof typeof rowToApp, string> = {
  accounts: "accounts",
  categories: "categories",
  tags: "tags",
  transactions: "transactions",
  recurring_rules: "recurring",
  savings_goals: "goals",
  budgets: "budgets",
  notes: "notes",
  reminders: "reminders",
};
```

- [ ] **Step 2: Write the sync engine**

Write `/Users/pierrebelonsavon/Documents/budget/lib/sync/sync-engine.ts`:

```ts
"use client";
import { getBrowserSupabase } from "../db";
import type { Database } from "../db.types";
import { useStore } from "../store";
import { OfflineQueue, type PendingOp } from "./offline-queue";
import { rowToApp, appToRow, tableToSlice } from "./sync-bindings";

type DB = Database["public"]["Tables"];
type AppTable = keyof typeof rowToApp;

const queue = new OfflineQueue();

/** Pull every row from Supabase for the given household into the store. */
export async function pullInitial(householdId: string) {
  const sb = getBrowserSupabase();
  const tables = Object.keys(rowToApp) as AppTable[];
  const next: Record<string, unknown[]> = {};
  for (const t of tables) {
    const { data, error } = await sb
      .from(t)
      .select("*")
      .eq("household_id", householdId)
      .is("deleted_at", null);
    if (error) {
      console.warn("pullInitial", t, error.message);
      next[tableToSlice[t]] = [];
      continue;
    }
    next[tableToSlice[t]] = (data ?? []).map((row) => (rowToApp[t] as (r: unknown) => unknown)(row));
  }
  useStore.setState(next as never);
}

interface UpsertArgs<T extends AppTable> {
  table: T;
  row: DB[T]["Insert"];
}
interface DeleteArgs<T extends AppTable> {
  table: T;
  id: string;
}

export async function upsertRow<T extends AppTable>({ table, row }: UpsertArgs<T>) {
  const sb = getBrowserSupabase();
  try {
    if (!navigator.onLine) throw new Error("offline");
    const { error } = await sb.from(table).upsert(row as never, { onConflict: "id" });
    if (error) throw error;
  } catch {
    await queue.enqueue({ table, kind: "upsert", row: row as object });
  }
}

export async function deleteRow<T extends AppTable>({ table, id }: DeleteArgs<T>) {
  const sb = getBrowserSupabase();
  try {
    if (!navigator.onLine) throw new Error("offline");
    const { error } = await sb
      .from(table)
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw error;
  } catch {
    await queue.enqueue({ table, kind: "delete", row: { id } });
  }
}

/** Replay queued ops in FIFO. Called on reconnect. */
export async function flushQueue() {
  const sb = getBrowserSupabase();
  const items = await queue.list();
  if (items.length === 0) return { sent: 0, failed: 0 };
  let sent = 0, failed = 0;
  const ok: number[] = [];
  for (const item of items as PendingOp[]) {
    let err: unknown = null;
    if (item.kind === "upsert") {
      const { error } = await sb.from(item.table).upsert(item.row as never, { onConflict: "id" });
      err = error;
    } else {
      const { error } = await sb
        .from(item.table)
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", (item.row as { id: string }).id);
      err = error;
    }
    if (err) { failed++; } else { sent++; ok.push(item.id); }
  }
  if (ok.length) await queue.removeIds(ok);
  return { sent, failed };
}

/** Wire `online` events to drive flushQueue. Call once at app startup. */
export function installOnlineFlusher() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => { flushQueue().catch(() => {}); });
}

export { appToRow, rowToApp, tableToSlice };
```

- [ ] **Step 3: Extend `lib/types.ts`**

Open `/Users/pierrebelonsavon/Documents/budget/lib/types.ts`. In the `AppState` interface, add the field `currentHouseholdId: string | null;` (anywhere in the interface — keep alphabetical-ish order with the others).

- [ ] **Step 4: Modify `lib/store.ts` to emit Supabase writes**

Open `/Users/pierrebelonsavon/Documents/budget/lib/store.ts`. Add new imports near the top, after the existing imports:

```ts
import { upsertRow, deleteRow, appToRow } from "./sync/sync-engine";
type AppTable = keyof typeof appToRow;
```

In the `StoreActions` interface, add:

```ts
setCurrentHousehold: (id: string | null) => void;
```

In the `create<Store>()(persist((set, get) => ({ ... })))` initializer, add `currentHouseholdId: null,` after `hydrated: false,` and add the action:

```ts
setCurrentHousehold: (id) => set({ currentHouseholdId: id }),
```

Add a `syncAfter` helper inside the initializer (just below the line `(set, get) => ({`):

```ts
const syncAfter = <T extends AppTable>(table: T, row: unknown, mode: "upsert" | "delete", id?: string) => {
  const hid = get().currentHouseholdId;
  if (!hid) return;
  if (mode === "delete" && id) {
    deleteRow({ table, id }).catch(() => {});
  } else if (mode === "upsert" && row) {
    const dbRow = (appToRow[table] as (a: unknown, h: string) => unknown)(row, hid);
    upsertRow({ table, row: dbRow as never }).catch(() => {});
  }
};
```

Now thread `syncAfter` into every mutation. For each action, after the existing `set(...)`, add a `syncAfter` call. Replace the action bodies as follows (preserve the rest of the file):

```ts
addAccount: (a) => {
  const acc = { ...a, id: uid("a") };
  set((s) => ({ accounts: [...s.accounts, acc] }));
  syncAfter("accounts", acc, "upsert");
},
updateAccount: (id, a) => {
  set((s) => ({
    accounts: s.accounts.map((x) => (x.id === id ? { ...x, ...a } : x)),
  }));
  const after = get().accounts.find((x) => x.id === id);
  if (after) syncAfter("accounts", after, "upsert");
},
removeAccount: (id) => {
  set((s) => ({ accounts: s.accounts.filter((x) => x.id !== id) }));
  syncAfter("accounts", null, "delete", id);
},

addCategory: (c) => {
  const cat = { ...c, id: uid("c") };
  set((s) => ({ categories: [...s.categories, cat] }));
  syncAfter("categories", cat, "upsert");
},
updateCategory: (id, c) => {
  set((s) => ({
    categories: s.categories.map((x) => (x.id === id ? { ...x, ...c } : x)),
  }));
  const after = get().categories.find((x) => x.id === id);
  if (after) syncAfter("categories", after, "upsert");
},
removeCategory: (id) => {
  set((s) => ({ categories: s.categories.filter((x) => x.id !== id) }));
  syncAfter("categories", null, "delete", id);
},

addTag: (t) => {
  const tag = { ...t, id: uid("t") };
  set((s) => ({ tags: [...s.tags, tag] }));
  syncAfter("tags", tag, "upsert");
},
updateTag: (id, t) => {
  set((s) => ({ tags: s.tags.map((x) => (x.id === id ? { ...x, ...t } : x)) }));
  const after = get().tags.find((x) => x.id === id);
  if (after) syncAfter("tags", after, "upsert");
},
removeTag: (id) => {
  set((s) => ({ tags: s.tags.filter((x) => x.id !== id) }));
  syncAfter("tags", null, "delete", id);
},

addTransaction: (t) => {
  const txn: Transaction = { ...t, id: uid("x") };
  set((s) => ({ transactions: [...s.transactions, txn] }));
  syncAfter("transactions", txn, "upsert");
  return txn;
},
updateTransaction: (id, t) => {
  set((s) => ({
    transactions: s.transactions.map((x) => (x.id === id ? { ...x, ...t } : x)),
  }));
  const after = get().transactions.find((x) => x.id === id);
  if (after) syncAfter("transactions", after, "upsert");
},
removeTransaction: (id) => {
  set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) }));
  syncAfter("transactions", null, "delete", id);
},
bulkSetStatus: (ids, status) => {
  set((s) => ({
    transactions: s.transactions.map((x) =>
      ids.includes(x.id) ? { ...x, status } : x
    ),
  }));
  const all = get().transactions;
  for (const id of ids) {
    const t = all.find((x) => x.id === id);
    if (t) syncAfter("transactions", t, "upsert");
  }
},

addRecurring: (r) => {
  const rule: RecurringRule = { ...r, id: uid("rr") };
  set((s) => ({ recurring: [...s.recurring, rule] }));
  syncAfter("recurring_rules", rule, "upsert");
  get().generateRecurring();
},
updateRecurring: (id, r) => {
  set((s) => ({
    recurring: s.recurring.map((x) => (x.id === id ? { ...x, ...r } : x)),
  }));
  const after = get().recurring.find((x) => x.id === id);
  if (after) syncAfter("recurring_rules", after, "upsert");
},
removeRecurring: (id) => {
  set((s) => ({
    recurring: s.recurring.filter((x) => x.id !== id),
    transactions: s.transactions.filter((t) => t.recurringId !== id),
  }));
  syncAfter("recurring_rules", null, "delete", id);
},
generateRecurring: () => {
  const { recurring, transactions } = get();
  const newOnes = materializeRecurring(recurring, transactions);
  if (newOnes.length) {
    set((s) => ({ transactions: [...s.transactions, ...newOnes] }));
    for (const t of newOnes) syncAfter("transactions", t, "upsert");
  }
},

addGoal: (g) => {
  const goal = { ...g, id: uid("g"), current: 0, contributions: [] };
  set((s) => ({ goals: [...s.goals, goal] }));
  syncAfter("savings_goals", goal, "upsert");
},
updateGoal: (id, g) => {
  set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, ...g } : x)) }));
  const after = get().goals.find((x) => x.id === id);
  if (after) syncAfter("savings_goals", after, "upsert");
},
contributeToGoal: (id, amount, note) => {
  set((s) => ({
    goals: s.goals.map((x) =>
      x.id === id
        ? {
            ...x,
            current: x.current + amount,
            contributions: [
              ...x.contributions,
              { id: uid("gc"), date: new Date().toISOString(), amount, note },
            ],
          }
        : x
    ),
  }));
  const after = get().goals.find((x) => x.id === id);
  if (after) syncAfter("savings_goals", after, "upsert");
},
removeGoal: (id) => {
  set((s) => ({ goals: s.goals.filter((x) => x.id !== id) }));
  syncAfter("savings_goals", null, "delete", id);
},

addBudget: (b) => {
  const budget = { ...b, id: uid("b") };
  set((s) => ({ budgets: [...s.budgets, budget] }));
  syncAfter("budgets", budget, "upsert");
},
updateBudget: (id, b) => {
  set((s) => ({
    budgets: s.budgets.map((x) => (x.id === id ? { ...x, ...b } : x)),
  }));
  const after = get().budgets.find((x) => x.id === id);
  if (after) syncAfter("budgets", after, "upsert");
},
removeBudget: (id) => {
  set((s) => ({ budgets: s.budgets.filter((x) => x.id !== id) }));
  syncAfter("budgets", null, "delete", id);
},

addNote: (n) => {
  const now = new Date().toISOString();
  const note = { ...n, id: uid("n"), createdAt: now, updatedAt: now };
  set((s) => ({ notes: [...s.notes, note] }));
  syncAfter("notes", note, "upsert");
},
updateNote: (id, n) => {
  set((s) => ({
    notes: s.notes.map((x) =>
      x.id === id ? { ...x, ...n, updatedAt: new Date().toISOString() } : x
    ),
  }));
  const after = get().notes.find((x) => x.id === id);
  if (after) syncAfter("notes", after, "upsert");
},
removeNote: (id) => {
  set((s) => ({ notes: s.notes.filter((x) => x.id !== id) }));
  syncAfter("notes", null, "delete", id);
},

addReminder: (r) => {
  const rm = { ...r, id: uid("rm") };
  set((s) => ({ reminders: [...s.reminders, rm] }));
  syncAfter("reminders", rm, "upsert");
},
updateReminder: (id, r) => {
  set((s) => ({
    reminders: s.reminders.map((x) => (x.id === id ? { ...x, ...r } : x)),
  }));
  const after = get().reminders.find((x) => x.id === id);
  if (after) syncAfter("reminders", after, "upsert");
},
removeReminder: (id) => {
  set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) }));
  syncAfter("reminders", null, "delete", id);
},
```

(Settings, importData, exportData, resetAll keep their existing behavior — no syncAfter calls. Settings stay local-only for now; future waves will mirror.)

- [ ] **Step 5: Update `HouseholdProvider` to pull, set, and subscribe**

Replace `/Users/pierrebelonsavon/Documents/budget/lib/household/context.tsx` with:

```tsx
"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "../db";
import { useAuth } from "../auth/context";
import { ensureDefaultHousehold } from "./bootstrap";
import { useStore } from "../store";
import { pullInitial, installOnlineFlusher, flushQueue, rowToApp, tableToSlice } from "../sync/sync-engine";

interface HouseholdState {
  householdId: string | null;
  isNew: boolean;
  loading: boolean;
}

const Ctx = createContext<HouseholdState>({ householdId: null, isNew: false, loading: false });

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<HouseholdState>({ householdId: null, isNew: false, loading: false });

  useEffect(() => { installOnlineFlusher(); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      useStore.getState().setCurrentHousehold(null);
      setState({ householdId: null, isNew: false, loading: false });
      return;
    }
    let cancelled = false;
    let channelRef: ReturnType<ReturnType<typeof getBrowserSupabase>["channel"]> | null = null;
    setState((s) => ({ ...s, loading: true }));
    const sb = getBrowserSupabase();

    (async () => {
      const { householdId, isNew } = await ensureDefaultHousehold(sb, user.id);
      if (cancelled) return;
      await pullInitial(householdId);
      useStore.getState().setCurrentHousehold(householdId);
      flushQueue().catch(() => {});
      setState({ householdId, isNew, loading: false });

      const channel = sb.channel(`hh-${householdId}`);
      const tables = Object.keys(rowToApp) as (keyof typeof rowToApp)[];
      for (const t of tables) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: String(t), filter: `household_id=eq.${householdId}` },
          (payload) => {
            const slice = tableToSlice[t];
            const fromState = (useStore.getState() as unknown as Record<string, unknown[]>)[slice] ?? [];
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              useStore.setState({ [slice]: fromState.filter((r) => (r as { id: string }).id !== old.id) } as never);
              return;
            }
            const next = (rowToApp[t] as (r: unknown) => unknown)(payload.new as never) as { id: string };
            const without = fromState.filter((r) => (r as { id: string }).id !== next.id);
            useStore.setState({ [slice]: [...without, next] } as never);
          }
        );
      }
      channel.subscribe();
      channelRef = channel;
    })();

    return () => {
      cancelled = true;
      if (channelRef) sb.removeChannel(channelRef);
    };
  }, [user, authLoading]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useHousehold() {
  return useContext(Ctx);
}
```

- [ ] **Step 6: Smoke-test multi-device sync**

```bash
npm run dev -- -p 3001
```

Open two browsers (or two profiles), both at `http://localhost:3001`. Sign in to **both** with the same email. After the redirect, in window A add a transaction via the existing `+` FAB. In window B, the transaction should appear within ~2 seconds without refresh.

Now go offline in window A (DevTools → Network → Offline). Add another transaction; it should still appear locally. Go back online. Within a few seconds window A's queue flushes; window B sees the new row.

Kill the dev server when satisfied.

- [ ] **Step 7: Commit**

```bash
git add lib/sync/ lib/household/context.tsx lib/store.ts lib/types.ts
git commit -m "feat(sync): wire Zustand store to Supabase with realtime + offline queue"
```

---

## Task 20: Service worker for fetch resilience

**Files:**
- Create: `public/sw-sync.js`
- Create: `components/Sw/SwRegister.tsx`
- Modify: `app/layout.tsx`

The IndexedDB queue already covers offline writes. The service worker adds a safety net: cache GET responses from Supabase so the app can hydrate from cache on cold start when offline.

- [ ] **Step 1: Write the service worker**

Write `/Users/pierrebelonsavon/Documents/budget/public/sw-sync.js`:

```js
// Minimal SW: cache-first for Supabase GETs so cold-start offline still hydrates the UI.
const CACHE_NAME = "supabase-get-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.hostname.endsWith(".supabase.co")) return;
  if (!url.pathname.startsWith("/rest/v1/")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const networkP = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        })
        .catch(() => null);
      if (cached) {
        networkP.then(() => {});
        return cached;
      }
      const net = await networkP;
      if (net) return net;
      return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
    })()
  );
});
```

- [ ] **Step 2: Write the SW registration client component**

Write `/Users/pierrebelonsavon/Documents/budget/components/Sw/SwRegister.tsx`:

```tsx
"use client";
import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw-sync.js").catch(() => {});
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
```

- [ ] **Step 3: Mount it in layout**

In `/Users/pierrebelonsavon/Documents/budget/app/layout.tsx`, add the import:

```tsx
import SwRegister from "@/components/Sw/SwRegister";
```

Inside the `<HouseholdProvider>`, alongside `<MigrationPrompt />`, add:

```tsx
<SwRegister />
```

- [ ] **Step 4: Smoke-test**

```bash
npm run dev -- -p 3001
```

Open `http://localhost:3001` in a fresh incognito window. Sign in. Add a transaction. Reload the page.

DevTools → Application → Service Workers: should show `sw-sync.js` as "activated and is running".

DevTools → Network → Offline. Reload. Expected: app still loads with your data visible (served from cache).

Disable Offline mode. Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add public/sw-sync.js components/Sw/ app/layout.tsx
git commit -m "feat(sync): service worker stale-while-revalidate for Supabase GETs"
```

---

## Task 21: End-to-end manual verification

**Files:** none (verification only)

This task verifies the exit criteria.

- [ ] **Step 1: Reset to a clean state**

```bash
cd /Users/pierrebelonsavon/Documents/budget
npm run dev -- -p 3001
```

In a private window at `http://localhost:3001`:
- DevTools → Application → Local Storage → clear all
- DevTools → Application → IndexedDB → delete the `budget-offline-queue` DB
- DevTools → Application → Service Workers → Unregister `sw-sync.js`
- Reload the page

- [ ] **Step 2: Unsigned-in baseline**

The app should load to the existing Home, just like before. Add 2 transactions and 1 account using the existing UI. Confirm they persist on reload (still in localStorage). This proves **non-signed-in users keep using localStorage**.

- [ ] **Step 3: Sign in, see migration prompt**

Navigate to `/sign-in`. Send a magic link. Click the link in the email.

After redirect, the **Migration Prompt** should appear, showing your 2 transactions + 1 account. Click "Import everything". Confirmation: "All set".

In DevTools console:
```js
const sb = (await import("/lib/db.ts")).getBrowserSupabase();
console.log(await sb.from("transactions").select("*"));
```
Expected: your 2 transactions, each with `household_id` populated.

- [ ] **Step 4: Multi-device test**

Open a second browser (or a different profile) at `http://localhost:3001`. Sign in with the same email (open the link in this second browser). After the redirect, the app shows the **same** 2 transactions and 1 account. **Migration prompt should NOT appear** here (this is not a new household, and `isNew` is false).

- [ ] **Step 5: Realtime sync test**

In window A, add a new transaction "Lunch · $14". In window B, within 2 seconds, the new transaction appears in the existing UI without a refresh. ✅

In window B, delete one of the transactions. In window A, it disappears within 2 seconds. ✅

- [ ] **Step 6: Offline test**

In window A, DevTools → Network → Offline. Add transaction "Coffee · $4". It appears locally. Confirm in DevTools → Application → IndexedDB → `budget-offline-queue` that there is one pending op.

Turn off Offline mode. Within a few seconds, the queue empties and the row appears in window B. ✅

- [ ] **Step 7: Sign-out test**

In window A, in DevTools console:
```js
await (await import("/lib/db.ts")).getBrowserSupabase().auth.signOut();
location.reload();
```

The app reloads, **does not show signed-in UI**. The existing localStorage cache still holds the latest data (so the home page shows transactions — they're locally cached). This is acceptable: when signed out we revert to localStorage. Stop the dev server.

- [ ] **Step 8: Commit verification marker**

```bash
git commit --allow-empty -m "chore: Wave 1 foundation manually verified end-to-end"
```

---

## Task 22: Cleanup and final commit

**Files:**
- Verify: no leftover console.log or TODO
- Verify: `npm run build` succeeds

- [ ] **Step 1: Run a production build**

```bash
cd /Users/pierrebelonsavon/Documents/budget
npm run build
```

Expected: build succeeds. If you see TS errors, fix them. Common ones:
- Missing `as never` on Supabase `.upsert(rows)` — add it.
- `db.types.ts` missing a table — re-run Task 7 Step 1.

- [ ] **Step 2: Run tests once more**

```bash
npm test
```

Expected: all unit tests pass (detect, import, offline-queue).

- [ ] **Step 3: Check for stray TODOs**

```bash
grep -nR "TODO\|FIXME\|XXX" lib/ app/ components/ supabase/ tests/ 2>/dev/null
```

Expected: no matches in code added by this plan. If any, address them before closing the plan.

- [ ] **Step 4: Final commit**

```bash
git status
git add -p
git commit -m "chore: Wave 1 build green + tests green"
```

---

## Done

Wave 1 is complete when all 22 tasks are checked off. The exit criteria in the header have been verified by Task 21.

**Next:** Wave 2 (Theme System) gets its own implementation plan, written from the Wave 1 codebase.
