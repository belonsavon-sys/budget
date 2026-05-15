"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Sunset,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  CalendarClock,
  Target,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney, netWorth, timeGreeting } from "@/lib/utils";
import AnimatedNumber from "@/components/AnimatedNumber";
import TransactionRow from "@/components/TransactionRow";

const iconMap = { sun: Sun, moon: Moon, sunset: Sunset };

export default function Home() {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const goals = useStore((s) => s.goals);
  const reminders = useStore((s) => s.reminders);

  const greeting = useMemo(() => timeGreeting(), []);
  const GreetIcon = iconMap[greeting.icon as keyof typeof iconMap];

  const realTxns = transactions.filter((t) => t.status !== "projected");
  const projectedTxns = transactions;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthTxns = realTxns.filter(
    (t) => new Date(t.date) >= startOfMonth && new Date(t.date) <= now
  );
  const monthIncome = monthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const monthNet = monthIncome - monthExpense;

  const totalNetWorth = netWorth(accounts, realTxns);
  const projectedNetWorth = netWorth(accounts, projectedTxns, true);

  const recent = [...realTxns]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, 6);

  const upcoming = [...transactions]
    .filter(
      (t) =>
        new Date(t.date) >= now &&
        (t.status === "pending" || t.status === "projected")
    )
    .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, 4);

  const pendingReminders = reminders.filter((r) => !r.done).length;

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-sm text-[var(--ink-muted)]"
        >
          <GreetIcon size={14} />
          {greeting.text}
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-3xl md:text-5xl font-bold tracking-tight mt-1"
        >
          <span className="gradient-text">{settings.userName || "Hello"}</span>
        </motion.h1>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-5 md:col-span-2 relative overflow-hidden"
        >
          <div className="absolute inset-0 gradient-fill opacity-90" />
          <div className="relative text-white">
            <div className="text-sm/none opacity-80 mb-1">Net worth</div>
            <div className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums">
              <AnimatedNumber
                value={totalNetWorth}
                format={(n) => formatMoney(n, settings.currency)}
              />
            </div>
            {settings.showProjected && (
              <div className="text-sm/none opacity-80 mt-2">
                Projected:{" "}
                <span className="font-medium">
                  {formatMoney(projectedNetWorth, settings.currency)}
                </span>
              </div>
            )}
          </div>
          <div className="relative mt-6 flex flex-wrap gap-2">
            <Link
              href="/accounts"
              className="tap text-sm bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full backdrop-blur-md"
            >
              Accounts
            </Link>
            <Link
              href="/reports"
              className="tap text-sm bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full backdrop-blur-md"
            >
              Reports
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass p-5"
        >
          <div className="text-sm text-[var(--ink-muted)] mb-1">This month</div>
          <div className="text-3xl font-bold tabular-nums">
            <AnimatedNumber value={monthNet} format={(n) => formatMoney(n, settings.currency)} />
          </div>
          <div className="mt-3 flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <ArrowDownLeft size={14} className="text-[var(--positive)]" />
              <span className="tabular-nums">{formatMoney(monthIncome, settings.currency)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ArrowUpRight size={14} className="text-[var(--negative)]" />
              <span className="tabular-nums">{formatMoney(monthExpense, settings.currency)}</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat icon={<Wallet size={16} />} label="Accounts" value={accounts.filter((a) => !a.archived).length} href="/accounts" delay={0.2} />
        <QuickStat icon={<Target size={16} />} label="Goals" value={goals.length} href="/goals" delay={0.25} />
        <QuickStat icon={<CalendarClock size={16} />} label="Upcoming" value={upcoming.length} href="/calendar" delay={0.3} />
        <QuickStat icon={<Sparkles size={16} />} label="Reminders" value={pendingReminders} href="/insights" delay={0.35} gradient />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 space-y-2"
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link href="/transactions" className="text-sm text-[var(--ink-muted)] hover:underline">
              See all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="glass p-8 text-center text-[var(--ink-muted)]">
              No transactions yet — tap + to add your first.
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((t) => (
                <TransactionRow key={t.id} txn={t} />
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <div>
            <h2 className="text-lg font-semibold px-1 mb-2">Upcoming</h2>
            {upcoming.length === 0 ? (
              <div className="glass p-4 text-sm text-[var(--ink-muted)]">Nothing scheduled.</div>
            ) : (
              <div className="space-y-2">
                {upcoming.map((u) => {
                  const daysOut = Math.max(0, Math.ceil((+new Date(u.date) - +now) / 86400000));
                  return (
                    <div key={u.id} className="glass p-3 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full gradient-fill pulse-dot" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{u.description}</div>
                        <div className="text-xs text-[var(--ink-muted)]">in {daysOut}d</div>
                      </div>
                      <div className="text-sm tabular-nums">
                        {u.type === "expense" ? "−" : "+"}
                        {formatMoney(u.amount, u.currency)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {goals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold px-1 mb-2">Goals</h2>
              <div className="space-y-2">
                {goals.slice(0, 3).map((g) => {
                  const pct = Math.min(100, (g.current / g.target) * 100);
                  return (
                    <Link href="/goals" key={g.id} className="glass p-3 block tap">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="text-sm font-medium">{g.name}</div>
                        <div className="text-xs text-[var(--ink-muted)] tabular-nums">
                          {formatMoney(g.current, settings.currency)} / {formatMoney(g.target, settings.currency)}
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--hover)] overflow-hidden">
                        <motion.div
                          className="h-full gradient-fill"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  href,
  delay,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
  delay: number;
  gradient?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link href={href} className={`tap block p-4 glass ${gradient ? "gradient-fill text-white" : ""}`}>
        <div className="flex items-center justify-between">
          <div className={`text-xs ${gradient ? "opacity-90" : "text-[var(--ink-muted)]"}`}>{label}</div>
          <div className={gradient ? "opacity-90" : "text-[var(--ink-muted)]"}>{icon}</div>
        </div>
        <div className="text-2xl font-bold mt-2 tabular-nums">{value}</div>
      </Link>
    </motion.div>
  );
}
