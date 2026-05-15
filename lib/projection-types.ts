import type { Account, Transaction, RecurringRule, WhatIfScenario, ProjectionHorizon } from "./types";

export interface ProjectionPoint {
  date: string;          // ISO yyyy-mm-dd
  value: number;         // net worth at end of that day
  bandLo: number;        // 25th percentile
  bandHi: number;        // 75th percentile
  /** First event marker on this day, if any. */
  event?: {
    kind: "income" | "expense" | "scenario";
    label: string;
  };
}

export interface ProjectionSnapshot {
  computedAt: string;
  horizon: ProjectionHorizon;
  nowDate: string;
  baseline: number;       // current net worth
  finalValue: number;     // last point's value
  points: ProjectionPoint[];
}

export interface ProjectOpts {
  horizon: ProjectionHorizon;
  /** ISO date considered "now"; default new Date().toISOString().slice(0,10). */
  now?: string;
  /** Active scenario ids to overlay; default: all pinned + explicit ids in store's activeScenarioIds. */
  activeScenarioIds?: string[];
  /** Monte Carlo path count. Default 0 (deterministic — band collapses to point). */
  mcPaths?: number;
  /** Seed for MC RNG. Default: hash of nowDate + scenarioIds. */
  mcSeed?: number;
}

export interface ProjectionInput {
  accounts: Account[];
  transactions: Transaction[];
  recurring: RecurringRule[];
  scenarios: WhatIfScenario[];
}
