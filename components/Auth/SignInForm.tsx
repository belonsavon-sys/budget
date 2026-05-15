"use client";
import { useState } from "react";
import { sendMagicLink } from "@/lib/auth/client";
import { motion } from "framer-motion";
import { Mail, Check } from "lucide-react";

type State = "idle" | "sending" | "sent" | "error";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("sending");
    setError(undefined);
    const { ok, error: err } = await sendMagicLink(email.trim());
    if (ok) {
      setState("sent");
    } else {
      setState("error");
      setError(err);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-sm glass p-7 space-y-4"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">Sign in</span>
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          We'll email you a magic link. No password needed.
        </p>
      </div>

      {state !== "sent" && (
        <>
          <label className="block">
            <span className="text-xs text-[var(--ink-muted)] uppercase tracking-wider">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-transparent border border-[var(--card-border)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--grad-via)]/40"
              placeholder="you@example.com"
              disabled={state === "sending"}
            />
          </label>
          <button
            type="submit"
            disabled={state === "sending" || !email}
            className="tap w-full gradient-fill text-white py-2.5 rounded-xl font-medium disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {state === "error" && (
            <p className="text-sm text-[var(--negative)]">{error ?? "Something went wrong."}</p>
          )}
        </>
      )}

      {state === "sent" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center text-center gap-3 py-2"
        >
          <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--positive)_15%,transparent)] flex items-center justify-center">
            <Check size={24} className="text-[var(--positive)]" />
          </div>
          <div>
            <div className="font-medium">Check your email</div>
            <div className="text-sm text-[var(--ink-muted)] mt-1 flex items-center gap-1.5 justify-center">
              <Mail size={14} /> {email}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="text-xs text-[var(--ink-muted)] hover:underline"
          >
            Use a different email
          </button>
        </motion.div>
      )}
    </motion.form>
  );
}
