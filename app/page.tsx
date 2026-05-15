"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { project } from "@/lib/projection";
import { formatMoney } from "@/lib/utils";
import type { ProjectionHorizon } from "@/lib/types";
import CopilotGreeting from "@/components/Home/CopilotGreeting";
import AmbientTiles from "@/components/Home/AmbientTiles";
import TimeMachine from "@/components/TimeMachine";
import ScenarioTray from "@/components/Scenarios/ScenarioTray";
import ScenarioInspector from "@/components/Scenarios/ScenarioInspector";
import SectionHead from "@/components/Editorial/SectionHead";
import Skeleton from "@/components/Common/Skeleton";
import EmptyState from "@/components/Common/EmptyState";
import { Wallet, CalendarClock, Check, Clock } from "lucide-react";
import TransactionRow from "@/components/TransactionRow";
import Modal from "@/components/Modal";
import TransactionForm from "@/components/TransactionForm";
import type { Transaction } from "@/lib/types";
import { useStore as useStoreRaw } from "@/lib/store";

function LedgerRow({ txn }: { txn: Transaction }) {
  const settings = useStoreRaw((s) => s.settings);
  const categories = useStoreRaw((s) => s.categories);
  const [editing, setEditing] = useState(false);

  const category = categories.find((c) => c.id === txn.categoryId);
  const color =
    txn.type === "income" ? "var(--positive)" : txn.type === "transfer" ? "var(--accent-2)" : "var(--negative)";

  const dateObj = new Date(txn.date);
  const dayNum = dateObj.getUTCDate();
  const opacity = txn.status === "projected" ? "opacity-60" : "";

  return (
    <>
      <div
        className={`flex items-baseline gap-0 py-2 border-b border-[var(--hairline)] cursor-pointer group ${opacity}`}
        onClick={() => setEditing(true)}
      >
        {/* Date column — day number in left margin */}
        <div className="w-8 shrink-0 font-display italic text-sm text-[var(--ink-muted)] text-right pr-3">
          {dayNum}
        </div>

        {/* Description + category */}
        <div className="flex-1 min-w-0 pr-3">
          <div className="font-display italic text-sm leading-snug truncate group-hover:text-[var(--accent)] transition-colors">
            {txn.description || category?.name || "—"}
          </div>
          {category && (
            <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)] mt-0.5">
              {category.name}
            </div>
          )}
        </div>

        {/* Amount */}
        <div
          className="font-display font-semibold tabular-nums text-sm shrink-0"
          style={{ color, fontFeatureSettings: '"tnum", "lnum"' }}
        >
          {txn.type === "expense" ? "−" : txn.type === "income" ? "+" : ""}
          {formatMoney(txn.amount, txn.currency)}
        </div>

        {/* Status dot */}
        {txn.status === "pending" && (
          <div className="ml-2 shrink-0">
            <Clock size={11} className="text-amber-500" />
          </div>
        )}
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit transaction" size="md">
        <TransactionForm initial={txn} onDone={() => setEditing(false)} />
      </Modal>
    </>
  );
}

export default function Home() {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const recurring = useStore((s) => s.recurring);
  const scenarios = useStore((s) => s.scenarios);
  const activeScenarioIds = useStore((s) => s.activeScenarioIds);
  const goals = useStore((s) => s.goals);

  const [horizon, setHorizon] = useState<ProjectionHorizon>("5y");
  const [inspectorState, setInspectorState] = useState<
    { open: false } | { open: true; templateId?: string; dropDate?: string; scenarioId?: string }
  >({ open: false });

  const snapshot = useMemo(
    () =>
      project(
        { accounts, transactions, recurring, scenarios },
        { horizon, activeScenarioIds, mcPaths: 500 }
      ),
    [accounts, transactions, recurring, scenarios, activeScenarioIds, horizon]
  );

  const realTxns = transactions.filter((t) => t.status !== "projected");
  const now = new Date();
  const recent = useMemo(
    () =>
      [...realTxns]
        .sort((a, b) => +new Date(b.date) - +new Date(a.date))
        .slice(0, 6),
    [realTxns]
  );
  const upcoming = useMemo(
    () =>
      [...transactions]
        .filter((t) => new Date(t.date) >= now && (t.status === "pending" || t.status === "projected"))
        .sort((a, b) => +new Date(a.date) - +new Date(b.date))
        .slice(0, 4),
    [transactions, now]
  );

  const activeScenarios = scenarios.filter((s) => activeScenarioIds.includes(s.id));

  return (
    <>
      <div className="space-y-6 pb-12 md:pr-60">
        <CopilotGreeting />

        <Suspense fallback={<Skeleton height={280} />}>
          <TimeMachine
            snapshot={snapshot}
            currency={settings.currency}
            horizon={horizon}
            onHorizonChange={setHorizon}
            scenarios={activeScenarios}
            onScenarioDrop={(templateId, dateIso) =>
              setInspectorState({ open: true, templateId, dropDate: dateIso })
            }
            onScenarioClick={(id) => setInspectorState({ open: true, scenarioId: id })}
            height={280}
          />
        </Suspense>

        <AmbientTiles />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-2"
          >
            <SectionHead
              eyebrow={recent.length > 0 ? `RECENT · ${recent.length} ITEMS` : "RECENT"}
              title="Activity"
              trailing={
                <Link href="/transactions" className="hover:underline">
                  See all
                </Link>
              }
            />
            {recent.length === 0 ? (
              <EmptyState
                icon={<Wallet size={24} />}
                title="No transactions yet"
                description="Track your income and expenses to get started."
                action={{
                  label: "Add your first transaction",
                  onClick: () => window.dispatchEvent(new CustomEvent("budget:open-cmdk")),
                }}
              />
            ) : (
              <div>
                {/* Ledger header */}
                <div className="flex items-baseline gap-0 pb-1 mb-0.5 border-b border-[var(--hairline)]">
                  <div className="w-8 shrink-0" />
                  <div className="flex-1 text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)] pr-3">
                    Description
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                    Amount
                  </div>
                </div>
                {recent.map((t) => (
                  <LedgerRow key={t.id} txn={t} />
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-4"
          >
            <div>
              <SectionHead title="Upcoming" />
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock size={24} />}
                  title="Nothing scheduled"
                  description="Upcoming and pending transactions will appear here."
                />
              ) : (
                <div>
                  {upcoming.map((u) => {
                    const daysOut = Math.max(0, Math.ceil((+new Date(u.date) - +now) / 86400000));
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 py-2 border-b border-[var(--hairline)]"
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0 pulse-dot"
                          style={{ background: "var(--accent)" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-display italic text-sm truncate">{u.description}</div>
                          <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--ink-muted)]">
                            in {daysOut}d
                          </div>
                        </div>
                        <div
                          className="font-display text-sm tabular-nums shrink-0"
                          style={{ fontFeatureSettings: '"tnum", "lnum"' }}
                        >
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
                <SectionHead title="Goals" />
                <div className="space-y-2 mt-2">
                  {goals.slice(0, 3).map((g) => {
                    const pct = Math.min(100, (g.current / g.target) * 100);
                    return (
                      <Link href="/goals" key={g.id} className="block tap">
                        <div className="py-2 border-b border-[var(--hairline)]">
                          <div className="flex items-baseline justify-between mb-1.5">
                            <div className="font-display italic text-sm">{g.name}</div>
                            <div className="text-xs text-[var(--ink-muted)] tabular-nums font-display">
                              {formatMoney(g.current, settings.currency)} / {formatMoney(g.target, settings.currency)}
                            </div>
                          </div>
                          <div
                            className="h-px overflow-hidden"
                            style={{ background: "var(--hairline)" }}
                          >
                            <motion.div
                              className="h-full"
                              style={{ background: "var(--accent)" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
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

      <ScenarioTray />

      <ScenarioInspector
        open={inspectorState.open}
        onClose={() => setInspectorState({ open: false })}
        templateId={inspectorState.open ? inspectorState.templateId : undefined}
        dropDate={inspectorState.open ? inspectorState.dropDate : undefined}
        scenarioId={inspectorState.open ? inspectorState.scenarioId : undefined}
      />
    </>
  );
}
