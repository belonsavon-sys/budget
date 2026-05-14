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
