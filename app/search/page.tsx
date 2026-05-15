"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/Field";
import TransactionRow from "@/components/TransactionRow";
import Link from "next/link";

export default function SearchPage() {
  const transactions = useStore((s) => s.transactions);
  const notes = useStore((s) => s.notes);
  const goals = useStore((s) => s.goals);
  const accounts = useStore((s) => s.accounts);
  const tags = useStore((s) => s.tags);
  const [q, setQ] = useState("");

  const ql = q.toLowerCase().trim();

  const txnResults = useMemo(() => {
    if (!ql) return [];
    return transactions
      .filter(
        (t) =>
          t.description.toLowerCase().includes(ql) ||
          (t.notes ?? "").toLowerCase().includes(ql) ||
          tags.some((tag) => t.tagIds.includes(tag.id) && tag.name.toLowerCase().includes(ql))
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 20);
  }, [transactions, ql, tags]);

  const noteResults = useMemo(() => {
    if (!ql) return [];
    return notes.filter(
      (n) => n.title.toLowerCase().includes(ql) || n.content.toLowerCase().includes(ql)
    );
  }, [notes, ql]);

  const goalResults = useMemo(() => {
    if (!ql) return [];
    return goals.filter((g) => g.name.toLowerCase().includes(ql));
  }, [goals, ql]);

  const accountResults = useMemo(() => {
    if (!ql) return [];
    return accounts.filter((a) => a.name.toLowerCase().includes(ql));
  }, [accounts, ql]);

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Search</h1>
      </header>
      <div className="glass p-3 relative">
        <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search transactions, notes, goals, accounts…"
          className="pl-10"
        />
      </div>

      {ql && (
        <div className="space-y-6">
          {txnResults.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold px-1">Transactions</h2>
              {txnResults.map((t) => <TransactionRow key={t.id} txn={t} />)}
            </section>
          )}
          {noteResults.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold px-1">Notes</h2>
              {noteResults.map((n) => (
                <Link key={n.id} href="/notes" className="glass p-3 block tap">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-[var(--ink-muted)] line-clamp-2">{n.content}</div>
                </Link>
              ))}
            </section>
          )}
          {goalResults.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold px-1">Goals</h2>
              {goalResults.map((g) => (
                <Link key={g.id} href="/goals" className="glass p-3 block tap">{g.name}</Link>
              ))}
            </section>
          )}
          {accountResults.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold px-1">Accounts</h2>
              {accountResults.map((a) => (
                <Link key={a.id} href="/accounts" className="glass p-3 block tap">{a.name}</Link>
              ))}
            </section>
          )}
          {txnResults.length + noteResults.length + goalResults.length + accountResults.length === 0 && (
            <div className="glass p-10 text-center text-[var(--ink-muted)]">No matches.</div>
          )}
        </div>
      )}
    </div>
  );
}
