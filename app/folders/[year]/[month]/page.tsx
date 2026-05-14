"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney, monthName } from "@/lib/utils";
import TransactionRow from "@/components/TransactionRow";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export default function FolderPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year, month } = use(params);
  const y = parseInt(year);
  const m = parseInt(month);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const categories = useStore((s) => s.categories);

  const items = useMemo(() => {
    return transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      })
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [transactions, y, m]);

  const income = items.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = items.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const byCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of items) {
      if (t.type !== "expense") continue;
      const id = t.categoryId ?? "uncat";
      map.set(id, (map.get(id) ?? 0) + t.amount);
    }
    return Array.from(map.entries()).map(([id, val]) => ({
      name: categories.find((c) => c.id === id)?.name ?? "Other",
      color: categories.find((c) => c.id === id)?.color ?? "#94a3b8",
      value: val,
    }));
  }, [items, categories]);

  return (
    <div className="space-y-6 pb-12">
      <Link href="/folders" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--fg)]">
        <ArrowLeft size={14} /> Folders
      </Link>
      <header className="pt-1">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">{monthName(m)}</span>{" "}
          <span className="text-[var(--muted)]">{y}</span>
        </h1>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass p-4">
          <div className="text-xs text-[var(--muted)]">Income</div>
          <div className="text-2xl font-bold tabular-nums text-green-500">{formatMoney(income, settings.currency)}</div>
        </div>
        <div className="glass p-4">
          <div className="text-xs text-[var(--muted)]">Expense</div>
          <div className="text-2xl font-bold tabular-nums text-red-500">{formatMoney(expense, settings.currency)}</div>
        </div>
        <div className="glass p-4">
          <div className="text-xs text-[var(--muted)]">Net</div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: income - expense >= 0 ? "#22c55e" : "#ef4444" }}>
            {formatMoney(income - expense, settings.currency)}
          </div>
        </div>
      </div>

      {byCat.length > 0 && (
        <div className="glass p-4 h-72">
          <div className="text-sm font-medium mb-2">By category</div>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie data={byCat} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} label={(d) => d.name}>
                {byCat.map((c, i) => (
                  <Cell key={i} fill={c.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--bg)", border: "1px solid var(--card-border)", borderRadius: 12 }}
                formatter={(v) => formatMoney(Number(v), settings.currency)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold px-1">Transactions</h2>
        {items.map((t) => (
          <TransactionRow key={t.id} txn={t} />
        ))}
        {items.length === 0 && (
          <div className="glass p-6 text-center text-[var(--muted)]">Empty folder.</div>
        )}
      </div>
    </div>
  );
}
