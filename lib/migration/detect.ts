import { LEGACY_STORE_KEY, type LegacyDataReport, type LegacyPayload } from "./types";

function emptyReport(): LegacyDataReport {
  return {
    has: false,
    payload: null,
    counts: {
      accounts: 0, categories: 0, tags: 0, transactions: 0,
      recurring: 0, goals: 0, budgets: 0, notes: 0, reminders: 0,
    },
  };
}

export function detectLegacyData(): LegacyDataReport {
  if (typeof localStorage === "undefined") return emptyReport();
  const raw = localStorage.getItem(LEGACY_STORE_KEY);
  if (!raw) return emptyReport();

  let parsed: { state?: Partial<LegacyPayload> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyReport();
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
    // Cast is intentional: we accept malformed/partial settings so detection never throws.
    // Callers must treat payload.settings fields as possibly undefined.
    settings: s.settings ?? ({} as LegacyPayload["settings"]),
  };

  // "Has data" means any of the user-content arrays are non-empty.
  // The default starter ships with one Checking account + default categories — we ignore both.
  // Note: categories are excluded entirely because the default store seeds 17 of them
  // (see defaultCategories in store.ts). Including them would always return has=true.
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
