"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";

export default function AmbientTiles() {
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const recurring = useStore((s) => s.recurring);

  const { monthNet, dailyNets, subsTotal, subsCount } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startIso = startOfMonth.toISOString().slice(0, 10);
    const monthTxns = transactions.filter(
      (t) => t.date.slice(0, 10) >= startIso && t.status !== "projected"
    );
    const income = monthTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const mNet = income - expense;

    // Daily nets for the last 7 days
    const days: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const dayIso = d.toISOString().slice(0, 10);
      const dayNet = transactions
        .filter((t) => t.date.slice(0, 10) === dayIso && t.status !== "projected")
        .reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0), 0);
      days.push(dayNet);
    }

    // Subscriptions: recurring monthly+ expenses
    const subs = recurring.filter(
      (r) => r.active && r.type === "expense" && (r.frequency === "monthly" || r.frequency === "yearly")
    );
    const monthlyTotal = subs.reduce((s, r) => s + (r.frequency === "yearly" ? r.amount / 12 : r.amount), 0);

    return {
      monthNet: mNet,
      dailyNets: days,
      subsTotal: monthlyTotal,
      subsCount: subs.length,
    };
  }, [transactions, recurring]);

  const maxAbsDay = Math.max(1, ...dailyNets.map((d) => Math.abs(d)));

  return (
    <section className="grid grid-cols-2 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-4"
      >
        <div className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
          This month
        </div>
        <div
          className="text-2xl font-display font-bold tabular-nums mt-1"
          style={{ color: monthNet >= 0 ? "var(--positive)" : "var(--negative)" }}
        >
          {monthNet >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(monthNet), settings.currency)}
        </div>
        <div className="mt-2.5 flex gap-1 items-end h-5">
          {dailyNets.map((n, i) => {
            const h = Math.max(2, (Math.abs(n) / maxAbsDay) * 18);
            const positive = n >= 0;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}px`,
                  borderRadius: 2,
                  background: positive ? "var(--positive)" : "var(--negative)",
                  opacity: 0.7,
                }}
                title={`Day ${i - 6 || "today"}: ${n}`}
              />
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass p-4"
      >
        <div className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
          Subs · monthly
        </div>
        <div className="text-2xl font-display font-bold tabular-nums mt-1">
          {formatMoney(subsTotal, settings.currency)}
        </div>
        <div className="text-[11px] text-[var(--ink-muted)] mt-2">
          {subsCount} active recurring {subsCount === 1 ? "rule" : "rules"}
        </div>
      </motion.div>
    </section>
  );
}
