import type { ToolSpec } from "../types";
import { addTransaction, categorizeTransactions, tagTransaction, splitTransaction } from "./transactions";
import { addNote } from "./notes";
import { addReminder } from "./reminders";
import { addScenario, applyWhatIf } from "./scenarios";

export const TOOLS: ToolSpec[] = [
  addTransaction,
  categorizeTransactions,
  tagTransaction,
  splitTransaction,
  addNote,
  addReminder,
  addScenario,
  applyWhatIf,
];

export function toolByName(name: string): ToolSpec | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Build the Vercel AI SDK `tools` object from our specs (server-side use). */
export function toAISDKTools(): Record<string, { description: string; parameters: unknown }> {
  return Object.fromEntries(
    TOOLS.map((t) => [t.name, { description: t.description, parameters: t.parameters }])
  );
}
