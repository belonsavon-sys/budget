import type { RecurringRule, Transaction } from "./types";
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

export function* iterateOccurrences(rule: RecurringRule, until: Date) {
  let cur = new Date(rule.startDate);
  const end = rule.endDate ? new Date(rule.endDate) : null;
  while (cur <= until) {
    if (end && cur > end) break;
    yield new Date(cur);
    cur = addByFrequency(cur, rule.frequency);
  }
}

export function materializeRecurring(
  rules: RecurringRule[],
  existing: Transaction[],
  horizonDays = 365
): Transaction[] {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + horizonDays);
  const generated: Transaction[] = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    const existingForRule = new Set(
      existing.filter((t) => t.recurringId === rule.id).map((t) => t.date.slice(0, 10))
    );
    for (const occ of iterateOccurrences(rule, horizon)) {
      const key = occ.toISOString().slice(0, 10);
      if (existingForRule.has(key)) continue;
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
      existingForRule.add(key);
    }
  }
  return generated;
}
