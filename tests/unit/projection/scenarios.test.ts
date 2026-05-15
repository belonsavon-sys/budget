import { describe, it, expect } from "vitest";
import { project } from "../../../lib/projection";
import type { ProjectionInput } from "../../../lib/projection-types";
import type { WhatIfScenario } from "../../../lib/types";

const baseInput = (): ProjectionInput => ({
  accounts: [
    { id: "a-1", name: "Checking", type: "checking", startingBalance: 0,
      currency: "USD", color: "#000", icon: "Wallet", archived: false },
  ],
  transactions: [],
  recurring: [
    { id: "r-1", name: "Salary", type: "income", amount: 5000, currency: "USD",
      accountId: "a-1", tagIds: [], frequency: "monthly", startDate: "2025-01-01",
      autopay: true, active: true, dayOfMonth: 1 },
  ],
  scenarios: [],
});

const raise: WhatIfScenario = {
  id: "s-raise", householdId: "h-1", name: "Raise",
  startDate: "2026-09-01", pinned: true, color: "#c2410c", icon: "ArrowUp",
  deltas: [
    { id: "d-1", kind: "income-add", amount: 1000, currency: "USD", frequency: "monthly" },
  ],
  createdAt: "2026-05-14T00:00:00Z", updatedAt: "2026-05-14T00:00:00Z",
};

describe("project — with scenarios", () => {
  it("baseline recurring increases future value monthly", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    // 12 months out: ~5 paychecks landed (Jun 1, Jul 1, Aug 1, Sep 1, Oct 1, Nov 1, Dec 1, Jan 1, Feb 1, Mar 1, Apr 1, May 1)
    expect(snap.finalValue).toBeGreaterThan(50000);
  });

  it("active scenario adds an income-add delta from its startDate", () => {
    const input = { ...baseInput(), scenarios: [raise] };
    const without = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: [] });
    const withRaise = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: ["s-raise"] });
    expect(withRaise.finalValue).toBeGreaterThan(without.finalValue);
    // From Sep 1 to May 1 of next year = ~8 raise-paychecks of $1000 each
    expect(withRaise.finalValue - without.finalValue).toBeGreaterThanOrEqual(8000);
    expect(withRaise.finalValue - without.finalValue).toBeLessThanOrEqual(9500);
  });

  it("lump-sum delta lands exactly on its date", () => {
    const lump: WhatIfScenario = {
      id: "s-lump", householdId: "h-1", name: "Bonus",
      startDate: "2026-07-15", pinned: false, color: "#c2410c", icon: "Gift",
      deltas: [
        { id: "d-1", kind: "lump-sum", amount: 10000, currency: "USD", date: "2026-07-15" },
      ],
      createdAt: "2026-05-14T00:00:00Z", updatedAt: "2026-05-14T00:00:00Z",
    };
    const input = { ...baseInput(), scenarios: [lump] };
    const snap = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: ["s-lump"] });
    expect(snap.finalValue).toBeGreaterThan(60000);  // baseline ~60k + 10k bonus
  });

  it("inactive scenario doesn't affect projection", () => {
    const input = { ...baseInput(), scenarios: [raise] };
    const withRaise = project(input, { horizon: "1y", now: "2026-05-14", activeScenarioIds: [] });
    const withoutScenarios = project(baseInput(), { horizon: "1y", now: "2026-05-14" });
    expect(withRaise.finalValue).toBe(withoutScenarios.finalValue);
  });
});
