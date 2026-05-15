"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { undoAction } from "@/lib/agent/dispatch";
import { History, Undo2, Filter, Sparkles } from "lucide-react";
import EmptyState from "@/components/Common/EmptyState";

type FilterStatus = "all" | "active" | "undone";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ActivityPage() {
  const agentActions = useStore((s) => s.agentActions);
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  const tools = ["all", ...Array.from(new Set(agentActions.map((a) => a.tool)))];

  const filtered = [...agentActions]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .filter((a) => toolFilter === "all" || a.tool === toolFilter)
    .filter((a) => {
      if (statusFilter === "active") return !a.undoneAt;
      if (statusFilter === "undone") return !!a.undoneAt;
      return true;
    });

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center gap-3">
        <History size={24} className="text-[var(--accent)]" />
        <h1 className="text-3xl font-display font-bold tracking-tight">Activity Log</h1>
      </header>

      {/* Filters */}
      <div className="glass p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide">
          <Filter size={12} />
          Filters
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Status filter */}
          {(["all", "active", "undone"] as FilterStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`tap px-3 py-1.5 rounded-full text-xs font-medium capitalize ${
                statusFilter === s
                  ? "gradient-fill text-white"
                  : "bg-[var(--surface-2)] text-[var(--ink-muted)] hover:bg-[var(--hover)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Tool filter */}
          {tools.map((t) => (
            <button
              key={t}
              onClick={() => setToolFilter(t)}
              className={`tap px-3 py-1.5 rounded-full text-xs font-mono ${
                toolFilter === t
                  ? "bg-[var(--accent)] text-[var(--bg)]"
                  : "bg-[var(--surface-2)] text-[var(--ink-muted)] hover:bg-[var(--hover)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Action list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <EmptyState
            icon={<Sparkles size={24} />}
            title="No agent actions yet"
            description="Actions performed by Copilot will appear here."
            action={{ label: "Open Copilot (⌘K)", onClick: () => window.dispatchEvent(new CustomEvent("budget:open-cmdk")) }}
          />
        )}
        {filtered.map((a) => (
          <div
            key={a.id}
            className={`glass p-4 ${a.undoneAt ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-mono font-medium text-sm text-[var(--accent)]">{a.tool}</span>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--ink-muted)]">{a.tier}</span>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--ink-muted)]">{a.actor}</span>
                  {a.undoneAt && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--negative)]/10 text-[var(--negative)]">undone</span>
                  )}
                </div>
                {a.rationale && (
                  <div className="text-sm text-[var(--ink-muted)] mb-1">{a.rationale}</div>
                )}
                <div className="text-xs text-[var(--ink-muted)]">{formatTime(a.ts)}</div>
                {a.args !== undefined && (
                  <pre className="mt-2 text-[10px] text-[var(--ink-muted)] bg-[var(--surface-2)] rounded-lg p-2 overflow-x-auto">
                    {JSON.stringify(a.args, null, 2)}
                  </pre>
                )}
              </div>
              {!a.undoneAt && (
                <button
                  onClick={() => undoAction(a.id)}
                  className="tap shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--hover)] text-sm font-medium"
                >
                  <Undo2 size={14} />
                  Undo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
