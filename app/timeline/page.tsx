"use client";

import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { project } from "@/lib/projection";
import type { ProjectionHorizon } from "@/lib/types";
import TimeMachine from "@/components/TimeMachine";
import ScenarioTray from "@/components/Scenarios/ScenarioTray";
import ScenarioInspector from "@/components/Scenarios/ScenarioInspector";
import Skeleton from "@/components/Common/Skeleton";
import PageHeader from "@/components/Editorial/PageHeader";

export default function TimelinePage() {
  const settings = useStore((s) => s.settings);
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const recurring = useStore((s) => s.recurring);
  const scenarios = useStore((s) => s.scenarios);
  const activeScenarioIds = useStore((s) => s.activeScenarioIds);

  const [horizon, setHorizon] = useState<ProjectionHorizon>("5y");
  const [inspectorState, setInspectorState] = useState<
    { open: false } | { open: true; templateId?: string; dropDate?: string; scenarioId?: string }
  >({ open: false });

  const snapshot = useMemo(
    () =>
      project(
        { accounts, transactions, recurring, scenarios },
        { horizon, activeScenarioIds, mcPaths: 1000 }
      ),
    [accounts, transactions, recurring, scenarios, activeScenarioIds, horizon]
  );

  const activeScenarios = scenarios.filter((s) => activeScenarioIds.includes(s.id));

  const now = new Date();
  const year = now.getFullYear();
  const monthName = now.toLocaleDateString("en-US", { month: "long" }).toUpperCase();

  return (
    <>
      <div className="space-y-4 pb-12 md:pr-60">
        <Link
          href="/"
          className="text-sm text-[var(--ink-muted)] inline-flex items-center gap-1 hover:underline"
        >
          <ChevronLeft size={14} /> Home
        </Link>

        <PageHeader
          eyebrow={`EDITION · ${monthName} ${year} · VOL ${year}`}
          title="Timeline"
          byline="The full projection — past, present, and future scenarios overlaid"
        />

        <Suspense fallback={<Skeleton height={520} />}>
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
            height={520}
            expanded
          />
        </Suspense>

        {activeScenarios.length > 0 && (
          <div className="glass p-4">
            <div className="text-[9px] uppercase tracking-[0.22em] text-[var(--ink-muted)] mb-3">
              Active scenarios
            </div>
            <div className="space-y-0">
              {activeScenarios.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[var(--hairline)] last:border-b-0"
                >
                  {/* Accent swatch */}
                  <div
                    className="w-0.5 h-5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-display italic text-sm">{s.name}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[var(--ink-muted)] mt-0.5">
                      from {s.startDate.slice(0, 7)}
                    </div>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: s.color, opacity: 0.8 }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
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
