import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db.types";

export interface BootstrapResult {
  householdId: string;
  isNew: boolean;
}

/** Ensures the authenticated user has at least one household; returns its id. */
export async function ensureDefaultHousehold(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: SupabaseClient<Database, any, any>,
  userId: string
): Promise<BootstrapResult> {
  const { data: existing, error: readErr } = await client
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1);
  if (readErr) throw readErr;
  if (existing && existing.length > 0) {
    return { householdId: existing[0].household_id, isNew: false };
  }

  const { data: created, error: insErr } = await client
    .from("households")
    .insert({ name: "My budget", owner_id: userId })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return { householdId: created.id, isNew: true };
}
