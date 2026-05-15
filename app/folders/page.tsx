"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Folder, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney, monthName } from "@/lib/utils";

export default function FoldersPage() {
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);

  const tree = useMemo(() => {
    const yearMap = new Map<number, Map<number, { income: number; expense: number; count: number }>>();
    for (const t of transactions) {
      const d = new Date(t.date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      if (!yearMap.has(y)) yearMap.set(y, new Map());
      const mm = yearMap.get(y)!;
      const cur = mm.get(m) ?? { income: 0, expense: 0, count: 0 };
      if (t.type === "income") cur.income += t.amount;
      if (t.type === "expense") cur.expense += t.amount;
      cur.count++;
      mm.set(m, cur);
    }
    return Array.from(yearMap.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([y, mm]) => ({
        year: y,
        months: Array.from(mm.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([m, v]) => ({ month: m, ...v })),
      }));
  }, [transactions]);

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Folders</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">Auto-organized by year & month</p>
      </header>

      {tree.length === 0 && (
        <div className="glass p-8 text-center text-[var(--ink-muted)]">
          No transactions yet.
        </div>
      )}

      {tree.map((y, yi) => (
        <motion.section
          key={y.year}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: yi * 0.05 }}
        >
          <h2 className="text-xl font-bold mb-3">{y.year}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {y.months.map((m, mi) => {
              const net = m.income - m.expense;
              return (
                <motion.div
                  key={m.month}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: yi * 0.05 + mi * 0.02 }}
                >
                  <Link
                    href={`/folders/${y.year}/${String(m.month).padStart(2, "0")}`}
                    className="glass p-4 flex items-center gap-3 tap"
                  >
                    <div className="w-10 h-10 rounded-xl gradient-fill grid place-items-center text-white">
                      <Folder size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{monthName(m.month)}</div>
                      <div className="text-xs text-[var(--ink-muted)]">{m.count} transactions</div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-sm font-semibold tabular-nums"
                        style={{ color: net >= 0 ? "#22c55e" : "#ef4444" }}
                      >
                        {net >= 0 ? "+" : "−"}
                        {formatMoney(Math.abs(net), settings.currency)}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--ink-muted)]" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      ))}
    </div>
  );
}
