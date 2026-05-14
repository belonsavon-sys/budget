"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney } from "@/lib/utils";
import type { Budget } from "@/lib/types";
import Modal from "@/components/Modal";
import { Field, Select, Input, Button } from "@/components/Field";

export default function BudgetsPage() {
  const budgets = useStore((s) => s.budgets);
  const categories = useStore((s) => s.categories);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const addBudget = useStore((s) => s.addBudget);
  const updateBudget = useStore((s) => s.updateBudget);
  const removeBudget = useStore((s) => s.removeBudget);

  const [open, setOpen] = useState(false);

  function spentForBudget(b: Budget) {
    const now = new Date();
    let start: Date;
    if (b.period === "weekly") {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (b.period === "yearly") {
      start = new Date(now.getFullYear(), 0, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return transactions
      .filter((t) => t.type === "expense" && t.categoryId === b.categoryId && new Date(t.date) >= start && t.status !== "projected")
      .reduce((s, t) => s + t.amount, 0);
  }

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Budgets</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="inline mr-1" />New
        </Button>
      </header>

      {budgets.length === 0 && (
        <div className="glass p-10 text-center text-[var(--muted)]">
          Set spending limits per category to track them.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {budgets.map((b, i) => {
          const cat = categories.find((c) => c.id === b.categoryId);
          const spent = spentForBudget(b);
          const pct = Math.min(100, (spent / b.amount) * 100);
          const over = spent > b.amount;
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: cat?.color }} />
                  <span className="font-semibold">{cat?.name ?? "Category"}</span>
                  <span className="text-xs text-[var(--muted)] capitalize">{b.period}</span>
                </div>
                <button
                  className="tap p-2 rounded-full hover:bg-red-500/15 text-red-500"
                  onClick={() => {
                    if (confirm("Delete budget?")) removeBudget(b.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-baseline justify-between mt-3">
                <div className={`text-2xl font-bold tabular-nums ${over ? "text-red-500" : ""}`}>
                  {formatMoney(spent, settings.currency)}
                </div>
                <div className="text-sm text-[var(--muted)] tabular-nums">/ {formatMoney(b.amount, settings.currency)}</div>
              </div>
              <div className="h-3 rounded-full bg-[var(--hover)] overflow-hidden mt-2">
                <motion.div
                  className={`h-full ${over ? "bg-red-500" : "gradient-fill"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              {over && (
                <div className="text-xs text-red-500 mt-2">
                  Over budget by {formatMoney(spent - b.amount, settings.currency)}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New budget">
        <BudgetForm
          onDone={() => setOpen(false)}
          onSave={(b) => {
            addBudget(b);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function BudgetForm({ onSave, onDone }: { onSave: (b: Omit<Budget, "id">) => void; onDone: () => void }) {
  const categories = useStore((s) => s.categories);
  const [categoryId, setCategoryId] = useState(categories.filter((c) => c.type !== "income")[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState<Budget["period"]>("monthly");

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ categoryId, amount: parseFloat(amount), period, rollover: false });
      }}
    >
      <Field label="Category">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.filter((c) => c.type !== "income").map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Amount">
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </Field>
      <Field label="Period">
        <Select value={period} onChange={(e) => setPeriod(e.target.value as Budget["period"])}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </Select>
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Save</Button>
      </div>
    </form>
  );
}
