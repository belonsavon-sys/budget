"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppState,
  Account,
  Category,
  Tag,
  Transaction,
  RecurringRule,
  SavingsGoal,
  Budget,
  Note,
  Reminder,
  Settings,
} from "./types";
import { uid } from "./utils";
import { materializeRecurring } from "./recurring";

const defaultCategories: Category[] = [
  { id: "c-food", name: "Food & Drink", icon: "Utensils", color: "#f59e0b", type: "expense" },
  { id: "c-groceries", name: "Groceries", icon: "ShoppingCart", color: "#10b981", type: "expense" },
  { id: "c-rent", name: "Rent", icon: "Home", color: "#ef4444", type: "expense" },
  { id: "c-utilities", name: "Utilities", icon: "Zap", color: "#eab308", type: "expense" },
  { id: "c-transport", name: "Transport", icon: "Car", color: "#3b82f6", type: "expense" },
  { id: "c-subs", name: "Subscriptions", icon: "Repeat", color: "#a855f7", type: "expense" },
  { id: "c-fun", name: "Entertainment", icon: "Music", color: "#ec4899", type: "expense" },
  { id: "c-health", name: "Health", icon: "Heart", color: "#14b8a6", type: "expense" },
  { id: "c-shop", name: "Shopping", icon: "ShoppingBag", color: "#8b5cf6", type: "expense" },
  { id: "c-travel", name: "Travel", icon: "Plane", color: "#06b6d4", type: "expense" },
  { id: "c-edu", name: "Education", icon: "GraduationCap", color: "#6366f1", type: "expense" },
  { id: "c-gift", name: "Gifts", icon: "Gift", color: "#f43f5e", type: "expense" },
  { id: "c-salary", name: "Salary", icon: "Briefcase", color: "#22c55e", type: "income" },
  { id: "c-freelance", name: "Freelance", icon: "Laptop", color: "#16a34a", type: "income" },
  { id: "c-invest", name: "Investments", icon: "TrendingUp", color: "#0ea5e9", type: "income" },
  { id: "c-other-in", name: "Other Income", icon: "Coins", color: "#84cc16", type: "income" },
  { id: "c-other-out", name: "Other", icon: "MoreHorizontal", color: "#94a3b8", type: "expense" },
];

const defaultAccounts: Account[] = [
  {
    id: "a-checking",
    name: "Checking",
    type: "checking",
    startingBalance: 0,
    currency: "USD",
    color: "#6366f1",
    icon: "Wallet",
    archived: false,
  },
];

const defaultSettings: Settings = {
  userName: "",
  currency: "USD",
  gradientFrom: "#a78bfa",
  gradientVia: "#f472b6",
  gradientTo: "#fb923c",
  themeMode: "auto",
  pinEnabled: false,
  soundEnabled: false,
  hapticsEnabled: true,
  weekStartsMonday: false,
  showProjected: true,
};

export interface StoreActions {
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, a: Partial<Account>) => void;
  removeAccount: (id: string) => void;

  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (id: string, c: Partial<Category>) => void;
  removeCategory: (id: string) => void;

  addTag: (t: Omit<Tag, "id">) => void;
  updateTag: (id: string, t: Partial<Tag>) => void;
  removeTag: (id: string) => void;

  addTransaction: (t: Omit<Transaction, "id">) => Transaction;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  bulkSetStatus: (ids: string[], status: Transaction["status"]) => void;

  addRecurring: (r: Omit<RecurringRule, "id">) => void;
  updateRecurring: (id: string, r: Partial<RecurringRule>) => void;
  removeRecurring: (id: string) => void;
  generateRecurring: () => void;

  addGoal: (g: Omit<SavingsGoal, "id" | "contributions" | "current">) => void;
  updateGoal: (id: string, g: Partial<SavingsGoal>) => void;
  contributeToGoal: (id: string, amount: number, note?: string) => void;
  removeGoal: (id: string) => void;

  addBudget: (b: Omit<Budget, "id">) => void;
  updateBudget: (id: string, b: Partial<Budget>) => void;
  removeBudget: (id: string) => void;

  addNote: (n: Omit<Note, "id" | "createdAt" | "updatedAt">) => void;
  updateNote: (id: string, n: Partial<Note>) => void;
  removeNote: (id: string) => void;

  addReminder: (r: Omit<Reminder, "id">) => void;
  updateReminder: (id: string, r: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;

  updateSettings: (s: Partial<Settings>) => void;

  exportData: () => string;
  importData: (json: string, mode: "merge" | "replace") => { ok: boolean; error?: string };
  resetAll: () => void;
}

export type Store = AppState & StoreActions;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      accounts: defaultAccounts,
      categories: defaultCategories,
      tags: [],
      transactions: [],
      recurring: [],
      goals: [],
      budgets: [],
      notes: [],
      reminders: [],
      settings: defaultSettings,
      hydrated: false,

      addAccount: (a) =>
        set((s) => ({ accounts: [...s.accounts, { ...a, id: uid("a") }] })),
      updateAccount: (id, a) =>
        set((s) => ({
          accounts: s.accounts.map((x) => (x.id === id ? { ...x, ...a } : x)),
        })),
      removeAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((x) => x.id !== id) })),

      addCategory: (c) =>
        set((s) => ({ categories: [...s.categories, { ...c, id: uid("c") }] })),
      updateCategory: (id, c) =>
        set((s) => ({
          categories: s.categories.map((x) => (x.id === id ? { ...x, ...c } : x)),
        })),
      removeCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((x) => x.id !== id) })),

      addTag: (t) => set((s) => ({ tags: [...s.tags, { ...t, id: uid("t") }] })),
      updateTag: (id, t) =>
        set((s) => ({ tags: s.tags.map((x) => (x.id === id ? { ...x, ...t } : x)) })),
      removeTag: (id) => set((s) => ({ tags: s.tags.filter((x) => x.id !== id) })),

      addTransaction: (t) => {
        const txn: Transaction = { ...t, id: uid("x") };
        set((s) => ({ transactions: [...s.transactions, txn] }));
        return txn;
      },
      updateTransaction: (id, t) =>
        set((s) => ({
          transactions: s.transactions.map((x) => (x.id === id ? { ...x, ...t } : x)),
        })),
      removeTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((x) => x.id !== id) })),
      bulkSetStatus: (ids, status) =>
        set((s) => ({
          transactions: s.transactions.map((x) =>
            ids.includes(x.id) ? { ...x, status } : x
          ),
        })),

      addRecurring: (r) => {
        const rule: RecurringRule = { ...r, id: uid("rr") };
        set((s) => ({ recurring: [...s.recurring, rule] }));
        get().generateRecurring();
      },
      updateRecurring: (id, r) =>
        set((s) => ({
          recurring: s.recurring.map((x) => (x.id === id ? { ...x, ...r } : x)),
        })),
      removeRecurring: (id) =>
        set((s) => ({
          recurring: s.recurring.filter((x) => x.id !== id),
          transactions: s.transactions.filter((t) => t.recurringId !== id),
        })),
      generateRecurring: () => {
        const { recurring, transactions } = get();
        const newOnes = materializeRecurring(recurring, transactions);
        if (newOnes.length) set((s) => ({ transactions: [...s.transactions, ...newOnes] }));
      },

      addGoal: (g) =>
        set((s) => ({
          goals: [...s.goals, { ...g, id: uid("g"), current: 0, contributions: [] }],
        })),
      updateGoal: (id, g) =>
        set((s) => ({ goals: s.goals.map((x) => (x.id === id ? { ...x, ...g } : x)) })),
      contributeToGoal: (id, amount, note) =>
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
        })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((x) => x.id !== id) })),

      addBudget: (b) =>
        set((s) => ({ budgets: [...s.budgets, { ...b, id: uid("b") }] })),
      updateBudget: (id, b) =>
        set((s) => ({
          budgets: s.budgets.map((x) => (x.id === id ? { ...x, ...b } : x)),
        })),
      removeBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((x) => x.id !== id) })),

      addNote: (n) => {
        const now = new Date().toISOString();
        set((s) => ({
          notes: [...s.notes, { ...n, id: uid("n"), createdAt: now, updatedAt: now }],
        }));
      },
      updateNote: (id, n) =>
        set((s) => ({
          notes: s.notes.map((x) =>
            x.id === id ? { ...x, ...n, updatedAt: new Date().toISOString() } : x
          ),
        })),
      removeNote: (id) => set((s) => ({ notes: s.notes.filter((x) => x.id !== id) })),

      addReminder: (r) =>
        set((s) => ({ reminders: [...s.reminders, { ...r, id: uid("rm") }] })),
      updateReminder: (id, r) =>
        set((s) => ({
          reminders: s.reminders.map((x) => (x.id === id ? { ...x, ...r } : x)),
        })),
      removeReminder: (id) =>
        set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) })),

      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),

      exportData: () => {
        const {
          accounts,
          categories,
          tags,
          transactions,
          recurring,
          goals,
          budgets,
          notes,
          reminders,
          settings,
        } = get();
        return JSON.stringify(
          {
            version: 1,
            exportedAt: new Date().toISOString(),
            accounts,
            categories,
            tags,
            transactions,
            recurring,
            goals,
            budgets,
            notes,
            reminders,
            settings,
          },
          null,
          2
        );
      },
      importData: (json, mode) => {
        try {
          const data = JSON.parse(json);
          if (mode === "replace") {
            set({
              accounts: data.accounts ?? [],
              categories: data.categories ?? [],
              tags: data.tags ?? [],
              transactions: data.transactions ?? [],
              recurring: data.recurring ?? [],
              goals: data.goals ?? [],
              budgets: data.budgets ?? [],
              notes: data.notes ?? [],
              reminders: data.reminders ?? [],
              settings: { ...defaultSettings, ...(data.settings ?? {}) },
            });
          } else {
            const cur = get();
            const mergeBy = <T extends { id: string }>(a: T[], b: T[]) => {
              const map = new Map(a.map((x) => [x.id, x]));
              for (const x of b) map.set(x.id, x);
              return Array.from(map.values());
            };
            set({
              accounts: mergeBy(cur.accounts, data.accounts ?? []),
              categories: mergeBy(cur.categories, data.categories ?? []),
              tags: mergeBy(cur.tags, data.tags ?? []),
              transactions: mergeBy(cur.transactions, data.transactions ?? []),
              recurring: mergeBy(cur.recurring, data.recurring ?? []),
              goals: mergeBy(cur.goals, data.goals ?? []),
              budgets: mergeBy(cur.budgets, data.budgets ?? []),
              notes: mergeBy(cur.notes, data.notes ?? []),
              reminders: mergeBy(cur.reminders, data.reminders ?? []),
            });
          }
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      resetAll: () =>
        set({
          accounts: defaultAccounts,
          categories: defaultCategories,
          tags: [],
          transactions: [],
          recurring: [],
          goals: [],
          budgets: [],
          notes: [],
          reminders: [],
          settings: defaultSettings,
        }),
    }),
    {
      name: "budget-store-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.generateRecurring();
        if (state) state.hydrated = true;
      },
    }
  )
);
