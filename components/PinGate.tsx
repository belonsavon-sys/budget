"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { sha256 } from "@/lib/utils";
import { Lock } from "lucide-react";

export default function PinGate({ children }: { children: React.ReactNode }) {
  const settings = useStore((s) => s.settings);
  const hydrated = useStore((s) => s.hydrated);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!settings.pinEnabled || !settings.pinHash) setUnlocked(true);
  }, [hydrated, settings.pinEnabled, settings.pinHash]);

  if (!hydrated) {
    return (
      <div className="fixed inset-0 grid place-items-center">
        <div className="w-12 h-12 rounded-full gradient-fill shimmer" />
      </div>
    );
  }

  if (settings.pinEnabled && settings.pinHash && !unlocked) {
    return (
      <div className="fixed inset-0 grid place-items-center p-6">
        <div className="glass p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full gradient-fill text-white grid place-items-center">
            <Lock size={22} />
          </div>
          <div className="text-xl font-semibold">Enter PIN</div>
          <input
            type="password"
            autoFocus
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                const hash = await sha256(pin);
                if (hash === settings.pinHash) setUnlocked(true);
                else {
                  setError("Wrong PIN");
                  setPin("");
                }
              }
            }}
            className="text-center text-2xl tracking-[0.5em] px-4 py-3 rounded-2xl bg-[var(--hover)] w-40"
          />
          {error && <div className="text-sm text-[var(--negative)]">{error}</div>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
