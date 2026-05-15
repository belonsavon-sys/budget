"use client";
import type { ProjectionHorizon } from "@/lib/types";
import { motion } from "framer-motion";

const PERIODS: ProjectionHorizon[] = ["1y", "5y", "10y", "30y", "all"];

export default function PeriodToggle({
  value,
  onChange,
}: {
  value: ProjectionHorizon;
  onChange: (h: ProjectionHorizon) => void;
}) {
  return (
    <div
      className="flex gap-1 p-1 rounded-full"
      style={{ background: "var(--surface-2)" }}
    >
      {PERIODS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="relative tap text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ minWidth: 30 }}
          >
            {active && (
              <motion.div
                layoutId="period-pill"
                className="absolute inset-0 rounded-full -z-10"
                style={{ background: "var(--accent)" }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span style={{ color: active ? "var(--bg)" : "var(--ink-muted)" }}>
              {p === "all" ? "ALL" : p.toUpperCase()}
            </span>
          </button>
        );
      })}
    </div>
  );
}
