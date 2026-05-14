"use client";
import { getBrowserSupabase } from "../db";
import type { Database } from "../db.types";
import { useStore } from "../store";
import { OfflineQueue, type PendingOp } from "./offline-queue";
import { rowToApp, appToRow, tableToSlice } from "./sync-bindings";

type DB = Database["public"]["Tables"];
type AppTable = keyof typeof rowToApp;

const queue = new OfflineQueue();

/** Pull every row from Supabase for the given household into the store. */
export async function pullInitial(householdId: string) {
  const sb = getBrowserSupabase();
  const tables = Object.keys(rowToApp) as AppTable[];
  const next: Record<string, unknown[]> = {};
  for (const t of tables) {
    const { data, error } = await sb
      .from(t)
      .select("*")
      .eq("household_id", householdId)
      .is("deleted_at", null);
    if (error) {
      console.warn("pullInitial", t, error.message);
      next[tableToSlice[t]] = [];
      continue;
    }
    next[tableToSlice[t]] = (data ?? []).map((row) => (rowToApp[t] as (r: unknown) => unknown)(row));
  }
  useStore.setState(next as never);
}

interface UpsertArgs<T extends AppTable> {
  table: T;
  row: DB[T]["Insert"];
}
interface DeleteArgs<T extends AppTable> {
  table: T;
  id: string;
}

export async function upsertRow<T extends AppTable>({ table, row }: UpsertArgs<T>) {
  const sb = getBrowserSupabase();
  try {
    if (!navigator.onLine) throw new Error("offline");
    const { error } = await sb.from(table).upsert(row as never, { onConflict: "id" });
    if (error) throw error;
  } catch {
    await queue.enqueue({ table, kind: "upsert", row: row as object });
  }
}

export async function deleteRow<T extends AppTable>({ table, id }: DeleteArgs<T>) {
  const sb = getBrowserSupabase();
  try {
    if (!navigator.onLine) throw new Error("offline");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (sb as any).from(table)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } catch {
    await queue.enqueue({ table, kind: "delete", row: { id } });
  }
}

/** Replay queued ops in FIFO. Called on reconnect. */
export async function flushQueue() {
  const sb = getBrowserSupabase();
  const items = await queue.list();
  if (items.length === 0) return { sent: 0, failed: 0 };
  let sent = 0, failed = 0;
  const ok: number[] = [];
  for (const item of items as PendingOp[]) {
    let err: unknown = null;
    if (item.kind === "upsert") {
      const { error } = await sb.from(item.table).upsert(item.row as never, { onConflict: "id" });
      err = error;
    } else {
      const { error } = await sb
        .from(item.table)
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", (item.row as { id: string }).id);
      err = error;
    }
    if (err) { failed++; } else { sent++; ok.push(item.id); }
  }
  if (ok.length) await queue.removeIds(ok);
  return { sent, failed };
}

/** Wire `online` events to drive flushQueue. Call once at app startup. */
export function installOnlineFlusher() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => { flushQueue().catch(() => {}); });
}

export { appToRow, rowToApp, tableToSlice };
