"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";

export default function AmbientTiles() {
  const settings = useStore((s) => s.settings);
  const transactions = useStore((s) => s.transactions);
  const recurring = useStore((s) => s.recurring);

  const { monthNet, dailyNets, subsTotal, subsCount, prevMonthNet } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const endOfPrevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
    const startIso = startOfMonth.toISOString().slice(0, 10);
    const prevStartIso = startOfPrevMonth.toISOString().slice(0, 10);
    const prevEndIso = endOfPrevMonth.toISOString().slice(0, 10);

    const monthTxns = transactions.filter(
      (t) => t.date.slice(0, 10) >= startIso && t.status !== "projected"
    );
    const prevMonthTxns = transactions.filter(
      (t) =>
        t.date.slice(0, 10) >= prevStartIso &&
        t.date.slice(0, 10) <= prevEndIso &&
        t.status !== "projected"
    );

    const income = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const mNet = income - expense;

    const prevIncome = prevMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const prevExpense = prevMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const pNet = prevIncome - prevExpense;

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
      prevMonthNet: pNet,
      dailyNets: days,
      subsTotal: monthlyTotal,
      subsCount: subs.length,
    };
  }, [transactions, recurring]);

  const maxAbsDay = Math.max(1, ...dailyNets.map((d) => Math.abs(d)));

  // Delta vs last month
  const deltaVsLastMonth =
    prevMonthNet !== 0
      ? Math.round(((monthNet - prevMonthNet) / Math.abs(prevMonthNet)) * 100)
      : null;

  const prevMonthName = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1
  ).toLocaleDateString("en-US", { month: "long" });

  return (
    <section className="grid grid-cols-2 gap-3">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-4"
      >
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
          This month
        </div>
        <div
          className="text-3xl md:text-4xl font-display font-bold font-numerals mt-1"
          style={{
            color: monthNet >= 0 ? "var(--positive)" : "var(--negative)",
            letterSpacing: "-0.02em",
          }}
        >
          {monthNet >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(monthNet), settings.currency)}
        </div>
        {deltaVsLastMonth !== null && (
          <div className="font-display italic text-[11px] text-[var(--ink-muted)] mt-1">
            <em>
              {deltaVsLastMonth >= 0 ? "+" : ""}
              {deltaVsLastMonth}% vs {prevMonthName}
            </em>
          </div>
        )}
        <div className="mt-2.5 flex gap-1 items-end h-4">
          {dailyNets.map((n, i) => {
            const h = Math.max(2, (Math.abs(n) / maxAbsDay) * 14);
            const positive = n >= 0;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}px`,
                  borderRadius: 2,
                  background: positive ? "var(--positive)" : "var(--negative)",
                  opacity: 0.45,
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
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
          Subs · monthly
        </div>
        <div
          className="text-3xl md:text-4xl font-display font-bold font-numerals mt-1"
          style={{ letterSpacing: "-0.02em" }}
        >
          {formatMoney(subsTotal, settings.currency)}
        </div>
        <div className="font-display italic text-[11px] text-[var(--ink-muted)] mt-1">
          <em>
            {subsCount} active recurring {subsCount === 1 ? "rule" : "rules"}
          </em>
        </div>
      </motion.div>
    </section>
  );
}
