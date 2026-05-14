import type { Database, Json } from "../db.types";
import type { LegacyPayload } from "./types";

// Supabase client type unifying across @supabase/ssr's browser/server clients.
// The two libraries' generic arities have shifted between versions; keeping this
// opaque at the migration boundary avoids the union-arity headache without
// affecting runtime behaviour. The pure mapper is fully typed; only the
// orchestrator-side .from()/.upsert() calls fall back to `as never` on rows.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type DB = Database["public"]["Tables"];
type Insert<T extends keyof DB> = DB[T]["Insert"];

export interface InsertBundle {
  accounts: Insert<"accounts">[];
  categories: Insert<"categories">[];
  tags: Insert<"tags">[];
  transactions: Insert<"transactions">[];
  recurring_rules: Insert<"recurring_rules">[];
  savings_goals: Insert<"savings_goals">[];
  budgets: Insert<"budgets">[];
  notes: Insert<"notes">[];
  reminders: Insert<"reminders">[];
}

/** Pure mapping: legacy TS payload → snake_case DB rows tagged with household_id. */
export function mapPayloadToInserts(p: LegacyPayload, householdId: string): InsertBundle {
  return {
    accounts: p.accounts.map((a) => ({
      id: a.id, household_id: householdId, name: a.name, type: a.type,
      starting_balance: a.startingBalance, currency: a.currency, color: a.color,
      icon: a.icon, archived: a.archived,
    })),
    categories: p.categories.map((c) => ({
      id: c.id, household_id: householdId, name: c.name, icon: c.icon, color: c.color, type: c.type,
    })),
    tags: p.tags.map((t) => ({
      id: t.id, household_id: householdId, name: t.name, color: t.color,
    })),
    transactions: p.transactions.map((x) => ({
      id: x.id, household_id: householdId, type: x.type, amount: x.amount,
      currency: x.currency, description: x.description, category_id: x.categoryId ?? null,
      account_id: x.accountId, to_account_id: x.toAccountId ?? null,
      tag_ids: x.tagIds, date: x.date, status: x.status, notes: x.notes ?? null,
      attachments: (x.attachments ?? null) as Json | null, recurring_id: x.recurringId ?? null,
      splits: (x.splits ?? null) as Json | null, projected: x.projected ?? false,
    })),
    recurring_rules: p.recurring.map((r) => ({
      id: r.id, household_id: householdId, name: r.name, type: r.type, amount: r.amount,
      currency: r.currency, category_id: r.categoryId ?? null, account_id: r.accountId,
      to_account_id: r.toAccountId ?? null, tag_ids: r.tagIds, notes: r.notes ?? null,
      frequency: r.frequency, start_date: r.startDate, end_date: r.endDate ?? null,
      day_of_month: r.dayOfMonth ?? null, autopay: r.autopay, active: r.active,
      last_generated: r.lastGenerated ?? null,
    })),
    savings_goals: p.goals.map((g) => ({
      id: g.id, household_id: householdId, name: g.name, target: g.target,
      current: g.current, deadline: g.deadline ?? null, color: g.color, icon: g.icon,
      account_id: g.accountId ?? null, contributions: g.contributions as Json,
    })),
    budgets: p.budgets.map((b) => ({
      id: b.id, household_id: householdId, category_id: b.categoryId,
      amount: b.amount, period: b.period, rollover: b.rollover,
    })),
    notes: p.notes.map((n) => ({
      id: n.id, household_id: householdId, title: n.title, content: n.content,
      pinned: n.pinned, color: n.color ?? null, tag_ids: n.tagIds,
    })),
    reminders: p.reminders.map((r) => ({
      id: r.id, household_id: householdId, title: r.title, date: r.date,
      recurring: r.recurring ?? null, done: r.done,
      linked_transaction_id: r.linkedTransactionId ?? null,
    })),
  };
}

/** Orchestrator: insert every row in batched upserts. Returns counts per table. */
export async function importLocalToSupabase(
  payload: LegacyPayload,
  householdId: string,
  client: AnySupabaseClient
): Promise<{ inserted: Record<keyof InsertBundle, number>; errors: string[] }> {
  const bundle = mapPayloadToInserts(payload, householdId);
  const errors: string[] = [];
  const inserted: Record<keyof InsertBundle, number> = {
    accounts: 0, categories: 0, tags: 0, transactions: 0, recurring_rules: 0,
    savings_goals: 0, budgets: 0, notes: 0, reminders: 0,
  };

  // Parents first, then transactions, then dependents.
  const order: (keyof InsertBundle)[] = [
    "accounts", "categories", "tags",
    "recurring_rules", "savings_goals", "budgets",
    "transactions", "notes", "reminders",
  ];

  for (const table of order) {
    const rows = bundle[table];
    if (rows.length === 0) continue;
    const { error, count } = await client
      .from(table)
      .upsert(rows as never, { onConflict: "id", count: "exact" });
    if (error) {
      errors.push(`${table}: ${error.message}`);
    } else {
      inserted[table] = count ?? rows.length;
    }
  }
  return { inserted, errors };
}
