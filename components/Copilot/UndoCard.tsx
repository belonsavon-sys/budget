"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { undoAction } from "@/lib/agent/dispatch";
import { Undo2, X } from "lucide-react";

const DISMISS_MS = 8000;

export default function UndoCard() {
  const agentActions = useStore((s) => s.agentActions);

  // Find the most recent auto-tier action that has not been undone
  const recent = [...agentActions]
    .reverse()
    .find((a) => a.tier === "auto" && !a.undoneAt);

  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!recent) return;
    if (recent.id === visibleId) return;

    // New action appeared — show it
    setVisibleId(recent.id);
    setProgress(100);
    startRef.current = Date.now();

    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    timerRef.current = setTimeout(() => {
      setVisibleId(null);
    }, DISMISS_MS);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / DISMISS_MS) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent?.id]);

  const visible = visibleId ? agentActions.find((a) => a.id === visibleId) : null;
  if (!visible) return null;

  const handleUndo = async () => {
    await undoAction(visible.id);
    setVisibleId(null);
  };

  const handleDismiss = () => setVisibleId(null);

  return (
    <div className="fixed bottom-24 md:bottom-8 right-4 z-50 w-72 glass shadow-xl rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div
        className="h-0.5 gradient-fill transition-none"
        style={{ width: `${progress}%` }}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide mb-0.5">
              Action complete
            </div>
            <div className="text-sm font-medium truncate">
              {visible.tool}
            </div>
            {visible.rationale && (
              <div className="text-xs text-[var(--ink-muted)] mt-0.5 truncate">{visible.rationale}</div>
            )}
          </div>
          <button onClick={handleDismiss} className="tap text-[var(--ink-muted)] hover:text-[var(--ink)] shrink-0">
            <X size={14} />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleUndo}
            className="tap flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[var(--surface-2)] hover:bg-[var(--hover)] text-sm font-medium"
          >
            <Undo2 size={14} />
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
