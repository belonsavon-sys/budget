"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";

export default function ThemeProvider() {
  const themeId = useStore((s) => s.settings.themeId);

  // Apply theme changes after hydration with a view-transition where supported.
  useEffect(() => {
    const target: ThemeId = isThemeId(themeId) ? themeId : DEFAULT_THEME;
    const html = document.documentElement;
    if (html.getAttribute("data-theme") === target) return;

    const apply = () => html.setAttribute("data-theme", target);
    const vt = document as unknown as { startViewTransition?: (fn: () => void) => unknown };
    if (typeof vt.startViewTransition === "function") {
      vt.startViewTransition(apply);
    } else {
      apply();
    }
  }, [themeId]);

  // Set the initial theme synchronously on mount before hydration completes.
  // Reads from the same persist key as the zustand store to avoid a flash.
  useEffect(() => {
    if (document.documentElement.getAttribute("data-theme")) return;
    try {
      const raw = localStorage.getItem("budget-store-v1");
      if (raw) {
        const parsed = JSON.parse(raw) as { state?: { settings?: { themeId?: unknown } } };
        const id = parsed?.state?.settings?.themeId;
        if (isThemeId(id)) {
          document.documentElement.setAttribute("data-theme", id);
          return;
        }
      }
    } catch {
      // localStorage may be unavailable; fall through to default.
    }
    document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
  }, []);

  return null;
}
