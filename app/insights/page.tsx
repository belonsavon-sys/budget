"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, PiggyBank, Repeat, Target, BellRing } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";

interface Insight {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "good" | "warn" | "info";
}

export default function InsightsPage() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const settings = useStore((s) => s.settings);
  const budgets = useStore((s) => s.budgets);
  const recurring = useStore((s) => s.recurring);
  const goals = useStore((s) => s.goals);

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    const now = new Date();
    const thisMonth = (t: typeof transactions[number]) => {
      const d = new Date(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    };
    const lastMonth = (t: typeof transactions[number]) => {
      const d = new Date(t.date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    };

    const tExp = transactions.filter((t) => t.type === "expense" && t.status !== "projected");
    const thisExp = tExp.filter(thisMonth).reduce((s, t) => s + t.amount, 0);
    const lastExp = tExp.filter(lastMonth).reduce((s, t) => s + t.amount, 0);

    if (lastExp > 0) {
      const delta = ((thisExp - lastExp) / lastExp) * 100;
      if (Math.abs(delta) >= 5) {
        list.push({
          id: "mom",
          icon: delta > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
          title: delta > 0 ? `Spending up ${delta.toFixed(0)}% this month` : `Spending down ${Math.abs(delta).toFixed(0)}% this month`,
          body: `So far ${formatMoney(thisExp, settings.currency)} vs ${formatMoney(lastExp, settings.currency)} last month.`,
          tone: delta > 15 ? "warn" : delta < 0 ? "good" : "info",
        });
      }
    }

    // Top category
    const byCat = new Map<string, number>();
    for (const t of tExp.filter(thisMonth)) {
      const id = t.categoryId ?? "uncategorized";
      byCat.set(id, (byCat.get(id) ?? 0) + t.amount);
    }
    const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const cat = categories.find((c) => c.id === top[0]);
      list.push({
        id: "top",
        icon: <Sparkles size={18} />,
        title: `${cat?.name ?? "Uncategorized"} is your top category`,
        body: `You've spent ${formatMoney(top[1], settings.currency)} here this month.`,
        tone: "info",
      });
    }

    // Subscriptions estimate
    if (recurring.length) {
      const monthlyEst = recurring
        .filter((r) => r.active && r.type === "expense")
        .reduce((s, r) => {
          const factor = r.frequency === "weekly" ? 4.33 : r.frequency === "biweekly" ? 2.17 : r.frequency === "daily" ? 30 : r.frequency === "yearly" ? 1 / 12 : 1;
          return s + r.amount * factor;
        }, 0);
      list.push({
        id: "subs",
        icon: <Repeat size={18} />,
        title: "Recurring spend",
        body: `Your active subscriptions and bills add up to about ${formatMoney(monthlyEst, settings.currency)}/month.`,
        tone: "info",
      });
    }

    // Budget alerts
    for (const b of budgets) {
      const spent = tExp
        .filter(thisMonth)
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const pct = (spent / b.amount) * 100;
      const cat = categories.find((c) => c.id === b.categoryId);
      if (pct >= 100) {
        list.push({
          id: `budget-${b.id}`,
          icon: <AlertTriangle size={18} />,
          title: `Over budget on ${cat?.name}`,
          body: `Spent ${formatMoney(spent, settings.currency)} of ${formatMoney(b.amount, settings.currency)} (${pct.toFixed(0)}%).`,
          tone: "warn",
        });
      } else if (pct >= 80) {
        list.push({
          id: `budget-${b.id}`,
          icon: <BellRing size={18} />,
          title: `${pct.toFixed(0)}% through ${cat?.name} budget`,
          body: `${formatMoney(b.amount - spent, settings.currency)} left this month.`,
          tone: "warn",
        });
      }
    }

    // Goal nudges
    for (const g of goals) {
      const pct = (g.current / g.target) * 100;
      if (pct >= 100) {
        list.push({
          id: `goal-${g.id}`,
          icon: <Target size={18} />,
          title: `Goal hit: ${g.name}`,
          body: `You reached your target of ${formatMoney(g.target, settings.currency)}.`,
          tone: "good",
        });
      } else if (g.deadline) {
        const daysLeft = Math.ceil((+new Date(g.deadline) - +now) / 86400000);
        if (daysLeft > 0) {
          const perDay = (g.target - g.current) / daysLeft;
          list.push({
            id: `goal-${g.id}`,
            icon: <Target size={18} />,
            title: `Save ${formatMoney(perDay, settings.currency)}/day for ${g.name}`,
            body: `${daysLeft} days left to reach ${formatMoney(g.target, settings.currency)}.`,
            tone: "info",
          });
        }
      }
    }

    if (list.length === 0) {
      list.push({
        id: "empty",
        icon: <PiggyBank size={18} />,
        title: "Add some transactions",
        body: "Insights appear once there's enough activity to compare.",
        tone: "info",
      });
    }
    return list;
  }, [transactions, categories, settings, budgets, recurring, goals]);

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--hover)] text-xs mb-2">
          <Sparkles size={12} /> AI insight
        </div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Insights</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Patterns and nudges from your data</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((i, idx) => (
          <motion.div
            key={i.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="glass p-5 flex gap-3 items-start"
          >
            <div
              className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white ${
                i.tone === "good"
                  ? "bg-green-500"
                  : i.tone === "warn"
                  ? "bg-amber-500"
                  : "gradient-fill"
              }`}
            >
              {i.icon}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{i.title}</div>
              <div className="text-sm text-[var(--muted)] mt-1">{i.body}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
