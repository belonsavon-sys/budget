# Wave 2 · Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship a 5-theme system (Architectural Light · Newsroom · Old-Money Ledger · Topographic Terminal · Deep Space) with instant <250ms switching. Architectural Light is the default. Aurora is retired.

**Architecture:** CSS custom-property tokens declared per-theme on `:root[data-theme="<id>"]`. A `ThemeProvider` reads from the Zustand store and sets `data-theme` on `<html>` with a 200ms `view-transition`-driven cross-fade. Charts and components read tokens via `var(--...)` — no hardcoded colors.

**Scope:** Visual layer only. Page structures (Home, Transactions, etc.) keep their current layouts. Deep redesigns (Time Machine hero, Copilot insight stream) land in Wave 3+.

**Tech Stack:** Tailwind v4 `@theme inline` + per-theme CSS files · `next/font/google` for per-theme display fonts · React 19 view-transitions API with CSS-fallback.

**Spec reference:** `docs/superpowers/specs/2026-05-14-agentic-budget-platform-design.md` §8 (Theme System) + §10 Wave 2.

**Exit criteria:** From `/settings/theme`, switching any theme visibly changes Home + Transactions + Reports + Goals in under 250ms with a clean cross-fade. All 5 themes pass an "eyeball test" — accents come through, no broken contrast, no leftover gradient artifacts. App still functions for unsigned + signed users.

---

## File Structure

### New files
- `lib/themes.ts` — theme metadata (id, name, mode, displayFont) + ThemeId type + THEMES array
- `app/themes/architectural.css` — light, cream paper, navy ink, burnt-orange accent
- `app/themes/newsroom.css` — light, FT pink, deep blue accent, two-column rhythm
- `app/themes/ledger.css` — light, parchment + vignette, walnut + brass
- `app/themes/terminal.css` — dark, near-black + contour ambient, phosphor green
- `app/themes/deep-space.css` — dark, void + Milky Way dust, lavender accent
- `components/Theme/ThemeProvider.tsx` — sets `data-theme` on html, view-transition cross-fade
- `components/Theme/ThemePicker.tsx` — album-cover-grid selector with mini-mockups
- `app/settings/theme/page.tsx` — picker page

### Modified files
- `lib/types.ts` — `Settings.themeId: ThemeId` field
- `lib/store.ts` — default `themeId: "architectural"` + persist
- `app/globals.css` — base styles use tokens; retire `.aurora`; `.glass`/`.gradient-text`/`.gradient-fill` rewritten to use tokens
- `app/layout.tsx` — load per-theme fonts via `next/font`; replace `<Aurora />` + `<ThemeBridge />` with `<ThemeProvider />`
- `components/Nav.tsx` — token-based active pill (no `gradient-fill`)
- `components/ThemeBridge.tsx` — deleted (replaced by ThemeProvider)
- `components/Aurora.tsx` — deleted
- `app/settings/page.tsx` — add link to `/settings/theme`

### Files NOT modified
- Page layouts (Home, Transactions, Calendar, Reports, Accounts, Goals, Notes, Search, Insights, Folders, Budgets) keep their structure. They inherit theming via tokens automatically.

---

## Token Contract

Every theme file at `:root[data-theme="<id>"]` defines:

```css
/* Surfaces */
--bg, --surface, --surface-2

/* Ink */
--ink, --ink-muted, --ink-faint

/* Accents + data */
--accent, --accent-2, --positive, --negative, --warning

/* Lines + depth */
--line, --line-strong, --shadow-card, --shadow-card-strong, --blur-glass

/* Type */
--font-display, --font-body, --font-mono

/* Radii + motion */
--radius-card, --radius-pill, --motion-fast, --motion-medium

/* Ambient */
--texture-url (optional), --grain-opacity (0..1), --ambient-svg-opacity
```

---

## Prerequisites

- [ ] **P1.** Dev server runs (already verified post-Wave-1). All Wave 1 commits intact on `feat/wave-1-foundation` branch.
- [ ] **P2.** Branch off to `feat/wave-2-themes` from `feat/wave-1-foundation`:

```bash
cd /Users/pierrebelonsavon/Documents/budget
git checkout -b feat/wave-2-themes
git status  # working tree clean
```

---

## Task 1: Theme metadata + types

**Files:**
- Create: `lib/themes.ts`
- Modify: `lib/types.ts`
- Modify: `lib/store.ts`

- [ ] **Step 1: Write `lib/themes.ts`**

```ts
export type ThemeId =
  | "architectural"
  | "newsroom"
  | "ledger"
  | "terminal"
  | "deep-space";

export type ThemeMode = "light" | "dark";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  mode: ThemeMode;
  /** CSS font-family value to apply to display headings */
  displayFontVar: string;
  /** Hex used for the picker swatch (the dominant accent) */
  swatchAccent: string;
  /** Hex used for the picker background */
  swatchBg: string;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "architectural",
    name: "Architectural Light",
    tagline: "Cream paper · navy ink · burnt orange",
    mode: "light",
    displayFontVar: "var(--font-cormorant)",
    swatchAccent: "#c2410c",
    swatchBg: "#f6f3ee",
  },
  {
    id: "newsroom",
    name: "Newsroom",
    tagline: "FT pink · serif · two-column print",
    mode: "light",
    displayFontVar: "var(--font-playfair)",
    swatchAccent: "#0a4a73",
    swatchBg: "#fff1e5",
  },
  {
    id: "ledger",
    name: "Old-Money Ledger",
    tagline: "Parchment · walnut · brass",
    mode: "light",
    displayFontVar: "var(--font-playfair)",
    swatchAccent: "#b8860b",
    swatchBg: "#e8dcc4",
  },
  {
    id: "terminal",
    name: "Topographic Terminal",
    tagline: "Bloomberg by Linear · monospace",
    mode: "dark",
    displayFontVar: "var(--font-plex-mono)",
    swatchAccent: "#34d399",
    swatchBg: "#050608",
  },
  {
    id: "deep-space",
    name: "Deep Space",
    tagline: "Cosmic dark · faint Milky Way · lavender",
    mode: "dark",
    displayFontVar: "var(--font-cormorant)",
    swatchAccent: "#a8a0e8",
    swatchBg: "#020310",
  },
];

export const DEFAULT_THEME: ThemeId = "architectural";
```

- [ ] **Step 2: Add `themeId` to `Settings` in `lib/types.ts`**

In the `Settings` interface, add `themeId: ThemeId;` (import `ThemeId` from `./themes`). Place it logically near `themeMode`.

- [ ] **Step 3: Default themeId in store**

In `lib/store.ts`, in `defaultSettings`, add `themeId: "architectural"` (import `ThemeId` from `./themes` or inline as string literal cast).

- [ ] **Step 4: Commit**

```bash
git add lib/themes.ts lib/types.ts lib/store.ts
git commit -m "feat(themes): theme metadata + ThemeId on settings"
```

---

## Task 2: Five theme CSS files

**Files:**
- Create: `app/themes/architectural.css`
- Create: `app/themes/newsroom.css`
- Create: `app/themes/ledger.css`
- Create: `app/themes/terminal.css`
- Create: `app/themes/deep-space.css`

Each file declares its full token set at `:root[data-theme="<id>"]`. The selector is required so themes only activate when html has the attribute.

- [ ] **Step 1: Write `app/themes/architectural.css`**

```css
:root[data-theme="architectural"] {
  --bg: #f6f3ee;
  --surface: rgba(255, 253, 247, 0.6);
  --surface-2: rgba(13, 20, 33, 0.04);

  --ink: #0d1421;
  --ink-muted: rgba(13, 20, 33, 0.65);
  --ink-faint: rgba(13, 20, 33, 0.35);

  --accent: #c2410c;
  --accent-2: #5b2a4e;
  --positive: #15803d;
  --negative: #b91c1c;
  --warning: #b45309;

  --line: rgba(13, 20, 33, 0.1);
  --line-strong: rgba(13, 20, 33, 0.2);
  --shadow-card: 0 8px 28px rgba(13, 20, 33, 0.06);
  --shadow-card-strong: 0 14px 44px rgba(13, 20, 33, 0.1);
  --blur-glass: 14px;

  --font-display: var(--font-cormorant), Georgia, serif;
  --font-body: var(--font-geist-sans), -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), monospace;

  --radius-card: 16px;
  --radius-pill: 14px;
  --motion-fast: 140ms;
  --motion-medium: 240ms;

  --grain-opacity: 0.4;
  --ambient-svg-opacity: 0;
  color-scheme: light;
}
```

- [ ] **Step 2: Write `app/themes/newsroom.css`**

```css
:root[data-theme="newsroom"] {
  --bg: #fff1e5;
  --surface: rgba(255, 255, 255, 0.55);
  --surface-2: rgba(13, 20, 33, 0.05);

  --ink: #0d1421;
  --ink-muted: rgba(13, 20, 33, 0.65);
  --ink-faint: rgba(13, 20, 33, 0.4);

  --accent: #0a4a73;
  --accent-2: #5b2a4e;
  --positive: #166534;
  --negative: #991b1b;
  --warning: #92400e;

  --line: rgba(13, 20, 33, 0.12);
  --line-strong: #0d1421;
  --shadow-card: 0 4px 16px rgba(13, 20, 33, 0.05);
  --shadow-card-strong: 0 10px 32px rgba(13, 20, 33, 0.08);
  --blur-glass: 6px;

  --font-display: var(--font-playfair), Georgia, serif;
  --font-body: var(--font-geist-sans), -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), monospace;

  --radius-card: 4px;
  --radius-pill: 4px;
  --motion-fast: 140ms;
  --motion-medium: 240ms;

  --grain-opacity: 0;
  --ambient-svg-opacity: 0;
  color-scheme: light;
}
```

- [ ] **Step 3: Write `app/themes/ledger.css`**

```css
:root[data-theme="ledger"] {
  --bg: #e8dcc4;
  --surface: rgba(255, 250, 235, 0.55);
  --surface-2: rgba(95, 60, 20, 0.08);

  --ink: #1f1810;
  --ink-muted: rgba(31, 24, 16, 0.7);
  --ink-faint: rgba(31, 24, 16, 0.45);

  --accent: #b8860b;
  --accent-2: #5b3a1a;
  --positive: #3d5a3c;
  --negative: #8b2b1f;
  --warning: #a16207;

  --line: rgba(95, 60, 20, 0.2);
  --line-strong: rgba(95, 60, 20, 0.35);
  --shadow-card: 0 6px 20px rgba(60, 40, 15, 0.08);
  --shadow-card-strong: 0 12px 36px rgba(60, 40, 15, 0.14);
  --blur-glass: 4px;

  --font-display: var(--font-playfair), Didot, Georgia, serif;
  --font-body: var(--font-cormorant), Georgia, serif;
  --font-mono: var(--font-geist-mono), monospace;

  --radius-card: 6px;
  --radius-pill: 8px;
  --motion-fast: 140ms;
  --motion-medium: 240ms;

  --grain-opacity: 0.55;
  --ambient-svg-opacity: 0;
  color-scheme: light;
}
```

- [ ] **Step 4: Write `app/themes/terminal.css`**

```css
:root[data-theme="terminal"] {
  --bg: #050608;
  --surface: rgba(212, 240, 224, 0.04);
  --surface-2: rgba(212, 240, 224, 0.08);

  --ink: #d4f0e0;
  --ink-muted: rgba(212, 240, 224, 0.65);
  --ink-faint: rgba(212, 240, 224, 0.4);

  --accent: #34d399;
  --accent-2: #22d3ee;
  --positive: #34d399;
  --negative: #f87171;
  --warning: #fbbf24;

  --line: rgba(52, 211, 153, 0.18);
  --line-strong: rgba(52, 211, 153, 0.4);
  --shadow-card: 0 4px 18px rgba(0, 0, 0, 0.45);
  --shadow-card-strong: 0 14px 44px rgba(0, 0, 0, 0.6);
  --blur-glass: 8px;

  --font-display: var(--font-plex-mono), ui-monospace, monospace;
  --font-body: var(--font-plex-mono), ui-monospace, monospace;
  --font-mono: var(--font-plex-mono), ui-monospace, monospace;

  --radius-card: 4px;
  --radius-pill: 4px;
  --motion-fast: 100ms;
  --motion-medium: 180ms;

  --grain-opacity: 0;
  --ambient-svg-opacity: 0.18;
  color-scheme: dark;
}
```

- [ ] **Step 5: Write `app/themes/deep-space.css`**

```css
:root[data-theme="deep-space"] {
  --bg: #020310;
  --surface: rgba(230, 232, 245, 0.04);
  --surface-2: rgba(230, 232, 245, 0.08);

  --ink: #e6e8f5;
  --ink-muted: rgba(230, 232, 245, 0.65);
  --ink-faint: rgba(230, 232, 245, 0.4);

  --accent: #a8a0e8;
  --accent-2: #8b7fd0;
  --positive: #9be0a8;
  --negative: #f4a3a3;
  --warning: #f5d97c;

  --line: rgba(230, 232, 245, 0.1);
  --line-strong: rgba(230, 232, 245, 0.25);
  --shadow-card: 0 8px 28px rgba(0, 0, 0, 0.6);
  --shadow-card-strong: 0 14px 44px rgba(0, 0, 0, 0.7);
  --blur-glass: 12px;

  --font-display: var(--font-cormorant), Georgia, serif;
  --font-body: var(--font-geist-sans), -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), monospace;

  --radius-card: 14px;
  --radius-pill: 12px;
  --motion-fast: 160ms;
  --motion-medium: 260ms;

  --grain-opacity: 0;
  --ambient-svg-opacity: 1;
  color-scheme: dark;
}
```

- [ ] **Step 6: Commit**

```bash
git add app/themes/
git commit -m "feat(themes): five theme CSS files with full token contract"
```

---

## Task 3: Refit `globals.css` to use tokens

**Files:**
- Modify: `app/globals.css`

The current `globals.css` has hardcoded values (`#a78bfa`, `rgba(255,255,255,0.65)`, etc.), the `.aurora` block, and `.gradient-text` / `.gradient-fill` classes built on the per-user gradient settings. All of that gets replaced with token references.

- [ ] **Step 1: Rewrite the file**

Replace `/Users/pierrebelonsavon/Documents/budget/app/globals.css` with:

```css
@import "tailwindcss";

/* Import all theme token sets — only one activates via data-theme on <html> */
@import "./themes/architectural.css";
@import "./themes/newsroom.css";
@import "./themes/ledger.css";
@import "./themes/terminal.css";
@import "./themes/deep-space.css";

/* Tailwind v4 theme bridge — map our tokens to Tailwind's color/font names */
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--ink);
  --color-muted: var(--ink-muted);
  --color-accent: var(--accent);
  --color-positive: var(--positive);
  --color-negative: var(--negative);
  --font-sans: var(--font-body);
  --font-mono: var(--font-mono);
  --font-display: var(--font-display);
  --radius-card: var(--radius-card);
}

html,
body {
  background: var(--bg);
  color: var(--ink);
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: contain;
  font-family: var(--font-body);
  transition: background var(--motion-medium) ease, color var(--motion-medium) ease;
}

/* Display + numerals utility */
.font-display {
  font-family: var(--font-display);
}
.font-numerals {
  font-family: var(--font-display);
  font-feature-settings: "tnum", "lnum";
}

/* Glass card — token-driven, theme-aware */
.glass {
  background: var(--surface);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  border-radius: var(--radius-card);
  -webkit-backdrop-filter: saturate(180%) blur(var(--blur-glass));
  backdrop-filter: saturate(180%) blur(var(--blur-glass));
}

/* Accent text — replaces gradient-text. Single brand accent. */
.accent-text {
  color: var(--accent);
}
.accent-fill {
  background: var(--accent);
  color: var(--bg);
}

/* Backwards-compat: existing components still use .gradient-text / .gradient-fill.
   Map them to the new single-accent so nothing breaks during Wave 2 migration. */
.gradient-text {
  color: var(--accent);
  background: none;
  -webkit-text-fill-color: currentColor;
}
.gradient-fill {
  background: var(--accent);
  color: var(--bg);
}

.pulse-dot {
  animation: pulse-dot 1.8s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.5; }
}

.shimmer { position: relative; overflow: hidden; }
.shimmer::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transform: translateX(-100%);
  animation: shimmer 1.6s ease-in-out infinite;
}
@keyframes shimmer { to { transform: translateX(100%); } }

.scrollbar-hide { scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }

input, textarea, select, button {
  font: inherit;
  color: inherit;
}
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}

.tap {
  transition: transform 120ms ease, background 120ms ease;
}
.tap:active { transform: scale(0.96); }

.safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom, 0) + 0.5rem); }
.safe-top { padding-top: env(safe-area-inset-top, 0); }

/* View-transition cross-fade for theme swaps (Chrome/Edge/Safari). */
@supports (view-transition-name: root) {
  ::view-transition-old(root), ::view-transition-new(root) {
    animation-duration: 200ms;
    animation-timing-function: ease;
  }
}

/* Terminal-theme ambient: subtle topographic contour lines layered on body bg. */
:root[data-theme="terminal"] body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: var(--ambient-svg-opacity);
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600' preserveAspectRatio='none'><g stroke='%2334d399' stroke-width='0.5' fill='none' opacity='0.6'><path d='M0,80 Q200,40 400,70 T800,30'/><path d='M0,160 Q200,110 400,150 T800,110'/><path d='M0,260 Q200,200 400,250 T800,210'/><path d='M0,360 Q200,300 400,360 T800,320'/><path d='M0,460 Q200,420 400,450 T800,430'/></g></svg>");
  background-size: cover;
}

/* Deep-space ambient: scattered stars + diagonal Milky Way dust. */
:root[data-theme="deep-space"] body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: var(--ambient-svg-opacity);
  background-image:
    radial-gradient(1px 1px at 22% 18%, rgba(244,237,224,0.5), transparent 60%),
    radial-gradient(1px 1px at 48% 40%, rgba(244,237,224,0.85), transparent 60%),
    radial-gradient(0.7px 0.7px at 78% 22%, rgba(244,237,224,0.45), transparent 60%),
    radial-gradient(0.9px 0.9px at 15% 55%, rgba(244,237,224,0.6), transparent 60%),
    radial-gradient(1.1px 1.1px at 62% 65%, rgba(244,237,224,0.9), transparent 60%),
    radial-gradient(0.6px 0.6px at 85% 50%, rgba(244,237,224,0.4), transparent 60%),
    radial-gradient(0.8px 0.8px at 35% 75%, rgba(244,237,224,0.55), transparent 60%),
    radial-gradient(0.5px 0.5px at 92% 85%, rgba(244,237,224,0.35), transparent 60%),
    radial-gradient(0.7px 0.7px at 50% 90%, rgba(244,237,224,0.5), transparent 60%),
    linear-gradient(115deg, transparent 35%, rgba(82,54,160,0.18) 50%, transparent 65%);
  background-size: cover;
}

/* Ledger-theme parchment grain via SVG turbulence. */
:root[data-theme="ledger"] body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: var(--grain-opacity);
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence baseFrequency='0.7' numOctaves='3'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.2  0 0 0 0 0.05  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}

/* Architectural-theme subtle warm grain. */
:root[data-theme="architectural"] body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: var(--grain-opacity);
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.4  0 0 0 0 0.3  0 0 0 0 0.2  0 0 0 0.04 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat(themes): refit globals.css to tokens + per-theme ambient backgrounds"
```

---

## Task 4: Load per-theme display fonts via `next/font`

**Files:**
- Modify: `app/layout.tsx`

Add `Cormorant_Garamond`, `Playfair_Display`, and `IBM_Plex_Mono` alongside the existing `Geist` + `Geist_Mono`.

- [ ] **Step 1: Edit `app/layout.tsx`**

At the top of the file, expand the `next/font/google` import:

```tsx
import { Geist, Geist_Mono, Cormorant_Garamond, Playfair_Display, IBM_Plex_Mono } from "next/font/google";
```

Replace the font-instantiation block:

```tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["400","500","600","700"], display: "swap" });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400","500","600","700","800"], style: ["normal","italic"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400","500","600","700"], display: "swap" });
```

In the `<html>` element, expand the className to include all font variables:

```tsx
<html
  lang="en"
  className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${playfair.variable} ${plexMono.variable} h-full antialiased`}
  suppressHydrationWarning
>
```

- [ ] **Step 2: Smoke-test**

```bash
npm run dev -- -p 3001
```

Wait for "Ready". Curl `/` — expect 200. DevTools → Network → should see the 3 new font files downloading on first load. Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(themes): load Cormorant, Playfair, IBM Plex Mono via next/font"
```

---

## Task 5: ThemeProvider + retire Aurora & ThemeBridge

**Files:**
- Create: `components/Theme/ThemeProvider.tsx`
- Modify: `app/layout.tsx`
- Delete: `components/Aurora.tsx`
- Delete: `components/ThemeBridge.tsx`

The `ThemeBridge` component currently writes `--grad-*` CSS variables onto `<html>` from store settings, and toggles `.dark`. Both behaviors are obsolete: theme tokens come from CSS files, light/dark is implicit per theme.

- [ ] **Step 1: Write `ThemeProvider`**

`/Users/pierrebelonsavon/Documents/budget/components/Theme/ThemeProvider.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { DEFAULT_THEME, type ThemeId } from "@/lib/themes";

const ALL_THEMES: ThemeId[] = ["architectural", "newsroom", "ledger", "terminal", "deep-space"];

function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (ALL_THEMES as string[]).includes(v);
}

export default function ThemeProvider() {
  const themeId = useStore((s) => s.settings.themeId);

  useEffect(() => {
    const target: ThemeId = isThemeId(themeId) ? themeId : DEFAULT_THEME;
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    if (current === target) return;

    // View-transition cross-fade where supported; fall back to instant swap.
    const apply = () => html.setAttribute("data-theme", target);
    const vt = (document as unknown as { startViewTransition?: (fn: () => void) => unknown });
    if (typeof vt.startViewTransition === "function") {
      vt.startViewTransition(apply);
    } else {
      apply();
    }
  }, [themeId]);

  // Set initial theme before hydration to avoid a flash. Safe because it only
  // reads from localStorage (the zustand persist key).
  useEffect(() => {
    if (document.documentElement.getAttribute("data-theme")) return;
    try {
      const raw = localStorage.getItem("budget-store-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        const id = parsed?.state?.settings?.themeId;
        if (isThemeId(id)) {
          document.documentElement.setAttribute("data-theme", id);
          return;
        }
      }
    } catch {}
    document.documentElement.setAttribute("data-theme", DEFAULT_THEME);
  }, []);

  return null;
}
```

- [ ] **Step 2: Wire into `app/layout.tsx` + remove old wrappers**

Replace imports of `ThemeBridge` and `Aurora` with `ThemeProvider`:

```tsx
import ThemeProvider from "@/components/Theme/ThemeProvider";
```

Delete the `<ThemeBridge />` and `<Aurora />` lines from the JSX. Mount `<ThemeProvider />` at the top of `<HouseholdProvider>` instead:

```tsx
<HouseholdProvider>
  <ThemeProvider />
  <PinGate>...</PinGate>
  <MigrationPrompt />
  <SwRegister />
</HouseholdProvider>
```

- [ ] **Step 3: Delete old files**

```bash
rm /Users/pierrebelonsavon/Documents/budget/components/Aurora.tsx
rm /Users/pierrebelonsavon/Documents/budget/components/ThemeBridge.tsx
```

- [ ] **Step 4: Verify build + smoke test**

```bash
npm run build
```

Expected: green. Then:

```bash
npm run dev -- -p 3001
```

Visit `http://localhost:3001/`. Expected: app renders in **Architectural Light** (cream + navy). DevTools → Elements → `<html>` has `data-theme="architectural"`. Kill dev.

- [ ] **Step 5: Commit**

```bash
git add -A app/layout.tsx components/Theme/ components/Aurora.tsx components/ThemeBridge.tsx
git commit -m "feat(themes): ThemeProvider with view-transition swap; retire Aurora + ThemeBridge"
```

---

## Task 6: Theme picker page

**Files:**
- Create: `components/Theme/ThemePicker.tsx`
- Create: `app/settings/theme/page.tsx`
- Modify: `app/settings/page.tsx`
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Write `ThemePicker`**

`/Users/pierrebelonsavon/Documents/budget/components/Theme/ThemePicker.tsx`:

```tsx
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
                <div className="text-[10px] opacity-60 uppercase tracking-widest" style={{ color: t.swatchAccent }}>
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
```

- [ ] **Step 2: Write `/app/settings/theme/page.tsx`**

```tsx
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import ThemePicker from "@/components/Theme/ThemePicker";

export default function ThemeSettingsPage() {
  return (
    <div className="space-y-6 pb-12">
      <header className="pt-2 md:pt-6">
        <Link href="/settings" className="text-sm text-[var(--ink-muted)] inline-flex items-center gap-1 hover:underline">
          <ChevronLeft size={14} /> Settings
        </Link>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 font-display">
          Theme
        </h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          Pick the personality of your app. Tap a card to apply instantly.
        </p>
      </header>
      <ThemePicker />
    </div>
  );
}
```

- [ ] **Step 3: Add a "Theme" link in `app/settings/page.tsx`**

Read the current file. Find the most natural place to add a section linking to `/settings/theme` — typically near "Appearance" or similar. Add a minimal `<Link href="/settings/theme">Theme · {current themeId}</Link>` row. Don't over-design.

- [ ] **Step 4: Optional — surface theme picker in Nav menu**

Skip in this task; users navigate via Settings.

- [ ] **Step 5: Verify**

```bash
npm run dev -- -p 3001
```

Visit `http://localhost:3001/settings/theme`. Expected: 5 album cards, current selection has a check + colored border. Click each — `<html data-theme="...">` updates immediately, page bg/ink/accent change. Kill dev.

- [ ] **Step 6: Commit**

```bash
git add components/Theme/ThemePicker.tsx app/settings/theme/ app/settings/page.tsx
git commit -m "feat(themes): /settings/theme picker page + entry from Settings"
```

---

## Task 7: Refit Nav component to use tokens

**Files:**
- Modify: `components/Nav.tsx`

Replace the `gradient-fill` background on the active nav pill (and any `gradient-text` for the brand logo) with token-driven equivalents.

- [ ] **Step 1: Read `components/Nav.tsx`**

- [ ] **Step 2: Replace usages**

Find `className="text-2xl font-bold tracking-tight gradient-text"` and change to `className="text-2xl font-bold tracking-tight font-display accent-text"` (the brand reads as accent color in display font).

Find `className="absolute inset-0 rounded-2xl gradient-fill -z-10"` and change to `className="absolute inset-0 rounded-2xl -z-10"` with an inline style `style={{ background: "var(--accent)" }}`. Same for `rounded-xl` on mobile.

Find `<motion.div ... className="absolute inset-0 rounded-xl gradient-fill -z-10" />` and apply the same fix.

Active-item text color: replace `text-white` with `style={{ color: "var(--bg)" }}` — text inverts to the theme bg color (cream on burnt-orange in Architectural, void on lavender in Deep Space, etc.).

- [ ] **Step 3: Verify the nav looks right in 2 themes**

`npm run dev -- -p 3001`. Visit `/` — confirm active pill is `var(--accent)` (burnt orange in default theme). Open `/settings/theme`, switch to Deep Space — confirm pill is lavender. Kill dev.

- [ ] **Step 4: Commit**

```bash
git add components/Nav.tsx
git commit -m "refactor(nav): token-driven active pill + accent brand text"
```

---

## Task 8: Refit page-level hardcoded colors

**Files:**
- Modify: `app/page.tsx`, `app/transactions/page.tsx`, `app/reports/page.tsx`, `app/goals/page.tsx`, `app/calendar/page.tsx`, `app/accounts/page.tsx`, `app/notes/page.tsx`, `app/insights/page.tsx`, `app/search/page.tsx`, `app/folders/page.tsx`, `app/folders/[year]/[month]/page.tsx`, `app/settings/page.tsx`, `app/budgets/page.tsx`
- Modify: `components/TransactionRow.tsx`, `components/QuickAddFAB.tsx`, `components/PinGate.tsx`, `components/Modal.tsx`, `components/Field.tsx`, `components/TransactionForm.tsx`, `components/RecurringForm.tsx`, `components/AnimatedNumber.tsx`

The pages use these patterns that need updating:
- `text-[var(--muted)]` → `text-[var(--ink-muted)]` (rename for clarity)
- `gradient-text` → `accent-text` (already mapped backward-compat in globals.css; refit gradually)
- `gradient-fill` background → inline `background: var(--accent)` or use the new `accent-fill` class
- Hardcoded greens/reds for amounts (`text-green-500`, `text-red-500`) → `text-[var(--positive)]` and `text-[var(--negative)]`
- Recharts custom colors: replace literal hex (`#a78bfa`, `#f472b6`, `#fb923c`) in component code with `var(--accent)` / `var(--accent-2)` / `var(--positive)`

This is a sweeping replace pass. Strategy:

- [ ] **Step 1: Cross-codebase replace of `--muted` → `--ink-muted`**

```bash
cd /Users/pierrebelonsavon/Documents/budget
grep -rln "var(--muted)" app components | xargs sed -i.bak 's/var(--muted)/var(--ink-muted)/g'
find app components -name "*.bak" -delete
```

- [ ] **Step 2: Replace red/green money colors**

```bash
grep -rln "text-green-500\|text-red-500" app components | xargs sed -i.bak \
  -e 's/text-green-500/text-[var(--positive)]/g' \
  -e 's/text-red-500/text-[var(--negative)]/g'
find app components -name "*.bak" -delete
```

- [ ] **Step 3: Replace bg-green/red usages**

```bash
grep -rln "bg-green-500\|bg-red-500\|bg-green-500\/15\|bg-red-500\/15" app components | xargs sed -i.bak \
  -e 's/bg-green-500\/15/bg-[color-mix(in_srgb,var(--positive)_15%,transparent)]/g' \
  -e 's/bg-red-500\/15/bg-[color-mix(in_srgb,var(--negative)_15%,transparent)]/g'
find app components -name "*.bak" -delete
```

- [ ] **Step 4: Run dev server & visit every route**

```bash
npm run dev -- -p 3001
```

Visit `/`, `/transactions`, `/calendar`, `/reports`, `/folders`, `/goals`, `/accounts`, `/notes`, `/search`, `/insights`, `/budgets`, `/settings`. For each, confirm: no visual regressions, accent color shows where appropriate. Note any leftover hardcoded `#xxxxxx` hex codes in user-facing visuals (NOT in `app/themes/*.css` — those are intentional).

- [ ] **Step 5: Targeted hex cleanup in Recharts components**

In `app/reports/page.tsx`, find any Recharts `<Cell fill="#xxxxxx" />` or `<Line stroke="..." />` calls using hardcoded colors. Replace with the CSS-var-resolved values via a helper:

```tsx
const accent = "var(--accent)";
const positive = "var(--positive)";
const negative = "var(--negative)";
```

(Note: Recharts SVG attributes accept CSS `var()` strings.)

In `app/folders/[year]/[month]/page.tsx`, same treatment.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(theme): replace hardcoded colors with token vars across pages and components"
```

---

## Task 9: Multi-theme smoke test

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

```bash
npm run dev -- -p 3001
```

- [ ] **Step 2: Walk all 5 themes through 5 key routes**

For each theme (Architectural, Newsroom, Ledger, Terminal, Deep Space):
- Open `/settings/theme`, click the theme.
- Visit `/`, `/transactions`, `/reports`, `/goals`, `/calendar`.
- For each route, confirm:
  - Background and ink colors are right for the theme
  - Accent (active nav pill, primary buttons) is the theme's accent
  - Money figures (`+$1,240`, `-$87`) use `var(--positive)` / `var(--negative)`
  - No leftover dark-purple-gradient from Aurora
  - No console errors
- Switch back. Confirm <250ms cross-fade.

- [ ] **Step 3: Kill dev server**

- [ ] **Step 4: Run final build + tests**

```bash
npm run build
npm test
```

Both must succeed. 11 tests pass; build registers 18+ routes (existing + `/settings/theme`).

- [ ] **Step 5: Commit verification marker**

```bash
git commit --allow-empty -m "chore: Wave 2 themes verified across all 5 themes on key routes"
```

---

## Done

Wave 2 is complete when all 9 tasks check out. Exit criteria from header are met.

**Next:** Wave 3 (Home + Time Machine) gets its own plan.
