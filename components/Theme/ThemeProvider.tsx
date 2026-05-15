"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";

function applyThemeAndMeta(id: ThemeId) {
  const html = document.documentElement;
  html.setAttribute("data-theme", id);
  requestAnimationFrame(() => {
    const computedBg = getComputedStyle(html).getPropertyValue("--bg").trim();
    if (computedBg) {
      let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", computedBg);
    }
  });
}

export default function ThemeProvider() {
  const themeId = useStore((s) => s.settings.themeId);
  const hydrated = useStore((s) => s.hydrated);

  // Step 1: On mount, synchronously read localStorage and set data-theme BEFORE
  // the reactive effect below can fire with the Zustand default value.
  // This runs in the same paint frame as mount — no flash.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let id: ThemeId = DEFAULT_THEME;
    try {
      const raw = localStorage.getItem("budget-store-v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: { settings?: { themeId?: unknown } } };
        const maybeId = parsed?.state?.settings?.themeId;
        if (isThemeId(maybeId)) id = maybeId;
      }
    } catch {
      // localStorage may be unavailable; fall through to default.
    }
    applyThemeAndMeta(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // empty deps: runs exactly once on mount

  // Step 2: After Zustand's persist middleware hydrates (hydrated === true),
  // apply whatever themeId is now in the store. This handles in-session
  // theme changes as well as any mismatch after hydration completes.
  useEffect(() => {
    if (!hydrated) return; // wait for persist middleware to finish
    const target: ThemeId = isThemeId(themeId) ? themeId : DEFAULT_THEME;
    const html = document.documentElement;

    const apply = () => applyThemeAndMeta(target);
    const vt = document as unknown as { startViewTransition?: (fn: () => void) => unknown };
    if (typeof vt.startViewTransition === "function") {
      vt.startViewTransition(apply);
    } else {
      apply();
    }
  }, [themeId, hydrated]);

  return null;
}
