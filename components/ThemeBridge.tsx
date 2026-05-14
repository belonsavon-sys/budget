"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function ThemeBridge() {
  const settings = useStore((s) => s.settings);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--grad-from", settings.gradientFrom);
    root.style.setProperty("--grad-via", settings.gradientVia);
    root.style.setProperty("--grad-to", settings.gradientTo);
  }, [settings.gradientFrom, settings.gradientVia, settings.gradientTo]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };
    if (settings.themeMode === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    apply(settings.themeMode);
  }, [settings.themeMode]);

  return null;
}
