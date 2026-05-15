"use client";
import { useStore } from "@/lib/store";
import { THEMES, type ThemeId } from "@/lib/themes";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export default function ThemePicker() {
  const themeId = useStore((s) => s.settings.themeId);
  const update = useStore((s) => s.updateSettings);

  function pick(id: ThemeId) {
    update({ themeId: id });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {THEMES.map((t, idx) => {
        const selected = t.id === themeId;
        return (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            onClick={() => pick(t.id)}
            className="text-left glass p-4 relative tap"
            style={{
              borderColor: selected ? "var(--accent)" : "var(--line)",
              borderWidth: selected ? 2 : 1,
            }}
          >
            <div
              className="h-32 rounded-lg overflow-hidden flex items-end p-3 relative"
              style={{ background: t.swatchBg }}
            >
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background: `radial-gradient(circle at 70% 30%, ${t.swatchAccent}55, transparent 60%)`,
                }}
              />
              <div className="relative z-10">
                <div
                  className="text-xl font-bold tracking-tight"
                  style={{ color: t.swatchAccent, fontFamily: t.displayFontVar }}
                >
                  $84,210
                </div>
                <div
                  className="text-[10px] opacity-60 uppercase tracking-widest"
                  style={{ color: t.swatchAccent }}
                >
                  net worth
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs text-[var(--ink-muted)] mt-0.5">{t.tagline}</div>
              </div>
              {selected && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--accent)", color: "var(--bg)" }}
                >
                  <Check size={14} />
                </div>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
