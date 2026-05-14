import { describe, it, expect } from "vitest";
import { mapPayloadToInserts } from "../../../lib/migration/import";
import type { LegacyPayload } from "../../../lib/migration/types";

const HID = "11111111-1111-1111-1111-111111111111";

const samplePayload = (): LegacyPayload => ({
  accounts: [
    { id: "a-1", name: "Main", type: "checking", startingBalance: 100,
      currency: "USD", color: "#000", icon: "Wallet", archived: false }
  ],
  categories: [
    { id: "c-1", name: "Food", icon: "Utensils", color: "#f59e0b", type: "expense" }
  ],
  tags: [{ id: "t-1", name: "fun", color: "#a78bfa" }],
  transactions: [
    { id: "x-1", type: "expense", amount: 12.5, currency: "USD",
      description: "coffee", accountId: "a-1", categoryId: "c-1",
      tagIds: ["t-1"], date: "2026-05-14T00:00:00Z", status: "paid" }
  ],
  recurring: [],
  goals: [],
  budgets: [],
  notes: [],
  reminders: [],
  settings: {
    userName: "Pierre", currency: "USD", gradientFrom: "#a78bfa", gradientVia: "#f472b6",
    gradientTo: "#fb923c", themeMode: "auto", themeId: "architectural", pinEnabled: false, soundEnabled: false,
    hapticsEnabled: true, weekStartsMonday: false, showProjected: true,
  },
});

describe("mapPayloadToInserts", () => {
  it("attaches household_id to every row", () => {
    const inserts = mapPayloadToInserts(samplePayload(), HID);
    expect(inserts.accounts[0].household_id).toBe(HID);
    expect(inserts.transactions[0].household_id).toBe(HID);
    expect(inserts.categories[0].household_id).toBe(HID);
    expect(inserts.tags[0].household_id).toBe(HID);
  });

  it("renames camelCase TS fields to snake_case DB columns", () => {
    const inserts = mapPayloadToInserts(samplePayload(), HID);
    expect(inserts.accounts[0]).toMatchObject({
      id: "a-1",
      starting_balance: 100,
      household_id: HID,
    });
    expect(inserts.transactions[0]).toMatchObject({
      id: "x-1",
      account_id: "a-1",
      category_id: "c-1",
      tag_ids: ["t-1"],
    });
  });

  it("emits empty arrays for tables with no rows", () => {
    const inserts = mapPayloadToInserts(samplePayload(), HID);
    expect(inserts.recurring_rules).toEqual([]);
    expect(inserts.savings_goals).toEqual([]);
    expect(inserts.budgets).toEqual([]);
    expect(inserts.notes).toEqual([]);
    expect(inserts.reminders).toEqual([]);
  });
});
