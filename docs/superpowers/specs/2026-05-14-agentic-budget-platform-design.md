# Agentic Budget Platform — Design Spec

**Date:** 2026-05-14
**Status:** Approved, pending user spec review
**Owner:** Pierre (`belonsavon@gmail.com`)

---

## 1 · Vision

Turn the existing single-device localStorage budget PWA into a **multi-device, agentic, cinematic personal-finance platform**. Three pillars define the soul:

1. **Time Machine** — past↔future net-worth as one continuous draggable timeline. Drop "what-if" scenario cards (raise, layoff, mortgage, baby) anywhere on the future; the curve redraws live with confidence bands. Money as time.
2. **Agentic Copilot** — an always-on AI that narrates patterns, drafts plans, answers ⌘K questions, and *takes actions* (categorize, bundle subscriptions, set budgets, create goals) under explicit safety tiers with one-click Undo.
3. **Cinematic Editorial** — refined warm-paper aesthetic across 5 curated themes. No AI-slop radial gradients. Depth from real glass cards with hairline borders + carefully placed accents.

**Excluded from the soul:** no gamification (no XP, streaks, quests). Sophisticated, not childish.

**Net cost on personal usage: $0.** Supabase free tier + WebLLM (in-browser) + optional free hosted-LLM keys.

---

## 2 · Success Criteria

- The Home page is something Pierre wants to open daily, not a tool he tolerates.
- The agent can complete the following tasks unattended (with safety-tier consent where required):
  - Auto-categorize 3 months of historical transactions
  - Detect overlapping subscriptions and propose a bundle
  - Build a monthly budget from 6 months of spending history
  - Project net worth out 5 years given current trajectory + any user-added what-if
  - Narrate the month's spending in 2 paragraphs
- All 11 existing routes work and feel like the same app (consistent theme + Copilot dock).
- Multi-device: a transaction added on phone shows on laptop within 2s (Supabase realtime).
- Works fully **offline** for read-and-write of own data; agent degrades gracefully (WebLLM stays available offline).
- 5 themes ship; switching is instant with a 200ms cross-fade.
- Zero subscription cost for the user.

---

## 3 · Architecture

### 3.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.6 App Router + React 19.2 + Turbopack | Already in place; Cache Components and Server Actions fit |
| State (client) | Zustand (already in place) | Familiar; persists to localStorage for offline cache |
| State (server-of-truth) | **Supabase Postgres** (free tier: 500 MB, 50K MAU) | Realtime, RLS for households, generous free tier |
| Auth | **Supabase Auth** (email magic link · Apple · Google · WebAuthn passkey) | Built-in, free, multi-provider |
| AI runtime | **Vercel AI SDK v6** through **Vercel AI Gateway** | Unified provider routing, observability, no lock-in |
| AI · default provider | **WebLLM** (Llama 3.2 1B or Qwen 2.5 1.5B in-browser via WebGPU) | Free, private, offline-capable, ~1.3 GB one-time download |
| AI · escalation | **Groq free tier** (Llama 3.3 70B) or **HF Inference** — user paste-in key, routed via Gateway | Free heavier reasoning when needed |
| Storage (blobs) | Supabase Storage (free tier 1 GB) | Receipt images, exported PDFs |
| Charts | Recharts (already in place) + custom SVG for Time Machine | Recharts for tables/sankey, custom for hero |
| Animation | Framer Motion (already in place) | Money-river transitions, layout animations |
| Deploy | Vercel · Fluid Compute for AI handlers · static otherwise | Default; aligns with AI Gateway |
| PWA | service worker (Workbox), manifest already present | Offline-first cache, install prompt |

### 3.2 Data flow

```
Browser (PWA)
 ├── Zustand store (UI/optimistic state) ──┐
 ├── localStorage (offline write-through)  │
 ├── WebLLM (default agent)                │
 └── Supabase JS client ──── realtime ─────┼─► Supabase Postgres (source of truth)
                                           │       └── RLS by household_id
                                           │
 Vercel Edge/Fluid AI route ── AI Gateway ─┴─► Groq · HF · OpenAI · Anthropic (user keys)
```

- Optimistic writes hit Zustand first → flush to Supabase (queued in service worker if offline) → realtime broadcast to other devices.
- Tool calls from the agent run through a single `executeTool(name, args)` dispatcher with safety-tier gates.

### 3.3 Hosting & cost

- Vercel free Hobby plan handles dev. Production deployable on Hobby or Pro.
- Supabase free tier: 500 MB DB, 50K MAU, 1 GB storage, realtime included.
- LLM: zero cost via WebLLM. If user adds a Groq/HF key it's their key, their free tier.

---

## 4 · Data Model

All existing types in `lib/types.ts` are kept. Every table gains `householdId: string`, `createdAt: ISO`, `updatedAt: ISO`, `deletedAt?: ISO` (soft delete). New types:

```ts
// Multi-tenant
export interface Household {
  id: string;
  name: string;
  ownerId: string;
  members: { userId: string; role: "owner" | "editor" | "viewer"; joinedAt: string }[];
  inviteCode: string;
  createdAt: string;
}

// Future-state simulation
export interface WhatIfScenario {
  id: string;
  householdId: string;
  name: string;          // "Raise · Sep '26"
  startDate: string;     // when the delta begins
  endDate?: string;
  pinned: boolean;
  color: string;
  deltas: ScenarioDelta[];
}
export interface ScenarioDelta {
  kind: "income-add" | "expense-add" | "expense-remove" | "rate-change" | "lump-sum";
  amount: number;
  currency: Currency;
  frequency?: Frequency;
  categoryId?: string;
  note?: string;
}

// Agent activity (audit + undo)
export interface AgentAction {
  id: string;
  householdId: string;
  ts: string;
  actor: "user" | "agent";
  tier: "auto" | "confirm" | "explicit";
  tool: string;            // "categorizeTransactions"
  args: unknown;           // JSON of input
  result: unknown;         // JSON of effect (records changed, ids)
  undoneAt?: string;
  parentActionId?: string; // for chained tool calls
  rationale?: string;      // model-provided explanation
}

// Agent memory (preferences, facts, rules)
export interface AgentMemory {
  id: string;
  householdId: string;
  kind: "preference" | "fact" | "rule";
  text: string;
  source: "user-taught" | "agent-inferred";
  createdAt: string;
}

// Smart folders — replace today's static Folders
export interface SmartFolder {
  id: string;
  householdId: string;
  name: string;
  icon: string;
  color: string;
  query: SmartFolderQuery; // structured search predicates
  autoApply: boolean;      // re-run on new txns
}
export interface SmartFolderQuery {
  any?: SmartFolderQuery[];
  all?: SmartFolderQuery[];
  field?: "category" | "tag" | "amount" | "merchant" | "account" | "date" | "note";
  op?: "eq" | "neq" | "gt" | "lt" | "between" | "contains" | "regex";
  value?: unknown;
}

// Auto-categorize rules
export interface CategoryRule {
  id: string;
  householdId: string;
  match: { field: "description" | "merchant" | "amount"; op: "contains" | "regex" | "eq"; value: unknown };
  categoryId: string;
  priority: number;
  createdAt: string;
}

// Budget evolution
export interface BudgetEnvelope extends Budget {
  forecastSpend: number;       // projected by end-of-period
  rolloverHistory: { period: string; carriedIn: number; carriedOut: number }[];
}

// Projection cache
export interface ProjectionSnapshot {
  id: string;
  householdId: string;
  computedAt: string;
  horizon: "1y" | "5y" | "10y" | "30y";
  scenarioIds: string[];       // empty = baseline
  points: { date: string; value: number; bandLo: number; bandHi: number }[];
}

// Receipts (Supabase Storage links)
export interface Receipt {
  id: string;
  householdId: string;
  txnId: string;
  blobUrl: string;
  parsedAt?: string;
  parsed?: { merchant?: string; total?: number; items?: { name: string; price: number }[] };
}
```

The existing `Folder` type is migrated to `SmartFolder` on first run (static folders → query of `tag = <folder-id>`).

### 4.1 Postgres schema highlights

- All tables have an FK to `households(id)` with `ON DELETE CASCADE`.
- RLS policy: `auth.uid() in (select user_id from household_members where household_id = row.household_id)`.
- Indexes on `(household_id, date DESC)` for transactions and on `(household_id, ts DESC)` for `agent_actions`.

---

## 5 · AI Agent

### 5.1 Provider stack

- **Default:** WebLLM (`@mlc-ai/web-llm`). Runs in a dedicated Web Worker; MLC's runtime caches model weights to IndexedDB on first load. User sees a one-time "preparing your offline copilot" splash with download progress; the AI features remain hidden until the splash completes (the rest of the app works fine). Falls back to a tiny model (Qwen 0.5B in WASM) if WebGPU is unavailable.
- **Escalation:** Vercel AI Gateway with a `model: "groq/llama-3.3-70b-versatile"` (or HF `Qwen/Qwen2.5-72B-Instruct`). User adds key in `/settings/ai`. Gateway holds the key; client never sees it after entry (encrypted at rest in Supabase).
- **Routing rule:** If the prompt is small + no tools requiring multi-step planning + offline → WebLLM. Otherwise → escalation if key present, else WebLLM with a "this would be sharper with Groq" hint.

### 5.2 Tool palette

Every Zustand mutation has a paired Zod-typed tool. Naming convention: `{verb}{Object}`. Each tool ships with: `description`, `parameters: z.object(...)`, `tier: "auto" | "confirm" | "explicit"`, `execute(args) => result`, `dryRun(args) => preview`.

**Auto (silent + 8s Undo card):**
- `addTransaction`, `splitTransaction`, `tagTransaction`, `categorizeTransactions(ids)`, `addNote`, `addReminder`, `linkRecurring`, `pinScenario`, `createSmartFolder`, `applyCategoryRule`

**Confirm (one-tap approve):**
- `updateBudget`, `createBudgetFromHistory`, `bundleSubscriptions`, `createGoalFromPlan`, `contributeToGoal`, `applyWhatIf`, `mergeAccounts`, `reconcileAccount`, `archiveTransactions`, `dismissDuplicates`, `inviteToHousehold`

**Explicit (always needs a button click in UI, agent can only *propose*):**
- `deleteAccount`, `deleteTransaction`, `clearTransactions`, `removeHouseholdMember`, `resetAll`, `removeApiKey`

### 5.3 Activity log & undo

- Every tool call writes to `agent_actions`.
- The **Activity sidebar** (slide-in from right; ⌘. to toggle) shows a reverse-chrono feed grouped by minute. Each row: tool name · short rationale · effect summary · `Undo` button.
- Undo restores affected records to pre-action state. Cascading undo (parent action) also undoes children.
- A `kill switch` toggle in `/settings/ai` disables auto-tier instantly (still allows agent to *propose*).

### 5.4 Agent memory

- `AgentMemory` is loaded into every prompt's system context.
- Two ways memories form: user types in `/settings/ai > Memory` (kind: `user-taught`), or agent infers and asks to confirm ("I notice you usually call rideshare 'transport not travel' — remember this?").
- Categories: `preference` (style), `fact` (biweekly Friday paycheck), `rule` (never auto-categorize > $500).

### 5.5 ⌘K everywhere

- Global keyboard shortcut. Opens a glass overlay with: an input, recent threads, slash-command suggestions (`/summarize`, `/forecast`, `/find`, `/add`).
- Voice mode: hold Space to dictate using Web Speech API; transcript streams into the input.
- Returns are streaming markdown with embedded chart components (small Sankey, single-line forecasts) rendered via a Markdown-with-components renderer.

---

## 6 · Time Machine

### 6.1 Component

A single `<TimeMachine>` component used in 3 contexts:
- **Home hero** (collapsed, ~280px tall, single-pane)
- **`/timeline`** route (fullscreen, multi-scenario overlay, scrub, share)
- **Account detail mini** (per-account version)

### 6.2 Visual spec

- X axis: time, configurable range (1Y · 5Y · 10Y · 30Y · ALL)
- Y axis: net worth (linear; log toggle for long horizons)
- **Past line**: solid, gradient stroke (accent → accent-2)
- **Future line**: dashed, same gradient
- **Confidence band**: filled region around future line at 25/75 percentile from Monte Carlo
- **"Now" scrubber**: vertical hairline, draggable horizontally — value readout follows
- **Event markers**: small dots on the line for major events (paycheck, lump expense, what-if start)
- **What-if drop-zones**: visible only in edit mode; chip displayed at the position with name + delta
- **Interactions**: drag to scrub · pinch (or scroll-zoom) to zoom · tap an event to expand · drag a scenario chip in from a tray

### 6.3 Projection engine

Pure-TS, runs client-side. Inputs: current balances, recurring rules, active scenarios. Algorithm:
1. Materialize all recurring rules across the horizon → expected cashflow events.
2. Apply scenario deltas (additive or rule-modifying).
3. Roll forward balance day-by-day (or week-by-week for long horizons).
4. Monte Carlo dust: vary discretionary spend by ±σ (computed from last 6 mo std deviation) over N=1000 paths; compute 25/75 percentiles for the band.
5. Cache result in `ProjectionSnapshot` keyed on `(horizon, scenarioIds, sourceHash)`.

The engine is a function: `project(state: AppState, opts: ProjectOpts): ProjectionSnapshot`.

### 6.4 What-if UX

- A scenario tray (bottom drawer in fullscreen, side rail on desktop) holds reusable chips: `+ Raise`, `+ Side income`, `- Layoff`, `- Rent change`, `Baby`, `Mortgage`, `Lump expense`, `Sabbatical`.
- Drag chip onto the timeline → opens a small inspector ("amount? frequency? start? end?")
- Multiple scenarios stack; each gets a color; toggle on/off in the legend.
- "Compare" mode shows baseline vs. selected scenarios as overlaid lines.
- Save scenario to `WhatIfScenario`, pinned ones surface on Home insight stream.

---

## 7 · Home Screen

Flow, top to bottom:

1. **Top bar** — date · Copilot status pill · ⌘K hint
2. **Copilot greeting** — `Good {greeting}, {firstName}` · narrative headline composed by agent on each session ("You're $1,240 ahead this month — on track to hit $142k by Sep '28")
3. **Timeline hero** — collapsed `<TimeMachine>`, ~280px, with 1Y/5Y/ALL toggle, current value, projection summary, one floating what-if chip if any are pinned; tap to expand fullscreen
4. **Ambient tiles** — 2-up: "This month" (mini bar chart of daily net), "Subscriptions" (logos + monthly total). Long-press to reorder. Tile registry is extensible (more tiles later: Goals, Budget, Upcoming).
5. **Copilot insight stream** — up to 5 cards, each: rationale icon (pattern/projection/quick-action) + 1-line insight + action buttons (e.g., `Do it` `Why?` `Snooze`). Cards are agent-generated and dismissible. Tier-aware buttons enforce safety.
6. **⌘K ambient bar** — pinned to bottom of viewport on desktop, FAB on mobile, with voice mic.

Empty state (no transactions yet): the timeline becomes a flat baseline, the Copilot prompts to add the first account/transaction or import from CSV.

---

## 8 · Theme System

### 8.1 Five themes

| ID | Name | Family | Background | Ink | Accent | Notes |
|---|---|---|---|---|---|---|
| `architectural` | Architectural Light (default) | light | `#f6f3ee` cream paper | `#0d1421` navy | `#c2410c` burnt orange | Cormorant Garamond serif money |
| `newsroom` | Newsroom | light | `#fff1e5` FT pink | `#0d1421` navy | `#0a4a73` deep blue + italic "editor's note" voice | Playfair Display serif |
| `ledger` | Old-Money Ledger | light | `#e8dcc4` parchment + vignette + grain | `#1f1810` walnut | `#b8860b` brass | Playfair italic; SVG turbulence grain |
| `terminal` | Topographic Terminal | dark | `#050608` near-black + contour SVG | `#d4f0e0` mint | `#34d399` phosphor green | IBM Plex Mono throughout |
| `deep-space` | Deep Space | dark | `#020310` void + faint diagonal Milky Way dust | `#e6e8f5` ice white | `#a8a0e8` lavender | Cormorant serif; scattered tiny stars |

### 8.2 Token contract

Each theme defines the following CSS custom properties at `:root[data-theme="<id>"]`:

```
--bg, --surface, --surface-2,
--ink, --ink-muted, --ink-faint,
--accent, --accent-2, --positive, --negative, --warning,
--line, --line-strong,
--shadow-card, --shadow-card-strong,
--font-display, --font-body, --font-mono, --font-numerals,
--texture-url, --grain-opacity,
--radius-card, --radius-pill,
--blur-glass,
--motion-fast, --motion-medium
```

Charts and the Time Machine read these vars exclusively — no hardcoded colors.

### 8.3 Theme provider

- `ThemeProvider` reads `settings.themeId` from Zustand, sets `data-theme` on `<html>`.
- 200ms `view-transition`-driven cross-fade between themes; falls back to CSS opacity.
- `themeMode: "auto"` chooses Architectural by day and Deep Space by night (uses `prefers-color-scheme` + time-of-day heuristic, configurable).
- `/settings/theme` shows an album-cover picker: 5 live mini-mockups, click to apply.
- Fonts loaded via `next/font` with `display: "swap"` and theme-specific subsetting; only the active theme's display font is loaded eagerly.

---

## 9 · Page-by-Page Upgrades

| Route | Existing behavior | Upgrade |
|---|---|---|
| `/` Home | Greeting + cards + recent + upcoming + goals | Rebuilt per §7 — Copilot greeting + Time Machine hero + ambient tiles + insight stream + ⌘K |
| `/transactions` | List + filters | Bulk-select toolbar with AI batch actions ("categorize 24 selected", "split last", "tag as travel"); inline edit; receipt thumbnails; Sankey of category flow at top |
| `/calendar` | Month grid | Heatmap (per-day net) + drag-and-drop what-if events + bills/payday overlay + weekly AI summaries |
| `/reports` | Charts | Sankey of money flow (income → categories → savings) + AI commentary block ("Coffee +38% vs last month") + PDF export |
| `/folders` → `/smart-folders` | Static folders | **Smart Folders**: queries with auto-apply rules, agent-managed; migration from existing folders |
| `/accounts` | Account list | Per-account mini Time Machine; reconciliation wizard; transfers animated as money-river |
| `/goals` | Goal cards | Each goal gains a forecast curve & ETA based on contribution velocity; "raise the bar" suggestions; visual progress is now a small Time Machine |
| `/insights` | Static AI Insight placeholder | Becomes **the Copilot conversation page** — chat history, saved threads, voice mode, slash commands, embedded chart responses |
| `/notes` | Plain notes | Rich Markdown notes with embedded charts and `@txn:id` mentions; agent can write monthly recap notes |
| `/search` | Text search | Universal: txns + notes + accounts + goals + agent actions, semantic via embeddings (computed by WebLLM or escalated) |
| `/settings` | Settings | New sections: Themes (album picker), AI (provider keys + memory + kill switch), Household (members + invites), Data (export/import/PDF report), PIN/biometric |
| **NEW `/timeline`** | — | Fullscreen Time Machine with multi-scenario overlay |
| **NEW `/activity`** | — | Full AI activity log with bulk-undo, filters, replay |

Removed: nothing. PIN gate stays. Existing recurring engine is kept and called by agent tools.

---

## 10 · Build Waves

Each wave ends shippable; verified in browser before moving on. **The implementation plan produced after this spec covers Wave 1 only.** Each subsequent wave gets its own plan once the prior wave ships and we learn from it.

### Wave 1 · Foundation
- Create Supabase project (manually first; later via MCP if needed)
- Schema: `households`, `household_members`, plus migrations for all existing tables to add `household_id` + timestamps + soft delete
- RLS policies
- `lib/db.ts` — typed Supabase client + generated TS types
- Auth UI (`/sign-in`) — Supabase magic link + Apple + Google
- Migration shim — detects existing `localStorage` data on first sign-in, prompts to import
- Realtime sync hook (`useRealtime<T>(table)`)
- Service worker queue for offline writes
- All existing pages keep working

**Exit criteria:** App still functions; can sign in on two devices and see the same data within 2s.

### Wave 2 · Theme System
- Token CSS files per theme (5 files in `app/themes/`)
- `ThemeProvider` + `next/font` per-theme display font
- `/settings/theme` picker
- Refit `globals.css` to use tokens
- Refit existing pages to use tokens (replace hardcoded colors, gradient classes)
- Retire `Aurora` (move to opt-in legacy theme or remove)

**Exit criteria:** Switching themes visibly changes every page in under 250ms; all 5 themes pass an "eyeball test" at home + transactions + reports.

### Wave 3 · Home + Time Machine
- `<TimeMachine>` component (SVG-based, responsive)
- Projection engine in `lib/projection.ts` with Monte Carlo
- `WhatIfScenario` table + CRUD
- Scenario tray + drag-and-drop chip system
- Rebuilt Home (§7)
- `/timeline` fullscreen route

**Exit criteria:** Pierre can scrub past↔future on Home, drop a "+raise · Sep" chip on the future, and see the curve redraw with a confidence band.

### Wave 4 · Agent Core
- AI SDK v6 setup + Vercel AI Gateway route (`app/api/agent/route.ts`)
- WebLLM client provider with model preload Service Worker
- Tool registry (`lib/agent/tools/*.ts`) with Zod schemas
- Safety tier dispatcher (`lib/agent/dispatch.ts`)
- `agent_actions` writes + Undo
- Activity sidebar + `/activity` route
- ⌘K command palette (global)
- Memory CRUD in `/settings/ai`
- Voice mode (Web Speech API)

**Exit criteria:** Pierre can say "categorize my last 30 transactions" via ⌘K, the agent does it (auto tier), the Activity sidebar shows the action, Undo works.

### Wave 5 · Page Upgrades
- Smart Folders (with migration)
- Transactions — bulk-select + AI actions
- Calendar — heatmap + what-if drag
- Reports — Sankey + AI commentary
- Accounts — mini timelines + reconciliation
- Goals — forecast curves
- Notes — Markdown + embeds + `@txn` mentions
- Search — semantic + universal scope
- Settings — household management

**Exit criteria:** Every existing route looks and feels upgraded; agent has touchpoints on each.

### Wave 6 · Polish & PWA
- Framer-driven money-river transitions (accounts → accounts)
- Money sound design (optional, opt-in)
- PWA install prompt + offline-first refinement
- Shareable insight cards (rendered to PNG via OG image generator)
- Performance pass (Lighthouse 95+)
- Accessibility pass (axe-clean)

**Exit criteria:** Lighthouse green across the board; installable PWA; first-run user can go zero → first transaction in under 60s.

---

## 11 · Migration Plan

1. **First sign-in** detects existing `localStorage` data: if present, prompt "Import N transactions, M accounts, K goals from this device?"
2. If accepted, batch-insert into Supabase under a freshly created household; map ids 1:1 where possible to preserve recurring/goal references.
3. **localStorage stays as offline cache.** Service worker reconciles writes on reconnect.
4. Original localStorage payload is also archived to `<household>/exports/migration-<timestamp>.json` for 30 days as backup.
5. A `/settings/data` page lets the user re-export (JSON or PDF), re-import (merge or replace), or reset (with two confirmations).

---

## 12 · Out of Scope (for v1)

- Real bank imports (Plaid / Teller / Salt Edge) — defer; the agent + CSV import is enough
- Multi-currency live conversion — accept multi-currency input but no auto FX
- Native mobile (Swift/Kotlin) — it's a PWA; installable, but not native
- Tax export / 1099 generation
- Crypto / brokerage integrations
- Bill pay / outbound payments

---

## 13 · Risks & Open Questions

| Risk | Mitigation |
|---|---|
| WebLLM model download is large (~1.3 GB) | Defer until user opts into AI features; show progress; cache aggressively in IndexedDB |
| WebGPU absent on older browsers | Fall back to Qwen 0.5B in WASM; or "agent requires Chrome/Edge/Safari 17+" notice |
| Tool-calling unreliable in tiny models | Use structured-output mode (JSON schema enforcement); for complex multi-step, escalate to Groq |
| Supabase free-tier 500 MB cap | Schema is small; transactions ~1 KB each → ~500K txn cap. Plenty for a personal user. Soft-delete with periodic purge cron. |
| Multi-device write conflicts | Last-write-wins on `updatedAt`; agent actions are append-only; conflict resolution via realtime sync |
| Theme system performance with `view-transition` | Cross-fade is opt-out; fallback is instant swap |
| Privacy of agent prompts when escalating | User key stays in Vercel AI Gateway server-side; never transmitted to client; gateway provides ZDR mode |

---

## 14 · File Layout (planned)

```
app/
  (auth)/sign-in/page.tsx
  api/agent/route.ts            # AI SDK route
  themes/architectural.css
  themes/newsroom.css
  themes/ledger.css
  themes/terminal.css
  themes/deep-space.css
  timeline/page.tsx             # NEW
  activity/page.tsx             # NEW
  ...existing pages, refactored
components/
  TimeMachine/index.tsx
  TimeMachine/Scenario.tsx
  TimeMachine/Tray.tsx
  Copilot/CmdK.tsx
  Copilot/InsightStream.tsx
  Copilot/ActivitySidebar.tsx
  Theme/ThemeProvider.tsx
  Theme/Picker.tsx
  Money/Number.tsx              # animated, tokenized, locale-aware
  ...
lib/
  db.ts                         # Supabase client
  db.types.ts                   # generated
  agent/
    client.ts                   # AI SDK setup
    tools/index.ts
    tools/transactions.ts
    tools/budgets.ts
    tools/goals.ts
    tools/recurring.ts
    tools/whatif.ts
    dispatch.ts                 # safety tiers
    memory.ts
    webllm.ts
  projection.ts                 # Monte Carlo engine
  realtime.ts                   # useRealtime hook
  themes.ts                     # theme metadata
  ...existing files
```

---

## 15 · Glossary

- **Time Machine** — the past↔future net-worth timeline component.
- **What-if scenario** — a named bundle of future deltas (income/expense/rate-change) overlaid on the projection.
- **Copilot** — the agent: a persistent AI presence accessible via ⌘K, insight stream, and tool calls.
- **Safety tier** — one of `auto` (silent + Undo), `confirm` (one-tap), `explicit` (user-clicked button only).
- **Activity log** — chronological record of every agent action; Undo lives here.
- **Smart Folder** — a saved query with optional auto-apply rules; replaces today's static Folders.
- **Household** — multi-tenant container; one user, today; partner/family later.
