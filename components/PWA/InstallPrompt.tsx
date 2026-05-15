"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "budget-install-prompt-dismissed-v1";
const DISMISS_DAYS = 30;

function isDismissed(): boolean {
  if (typeof localStorage === "undefined") return true;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts)) return false;
  const ageDays = (Date.now() - ts) / 86400000;
  return ageDays < DISMISS_DAYS;
}

function setDismissed() {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export default function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isDismissed()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setDismissed();
    setHidden(true);
    setEvent(null);
  }

  function dismiss() {
    setDismissed();
    setHidden(true);
  }

  return (
    <AnimatePresence>
      {!hidden && event && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="hidden md:flex fixed bottom-4 right-4 z-40 glass p-3 max-w-xs items-center gap-3"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            <Download size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Install budget</div>
            <div className="text-xs text-[var(--ink-muted)]">Works offline. One tap from your home screen.</div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={install}
              className="tap text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
            >
              Install
            </button>
            <button onClick={dismiss} aria-label="Dismiss" className="tap p-1 rounded-lg hover:bg-[var(--surface-2)]">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
