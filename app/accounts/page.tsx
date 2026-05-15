"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, CreditCard, Wallet, PiggyBank, Banknote, TrendingUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { accountBalance, formatMoney, netWorth } from "@/lib/utils";
import type { Account, AccountType, Currency } from "@/lib/types";
import Modal from "@/components/Modal";
import { Field, Input, Select, Button } from "@/components/Field";

const TYPE_ICONS: Record<AccountType, React.ReactNode> = {
  checking: <Wallet size={18} />,
  savings: <PiggyBank size={18} />,
  credit: <CreditCard size={18} />,
  cash: <Banknote size={18} />,
  investment: <TrendingUp size={18} />,
};

export default function AccountsPage() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const addAccount = useStore((s) => s.addAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const removeAccount = useStore((s) => s.removeAccount);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const total = netWorth(accounts, transactions.filter((t) => t.status !== "projected"));

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Accounts</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-1">Net worth: {formatMoney(total, settings.currency)}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus size={16} className="inline mr-1" />Add
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {accounts.map((a, i) => {
          const bal = accountBalance(a, transactions.filter((t) => t.status !== "projected"));
          const projectedBal = accountBalance(a, transactions);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass p-5 relative overflow-hidden"
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: `linear-gradient(135deg, ${a.color}, transparent)` }}
              />
              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl text-white grid place-items-center"
                    style={{ background: a.color }}
                  >
                    {TYPE_ICONS[a.type]}
                  </div>
                  <div>
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-[var(--ink-muted)] capitalize">{a.type}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(a); setOpen(true); }}
                    className="tap p-2 rounded-full hover:bg-[var(--hover)]"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${a.name}"? Transactions will remain.`)) removeAccount(a.id);
                    }}
                    className="tap p-2 rounded-full hover:bg-[color-mix(in_srgb,var(--negative)_15%,transparent)] text-[var(--negative)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="relative mt-4">
                <div className="text-3xl font-bold tabular-nums" style={{ color: bal < 0 ? "#ef4444" : undefined }}>
                  {formatMoney(bal, a.currency)}
                </div>
                {settings.showProjected && projectedBal !== bal && (
                  <div className="text-xs text-[var(--ink-muted)] mt-1">
                    projected: {formatMoney(projectedBal, a.currency)}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit account" : "New account"}>
        <AccountForm
          initial={editing ?? undefined}
          onDone={() => setOpen(false)}
          onSave={(a) => {
            if (editing) updateAccount(editing.id, a);
            else addAccount(a as Omit<Account, "id">);
            setOpen(false);
          }}
        />
      </Modal>
    </div>
  );
}

function AccountForm({
  initial,
  onSave,
  onDone,
}: {
  initial?: Account;
  onSave: (a: Omit<Account, "id">) => void;
  onDone: () => void;
}) {
  const settings = useStore((s) => s.settings);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<AccountType>(initial?.type ?? "checking");
  const [startingBalance, setStartingBalance] = useState(String(initial?.startingBalance ?? 0));
  const [color, setColor] = useState(initial?.color ?? "#6366f1");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? settings.currency);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name,
          type,
          startingBalance: parseFloat(startingBalance) || 0,
          color,
          currency,
          icon: "Wallet",
          archived: false,
        });
      }}
    >
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit card</option>
            <option value="cash">Cash</option>
            <option value="investment">Investment</option>
          </Select>
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
            {["USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY","INR","MXN","BRL","KRW","SGD","HKD","NZD","SEK","NOK","DKK","ZAR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Starting balance">
        <Input type="number" step="0.01" value={startingBalance} onChange={(e) => setStartingBalance(e.target.value)} />
      </Field>
      <Field label="Color">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full h-12 rounded-2xl cursor-pointer"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Save</Button>
      </div>
    </form>
  );
}
