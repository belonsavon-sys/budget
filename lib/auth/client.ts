"use client";
import { getBrowserSupabase } from "../db";

export async function sendMagicLink(email: string) {
  const sb = getBrowserSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  return { ok: !error, error: error?.message };
}

export async function signOut() {
  const sb = getBrowserSupabase();
  await sb.auth.signOut();
}

export async function getCurrentUser() {
  const sb = getBrowserSupabase();
  const { data } = await sb.auth.getUser();
  return data.user;
}
