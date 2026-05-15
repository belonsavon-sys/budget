export type Currency =
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CAD"
  | "AUD"
  | "CHF"
  | "CNY"
  | "INR"
  | "MXN"
  | "BRL"
  | "KRW"
  | "SGD"
  | "HKD"
  | "NZD"
  | "SEK"
  | "NOK"
  | "DKK"
  | "ZAR";

export type TxnType = "income" | "expense" | "transfer";
export type TxnStatus = "pending" | "paid" | "received" | "projected";
export type AccountType = "checking" | "savings" | "credit" | "cash" | "investment";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  startingBalance: number;
  currency: Currency;
  color: string;
  icon: string;
  archived: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense" | "both";
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
}

export interface Split {
  categoryId: string;
  amount: number;
  note?: string;
}

export interface Transaction {
  id: string;
  type: TxnType;
  amount: number;
  currency: Currency;
  description: string;
  categoryId?: string;
  accountId: string;
  toAccountId?: string;
  tagIds: string[];
  date: string;
  status: TxnStatus;
  notes?: string;
  attachments?: Attachment[];
  recurringId?: string;
  splits?: Split[];
  projected?: boolean;
}

export type Frequency = "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

export interface RecurringRule {
  id: string;
  name: string;
  type: TxnType;
  amount: number;
  currency: Currency;
  categoryId?: string;
  accountId: string;
  toAccountId?: string;
  tagIds: string[];
  notes?: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  /** Stop generating once the rule's account balance reaches this target.
   *  Income rules stop at-or-above; expense rules stop at-or-below.
   *  Priority: endCount > endBalance > endDate > never. */
  endBalance?: number;
  /** Stop generating after this many total occurrences (including past ones). */
  endCount?: number;
  dayOfMonth?: number;
  autopay: boolean;
  active: boolean;
  lastGenerated?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string;
  color: string;
  icon: string;
  accountId?: string;
  contributions: { id: string; date: string; amount: number; note?: string }[];
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: "weekly" | "monthly" | "yearly";
  rollover: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  color?: string;
  tagIds: string[];
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  recurring?: Frequency;
  done: boolean;
  linkedTransactionId?: string;
}

export type ThemeMode = "light" | "dark" | "auto";

import type { ThemeId } from "./themes";

export interface Settings {
  userName: string;
  currency: Currency;
  gradientFrom: string;
  gradientVia: string;
  gradientTo: string;
  themeMode: ThemeMode;
  /** Wave 2: selected theme palette. ThemeMode is the legacy auto/light/dark flag. */
  themeId: ThemeId;
  pinHash?: string;
  pinEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  weekStartsMonday: boolean;
  showProjected: boolean;
  /** Wave 4: when true, agent dispatcher blocks all auto/confirm-tier tool calls. */
  agentKillSwitch?: boolean;
  /** Voice: enable "hey budget" wake-word listener (always-on mic in supported browsers). */
  voiceWakeWordEnabled?: boolean;
  /** Voice: read agent responses aloud via SpeechSynthesis. */
  voiceReadAloud?: boolean;
}

// === Wave 3 · What-If Scenarios ===

export type ProjectionHorizon = "1y" | "5y" | "10y" | "30y" | "all";

export type ScenarioDeltaKind =
  | "income-add"        // recurring positive cashflow
  | "expense-add"       // recurring negative cashflow
  | "expense-remove"    // cancels an existing recurring rule for the period (matched by categoryId) — v1 noop
  | "rate-change"       // multiplier on a category's spending — v1 noop
  | "lump-sum";         // single positive or negative event at delta.date

export interface ScenarioDelta {
  id: string;
  kind: ScenarioDeltaKind;
  amount: number;                    // signed: positive = inflow, negative = outflow (for income-add and lump-sum); for expense-add, positive number counted as expense
  currency: Currency;
  frequency?: Frequency;             // ignored for lump-sum
  categoryId?: string;               // for rate-change + expense-remove
  rateMultiplier?: number;           // for rate-change (e.g. 1.1 = +10%)
  date?: string;                     // for lump-sum
  note?: string;
}

export interface WhatIfScenario {
  id: string;
  householdId: string;
  name: string;
  startDate: string;                 // ISO; deltas start affecting projection here
  endDate?: string;                  // ISO; bounded scenarios end here
  pinned: boolean;
  color: string;
  icon: string;
  deltas: ScenarioDelta[];
  createdAt: string;
  updatedAt: string;
}

// === Wave 4 · AI Agent ===

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
  inverse?: unknown;
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

export interface AppState {
  accounts: Account[];
  categories: Category[];
  currentHouseholdId: string | null;
  tags: Tag[];
  transactions: Transaction[];
  recurring: RecurringRule[];
  goals: SavingsGoal[];
  budgets: Budget[];
  notes: Note[];
  reminders: Reminder[];
  scenarios: WhatIfScenario[];
  activeScenarioIds: string[];
  agentActions: AgentAction[];
  agentMemory: AgentMemory[];
  settings: Settings;
  hydrated: boolean;
}
