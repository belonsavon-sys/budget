"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { startRecognition, isSpeechRecognitionAvailable, type RecognitionHandle } from "@/lib/voice/recognition";

/**
 * Continuous SpeechRecognition listener that fires `budget:open-cmdk` when the
 * user says "hey budget". Mounted globally; only runs when the user has
 * opted in via `settings.voiceWakeWordEnabled`.
 *
 * Privacy notes:
 * - All recognition happens in-browser via the Web Speech API. No audio leaves
 *   the device.
 * - Some Chromium builds route audio through Google for transcription; users
 *   on those builds will see the standard mic permission prompt and can
 *   inspect their browser's network behaviour.
 */
const WAKE_PHRASES = ["hey budget", "budget"];

export default function WakeWord() {
  const enabled = useStore((s) => s.settings.voiceWakeWordEnabled);
  const handleRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => {
    if (!enabled || !isSpeechRecognitionAvailable()) return;

    let cancelled = false;

    const restart = () => {
      if (cancelled) return;
      const h = startRecognition({
        continuous: true,
        interim: false,
        onTranscript: (text, isFinal) => {
          if (!isFinal) return;
          const lower = text.toLowerCase();
          if (WAKE_PHRASES.some((p) => lower.includes(p))) {
            window.dispatchEvent(new CustomEvent("budget:open-cmdk"));
          }
        },
        onError: () => {
          // Permission denied / no-speech / network — fall through; onEnd restarts.
        },
        onEnd: () => {
          // Browsers stop continuous recognition periodically; auto-restart.
          if (!cancelled) setTimeout(restart, 400);
        },
      });
      handleRef.current = h;
    };

    restart();

    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, [enabled]);

  return null;
}
