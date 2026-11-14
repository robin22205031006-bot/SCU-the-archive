import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { useTypography } from "@/hooks/use-typography";
import { DEFAULT_THEME, THEMES, themeVars } from "@/lib/themes";
import { setUiStyle, useUiStyle, type UiStyle } from "@/lib/ui-style";
import {
  readStoredGenreTheme,
  resolveActiveGenreTheme,
  useStoredGenreTheme,
  type ClassicGenreSelection,
  type GenreThemeId,
} from "@/lib/genre-themes";

export type VisualUiMode = "classic" | "nexus" | "minimal" | "manga";

export interface VisualUiModeInfo {
  id: VisualUiMode;
  label: string;
  desc: string;
}

export const VISUAL_UI_MODES: readonly VisualUiModeInfo[] = [
  {
    id: "classic",
    label: "Classic",
    desc: "Original SCU cards tuned by your active color palette.",
  },
  {
    id: "nexus",
    label: "Nexus",
    desc: "Constellation holographic shell with neon telemetry and 3D ambient backdrop.",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Calm, zero-clutter editorial archive without blur, glow, or motion.",
  },
  {
    id: "manga",
    label: "Manga",
    desc: "Serialized ink-washed spreads, halftone comic panels, and hanko stamps.",
  },
] as const;

export const UI_MODE_STORAGE_KEY = "scu-ui-mode";

const MANAGED_MODE_CSS_PROPS = [
  "--ui-mode",
  "--ui-transition",
  "--ui-card-border-width",
  "--ui-card-shadow",
  "--ui-heading-tracking",
  "--ui-heading-shadow",
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--glow",
  "--glow-strength",
  "--glass-blur",
  "--radius",
  "--font-display",
  "--font-sans",
  "--genre-gold",
  "--genre-accent-2",
] as const;

export function resolveVisualUiMode(value: string | null | undefined): VisualUiMode {
  if (value === "nexus" || value === "minimal" || value === "manga" || value === "classic") {
    return value;
  }
  if (value === "gaming") return "classic";
  return "classic";
}

function readStoredMode(): VisualUiMode | null {
  try {
    const raw = localStorage.getItem(UI_MODE_STORAGE_KEY);
    if (raw === "classic" || raw === "nexus" || raw === "minimal" || raw === "manga") {
      return raw;
    }
    const legacy = localStorage.getItem("scu-ui-style");
    if (legacy === "nexus" || legacy === "minimal" || legacy === "classic") {
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

function readLiveVisualMode(): VisualUiMode {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.dataset["uiMode"];
    if (attr === "classic" || attr === "nexus" || attr === "minimal" || attr === "manga") {
      return attr;
    }
  }
  return readStoredMode() ?? "classic";
}

function subscribeVisualMode(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("scu:ui-mode-change", handler);
  window.addEventListener("scu:ui-style-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("scu:ui-mode-change", handler);
    window.removeEventListener("scu:ui-style-change", handler);
    window.removeEventListener("storage", handler);
  };
}

export function uiModeCssVars(mode: VisualUiMode, dark: boolean): Record<string, string> {
  switch (mode) {
    case "nexus":
      return {
        "--ui-mode": "nexus",
        "--ui-transition": "280ms cubic-bezier(0.22, 1, 0.36, 1)",
        "--ui-card-border-width": "1px",
        "--ui-card-shadow": "var(--nexus-shadow)",
        "--ui-heading-tracking": "0em",
        "--ui-heading-shadow": "0 0 18px color-mix(in oklab, var(--nexus-glow) 45%, transparent)",
        "--background": "var(--nexus-bg)",
        "--foreground": "var(--nexus-fg)",
        "--card": "var(--nexus-surface)",
        "--card-foreground": "var(--nexus-fg)",
        "--popover": "var(--nexus-surface)",
        "--popover-foreground": "var(--nexus-fg)",
        "--primary": "var(--nexus-glow)",
        "--primary-foreground": "var(--nexus-bg)",
        "--secondary": "var(--nexus-surface)",
        "--secondary-foreground": "var(--nexus-fg)",
        "--muted": "var(--nexus-surface)",
        "--muted-foreground": "var(--nexus-muted)",
        "--accent": "var(--nexus-glow)",
        "--accent-foreground": "var(--nexus-bg)",
        "--border": "var(--nexus-border)",
        "--input": "var(--nexus-border)",
        "--ring": "var(--nexus-glow)",
        "--glow": "var(--nexus-glow)",
        "--glow-strength": "1",
        "--glass-blur": "18px",
        "--radius": "0.75rem",
        "--font-display": '"Rajdhani", system-ui, sans-serif',
        "--font-sans": '"Space Grotesk", system-ui, sans-serif',
      };
    case "minimal":
      return {
        "--ui-mode": "minimal",
        "--ui-transition": "0ms",
        "--ui-card-border-width": "1px",
        "--ui-card-shadow": "none",
        "--ui-heading-tracking": "-0.015em",
        "--ui-heading-shadow": "none",
        "--glow-strength": "0",
        "--glass-blur": "0px",
        "--radius": "0.375rem",
      };
    case "manga":
      return dark
        ? {
            "--ui-mode": "manga",
            "--ui-transition": "180ms cubic-bezier(0.22, 1, 0.36, 1)",
            "--ui-card-border-width": "2px",
            "--ui-card-shadow": "5px 5px 0 #000000",
            "--ui-heading-tracking": "0.04em",
            "--ui-heading-shadow": "3px 3px 0 #000000",
            "--background": "#121110",
            "--foreground": "#f4efe4",
            "--card": "#1b1917",
            "--card-foreground": "#f4efe4",
            "--popover": "#1b1917",
            "--popover-foreground": "#f4efe4",
            "--primary": "#dc2626",
            "--primary-foreground": "#fffdf8",
            "--secondary": "#262320",
            "--secondary-foreground": "#f4efe4",
            "--muted": "#262320",
            "--muted-foreground": "#b8b0a2",
            "--accent": "#dc2626",
            "--accent-foreground": "#fffdf8",
            "--border": "#f4efe4",
            "--input": "#57524a",
            "--ring": "#dc2626",
            "--glow": "#dc2626",
            "--glow-strength": "0",
            "--glass-blur": "0px",
            "--radius": "0px",
            "--font-display": '"Bangers", "Oswald", "Shippori Mincho", serif',
            "--font-sans": '"Comic Neue", "Space Grotesk", system-ui, sans-serif',
          }
        : {
            "--ui-mode": "manga",
            "--ui-transition": "180ms cubic-bezier(0.22, 1, 0.36, 1)",
            "--ui-card-border-width": "2px",
            "--ui-card-shadow": "5px 5px 0 #111111",
            "--ui-heading-tracking": "0.04em",
            "--ui-heading-shadow": "2px 2px 0 rgba(17, 17, 17, 0.25)",
            "--background": "#f4efe4",
            "--foreground": "#111111",
            "--card": "#fffdf8",
            "--card-foreground": "#111111",
            "--popover": "#fffdf8",
            "--popover-foreground": "#111111",
            "--primary": "#b91c1c",
            "--primary-foreground": "#fffdf8",
            "--secondary": "#ebe3d2",
            "--secondary-foreground": "#111111",
            "--muted": "#ebe3d2",
            "--muted-foreground": "#524c42",
            "--accent": "#b91c1c",
            "--accent-foreground": "#fffdf8",
            "--border": "#111111",
            "--input": "#111111",
            "--ring": "#b91c1c",
            "--glow": "#b91c1c",
            "--glow-strength": "0",
            "--glass-blur": "0px",
            "--radius": "0px",
            "--font-display": '"Bangers", "Oswald", "Shippori Mincho", serif',
            "--font-sans": '"Comic Neue", "Space Grotesk", system-ui, sans-serif',
          };
    case "classic":
    default:
      return {
        "--ui-mode": "classic",
        "--ui-transition": "280ms cubic-bezier(0.22, 1, 0.36, 1)",
        "--ui-card-border-width": "1px",
        "--ui-card-shadow": "0 10px 30px -12px rgba(0, 0, 0, 0.35)",
        "--ui-heading-tracking": "-0.01em",
        "--ui-heading-shadow": "none",
        "--radius": "0.75rem",
      };
  }
}

export function applyUiModeCss(
  mode: VisualUiMode,
  dark: boolean,
  root: HTMLElement = document.documentElement,
  baseVars?: Record<string, string>,
  storedGenre?: ClassicGenreSelection,
): void {
  // 1. Clear all mode-managed properties first so switching back from nexus/manga leaves zero residue.
  for (const prop of MANAGED_MODE_CSS_PROPS) {
    root.style.removeProperty(prop);
  }

  // 2. Restore active base theme & typography variables if provided.
  if (baseVars) {
    for (const [k, v] of Object.entries(baseVars)) {
      root.style.setProperty(k, v);
    }
  }

  // 3. Apply the active mode's CSS custom properties onto <html>.
  const activeGenre = resolveActiveGenreTheme(mode, storedGenre ?? readStoredGenreTheme());
  const vars = uiModeCssVars(mode, dark);
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }

  // 4. For Manga non-ink genre themes, clear manga-ink inline palette/font/border/radius overrides
  //    so the CSS-based [data-genre-theme="..."] selectors in src/styles.css control colors, patterns & borders.
  if (activeGenre) {
    root.dataset["genreTheme"] = activeGenre;
    if (activeGenre !== "manga-ink") {
      for (const prop of MANAGED_MODE_CSS_PROPS) {
        if (prop === "--ui-mode" || prop === "--ui-transition") continue;
        root.style.removeProperty(prop);
      }
    }
  } else {
    delete root.dataset["genreTheme"];
  }

  // 5. Sync root data attributes used by CSS selectors across the app.
  root.dataset["uiMode"] = mode;
  if (mode === "classic") {
    delete root.dataset["ui"];
  } else {
    root.dataset["ui"] = mode;
  }
}

interface UiModeContextValue {
  mode: VisualUiMode;
  setMode: (next: VisualUiMode) => void;
  cycleMode: () => void;
  modes: readonly VisualUiModeInfo[];
}

const UiModeContext = createContext<UiModeContextValue | null>(null);

export function UiModeProvider({
  children,
  initialMode,
}: {
  children: ReactNode;
  initialMode?: VisualUiMode;
}) {
  const { theme, dark, loaded: appearanceLoaded } = useAppearance();
  const { settings } = useTypography();
  const externalStyle = useUiStyle();
  const storedGenre = useStoredGenreTheme();
  const transitionTimerRef = useRef<number | null>(null);

  const [mode, setModeState] = useState<VisualUiMode>(() => {
    if (initialMode) return initialMode;
    return readStoredMode() ?? "classic";
  });

  // Adopt admin default uiMode only when the user has not explicitly picked a mode yet.
  useEffect(() => {
    if (initialMode) return;
    if (readStoredMode() === null && settings.uiMode) {
      const mapped = resolveVisualUiMode(settings.uiMode);
      setModeState((prev) => (prev === mapped ? prev : mapped));
    }
  }, [initialMode, settings.uiMode]);

  // Stay in lockstep if legacy callers invoke setUiStyle(...) or UIStateProvider updates mode.
  useEffect(() => {
    const onModeChange = (e: Event) => {
      const next = (e as CustomEvent<VisualUiMode>).detail;
      if (!next) return;
      const resolved = resolveVisualUiMode(next);
      setModeState((prev) => (prev === resolved ? prev : resolved));
    };
    const onLegacyStyle = (e: Event) => {
      const next = (e as CustomEvent<UiStyle>).detail;
      if (!next) return;
      setModeState((prev) => {
        if (next === "classic" && prev === "manga") return prev;
        const resolved = resolveVisualUiMode(next);
        try {
          localStorage.setItem(UI_MODE_STORAGE_KEY, resolved);
        } catch {
          /* storage optional */
        }
        return resolved;
      });
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === UI_MODE_STORAGE_KEY) {
        setModeState(resolveVisualUiMode(e.newValue));
      } else if (e.key === "scu-ui-style" && e.newValue) {
        setModeState((prev) =>
          e.newValue === "classic" && prev === "manga" ? prev : resolveVisualUiMode(e.newValue),
        );
      }
    };
    window.addEventListener("scu:ui-mode-change", onModeChange);
    window.addEventListener("scu:ui-style-change", onLegacyStyle);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("scu:ui-mode-change", onModeChange);
      window.removeEventListener("scu:ui-style-change", onLegacyStyle);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Also sync when externalStyle changes via useUiStyle() (e.g., cross-tab sync).
  useEffect(() => {
    setModeState((prev) => {
      if (externalStyle === "classic" && (prev === "manga" || prev === "classic")) return prev;
      return resolveVisualUiMode(externalStyle);
    });
  }, [externalStyle]);

  const setMode = useCallback((next: VisualUiMode) => {
    const resolved = resolveVisualUiMode(next);

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (resolved !== "minimal" && !reducedMotion) {
        root.dataset["uiSwitching"] = "true";
        if (transitionTimerRef.current !== null) {
          window.clearTimeout(transitionTimerRef.current);
        }
        transitionTimerRef.current = window.setTimeout(() => {
          delete document.documentElement.dataset["uiSwitching"];
          transitionTimerRef.current = null;
        }, 320);
      } else {
        delete root.dataset["uiSwitching"];
      }
    }

    try {
      localStorage.setItem(UI_MODE_STORAGE_KEY, resolved);
    } catch {
      /* storage optional */
    }

    // Keep legacy ui-style store synchronized: nexus -> nexus, minimal -> minimal, classic/manga -> classic
    const legacyTarget: UiStyle =
      resolved === "nexus" || resolved === "minimal" ? resolved : "classic";
    setUiStyle(legacyTarget);
    setModeState(resolved);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("scu:ui-mode-change", { detail: resolved }));
    }
  }, []);

  const cycleMode = useCallback(() => {
    const order = VISUAL_UI_MODES.map((m) => m.id);
    const idx = order.indexOf(mode);
    const next = order[(idx + 1) % order.length] ?? "classic";
    setMode(next);
  }, [mode, setMode]);

  // Re-apply CSS custom properties on <html> whenever mode, active palette, genre theme, dark mode, or typography changes.
  const applyCurrentMode = useCallback(() => {
    const preset = THEMES.find((t) => t.id === theme) ?? THEMES.find((t) => t.id === DEFAULT_THEME);
    const baseThemeVars = preset ? themeVars(preset, dark) : {};
    const bodyFont = settings.bodyFont || "Manrope";
    const displayFont = settings.displayFont || "Cormorant Garamond";
    const baseVars: Record<string, string> = {
      ...baseThemeVars,
      "--font-sans": `"${bodyFont}", system-ui, -apple-system, "Segoe UI", sans-serif`,
      "--font-display": `"${displayFont}", Georgia, "Times New Roman", serif`,
    };
    applyUiModeCss(mode, dark, document.documentElement, baseVars, storedGenre);
  }, [mode, theme, dark, settings.bodyFont, settings.displayFont, storedGenre]);

  useEffect(() => {
    applyCurrentMode();
    window.addEventListener("scu:theme-applied", applyCurrentMode);
    window.addEventListener("scu:genre-theme-change", applyCurrentMode);
    return () => {
      window.removeEventListener("scu:theme-applied", applyCurrentMode);
      window.removeEventListener("scu:genre-theme-change", applyCurrentMode);
    };
  }, [applyCurrentMode, appearanceLoaded]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const value = useMemo<UiModeContextValue>(
    () => ({
      mode,
      setMode,
      cycleMode,
      modes: VISUAL_UI_MODES,
    }),
    [mode, setMode, cycleMode],
  );

  return <UiModeContext.Provider value={value}>{children}</UiModeContext.Provider>;
}

export function useUiMode(): UiModeContextValue {
  const ctx = useContext(UiModeContext);
  if (!ctx) {
    throw new Error("useUiMode must be used within a UiModeProvider");
  }
  return ctx;
}

export function useOptionalUiMode(): UiModeContextValue | null {
  return useContext(UiModeContext);
}

/** Works anywhere in the tree (including inside routes or standalone components). */
export function useVisualMode(): VisualUiMode {
  const ctx = useOptionalUiMode();
  const external = useSyncExternalStore<VisualUiMode>(
    subscribeVisualMode,
    readLiveVisualMode,
    () => "classic",
  );
  return ctx ? ctx.mode : external;
}

export function useIsManga(): boolean {
  return useVisualMode() === "manga";
}

export function useActiveGenre(): GenreThemeId | null {
  const mode = useVisualMode();
  const stored = useStoredGenreTheme();
  return resolveActiveGenreTheme(mode, stored);
}
