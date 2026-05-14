import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/db";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");

  // Whitelist same-origin paths only — prevents open-redirect via absolute URLs.
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
    ? nextParam
    : "/";

  if (code) {
    const cookieStore = await cookies();
    const sb = getServerSupabase(cookieStore);
    await sb.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
