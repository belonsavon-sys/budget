# Wave 3 · Home + Time Machine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship the **Time Machine** — a draggable past↔future net-worth timeline with what-if scenarios that redraw the future live — and rebuild the **Home** page around it as the centerpiece.

**Architecture:**
- A **pure projection engine** (`lib/projection.ts`) takes accounts + transactions + recurring rules + active scenarios and returns daily/weekly net-worth points with a 25/75 confidence band from a 1000-path Monte Carlo. Deterministic given fixed seed; testable in isolation.
- A **`<TimeMachine>`** React/SVG component renders the curve with solid past + dashed future + filled confidence band + draggable "Now" scrubber + event markers + dropped scenario chips. Used in two modes: collapsed home-hero (~280px tall) and `/timeline` fullscreen.
- A **`<ScenarioTray>`** with reusable chip templates (+ Raise, + Side income, − Layoff, − Rent change, Baby, Mortgage, Lump expense, Sabbatical). Drag a chip onto the future to open an inspector → save as a `WhatIfScenario`. Saved scenarios live in Supabase + Zustand, replay on every render.
- New Home layout: copilot-style greeting (text-only placeholder — real agent is Wave 4) → Time Machine hero → 2 ambient tiles → existing Recent/Upcoming sections.

**Tech Stack:** SVG (no canvas) for the curve · Framer Motion for the scrubber + chip animations · Pointer Events for drag/drop · TS-only projection engine · Supabase table for scenario persistence (with `household_id` RLS, sync via the engine from Wave 1).

**Spec reference:** `docs/superpowers/specs/2026-05-14-agentic-budget-platform-design.md` §6 (Time Machine) + §7 (Home) + §4 (data model).

**Exit criteria:** From `/`, Pierre can:
1. See his current net worth and a curve through ~3 years past + 5 years projected with a confidence band on the future
2. Drag the "Now" scrubber along the X axis — the value readout updates live
3. Open the scenario tray (bottom drawer mobile / side rail desktop), drag a "+ Raise · Sep" chip onto the future
4. See the projection curve redraw within 250ms with the scenario applied
5. Tap the hero to enter `/timeline` fullscreen mode and toggle 1Y / 5Y / 10Y / 30Y / ALL period buttons
6. Save the scenario; refresh the page; scenario persists and re-renders the same projection

---

## File Structure

### New files
- `lib/projection.ts` — pure projection engine: `project(state, opts): ProjectionSnapshot`
- `lib/projection-types.ts` — `ProjectionPoint`, `ProjectionSnapshot`, `ProjectOpts`, `Horizon`, scenario delta types if not in `lib/types.ts`
- `lib/scenarios.ts` — chip templates (the 8 pre-built scenario blueprints)
- `lib/store/scenarios-slice.ts` — `addScenario`, `updateScenario`, `removeScenario`, `pinScenario`, `setActiveScenarios(ids)` zustand actions; OR these live in `lib/store.ts` directly — pick the smaller diff
- `components/TimeMachine/index.tsx` — main exported component
- `components/TimeMachine/Curve.tsx` — the SVG path renderer
- `components/TimeMachine/Scrubber.tsx` — draggable Now-marker
- `components/TimeMachine/ScenarioChip.tsx` — rendered chip on the future
- `components/TimeMachine/PeriodToggle.tsx` — 1Y/5Y/10Y/30Y/ALL buttons
- `components/TimeMachine/types.ts` — internal component types
- `components/Scenarios/ScenarioTray.tsx` — bottom drawer / side rail with chip templates
- `components/Scenarios/ScenarioInspector.tsx` — modal opened on chip-drop to capture amount/frequency/end-date
- `components/Money/Number.tsx` — animated, locale-aware, tabular-numeral money component (used in TimeMachine + tiles)
- `components/Home/CopilotGreeting.tsx` — narrative greeting (deterministic for now: "You're ${month-net} ahead this month — on track to hit ${5y-projected} by ${5y-date}")
- `components/Home/AmbientTiles.tsx` — the "This month" + "Subs" tiles
- `app/timeline/page.tsx` — fullscreen Time Machine route
- `supabase/migrations/20260514_000006_scenarios.sql` — `what_if_scenarios` table + RLS + index
- `tests/unit/projection/baseline.test.ts` — projection engine baseline test
- `tests/unit/projection/scenarios.test.ts` — scenario delta application test
- `tests/unit/projection/monte-carlo.test.ts` — confidence-band test (deterministic with fixed seed)

### Modified files
- `lib/types.ts` — add `WhatIfScenario`, `ScenarioDelta`, `ProjectionHorizon` types
- `lib/db.types.ts` — re-generate after Task 1 migration applies
- `lib/store.ts` — add `scenarios: WhatIfScenario[]`, `activeScenarioIds: string[]`, plus actions
- `lib/sync/sync-bindings.ts` — `rowToApp.what_if_scenarios` + `appToRow.what_if_scenarios` + `tableToSlice` entry
- `lib/sync/sync-engine.ts` — include `what_if_scenarios` in `pullInitial` & realtime channel binding
- `lib/household/context.tsx` — same realtime list expansion
- `app/page.tsx` — REBUILT Home: greeting → TimeMachine hero → AmbientTiles → existing Recent/Upcoming
- `components/Nav.tsx` — append new `/timeline` route to nav items (icon: `Clock` or `History`)

### Files NOT modified
- Other page routes (Transactions, Calendar, Reports, etc.) stay as-is — TimeMachine isn't embedded in them this wave.
- AI agent / Copilot internals stay deferred to Wave 4. CopilotGreeting is text-only deterministic.

---

## Prerequisites

- [ ] **P1.** On `feat/wave-2-themes` branch with Wave 2 verified. Tests pass, build green.
- [ ] **P2.** Branch off to `feat/wave-3-time-machine`:

```bash
cd /Users/pierrebelonsavon/Documents/budget
git checkout -b feat/wave-3-time-machine
git status  # working tree clean
```

---

## Task 1: WhatIfScenario types + DB migration

**Files:**
- Modify: `lib/types.ts`
- Create: `supabase/migrations/20260514_000006_scenarios.sql`
- Re-generate: `lib/db.types.ts` (via MCP after migration applied)

- [ ] **Step 1: Extend `lib/types.ts`**

Append to the file:

```ts
// === Wave 3 · What-If Scenarios ===

export type ProjectionHorizon = "1y" | "5y" | "10y" | "30y" | "all";

export type ScenarioDeltaKind =
  | "income-add"        // recurring positive cashflow
  | "expense-add"       // recurring negative cashflow
  | "expense-remove"    // cancels an existing recurring rule for the period (matched by categoryId)
  | "rate-change"       // multiplier on a category's spending
  | "lump-sum";         // single positive or negative event

export interface ScenarioDelta {
  id: string;                        // local id for the delta (uid)
  kind: ScenarioDeltaKind;
  amount: number;                    // sign-by-kind: income-add/lump-sum + or -, expense-add positive (counted as expense)
  currency: Currency;
  frequency?: Frequency;             // ignored for lump-sum
  categoryId?: string;               // for rate-change + expense-remove
  rateMultiplier?: number;           // for rate-change (e.g., 1.1 = +10%)
  date?: string;                     // for lump-sum
  note?: string;
}

export interface WhatIfScenario {
  id: string;
  householdId: string;
  name: string;                      // "Raise · Sep '26"
  startDate: string;                 // ISO; deltas start affecting projection here
  endDate?: string;                  // ISO; bounded scenarios end here
  pinned: boolean;                   // shown on home insight stream when supported
  color: string;                     // chip color (var(--accent) style override)
  icon: string;                      // lucide icon name
  deltas: ScenarioDelta[];
  createdAt: string;
  updatedAt: string;
}
```

Add to `AppState`:

```ts
scenarios: WhatIfScenario[];
activeScenarioIds: string[];        // which are currently overlaid on the projection
```

- [ ] **Step 2: Write the SQL migration**

`/Users/pierrebelonsavon/Documents/budget/supabase/migrations/20260514_000006_scenarios.sql`:

```sql
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
```

- [ ] **Step 3: Apply via MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with the SQL above (project_id `cbtihkovrevdsjbxslmi`, name `20260514_000006_scenarios`). Verify no security advisories.

- [ ] **Step 4: Re-generate `lib/db.types.ts`**

Use `mcp__claude_ai_Supabase__generate_typescript_types` and overwrite `lib/db.types.ts`. The new file will include `what_if_scenarios`.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts supabase/migrations/20260514_000006_scenarios.sql lib/db.types.ts
git commit -m "feat(scenarios): WhatIfScenario types + DB migration with RLS"
```

---

## Task 2: Projection engine (TDD, three test files)

**Files:**
- Create: `lib/projection-types.ts`
- Create: `lib/projection.ts`
- Test: `tests/unit/projection/baseline.test.ts`
- Test: `tests/unit/projection/scenarios.test.ts`
- Test: `tests/unit/projection/monte-carlo.test.ts`

The engine is pure: same inputs → same outputs. Tests are strict.

- [ ] **Step 1: Write `lib/projection-types.ts`**

```ts
import type { Account, Transaction, RecurringRule, WhatIfScenario, ProjectionHorizon } from "./types";

export interface ProjectionPoint {
  date: string;          // ISO yyyy-mm-dd
  value: number;         // net worth at end of that day
  bandLo: number;        // 25th percentile
  bandHi: number;        // 75th percentile
  /** First event marker on this day, if any. */
  event?: {
    kind: "income" | "expense" | "scenario";
    label: string;
  };
}

export interface ProjectionSnapshot {
  computedAt: string;
  horizon: ProjectionHorizon;
  nowDate: string;
  baseline: number;       // current net worth
  finalValue: number;     // last point's value
  points: ProjectionPoint[];
}

export interface ProjectOpts {
  horizon: ProjectionHorizon;
  /** ISO date considered "now"; default new Date().toISOString().slice(0,10). */
  now?: string;
  /** Active scenario ids to overlay; default: all pinned + explicit ids in store's activeScenarioIds. */
  activeScenarioIds?: string[];
  /** Monte Carlo path count. Default 0 (deterministic — band collapses to point). */
  mcPaths?: number;
  /** Seed for MC RNG. Default: hash of nowDate + scenarioIds. */
  mcSeed?: number;
}

export interface ProjectionInput {
  accounts: Account[];
  transactions: Transaction[];
  recurring: RecurringRule[];
  scenarios: WhatIfScenario[];
}
```

- [ ] **Step 2: Write the baseline test FIRST (must fail first)**

`/Users/pierrebelonsavon/Documents/budget/tests/unit/projection/baseline.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { project } from "../../../lib/projection";
import type { ProjectionInput } from "../../../lib/projection-types";

const HID = "h-1";

const baseInput = (): ProjectionInput => ({
  accounts: [
    { id: "a-1", name: "Checking", type: "checking", startingBalance: 1000,
      currency: "USD", color: "#000", icon: "Wallet", archived: false },
  ],
  transactions: [
    // Past txn: +500 income
    { id: "p-1", type: "income", amount: 500, currency: "USD",
      description: "paycheck", accountId: "a-1", tagIds: [],
      date: "2026-04-15", status: "received" },
    // Past txn: -100 expense
    { id: "p-2", type: "expense", amount: 100, currency: "USD",
      description: "groceries", accountId: "a-1", tagIds: [],
      date: "2026-05-01", status: "paid" },
  ],
  recurring: [],
  scenarios: [],
});

describe("project — baseline (no recurring, no scenarios)", () => {
  it("returns a snapshot with horizon and now", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    expect(snap.horizon).toBe("1y");
    expect(snap.nowDate).toBe("2026-05-14");
    expect(snap.points.length).toBeGreaterThan(0);
  });

  it("baseline net worth = starting + sum(past txns through now)", () => {
    // 1000 (starting) + 500 (paycheck) - 100 (groceries) = 1400
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    expect(snap.baseline).toBe(1400);
  });

  it("flat future (no recurring) stays at baseline", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    const last = snap.points[snap.points.length - 1];
    expect(last.value).toBe(1400);
  });

  it("ignores transactions dated after now (they're projections, not history)", () => {
    const input = baseInput();
    input.transactions.push({
      id: "f-1", type: "expense", amount: 999, currency: "USD",
      description: "future", accountId: "a-1", tagIds: [],
      date: "2026-06-01", status: "projected",
    });
    const snap = project(input, { horizon: "1y", now: "2026-05-14" });
    expect(snap.baseline).toBe(1400);
  });

  it("includes archived account in baseline if it has transactions", () => {
    const input = baseInput();
    input.accounts.push({
      id: "a-2", name: "Old", type: "savings", startingBalance: 200,
      currency: "USD", color: "#000", icon: "PiggyBank", archived: true,
    });
    const snap = project(input, { horizon: "1y", now: "2026-05-14" });
    expect(snap.baseline).toBe(1600);  // 1000+500-100+200
  });
});
```

- [ ] **Step 3: Run the test, watch it fail**

```bash
npm test -- baseline
```

Expected: module not found.

- [ ] **Step 4: Implement the minimal projection engine to pass baseline tests**

`/Users/pierrebelonsavon/Documents/budget/lib/projection.ts`:

```ts
import type { ProjectionInput, ProjectionOpts, ProjectionPoint, ProjectionSnapshot } from "./projection-types";
import type { ProjectionHorizon, Transaction, RecurringRule, WhatIfScenario, ScenarioDelta, Frequency } from "./types";

const HORIZON_DAYS: Record<ProjectionHorizon, number> = {
  "1y": 365,
  "5y": 365 * 5,
  "10y": 365 * 10,
  "30y": 365 * 30,
  "all": 365 * 30,
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function signedAmount(t: Pick<Transaction, "type" | "amount">): number {
  if (t.type === "income") return t.amount;
  if (t.type === "expense") return -t.amount;
  return 0; // transfers don't change net worth
}

function computeBaseline(input: ProjectionInput, nowIso: string): number {
  const accountsTotal = input.accounts.reduce((s, a) => s + a.startingBalance, 0);
  const txnsTotal = input.transactions
    .filter((t) => t.date.slice(0, 10) <= nowIso && t.status !== "projected")
    .reduce((s, t) => s + signedAmount(t), 0);
  return accountsTotal + txnsTotal;
}

/** Stride days between points. Keeps total points <= ~400 for performant SVG render. */
function strideFor(horizon: ProjectionHorizon): number {
  if (horizon === "1y") return 3;       // ~120 points
  if (horizon === "5y") return 7;       // ~260 points
  if (horizon === "10y") return 14;     // ~260 points
  if (horizon === "30y") return 30;     // ~365 points
  return 30;
}

export function project(input: ProjectionInput, opts: ProjectionOpts): ProjectionSnapshot {
  const nowIso = opts.now ?? isoDate(new Date());
  const days = HORIZON_DAYS[opts.horizon];
  const stride = strideFor(opts.horizon);

  const baseline = computeBaseline(input, nowIso);

  const points: ProjectionPoint[] = [];
  const startDate = new Date(nowIso);

  // Past points (last ~180 days for context). Stride matches future stride.
  const pastDays = Math.min(180, days);
  for (let d = pastDays; d >= 0; d -= stride) {
    const day = addDays(startDate, -d);
    const dayIso = isoDate(day);
    const value = computeBaseline(input, dayIso);
    points.push({ date: dayIso, value, bandLo: value, bandHi: value });
  }

  // Future points: flat baseline (no recurring/scenarios yet — Task 3 fills it in).
  for (let d = stride; d <= days; d += stride) {
    const day = addDays(startDate, d);
    const dayIso = isoDate(day);
    points.push({ date: dayIso, value: baseline, bandLo: baseline, bandHi: baseline });
  }

  return {
    computedAt: new Date().toISOString(),
    horizon: opts.horizon,
    nowDate: nowIso,
    baseline,
    finalValue: points[points.length - 1]?.value ?? baseline,
    points,
  };
}

// Re-export Opts for callers
export type { ProjectionOpts as ProjectOpts };
```

- [ ] **Step 5: Run baseline test, watch it pass**

```bash
npm test -- baseline
```

All 5 tests should pass.

- [ ] **Step 6: Write the scenarios test (must fail)**

`/Users/pierrebelonsavon/Documents/budget/tests/unit/projection/scenarios.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { project } from "../../../lib/projection";
import type { ProjectionInput } from "../../../lib/projection-types";
import type { WhatIfScenario } from "../../../lib/types";

const baseInput = (): ProjectionInput => ({
  accounts: [
    { id: "a-1", name: "Checking", type: "checking", startingBalance: 0,
      currency: "USD", color: "#000", icon: "Wallet", archived: false },
  ],
  transactions: [],
  recurring: [
    { id: "r-1", name: "Salary", type: "income", amount: 5000, currency: "USD",
      accountId: "a-1", tagIds: [], frequency: "monthly", startDate: "2025-01-01",
      autopay: true, active: true, dayOfMonth: 1 },
  ],
  scenarios: [],
});

const raise: WhatIfScenario = {
  id: "s-raise", householdId: "h-1", name: "Raise",
  startDate: "2026-09-01", pinned: true, color: "#c2410c", icon: "ArrowUp",
  deltas: [
    { id: "d-1", kind: "income-add", amount: 1000, currency: "USD", frequency: "monthly" },
  ],
  createdAt: "2026-05-14T00:00:00Z", updatedAt: "2026-05-14T00:00:00Z",
};

describe("project — with scenarios", () => {
  it("baseline recurring increases future value monthly", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    // 12 months out: ~5 paychecks landed (Jun 1, Jul 1, Aug 1, Sep 1, Oct 1, Nov 1, Dec 1, Jan 1, Feb 1, Mar 1, Apr 1, May 1)
    expect(snap.finalValue).toBeGreaterThan(50000);
  });

  it("active scenario adds an income-add delta from its startDate", () => {
    const input = { ...baseInput(), scenarios: [raise] };
    const without = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: [] });
    const withRaise = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: ["s-raise"] });
    expect(withRaise.finalValue).toBeGreaterThan(without.finalValue);
    // From Sep 1 to May 1 of next year = ~8 raise-paychecks of $1000 each
    expect(withRaise.finalValue - without.finalValue).toBeGreaterThanOrEqual(8000);
    expect(withRaise.finalValue - without.finalValue).toBeLessThanOrEqual(9500);
  });

  it("lump-sum delta lands exactly on its date", () => {
    const lump: WhatIfScenario = {
      id: "s-lump", householdId: "h-1", name: "Bonus",
      startDate: "2026-07-15", pinned: false, color: "#c2410c", icon: "Gift",
      deltas: [
        { id: "d-1", kind: "lump-sum", amount: 10000, currency: "USD", date: "2026-07-15" },
      ],
      createdAt: "2026-05-14T00:00:00Z", updatedAt: "2026-05-14T00:00:00Z",
    };
    const input = { ...baseInput(), scenarios: [lump] };
    const snap = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: ["s-lump"] });
    expect(snap.finalValue).toBeGreaterThan(60000);  // baseline ~60k + 10k bonus
  });

  it("inactive scenario doesn't affect projection", () => {
    const input = { ...baseInput(), scenarios: [raise] };
    const withRaise = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: [] });
    const withoutScenarios = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    expect(withRaise.finalValue).toBe(withoutScenarios.finalValue);
  });
});
```

- [ ] **Step 7: Extend `lib/projection.ts` to handle recurring + scenarios**

Replace the `project` body with a version that materializes recurring rules + scenario deltas into a sorted event stream and accumulates day by day. (The simpler implementation from Step 4 doesn't pass these tests.) Refer to `lib/recurring.ts`'s existing `materializeRecurring` helper for the rule-expansion logic — wrap or adapt it for the projection horizon.

Implementation contract (write the full function in import-friendly form):

```ts
import { materializeRecurring } from "./recurring";

interface ProjectedEvent {
  date: string;   // yyyy-mm-dd
  delta: number;  // signed net-worth change
  label?: string;
  kind?: "income" | "expense" | "scenario";
}

function expandRule(r: RecurringRule, fromIso: string, toIso: string): ProjectedEvent[] {
  // Reuse materializeRecurring with a phantom transaction list to get future-only synthetic txns;
  // OR write a dedicated occurrences(rule, fromIso, toIso): string[] helper.
  // Each occurrence becomes a ProjectedEvent with delta = signedAmount({ type: r.type, amount: r.amount }).
  // Stop at endDate if set.
  // Return events.
  // ...write full implementation here, do not use `// ...`...
}

function expandScenario(s: WhatIfScenario, fromIso: string, toIso: string): ProjectedEvent[] {
  // For each delta in s.deltas:
  //   income-add → recurring positive events at frequency from s.startDate to s.endDate (or toIso)
  //   expense-add → recurring negative events
  //   lump-sum → single event at delta.date (or s.startDate)
  //   expense-remove + rate-change → noop in v1 (defer to Wave 4+); document in comment.
  // ...full implementation here, no placeholders...
}
```

Then `project` becomes:
1. Compute baseline at `nowIso` (as before).
2. Build `events: ProjectedEvent[]` from `expandRule()` for every active rule and `expandScenario()` for every active scenario.
3. Sort events by date ascending.
4. Walk from `nowIso` forward stride days at a time, summing events that fall within each stride into a running total, push a `ProjectionPoint`.
5. Past points: walk backward from `nowIso` using `computeBaseline(input, day)` (same as Step 4).

This must NOT touch the past walk's `bandLo`/`bandHi` (they always equal `value` in the deterministic version). The Monte Carlo step in Task 2 Step 9 fills in the band.

- [ ] **Step 8: Run scenarios test, all pass**

```bash
npm test -- scenarios
```

All 4 tests pass.

- [ ] **Step 9: Write the Monte Carlo test (deterministic with seed)**

`/Users/pierrebelonsavon/Documents/budget/tests/unit/projection/monte-carlo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { project } from "../../../lib/projection";
import type { ProjectionInput } from "../../../lib/projection-types";

const baseInput = (): ProjectionInput => ({
  accounts: [
    { id: "a-1", name: "Checking", type: "checking", startingBalance: 0,
      currency: "USD", color: "#000", icon: "Wallet", archived: false },
  ],
  transactions: [
    // Variable history: 6 grocery-like transactions
    { id: "p-1", type: "expense", amount: 80, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2025-12-01", status: "paid" },
    { id: "p-2", type: "expense", amount: 95, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-01-01", status: "paid" },
    { id: "p-3", type: "expense", amount: 110, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-02-01", status: "paid" },
    { id: "p-4", type: "expense", amount: 70, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-03-01", status: "paid" },
    { id: "p-5", type: "expense", amount: 105, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-04-01", status: "paid" },
    { id: "p-6", type: "expense", amount: 88, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-05-01", status: "paid" },
  ],
  recurring: [
    { id: "r-1", name: "Salary", type: "income", amount: 5000, currency: "USD",
      accountId: "a-1", tagIds: [], frequency: "monthly", startDate: "2025-01-01",
      autopay: true, active: true, dayOfMonth: 1 },
  ],
  scenarios: [],
});

describe("project — Monte Carlo confidence band", () => {
  it("with mcPaths=0, band collapses to the deterministic line", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 0 });
    for (const p of snap.points) {
      expect(p.bandLo).toBe(p.value);
      expect(p.bandHi).toBe(p.value);
    }
  });

  it("with mcPaths=500 and a fixed seed, band is wider on future points than on past", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 500, mcSeed: 42 });
    const nowIdx = snap.points.findIndex(p => p.date === snap.nowDate);
    const earliestPast = snap.points[0];
    const latestFuture = snap.points[snap.points.length - 1];
    expect(earliestPast.bandHi - earliestPast.bandLo).toBe(0);  // past is deterministic
    expect(latestFuture.bandHi - latestFuture.bandLo).toBeGreaterThan(0);
    // bandLo <= value <= bandHi
    expect(latestFuture.bandLo).toBeLessThanOrEqual(latestFuture.value);
    expect(latestFuture.bandHi).toBeGreaterThanOrEqual(latestFuture.value);
  });

  it("with the same seed and inputs, two runs produce identical band points", () => {
    const a = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 500, mcSeed: 42 });
    const b = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 500, mcSeed: 42 });
    for (let i = 0; i < a.points.length; i++) {
      expect(a.points[i].bandLo).toBeCloseTo(b.points[i].bandLo, 6);
      expect(a.points[i].bandHi).toBeCloseTo(b.points[i].bandHi, 6);
    }
  });
});
```

- [ ] **Step 10: Extend `lib/projection.ts` with Monte Carlo**

Add a deterministic seeded RNG (xorshift32 or mulberry32 — a 4-line PRNG). For each MC path, perturb each future projected event amount by a multiplicative N(1, σ) factor (Box-Muller from two uniform draws), where σ is the relative std-dev of past discretionary spend (a single number computed from `input.transactions` filtered by `status === "paid" && type === "expense"`). After running `mcPaths` paths, sort the value array at each future point and compute the 25th and 75th percentiles for `bandLo`/`bandHi`.

```ts
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number) {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function historicalSigma(input: ProjectionInput): number {
  const past = input.transactions.filter(t => t.type === "expense" && t.status === "paid");
  if (past.length < 2) return 0;
  const amts = past.map(t => t.amount);
  const mean = amts.reduce((a, b) => a + b, 0) / amts.length;
  if (mean === 0) return 0;
  const variance = amts.reduce((a, b) => a + (b - mean) ** 2, 0) / amts.length;
  return Math.sqrt(variance) / mean;  // relative std-dev (coefficient of variation)
}
```

In `project`, when `opts.mcPaths > 0`:
1. Compute `sigma = historicalSigma(input)`.
2. Build the deterministic event stream as before (this is the spine).
3. For each of the `mcPaths`, create a copy of future events with each `delta *= 1 + sigma * gaussian(rng)` (only for `expense`-kind events — incomes stay fixed), then walk it forward to fill a `pathValues[pathIdx][pointIdx]`.
4. At each future point index, sort `pathValues[*][pointIdx]` ascending and pick the 25th and 75th percentile values.

Past `bandLo`/`bandHi` stay equal to `value` (deterministic, no perturbation).

- [ ] **Step 11: Run all projection tests**

```bash
npm test -- projection
```

All 12 tests pass.

- [ ] **Step 12: Commit**

```bash
git add lib/projection.ts lib/projection-types.ts tests/unit/projection/
git commit -m "feat(projection): pure projection engine with recurring + scenarios + Monte Carlo band"
```

---

## Task 3: Scenario chip templates

**Files:**
- Create: `lib/scenarios.ts`

The catalog of pre-built scenario blueprints the tray offers. Each is a partial `WhatIfScenario` that the inspector fills in (start date, amount, etc.).

- [ ] **Step 1: Write `lib/scenarios.ts`**

```ts
import type { ScenarioDelta, ScenarioDeltaKind, Frequency, Currency } from "./types";

export interface ScenarioBlueprint {
  /** Stable id used in the tray UI. */
  templateId: string;
  /** Display name in the tray (short — 12 chars or fewer). */
  label: string;
  /** Default name when saved as a WhatIfScenario. */
  defaultName: string;
  /** Lucide icon name. */
  icon: string;
  /** Theme-token-friendly color. Default `var(--accent)` via the chip's CSS. */
  color: string;
  /** Default deltas — amount/date are placeholders until inspector edits them. */
  defaultDeltas: ScenarioDelta[];
  /** Whether the inspector should ask the user to confirm an `endDate`. */
  bounded: boolean;
  /** Whether the inspector should ask for a frequency. */
  recurring: boolean;
}

const usd: Currency = "USD";

export const BLUEPRINTS: ScenarioBlueprint[] = [
  {
    templateId: "raise",
    label: "+ Raise",
    defaultName: "Raise",
    icon: "ArrowUp",
    color: "var(--positive)",
    defaultDeltas: [
      { id: "tpl-raise", kind: "income-add", amount: 500, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "side-income",
    label: "+ Side income",
    defaultName: "Side income",
    icon: "Sparkles",
    color: "var(--positive)",
    defaultDeltas: [
      { id: "tpl-side", kind: "income-add", amount: 300, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "layoff",
    label: "− Layoff",
    defaultName: "Layoff",
    icon: "ArrowDown",
    color: "var(--negative)",
    defaultDeltas: [
      { id: "tpl-layoff", kind: "income-add", amount: -5000, currency: usd, frequency: "monthly" },
    ],
    bounded: true,
    recurring: true,
  },
  {
    templateId: "rent-change",
    label: "− Rent change",
    defaultName: "Rent change",
    icon: "Home",
    color: "var(--accent)",
    defaultDeltas: [
      { id: "tpl-rent", kind: "expense-add", amount: 200, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "baby",
    label: "Baby",
    defaultName: "Baby",
    icon: "Baby",
    color: "var(--accent)",
    defaultDeltas: [
      { id: "tpl-baby", kind: "expense-add", amount: 800, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "mortgage",
    label: "Mortgage",
    defaultName: "Mortgage",
    icon: "Home",
    color: "var(--accent)",
    defaultDeltas: [
      { id: "tpl-mortgage", kind: "expense-add", amount: 2500, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "lump",
    label: "Lump expense",
    defaultName: "Lump expense",
    icon: "Receipt",
    color: "var(--negative)",
    defaultDeltas: [
      { id: "tpl-lump", kind: "lump-sum", amount: -2000, currency: usd },
    ],
    bounded: false,
    recurring: false,
  },
  {
    templateId: "sabbatical",
    label: "Sabbatical",
    defaultName: "Sabbatical",
    icon: "Palmtree",
    color: "var(--warning)",
    defaultDeltas: [
      { id: "tpl-sab", kind: "income-add", amount: -5000, currency: usd, frequency: "monthly" },
    ],
    bounded: true,
    recurring: true,
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/scenarios.ts
git commit -m "feat(scenarios): 8 pre-built scenario blueprints for the tray"
```

---

## Task 4: Store + sync for scenarios

**Files:**
- Modify: `lib/store.ts`
- Modify: `lib/sync/sync-bindings.ts`
- Modify: `lib/sync/sync-engine.ts`
- Modify: `lib/household/context.tsx`

- [ ] **Step 1: Add scenario state + actions to `lib/store.ts`**

In the `Store` interface:

```ts
scenarios: WhatIfScenario[];
activeScenarioIds: string[];

addScenario: (s: Omit<WhatIfScenario, "id" | "createdAt" | "updatedAt" | "householdId">) => void;
updateScenario: (id: string, patch: Partial<WhatIfScenario>) => void;
removeScenario: (id: string) => void;
toggleActiveScenario: (id: string) => void;
setActiveScenarios: (ids: string[]) => void;
```

In the initial state:

```ts
scenarios: [],
activeScenarioIds: [],
```

In the actions, mirror the patterns of `addTransaction`/etc. — generate `id` via `uid("s")`, set timestamps, call `syncAfter("what_if_scenarios", scenario, "upsert")`. For `removeScenario`, call `syncAfter("what_if_scenarios", null, "delete", id)`. `toggleActiveScenario` and `setActiveScenarios` only touch local state (they're UI state — which scenarios are overlaid right now — and should NOT sync to Supabase; treat them like settings).

- [ ] **Step 2: Add `what_if_scenarios` to `lib/sync/sync-bindings.ts`**

Add a `rowToApp.what_if_scenarios` converter (`Row → WhatIfScenario`) and an `appToRow.what_if_scenarios` converter (`WhatIfScenario → DB Insert`). Wire them into the `tableToSlice` map with slice key `"scenarios"`.

- [ ] **Step 3: Add to `pullInitial` and the realtime channel in `HouseholdProvider`**

`pullInitial` already iterates `Object.keys(rowToApp)` — once you add `what_if_scenarios` to the bindings, no change needed in `pullInitial`. The realtime subscription in `lib/household/context.tsx` also iterates `rowToApp` — same story. Just verify the subscription wires up cleanly by reading the existing code and confirming the new table key flows through.

- [ ] **Step 4: Smoke-test**

```bash
npm test  # all existing + projection tests must pass
npm run build  # green
```

- [ ] **Step 5: Commit**

```bash
git add lib/store.ts lib/sync/sync-bindings.ts lib/sync/sync-engine.ts lib/household/context.tsx lib/types.ts
git commit -m "feat(scenarios): store actions + sync bindings + realtime"
```

---

## Task 5: Money component + TimeMachine subcomponents

**Files:**
- Create: `components/Money/Number.tsx`
- Create: `components/TimeMachine/types.ts`
- Create: `components/TimeMachine/PeriodToggle.tsx`
- Create: `components/TimeMachine/Curve.tsx`
- Create: `components/TimeMachine/Scrubber.tsx`
- Create: `components/TimeMachine/ScenarioChip.tsx`

- [ ] **Step 1: Write `components/Money/Number.tsx`**

```tsx
"use client";
import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/utils";
import type { Currency } from "@/lib/types";

interface Props {
  value: number;
  currency: Currency;
  className?: string;
  displayFont?: boolean;  // use --font-display
}

export default function MoneyNumber({ value, currency, className = "", displayFont }: Props) {
  const controls = useAnimation();
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current !== value) {
      controls.start({
        opacity: [0.6, 1],
        y: [4, 0],
        transition: { duration: 0.25, ease: "easeOut" },
      });
      previous.current = value;
    }
  }, [value, controls]);

  return (
    <motion.span
      animate={controls}
      className={`tabular-nums ${displayFont ? "font-display" : ""} ${className}`}
      style={{ fontFeatureSettings: '"tnum", "lnum"' }}
    >
      {formatMoney(value, currency)}
    </motion.span>
  );
}
```

- [ ] **Step 2: Write `components/TimeMachine/types.ts`**

```ts
import type { ProjectionPoint, ProjectionSnapshot } from "@/lib/projection-types";
import type { WhatIfScenario, ProjectionHorizon, Currency } from "@/lib/types";

export interface TimeMachineProps {
  snapshot: ProjectionSnapshot;
  currency: Currency;
  scenarios?: WhatIfScenario[];                    // for chip rendering
  horizon: ProjectionHorizon;
  onHorizonChange?: (h: ProjectionHorizon) => void;
  /** Triggered when user drops a chip on the future. */
  onScenarioDrop?: (templateId: string, dateIso: string) => void;
  /** Height in px. ~280 for hero, full viewport for fullscreen. */
  height?: number;
  /** Render expanded UI (period buttons, captions). */
  expanded?: boolean;
}

export interface CurvePoint extends ProjectionPoint {
  x: number;
  y: number;
  bandLoY: number;
  bandHiY: number;
  isPast: boolean;
}
```

- [ ] **Step 3: Write `components/TimeMachine/PeriodToggle.tsx`**

```tsx
"use client";
import type { ProjectionHorizon } from "@/lib/types";
import { motion } from "framer-motion";

const PERIODS: ProjectionHorizon[] = ["1y", "5y", "10y", "30y", "all"];

export default function PeriodToggle({
  value, onChange,
}: { value: ProjectionHorizon; onChange: (h: ProjectionHorizon) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-full" style={{ background: "var(--surface-2)" }}>
      {PERIODS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="relative tap text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
            style={{ minWidth: 28 }}
          >
            {active && (
              <motion.div
                layoutId="period-pill"
                className="absolute inset-0 rounded-full -z-10"
                style={{ background: "var(--accent)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span style={{ color: active ? "var(--bg)" : "var(--ink-muted)" }}>{p === "all" ? "ALL" : p.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Write `components/TimeMachine/Curve.tsx`**

Pure SVG renderer of the past line (solid) + future line (dashed) + confidence-band fill. Takes pre-computed `CurvePoint[]`. The component computes the SVG path strings (`M..L..L..`) and emits four `<path>` elements: the band fill, the past line, the future line, and a clip-path keeping the future stroke under the band edge.

Write the file with full implementation. Example skeleton (fill in completely):

```tsx
import type { CurvePoint } from "./types";

interface Props {
  width: number;
  height: number;
  past: CurvePoint[];
  future: CurvePoint[];
}

function buildPath(points: CurvePoint[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
  return d;
}

function buildBandPath(points: CurvePoint[]) {
  if (points.length === 0) return "";
  let d = `M ${points[0].x} ${points[0].bandLoY}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].bandLoY}`;
  for (let i = points.length - 1; i >= 0; i--) d += ` L ${points[i].x} ${points[i].bandHiY}`;
  d += " Z";
  return d;
}

export default function Curve({ width, height, past, future }: Props) {
  // Connect last past to first future
  const connector = past.length && future.length
    ? [past[past.length - 1], future[0]] : [];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="tm-line" x1="0" x2="1">
          <stop offset="0" stopColor="var(--accent-2)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {future.length > 0 && (
        <path d={buildBandPath(future)} fill="var(--accent)" opacity="0.12" />
      )}
      <path d={buildPath(past)} stroke="url(#tm-line)" strokeWidth="2.5" fill="none" />
      {connector.length > 0 && (
        <line
          x1={connector[0].x} y1={connector[0].y}
          x2={connector[1].x} y2={connector[1].y}
          stroke="url(#tm-line)" strokeWidth="2.5" strokeDasharray="4 4"
        />
      )}
      <path d={buildPath(future)} stroke="url(#tm-line)" strokeWidth="2.5" fill="none" strokeDasharray="4 4" />
    </svg>
  );
}
```

- [ ] **Step 5: Write `components/TimeMachine/Scrubber.tsx`**

A vertical line at the current scrub position (initially `nowDate`) with a draggable handle. Uses framer-motion `useMotionValue` + `useDrag` (or HTML5 pointer events) constrained to the chart's X range. Emits `onChange(dateIso, value)` as the user drags. Hover-state magnifies the dot.

Write full implementation. Use framer-motion's `<motion.g>` and `drag="x"` with `dragConstraints` + `dragElastic={0}`.

- [ ] **Step 6: Write `components/TimeMachine/ScenarioChip.tsx`**

A rendered "+ Raise · Sep" pill positioned on the future at the scenario's start date. Click → opens inspector for editing (Task 7's `ScenarioInspector`). Hover-state: shows the scenario's deltas summary as a tooltip.

- [ ] **Step 7: Commit**

```bash
git add components/Money/ components/TimeMachine/types.ts components/TimeMachine/PeriodToggle.tsx components/TimeMachine/Curve.tsx components/TimeMachine/Scrubber.tsx components/TimeMachine/ScenarioChip.tsx
git commit -m "feat(timemachine): subcomponents — Money, Curve, Scrubber, ScenarioChip, PeriodToggle"
```

---

## Task 6: Assembled `<TimeMachine>` component

**Files:**
- Create: `components/TimeMachine/index.tsx`

Composes the subcomponents into the full component used by Home + `/timeline`. Manages:
- Scale computation (x/y axis math, value→pixel mapping)
- Past/future split based on `snapshot.nowDate`
- Scrubber state
- Period toggle
- Chip rendering for each scenario
- Drop-zone for tray chips (Task 8)

Write the full file. Layout:

```tsx
"use client";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import Curve from "./Curve";
import Scrubber from "./Scrubber";
import ScenarioChip from "./ScenarioChip";
import PeriodToggle from "./PeriodToggle";
import MoneyNumber from "@/components/Money/Number";
import type { TimeMachineProps, CurvePoint } from "./types";

const PADDING = { top: 22, right: 16, bottom: 18, left: 16 };

export default function TimeMachine(props: TimeMachineProps) {
  const { snapshot, currency, horizon, onHorizonChange, scenarios = [], onScenarioDrop, expanded = false } = props;
  const height = props.height ?? 280;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Observe width
  useMemo(() => {
    if (typeof ResizeObserver === "undefined" || !containerRef.current) return;
    // omitted for brevity in plan — write the full ResizeObserver in implementation
  }, []);

  const { past, future, valueDomain } = useMemo(() => {
    // compute scales — full math here in implementation
    // x = (dateIndex / lastIndex) * (width - paddings)
    // y = paddingTop + (valueMax - value) / (valueMax - valueMin) * (height - paddingTop - paddingBottom)
    // ...
  }, [snapshot, width, height]);

  // ... render ...
}
```

Full implementation requirements — write all of these inline, no placeholders:

1. **ResizeObserver** that updates `width` when the container resizes.
2. **Scale**: x maps date-index → pixel; y maps value → pixel with autoscaled value domain. Pad the value domain by 5% on top and bottom.
3. **Past split**: `snapshot.points.filter(p => p.date <= snapshot.nowDate)` → `past` array of `CurvePoint`; same for future.
4. **Render**: header row (label + animated `MoneyNumber` + period toggle if `expanded`), the SVG container with `Curve` + `Scrubber`, scenario chips positioned absolutely over the SVG at the right X.
5. **Drop-zone**: a transparent div over the future region listening for drop events; calls `onScenarioDrop(templateId, dateIso)` with the dropped templateId (read from dataTransfer) and the date at the drop X position.
6. **Empty state**: if `snapshot.baseline === 0 && scenarios.length === 0 && points are flat`, show a small overlay: "Add an account or transaction to see your trajectory."

Commit:

```bash
git add components/TimeMachine/index.tsx
git commit -m "feat(timemachine): assembled component with scales, scrubber, chips, drop-zone"
```

---

## Task 7: Scenario tray + inspector

**Files:**
- Create: `components/Scenarios/ScenarioTray.tsx`
- Create: `components/Scenarios/ScenarioInspector.tsx`
- Modify: `app/page.tsx` (mount the tray on Home)

- [ ] **Step 1: Write `ScenarioTray.tsx`**

A bottom drawer on mobile (peek with a handle, swipes up to expand), side rail on desktop (`md:` breakpoint). Lists the 8 `BLUEPRINTS` from `lib/scenarios.ts` as draggable chips. Each chip:
- Sets `dataTransfer.setData("application/x-scenario-template", blueprint.templateId)` on drag start
- Renders an icon + label
- Hover-state: lifts slightly with framer-motion

Also lists saved `WhatIfScenario`s underneath (with an "Active" toggle per scenario that calls `toggleActiveScenario`).

- [ ] **Step 2: Write `ScenarioInspector.tsx`**

Modal opened when a chip is dropped (or a saved scenario is clicked). Lets the user adjust:
- Name
- Start date (default to drop date)
- End date (only if blueprint is `bounded`)
- Amount
- Frequency (only if blueprint is `recurring`)
- Color
- Save / Cancel buttons. Save calls `addScenario` or `updateScenario`.

Use existing `components/Modal.tsx` and `components/Field.tsx` for consistency.

- [ ] **Step 3: Commit**

```bash
git add components/Scenarios/
git commit -m "feat(scenarios): tray with draggable blueprints + inspector modal"
```

---

## Task 8: New Home page + /timeline route + Nav update

**Files:**
- Modify: `app/page.tsx`
- Create: `app/timeline/page.tsx`
- Create: `components/Home/CopilotGreeting.tsx`
- Create: `components/Home/AmbientTiles.tsx`
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Write `CopilotGreeting.tsx`**

Pure presentational. Reads accounts + transactions + scenarios via `useStore` selectors. Computes:
- Greeting word from time of day ("Good morning"/"afternoon"/"evening")
- Month-net ("You're +$1,240 ahead this month")
- 5y projection final value from `project(input, { horizon: "5y", mcPaths: 0 })`

Renders a 2-line narrative header in `var(--font-display)`. NO LLM calls — that's Wave 4.

- [ ] **Step 2: Write `AmbientTiles.tsx`**

The "This month" tile (mini bar-chart of last 7 daily nets) + "Subs" tile (sum of monthly recurring expenses, with 3 logos + "+N more"). 2-column grid. Token-themed.

- [ ] **Step 3: Rebuild `app/page.tsx`**

Replace the existing Home content. New structure (top → bottom):

```tsx
<div className="space-y-6 pb-12">
  <CopilotGreeting />

  <TimeMachine
    snapshot={projection}
    currency={settings.currency}
    horizon={horizon}
    onHorizonChange={setHorizon}
    scenarios={activeScenarios}
    onScenarioDrop={handleDrop}
    height={280}
  />

  <AmbientTiles />

  {/* Keep existing Recent + Upcoming sections as Home's lower half */}
  <RecentActivity />
  <UpcomingSection />
</div>

<ScenarioTray />
```

`projection` comes from `useMemo(() => project({accounts, transactions, recurring, scenarios}, { horizon, activeScenarioIds, mcPaths: 1000 }), [horizon, accounts, transactions, recurring, scenarios, activeScenarioIds])`. Default horizon: `"5y"`.

`handleDrop(templateId, dateIso)` opens `<ScenarioInspector>` pre-filled with the blueprint + drop date.

- [ ] **Step 4: Write `app/timeline/page.tsx`**

Fullscreen version. Same `<TimeMachine>` but `height={typeof window !== 'undefined' ? window.innerHeight - 200 : 600}` and `expanded={true}`. Header has back-button + multi-scenario legend.

- [ ] **Step 5: Add `/timeline` to Nav**

In `components/Nav.tsx`, add `{ href: "/timeline", label: "Timeline", icon: Clock }` to the `items` array. Place it after Home, before Activity. Update the lucide import.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/timeline/ components/Home/ components/Nav.tsx
git commit -m "feat(home): rebuild Home around Time Machine hero + greeting + tiles + /timeline route"
```

---

## Task 9: Smoke test + visual verification

**Files:** none (verification only)

- [ ] **Step 1: Build**

```bash
npm run build
```

Expect zero new errors. ~19 routes (added `/timeline`).

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expect: detect (4) + import (3) + offline-queue (4) + projection baseline (5) + scenarios (4) + monte-carlo (3) = **23 tests** passing.

- [ ] **Step 3: Dev server visual walk**

```bash
npm run dev -- -p 3001
```

Open `http://localhost:3001/`. Confirm:
- Home shows greeting line, then Time Machine hero (~280px tall), then ambient tiles
- The curve renders with a confidence band on the future
- The scrubber drags along the X axis (currently rendered at `nowDate`)
- The scenario tray (bottom drawer / side rail) shows 8 blueprint chips
- Dragging a "+ Raise" chip onto the future opens the inspector
- Saving the scenario → curve redraws within ~250ms with a higher trajectory
- Refreshing the page → scenario persists (signed-in) and re-renders the same projection

Visit `/timeline`. Confirm:
- Fullscreen Time Machine
- Period toggle 1Y/5Y/10Y/30Y/ALL switches the curve range
- Multiple scenarios overlay as separate chips
- Back button returns to `/`

Walk through 2 themes (Architectural Light, Deep Space) — confirm tokens propagate correctly to the timeline (band color uses `var(--accent)`, line gradient uses `var(--accent-2) → var(--accent)`).

Kill dev server.

- [ ] **Step 4: Commit verification marker**

```bash
git commit --allow-empty -m "chore: Wave 3 time machine verified — projection + scenarios + new home shipped"
```

---

## Done

Wave 3 is complete when all 9 tasks check out. Exit criteria from header (1-6) verified.

**Next:** Wave 4 (Agent Core — AI SDK + tool palette + ⌘K + activity log + memory) gets its own implementation plan.
