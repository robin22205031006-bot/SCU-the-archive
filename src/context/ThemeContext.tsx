import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type ReactNode,
} from "react";
import { useOptionalUiMode, type VisualUiMode } from "@/hooks/use-ui-mode";
import {
  readStoredGenreTheme,
  setGenreTheme,
  useStoredGenreTheme,
  type GenreThemeId,
} from "@/lib/genre-themes";

export type PrimarySystem = "classic" | "nexus" | "minimal" | "manga";

export type MangaSubTheme =
  | "fantasy"
  | "darkFantasy"
  | "anime"
  | "manhwa"
  | "isekai"
  | "ghibli"
  | "scifiAnime"
  | "shounen"
  | "manga-ink";

export type CoreMangaSubTheme = Exclude<MangaSubTheme, "manga-ink">;

export interface PrimarySystemMeta {
  id: PrimarySystem;
  label: string;
  tagline: string;
}

export interface MangaSubThemeMeta {
  id: CoreMangaSubTheme;
  genreThemeId: GenreThemeId;
  label: string;
  shortLabel: string;
  jpLabel: string;
  tagline: string;
  swatches: readonly [string, string, string, string];
}

export const PRIMARY_SYSTEMS: readonly PrimarySystemMeta[] = [
  {
    id: "classic",
    label: "Classic",
    tagline: "Foundational SCU archive dossier framework tuned by your active palette.",
  },
  {
    id: "nexus",
    label: "Nexus",
    tagline: "Tactical sci-fi HUD with holographic chrome and cel-outline option.",
  },
  {
    id: "minimal",
    label: "Minimal",
    tagline: "Streamlined whitespace editorial layout with zero motion or blur.",
  },
  {
    id: "manga",
    label: "Manga",
    tagline: "Multi-genre graphic novel & anime engine with stylized shaders.",
  },
] as const;

export const MANGA_SUBTHEMES: readonly MangaSubThemeMeta[] = [
  {
    id: "fantasy",
    genreThemeId: "fantasy",
    label: "Arcane Botanical Fantasy",
    shortLabel: "Fantasy",
    jpLabel: "秘境植物譚",
    tagline:
      "Deep forest-charcoal grimoire, aged cream parchment panels, antique brass filigree & luminous mint emeralds.",
    swatches: ["#15221B", "#F5EBE6", "#C5A869", "#5CE1B8"],
  },
  {
    id: "darkFantasy",
    genreThemeId: "dark-fantasy",
    label: "Dark Fantasy",
    shortLabel: "Dark Fantasy",
    jpLabel: "暗黒幻想",
    tagline: "Gothic stone tablets, cracked basalt borders, amethyst omens & rising embers.",
    swatches: ["#0D0914", "#8B5CF6", "#F43F5E", "#4C3B63"],
  },
  {
    id: "anime",
    genreThemeId: "xianxia",
    label: "Anime Key Visual",
    shortLabel: "Anime",
    jpLabel: "極彩画巻",
    tagline: "Vibrant cel key-visual color chemistry, expressive jade-gold framing & fluid motion.",
    swatches: ["#0C1815", "#D6B26A", "#34D399", "#B9382C"],
  },
  {
    id: "manhwa",
    genreThemeId: "cyber-anime",
    label: "Manhwa Webtoon",
    shortLabel: "Manhwa",
    jpLabel: "縦読画廊",
    tagline: "Vertical webtoon cadence, crisp full-color panels & infinite-scroll momentum.",
    swatches: ["#0F172A", "#6366F1", "#38BDF8", "#F8FAFC"],
  },
  {
    id: "isekai",
    genreThemeId: "isekai",
    label: "Isekai System HUD",
    shortLabel: "Isekai",
    jpLabel: "異世界冒険",
    tagline: "RPG guild status windows, orbital skill-tree rings & glowing brass bezels.",
    swatches: ["#161310", "#E09F3E", "#2DD4BF", "#F5EBE0"],
  },
  {
    id: "ghibli",
    genreThemeId: "ghibli",
    label: "Ghibli Pastoral",
    shortLabel: "Ghibli",
    jpLabel: "風の物語",
    tagline: "Painterly pastel sage tones, botanical brush borders & drifting meadow breeze.",
    swatches: ["#EFF4E7", "#2F7A4D", "#38BDF8", "#D97706"],
  },
  {
    id: "scifiAnime",
    genreThemeId: "cyber-anime",
    label: "Sci-Fi Anime / Mecha",
    shortLabel: "Sci-Fi Anime",
    jpLabel: "星月記録",
    tagline: "Mecha cockpit HUD lines, neon cyan/violet schematics & astral constellation grids.",
    swatches: ["#0C0F24", "#7DD3FC", "#A78BFA", "#E0E7FF"],
  },
  {
    id: "shounen",
    genreThemeId: "shonen",
    label: "Shounen Action",
    shortLabel: "Shounen",
    jpLabel: "少年熱血",
    tagline: "High-contrast action speed lines, angled impact cuts & chromatic sparks.",
    swatches: ["#0B1120", "#F97316", "#FACC15", "#38BDF8"],
  },
] as const;

export const PRIMARY_SYSTEM_STORAGE_KEY = "scu-primary-system";
export const MANGA_SUBTHEME_STORAGE_KEY = "scu-manga-subtheme";

export function genreThemeToMangaSubTheme(genre: GenreThemeId | "none" | null): MangaSubTheme {
  switch (genre) {
    case "fantasy":
      return "fantasy";
    case "dark-fantasy":
      return "darkFantasy";
    case "xianxia":
      return "anime";
    case "isekai":
      return "isekai";
    case "ghibli":
      return "ghibli";
    case "cyber-anime":
      return "scifiAnime";
    case "shonen":
      return "shounen";
    case "manga-ink":
    case "none":
    case null:
    default:
      return "manga-ink";
  }
}

export function mangaSubThemeToGenreTheme(sub: MangaSubTheme): GenreThemeId {
  switch (sub) {
    case "fantasy":
      return "fantasy";
    case "darkFantasy":
      return "dark-fantasy";
    case "anime":
      return "xianxia";
    case "manhwa":
    case "scifiAnime":
      return "cyber-anime";
    case "isekai":
      return "isekai";
    case "ghibli":
      return "ghibli";
    case "shounen":
      return "shonen";
    case "manga-ink":
    default:
      return "manga-ink";
  }
}

export function normalizeMangaSubTheme(raw: string | null | undefined): MangaSubTheme {
  switch (raw) {
    case "fantasy":
    case "darkFantasy":
    case "anime":
    case "manhwa":
    case "isekai":
    case "ghibli":
    case "scifiAnime":
    case "shounen":
    case "manga-ink":
      return raw;
    case "dark-fantasy":
      return "darkFantasy";
    case "cyber-anime":
      return "scifiAnime";
    case "xianxia":
      return "anime";
    case "shonen":
      return "shounen";
    default:
      return "fantasy";
  }
}

export function readStoredPrimarySystem(): PrimarySystem {
  try {
    const raw = localStorage.getItem(PRIMARY_SYSTEM_STORAGE_KEY);
    if (raw === "classic" || raw === "nexus" || raw === "minimal" || raw === "manga") {
      return raw;
    }
    const mode = localStorage.getItem("scu-ui-mode");
    if (mode === "classic" || mode === "nexus" || mode === "minimal" || mode === "manga") {
      return mode;
    }
  } catch {
    /* storage unavailable */
  }
  return "classic";
}

export function readStoredMangaSubTheme(): MangaSubTheme {
  try {
    const storedSub = localStorage.getItem(MANGA_SUBTHEME_STORAGE_KEY);
    if (storedSub) {
      return normalizeMangaSubTheme(storedSub);
    }
    const storedGenre = readStoredGenreTheme();
    if (storedGenre !== "none") {
      return genreThemeToMangaSubTheme(storedGenre);
    }
  } catch {
    /* storage unavailable */
  }
  return "manga-ink";
}

export interface ThemeContextValue {
  primarySystem: PrimarySystem;
  setPrimarySystem: (next: PrimarySystem) => void;
  mangaSubTheme: MangaSubTheme;
  activeMangaSubTheme: MangaSubTheme | null;
  setMangaSubTheme: (next: MangaSubTheme) => void;
  systems: readonly PrimarySystemMeta[];
  subThemes: readonly MangaSubThemeMeta[];
  isClassic: boolean;
  isNexus: boolean;
  isMinimal: boolean;
  isManga: boolean;
  isFantasy: boolean;
}

const THEME_CONTEXT_KEY = Symbol.for("scu.ThemeContext");
const g = globalThis as Record<symbol, unknown>;
const ThemeContext: Context<ThemeContextValue | null> =
  (g[THEME_CONTEXT_KEY] as Context<ThemeContextValue | null> | undefined) ??
  ((g[THEME_CONTEXT_KEY] = createContext<ThemeContextValue | null>(
    null,
  )) as Context<ThemeContextValue | null>);

export function applyPrimaryAndSubThemeAttributes(
  primary: PrimarySystem,
  subTheme: MangaSubTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.dataset["primarySystem"] = primary;
  if (primary === "manga") {
    root.dataset["mangaSubtheme"] = subTheme;
  } else {
    delete root.dataset["mangaSubtheme"];
  }
}

export function ThemeProvider({
  children,
  initialSystem,
  initialSubTheme,
}: {
  children: ReactNode;
  initialSystem?: PrimarySystem;
  initialSubTheme?: MangaSubTheme;
}) {
  const uiModeCtx = useOptionalUiMode();
  const storedGenre = useStoredGenreTheme();

  const [fallbackSystem, setFallbackSystem] = useState<PrimarySystem>(() => {
    if (initialSystem) return initialSystem;
    return readStoredPrimarySystem();
  });

  const [mangaSubThemeState, setMangaSubThemeState] = useState<MangaSubTheme>(() => {
    if (initialSubTheme) return initialSubTheme;
    return readStoredMangaSubTheme();
  });

  const primarySystem: PrimarySystem = initialSystem ?? uiModeCtx?.mode ?? fallbackSystem;

  // Keep sub-theme synced when external GenreTheme changes (e.g. quick ribbon / ThemeDrawer)
  useEffect(() => {
    if (storedGenre === "none") return;
    setMangaSubThemeState((prev) => {
      // Preserve explicit "manhwa" when its backing genre ("cyber-anime") is unchanged
      if (prev === "manhwa" && storedGenre === "cyber-anime") return prev;
      return genreThemeToMangaSubTheme(storedGenre);
    });
  }, [storedGenre]);

  useEffect(() => {
    const onSubEvent = (e: Event) => {
      const next = (e as CustomEvent<MangaSubTheme>).detail;
      if (next) setMangaSubThemeState(normalizeMangaSubTheme(next));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === MANGA_SUBTHEME_STORAGE_KEY && e.newValue) {
        setMangaSubThemeState(normalizeMangaSubTheme(e.newValue));
      }
    };
    window.addEventListener("scu:manga-subtheme-change", onSubEvent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("scu:manga-subtheme-change", onSubEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Synchronize HTML dataset attributes & localStorage whenever state updates
  useEffect(() => {
    if (typeof document !== "undefined") {
      applyPrimaryAndSubThemeAttributes(
        primarySystem,
        mangaSubThemeState,
        document.documentElement,
      );
    }
    try {
      localStorage.setItem(PRIMARY_SYSTEM_STORAGE_KEY, primarySystem);
    } catch {
      /* storage optional */
    }
  }, [primarySystem, mangaSubThemeState]);

  const setPrimarySystem = useCallback(
    (next: PrimarySystem) => {
      try {
        localStorage.setItem(PRIMARY_SYSTEM_STORAGE_KEY, next);
      } catch {
        /* storage optional */
      }
      if (uiModeCtx) {
        uiModeCtx.setMode(next as VisualUiMode);
      } else {
        setFallbackSystem(next);
        if (typeof document !== "undefined") {
          document.documentElement.dataset["uiMode"] = next;
          if (next === "classic") delete document.documentElement.dataset["ui"];
          else document.documentElement.dataset["ui"] = next;
          applyPrimaryAndSubThemeAttributes(next, mangaSubThemeState, document.documentElement);
        }
      }
    },
    [uiModeCtx, mangaSubThemeState],
  );

  const setMangaSubTheme = useCallback((next: MangaSubTheme) => {
    const normalized = normalizeMangaSubTheme(next);
    setMangaSubThemeState(normalized);
    try {
      localStorage.setItem(MANGA_SUBTHEME_STORAGE_KEY, normalized);
    } catch {
      /* storage optional */
    }
    const backingGenre = mangaSubThemeToGenreTheme(normalized);
    setGenreTheme(backingGenre);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (root.dataset["primarySystem"] === "manga" || root.dataset["uiMode"] === "manga") {
        root.dataset["mangaSubtheme"] = normalized;
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("scu:manga-subtheme-change", { detail: normalized }));
    }
  }, []);

  const activeMangaSubTheme: MangaSubTheme | null =
    primarySystem === "manga" ? mangaSubThemeState : null;

  const value = useMemo<ThemeContextValue>(
    () => ({
      primarySystem,
      setPrimarySystem,
      mangaSubTheme: mangaSubThemeState,
      activeMangaSubTheme,
      setMangaSubTheme,
      systems: PRIMARY_SYSTEMS,
      subThemes: MANGA_SUBTHEMES,
      isClassic: primarySystem === "classic",
      isNexus: primarySystem === "nexus",
      isMinimal: primarySystem === "minimal",
      isManga: primarySystem === "manga",
      isFantasy: primarySystem === "manga" && mangaSubThemeState === "fantasy",
    }),
    [primarySystem, setPrimarySystem, mangaSubThemeState, activeMangaSubTheme, setMangaSubTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return ctx;
}

export function useOptionalThemeContext(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
