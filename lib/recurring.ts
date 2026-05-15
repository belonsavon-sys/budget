import type { Account, RecurringRule, Transaction } from "./types";
import { uid } from "./utils";

function addByFrequency(date: Date, freq: RecurringRule["frequency"]) {
  const d = new Date(date);
  switch (freq) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

/**
 * Iterate occurrences of a rule up to the given horizon, honoring end_date.
 * end_count and end_balance are enforced by the caller (materializeRecurring)
 * because they depend on cumulative state.
 */
export function* iterateOccurrences(rule: RecurringRule, until: Date) {
  let cur = new Date(rule.startDate);
  const end = rule.endDate ? new Date(rule.endDate) : null;
  while (cur <= until) {
    if (end && cur > end) break;
    yield new Date(cur);
    cur = addByFrequency(cur, rule.frequency);
  }
}

function signedAmount(type: RecurringRule["type"], amount: number): number {
  if (type === "income") return amount;
  if (type === "expense") return -amount;
  return 0;
}

/** Should we stop at this projected balance for this rule? */
function balanceTerminated(
  rule: RecurringRule,
  projectedBalance: number
): boolean {
  if (rule.endBalance == null) return false;
  // Income rules accumulate the balance UP toward the target — stop at-or-above.
  // Expense rules drag the balance DOWN — stop at-or-below.
  if (rule.type === "income") return projectedBalance >= rule.endBalance;
  if (rule.type === "expense") return projectedBalance <= rule.endBalance;
  return false;
}

export function materializeRecurring(
  rules: RecurringRule[],
  existing: Transaction[],
  horizonDays = 365,
  accounts: Account[] = []
): Transaction[] {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);
  const generated: Transaction[] = [];

  // Pre-compute baseline balance per account from real (non-projected) transactions.
  // This is the balance "as of now"; rule occurrences then push it around in order.
  const balanceByAccount = new Map<string, number>();
  for (const a of accounts) {
    balanceByAccount.set(a.id, a.startingBalance);
  }
  for (const t of existing) {
    if (t.status === "projected") continue;
    const cur = balanceByAccount.get(t.accountId) ?? 0;
    balanceByAccount.set(t.accountId, cur + signedAmount(t.type, t.amount));
  }

  for (const rule of rules) {
    if (!rule.active) continue;
    const existingForRule = existing.filter((t) => t.recurringId === rule.id);
    const existingDates = new Set(existingForRule.map((t) => t.date.slice(0, 10)));
    let countSoFar = existingForRule.length;
    // Track this rule's running balance separately so we can short-circuit on end_balance
    // without polluting the shared map until we commit each occurrence.
    let runningBalance = balanceByAccount.get(rule.accountId) ?? 0;

    for (const occ of iterateOccurrences(rule, horizon)) {
      // end_count: hard cap on total occurrences (including already-materialized past ones)
      if (rule.endCount != null && countSoFar >= rule.endCount) break;

      const key = occ.toISOString().slice(0, 10);
      if (existingDates.has(key)) {
        // Already materialized this date — count it but don't regenerate.
        countSoFar++;
        continue;
      }

      // Compute the balance AFTER this occurrence and decide whether to stop.
      const nextBalance = runningBalance + signedAmount(rule.type, rule.amount);
      const wouldTerminate = balanceTerminated(rule, nextBalance);

      const isPast = occ <= now;
      const status: Transaction["status"] = isPast
        ? rule.autopay
          ? rule.type === "income"
            ? "received"
            : "paid"
          : "pending"
        : "projected";

      generated.push({
        id: uid("r"),
        type: rule.type,
        amount: rule.amount,
        currency: rule.currency,
        description: rule.name,
        categoryId: rule.categoryId,
        accountId: rule.accountId,
        toAccountId: rule.toAccountId,
        tagIds: rule.tagIds,
        date: occ.toISOString(),
        status,
        notes: rule.notes,
        recurringId: rule.id,
        projected: !isPast,
      });
      existingDates.add(key);
      countSoFar++;
      runningBalance = nextBalance;
      balanceByAccount.set(rule.accountId, runningBalance);

      // Stop after committing the occurrence that hit the target.
      if (wouldTerminate) break;
    }
  }
  return generated;
}
