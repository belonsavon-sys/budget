"use client";
import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "./db";
import type { Database } from "./db.types";

type TableName = keyof Database["public"]["Tables"];

interface UseRealtimeOpts<T extends TableName> {
  table: T;
  householdId: string | null;
  onInsert?: (row: Database["public"]["Tables"][T]["Row"]) => void;
  onUpdate?: (row: Database["public"]["Tables"][T]["Row"]) => void;
  onDelete?: (row: Database["public"]["Tables"][T]["Row"]) => void;
}

export function useRealtime<T extends TableName>(opts: UseRealtimeOpts<T>) {
  useEffect(() => {
    if (!opts.householdId) return;
    const sb = getBrowserSupabase();
    const channel = sb
      .channel(`realtime:${String(opts.table)}:${opts.householdId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: String(opts.table),
          filter: `household_id=eq.${opts.householdId}`,
        },
        (payload: RealtimePostgresChangesPayload<Database["public"]["Tables"][T]["Row"]>) => {
          if (payload.eventType === "INSERT" && opts.onInsert) {
            opts.onInsert(payload.new as Database["public"]["Tables"][T]["Row"]);
          } else if (payload.eventType === "UPDATE" && opts.onUpdate) {
            opts.onUpdate(payload.new as Database["public"]["Tables"][T]["Row"]);
          } else if (payload.eventType === "DELETE" && opts.onDelete) {
            opts.onDelete(payload.old as Database["public"]["Tables"][T]["Row"]);
          }
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.table, opts.householdId]);
}
