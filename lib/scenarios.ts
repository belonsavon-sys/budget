import type { ScenarioDelta, Currency } from "./types";

export interface ScenarioBlueprint {
  /** Stable id used in the tray UI. */
  templateId: string;
  /** Display name in the tray (short — 12 chars or fewer). */
  label: string;
  /** Default name when saved as a WhatIfScenario. */
  defaultName: string;
  /** Lucide icon name. */
  icon: string;
  /** Theme-token-friendly color. */
  color: string;
  /** Default deltas — amount/date are placeholders until inspector edits them. */
  defaultDeltas: ScenarioDelta[];
  /** Whether the inspector should ask the user to confirm an `endDate`. */
  bounded: boolean;
  /** Whether the inspector should ask for a frequency. */
  recurring: boolean;
}

const usd: Currency = "USD";

export const BLUEPRINTS: ScenarioBlueprint[] = [
  {
    templateId: "raise",
    label: "+ Raise",
    defaultName: "Raise",
    icon: "ArrowUp",
    color: "var(--positive)",
    defaultDeltas: [
      { id: "tpl-raise", kind: "income-add", amount: 500, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "side-income",
    label: "+ Side income",
    defaultName: "Side income",
    icon: "Sparkles",
    color: "var(--positive)",
    defaultDeltas: [
      { id: "tpl-side", kind: "income-add", amount: 300, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "layoff",
    label: "− Layoff",
    defaultName: "Layoff",
    icon: "ArrowDown",
    color: "var(--negative)",
    defaultDeltas: [
      { id: "tpl-layoff", kind: "income-add", amount: -5000, currency: usd, frequency: "monthly" },
    ],
    bounded: true,
    recurring: true,
  },
  {
    templateId: "rent-change",
    label: "− Rent change",
    defaultName: "Rent change",
    icon: "Home",
    color: "var(--accent)",
    defaultDeltas: [
      { id: "tpl-rent", kind: "expense-add", amount: 200, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "baby",
    label: "Baby",
    defaultName: "Baby",
    icon: "Baby",
    color: "var(--accent)",
    defaultDeltas: [
      { id: "tpl-baby", kind: "expense-add", amount: 800, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "mortgage",
    label: "Mortgage",
    defaultName: "Mortgage",
    icon: "Home",
    color: "var(--accent)",
    defaultDeltas: [
      { id: "tpl-mortgage", kind: "expense-add", amount: 2500, currency: usd, frequency: "monthly" },
    ],
    bounded: false,
    recurring: true,
  },
  {
    templateId: "lump",
    label: "Lump expense",
    defaultName: "Lump expense",
    icon: "Receipt",
    color: "var(--negative)",
    defaultDeltas: [
      { id: "tpl-lump", kind: "lump-sum", amount: -2000, currency: usd },
    ],
    bounded: false,
    recurring: false,
  },
  {
    templateId: "sabbatical",
    label: "Sabbatical",
    defaultName: "Sabbatical",
    icon: "Palmtree",
    color: "var(--warning)",
    defaultDeltas: [
      { id: "tpl-sab", kind: "income-add", amount: -5000, currency: usd, frequency: "monthly" },
    ],
    bounded: true,
    recurring: true,
  },
];

export function blueprintById(id: string): ScenarioBlueprint | undefined {
  return BLUEPRINTS.find((b) => b.templateId === id);
}
