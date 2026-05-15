import { streamText, stepCountIs } from "ai";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import { createGroq } from "@ai-sdk/groq";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { toAISDKTools } from "@/lib/agent/tools";
import type { AgentMemory, Settings } from "@/lib/types";

export const runtime = "nodejs"; // Fluid Compute; AI Gateway is fine here

interface AgentRequestBody {
  messages: ModelMessage[];
  memory: AgentMemory[];
  settings: Pick<Settings, "userName" | "currency">;
  /** User-pasted Groq key — sent only over HTTPS to our own route. Server uses it once and discards. */
  groqKey?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as AgentRequestBody;
  const { messages, memory, settings, groqKey } = body;

  // Prefer the user-pasted key from the request body; fall back to a server-side env.
  // The user's key is never persisted on the server.
  const apiKey = groqKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "No Groq API key configured. Add one in /settings/ai." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const groq = createGroq({ apiKey });

  const system = buildSystemPrompt(memory, settings);

  // Note: tools here only DECLARE the schema. Execution happens client-side
  // via lib/agent/dispatch.ts so the dispatcher can enforce safety tiers
  // and write the AgentAction log against the live store.
  const tools = toAISDKTools();

  // AI SDK v6 deviation: uses stopWhen + stepCountIs instead of maxSteps.
  // toTextStreamResponse replaces toDataStreamResponse from v4/v5.
  const result = await streamText({
    model: groq("llama-3.3-70b-versatile"),
    system,
    messages,
    tools: tools as never,
    stopWhen: stepCountIs(5) as never,
  });

  return result.toTextStreamResponse();
}
