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
  settings: Settings;
  hydrated: boolean;
}
