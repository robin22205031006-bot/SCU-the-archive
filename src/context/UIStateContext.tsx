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
import { setNavMode, useNavMode, type NavMode } from "@/lib/nav-mode";
import { setUiStyle, type UiStyle } from "@/lib/ui-style";
import { useOptionalUiMode } from "@/hooks/use-ui-mode";

export type UIMode = "nexus" | "minimal" | "manga" | "classic";

export interface UIModeOption {
  id: Exclude<UIMode, "classic">;
  label: string;
  desc: string;
}

export const UI_MODE_OPTIONS: readonly UIModeOption[] = [
  {
    id: "nexus",
    label: "Nexus",
    desc: "Constellation holographic theme with cyan glow and HUD arcs.",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Calm, crisp editorial UI without blur, shadows, or heavy motion.",
  },
  {
    id: "manga",
    label: "Manga",
    desc: "Ink-hatch comic panels, halftone dot backdrop, and crisp offset shadows.",
  },
] as const;

export type HapticIntensity = "low" | "medium" | "high";

export interface HapticIntensityOption {
  id: HapticIntensity;
  label: string;
  scale: number;
}

export const HAPTIC_INTENSITY_OPTIONS: readonly HapticIntensityOption[] = [
  { id: "low", label: "Low", scale: 0.5 },
  { id: "medium", label: "Medium", scale: 1 },
  { id: "high", label: "High", scale: 1.5 },
] as const;

export const UI_STATE_STORAGE_KEY = "scu-ui-mode";
export const HAPTIC_INTENSITY_STORAGE_KEY = "scu-haptic-intensity";

export function resolveHapticIntensity(value: string | null | undefined): HapticIntensity {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return "medium";
}

export function resolveUIMode(value: string | null | undefined): UIMode {
  if (value === "nexus" || value === "minimal" || value === "manga" || value === "classic") {
    return value;
  }
  if (value === "gaming") return "classic";
  return "nexus";
}

export function applyHtmlUIStateAttributes(
  mode: UIMode,
  root: HTMLElement = document.documentElement,
): void {
  root.setAttribute("data-ui-mode", mode);
  if (mode === "classic") {
    root.removeAttribute("data-ui");
  } else {
    root.setAttribute("data-ui", mode);
  }
}

export interface UIStateContextValue {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  cycleMode: () => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  toggleNav: () => void;
  activeNav: string;
  setActiveNav: (path: string) => void;
  navMode: NavMode;
  setNavMode: (next: NavMode) => void;
  hapticIntensity: HapticIntensity;
  setHapticIntensity: (intensity: HapticIntensity) => void;
  isNexus: boolean;
  isMinimal: boolean;
  isManga: boolean;
  modes: readonly UIModeOption[];
}

const UI_STATE_CONTEXT_KEY = Symbol.for("scu.UIStateContext");
const g = globalThis as Record<symbol, unknown>;
export const UIStateContext: Context<UIStateContextValue | null> =
  (g[UI_STATE_CONTEXT_KEY] as Context<UIStateContextValue | null> | undefined) ??
  ((g[UI_STATE_CONTEXT_KEY] = createContext<UIStateContextValue | null>(
    null,
  )) as Context<UIStateContextValue | null>);

function readInitialUIMode(initialMode?: UIMode, parentMode?: UIMode): UIMode {
  if (initialMode) return resolveUIMode(initialMode);
  if (parentMode) return resolveUIMode(parentMode);
  try {
    const saved = localStorage.getItem(UI_STATE_STORAGE_KEY);
    if (saved) return resolveUIMode(saved);
    const legacy = localStorage.getItem("scu-ui-style");
    if (legacy === "nexus" || legacy === "minimal" || legacy === "classic") return legacy;
  } catch {
    /* storage optional */
  }
  return "nexus";
}

function readInitialHapticIntensity(initialHapticIntensity?: HapticIntensity): HapticIntensity {
  if (initialHapticIntensity) return resolveHapticIntensity(initialHapticIntensity);
  try {
    const saved = localStorage.getItem(HAPTIC_INTENSITY_STORAGE_KEY);
    if (saved) return resolveHapticIntensity(saved);
  } catch {
    /* storage optional */
  }
  return "medium";
}

export function UIStateProvider({
  children,
  initialMode,
  initialHapticIntensity,
  initialNav = "/",
  applyAttributesToHtml = true,
}: {
  children: ReactNode;
  initialMode?: UIMode;
  initialHapticIntensity?: HapticIntensity;
  initialNav?: string;
  applyAttributesToHtml?: boolean;
}) {
  const parentUiMode = useOptionalUiMode();
  const hasParentUiMode = Boolean(parentUiMode);
  const parentSetMode = parentUiMode?.setMode;
  const [localMode, setLocalModeState] = useState<UIMode>(() =>
    readInitialUIMode(initialMode, parentUiMode?.mode),
  );
  const mode = parentUiMode ? parentUiMode.mode : localMode;
  const [hapticIntensity, setHapticIntensityState] = useState<HapticIntensity>(() =>
    readInitialHapticIntensity(initialHapticIntensity),
  );
  const [navOpen, setNavOpenState] = useState(false);
  const [activeNav, setActiveNavState] = useState(initialNav);
  const currentNavMode = useNavMode();

  const setNavOpen = useCallback((open: boolean) => {
    setNavOpenState((prev) => (prev === open ? prev : open));
  }, []);

  const setActiveNav = useCallback((path: string) => {
    setActiveNavState((prev) => (prev === path ? prev : path));
  }, []);

  const setHapticIntensity = useCallback((next: HapticIntensity) => {
    const resolved = resolveHapticIntensity(next);
    setHapticIntensityState((prev) => (prev === resolved ? prev : resolved));
    try {
      localStorage.setItem(HAPTIC_INTENSITY_STORAGE_KEY, resolved);
    } catch {
      /* storage optional */
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("scu:haptic-intensity-change", { detail: resolved }));
    }
  }, []);

  const setMode = useCallback(
    (next: UIMode) => {
      const resolved = resolveUIMode(next);
      if (parentSetMode) {
        parentSetMode(resolved);
        return;
      }
      setLocalModeState((prev) => (prev === resolved ? prev : resolved));

      try {
        localStorage.setItem(UI_STATE_STORAGE_KEY, resolved);
      } catch {
        /* storage optional */
      }

      const legacyTarget: UiStyle =
        resolved === "nexus" || resolved === "minimal" ? resolved : "classic";
      setUiStyle(legacyTarget);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("scu:ui-mode-change", { detail: resolved }));
      }
    },
    [parentSetMode],
  );

  const cycleMode = useCallback(() => {
    const order: UIMode[] = ["nexus", "minimal", "manga"];
    const idx = order.indexOf(mode);
    const next = order[(idx + 1) % order.length] ?? "nexus";
    setMode(next);
  }, [mode, setMode]);

  const toggleNav = useCallback(() => {
    setNavOpenState((prev) => !prev);
  }, []);

  // Sync haptic intensity across tabs / custom events
  useEffect(() => {
    const onHapticEvent = (e: Event) => {
      const next = (e as CustomEvent<HapticIntensity>).detail;
      if (next) {
        const resolved = resolveHapticIntensity(next);
        setHapticIntensityState((prev) => (prev === resolved ? prev : resolved));
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === HAPTIC_INTENSITY_STORAGE_KEY && e.newValue) {
        const resolved = resolveHapticIntensity(e.newValue);
        setHapticIntensityState((prev) => (prev === resolved ? prev : resolved));
      }
    };
    window.addEventListener("scu:haptic-intensity-change", onHapticEvent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("scu:haptic-intensity-change", onHapticEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Sync standalone provider with external setUiStyle / mode events / cross-tab storage changes
  useEffect(() => {
    if (hasParentUiMode) return;
    const onModeEvent = (e: Event) => {
      const next = (e as CustomEvent<UIMode>).detail;
      if (next) {
        const resolved = resolveUIMode(next);
        setLocalModeState((prev) => (prev === resolved ? prev : resolved));
      }
    };
    const onStyleEvent = (e: Event) => {
      const next = (e as CustomEvent<UiStyle>).detail;
      if (!next) return;
      setLocalModeState((prev) => {
        if (next === "classic" && (prev === "manga" || prev === "classic")) return prev;
        const resolved = resolveUIMode(next);
        return prev === resolved ? prev : resolved;
      });
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === UI_STATE_STORAGE_KEY && e.newValue) {
        const resolved = resolveUIMode(e.newValue);
        setLocalModeState((prev) => (prev === resolved ? prev : resolved));
      } else if (e.key === "scu-ui-style" && e.newValue) {
        setLocalModeState((prev) => {
          if (e.newValue === "classic" && (prev === "manga" || prev === "classic")) return prev;
          const resolved = resolveUIMode(e.newValue);
          return prev === resolved ? prev : resolved;
        });
      }
    };
    window.addEventListener("scu:ui-mode-change", onModeEvent);
    window.addEventListener("scu:ui-style-change", onStyleEvent);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("scu:ui-mode-change", onModeEvent);
      window.removeEventListener("scu:ui-style-change", onStyleEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, [hasParentUiMode]);

  useEffect(() => {
    if (!applyAttributesToHtml || typeof document === "undefined") return;
    applyHtmlUIStateAttributes(mode, document.documentElement);
  }, [mode, applyAttributesToHtml]);

  const value = useMemo<UIStateContextValue>(
    () => ({
      mode,
      setMode,
      cycleMode,
      navOpen,
      setNavOpen,
      toggleNav,
      activeNav,
      setActiveNav,
      navMode: currentNavMode,
      setNavMode,
      hapticIntensity,
      setHapticIntensity,
      isNexus: mode === "nexus",
      isMinimal: mode === "minimal",
      isManga: mode === "manga",
      modes: UI_MODE_OPTIONS,
    }),
    [
      mode,
      setMode,
      cycleMode,
      navOpen,
      setNavOpen,
      toggleNav,
      activeNav,
      setActiveNav,
      currentNavMode,
      hapticIntensity,
      setHapticIntensity,
    ],
  );

  return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
}

export function useUIState(): UIStateContextValue {
  const ctx = useContext(UIStateContext);
  if (!ctx) {
    throw new Error("useUIState must be used within a UIStateProvider");
  }
  return ctx;
}

export function useOptionalUIState(): UIStateContextValue | null {
  return useContext(UIStateContext);
}
