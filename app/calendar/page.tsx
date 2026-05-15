"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatMoney, isSameDay } from "@/lib/utils";
import TransactionRow from "@/components/TransactionRow";
import Heatmap from "@/components/Calendar/Heatmap";
import ScenarioInspector from "@/components/Scenarios/ScenarioInspector";
import EmptyState from "@/components/Common/EmptyState";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const transactions = useStore((s) => s.transactions);
  const settings = useStore((s) => s.settings);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selected, setSelected] = useState<Date | null>(new Date());
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [dropTemplateId, setDropTemplateId] = useState<string | undefined>(undefined);
  const [dropDate, setDropDate] = useState<string | undefined>(undefined);

  // Compute daily nets for this month
  const dailyNets = useMemo(() => {
    const nets: Record<string, number> = {};
    for (const t of transactions) {
      const d = new Date(t.date);
      const iso = toIso(d);
      const prev = nets[iso] ?? 0;
      if (t.type === "income") nets[iso] = prev + t.amount;
      else if (t.type === "expense") nets[iso] = prev - t.amount;
    }
    return nets;
  }, [transactions]);

  const selectedTxns = useMemo(
    () =>
      selected
        ? transactions
            .filter((t) => isSameDay(new Date(t.date), selected))
            .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        : [],
    [selected, transactions]
  );

  function handleScenarioDrop(templateId: string, dateIso: string) {
    setDropTemplateId(templateId);
    setDropDate(dateIso);
    setInspectorOpen(true);
  }

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
        <Heatmap
          monthDate={cursor}
          dailyNets={dailyNets}
          weekStartsMonday={settings.weekStartsMonday}
          selectedDate={selected}
          onDayClick={(d) => setSelected(d)}
          onScenarioDrop={handleScenarioDrop}
        />
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
              <EmptyState
                icon={<CalendarDays size={24} />}
                title="Nothing on this day"
                description={
                  toIso(selected) > toIso(new Date())
                    ? "Drop a scenario blueprint to plan ahead."
                    : "No transactions recorded for this day."
                }
              />
            ) : (
              <>
                <div className="text-xs text-[var(--ink-muted)] px-1">
                  Total:{" "}
                  {formatMoney(
                    selectedTxns.reduce(
                      (s, t) =>
                        s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0),
                      0
                    ),
                    settings.currency
                  )}
                </div>
                {selectedTxns.map((t) => (
                  <TransactionRow key={t.id} txn={t} />
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ScenarioInspector
        open={inspectorOpen}
        onClose={() => { setInspectorOpen(false); setDropTemplateId(undefined); setDropDate(undefined); }}
        templateId={dropTemplateId}
        dropDate={dropDate}
      />
    </div>
  );
}
