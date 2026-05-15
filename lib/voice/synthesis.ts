"use client";

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export interface SpeakOptions {
  /** BCP-47 lang code; default "en-US". */
  lang?: string;
  /** 0.1 – 10. Default 1. */
  rate?: number;
  /** 0 – 1. Default 1. */
  volume?: number;
}

/** Speak the given text. Cancels any in-flight speech first. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSynthesisAvailable() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = opts.lang ?? "en-US";
  utt.rate = opts.rate ?? 1;
  utt.volume = opts.volume ?? 1;
  window.speechSynthesis.speak(utt);
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisAvailable()) return;
  window.speechSynthesis.cancel();
}
