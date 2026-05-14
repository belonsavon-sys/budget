import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./db.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill it in."
  );
}

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserSupabase() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase() called on the server. Use getServerSupabase().");
  }
  if (!browserClient) browserClient = createBrowserClient<Database>(url, anon);
  return browserClient;
}

export function getServerSupabase(cookieStore: {
  get: (name: string) => { value: string } | undefined;
  set?: (name: string, value: string, options?: CookieOptions) => void;
}) {
  return createServerClient<Database>(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => cookieStore.set?.(name, value, options),
      remove: (name: string, options: CookieOptions) => cookieStore.set?.(name, "", { ...options, maxAge: 0 }),
    },
  });
}

export type AppDB = Database["public"]["Tables"];
