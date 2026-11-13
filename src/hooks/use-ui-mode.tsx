import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppearance } from "@/hooks/use-appearance";
import { useTypography } from "@/hooks/use-typography";
import { DEFAULT_THEME, THEMES, themeVars } from "@/lib/themes";
import { setUiStyle, useUiStyle, type UiStyle } from "@/lib/ui-style";

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
    desc: "High-contrast ink borders, halftone panels, and comic action typography.",
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
            "--ui-transition": "220ms cubic-bezier(0.22, 1, 0.36, 1)",
            "--ui-card-border-width": "2px",
            "--ui-card-shadow": "4px 4px 0 rgba(0, 0, 0, 0.85)",
            "--ui-heading-tracking": "0.02em",
            "--ui-heading-shadow": "2px 2px 0 rgba(0, 0, 0, 0.72)",
            "--background": "oklch(0.13 0.006 260)",
            "--foreground": "oklch(0.96 0.005 85)",
            "--card": "oklch(0.17 0.008 260)",
            "--card-foreground": "oklch(0.96 0.005 85)",
            "--popover": "oklch(0.17 0.008 260)",
            "--popover-foreground": "oklch(0.96 0.005 85)",
            "--primary": "oklch(0.65 0.23 25)",
            "--primary-foreground": "oklch(0.98 0 0)",
            "--secondary": "oklch(0.22 0.008 260)",
            "--secondary-foreground": "oklch(0.96 0.005 85)",
            "--muted": "oklch(0.22 0.008 260)",
            "--muted-foreground": "oklch(0.74 0.01 80)",
            "--accent": "oklch(0.65 0.23 25)",
            "--accent-foreground": "oklch(0.98 0 0)",
            "--border": "oklch(0.92 0.005 85 / 0.28)",
            "--input": "oklch(0.92 0.005 85 / 0.32)",
            "--ring": "oklch(0.65 0.23 25)",
            "--glow": "oklch(0.65 0.23 25)",
            "--glow-strength": "0",
            "--glass-blur": "0px",
            "--radius": "0.25rem",
            "--font-display": '"Chakra Petch", "Space Grotesk", system-ui, sans-serif',
            "--font-sans": '"Space Grotesk", system-ui, sans-serif',
          }
        : {
            "--ui-mode": "manga",
            "--ui-transition": "220ms cubic-bezier(0.22, 1, 0.36, 1)",
            "--ui-card-border-width": "2px",
            "--ui-card-shadow": "4px 4px 0 rgba(15, 15, 15, 0.85)",
            "--ui-heading-tracking": "0.02em",
            "--ui-heading-shadow": "2px 2px 0 rgba(15, 15, 15, 0.22)",
            "--background": "oklch(0.97 0.006 85)",
            "--foreground": "oklch(0.14 0.01 260)",
            "--card": "oklch(0.99 0.004 85)",
            "--card-foreground": "oklch(0.14 0.01 260)",
            "--popover": "oklch(0.99 0.004 85)",
            "--popover-foreground": "oklch(0.14 0.01 260)",
            "--primary": "oklch(0.55 0.23 25)",
            "--primary-foreground": "oklch(0.98 0 0)",
            "--secondary": "oklch(0.92 0.008 85)",
            "--secondary-foreground": "oklch(0.14 0.01 260)",
            "--muted": "oklch(0.92 0.008 85)",
            "--muted-foreground": "oklch(0.42 0.01 260)",
            "--accent": "oklch(0.55 0.23 25)",
            "--accent-foreground": "oklch(0.98 0 0)",
            "--border": "oklch(0.15 0.01 260 / 0.85)",
            "--input": "oklch(0.15 0.01 260 / 0.45)",
            "--ring": "oklch(0.55 0.23 25)",
            "--glow": "oklch(0.55 0.23 25)",
            "--glow-strength": "0",
            "--glass-blur": "0px",
            "--radius": "0.25rem",
            "--font-display": '"Chakra Petch", "Space Grotesk", system-ui, sans-serif',
            "--font-sans": '"Space Grotesk", system-ui, sans-serif',
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
  const vars = uiModeCssVars(mode, dark);
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }

  // 4. Sync root data attributes used by CSS selectors across the app.
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
  const { theme, dark } = useAppearance();
  const { settings } = useTypography();
  const externalStyle = useUiStyle();
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

  // Re-apply CSS custom properties on <html> whenever mode, active palette, dark mode, or typography changes.
  useEffect(() => {
    const preset = THEMES.find((t) => t.id === theme) ?? THEMES.find((t) => t.id === DEFAULT_THEME);
    const baseThemeVars = preset ? themeVars(preset, dark) : {};
    const bodyFont = settings.bodyFont || "Manrope";
    const displayFont = settings.displayFont || "Cormorant Garamond";
    const baseVars: Record<string, string> = {
      ...baseThemeVars,
      "--font-sans": `"${bodyFont}", system-ui, -apple-system, "Segoe UI", sans-serif`,
      "--font-display": `"${displayFont}", Georgia, "Times New Roman", serif`,
    };
    applyUiModeCss(mode, dark, document.documentElement, baseVars);
  }, [mode, theme, dark, settings.bodyFont, settings.displayFont]);

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
