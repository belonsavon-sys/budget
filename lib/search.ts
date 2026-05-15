import type { Transaction, Note, Account, SavingsGoal, AgentAction } from "./types";

export type SearchResultKind = "transaction" | "note" | "account" | "goal" | "agent_action";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  snippet: string;
  date?: string;
  href: string;
}

interface SearchInput {
  transactions: Transaction[];
  notes: Note[];
  accounts: Account[];
  goals: SavingsGoal[];
  agentActions: AgentAction[];
  query: string;
  limit?: number;
}

function match(text: string | undefined, q: string): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(q);
}

export function search({
  transactions,
  notes,
  accounts,
  goals,
  agentActions,
  query,
  limit = 50,
}: SearchInput): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  const out: SearchResult[] = [];

  for (const t of transactions) {
    if (out.length >= limit) break;
    if (match(t.description, q) || match(t.notes, q)) {
      out.push({
        kind: "transaction",
        id: t.id,
        title: t.description,
        snippet: `${t.type === "income" ? "+" : t.type === "expense" ? "−" : "↔"} ${t.amount} ${t.currency}`,
        date: t.date,
        href: `/transactions#${t.id}`,
      });
    }
  }

  for (const n of notes) {
    if (out.length >= limit) break;
    if (match(n.title, q) || match(n.content, q)) {
      out.push({
        kind: "note",
        id: n.id,
        title: n.title,
        snippet: n.content.slice(0, 120),
        date: n.updatedAt,
        href: `/notes#${n.id}`,
      });
    }
  }

  for (const a of accounts) {
    if (out.length >= limit) break;
    if (match(a.name, q)) {
      out.push({
        kind: "account",
        id: a.id,
        title: a.name,
        snippet: `${a.type} · ${a.currency}`,
        href: `/accounts#${a.id}`,
      });
    }
  }

  for (const g of goals) {
    if (out.length >= limit) break;
    if (match(g.name, q)) {
      out.push({
        kind: "goal",
        id: g.id,
        title: g.name,
        snippet: `${g.current} / ${g.target}`,
        href: `/goals#${g.id}`,
      });
    }
  }

  for (const aa of agentActions) {
    if (out.length >= limit) break;
    if (match(aa.tool, q) || match(aa.rationale, q)) {
      out.push({
        kind: "agent_action",
        id: aa.id,
        title: `${aa.tool} · ${aa.actor}`,
        snippet: aa.rationale ?? JSON.stringify(aa.args).slice(0, 120),
        date: aa.ts,
        href: `/activity#${aa.id}`,
      });
    }
  }

  return out;
}
