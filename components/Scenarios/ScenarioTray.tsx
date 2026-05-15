"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import { BLUEPRINTS } from "@/lib/scenarios";
import { useStore } from "@/lib/store";

export default function ScenarioTray() {
  const scenarios = useStore((s) => s.scenarios);
  const activeIds = useStore((s) => s.activeScenarioIds);
  const toggleActive = useStore((s) => s.toggleActiveScenario);
  const removeScenario = useStore((s) => s.removeScenario);
  const [expanded, setExpanded] = useState(false);

  function onDragStart(e: React.DragEvent, templateId: string) {
    e.dataTransfer.setData("application/x-scenario-template", templateId);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <>
      {/* Desktop: side rail (hidden on mobile) */}
      <aside
        className="hidden md:flex fixed right-4 top-24 bottom-8 w-56 flex-col gap-2 z-30 glass p-3 overflow-y-auto"
        aria-label="Scenario tray"
      >
        <div className="text-xs uppercase tracking-widest text-[var(--ink-muted)] px-1 mb-1">
          What-ifs
        </div>
        <div className="space-y-1.5">
          {BLUEPRINTS.map((b) => (
            <div
              key={b.templateId}
              draggable
              onDragStart={(e) => onDragStart(e, b.templateId)}
              className="tap cursor-grab active:cursor-grabbing rounded-full text-xs font-semibold px-3 py-1.5 select-none"
              style={{
                background: "var(--surface-2)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
              title="Drag onto the future"
            >
              {b.label}
            </div>
          ))}
        </div>

        {scenarios.length > 0 && (
          <>
            <div className="text-xs uppercase tracking-widest text-[var(--ink-muted)] px-1 mt-3 mb-1">
              Saved
            </div>
            <div className="space-y-1.5">
              {scenarios.map((s) => {
                const isActive = activeIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5"
                    style={{ background: "var(--surface-2)" }}
                  >
                    <button
                      onClick={() => toggleActive(s.id)}
                      className="tap flex-1 text-left text-xs font-medium"
                      style={{ color: isActive ? s.color : "var(--ink-muted)" }}
                      title={isActive ? "Deactivate" : "Activate"}
                    >
                      <span className="inline-flex items-center gap-1">
                        {isActive ? <Eye size={11} /> : <EyeOff size={11} />}
                        {s.name}
                      </span>
                    </button>
                    <button
                      onClick={() => removeScenario(s.id)}
                      className="tap text-xs opacity-60 hover:opacity-100"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </aside>

      {/* Mobile: bottom drawer */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30">
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="glass mx-3 mb-1 p-3 max-h-[60vh] overflow-y-auto"
            >
              <div className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mb-1.5">
                What-ifs · drag onto the future
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BLUEPRINTS.map((b) => (
                  <div
                    key={b.templateId}
                    draggable
                    onDragStart={(e) => onDragStart(e, b.templateId)}
                    className="tap cursor-grab active:cursor-grabbing rounded-full text-xs font-semibold px-3 py-1.5 select-none"
                    style={{
                      background: "var(--surface-2)",
                      color: "var(--ink)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {b.label}
                  </div>
                ))}
              </div>
              {scenarios.length > 0 && (
                <>
                  <div className="text-xs uppercase tracking-widest text-[var(--ink-muted)] mt-3 mb-1.5">
                    Saved
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scenarios.map((s) => {
                      const isActive = activeIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleActive(s.id)}
                          className="tap rounded-full text-xs font-medium px-3 py-1.5 inline-flex items-center gap-1"
                          style={{
                            background: isActive ? s.color : "var(--surface-2)",
                            color: isActive ? "var(--bg)" : "var(--ink-muted)",
                          }}
                        >
                          {isActive ? <Eye size={11} /> : <EyeOff size={11} />}
                          {s.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Toggle handle — sits ABOVE the existing mobile nav. Adjust if Nav overlaps. */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="tap absolute right-3 bottom-20 z-10 rounded-full px-3 py-1.5 text-xs font-semibold glass inline-flex items-center gap-1"
          style={{ color: "var(--ink)" }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          What-ifs
        </button>
      </div>
    </>
  );
}
