import type { Database } from "../db.types";
import type {
  Account, Category, Tag, Transaction, RecurringRule,
  SavingsGoal, Budget, Note, Reminder, WhatIfScenario, ScenarioDelta,
  AgentAction, AgentMemory,
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
    attachments: (r.attachments as unknown as Transaction["attachments"]) ?? undefined,
    recurringId: r.recurring_id ?? undefined,
    splits: (r.splits as unknown as Transaction["splits"]) ?? undefined,
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
    endBalance: r.end_balance == null ? undefined : Number(r.end_balance),
    endCount: r.end_count ?? undefined,
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
  what_if_scenarios: (r: DB["what_if_scenarios"]["Row"]): WhatIfScenario => ({
    id: r.id, householdId: r.household_id, name: r.name,
    startDate: r.start_date, endDate: r.end_date ?? undefined,
    pinned: r.pinned, color: r.color, icon: r.icon,
    deltas: (r.deltas as unknown as ScenarioDelta[]) ?? [],
    createdAt: r.created_at, updatedAt: r.updated_at,
  }),
  agent_actions: (r: DB["agent_actions"]["Row"]): AgentAction => ({
    id: r.id, householdId: r.household_id,
    ts: r.ts, actor: r.actor as AgentAction["actor"],
    tier: r.tier as AgentAction["tier"], tool: r.tool,
    args: r.args, result: r.result ?? undefined,
    inverse: r.inverse ?? undefined,
    undoneAt: r.undone_at ?? undefined,
    parentActionId: r.parent_action_id ?? undefined,
    rationale: r.rationale ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }),
  agent_memory: (r: DB["agent_memory"]["Row"]): AgentMemory => ({
    id: r.id, householdId: r.household_id,
    kind: r.kind as AgentMemory["kind"], text: r.text,
    source: r.source as AgentMemory["source"],
    createdAt: r.created_at, updatedAt: r.updated_at,
  }),
};

import type { Json } from "../db.types";

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
    to_account_id: x.toAccountId ?? null, tag_ids: x.tagIds as Json, date: x.date, status: x.status,
    notes: x.notes ?? null, attachments: (x.attachments ?? null) as Json,
    recurring_id: x.recurringId ?? null, splits: (x.splits ?? null) as Json,
    projected: x.projected ?? false,
  }),
  recurring_rules: (r: RecurringRule, householdId: string): DB["recurring_rules"]["Insert"] => ({
    id: r.id, household_id: householdId, name: r.name, type: r.type, amount: r.amount,
    currency: r.currency, category_id: r.categoryId ?? null, account_id: r.accountId,
    to_account_id: r.toAccountId ?? null, tag_ids: r.tagIds as Json, notes: r.notes ?? null,
    frequency: r.frequency, start_date: r.startDate, end_date: r.endDate ?? null,
    end_balance: r.endBalance ?? null, end_count: r.endCount ?? null,
    day_of_month: r.dayOfMonth ?? null, autopay: r.autopay, active: r.active,
    last_generated: r.lastGenerated ?? null,
  }),
  savings_goals: (g: SavingsGoal, householdId: string): DB["savings_goals"]["Insert"] => ({
    id: g.id, household_id: householdId, name: g.name, target: g.target, current: g.current,
    deadline: g.deadline ?? null, color: g.color, icon: g.icon, account_id: g.accountId ?? null,
    contributions: g.contributions as Json,
  }),
  budgets: (b: Budget, householdId: string): DB["budgets"]["Insert"] => ({
    id: b.id, household_id: householdId, category_id: b.categoryId,
    amount: b.amount, period: b.period, rollover: b.rollover,
  }),
  notes: (n: Note, householdId: string): DB["notes"]["Insert"] => ({
    id: n.id, household_id: householdId, title: n.title, content: n.content,
    pinned: n.pinned, color: n.color ?? null, tag_ids: n.tagIds as Json,
  }),
  reminders: (rm: Reminder, householdId: string): DB["reminders"]["Insert"] => ({
    id: rm.id, household_id: householdId, title: rm.title, date: rm.date,
    recurring: rm.recurring ?? null, done: rm.done,
    linked_transaction_id: rm.linkedTransactionId ?? null,
  }),
  what_if_scenarios: (s: WhatIfScenario, householdId: string): DB["what_if_scenarios"]["Insert"] => ({
    id: s.id, household_id: householdId, name: s.name,
    start_date: s.startDate, end_date: s.endDate ?? null,
    pinned: s.pinned, color: s.color, icon: s.icon,
    deltas: s.deltas as unknown as Json,
  }),
  agent_actions: (a: AgentAction, householdId: string): DB["agent_actions"]["Insert"] => ({
    id: a.id, household_id: householdId, ts: a.ts,
    actor: a.actor, tier: a.tier, tool: a.tool,
    args: a.args as Json, result: (a.result ?? null) as Json,
    inverse: (a.inverse ?? null) as Json,
    undone_at: a.undoneAt ?? null,
    parent_action_id: a.parentActionId ?? null,
    rationale: a.rationale ?? null,
  }),
  agent_memory: (m: AgentMemory, householdId: string): DB["agent_memory"]["Insert"] => ({
    id: m.id, household_id: householdId, kind: m.kind,
    text: m.text, source: m.source,
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
  what_if_scenarios: "scenarios",
  agent_actions: "agentActions",
  agent_memory: "agentMemory",
};
