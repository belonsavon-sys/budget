"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "../db";
import { useAuth } from "../auth/context";
import { ensureDefaultHousehold } from "./bootstrap";
import { useStore } from "../store";
import { pullInitial, installOnlineFlusher, flushQueue, rowToApp, tableToSlice } from "../sync/sync-engine";

interface HouseholdState {
  householdId: string | null;
  isNew: boolean;
  loading: boolean;
}

const Ctx = createContext<HouseholdState>({ householdId: null, isNew: false, loading: false });

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<HouseholdState>({ householdId: null, isNew: false, loading: false });

  useEffect(() => { installOnlineFlusher(); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      useStore.getState().setCurrentHousehold(null);
      setState({ householdId: null, isNew: false, loading: false });
      return;
    }
    let cancelled = false;
    let channelRef: ReturnType<ReturnType<typeof getBrowserSupabase>["channel"]> | null = null;
    setState((s) => ({ ...s, loading: true }));
    const sb = getBrowserSupabase();

    (async () => {
      const { householdId, isNew } = await ensureDefaultHousehold(sb, user.id);
      if (cancelled) return;
      await pullInitial(householdId);
      useStore.getState().setCurrentHousehold(householdId);
      flushQueue().catch(() => {});
      setState({ householdId, isNew, loading: false });

      const channel = sb.channel(`hh-${householdId}`);
      const tables = Object.keys(rowToApp) as (keyof typeof rowToApp)[];
      for (const t of tables) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: String(t), filter: `household_id=eq.${householdId}` },
          (payload) => {
            const slice = tableToSlice[t];
            const fromState = (useStore.getState() as unknown as Record<string, unknown[]>)[slice] ?? [];
            if (payload.eventType === "DELETE") {
              const old = payload.old as { id: string };
              useStore.setState({ [slice]: fromState.filter((r) => (r as { id: string }).id !== old.id) } as never);
              return;
            }
            const next = (rowToApp[t] as (r: unknown) => unknown)(payload.new as never) as { id: string };
            const without = fromState.filter((r) => (r as { id: string }).id !== next.id);
            useStore.setState({ [slice]: [...without, next] } as never);
          }
        );
      }
      channel.subscribe();
      channelRef = channel;
    })();

    return () => {
      cancelled = true;
      if (channelRef) sb.removeChannel(channelRef);
    };
  }, [user, authLoading]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useHousehold() {
  return useContext(Ctx);
}
