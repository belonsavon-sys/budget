"use client";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { runAgent, getStoredGroqKey } from "@/lib/agent/client";

interface Props {
  monthKey: string; // YYYY-MM
}

const CACHE_PREFIX = "budget-ai-commentary-v1-";

function getCached(monthKey: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(CACHE_PREFIX + monthKey);
}

function setCached(monthKey: string, text: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CACHE_PREFIX + monthKey, text);
}

export default function AICommentary({ monthKey }: Props) {
  const hasKey = typeof window !== "undefined" ? !!getStoredGroqKey() : false;
  const [text, setText] = useState<string | null>(() => getCached(monthKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If month changes, reset to cached value (or null)
  useEffect(() => {
    setText(getCached(monthKey));
    setError(null);
  }, [monthKey]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const result = await runAgent(
        `Summarize this month (${monthKey}) spending patterns. Two paragraphs. Be specific about categories and amounts if you know them. Offer one actionable tip.`
      );
      const out = result.text.trim();
      setText(out);
      setCached(monthKey, out);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!hasKey) {
    return (
      <div className="glass p-4 text-sm text-[var(--ink-muted)] flex items-center gap-2">
        <Sparkles size={14} />
        Add a Groq key in{" "}
        <a href="/settings/ai" className="underline text-[var(--accent)]">
          /settings/ai
        </a>{" "}
        to enable AI commentary.
      </div>
    );
  }

  return (
    <div className="glass p-4 space-y-3">
      <div className="text-[9px] uppercase tracking-[0.22em] text-[var(--ink-muted)] flex items-center gap-2">
        <Sparkles size={11} className="text-[var(--accent)]" />
        Editor&rsquo;s note
      </div>

      {text ? (
        <blockquote
          className="font-display italic text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap pl-4"
          style={{ borderLeft: "2px solid var(--accent)" }}
        >
          {text}
        </blockquote>
      ) : (
        <div className="font-display italic text-sm text-[var(--ink-muted)]">
          No summary yet for {monthKey}.
        </div>
      )}

      {error && (
        <div className="text-xs text-[var(--negative)]">{error}</div>
      )}

      <button
        onClick={generate}
        disabled={loading}
        className="tap flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
        style={{ background: "var(--accent)", color: "var(--bg)" }}
      >
        {loading ? (
          <><Loader2 size={13} className="animate-spin" /> Generating…</>
        ) : (
          <><Sparkles size={13} /> {text ? "Regenerate" : "Generate AI summary"}</>
        )}
      </button>
    </div>
  );
}
