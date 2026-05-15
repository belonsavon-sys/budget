import { z } from "zod";
import type { ToolSpec } from "../types";

export const addReminder: ToolSpec = {
  name: "addReminder",
  description: "Create a new reminder with an optional recurrence.",
  tier: "auto",
  parameters: z.object({
    title: z.string().describe("Reminder title"),
    date: z.string().describe("ISO date string for when the reminder fires"),
    recurring: z
      .enum(["daily", "weekly", "biweekly", "monthly", "yearly"])
      .optional()
      .describe("Repeat frequency — omit for one-time reminder"),
  }),
  execute(args, ctx) {
    const state = ctx.storeGet();
    state.addReminder({
      title: args.title,
      date: args.date,
      recurring: args.recurring,
      done: false,
    });
    const reminder = ctx.storeGet().reminders.at(-1);
    const id = reminder?.id ?? `rm-${Date.now()}`;
    return { result: { id }, inverse: { id } };
  },
};
