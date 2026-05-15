# Wave 5 · Page Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Upgrade the existing pages (Transactions, Reports, Calendar, Goals, Accounts, Notes, Search, Settings) so they all feel like part of the new agentic platform. Bulk-AI actions on Transactions; Sankey on Reports; daily-net heatmap on Calendar; per-goal/account forecast curves; Markdown + `@txn` mentions in Notes; universal text search; household members UI in Settings.

**Architecture:** Each page is upgraded in place. They reuse Wave 3's `<TimeMachine>` and Wave 4's `executeTool` dispatcher where relevant. No new database tables this wave. Sankey + Markdown ship as small dependencies.

**Spec reference:** `docs/superpowers/specs/2026-05-14-agentic-budget-platform-design.md` §9 (Page-by-Page Upgrades) + §10 Wave 5.

**Scope deferred to later waves** (intentionally, to keep this wave tractable):
- **Smart Folders** — replacing static Folders with a query language; needs its own design pass.
- **Semantic Search** — requires embeddings + a vector store; defer until embeddings are wired in the agent core.
- **Receipt OCR**, **PDF report export**, **money-river account transfer animation** — Wave 6 polish.
- **Account reconciliation wizard** — own surgery; defer.

**Exit criteria:** From the dev server, every upgraded page passes an eyeball test in two themes (Architectural Light + Deep Space):
1. `/transactions` — multi-select toolbar appears when ≥1 transaction selected; "Categorize with AI" calls the agent dispatcher
2. `/reports` — money-flow Sankey renders; AI commentary block shows agent-generated paragraph when a Groq key is configured (graceful empty state otherwise)
3. `/calendar` — daily-net heatmap renders; drop a what-if blueprint chip onto a future day → ScenarioInspector opens prefilled
4. `/goals` — each goal card shows a small forecast curve (using `project()` with the goal's contribution velocity)
5. `/accounts` — each account row shows a mini sparkline of recent balance trend
6. `/notes` — typing `@123` in a note body autocompletes against transaction descriptions; saved note renders Markdown
7. `/search` — typing in the search bar shows results from transactions, notes, accounts, goals, agent_actions (text-match only)
8. `/settings/household` — lists household members; copy-invite-code button; "Leave household" for non-owner members

---

## File Structure

### New files
- `components/Transactions/BulkBar.tsx` — sticky toolbar with selection count + AI actions
- `components/Reports/Sankey.tsx` — money-flow visualization
- `components/Reports/AICommentary.tsx` — agent-narrated paragraph block
- `components/Calendar/Heatmap.tsx` — daily-net colored cells
- `components/Goals/GoalForecast.tsx` — small TimeMachine-style curve per goal
- `components/Accounts/AccountSparkline.tsx` — 30-day balance trend per row
- `components/Notes/MarkdownView.tsx` — render Markdown with `@txn:id` link expansion
- `components/Notes/MentionAutocomplete.tsx` — `@`-trigger picker over transactions
- `app/settings/household/page.tsx`
- `lib/search.ts` — universal text-search helper

### Modified files
- `app/transactions/page.tsx` — selection state + BulkBar mount
- `app/reports/page.tsx` — replace existing charts area with Sankey + AICommentary
- `app/calendar/page.tsx` — embed Heatmap + drop-zone
- `app/goals/page.tsx` — embed GoalForecast per card
- `app/accounts/page.tsx` — embed AccountSparkline per row
- `app/notes/page.tsx` — Markdown render in view mode; mention autocomplete in edit
- `app/search/page.tsx` — universal results list
- `app/settings/page.tsx` — link to `/settings/household`
- `package.json` — add `react-markdown` + `remark-gfm` + a Sankey lib (or roll our own SVG)

---

## Prerequisites

- [ ] **P1.** On `feat/wave-4-agent` with build + tests green. Branch off:

```bash
cd /Users/pierrebelonsavon/Documents/budget
git checkout -b feat/wave-5-pages
git status  # clean
```

---

## Task 1: Universal text search (`lib/search.ts` + `/search`)

Pure-TS multi-source text search. No embeddings — just `.toLowerCase().includes()` across all relevant fields.

**Files:**
- Create: `lib/search.ts`
- Modify: `app/search/page.tsx`

- [ ] **Step 1: Write `lib/search.ts`**

```ts
import type { Transaction, Note, Account, SavingsGoal, AgentAction } from "./types";

export type SearchResultKind = "transaction" | "note" | "account" | "goal" | "agent_action";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  snippet: string;
  date?: string;
  href: string;
}

interface SearchInput {
  transactions: Transaction[];
  notes: Note[];
  accounts: Account[];
  goals: SavingsGoal[];
  agentActions: AgentAction[];
  query: string;
  limit?: number;
}

function match(text: string | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

export function search({ transactions, notes, accounts, goals, agentActions, query, limit = 50 }: SearchInput): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const out: SearchResult[] = [];

  for (const t of transactions) {
    if (out.length >= limit) break;
    if (match(t.description, q) || match(t.notes, q)) {
      out.push({
        kind: "transaction",
        id: t.id,
        title: t.description,
        snippet: `${t.type === "income" ? "+" : t.type === "expense" ? "−" : "↔"} ${t.amount} ${t.currency}`,
        date: t.date,
        href: `/transactions#${t.id}`,
      });
    }
  }

  for (const n of notes) {
    if (out.length >= limit) break;
    if (match(n.title, q) || match(n.content, q)) {
      out.push({
        kind: "note",
        id: n.id,
        title: n.title,
        snippet: n.content.slice(0, 120),
        date: n.updatedAt,
        href: `/notes#${n.id}`,
      });
    }
  }

  for (const a of accounts) {
    if (out.length >= limit) break;
    if (match(a.name, q)) {
      out.push({
        kind: "account",
        id: a.id,
        title: a.name,
        snippet: `${a.type} · ${a.currency}`,
        href: `/accounts#${a.id}`,
      });
    }
  }

  for (const g of goals) {
    if (out.length >= limit) break;
    if (match(g.name, q)) {
      out.push({
        kind: "goal",
        id: g.id,
        title: g.name,
        snippet: `${g.current} / ${g.target}`,
        href: `/goals#${g.id}`,
      });
    }
  }

  for (const aa of agentActions) {
    if (out.length >= limit) break;
    if (match(aa.tool, q) || match(aa.rationale, q)) {
      out.push({
        kind: "agent_action",
        id: aa.id,
        title: `${aa.tool} · ${aa.actor}`,
        snippet: aa.rationale ?? JSON.stringify(aa.args).slice(0, 120),
        date: aa.ts,
        href: `/activity#${aa.id}`,
      });
    }
  }

  return out;
}
```

- [ ] **Step 2: Rewrite `app/search/page.tsx`**

```tsx
"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Wallet, NotebookPen, PiggyBank, Target, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { search, type SearchResult } from "@/lib/search";

const KIND_ICON = {
  transaction: Wallet,
  note: NotebookPen,
  account: PiggyBank,
  goal: Target,
  agent_action: Sparkles,
} as const;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const transactions = useStore((s) => s.transactions);
  const notes = useStore((s) => s.notes);
  const accounts = useStore((s) => s.accounts);
  const goals = useStore((s) => s.goals);
  const agentActions = useStore((s) => s.agentActions);

  const results = useMemo<SearchResult[]>(
    () => search({ transactions, notes, accounts, goals, agentActions, query }),
    [transactions, notes, accounts, goals, agentActions, query]
  );

  return (
    <div className="space-y-4 pb-12">
      <header className="pt-2 md:pt-6">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">Search</h1>
      </header>

      <div className="glass p-3 flex items-center gap-2">
        <SearchIcon size={16} className="text-[var(--ink-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions, notes, accounts, goals, agent actions…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-xs text-[var(--ink-muted)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {query && results.length === 0 && (
        <div className="glass p-6 text-center text-sm text-[var(--ink-muted)]">
          No results.
        </div>
      )}

      <div className="space-y-2">
        {results.map((r) => {
          const Icon = KIND_ICON[r.kind];
          return (
            <Link key={`${r.kind}-${r.id}`} href={r.href} className="glass p-3 flex items-start gap-3 tap">
              <Icon size={18} className="mt-0.5 text-[var(--ink-muted)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-[var(--ink-muted)] truncate">{r.snippet}</div>
              </div>
              {r.date && (
                <div className="text-[10px] text-[var(--ink-muted)] flex-shrink-0">
                  {new Date(r.date).toLocaleDateString()}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/search.ts app/search/page.tsx
git commit -m "feat(search): universal text search across txns, notes, accounts, goals, agent actions"
```

---

## Task 2: Transactions bulk-select + AI batch

Adds selection state + a sticky bottom toolbar with bulk actions including "Categorize with AI" (which calls the agent dispatcher).

**Files:**
- Create: `components/Transactions/BulkBar.tsx`
- Modify: `app/transactions/page.tsx`

- [ ] **Step 1: Write `BulkBar.tsx`**

Sticky bar pinned to bottom of viewport (above mobile nav). Buttons: "Categorize with AI · N", "Tag with AI · N", "Clear selection". Uses `executeTool({ toolName: "categorizeTransactions", ... })` from `lib/agent/dispatch.ts`.

Full implementation requirements:
- Receive `selectedIds: string[]`, `onClear: () => void`.
- Disabled when `selectedIds.length === 0`.
- For "Categorize with AI": prompts the user for a category via a dropdown of `categories`, then calls the tool. Show a spinner during dispatch.
- The bar uses theme tokens (`--surface`, `--ink`, `--accent`).

- [ ] **Step 2: Modify `app/transactions/page.tsx`**

Add `selectedIds: Set<string>` state. Each transaction row gets a checkbox (visible only when at least one is selected, or always on desktop). Mount `<BulkBar selectedIds={Array.from(selectedIds)} onClear={() => setSelectedIds(new Set())} />` at the bottom.

- [ ] **Step 3: Commit**

```bash
git add components/Transactions/ app/transactions/page.tsx
git commit -m "feat(transactions): bulk-select toolbar with AI-powered categorize/tag actions"
```

---

## Task 3: Reports — money-flow Sankey + AI commentary

The existing reports page has bar/line charts. Replace the top section with a Sankey diagram (income → categories → savings/expense buckets) and add an AI commentary block underneath.

**Files:**
- Create: `components/Reports/Sankey.tsx`
- Create: `components/Reports/AICommentary.tsx`
- Modify: `app/reports/page.tsx`
- Modify: `package.json` if a Sankey lib is added

- [ ] **Step 1: Roll-our-own Sankey vs. library**

Recharts doesn't ship Sankey. Options:
- Install `react-sankey` or similar (extra bundle weight)
- Roll our own minimal SVG Sankey (4-6 layout columns, hand-tuned)

For this wave, **roll our own**. Write `components/Reports/Sankey.tsx` with a deterministic layout for 3 columns: Income sources → Income total → Expense categories. Each link's thickness = amount. Hover-state shows the amount.

Implementation contract:
```ts
interface SankeyNode {
  id: string;
  label: string;
  value: number;
  column: 0 | 1 | 2;  // 0=income, 1=hub, 2=expense
  color: string;
}
interface SankeyLink {
  source: string;
  target: string;
  value: number;
}
```

Compute node y-positions by summing values in each column. Use stroke-width proportional to link value. SVG only.

- [ ] **Step 2: Write `AICommentary.tsx`**

A glass card. On mount, if a Groq key is stored, calls `runAgent("Summarize this month's spending. Two paragraphs. Be specific.")` and renders the text. If no key, shows: "Add a Groq key in `/settings/ai` to enable AI commentary." (Don't auto-run repeatedly; cache by month.)

- [ ] **Step 3: Modify `/reports/page.tsx`**

Above the existing charts, add:
```tsx
<Sankey nodes={...} links={...} />
<AICommentary />
```

Compute `nodes` + `links` from transactions in the current month grouped by category. Income → "this month" hub → each expense category → savings (net amount left).

- [ ] **Step 4: Commit**

```bash
git add components/Reports/ app/reports/page.tsx
git commit -m "feat(reports): money-flow Sankey + AI commentary block"
```

---

## Task 4: Calendar daily-net heatmap + what-if drop

Replace the existing month-grid with a heatmap where each day cell is color-tinted by the day's net amount (green for positive, red for negative). Each future cell accepts a drop of a scenario blueprint chip.

**Files:**
- Create: `components/Calendar/Heatmap.tsx`
- Modify: `app/calendar/page.tsx`

- [ ] **Step 1: Write `Heatmap.tsx`**

7-column grid of day cells for the displayed month. Each cell:
- Day number
- Background color computed from `dayNet / maxAbsDay` → `var(--positive)` (gain) or `var(--negative)` (loss) at varying alpha
- Future cells accept `application/x-scenario-template` drops → call `onScenarioDrop(templateId, dateIso)`

Props: `monthDate: Date`, `dailyNets: Record<string /* yyyy-mm-dd */, number>`, `onDayClick`, `onScenarioDrop`.

- [ ] **Step 2: Modify `/calendar/page.tsx`**

Compute `dailyNets` from transactions. Render `<Heatmap />`. Mount `ScenarioInspector` modal to handle drops.

- [ ] **Step 3: Commit**

```bash
git add components/Calendar/ app/calendar/page.tsx
git commit -m "feat(calendar): daily-net heatmap + what-if drop-zones on future cells"
```

---

## Task 5: Goals — per-goal forecast curve

Each goal card gains a small inline curve showing projected progress over time, computed from contribution velocity + goal deadline.

**Files:**
- Create: `components/Goals/GoalForecast.tsx`
- Modify: `app/goals/page.tsx`

- [ ] **Step 1: Write `GoalForecast.tsx`**

Inputs: `goal: SavingsGoal`. Computes daily contribution rate from `goal.contributions` (sum / days since first contribution, or 0 if no contributions). Projects forward: `value(t) = current + rate * (t - now)`. Renders a small SVG (120×40px) line going from current up toward target. Also shows ETA: `(target - current) / rate = days`, then "in ~X months".

If `rate === 0` or `current >= target`, show "Set a recurring contribution" or "Goal reached".

- [ ] **Step 2: Embed in `/goals/page.tsx`**

Add `<GoalForecast goal={g} />` inside each goal card.

- [ ] **Step 3: Commit**

```bash
git add components/Goals/ app/goals/page.tsx
git commit -m "feat(goals): per-goal forecast curve + ETA based on contribution velocity"
```

---

## Task 6: Accounts — per-account sparkline

Each account row gains a small sparkline showing the balance over the last 30 days.

**Files:**
- Create: `components/Accounts/AccountSparkline.tsx`
- Modify: `app/accounts/page.tsx`

- [ ] **Step 1: Write `AccountSparkline.tsx`**

Inputs: `accountId`, `width=120`, `height=32`. Pulls transactions for that account from the store. Builds 30 daily balance points from today-30 to today (starting from `startingBalance` + sum of past txns up to each day). Renders an SVG line.

- [ ] **Step 2: Embed in `/accounts/page.tsx`**

Add the sparkline to the right side of each account row.

- [ ] **Step 3: Commit**

```bash
git add components/Accounts/ app/accounts/page.tsx
git commit -m "feat(accounts): per-account 30-day sparkline of balance trend"
```

---

## Task 7: Notes — Markdown + @txn mentions

Notes become rich Markdown. Typing `@123` (or any prefix) in the edit view opens an autocomplete listing transactions whose description matches. Selecting one inserts `[coffee](@txn:x-1)`. The view mode renders that as a clickable link to the transaction.

**Files:**
- Create: `components/Notes/MarkdownView.tsx`
- Create: `components/Notes/MentionAutocomplete.tsx`
- Modify: `app/notes/page.tsx`
- Modify: `package.json` (add `react-markdown` + `remark-gfm`)

- [ ] **Step 1: Install Markdown**

```bash
npm install react-markdown@^9 remark-gfm@^4
```

- [ ] **Step 2: Write `MarkdownView.tsx`**

```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

export default function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...rest }) => {
          // @txn:id links → /transactions#id
          if (href?.startsWith("@txn:")) {
            const id = href.slice("@txn:".length);
            return <Link href={`/transactions#${id}`} className="accent-text underline">{children}</Link>;
          }
          return <a href={href} {...rest}>{children}</a>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

- [ ] **Step 3: Write `MentionAutocomplete.tsx`**

A dropdown that appears when the user types `@` in a textarea. Lists matching transactions (top 5 by description match). Arrow keys + Enter to select. On selection, inserts `[description](@txn:id)` at the cursor.

- [ ] **Step 4: Modify `/notes/page.tsx`**

In view mode, render `<MarkdownView content={note.content} />`. In edit mode, the textarea uses `MentionAutocomplete`.

- [ ] **Step 5: Commit**

```bash
git add components/Notes/ app/notes/page.tsx package.json package-lock.json
git commit -m "feat(notes): Markdown rendering with @txn:id mention autocomplete"
```

---

## Task 8: Household settings page

**Files:**
- Create: `app/settings/household/page.tsx`
- Modify: `app/settings/page.tsx` (link)

- [ ] **Step 1: Write `/app/settings/household/page.tsx`**

Pulls the user's household + members via Supabase. Shows:
- Household name (editable if owner)
- Invite code with "Copy" button
- Member list with role
- "Leave household" button (for non-owner members)

Use `getBrowserSupabase()` queries against `households` and `household_members` tables. RLS filters automatically.

- [ ] **Step 2: Settings link**

In `/settings/page.tsx`, add a row linking to `/settings/household` near the Theme link.

- [ ] **Step 3: Commit**

```bash
git add app/settings/household/ app/settings/page.tsx
git commit -m "feat(settings): household management page with members + invite code"
```

---

## Task 9: End-to-end smoke test

**Files:** none (verification only)

- [ ] **Step 1: Build + tests**

```bash
npm run build  # green, 23+ routes
npm test       # 23/23 still pass (no new tests in this wave)
```

- [ ] **Step 2: Dev walk**

```bash
npm run dev -- -p 3001
```

Walk all upgraded routes. For each, confirm:
- Renders cleanly in the current theme (Architectural Light)
- No console errors
- New UI elements are interactive (click checkboxes on Transactions, drag a chip onto Calendar, hover Sankey, etc.)

Switch to Deep Space theme via `/settings/theme`. Repeat the walk. Confirm tokens propagate to new components (accent, ink, surface).

- [ ] **Step 3: Commit verification marker**

```bash
git commit --allow-empty -m "chore: Wave 5 page upgrades verified across upgraded routes"
```

---

## Done

Wave 5 complete when all 9 tasks check out.

**Deferred to later waves:**
- Smart Folders (own query-language design)
- Semantic Search via embeddings
- Receipt OCR + attachments
- Money-river account transfer animation
- PDF export of reports
- Account reconciliation wizard
- Sankey lib swap (current is hand-rolled SVG; could swap to a polished lib later)

**Next:** Wave 6 (Polish & PWA) — Lighthouse pass, install prompt, share image generator, sounds, accessibility.
