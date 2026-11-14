import { useSyncExternalStore } from "react";
import type { VisualUiMode } from "@/hooks/use-ui-mode";

export type GenreThemeId =
  | "manga-ink"
  | "shonen"
  | "fantasy"
  | "isekai"
  | "dark-fantasy"
  | "ghibli"
  | "xianxia"
  | "cyber-anime";

export type ClassicGenreSelection = GenreThemeId | "none";

export type PortraitShape =
  | "ink-plate"
  | "slash-cut"
  | "diamond-bezel"
  | "mana-orbit"
  | "occult-ring"
  | "botanical-oval"
  | "quatrefoil-sun"
  | "lunar-circle";

export type DossierArrangement =
  | "comic-spread"
  | "shonen-clash"
  | "astrolabe-royal"
  | "isekai-status"
  | "occult-omen"
  | "ghibli-journal"
  | "xianxia-plaque"
  | "lunar-dossier";

export interface GenreThemeMeta {
  id: GenreThemeId;
  label: string;
  shortLabel: string;
  jpLabel: string;
  tagline: string;
  portraitShape: PortraitShape;
  arrangement: DossierArrangement;
  /** Preview gradient/swatch hexes [surface, primary, gold/secondary, accent2] */
  swatches: readonly [string, string, string, string];
  lightVars: Record<string, string>;
  darkVars: Record<string, string>;
}

export const GENRE_THEMES: readonly GenreThemeMeta[] = [
  {
    id: "manga-ink",
    label: "Manga Ink · Washi & Sumi",
    shortLabel: "Manga Ink",
    jpLabel: "週刊墨絵",
    tagline: "Tankobon halftone ink plates, crisp rules & crimson hanko stamps.",
    portraitShape: "ink-plate",
    arrangement: "comic-spread",
    swatches: ["#f4efe4", "#111111", "#b91c1c", "#d6cfc0"],
    lightVars: {
      "--background": "#f4efe4",
      "--foreground": "#111111",
      "--card": "#fffdf8",
      "--primary": "#b91c1c",
      "--accent": "#b91c1c",
      "--border": "#111111",
      "--genre-gold": "#b91c1c",
      "--genre-accent-2": "#111111",
      "--font-display": '"Bangers", "Oswald", "Shippori Mincho", serif',
      "--font-sans": '"Comic Neue", "Space Grotesk", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#121110",
      "--foreground": "#f4efe4",
      "--card": "#1b1917",
      "--primary": "#dc2626",
      "--accent": "#dc2626",
      "--border": "#f4efe4",
      "--genre-gold": "#dc2626",
      "--genre-accent-2": "#f4efe4",
      "--font-display": '"Bangers", "Oswald", "Shippori Mincho", serif',
      "--font-sans": '"Comic Neue", "Space Grotesk", system-ui, sans-serif',
    },
  },
  {
    id: "shonen",
    label: "Shonen · Kinetic Impact",
    shortLabel: "Shonen",
    jpLabel: "少年熱血",
    tagline: "Diagonal speedlines, blazing amber-crimson gauges, cobalt accents & SFX.",
    portraitShape: "slash-cut",
    arrangement: "shonen-clash",
    swatches: ["#0f172a", "#f97316", "#eab308", "#38bdf8"],
    lightVars: {
      "--background": "#f8fafc",
      "--foreground": "#0f172a",
      "--card": "#ffffff",
      "--primary": "#ea580c",
      "--accent": "#0284c7",
      "--border": "#0f172a",
      "--genre-gold": "#eab308",
      "--genre-accent-2": "#0284c7",
      "--font-display": '"Oswald", "Bangers", system-ui, sans-serif',
      "--font-sans": '"Space Grotesk", "Manrope", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#0b1120",
      "--foreground": "#f8fafc",
      "--card": "#131c31",
      "--primary": "#f97316",
      "--accent": "#38bdf8",
      "--border": "#f97316",
      "--genre-gold": "#facc15",
      "--genre-accent-2": "#38bdf8",
      "--font-display": '"Oswald", "Bangers", system-ui, sans-serif',
      "--font-sans": '"Space Grotesk", "Manrope", system-ui, sans-serif',
    },
  },
  {
    id: "fantasy",
    label: "Fantasy · Parchment & Gold",
    shortLabel: "Fantasy",
    jpLabel: "王道幻想",
    tagline: "Warm parchment textures, double-hairline gold borders & diamond portrait bezels.",
    portraitShape: "diamond-bezel",
    arrangement: "astrolabe-royal",
    swatches: ["#f5ecd8", "#b8860b", "#1d4ed8", "#3b2a14"],
    lightVars: {
      "--background": "#f4ead2",
      "--foreground": "#2c2112",
      "--card": "#fbf5e6",
      "--primary": "#b45309",
      "--accent": "#1d4ed8",
      "--border": "#b8860b",
      "--genre-gold": "#c6922c",
      "--genre-accent-2": "#1d4ed8",
      "--font-display": '"Cinzel", "Cormorant Garamond", serif',
      "--font-sans": '"Manrope", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#14100b",
      "--foreground": "#f5ebd4",
      "--card": "#1d1710",
      "--primary": "#d4af37",
      "--accent": "#60a5fa",
      "--border": "#c59b38",
      "--genre-gold": "#d4af37",
      "--genre-accent-2": "#60a5fa",
      "--font-display": '"Cinzel", "Cormorant Garamond", serif',
      "--font-sans": '"Manrope", system-ui, sans-serif',
    },
  },
  {
    id: "isekai",
    label: "Isekai · Guild Status Window",
    shortLabel: "Isekai",
    jpLabel: "異世界冒険",
    tagline: "Adventurer cartography grid, orbital mana halos, brass rivets & RPG status frames.",
    portraitShape: "mana-orbit",
    arrangement: "isekai-status",
    swatches: ["#161310", "#e09f3e", "#2dd4bf", "#f5ebe0"],
    lightVars: {
      "--background": "#f5efe3",
      "--foreground": "#2b2118",
      "--card": "#fdfaf3",
      "--primary": "#c26d1f",
      "--accent": "#0d9488",
      "--border": "#9a7444",
      "--genre-gold": "#c26d1f",
      "--genre-accent-2": "#0d9488",
      "--font-display": '"Cinzel", "Oswald", serif',
      "--font-sans": '"Space Grotesk", "Manrope", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#161310",
      "--foreground": "#f3eadb",
      "--card": "#201b16",
      "--primary": "#e09f3e",
      "--accent": "#2dd4bf",
      "--border": "#b58547",
      "--genre-gold": "#e09f3e",
      "--genre-accent-2": "#2dd4bf",
      "--font-display": '"Cinzel", "Oswald", serif',
      "--font-sans": '"Space Grotesk", "Manrope", system-ui, sans-serif',
    },
  },
  {
    id: "dark-fantasy",
    label: "Dark Fantasy · Cracked Stone & Amethyst",
    shortLabel: "Dark Fantasy",
    jpLabel: "暗黒幻想",
    tagline: "Deep abyssal purples, cracked basalt stone patterns & thorny occult sigil bezels.",
    portraitShape: "occult-ring",
    arrangement: "occult-omen",
    swatches: ["#0d0914", "#8b5cf6", "#4c3b63", "#f43f5e"],
    lightVars: {
      "--background": "#ebe4f3",
      "--foreground": "#1e162b",
      "--card": "#f4effa",
      "--primary": "#6d28d9",
      "--accent": "#be123c",
      "--border": "#5b4578",
      "--genre-gold": "#be123c",
      "--genre-accent-2": "#6d28d9",
      "--font-display": '"Cinzel", "Shippori Mincho", serif',
      "--font-sans": '"Manrope", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#0d0914",
      "--foreground": "#ebe4f5",
      "--card": "#161022",
      "--primary": "#a855f7",
      "--accent": "#f43f5e",
      "--border": "#6d4c9c",
      "--genre-gold": "#f43f5e",
      "--genre-accent-2": "#a855f7",
      "--font-display": '"Cinzel", "Shippori Mincho", serif',
      "--font-sans": '"Manrope", system-ui, sans-serif',
    },
  },
  {
    id: "ghibli",
    label: "Ghibli · Watercolor Pastoral",
    shortLabel: "Ghibli",
    jpLabel: "風の物語",
    tagline: "Soft sage watercolor washes, botanical vine corners & drifting meadow light.",
    portraitShape: "botanical-oval",
    arrangement: "ghibli-journal",
    swatches: ["#eff4e7", "#2f7a4d", "#38bdf8", "#d97706"],
    lightVars: {
      "--background": "#eff4e7",
      "--foreground": "#253328",
      "--card": "#fbfdf7",
      "--primary": "#2f7a4d",
      "--accent": "#0284c7",
      "--border": "#88a883",
      "--genre-gold": "#d97706",
      "--genre-accent-2": "#0284c7",
      "--font-display": '"Cormorant Garamond", "Shippori Mincho", serif',
      "--font-sans": '"Nunito", "Manrope", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#101b16",
      "--foreground": "#e8f0e4",
      "--card": "#17261f",
      "--primary": "#52b788",
      "--accent": "#7dd3fc",
      "--border": "#4e7a61",
      "--genre-gold": "#fbbf24",
      "--genre-accent-2": "#7dd3fc",
      "--font-display": '"Cormorant Garamond", "Shippori Mincho", serif',
      "--font-sans": '"Nunito", "Manrope", system-ui, sans-serif',
    },
  },
  {
    id: "xianxia",
    label: "Xianxia · Jade Cloud Scroll",
    shortLabel: "Xianxia",
    jpLabel: "仙侠玉簡",
    tagline: "Celadon jade & brushed gold cloud-scroll frames, quatrefoil bezels & 2x2 plaques.",
    portraitShape: "quatrefoil-sun",
    arrangement: "xianxia-plaque",
    swatches: ["#0c1815", "#d6b26a", "#34d399", "#c24136"],
    lightVars: {
      "--background": "#f4efe2",
      "--foreground": "#192d27",
      "--card": "#fcf9f0",
      "--primary": "#1c7c64",
      "--accent": "#b9382c",
      "--border": "#b59656",
      "--genre-gold": "#b59656",
      "--genre-accent-2": "#b9382c",
      "--font-display": '"Shippori Mincho", "Cormorant Garamond", serif',
      "--font-sans": '"Manrope", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#0c1815",
      "--foreground": "#efe9d8",
      "--card": "#13241f",
      "--primary": "#d6b26a",
      "--accent": "#34d399",
      "--border": "#a88b50",
      "--genre-gold": "#d6b26a",
      "--genre-accent-2": "#34d399",
      "--font-display": '"Shippori Mincho", "Cormorant Garamond", serif',
      "--font-sans": '"Manrope", system-ui, sans-serif',
    },
  },
  {
    id: "cyber-anime",
    label: "Cyber Anime · Astral Lunar",
    shortLabel: "Cyber Anime",
    jpLabel: "星月記録",
    tagline: "Isometric astral grid, crescent moon dividers & stacked ice-cyan dossier pills.",
    portraitShape: "lunar-circle",
    arrangement: "lunar-dossier",
    swatches: ["#0c0f24", "#7dd3fc", "#a78bfa", "#e0e7ff"],
    lightVars: {
      "--background": "#eef2fb",
      "--foreground": "#1e2246",
      "--card": "#f8faff",
      "--primary": "#4f46e5",
      "--accent": "#0284c7",
      "--border": "#6366f1",
      "--genre-gold": "#7c3aed",
      "--genre-accent-2": "#0284c7",
      "--font-display": '"Rajdhani", "Space Grotesk", sans-serif',
      "--font-sans": '"Space Grotesk", "Manrope", system-ui, sans-serif',
    },
    darkVars: {
      "--background": "#0c0f24",
      "--foreground": "#e8edff",
      "--card": "#141936",
      "--primary": "#7dd3fc",
      "--accent": "#a78bfa",
      "--border": "#6366f1",
      "--genre-gold": "#c4b5fd",
      "--genre-accent-2": "#7dd3fc",
      "--font-display": '"Rajdhani", "Space Grotesk", sans-serif',
      "--font-sans": '"Space Grotesk", "Manrope", system-ui, sans-serif',
    },
  },
] as const;

export const GENRE_THEME_STORAGE_KEY = "scu-genre-theme";

const VALID_IDS = new Set<string>(GENRE_THEMES.map((g) => g.id));

export function normalizeGenreThemeId(v: string | null | undefined): GenreThemeId | null {
  if (v === "high-fantasy") return "fantasy";
  if (typeof v === "string" && VALID_IDS.has(v)) return v as GenreThemeId;
  return null;
}

export function isGenreThemeId(v: string | null | undefined): v is GenreThemeId {
  return normalizeGenreThemeId(v) !== null;
}

export function getGenreThemeMeta(id: GenreThemeId | string): GenreThemeMeta {
  const normalized = normalizeGenreThemeId(id) ?? "manga-ink";
  return GENRE_THEMES.find((g) => g.id === normalized) ?? GENRE_THEMES[0]!;
}

export function readStoredGenreTheme(): ClassicGenreSelection {
  try {
    const raw = localStorage.getItem(GENRE_THEME_STORAGE_KEY);
    if (raw === "none") return "none";
    const normalized = normalizeGenreThemeId(raw);
    if (normalized) return normalized;
  } catch {
    /* storage unavailable */
  }
  return "none";
}

/**
 * Genre themes ONLY apply inside Manga UI mode so Classic, Nexus, and Minimal
 * UIs stay strictly in their original appearance.
 */
export function resolveActiveGenreTheme(
  mode: VisualUiMode,
  stored: ClassicGenreSelection = readStoredGenreTheme(),
): GenreThemeId | null {
  if (mode === "manga") {
    return stored === "none" ? "manga-ink" : (normalizeGenreThemeId(stored) ?? "manga-ink");
  }
  return null;
}

let genreSwitchTimer: number | null = null;

export function setGenreTheme(next: ClassicGenreSelection | "high-fantasy"): void {
  const normalized: ClassicGenreSelection =
    next === "none" ? "none" : (normalizeGenreThemeId(next) ?? "manga-ink");
  try {
    localStorage.setItem(GENRE_THEME_STORAGE_KEY, normalized);
  } catch {
    /* storage optional */
  }
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const isMangaMode = root.dataset["ui"] === "manga" || root.dataset["uiMode"] === "manga";
    if (isMangaMode) {
      const resolved = normalized === "none" ? "manga-ink" : normalized;
      const changed = root.dataset["genreTheme"] !== resolved;
      root.dataset["genreTheme"] = resolved;

      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const motionOff = root.dataset["motion"] === "off";
      if (changed && !reducedMotion && !motionOff && typeof window !== "undefined") {
        root.dataset["genreSwitching"] = "true";
        if (genreSwitchTimer !== null) {
          window.clearTimeout(genreSwitchTimer);
        }
        genreSwitchTimer = window.setTimeout(() => {
          delete document.documentElement.dataset["genreSwitching"];
          genreSwitchTimer = null;
        }, 460);
      }
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scu:genre-theme-change", { detail: normalized }));
  }
}

function subscribeGenreTheme(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("scu:genre-theme-change", handler);
  window.addEventListener("scu:ui-mode-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("scu:genre-theme-change", handler);
    window.removeEventListener("scu:ui-mode-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export function useStoredGenreTheme(): ClassicGenreSelection {
  return useSyncExternalStore<ClassicGenreSelection>(
    subscribeGenreTheme,
    readStoredGenreTheme,
    () => "none",
  );
}

export function useActiveGenreTheme(mode: VisualUiMode): GenreThemeId | null {
  const stored = useStoredGenreTheme();
  return resolveActiveGenreTheme(mode, stored);
}

export function genreThemeCssVars(id: GenreThemeId, dark: boolean): Record<string, string> {
  const meta = getGenreThemeMeta(id);
  return dark ? meta.darkVars : meta.lightVars;
}
