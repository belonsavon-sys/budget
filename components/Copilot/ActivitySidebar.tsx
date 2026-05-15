"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { undoAction } from "@/lib/agent/dispatch";
import { History, X, Undo2 } from "lucide-react";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function ActivitySidebar() {
  const [open, setOpen] = useState(false);
  const agentActions = useStore((s) => s.agentActions);

  // Keybinding: Cmd+. or Ctrl+.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const trigger = isMac ? e.metaKey : e.ctrlKey;
      if (trigger && e.key === ".") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const sorted = [...agentActions].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );

  return (
    <>
      {/* Trigger chip in bottom-right */}
      <button
        onClick={() => setOpen(true)}
        className="tap fixed bottom-24 md:bottom-8 right-20 md:right-20 z-40 flex items-center gap-1.5 px-3 py-2 glass rounded-full text-xs font-medium shadow"
        aria-label="Open activity log (Cmd+.)"
      >
        <History size={14} />
        <span className="hidden md:inline">Activity</span>
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/30"
            />
            <motion.aside
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-80 glass shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hairline)]">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-[var(--accent)]" />
                  <span className="font-semibold text-sm">Activity Log</span>
                </div>
                <button onClick={() => setOpen(false)} className="tap text-[var(--ink-muted)]">
                  <X size={16} />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {sorted.length === 0 && (
                  <div className="text-sm text-[var(--ink-muted)] text-center py-8">
                    No agent actions yet.<br />Use ⌘K to get started.
                  </div>
                )}
                {sorted.map((a) => (
                  <div
                    key={a.id}
                    className={`p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] ${a.undoneAt ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-mono font-medium text-[var(--accent)]">{a.tool}</span>
                          <span className="text-[10px] uppercase tracking-wide text-[var(--ink-muted)] bg-[var(--hover)] px-1.5 py-0.5 rounded-full">{a.tier}</span>
                          {a.undoneAt && (
                            <span className="text-[10px] uppercase tracking-wide text-[var(--negative)] bg-[var(--hover)] px-1.5 py-0.5 rounded-full">undone</span>
                          )}
                        </div>
                        {a.rationale && (
                          <div className="text-xs text-[var(--ink-muted)] mt-0.5 truncate">{a.rationale}</div>
                        )}
                        <div className="text-[10px] text-[var(--ink-muted)] mt-1">{formatTime(a.ts)}</div>
                      </div>
                      {!a.undoneAt && (
                        <button
                          onClick={() => undoAction(a.id)}
                          className="tap shrink-0 flex items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] mt-0.5"
                        >
                          <Undo2 size={12} />
                          Undo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-[var(--hairline)]">
                <a
                  href="/activity"
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] tap"
                >
                  View full activity log →
                </a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
