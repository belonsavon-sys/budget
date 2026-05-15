"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { project } from "@/lib/projection";
import { formatMoney, timeGreeting } from "@/lib/utils";
import PageHeader from "@/components/Editorial/PageHeader";

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
    return `${mo} '${String(yy).slice(-2)}`;
  })();

  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const month = now.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = now.getDate();

  const eyebrow = `${weekday} · ${month} ${day}`;
  const greetingWord = greeting.text; // e.g. "Good morning"
  const name = settings.userName ? `, ${settings.userName}` : "";
  const title = `${greetingWord}${name}.`;

  const byline = `You're ${monthPhrase} — on track to hit ${formatMoney(fiveYearValue, settings.currency)} by ${yearLabel}.`;

  return <PageHeader eyebrow={eyebrow} title={title} byline={byline} />;
}
