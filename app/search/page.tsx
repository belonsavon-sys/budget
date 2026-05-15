"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Wallet, NotebookPen, PiggyBank, Target, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { search, type SearchResult } from "@/lib/search";

const KIND_ICON = {
  transaction: Wallet,
  note: NotebookPen,
  account: PiggyBank,
  goal: Target,
  agent_action: Sparkles,
} as const;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const transactions = useStore((s) => s.transactions);
  const notes = useStore((s) => s.notes);
  const accounts = useStore((s) => s.accounts);
  const goals = useStore((s) => s.goals);
  const agentActions = useStore((s) => s.agentActions);

  const results = useMemo<SearchResult[]>(
    () => search({ transactions, notes, accounts, goals, agentActions, query }),
    [transactions, notes, accounts, goals, agentActions, query]
  );

  return (
    <div className="space-y-4 pb-12">
      <header className="pt-2 md:pt-6">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight gradient-text">Search</h1>
      </header>

      <div className="glass p-3 flex items-center gap-2">
        <SearchIcon size={16} className="text-[var(--ink-muted)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search transactions, notes, accounts, goals, agent actions…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="text-xs text-[var(--ink-muted)] hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {query && results.length === 0 && (
        <div className="glass p-6 text-center text-sm text-[var(--ink-muted)]">
          No results.
        </div>
      )}

      <div className="space-y-2">
        {results.map((r) => {
          const Icon = KIND_ICON[r.kind];
          return (
            <Link key={`${r.kind}-${r.id}`} href={r.href} className="glass p-3 flex items-start gap-3 tap">
              <Icon size={18} className="mt-0.5 text-[var(--ink-muted)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.title}</div>
                <div className="text-xs text-[var(--ink-muted)] truncate">{r.snippet}</div>
              </div>
              {r.date && (
                <div className="text-[10px] text-[var(--ink-muted)] flex-shrink-0">
                  {new Date(r.date).toLocaleDateString()}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
