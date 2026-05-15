"use client";

import { useState } from "react";
import { Field, Input, Select, Button, Textarea } from "./Field";
import { useStore } from "@/lib/store";
import type { RecurringRule, TxnType, Frequency } from "@/lib/types";

export default function RecurringForm({
  initial,
  onDone,
}: {
  initial?: RecurringRule;
  onDone: () => void;
}) {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const tags = useStore((s) => s.tags);
  const addRecurring = useStore((s) => s.addRecurring);
  const updateRecurring = useStore((s) => s.updateRecurring);

  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<TxnType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? settings.currency);
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? []);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "monthly");
  const [startDate, setStartDate] = useState(
    (initial?.startDate ?? new Date().toISOString()).slice(0, 10)
  );
  type EndMode = "never" | "date" | "count" | "balance";
  const initialEndMode: EndMode =
    initial?.endCount != null
      ? "count"
      : initial?.endBalance != null
        ? "balance"
        : initial?.endDate
          ? "date"
          : "never";
  const [endMode, setEndMode] = useState<EndMode>(initialEndMode);
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? "");
  const [endCount, setEndCount] = useState<string>(initial?.endCount != null ? String(initial.endCount) : "");
  const [endBalance, setEndBalance] = useState<string>(
    initial?.endBalance != null ? String(initial.endBalance) : ""
  );
  const [autopay, setAutopay] = useState(initial?.autopay ?? true);
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Quick date presets
  const todayYear = new Date().getFullYear();
  const endOfMonth = (() => {
    const d = new Date(todayYear, new Date().getMonth() + 1, 0);
    return d.toISOString().slice(0, 10);
  })();
  const endOfYear = `${todayYear}-12-31`;
  const endOfNextYear = `${todayYear + 1}-12-31`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Omit<RecurringRule, "id"> = {
      name,
      type,
      amount: parseFloat(amount) || 0,
      currency,
      accountId,
      categoryId: categoryId || undefined,
      tagIds,
      frequency,
      startDate: new Date(startDate).toISOString(),
      endDate: endMode === "date" && endDate ? new Date(endDate).toISOString() : undefined,
      endCount: endMode === "count" && endCount ? Math.max(1, parseInt(endCount, 10) || 0) : undefined,
      endBalance: endMode === "balance" && endBalance ? parseFloat(endBalance) || undefined : undefined,
      autopay,
      active,
      notes: notes || undefined,
    };
    if (initial) updateRecurring(initial.id, payload);
    else addRecurring(payload);
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix, rent…" required />
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as TxnType)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
        </Field>
        <Field label="Amount">
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value as never)}>
            {["USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY","INR","MXN","BRL","KRW","SGD","HKD","NZD","SEK","NOK","DKK","ZAR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Account">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories
              .filter((c) => c.type === "both" || c.type === type)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Frequency">
          <Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
        </Field>
        <Field label="Starts">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Stop condition">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { mode: "never", label: "Never" },
                { mode: "date", label: "By date" },
                { mode: "count", label: "After N times" },
                { mode: "balance", label: "At balance" },
              ] as const
            ).map((opt) => {
              const selected = endMode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setEndMode(opt.mode)}
                  className="tap px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    background: selected ? "var(--accent)" : "var(--surface-2)",
                    color: selected ? "var(--bg)" : "var(--ink-muted)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {endMode === "date" && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setEndDate(endOfMonth)} className="tap px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-2)] text-[var(--ink-muted)]">
                  End of month
                </button>
                <button type="button" onClick={() => setEndDate(endOfYear)} className="tap px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-2)] text-[var(--ink-muted)]">
                  End of {todayYear}
                </button>
                <button type="button" onClick={() => setEndDate(endOfNextYear)} className="tap px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-2)] text-[var(--ink-muted)]">
                  End of {todayYear + 1}
                </button>
              </div>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}

          {endMode === "count" && (
            <div>
              <Input
                type="number"
                min="1"
                step="1"
                value={endCount}
                onChange={(e) => setEndCount(e.target.value)}
                placeholder="e.g. 12 — twelve monthly payments"
              />
              <div className="text-[11px] text-[var(--ink-muted)] mt-1">
                Stops after this many total occurrences (counting past ones).
              </div>
            </div>
          )}

          {endMode === "balance" && (
            <div>
              <Input
                type="number"
                step="0.01"
                value={endBalance}
                onChange={(e) => setEndBalance(e.target.value)}
                placeholder={type === "income" ? "Target balance (stops at-or-above)" : "Target balance (stops at-or-below)"}
              />
              <div className="text-[11px] text-[var(--ink-muted)] mt-1">
                {type === "income"
                  ? "Stops generating once this account reaches this balance."
                  : "Stops generating once this account drops to or below this balance."}
              </div>
            </div>
          )}
        </div>
      </Field>

      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setTagIds((cur) => (cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id]))
              }
              className={`tap px-2.5 py-1 rounded-full text-xs font-medium ${
                tagIds.includes(t.id) ? "text-white" : "bg-[var(--hover)]"
              }`}
              style={tagIds.includes(t.id) ? { background: t.color } : undefined}
            >
              #{t.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
          Mark paid automatically
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} className="flex-1">Cancel</Button>
        <Button type="submit" className="flex-1">Save</Button>
      </div>
    </form>
  );
}
