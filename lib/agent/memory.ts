"use client";
import { useStore } from "../store";

export function getMemoryContext(): string {
  const mems = useStore.getState().agentMemory;
  if (mems.length === 0) return "";
  return [
    "User-taught context:",
    ...mems.map((m) => `- (${m.kind}) ${m.text}`),
  ].join("\n");
}
