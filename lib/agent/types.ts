import { z } from "zod";
import type { useStore } from "../store";

export type AgentTier = "auto" | "confirm" | "explicit";

export interface ToolCtx {
  storeGet: typeof useStore.getState;
  storeSet: typeof useStore.setState;
  householdId: string;
}

export interface ToolSpec<I extends z.ZodTypeAny = z.ZodTypeAny, R = unknown, V = unknown> {
  name: string;
  description: string;
  tier: AgentTier;
  parameters: I;
  execute: (args: z.infer<I>, ctx: ToolCtx) => Promise<{ result: R; inverse: V }> | { result: R; inverse: V };
  dryRun?: (args: z.infer<I>, ctx: ToolCtx) => string;
}
