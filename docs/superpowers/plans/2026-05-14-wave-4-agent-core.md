# Wave 4 · Agent Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** Ship a working AI agent that can take actions on the user's data — categorize transactions, add notes, build budgets, etc. — with three safety tiers, an Activity Log of every action, one-click Undo, a ⌘K command palette, and persistent agent memory.

**Architecture:**
- **LLM provider:** Vercel AI SDK v6 routed through Vercel AI Gateway. Default: **Groq free tier** (Llama 3.3 70B, ~30 req/min free). User pastes a free Groq key in `/settings/ai`; key stored in localStorage (not synced — per-device). Optional escalation paths (HF, Anthropic) work the same way.
- **WebLLM (in-browser fallback) is deferred** to a later wave — model preload UX is its own surgery. For Wave 4, no key → agent shows a "Add a key in Settings to enable" placeholder.
- **Tool palette:** Vercel AI SDK `tools` parameter with Zod schemas. Each tool wraps a Zustand store mutation. Tools declare a `tier`: `auto` (silent + 8s Undo), `confirm` (one-tap approve), `explicit` (user-clicked button only — AI can only *propose*).
- **Dispatcher:** Single `executeTool(name, args)` function. Auto-tier runs immediately; confirm-tier emits a confirmation card the user clicks; explicit-tier returns "cannot run autonomously."
- **Activity log:** `agent_actions` table (synced via Wave 1 engine). Every tool call writes a row with inverse-action data so Undo is a single DB read + reverse mutation.
- **Memory:** `agent_memory` table. User-taught facts ("I get paid biweekly on Fridays"). Pulled into the system prompt on every request.
- **⌘K palette:** Global keybinding (Cmd/Ctrl + K), opens a modal with input + recent thread + streaming response.

**Tech Stack:**
- `ai` (Vercel AI SDK v6) · `@ai-sdk/groq` · `zod` for tool schemas · Vercel AI Gateway for routing
- React 19 streaming via `useChat()` hook
- Server actions / Route Handler for the agent endpoint
- Existing Zustand store + Supabase sync (Wave 1) extends to `agent_actions` and `agent_memory`

**Spec reference:** `docs/superpowers/specs/2026-05-14-agentic-budget-platform-design.md` §5 (AI Agent) + §10 Wave 4.

**Exit criteria:** From Home with ⌘K (or the floating Copilot button on mobile), Pierre can:
1. Add a Groq key once via `/settings/ai`
2. Type "categorize my last 30 transactions" → agent calls the `categorizeTransactions` tool (auto tier) → the affected transactions get categories → an Undo card shows for 8 seconds
3. Type "add a note: lunch with mom $42" → agent calls `addTransaction` (auto) → row appears
4. Open the Activity sidebar from any page → see the last N agent actions → click Undo on any → mutation reverses
5. Teach the agent a fact in `/settings/ai` → next ⌘K conversation includes that context

---

## File Structure

### New files
- `supabase/migrations/20260514_000007_agent.sql` — `agent_actions` + `agent_memory` tables + RLS
- `lib/agent/types.ts` — `AgentAction`, `AgentMemory`, `ToolSpec`, `Tier`
- `lib/agent/tools/index.ts` — registry of all tools
- `lib/agent/tools/transactions.ts` — `addTransaction`, `categorizeTransactions`, `tagTransaction`, `splitTransaction`
- `lib/agent/tools/notes.ts` — `addNote`
- `lib/agent/tools/reminders.ts` — `addReminder`
- `lib/agent/tools/scenarios.ts` — `addScenario`, `applyWhatIf`
- `lib/agent/dispatch.ts` — `executeTool(name, args, tier)` + inverse-recording
- `lib/agent/memory.ts` — `getMemoryContext()`, `addMemory()`, `removeMemory()`
- `lib/agent/client.ts` — browser-side: `runAgent(message, tools, options)` using AI SDK
- `lib/agent/system-prompt.ts` — builds the system prompt from settings + memory + active scenarios
- `app/api/agent/route.ts` — Vercel AI SDK route handler with `streamText` + tool support
- `components/Copilot/CmdK.tsx` — modal palette with keybinding
- `components/Copilot/ActivitySidebar.tsx` — slide-in right rail
- `components/Copilot/UndoCard.tsx` — toast-like undo prompts for auto-tier actions
- `app/activity/page.tsx` — fullscreen activity log
- `app/settings/ai/page.tsx` — provider key entry + memory CRUD + kill switch

### Modified files
- `lib/db.types.ts` — regenerate after migration
- `lib/types.ts` — add `AgentAction`, `AgentMemory` to AppState
- `lib/store.ts` — add `agentActions` + `agentMemory` slices and actions
- `lib/sync/sync-bindings.ts` — bindings for both new tables
- `app/layout.tsx` — mount `CmdK` + `ActivitySidebar` globally
- `components/Nav.tsx` — add `/activity` entry
- `app/settings/page.tsx` — add link to `/settings/ai`
- `package.json` — install `ai`, `@ai-sdk/groq`, `zod`

---

## Prerequisites

- [ ] **P1.** On `feat/wave-3-time-machine` with all tests green. Branch off to `feat/wave-4-agent`:

```bash
cd /Users/pierrebelonsavon/Documents/budget
git checkout -b feat/wave-4-agent
git status  # clean
```

- [ ] **P2.** Pierre needs a free Groq key for end-of-wave testing. Sign up at https://console.groq.com (free, no credit card). Save the key (starts with `gsk_…`).

---

## Task 1: AgentAction + AgentMemory schema

**Files:**
- Create: `supabase/migrations/20260514_000007_agent.sql`
- Re-generate: `lib/db.types.ts`
- Modify: `lib/types.ts`

- [ ] **Step 1: Write the migration**

`/Users/pierrebelonsavon/Documents/budget/supabase/migrations/20260514_000007_agent.sql`:

```sql
create table public.agent_actions (
  id text primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  ts timestamptz not null default now(),
  actor text not null check (actor in ('user','agent')),
  tier text not null check (tier in ('auto','confirm','explicit')),
  tool text not null,
  args jsonb not null,
  result jsonb,
  inverse jsonb,           -- data needed to undo (e.g., the row's prior state)
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
```

- [ ] **Step 2: Apply via MCP**

Run `mcp__claude_ai_Supabase__apply_migration` with `project_id=cbtihkovrevdsjbxslmi`, `name=20260514_000007_agent`, query=above.

Run `mcp__claude_ai_Supabase__get_advisors` with `type=security`. Confirm no new advisories.

- [ ] **Step 3: Regenerate TS types**

Run `mcp__claude_ai_Supabase__generate_typescript_types`. Save to `lib/db.types.ts`.

- [ ] **Step 4: Extend `lib/types.ts`**

Add:

```ts
export type AgentTier = "auto" | "confirm" | "explicit";

export interface AgentAction {
  id: string;
  householdId: string;
  ts: string;
  actor: "user" | "agent";
  tier: AgentTier;
  tool: string;
  args: unknown;
  result?: unknown;
  inverse?: unknown;       // data needed to undo
  undoneAt?: string;
  parentActionId?: string;
  rationale?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMemory {
  id: string;
  householdId: string;
  kind: "preference" | "fact" | "rule";
  text: string;
  source: "user-taught" | "agent-inferred";
  createdAt: string;
  updatedAt: string;
}
```

In `AppState`, add:

```ts
agentActions: AgentAction[];
agentMemory: AgentMemory[];
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260514_000007_agent.sql lib/types.ts lib/db.types.ts
git commit -m "feat(agent): AgentAction + AgentMemory DB schema with RLS"
```

---

## Task 2: Store + sync wiring

**Files:**
- Modify: `lib/store.ts`
- Modify: `lib/sync/sync-bindings.ts`

- [ ] **Step 1: Add store slices**

In `lib/store.ts`:
- Add to `AppState`-like initial state: `agentActions: []`, `agentMemory: []`.
- Add actions:
  ```ts
  addAgentAction: (a: Omit<AgentAction, "id" | "createdAt" | "updatedAt" | "householdId">) => AgentAction
  markActionUndone: (id: string) => void
  addAgentMemory: (m: Omit<AgentMemory, "id" | "createdAt" | "updatedAt" | "householdId">) => void
  removeAgentMemory: (id: string) => void
  ```
- Each action thread `syncAfter("agent_actions" | "agent_memory", row, "upsert"|"delete", id?)` as in Wave 1.

- [ ] **Step 2: Add bindings**

In `lib/sync/sync-bindings.ts`, add:
- `rowToApp.agent_actions` and `rowToApp.agent_memory` (Row → App-shape converters)
- `appToRow.agent_actions` and `appToRow.agent_memory` (App → Insert)
- `tableToSlice` entries: `agent_actions: "agentActions"`, `agent_memory: "agentMemory"`

- [ ] **Step 3: Verify**

```bash
npm run build  # green
npm test       # 23 tests still pass
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(agent): store + sync wiring for agent_actions and agent_memory"
```

---

## Task 3: Install AI SDK + ai-gateway env

**Files:**
- Modify: `package.json`
- Modify: `.env.local.example`

- [ ] **Step 1: Install**

```bash
npm install ai@^6 @ai-sdk/groq@^2 zod@^3.23
```

(`ai` is Vercel AI SDK v6; `@ai-sdk/groq` is the Groq provider package; `zod` for tool schemas.)

- [ ] **Step 2: Add env var to example**

Append to `.env.local.example`:

```
# Vercel AI Gateway — optional. If unset, the route uses GROQ_API_KEY directly.
AI_GATEWAY_API_KEY=

# Server-side Groq key (set this OR rely on AI_GATEWAY_API_KEY)
GROQ_API_KEY=
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.local.example
git commit -m "chore(agent): install ai + @ai-sdk/groq + zod"
```

---

## Task 4: Tool palette

**Files:**
- Create: `lib/agent/types.ts`
- Create: `lib/agent/tools/index.ts`
- Create: `lib/agent/tools/transactions.ts`
- Create: `lib/agent/tools/notes.ts`
- Create: `lib/agent/tools/reminders.ts`
- Create: `lib/agent/tools/scenarios.ts`

Each tool defines:
- Zod input schema
- `tier: "auto" | "confirm" | "explicit"`
- `description` (passed to the LLM)
- `execute(args, ctx): { result, inverse }` — runs the mutation and returns inverse data for undo
- Optional `dryRun(args, ctx): preview` for confirm-tier UI

- [ ] **Step 1: Write `lib/agent/types.ts`**

```ts
import { z } from "zod";
import type { useStore } from "../store";

export type AgentTier = "auto" | "confirm" | "explicit";

export interface ToolCtx {
  storeGet: typeof useStore.getState;
  storeSet: typeof useStore.setState;
  householdId: string;
}

export interface ToolSpec<I extends z.ZodTypeAny = z.ZodTypeAny, R = unknown, V = unknown> {
  name: string;
  description: string;
  tier: AgentTier;
  parameters: I;
  execute: (args: z.infer<I>, ctx: ToolCtx) => Promise<{ result: R; inverse: V }> | { result: R; inverse: V };
  dryRun?: (args: z.infer<I>, ctx: ToolCtx) => string;
}
```

- [ ] **Step 2: Write `lib/agent/tools/transactions.ts`**

Implements these 4 tools (each is a `ToolSpec`):

- `addTransaction` (auto): schema { type: enum, amount: number, description: string, accountId?: string, categoryId?: string, date?: string }. Default account = first un-archived. Default date = today. `execute` calls `storeGet().addTransaction(...)` and returns inverse `{ id: createdId }` so undo can call `removeTransaction(id)`.
- `categorizeTransactions` (auto): schema { ids: string[], categoryId: string }. Execute iterates and calls `updateTransaction(id, { categoryId })`. Inverse: `[{ id, prevCategoryId }, ...]`.
- `tagTransaction` (auto): schema { id, tagId }. Adds tag if not present. Inverse: `{ id, hadTag: boolean }`.
- `splitTransaction` (confirm): schema { id, splits: { categoryId, amount, note? }[] }. Sets `transactions[i].splits`. Inverse: `{ id, prevSplits }`.

Write the full file.

- [ ] **Step 3: Write `lib/agent/tools/notes.ts`**

`addNote` (auto): schema { title: string, content: string, pinned?: boolean }. Default pinned=false. Inverse: `{ id }`.

- [ ] **Step 4: Write `lib/agent/tools/reminders.ts`**

`addReminder` (auto): schema { title, date, recurring? }. Inverse: `{ id }`.

- [ ] **Step 5: Write `lib/agent/tools/scenarios.ts`**

- `addScenario` (confirm): schema { name, startDate, endDate?, kind: enum, amount, frequency?, currency? }. Builds a `WhatIfScenario` with a single delta. Inverse: `{ id }`.
- `applyWhatIf` (confirm): schema { scenarioId }. Calls `toggleActiveScenario(id)`. Inverse: same id to re-toggle.

- [ ] **Step 6: Write `lib/agent/tools/index.ts`**

Aggregate every `ToolSpec` into a single `TOOLS` array indexed by name:

```ts
export const TOOLS: ToolSpec[] = [
  addTransaction, categorizeTransactions, tagTransaction, splitTransaction,
  addNote, addReminder, addScenario, applyWhatIf,
];

export function toolByName(name: string): ToolSpec | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Build the Vercel AI SDK `tools` object from our specs (server-side use). */
export function toAISDKTools(): Record<string, { description: string; parameters: unknown }> {
  return Object.fromEntries(
    TOOLS.map((t) => [t.name, { description: t.description, parameters: t.parameters }])
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/agent/
git commit -m "feat(agent): tool palette — 8 tools across auto/confirm tiers with Zod schemas"
```

---

## Task 5: Dispatcher + activity logging + undo

**Files:**
- Create: `lib/agent/dispatch.ts`
- Create: `lib/agent/memory.ts`
- Modify: `lib/store.ts` (the addAgentAction call site)

- [ ] **Step 1: Write `lib/agent/dispatch.ts`**

```ts
import { useStore } from "../store";
import { toolByName } from "./tools";
import { uid } from "../utils";
import type { AgentAction, AgentTier } from "../types";

interface DispatchInput {
  toolName: string;
  args: unknown;
  actor: "user" | "agent";
  rationale?: string;
  parentActionId?: string;
}

export type DispatchResult =
  | { status: "executed"; actionId: string; result: unknown }
  | { status: "needs-confirm"; preview: string; tool: string; args: unknown }
  | { status: "blocked"; reason: string };

export async function executeTool(input: DispatchInput): Promise<DispatchResult> {
  const tool = toolByName(input.toolName);
  if (!tool) return { status: "blocked", reason: `Unknown tool: ${input.toolName}` };

  const state = useStore.getState();
  const householdId = state.currentHouseholdId ?? "";
  const ctx = { storeGet: useStore.getState, storeSet: useStore.setState, householdId };

  if (tool.tier === "explicit") {
    return { status: "blocked", reason: `${tool.name} requires an explicit user click` };
  }
  if (tool.tier === "confirm" && input.actor === "agent") {
    return {
      status: "needs-confirm",
      preview: tool.dryRun?.(input.args, ctx) ?? `${tool.name}(${JSON.stringify(input.args)})`,
      tool: tool.name,
      args: input.args,
    };
  }

  // Run
  const { result, inverse } = await tool.execute(input.args, ctx);

  const action: AgentAction = {
    id: uid("act"),
    householdId,
    ts: new Date().toISOString(),
    actor: input.actor,
    tier: tool.tier,
    tool: tool.name,
    args: input.args,
    result,
    inverse,
    rationale: input.rationale,
    parentActionId: input.parentActionId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  state.addAgentAction(action);
  return { status: "executed", actionId: action.id, result };
}

/** Invert an action: read the stored inverse blob and call the matching reverse mutation. */
export async function undoAction(actionId: string): Promise<void> {
  const state = useStore.getState();
  const action = state.agentActions.find((a) => a.id === actionId);
  if (!action || action.undoneAt) return;

  // For each tool, define the inverse here — keep it co-located with the action's tool name.
  switch (action.tool) {
    case "addTransaction": {
      const inv = action.inverse as { id: string };
      state.removeTransaction(inv.id);
      break;
    }
    case "categorizeTransactions": {
      const inv = action.inverse as Array<{ id: string; prevCategoryId?: string }>;
      for (const x of inv) state.updateTransaction(x.id, { categoryId: x.prevCategoryId });
      break;
    }
    case "tagTransaction": {
      const inv = action.inverse as { id: string; hadTag: boolean; tagId: string };
      if (!inv.hadTag) {
        const tx = state.transactions.find((t) => t.id === inv.id);
        if (tx) state.updateTransaction(inv.id, { tagIds: tx.tagIds.filter((t) => t !== inv.tagId) });
      }
      break;
    }
    case "splitTransaction": {
      const inv = action.inverse as { id: string; prevSplits: unknown };
      state.updateTransaction(inv.id, { splits: inv.prevSplits as never });
      break;
    }
    case "addNote": {
      const inv = action.inverse as { id: string };
      state.removeNote(inv.id);
      break;
    }
    case "addReminder": {
      const inv = action.inverse as { id: string };
      state.removeReminder(inv.id);
      break;
    }
    case "addScenario": {
      const inv = action.inverse as { id: string };
      state.removeScenario(inv.id);
      break;
    }
    case "applyWhatIf": {
      const inv = action.inverse as { id: string };
      state.toggleActiveScenario(inv.id);
      break;
    }
  }

  state.markActionUndone(actionId);
}
```

- [ ] **Step 2: Write `lib/agent/memory.ts`**

```ts
import { useStore } from "../store";

export function getMemoryContext(): string {
  const mems = useStore.getState().agentMemory;
  if (mems.length === 0) return "";
  return [
    "User-taught context:",
    ...mems.map((m) => `- (${m.kind}) ${m.text}`),
  ].join("\n");
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/agent/dispatch.ts lib/agent/memory.ts
git commit -m "feat(agent): dispatcher with safety tiers + activity logging + undo"
```

---

## Task 6: AI route handler

**Files:**
- Create: `app/api/agent/route.ts`
- Create: `lib/agent/system-prompt.ts`

- [ ] **Step 1: Write `lib/agent/system-prompt.ts`**

Builds the system prompt server-side from request body. The client sends `memorySnapshot` and `settingsSnapshot`; we DON'T trust the client to set the LLM's role.

```ts
import type { AgentMemory, Settings } from "../types";

export function buildSystemPrompt(memory: AgentMemory[], settings: Pick<Settings, "userName" | "currency">): string {
  return `You are an agentic personal-finance assistant called Copilot.
You help the user with their budget app.
You can call tools to take actions on their data.

User: ${settings.userName || "Pierre"}
Currency: ${settings.currency}

Style:
- Be concise. Two sentences usually.
- When you call a tool, briefly say what you're doing.
- Never invent transaction amounts — ask for them.
- Be defensive about confirm-tier tools: explain what will change before calling them.

User-taught context (these are facts the user wants you to remember):
${memory.map((m) => `- (${m.kind}) ${m.text}`).join("\n") || "(none yet)"}
`;
}
```

- [ ] **Step 2: Write `app/api/agent/route.ts`**

```ts
import { streamText, type CoreMessage } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { toAISDKTools } from "@/lib/agent/tools";
import type { AgentMemory, Settings } from "@/lib/types";

export const runtime = "nodejs"; // Fluid Compute; AI Gateway is fine here

interface AgentRequestBody {
  messages: CoreMessage[];
  memory: AgentMemory[];
  settings: Pick<Settings, "userName" | "currency">;
  /** User-pasted Groq key — sent only over HTTPS to our own route. Server uses it once and discards. */
  groqKey?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as AgentRequestBody;
  const { messages, memory, settings, groqKey } = body;

  // Prefer the user-pasted key from the request body; fall back to a server-side env.
  // The user's key is never persisted on the server.
  const apiKey = groqKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "No Groq API key configured. Add one in /settings/ai." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const groq = createGroq({ apiKey });

  const system = buildSystemPrompt(memory, settings);

  // Note: tools here only DECLARE the schema. Execution happens client-side
  // via lib/agent/dispatch.ts so the dispatcher can enforce safety tiers
  // and write the AgentAction log against the live store.
  const tools = toAISDKTools();

  const result = await streamText({
    model: groq("llama-3.3-70b-versatile"),
    system,
    messages,
    tools: tools as never,
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/agent/ lib/agent/system-prompt.ts
git commit -m "feat(agent): /api/agent route handler with Groq + tool schema declaration"
```

---

## Task 7: Browser-side agent runner

**Files:**
- Create: `lib/agent/client.ts`

The client uses AI SDK's `useChat` to call our route. When the LLM emits a `tool-call` part, the client invokes `executeTool` from `dispatch.ts` and feeds the result back into the chat as a `tool-result` message.

- [ ] **Step 1: Write `lib/agent/client.ts`**

```ts
"use client";
import { useStore } from "../store";
import { executeTool } from "./dispatch";

const GROQ_KEY_STORAGE = "budget-groq-key-v1";

export function getStoredGroqKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(GROQ_KEY_STORAGE);
}
export function setStoredGroqKey(key: string) {
  localStorage.setItem(GROQ_KEY_STORAGE, key);
}
export function clearStoredGroqKey() {
  localStorage.removeItem(GROQ_KEY_STORAGE);
}

export interface AgentRunResult {
  text: string;
  actions: Array<{ tool: string; status: string; actionId?: string }>;
}

/**
 * Single-turn agent call. For streaming UI, use AI SDK's useChat directly with
 * the same body shape; this function exists for simpler call sites (e.g., a
 * one-shot "summarize my month" button).
 */
export async function runAgent(userMessage: string): Promise<AgentRunResult> {
  const state = useStore.getState();
  const key = getStoredGroqKey();
  if (!key) throw new Error("Add a Groq key in /settings/ai");

  const body = {
    messages: [{ role: "user", content: userMessage }],
    memory: state.agentMemory,
    settings: { userName: state.settings.userName, currency: state.settings.currency },
    groqKey: key,
  };

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Agent request failed: ${res.status}`);
  }

  // Drain the stream into a single text. AI SDK v6 streams as a data stream;
  // for now we use the simpler client that just collects the final assistant turn.
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  let buffer = "";
  const actions: AgentRunResult["actions"] = [];
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }

  // The AI SDK data stream format prefixes each line with a marker:
  //   "0:" → text delta, "2:" → tool call, "a:" → tool result, etc.
  // For Wave 4, parse minimally: collect text deltas and surface tool-call requests.
  let text = "";
  for (const line of buffer.split("\n")) {
    if (line.startsWith("0:")) {
      try {
        text += JSON.parse(line.slice(2));
      } catch {
        // ignore malformed deltas
      }
    } else if (line.startsWith("9:")) {
      // tool-call request from the model
      try {
        const call = JSON.parse(line.slice(2)) as { toolName: string; args: unknown; toolCallId: string };
        const r = await executeTool({
          toolName: call.toolName,
          args: call.args,
          actor: "agent",
          rationale: undefined,
        });
        actions.push({
          tool: call.toolName,
          status: r.status,
          actionId: r.status === "executed" ? r.actionId : undefined,
        });
      } catch {
        // malformed tool-call line; ignore
      }
    }
  }
  return { text, actions };
}
```

(The AI SDK data-stream format codes can shift between minor versions; the parser is intentionally tolerant. A later wave will swap this for AI SDK's `useChat` hook for streaming UI.)

- [ ] **Step 2: Commit**

```bash
git add lib/agent/client.ts
git commit -m "feat(agent): browser-side runAgent that dispatches tool calls through the local dispatcher"
```

---

## Task 8: ⌘K command palette

**Files:**
- Create: `components/Copilot/CmdK.tsx`
- Create: `components/Copilot/UndoCard.tsx`
- Modify: `app/layout.tsx` (mount CmdK)

- [ ] **Step 1: Write `UndoCard.tsx`**

A toast pinned bottom-center (mobile) / bottom-right (desktop) showing the last auto-tier action with an Undo button and an 8-second auto-dismiss progress bar.

- [ ] **Step 2: Write `CmdK.tsx`**

Modal overlay. Triggered by Cmd+K (Mac) / Ctrl+K (Win/Linux). Has:
- Input field (autofocus)
- Submit → call `runAgent(input)` → render the response text + a list of executed actions
- Each action shows with an Undo button (calls `undoAction(actionId)`)
- "Configure Groq key →" link to `/settings/ai` shown if no key stored

- [ ] **Step 3: Mount in layout**

In `app/layout.tsx`, add `<CmdK />` and `<UndoCard />` inside `<HouseholdProvider>` next to `<MigrationPrompt />`.

- [ ] **Step 4: Commit**

```bash
git add components/Copilot/ app/layout.tsx
git commit -m "feat(agent): ⌘K command palette + 8-second Undo toast"
```

---

## Task 9: Activity sidebar + /activity route

**Files:**
- Create: `components/Copilot/ActivitySidebar.tsx`
- Create: `app/activity/page.tsx`
- Modify: `components/Nav.tsx` (add /activity entry)
- Modify: `app/layout.tsx` (mount ActivitySidebar)

- [ ] **Step 1: Write `ActivitySidebar.tsx`**

A right-side slide-in drawer (Cmd+. or click a chip in the nav). Lists `state.agentActions` reverse-chrono. Each row: tool icon, summary, timestamp, Undo button (disabled if `undoneAt` is set).

- [ ] **Step 2: Write `/app/activity/page.tsx`**

Same content as the sidebar but fullscreen with filters: by tool, by date range, by undone status.

- [ ] **Step 3: Nav update**

Add `{ href: "/activity", label: "Activity log", icon: History }` to `items`.

- [ ] **Step 4: Commit**

```bash
git add components/Copilot/ActivitySidebar.tsx app/activity/ components/Nav.tsx app/layout.tsx
git commit -m "feat(agent): activity sidebar + /activity route + nav entry"
```

---

## Task 10: /settings/ai (provider key + memory CRUD + kill switch)

**Files:**
- Create: `app/settings/ai/page.tsx`
- Modify: `app/settings/page.tsx` (add link)

- [ ] **Step 1: Write `/app/settings/ai/page.tsx`**

Sections:
1. **Groq key** — input (password type) with Save / Clear buttons. Uses `getStoredGroqKey`, `setStoredGroqKey`, `clearStoredGroqKey`. Shows status pill: "Connected" or "Not configured".
2. **Memory** — list `state.agentMemory`. Each row has Edit / Delete. Add-new form below: kind select (preference/fact/rule), text input, Add button.
3. **Kill switch** — toggle that, when off, blocks all auto-tier dispatcher calls (store in settings: `agentKillSwitch: boolean`). When off, the dispatcher returns `{ status: "blocked", reason: "Kill switch enabled" }` for any auto/confirm action.

- [ ] **Step 2: Add field to `Settings`**

In `lib/types.ts`, add `agentKillSwitch: boolean` to `Settings`. Default `false` in `lib/store.ts`.

- [ ] **Step 3: Honor kill switch in dispatcher**

In `lib/agent/dispatch.ts`'s `executeTool`, before any tier handling:

```ts
if (state.settings.agentKillSwitch && tool.tier !== "explicit") {
  return { status: "blocked", reason: "Agent kill switch is on" };
}
```

- [ ] **Step 4: Settings page link**

Add a row in the existing `/settings` page linking to `/settings/ai`.

- [ ] **Step 5: Commit**

```bash
git add app/settings/ai/ app/settings/page.tsx lib/agent/dispatch.ts lib/types.ts lib/store.ts
git commit -m "feat(agent): /settings/ai with Groq key, memory CRUD, kill switch"
```

---

## Task 11: End-to-end smoke test

**Files:** none (verification only)

- [ ] **Step 1: Build**

```bash
npm run build  # green, ~20 routes registered (added /activity, /settings/ai)
```

- [ ] **Step 2: Unit tests**

```bash
npm test  # 23 tests still pass — no new tests in Wave 4, all are integration
```

- [ ] **Step 3: Dev walk**

```bash
npm run dev -- -p 3001
```

- Visit `/settings/ai`. Paste a Groq key. Hit Save.
- Cmd+K (or Ctrl+K). Type "add a $4.50 coffee transaction". Submit.
- Expected: agent calls `addTransaction` (auto), transaction appears in store, Undo toast shows for 8s.
- Cmd+K again. Type "what's my net worth?". Expected: text-only response (the assistant reads from context — for now, just a deterministic-looking answer in the system prompt's voice).
- Open Activity sidebar (Cmd+.). See the addTransaction action with Undo. Click Undo. Transaction disappears.
- Add a memory: "I get paid biweekly on Fridays". Cmd+K → "when's my next paycheck?" → the response references the biweekly Friday fact.
- Toggle kill switch on. Try Cmd+K → "categorize my transactions" → expect "Agent kill switch is on" message.

- [ ] **Step 4: Theme test**

Switch to Deep Space theme. Open ⌘K. Confirm the palette overlay uses theme tokens (lavender accent, void bg, hairline borders).

- [ ] **Step 5: Commit verification marker**

```bash
git commit --allow-empty -m "chore: Wave 4 agent core verified — ⌘K agent + tools + undo + memory shipped"
```

---

## Done

Wave 4 complete when all 11 tasks check out.

**Deferred to later waves:**
- WebLLM in-browser provider (model preload UX + WebGPU detection)
- Voice mode (Web Speech API)
- Multi-step tool chaining with proper streaming UI (current is single-turn)
- AI-narrated home insight stream (the cards on Home that say "Bundle 4 subs · Do it") — needs the agent to run periodically on app load with a "morning brief" prompt; defer
- Embeddings + semantic search

**Next:** Wave 5 (Page Upgrades — Transactions bulk-AI-actions, Calendar what-if heatmap, Reports Sankey + AI narration, Smart Folders, etc.).
