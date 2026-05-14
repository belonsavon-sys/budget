import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const sb = getServerSupabase(cookieStore);
    await sb.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
