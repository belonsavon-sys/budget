import { describe, it, expect } from "vitest";
import { project } from "../../../lib/projection";
import type { ProjectionInput } from "../../../lib/projection-types";

const HID = "h-1";

const baseInput = (): ProjectionInput => ({
  accounts: [
    { id: "a-1", name: "Checking", type: "checking", startingBalance: 1000,
      currency: "USD", color: "#000", icon: "Wallet", archived: false },
  ],
  transactions: [
    // Past txn: +500 income
    { id: "p-1", type: "income", amount: 500, currency: "USD",
      description: "paycheck", accountId: "a-1", tagIds: [],
      date: "2026-04-15", status: "received" },
    // Past txn: -100 expense
    { id: "p-2", type: "expense", amount: 100, currency: "USD",
      description: "groceries", accountId: "a-1", tagIds: [],
      date: "2026-05-01", status: "paid" },
  ],
  recurring: [],
  scenarios: [],
});

describe("project — baseline (no recurring, no scenarios)", () => {
  it("returns a snapshot with horizon and now", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    expect(snap.horizon).toBe("1y");
    expect(snap.nowDate).toBe("2026-05-14");
    expect(snap.points.length).toBeGreaterThan(0);
  });

  it("baseline net worth = starting + sum(past txns through now)", () => {
    // 1000 (starting) + 500 (paycheck) - 100 (groceries) = 1400
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    expect(snap.baseline).toBe(1400);
  });

  it("flat future (no recurring) stays at baseline", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    const last = snap.points[snap.points.length - 1];
    expect(last.value).toBe(1400);
  });

  it("ignores transactions dated after now (they're projections, not history)", () => {
    const input = baseInput();
    input.transactions.push({
      id: "f-1", type: "expense", amount: 999, currency: "USD",
      description: "future", accountId: "a-1", tagIds: [],
      date: "2026-06-01", status: "projected",
    });
    const snap = project(input, { horizon: "1y", now: "2026-05-14" });
    expect(snap.baseline).toBe(1400);
  });

  it("includes archived account in baseline if it has transactions", () => {
    const input = baseInput();
    input.accounts.push({
      id: "a-2", name: "Old", type: "savings", startingBalance: 200,
      currency: "USD", color: "#000", icon: "PiggyBank", archived: true,
    });
    const snap = project(input, { horizon: "1y", now: "2026-05-14" });
    expect(snap.baseline).toBe(1600);  // 1000+500-100+200
  });
});
