import { z } from "zod";
import { uid } from "../../utils";
import type { ToolSpec } from "../types";
import type { ScenarioDeltaKind } from "../../types";

export const addScenario: ToolSpec = {
  name: "addScenario",
  description:
    "Create a new What-If scenario (e.g., 'what if I got a raise?'). The scenario is not activated — user must toggle it on.",
  tier: "confirm",
  parameters: z.object({
    name: z.string().describe("Scenario name"),
    startDate: z.string().describe("ISO date — when the scenario starts affecting projections"),
    endDate: z.string().optional().describe("ISO date — when the scenario ends (optional)"),
    kind: z
      .enum(["income-add", "expense-add", "expense-remove", "rate-change", "lump-sum"])
      .describe("Delta kind"),
    amount: z.number().describe("Amount of the delta (positive = inflow for income-add, lump-sum; positive = expense for expense-add)"),
    frequency: z
      .enum(["daily", "weekly", "biweekly", "monthly", "yearly"])
      .optional()
      .describe("Repeat frequency — ignored for lump-sum"),
    currency: z.string().optional().describe("Currency — defaults to user currency"),
  }),
  dryRun(args, ctx) {
    const currency = args.currency ?? ctx.storeGet().settings.currency;
    return `Create scenario "${args.name}": ${args.kind} of ${currency} ${args.amount} from ${args.startDate}`;
  },
  execute(args, ctx) {
    const state = ctx.storeGet();
    const currency = (args.currency ?? state.settings.currency) as Parameters<typeof state.addScenario>[0]["deltas"][0]["currency"];
    const scenario = state.addScenario({
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      pinned: false,
      color: "#a78bfa",
      icon: "Sparkles",
      deltas: [
        {
          id: uid("d"),
          kind: args.kind as ScenarioDeltaKind,
          amount: args.amount,
          currency,
          frequency: args.frequency,
        },
      ],
    });
    return { result: { id: scenario.id }, inverse: { id: scenario.id } };
  },
};

export const applyWhatIf: ToolSpec = {
  name: "applyWhatIf",
  description: "Toggle a What-If scenario on or off in the projection view.",
  tier: "confirm",
  parameters: z.object({
    scenarioId: z.string().describe("ID of the scenario to toggle"),
  }),
  dryRun(args, ctx) {
    const s = ctx.storeGet().scenarios.find((x) => x.id === args.scenarioId);
    const active = ctx.storeGet().activeScenarioIds.includes(args.scenarioId);
    return `${active ? "Deactivate" : "Activate"} scenario "${s?.name ?? args.scenarioId}"`;
  },
  execute(args, ctx) {
    ctx.storeGet().toggleActiveScenario(args.scenarioId);
    return { result: { id: args.scenarioId }, inverse: { id: args.scenarioId } };
  },
};
