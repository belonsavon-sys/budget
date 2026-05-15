"use client";

/**
 * Read a CSS custom property from the document root at render time.
 * Used for Recharts components that require string color values at render time
 * and cannot accept CSS var() expressions directly in certain props.
 */
export function getThemeColor(token: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${token}`)
    .trim();
}
