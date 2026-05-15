"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { runAgent, getStoredGroqKey } from "@/lib/agent/client";
import { undoAction } from "@/lib/agent/dispatch";
import { Sparkles, Loader2, Undo2, Settings, X, Send, Mic, MicOff } from "lucide-react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { startRecognition, isSpeechRecognitionAvailable, type RecognitionHandle } from "@/lib/voice/recognition";
import { speak, cancelSpeech } from "@/lib/voice/synthesis";

interface ActionEntry {
  tool: string;
  status: string;
  actionId?: string;
}

export default function CmdK() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const recHandle = useRef<RecognitionHandle | null>(null);
  const voiceReadAloud = useStore((s) => s.settings.voiceReadAloud);
  const voiceAvailable = typeof window !== "undefined" && isSpeechRecognitionAvailable();
  const hasKey = typeof window !== "undefined" ? Boolean(getStoredGroqKey()) : false;

  // Keybinding: Cmd+K (Mac) / Ctrl+K (Win/Linux)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const trigger = isMac ? e.metaKey : e.ctrlKey;
      if (trigger && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // External open trigger (wake word dispatches this event)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("budget:open-cmdk", handler);
    return () => window.removeEventListener("budget:open-cmdk", handler);
  }, []);

  // Autofocus when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setResponse(null);
      setActions([]);
      setError(null);
      setInput("");
      setInterim("");
    } else {
      // Stop any in-flight recognition when modal closes
      recHandle.current?.stop();
      recHandle.current = null;
      setListening(false);
      cancelSpeech();
    }
  }, [open]);

  // Read responses aloud when enabled
  useEffect(() => {
    if (response && voiceReadAloud) speak(response);
  }, [response, voiceReadAloud]);

  const toggleVoice = () => {
    if (listening) {
      recHandle.current?.stop();
      recHandle.current = null;
      setListening(false);
      return;
    }
    if (!voiceAvailable) return;
    setInterim("");
    const handle = startRecognition({
      continuous: false,
      interim: true,
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setInput((prev) => (prev ? `${prev} ${text}` : text));
          setInterim("");
        } else {
          setInterim(text);
        }
      },
      onError: (err) => {
        setError(`Mic error: ${err}`);
        setListening(false);
      },
      onEnd: () => {
        setListening(false);
        setInterim("");
      },
    });
    if (handle) {
      recHandle.current = handle;
      setListening(true);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    setActions([]);
    try {
      const result = await runAgent(input.trim());
      setResponse(result.text);
      setActions(result.actions);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="tap fixed bottom-24 md:bottom-8 left-4 md:left-auto md:right-4 z-40 w-12 h-12 rounded-full gradient-fill flex items-center justify-center shadow-lg"
        aria-label="Open Copilot (Cmd+K)"
      >
        <Sparkles size={20} />
      </button>

      {/* Modal overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-x-4 top-1/4 md:inset-auto md:left-1/2 md:-translate-x-1/2 md:top-1/4 md:w-[560px] z-50"
            >
              <div className="glass rounded-3xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-[var(--hairline)]">
                  <Sparkles size={16} className="text-[var(--accent)] shrink-0" />
                  <span className="text-sm font-medium text-[var(--ink-muted)]">Copilot</span>
                  <div className="flex-1" />
                  <button onClick={() => setOpen(false)} className="tap text-[var(--ink-muted)]">
                    <X size={16} />
                  </button>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 px-4 py-3">
                  <input
                    ref={inputRef}
                    value={interim ? `${input}${input ? " " : ""}${interim}` : input}
                    onChange={(e) => {
                      // Disable text editing while listening to avoid cursor fights with the interim transcript
                      if (!listening) setInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={hasKey ? "Ask Copilot anything…" : "Add a Groq key to enable Copilot"}
                    disabled={!hasKey || loading}
                    className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--ink-muted)]"
                  />
                  {voiceAvailable && hasKey && (
                    <button
                      onClick={toggleVoice}
                      className="tap"
                      style={{ color: listening ? "var(--accent)" : "var(--ink-muted)" }}
                      aria-label={listening ? "Stop listening" : "Start voice input"}
                      title={listening ? "Stop" : "Voice input"}
                    >
                      {listening ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                    </button>
                  )}
                  {loading ? (
                    <Loader2 size={18} className="animate-spin text-[var(--ink-muted)]" />
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!hasKey || !input.trim()}
                      className="tap text-[var(--accent)] disabled:opacity-30"
                    >
                      <Send size={18} />
                    </button>
                  )}
                </div>

                {/* No key notice */}
                {!hasKey && (
                  <div className="px-4 pb-4">
                    <Link
                      href="/settings/ai"
                      onClick={() => setOpen(false)}
                      className="tap flex items-center gap-2 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
                    >
                      <Settings size={14} />
                      Configure Groq key →
                    </Link>
                  </div>
                )}

                {/* Response */}
                {(response !== null || error || actions.length > 0) && (
                  <div className="border-t border-[var(--hairline)] px-4 py-3 max-h-64 overflow-y-auto space-y-3">
                    {error && (
                      <div className="text-sm text-[var(--negative)] bg-[var(--surface-2)] rounded-xl p-3">
                        {error}
                      </div>
                    )}
                    {response !== null && !error && (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{response}</div>
                    )}
                    {actions.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-[var(--ink-muted)] uppercase tracking-wide">Actions</div>
                        {actions.map((a, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--surface-2)]">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono text-[var(--accent)] shrink-0">{a.tool}</span>
                              <span className={`text-xs shrink-0 ${a.status === "executed" ? "text-[var(--positive)]" : a.status === "blocked" ? "text-[var(--negative)]" : "text-[var(--ink-muted)]"}`}>
                                {a.status}
                              </span>
                            </div>
                            {a.actionId && a.status === "executed" && (
                              <button
                                onClick={() => undoAction(a.actionId!)}
                                className="tap flex items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)] shrink-0"
                              >
                                <Undo2 size={12} />
                                Undo
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-[var(--hairline)]">
                  <div className="text-xs text-[var(--ink-muted)] flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] font-mono text-[10px]">⌘K</kbd>
                    to toggle ·
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] font-mono text-[10px]">Enter</kbd>
                    to send ·
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] font-mono text-[10px]">Esc</kbd>
                    to close
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
