# Wave 6 · Polish & PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Final polish wave. Make the app feel installable, shareable, and accessible. No more big surgery — only refinement.

**Architecture:** A PWA install prompt component. A `@vercel/og`-powered share-card route. Dynamic theme-aware manifest. Accessibility tightening (focus rings, semantic landmarks, alt text). Loading skeletons for slow paths (initial projection compute on /timeline).

**Spec reference:** `docs/superpowers/specs/2026-05-14-agentic-budget-platform-design.md` §10 Wave 6.

**Exit criteria:** From the dev server in two themes (Architectural Light + Deep Space):
1. Visit `/` in Chrome — after a few interactions, a non-intrusive "Install budget" prompt appears in the bottom corner with Install / Maybe later buttons; clicking Install fires the beforeinstallprompt deferred prompt
2. Visit `/share/home` (a new route) — returns a 1200×630 PNG OG image with the current net worth, theme-themed background, money in display font
3. Visit `/transactions` with no transactions — shows a friendly empty state with a "Add your first transaction" button (not blank space)
4. Tab through Home — focus rings are visible on the active control, follow logical order, skip-to-main works
5. Open `/timeline` with no data — shows a loading skeleton, then the empty state, never a blank flash
6. The browser's manifest reports theme-color matching the active theme's `--bg` (architectural cream vs deep-space void)

---

## File Structure

### New files
- `components/PWA/InstallPrompt.tsx` — `beforeinstallprompt` capture + UI
- `components/Common/EmptyState.tsx` — shared empty-state component
- `components/Common/Skeleton.tsx` — shimmer skeleton primitive
- `app/share/home/route.ts` — OG image generator
- `app/manifest.ts` — dynamic manifest with theme color (replaces static `public/manifest.webmanifest`)

### Modified files
- `app/layout.tsx` — mount `<InstallPrompt />`, add skip-to-main link, set lang + theme-color meta
- `app/page.tsx` — Suspense boundary around `<TimeMachine>` with skeleton fallback
- `app/timeline/page.tsx` — same suspense wrapper
- `app/transactions/page.tsx` — use shared `<EmptyState>` for the no-transactions case
- `app/calendar/page.tsx`, `app/goals/page.tsx`, `app/accounts/page.tsx`, `app/notes/page.tsx` — empty states
- `components/Theme/ThemeProvider.tsx` — write `theme-color` `<meta>` on theme change
- `public/manifest.webmanifest` — remove (replaced by `app/manifest.ts`)

---

## Prerequisites

- [ ] **P1.** Branch off `feat/wave-5-pages`:

```bash
cd /Users/pierrebelonsavon/Documents/budget
git checkout -b feat/wave-6-polish
```

---

## Task 1: Dynamic manifest + theme-color meta

**Files:**
- Create: `app/manifest.ts`
- Delete: `public/manifest.webmanifest`
- Modify: `components/Theme/ThemeProvider.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write `app/manifest.ts`**

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "budget",
    short_name: "budget",
    description: "Your personal budget — with a copilot inside it",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ee",  // Architectural Light bg; ThemeProvider rewrites <meta theme-color> on the fly
    theme_color: "#f6f3ee",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
```

- [ ] **Step 2: Delete the static manifest**

```bash
rm /Users/pierrebelonsavon/Documents/budget/public/manifest.webmanifest
```

- [ ] **Step 3: Modify `ThemeProvider.tsx`**

In the effect that sets `data-theme`, ALSO update the `<meta name="theme-color">` tag's content attribute to match the theme's `--bg`. Look up the value via `getComputedStyle(html).getPropertyValue("--bg")`.

- [ ] **Step 4: Modify `app/layout.tsx`**

In the `metadata` export, ensure `manifest: "/manifest.webmanifest"` is changed to `manifest: "/manifest"` (Next.js will serve the dynamic manifest at `/manifest.webmanifest`). Also add a `<meta name="theme-color">` tag in the document head; ThemeProvider will keep it updated.

Note: Next.js `app/manifest.ts` is served at `/manifest.webmanifest` automatically.

- [ ] **Step 5: Verify + commit**

```bash
npm run build
git add -A
git commit -m "feat(pwa): dynamic manifest + theme-aware theme-color meta tag"
```

---

## Task 2: Install prompt component

**Files:**
- Create: `components/PWA/InstallPrompt.tsx`
- Modify: `app/layout.tsx` (mount it)

- [ ] **Step 1: Write `InstallPrompt.tsx`**

`"use client"` component. Captures `beforeinstallprompt` event, stashes the deferred prompt in state. Shows a small floating card bottom-right (above mobile nav, below ⌘K bar) with "Install budget" + "Maybe later" buttons.

Dismissal state stored in localStorage under `budget-install-prompt-dismissed-v1`. Once dismissed, the prompt won't reappear for 30 days.

Only shows if `event` was captured (browser supports PWA install AND user isn't already installed).

```tsx
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
          className="fixed bottom-24 md:bottom-4 right-4 z-40 glass p-3 max-w-xs flex items-center gap-3"
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
```

- [ ] **Step 2: Mount in layout**

Add `import InstallPrompt from "@/components/PWA/InstallPrompt"` and `<InstallPrompt />` inside `<HouseholdProvider>` alongside other ambient components.

- [ ] **Step 3: Commit**

```bash
git add components/PWA/ app/layout.tsx
git commit -m "feat(pwa): install prompt with 30-day dismissal cooldown"
```

---

## Task 3: OG share-card image generator

**Files:**
- Create: `app/share/home/route.ts`
- Optional: `package.json` (Next.js bundles `next/og`; no extra dep needed in Next 16)

Generate a 1200×630 PNG using `next/og`'s ImageResponse showing the user's net worth in the current theme's display font, with the theme's background. The query string carries the data (`?value=84210&currency=USD&theme=architectural`) so the route stays stateless.

- [ ] **Step 1: Write `app/share/home/route.ts`**

```ts
import { ImageResponse } from "next/og";
import { THEMES, type ThemeId } from "@/lib/themes";

export const runtime = "edge";

function fmt(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const value = Number(url.searchParams.get("value") ?? "0");
  const currency = url.searchParams.get("currency") ?? "USD";
  const themeId = (url.searchParams.get("theme") ?? "architectural") as ThemeId;
  const t = THEMES.find((x) => x.id === themeId) ?? THEMES[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: t.swatchBg,
          color: t.swatchAccent,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: 96,
          fontFamily: "Georgia",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 4, opacity: 0.55, textTransform: "uppercase" }}>
          Net worth
        </div>
        <div style={{ fontSize: 192, fontWeight: 700, lineHeight: 1, marginTop: 24 }}>
          {fmt(value, currency)}
        </div>
        <div style={{ marginTop: 48, fontSize: 28, opacity: 0.6 }}>
          budget · {t.name}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

- [ ] **Step 2: Verify locally**

After implementing, hit `http://localhost:3001/share/home?value=84210&currency=USD&theme=deep-space` and confirm the image renders.

- [ ] **Step 3: Commit**

```bash
git add app/share/
git commit -m "feat(share): OG image generator at /share/home for shareable net-worth cards"
```

---

## Task 4: Shared EmptyState + Skeleton + Suspense wrapping

**Files:**
- Create: `components/Common/EmptyState.tsx`
- Create: `components/Common/Skeleton.tsx`
- Modify: `app/page.tsx`, `app/timeline/page.tsx`, `app/transactions/page.tsx`, `app/calendar/page.tsx`, `app/goals/page.tsx`, `app/accounts/page.tsx`, `app/notes/page.tsx`

- [ ] **Step 1: Write `EmptyState.tsx`**

```tsx
import type { ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-8 text-center"
    >
      {icon && <div className="flex justify-center mb-3 text-[var(--ink-muted)]">{icon}</div>}
      <div className="font-display text-lg font-semibold">{title}</div>
      {description && <div className="text-sm text-[var(--ink-muted)] mt-1.5">{description}</div>}
      {action && (
        <button
          onClick={action.onClick}
          className="tap mt-4 px-4 py-2 rounded-xl font-medium text-sm"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Write `Skeleton.tsx`**

A token-themed shimmer block. Used for the TimeMachine area while projection computes (rarely needed since projection is fast — but the slot for it adds polish).

```tsx
"use client";

interface Props {
  height?: number;
  className?: string;
}

export default function Skeleton({ height = 280, className = "" }: Props) {
  return (
    <div
      className={`glass shimmer ${className}`}
      style={{ height, background: "var(--surface)" }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 3: Update existing empty-state callsites**

In `app/transactions/page.tsx`, replace the existing "No transactions yet" block with `<EmptyState icon={<Wallet size={24} />} title="No transactions yet" description="Tap + to add your first." />`. The action button is the existing FAB; or pass an `action` prop calling `setShowForm(true)`.

Same pattern for: Calendar (no events), Goals (no goals), Accounts (single starter), Notes (no notes).

- [ ] **Step 4: Commit**

```bash
git add components/Common/ app/
git commit -m "feat(polish): shared EmptyState + Skeleton components across pages"
```

---

## Task 5: Accessibility quick wins

**Files:**
- Modify: `app/layout.tsx` — add skip-to-main link
- Modify: `app/globals.css` — focus-visible styles, sr-only utility
- Modify: `components/Nav.tsx` — add `<nav aria-label="Primary">`

- [ ] **Step 1: Skip-to-main link**

At the top of `<body>` (or inside `<HouseholdProvider>` but before `<PinGate>`), add:

```tsx
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-lg"
  style={{ background: "var(--accent)", color: "var(--bg)" }}
>
  Skip to main content
</a>
```

Add `id="main"` to the existing `<main>` in layout.

- [ ] **Step 2: Focus ring globals**

Append to `app/globals.css`:

```css
/* Visible focus ring across all interactive elements */
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}
button:focus-visible,
a:focus-visible,
[role="button"]:focus-visible {
  outline-offset: 3px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
.focus\:not-sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  padding: revert;
  margin: revert;
  overflow: visible;
  clip: auto;
  white-space: normal;
}
```

- [ ] **Step 3: Nav aria**

Wrap the desktop side nav `<aside>` with `aria-label="Primary navigation"`. Same for the mobile `<nav>`. Add `aria-current="page"` to active links.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css components/Nav.tsx
git commit -m "feat(a11y): skip-to-main link, focus-visible rings, nav aria labels"
```

---

## Task 6: End-to-end smoke test

- [ ] **Step 1: Build + tests**

```bash
npm run build  # green
npm test       # 23/23
```

- [ ] **Step 2: Dev walk**

```bash
npm run dev -- -p 3001
```

In Chrome (which supports `beforeinstallprompt`):
- Visit `/` → after a few interactions, install prompt appears bottom-right
- Tab through the page → focus rings visible
- Visit `/share/home?value=84210&currency=USD&theme=architectural` → OG image returns
- Switch to Deep Space theme → reload `/share/home?...&theme=deep-space` → image renders with void bg + lavender accent
- Empty `/transactions` and `/goals` show EmptyState instead of blank

- [ ] **Step 3: Verify manifest**

DevTools → Application → Manifest → confirm theme-color matches current theme's bg.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "chore: Wave 6 polish + PWA verified end-to-end"
```

---

## Done

Wave 6 complete when all 6 tasks check out.

**Deferred forever (out of scope for a personal app):**
- Native Web Vitals dashboard
- iOS-specific install instructions (Add to Home Screen popup) — the spec doesn't ask for it
- Full WCAG 2.1 AA audit (we hit the high-leverage wins)

**The app is now feature-complete per the design spec.** Remaining work is:
- WebLLM in-browser LLM (deferred from Wave 4)
- Smart Folders (deferred from Wave 5)
- Receipt OCR / attachments
- Multi-step agent chaining
- Voice mode
- Embeddings-based semantic search

Each of those is its own focused wave.
