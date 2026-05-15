import { z } from "zod";
import type { ToolSpec } from "../types";

export const addTransaction: ToolSpec = {
  name: "addTransaction",
  description:
    "Add a new transaction (income or expense) to the budget. Use this when the user says they spent or received money.",
  tier: "auto",
  parameters: z.object({
    type: z.enum(["income", "expense", "transfer"]).describe("Transaction type"),
    amount: z.number().positive().describe("Absolute amount (always positive)"),
    description: z.string().describe("Short description of the transaction"),
    accountId: z.string().optional().describe("Account ID — omit to use first active account"),
    categoryId: z.string().optional().describe("Category ID — omit if unknown"),
    date: z.string().optional().describe("ISO date string — defaults to today"),
  }),
  execute(args, ctx) {
    const state = ctx.storeGet();
    const accountId =
      args.accountId ?? state.accounts.find((a) => !a.archived)?.id ?? "a-checking";
    const date = args.date ?? new Date().toISOString().slice(0, 10);
    const txn = state.addTransaction({
      type: args.type,
      amount: args.amount,
      currency: state.settings.currency,
      description: args.description,
      accountId,
      categoryId: args.categoryId,
      tagIds: [],
      date,
      status: "paid",
    });
    return { result: { id: txn.id }, inverse: { id: txn.id } };
  },
};

export const categorizeTransactions: ToolSpec = {
  name: "categorizeTransactions",
  description:
    "Set the category for one or more transactions by their IDs. Use this to bulk-categorize uncategorized transactions.",
  tier: "auto",
  parameters: z.object({
    ids: z.array(z.string()).describe("Transaction IDs to categorize"),
    categoryId: z.string().describe("Category ID to apply"),
  }),
  execute(args, ctx) {
    const state = ctx.storeGet();
    const inverse = args.ids.map((id: string) => {
      const tx = state.transactions.find((t) => t.id === id);
      return { id, prevCategoryId: tx?.categoryId };
    });
    for (const id of args.ids) {
      state.updateTransaction(id, { categoryId: args.categoryId });
    }
    return { result: { count: args.ids.length }, inverse };
  },
};

export const tagTransaction: ToolSpec = {
  name: "tagTransaction",
  description: "Add a tag to a transaction. Does nothing if the tag is already present.",
  tier: "auto",
  parameters: z.object({
    id: z.string().describe("Transaction ID"),
    tagId: z.string().describe("Tag ID to add"),
  }),
  execute(args, ctx) {
    const state = ctx.storeGet();
    const tx = state.transactions.find((t) => t.id === args.id);
    const hadTag = tx?.tagIds.includes(args.tagId) ?? false;
    if (!hadTag && tx) {
      state.updateTransaction(args.id, { tagIds: [...tx.tagIds, args.tagId] });
    }
    return { result: { id: args.id, hadTag }, inverse: { id: args.id, hadTag, tagId: args.tagId } };
  },
};

export const splitTransaction: ToolSpec = {
  name: "splitTransaction",
  description:
    "Split a transaction across multiple categories. Each split has a categoryId, amount, and optional note.",
  tier: "confirm",
  parameters: z.object({
    id: z.string().describe("Transaction ID to split"),
    splits: z
      .array(
        z.object({
          categoryId: z.string(),
          amount: z.number().positive(),
          note: z.string().optional(),
        })
      )
      .min(2)
      .describe("Split allocations (must sum to the transaction amount)"),
  }),
  dryRun(args, ctx) {
    const tx = ctx.storeGet().transactions.find((t) => t.id === args.id);
    return `Split transaction "${tx?.description ?? args.id}" into ${args.splits.length} categories`;
  },
  execute(args, ctx) {
    const state = ctx.storeGet();
    const tx = state.transactions.find((t) => t.id === args.id);
    const prevSplits = tx?.splits;
    state.updateTransaction(args.id, { splits: args.splits });
    return { result: { id: args.id }, inverse: { id: args.id, prevSplits } };
  },
};
