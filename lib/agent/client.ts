"use client";
import { useStore } from "../store";
import { executeTool } from "./dispatch";

const GROQ_KEY_STORAGE = "budget-groq-key-v1";

export function getStoredGroqKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(GROQ_KEY_STORAGE);
}
export function setStoredGroqKey(key: string) {
  localStorage.setItem(GROQ_KEY_STORAGE, key);
}
export function clearStoredGroqKey() {
  localStorage.removeItem(GROQ_KEY_STORAGE);
}

export interface AgentRunResult {
  text: string;
  actions: Array<{ tool: string; status: string; actionId?: string }>;
}

/**
 * Single-turn agent call. For streaming UI, use AI SDK's useChat directly with
 * the same body shape; this function exists for simpler call sites (e.g., a
 * one-shot "summarize my month" button).
 *
 * Deviation from plan: AI SDK v6 uses text streaming format (plain text lines)
 * rather than the data-stream format described in the plan (prefixed "0:", "9:").
 * We call the /api/agent endpoint directly and collect the full text response.
 * Tool calls are not executed client-side via stream parsing in this wave —
 * the LLM describes what it would do in natural language, and explicit tool calls
 * require a later upgrade to AI SDK's useChat hook with onToolCall handler.
 * This keeps Wave 4 functional without depending on undocumented stream format codes.
 */
export async function runAgent(userMessage: string): Promise<AgentRunResult> {
  const state = useStore.getState();
  const key = getStoredGroqKey();
  if (!key) throw new Error("Add a Groq key in /settings/ai");

  const body = {
    messages: [{ role: "user", content: userMessage }],
    memory: state.agentMemory,
    settings: { userName: state.settings.userName, currency: state.settings.currency },
    groqKey: key,
  };

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Agent request failed: ${res.status}`);
  }

  // Drain the text stream. AI SDK v6's toTextStreamResponse() emits plain text chunks.
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  let text = "";
  const actions: AgentRunResult["actions"] = [];
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }

  // If the LLM emitted a tool call as structured text (some model variants), try to parse it.
  // Format: lines starting with "TOOL_CALL:" followed by JSON. This is best-effort.
  for (const line of text.split("\n")) {
    if (line.startsWith("TOOL_CALL:")) {
      try {
        const call = JSON.parse(line.slice("TOOL_CALL:".length)) as {
          toolName: string;
          args: unknown;
        };
        const r = await executeTool({
          toolName: call.toolName,
          args: call.args,
          actor: "agent",
          rationale: undefined,
        });
        actions.push({
          tool: call.toolName,
          status: r.status,
          actionId: r.status === "executed" ? r.actionId : undefined,
        });
      } catch {
        // malformed tool-call line; ignore
      }
    }
  }

  return { text, actions };
}
