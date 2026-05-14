"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useStore } from "@/lib/store";
import { Select, Input, Field } from "@/components/Field";
import { formatMoney, monthName } from "@/lib/utils";
import { motion } from "framer-motion";

type Range = "thisMonth" | "lastMonth" | "ytd" | "last12" | "custom";

export default function ReportsPage() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);

  const [range, setRange] = useState<Range>("last12");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [scope, setScope] = useState<"all" | string>("all"); // folder year/month key or "all"
  const [mode, setMode] = useState<"actual" | "projected" | "both">("both");
  const [whatIfChange, setWhatIfChange] = useState(0); // % change to expenses

  const now = new Date();
  const { start, end } = useMemo(() => {
    if (range === "thisMonth") {
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    }
    if (range === "lastMonth") {
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    }
    if (range === "ytd") {
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
      };
    }
    if (range === "custom" && customStart && customEnd) {
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    const s = new Date(now);
    s.setMonth(s.getMonth() - 11);
    s.setDate(1);
    return { start: s, end: now };
  }, [range, customStart, customEnd, now]);

  const inRange = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (d < start || d > end) return false;
      if (mode === "actual" && t.status === "projected") return false;
      if (mode === "projected" && t.status !== "projected") return false;
      if (scope !== "all") {
        const [y, m] = scope.split("/");
        if (d.getFullYear() !== +y || d.getMonth() + 1 !== +m) return false;
      }
      return true;
    });
  }, [transactions, start, end, mode, scope]);

  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      const d = new Date(t.date);
      set.add(`${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // monthly line: income, expense, net
  const monthlyData = useMemo(() => {
    const m = new Map<string, { month: string; income: number; expense: number; net: number }>();
    const cur = new Date(start);
    cur.setDate(1);
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      m.set(key, { month: key, income: 0, expense: 0, net: 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
    for (const t of inRange) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = m.get(key);
      if (!row) continue;
      if (t.type === "income") row.income += t.amount;
      else if (t.type === "expense") row.expense += t.amount * (1 + whatIfChange / 100);
    }
    return Array.from(m.values()).map((r) => ({ ...r, net: r.income - r.expense }));
  }, [inRange, start, end, whatIfChange]);

  const catData = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of inRange) {
      if (t.type !== "expense") continue;
      const id = t.categoryId ?? "uncategorized";
      m.set(id, (m.get(id) ?? 0) + t.amount * (1 + whatIfChange / 100));
    }
    return Array.from(m.entries())
      .map(([id, val]) => ({
        name: categories.find((c) => c.id === id)?.name ?? "Uncategorized",
        value: val,
        color: categories.find((c) => c.id === id)?.color ?? "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value);
  }, [inRange, categories, whatIfChange]);

  const compareData = useMemo(() => {
    const periods = [
      {
        label: "This month",
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      },
      {
        label: "Last month",
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0),
      },
      {
        label: "Same mo last yr",
        start: new Date(now.getFullYear() - 1, now.getMonth(), 1),
        end: new Date(now.getFullYear() - 1, now.getMonth() + 1, 0),
      },
    ];
    return periods.map((p) => {
      const txns = transactions.filter((t) => {
        const d = new Date(t.date);
        return d >= p.start && d <= p.end && (mode === "both" || (mode === "actual" ? t.status !== "projected" : t.status === "projected"));
      });
      const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return { name: p.label, income, expense };
    });
  }, [transactions, mode, now]);

  const totalIncome = inRange.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = inRange.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount * (1 + whatIfChange / 100), 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Reports</h1>
      </header>

      <div className="glass p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="Range">
          <Select value={range} onChange={(e) => setRange(e.target.value as Range)}>
            <option value="thisMonth">This month</option>
            <option value="lastMonth">Last month</option>
            <option value="ytd">Year to date</option>
            <option value="last12">Last 12 months</option>
            <option value="custom">Custom</option>
          </Select>
        </Field>
        <Field label="Folder">
          <Select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
        </Field>
        <Field label="Mode">
          <Select value={mode} onChange={(e) => setMode(e.target.value as never)}>
            <option value="both">Actual + projected</option>
            <option value="actual">Actual only</option>
            <option value="projected">Projected only</option>
          </Select>
        </Field>
        <Field label={`What if expenses ${whatIfChange >= 0 ? "+" : ""}${whatIfChange}%`}>
          <input
            type="range"
            min={-50}
            max={50}
            step={5}
            value={whatIfChange}
            onChange={(e) => setWhatIfChange(parseInt(e.target.value))}
            className="w-full"
          />
        </Field>
        {range === "custom" && (
          <>
            <Field label="Start">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </Field>
            <Field label="End">
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </Field>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Income" value={totalIncome} currency={settings.currency} color="#22c55e" />
        <Stat label="Expense" value={totalExpense} currency={settings.currency} color="#ef4444" />
        <Stat label="Net" value={net} currency={settings.currency} color={net >= 0 ? "#22c55e" : "#ef4444"} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-4 h-72"
      >
        <div className="text-sm font-medium mb-2">Cash flow over time</div>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="month" fontSize={11} stroke="currentColor" />
            <YAxis fontSize={11} stroke="currentColor" />
            <Tooltip
              contentStyle={{ background: "var(--bg)", border: "1px solid var(--card-border)", borderRadius: 12 }}
              formatter={(v) => formatMoney(Number(v), settings.currency)}
            />
            <Legend />
            <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="net" stroke="var(--grad-via)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 h-80"
        >
          <div className="text-sm font-medium mb-2">By category</div>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={catData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                label={(d) => d.name}
              >
                {catData.map((c, i) => (
                  <Cell key={i} fill={c.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--bg)", border: "1px solid var(--card-border)", borderRadius: 12 }}
                formatter={(v) => formatMoney(Number(v), settings.currency)}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-4 h-80"
        >
          <div className="text-sm font-medium mb-2">Compare periods</div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="name" fontSize={11} stroke="currentColor" />
              <YAxis fontSize={11} stroke="currentColor" />
              <Tooltip
                contentStyle={{ background: "var(--bg)", border: "1px solid var(--card-border)", borderRadius: 12 }}
                formatter={(v) => formatMoney(Number(v), settings.currency)}
              />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  currency,
  color,
}: {
  label: string;
  value: number;
  currency: import("@/lib/types").Currency;
  color: string;
}) {
  return (
    <div className="glass p-4">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {formatMoney(value, currency)}
      </div>
    </div>
  );
}
