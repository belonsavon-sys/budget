import { describe, it, expect, beforeEach } from "vitest";
import { OfflineQueue, type PendingOp } from "../../../lib/sync/offline-queue";

const op = (table: string, kind: PendingOp["kind"], row: object): Omit<PendingOp, "id" | "queuedAt"> => ({
  table, kind, row,
});

describe("OfflineQueue", () => {
  let q: OfflineQueue;

  beforeEach(async () => {
    q = new OfflineQueue("test-q-" + Math.random().toString(36).slice(2));
    await q.clear();
  });

  it("starts empty", async () => {
    expect(await q.size()).toBe(0);
    expect(await q.list()).toEqual([]);
  });

  it("enqueues and assigns ids in order", async () => {
    await q.enqueue(op("transactions", "upsert", { id: "x-1", amount: 10 }));
    await q.enqueue(op("transactions", "upsert", { id: "x-2", amount: 20 }));
    const items = await q.list();
    expect(items.length).toBe(2);
    expect(items[0].row).toMatchObject({ id: "x-1" });
    expect(items[1].row).toMatchObject({ id: "x-2" });
    expect(items[0].id < items[1].id).toBe(true);
  });

  it("removeIds deletes specific entries", async () => {
    const a = await q.enqueue(op("transactions", "upsert", { id: "x-1" }));
    const b = await q.enqueue(op("transactions", "upsert", { id: "x-2" }));
    await q.removeIds([a]);
    const items = await q.list();
    expect(items.map(i => i.id)).toEqual([b]);
  });

  it("clear empties the queue", async () => {
    await q.enqueue(op("transactions", "upsert", { id: "x-1" }));
    await q.clear();
    expect(await q.size()).toBe(0);
  });
});
