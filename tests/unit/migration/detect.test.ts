import { describe, it, expect, beforeEach } from "vitest";
import { detectLegacyData } from "../../../lib/migration/detect";
import { LEGACY_STORE_KEY } from "../../../lib/migration/types";

describe("detectLegacyData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns has=false when no localStorage entry exists", () => {
    const r = detectLegacyData();
    expect(r.has).toBe(false);
    expect(r.payload).toBeNull();
    expect(r.counts.transactions).toBe(0);
  });

  it("returns has=false for an empty / defaulted store (no txns, no extra accounts)", () => {
    localStorage.setItem(
      LEGACY_STORE_KEY,
      JSON.stringify({
        state: {
          accounts: [
            { id: "a-checking", name: "Checking", type: "checking", startingBalance: 0,
              currency: "USD", color: "#6366f1", icon: "Wallet", archived: false }
          ],
          categories: [], tags: [], transactions: [], recurring: [],
          goals: [], budgets: [], notes: [], reminders: [],
          settings: {}, hydrated: true,
        },
        version: 0,
      })
    );
    const r = detectLegacyData();
    expect(r.has).toBe(false);
  });

  it("returns has=true when there are real transactions", () => {
    localStorage.setItem(
      LEGACY_STORE_KEY,
      JSON.stringify({
        state: {
          accounts: [], categories: [], tags: [],
          transactions: [
            { id: "x-1", type: "expense", amount: 12.5, currency: "USD",
              description: "coffee", accountId: "a-checking", tagIds: [],
              date: "2026-05-14", status: "paid" }
          ],
          recurring: [], goals: [], budgets: [], notes: [], reminders: [],
          settings: {}, hydrated: true,
        },
        version: 0,
      })
    );
    const r = detectLegacyData();
    expect(r.has).toBe(true);
    expect(r.counts.transactions).toBe(1);
    expect(r.payload?.transactions[0].id).toBe("x-1");
  });

  it("treats malformed JSON as no data", () => {
    localStorage.setItem(LEGACY_STORE_KEY, "{not json");
    expect(detectLegacyData().has).toBe(false);
  });
});
