"use client";

// Web Speech API types (Chrome/Edge use webkitSpeechRecognition; Safari uses SpeechRecognition).
// TypeScript's lib.dom.d.ts has these as ambient types, but we declare a structural fallback.

interface SRConstructor {
  new (): SpeechRecognition;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  }
}

function getSRConstructor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionAvailable(): boolean {
  return getSRConstructor() !== null;
}

export interface RecognitionHandle {
  stop: () => void;
}

export interface RecognitionOptions {
  /** Default "en-US". */
  lang?: string;
  /** Listen indefinitely until stop() — default false (push-to-talk). */
  continuous?: boolean;
  /** Emit interim transcripts as the user speaks — default true. */
  interim?: boolean;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

/**
 * Start a speech recognition session. Returns a handle with `stop()`.
 * Returns null if the browser doesn't support SpeechRecognition.
 */
export function startRecognition(opts: RecognitionOptions): RecognitionHandle | null {
  const SR = getSRConstructor();
  if (!SR) {
    opts.onError?.("SpeechRecognition is not available in this browser.");
    return null;
  }

  const rec = new SR();
  rec.lang = opts.lang ?? "en-US";
  rec.continuous = opts.continuous ?? false;
  rec.interimResults = opts.interim ?? true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      if (result.isFinal) final += transcript;
      else interim += transcript;
    }
    if (final) opts.onTranscript(final.trim(), true);
    else if (interim) opts.onTranscript(interim.trim(), false);
  };

  rec.onerror = (ev) => {
    const err = (ev as unknown as { error?: string }).error ?? "unknown";
    opts.onError?.(err);
  };

  rec.onend = () => {
    opts.onEnd?.();
  };

  try {
    rec.start();
  } catch (err) {
    opts.onError?.((err as Error).message);
    return null;
  }

  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    },
  };
}
