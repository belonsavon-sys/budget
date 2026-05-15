import { z } from "zod";
import type { ToolSpec } from "../types";

export const addNote: ToolSpec = {
  name: "addNote",
  description: "Create a new note in the Notes section.",
  tier: "auto",
  parameters: z.object({
    title: z.string().describe("Note title"),
    content: z.string().describe("Note body"),
    pinned: z.boolean().optional().default(false).describe("Whether to pin the note"),
  }),
  execute(args, ctx) {
    const state = ctx.storeGet();
    const now = new Date().toISOString();
    // addNote in store takes Omit<Note, "id" | "createdAt" | "updatedAt">
    state.addNote({
      title: args.title,
      content: args.content,
      pinned: args.pinned ?? false,
      tagIds: [],
    });
    // Get the newly created note (last in array)
    const note = ctx.storeGet().notes.at(-1);
    const id = note?.id ?? `n-${now}`;
    return { result: { id }, inverse: { id } };
  },
};
