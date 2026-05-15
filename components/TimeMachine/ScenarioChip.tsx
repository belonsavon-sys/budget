"use client";
import { motion } from "framer-motion";
import type { WhatIfScenario } from "@/lib/types";

interface Props {
  scenario: WhatIfScenario;
  x: number;
  y: number;
  onClick?: () => void;
}

export default function ScenarioChip({ scenario, x, y, onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="tap absolute text-[10px] font-semibold tracking-wide rounded-full px-2.5 py-1 shadow"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -100%)",
        background: scenario.color || "var(--accent)",
        color: "var(--bg)",
        whiteSpace: "nowrap",
      }}
    >
      {scenario.name}
    </motion.button>
  );
}
