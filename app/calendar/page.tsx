"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney, isSameDay } from "@/lib/utils";
import TransactionRow from "@/components/TransactionRow";

export default function CalendarPage() {
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = useState<Date | null>(new Date());

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0),
    [cursor]
  );
  const startDay = monthStart.getDay() - (settings.weekStartsMonday ? 1 : 0);
  const days: Date[] = [];
  const total = (Math.ceil((startDay + monthEnd.getDate()) / 7)) * 7;
  for (let i = 0; i < total; i++) {
    const d = new Date(monthStart);
    d.setDate(monthStart.getDate() + i - startDay);
    days.push(d);
  }

  const byDay = useMemo(() => {
    const m = new Map<string, { income: number; expense: number; pending: number; projected: number; ids: string[] }>();
    for (const t of transactions) {
      const d = new Date(t.date);
      const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const cur = m.get(k) ?? { income: 0, expense: 0, pending: 0, projected: 0, ids: [] };
      if (t.type === "income") cur.income += t.amount;
      if (t.type === "expense") cur.expense += t.amount;
      if (t.status === "pending") cur.pending++;
      if (t.status === "projected") cur.projected++;
      cur.ids.push(t.id);
      m.set(k, cur);
    }
    return m;
  }, [transactions]);

  const selectedTxns = useMemo(
    () =>
      selected
        ? transactions.filter((t) => isSameDay(new Date(t.date), selected)).sort((a, b) => +new Date(b.date) - +new Date(a.date))
        : [],
    [selected, transactions]
  );

  const weekDays = settings.weekStartsMonday
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Calendar</h1>
        <div className="flex items-center gap-2">
          <button
            className="tap p-2 rounded-full hover:bg-[var(--hover)]"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-lg font-semibold w-44 text-center">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </div>
          <button
            className="tap p-2 rounded-full hover:bg-[var(--hover)]"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      <div className="glass p-3">
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-[var(--ink-muted)] font-medium">
          {weekDays.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = isSameDay(d, new Date());
            const isSelected = selected && isSameDay(d, selected);
            const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            const info = byDay.get(k);
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelected(d)}
                className={`relative aspect-square rounded-xl text-sm font-medium tap ${
                  isSelected
                    ? "gradient-fill text-white"
                    : isToday
                    ? "bg-[var(--hover)]"
                    : "hover:bg-[var(--hover)]"
                } ${inMonth ? "" : "opacity-30"}`}
              >
                <div className="absolute top-1 left-1.5 text-xs">{d.getDate()}</div>
                {info && (
                  <div className="absolute bottom-1 inset-x-0 flex justify-center gap-0.5">
                    {info.expense > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {info.income > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                    {info.pending > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 pulse-dot" />
                    )}
                    {info.projected > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="space-y-2"
          >
            <h2 className="text-lg font-semibold px-1">
              {selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </h2>
            {selectedTxns.length === 0 ? (
              <div className="glass p-6 text-center text-sm text-[var(--ink-muted)]">Nothing on this day.</div>
            ) : (
              <>
                <div className="text-xs text-[var(--ink-muted)] px-1">
                  Total: {formatMoney(selectedTxns.reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0), 0), settings.currency)}
                </div>
                {selectedTxns.map((t) => (
                  <TransactionRow key={t.id} txn={t} />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
