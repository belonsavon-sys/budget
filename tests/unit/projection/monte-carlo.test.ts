import { describe, it, expect } from "vitest";
import { project } from "../../../lib/projection";
import type { ProjectionInput } from "../../../lib/projection-types";

const baseInput = (): ProjectionInput => ({
  accounts: [
    { id: "a-1", name: "Checking", type: "checking", startingBalance: 0,
      currency: "USD", color: "#000", icon: "Wallet", archived: false },
  ],
  transactions: [
    // Variable history: 6 grocery-like transactions
    { id: "p-1", type: "expense", amount: 80, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2025-12-01", status: "paid" },
    { id: "p-2", type: "expense", amount: 95, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-01-01", status: "paid" },
    { id: "p-3", type: "expense", amount: 110, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-02-01", status: "paid" },
    { id: "p-4", type: "expense", amount: 70, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-03-01", status: "paid" },
    { id: "p-5", type: "expense", amount: 105, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-04-01", status: "paid" },
    { id: "p-6", type: "expense", amount: 88, currency: "USD",
      description: "groc", accountId: "a-1", tagIds: [], date: "2026-05-01", status: "paid" },
  ],
  recurring: [
    { id: "r-1", name: "Salary", type: "income", amount: 5000, currency: "USD",
      accountId: "a-1", tagIds: [], frequency: "monthly", startDate: "2025-01-01",
      autopay: true, active: true, dayOfMonth: 1 },
  ],
  scenarios: [],
});

describe("project — Monte Carlo confidence band", () => {
  it("with mcPaths=0, band collapses to the deterministic line", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 0 });
    for (const p of snap.points) {
      expect(p.bandLo).toBe(p.value);
      expect(p.bandHi).toBe(p.value);
    }
  });

  it("with mcPaths=500 and a fixed seed, band is wider on future points than on past", () => {
    const snap = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 500, mcSeed: 42 });
    const nowIdx = snap.points.findIndex(p => p.date === snap.nowDate);
    const earliestPast = snap.points[0];
    const latestFuture = snap.points[snap.points.length - 1];
    expect(earliestPast.bandHi - earliestPast.bandLo).toBe(0);  // past is deterministic
    expect(latestFuture.bandHi - latestFuture.bandLo).toBeGreaterThan(0);
    // bandLo <= value <= bandHi
    expect(latestFuture.bandLo).toBeLessThanOrEqual(latestFuture.value);
    expect(latestFuture.bandHi).toBeGreaterThanOrEqual(latestFuture.value);
  });

  it("with the same seed and inputs, two runs produce identical band points", () => {
    const a = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 500, mcSeed: 42 });
    const b = project(baseInput(), { horizon: "1y", now: "2026-05-14", mcPaths: 500, mcSeed: 42 });
    for (let i = 0; i < a.points.length; i++) {
      expect(a.points[i].bandLo).toBeCloseTo(b.points[i].bandLo, 6);
      expect(a.points[i].bandHi).toBeCloseTo(b.points[i].bandHi, 6);
    }
  });
});
