"use client";
import { useStore } from "../store";
import { toolByName } from "./tools";
import { uid } from "../utils";
import type { AgentAction } from "../types";

interface DispatchInput {
  toolName: string;
  args: unknown;
  actor: "user" | "agent";
  rationale?: string;
  parentActionId?: string;
}

export type DispatchResult =
  | { status: "executed"; actionId: string; result: unknown }
  | { status: "needs-confirm"; preview: string; tool: string; args: unknown }
  | { status: "blocked"; reason: string };

export async function executeTool(input: DispatchInput): Promise<DispatchResult> {
  const tool = toolByName(input.toolName);
  if (!tool) return { status: "blocked", reason: `Unknown tool: ${input.toolName}` };

  const state = useStore.getState();

  // Kill switch — blocks all auto/confirm-tier calls when enabled
  if (state.settings.agentKillSwitch && tool.tier !== "explicit") {
    return { status: "blocked", reason: "Agent kill switch is on" };
  }

  const householdId = state.currentHouseholdId ?? "";
  const ctx = { storeGet: useStore.getState, storeSet: useStore.setState, householdId };

  if (tool.tier === "explicit") {
    return { status: "blocked", reason: `${tool.name} requires an explicit user click` };
  }
  if (tool.tier === "confirm" && input.actor === "agent") {
    return {
      status: "needs-confirm",
      preview: tool.dryRun?.(input.args, ctx) ?? `${tool.name}(${JSON.stringify(input.args)})`,
      tool: tool.name,
      args: input.args,
    };
  }

  // Run the tool
  const { result, inverse } = await tool.execute(input.args, ctx);

  const now = new Date().toISOString();
  const action: Omit<AgentAction, "id" | "createdAt" | "updatedAt" | "householdId"> = {
    ts: now,
    actor: input.actor,
    tier: tool.tier,
    tool: tool.name,
    args: input.args,
    result,
    inverse,
    rationale: input.rationale,
    parentActionId: input.parentActionId,
  };
  // addAgentAction generates id/createdAt/updatedAt/householdId internally
  const saved = useStore.getState().addAgentAction(action);
  return { status: "executed", actionId: saved.id, result };
}

/** Invert an action: read the stored inverse blob and call the matching reverse mutation. */
export async function undoAction(actionId: string): Promise<void> {
  const state = useStore.getState();
  const action = state.agentActions.find((a) => a.id === actionId);
  if (!action || action.undoneAt) return;

  // For each tool, define the inverse here — keep it co-located with the action's tool name.
  switch (action.tool) {
    case "addTransaction": {
      const inv = action.inverse as { id: string };
      state.removeTransaction(inv.id);
      break;
    }
    case "categorizeTransactions": {
      const inv = action.inverse as Array<{ id: string; prevCategoryId?: string }>;
      for (const x of inv) state.updateTransaction(x.id, { categoryId: x.prevCategoryId });
      break;
    }
    case "tagTransaction": {
      const inv = action.inverse as { id: string; hadTag: boolean; tagId: string };
      if (!inv.hadTag) {
        const tx = state.transactions.find((t) => t.id === inv.id);
        if (tx) state.updateTransaction(inv.id, { tagIds: tx.tagIds.filter((t) => t !== inv.tagId) });
      }
      break;
    }
    case "splitTransaction": {
      const inv = action.inverse as { id: string; prevSplits: unknown };
      state.updateTransaction(inv.id, { splits: inv.prevSplits as never });
      break;
    }
    case "addNote": {
      const inv = action.inverse as { id: string };
      state.removeNote(inv.id);
      break;
    }
    case "addReminder": {
      const inv = action.inverse as { id: string };
      state.removeReminder(inv.id);
      break;
    }
    case "addScenario": {
      const inv = action.inverse as { id: string };
      state.removeScenario(inv.id);
      break;
    }
    case "applyWhatIf": {
      const inv = action.inverse as { id: string };
      state.toggleActiveScenario(inv.id);
      break;
    }
  }

  state.markActionUndone(actionId);
}

/** Generate a one-off action ID (used by the store's addAgentAction internally). */
export { uid };
