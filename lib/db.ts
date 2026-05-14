import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./db.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill it in."
  );
}

// After the guard above, url and anon are guaranteed strings at runtime.
const supabaseUrl = url as string;
const supabaseAnon = anon as string;

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserSupabase() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserSupabase() called on the server. Use getServerSupabase().");
  }
  if (!browserClient) browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnon);
  return browserClient;
}

export function getServerSupabase(cookieStore: {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options?: CookieOptions) => void;
}) {
  return createServerClient<Database>(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      },
    },
  });
}

export type AppDB = Database["public"]["Tables"];
