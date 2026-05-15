"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useStore } from "@/lib/store";
import { project } from "@/lib/projection";
import type { ProjectionHorizon } from "@/lib/types";
import TimeMachine from "@/components/TimeMachine";
import ScenarioTray from "@/components/Scenarios/ScenarioTray";
import ScenarioInspector from "@/components/Scenarios/ScenarioInspector";

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

  return (
    <>
      <div className="space-y-4 pb-12 md:pr-60">
        <Link
          href="/"
          className="text-sm text-[var(--ink-muted)] inline-flex items-center gap-1 hover:underline"
        >
          <ChevronLeft size={14} /> Home
        </Link>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          Timeline
        </h1>

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

        {activeScenarios.length > 0 && (
          <div className="glass p-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)] mb-2">
              Active scenarios
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeScenarios.map((s) => (
                <div
                  key={s.id}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold"
                  style={{ background: s.color, color: "var(--bg)" }}
                >
                  {s.name}
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
