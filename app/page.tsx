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
import TransactionRow from "@/components/TransactionRow";
import Skeleton from "@/components/Common/Skeleton";
import EmptyState from "@/components/Common/EmptyState";
import { Wallet, CalendarClock } from "lucide-react";

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
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold font-display">Recent activity</h2>
              <Link href="/transactions" className="text-sm text-[var(--ink-muted)] hover:underline">
                See all
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState
                icon={<Wallet size={24} />}
                title="No transactions yet"
                description="Track your income and expenses to get started."
                action={{ label: "Add your first transaction", onClick: () => window.dispatchEvent(new CustomEvent("budget:open-cmdk")) }}
              />
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
            transition={{ delay: 0.25 }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold font-display px-1 mb-2">Upcoming</h2>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock size={24} />}
                  title="Nothing scheduled"
                  description="Upcoming and pending transactions will appear here."
                />
              ) : (
                <div className="space-y-2">
                  {upcoming.map((u) => {
                    const daysOut = Math.max(0, Math.ceil((+new Date(u.date) - +now) / 86400000));
                    return (
                      <div key={u.id} className="glass p-3 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
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
                <h2 className="text-lg font-semibold font-display px-1 mb-2">Goals</h2>
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
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ background: "var(--surface-2)" }}
                        >
                          <motion.div
                            className="h-full"
                            style={{ background: "var(--accent)" }}
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
