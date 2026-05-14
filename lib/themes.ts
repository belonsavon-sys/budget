export type ThemeId =
  | "architectural"
  | "newsroom"
  | "ledger"
  | "terminal"
  | "deep-space";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  tagline: string;
  mode: "light" | "dark";
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

export const ALL_THEME_IDS: ThemeId[] = THEMES.map((t) => t.id);

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === "string" && (ALL_THEME_IDS as string[]).includes(v);
}
