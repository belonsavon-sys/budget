"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getBrowserSupabase } from "../db";
import { useAuth } from "../auth/context";
import { ensureDefaultHousehold } from "./bootstrap";

interface HouseholdState {
  householdId: string | null;
  isNew: boolean;
  loading: boolean;
}

const Ctx = createContext<HouseholdState>({ householdId: null, isNew: false, loading: false });

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<HouseholdState>({ householdId: null, isNew: false, loading: false });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ householdId: null, isNew: false, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const sb = getBrowserSupabase();
    ensureDefaultHousehold(sb, user.id)
      .then(({ householdId, isNew }) => setState({ householdId, isNew, loading: false }))
      .catch(() => setState({ householdId: null, isNew: false, loading: false }));
  }, [user, authLoading]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useHousehold() {
  return useContext(Ctx);
}
