"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { project } from "@/lib/projection";
import { formatMoney, timeGreeting } from "@/lib/utils";

export default function CopilotGreeting() {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const recurring = useStore((s) => s.recurring);
  const scenarios = useStore((s) => s.scenarios);
  const activeScenarioIds = useStore((s) => s.activeScenarioIds);

  const greeting = useMemo(() => timeGreeting(), []);

  const { monthNet, fiveYearValue, fiveYearDate } = useMemo(() => {
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

    const snap = project(
      { accounts, transactions, recurring, scenarios },
      { horizon: "5y", activeScenarioIds, mcPaths: 0 }
    );

    const last = snap.points[snap.points.length - 1];
    return {
      monthNet: mNet,
      fiveYearValue: last?.value ?? snap.baseline,
      fiveYearDate: last?.date ?? snap.nowDate,
    };
  }, [accounts, transactions, recurring, scenarios, activeScenarioIds]);

  const monthPhrase =
    monthNet >= 0
      ? `${formatMoney(monthNet, settings.currency)} ahead this month`
      : `${formatMoney(Math.abs(monthNet), settings.currency)} behind this month`;

  const yearLabel = (() => {
    const d = new Date(fiveYearDate);
    const yy = d.getUTCFullYear();
    const mo = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    return `${mo} ${yy}`;
  })();

  return (
    <header className="pt-2 md:pt-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="text-xs uppercase tracking-widest text-[var(--ink-muted)]"
      >
        Good {greeting.text.replace(/^Good /i, "").toLowerCase()}{settings.userName ? `, ${settings.userName}` : ""}
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="text-2xl md:text-4xl font-display font-bold tracking-tight mt-1 leading-tight"
        style={{ letterSpacing: "-0.02em", maxWidth: "32ch" }}
      >
        You&apos;re <span style={{ color: "var(--positive)" }}>{monthPhrase}</span>{" "}
        — on track to hit{" "}
        <span style={{ color: "var(--accent)" }}>{formatMoney(fiveYearValue, settings.currency)}</span>{" "}
        by {yearLabel}.
      </motion.h1>
    </header>
  );
}
