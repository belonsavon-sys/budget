"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { getStoredGroqKey, setStoredGroqKey, clearStoredGroqKey } from "@/lib/agent/client";
import { Field, Input, Button } from "@/components/Field";
import { Brain, Key, CheckCircle2, XCircle, Trash2, Plus, ShieldOff, Shield, Mic, Volume2 } from "lucide-react";
import Link from "next/link";
import type { AgentMemory } from "@/lib/types";

type MemoryKind = AgentMemory["kind"];

export default function SettingsAiPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const agentMemory = useStore((s) => s.agentMemory);
  const addAgentMemory = useStore((s) => s.addAgentMemory);
  const removeAgentMemory = useStore((s) => s.removeAgentMemory);

  // Groq key state (localStorage, not synced)
  const [groqKey, setGroqKeyLocal] = useState("");
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const k = getStoredGroqKey();
    setHasKey(Boolean(k));
    setGroqKeyLocal(k ?? "");
  }, []);

  const handleSaveKey = () => {
    const trimmed = groqKey.trim();
    if (!trimmed) return;
    setStoredGroqKey(trimmed);
    setHasKey(true);
  };

  const handleClearKey = () => {
    clearStoredGroqKey();
    setGroqKeyLocal("");
    setHasKey(false);
  };

  // Memory add form
  const [newMemKind, setNewMemKind] = useState<MemoryKind>("fact");
  const [newMemText, setNewMemText] = useState("");

  const handleAddMemory = () => {
    const text = newMemText.trim();
    if (!text) return;
    addAgentMemory({ kind: newMemKind, text, source: "user-taught" });
    setNewMemText("");
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6 flex items-center gap-3">
        <Link href="/settings" className="tap text-[var(--ink-muted)] hover:text-[var(--ink)] text-sm">
          ← Settings
        </Link>
      </header>

      <header className="flex items-center gap-3">
        <Brain size={24} className="text-[var(--accent)]" />
        <h1 className="text-3xl font-display font-bold tracking-tight">AI &amp; Copilot</h1>
      </header>

      {/* Section 1: Groq key */}
      <section className="glass p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Key size={14} />
          Groq API Key
        </div>
        <div className="flex items-center gap-2">
          {hasKey ? (
            <span className="flex items-center gap-1.5 text-sm text-[var(--positive)]">
              <CheckCircle2 size={16} /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-[var(--negative)]">
              <XCircle size={16} /> Not configured
            </span>
          )}
        </div>
        <Field label="Key (stored locally on this device — never sent to our servers)">
          <Input
            type="password"
            value={groqKey}
            onChange={(e) => setGroqKeyLocal(e.target.value)}
            placeholder="gsk_…"
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveKey(); }}
          />
        </Field>
        <div className="flex gap-2">
          <Button onClick={handleSaveKey} disabled={!groqKey.trim()}>
            Save
          </Button>
          {hasKey && (
            <Button variant="danger" onClick={handleClearKey}>
              Clear
            </Button>
          )}
        </div>
        <div className="text-xs text-[var(--ink-muted)]">
          Get a free key at{" "}
          <a
            href="https://console.groq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--ink)]"
          >
            console.groq.com
          </a>
          . No credit card required. The key is sent to our own /api/agent route once per request and never stored server-side.
        </div>
      </section>

      {/* Section 2: Memory CRUD */}
      <section className="glass p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Brain size={14} />
          Agent Memory
        </div>
        <div className="text-xs text-[var(--ink-muted)]">
          Facts you teach Copilot are included in every conversation. They're synced across devices with your household.
        </div>

        {agentMemory.length === 0 ? (
          <div className="text-sm text-[var(--ink-muted)] py-2">No memories yet.</div>
        ) : (
          <div className="space-y-2">
            {agentMemory.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[var(--surface-2)]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-[var(--hover)] text-[var(--ink-muted)]">
                      {m.kind}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)]">{m.source}</span>
                  </div>
                  <div className="text-sm">{m.text}</div>
                </div>
                <button
                  onClick={() => removeAgentMemory(m.id)}
                  className="tap text-[var(--ink-muted)] hover:text-[var(--negative)] shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new memory */}
        <div className="space-y-2 pt-2 border-t border-[var(--hairline)]">
          <div className="text-xs font-medium text-[var(--ink-muted)]">Add a memory</div>
          <div className="flex gap-2">
            <select
              value={newMemKind}
              onChange={(e) => setNewMemKind(e.target.value as MemoryKind)}
              className="px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] text-sm outline-none"
            >
              <option value="fact">Fact</option>
              <option value="preference">Preference</option>
              <option value="rule">Rule</option>
            </select>
            <input
              value={newMemText}
              onChange={(e) => setNewMemText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddMemory(); }}
              placeholder="e.g. I get paid biweekly on Fridays"
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--hairline)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            />
            <Button onClick={handleAddMemory} disabled={!newMemText.trim()}>
              <Plus size={14} className="inline" />
            </Button>
          </div>
        </div>
      </section>

      {/* Section 3: Kill switch */}
      <section className="glass p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {settings.agentKillSwitch ? <ShieldOff size={14} className="text-[var(--negative)]" /> : <Shield size={14} className="text-[var(--positive)]" />}
          Agent Kill Switch
        </div>
        <div className="text-xs text-[var(--ink-muted)]">
          When enabled, Copilot is blocked from taking any auto or confirm-tier actions. Explicit user-initiated actions still work.
        </div>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium">
              {settings.agentKillSwitch ? "Kill switch ON — Copilot is paused" : "Kill switch OFF — Copilot is active"}
            </div>
            <div className="text-xs text-[var(--ink-muted)] mt-0.5">
              Toggle to {settings.agentKillSwitch ? "re-enable" : "disable"} autonomous agent actions
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ agentKillSwitch: !settings.agentKillSwitch })}
            className={`tap relative w-12 h-7 rounded-full transition-colors shrink-0 ml-4 ${settings.agentKillSwitch ? "bg-[var(--negative)]" : "gradient-fill"}`}
          >
            <span
              className={`absolute top-0.5 ${settings.agentKillSwitch ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`}
            />
          </button>
        </label>
      </section>

      {/* Section 4: Voice */}
      <section className="glass p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Mic size={14} /> Voice
        </div>
        <div className="text-xs text-[var(--ink-muted)]">
          All voice processing happens in the browser via the Web Speech API. No audio leaves your device.
        </div>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium flex items-center gap-1.5">
              <Volume2 size={13} /> Read responses aloud
            </div>
            <div className="text-xs text-[var(--ink-muted)] mt-0.5">
              Copilot speaks its replies using your system voice
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ voiceReadAloud: !settings.voiceReadAloud })}
            className={`tap relative w-12 h-7 rounded-full transition-colors shrink-0 ml-4`}
            style={{ background: settings.voiceReadAloud ? "var(--accent)" : "var(--surface-2)" }}
          >
            <span
              className={`absolute top-0.5 ${settings.voiceReadAloud ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium">&quot;Hey budget&quot; wake word</div>
            <div className="text-xs text-[var(--ink-muted)] mt-0.5">
              Continuous listener that opens ⌘K when triggered. Uses the mic constantly while enabled.
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ voiceWakeWordEnabled: !settings.voiceWakeWordEnabled })}
            className={`tap relative w-12 h-7 rounded-full transition-colors shrink-0 ml-4`}
            style={{ background: settings.voiceWakeWordEnabled ? "var(--accent)" : "var(--surface-2)" }}
          >
            <span
              className={`absolute top-0.5 ${settings.voiceWakeWordEnabled ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`}
            />
          </button>
        </label>
      </section>
    </div>
  );
}
