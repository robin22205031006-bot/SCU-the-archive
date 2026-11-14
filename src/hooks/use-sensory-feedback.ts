import { useCallback, useMemo } from "react";
import {
  genreThemeToMangaSubTheme,
  normalizeMangaSubTheme,
  useOptionalThemeContext,
} from "@/context/ThemeContext";
import { useOptionalUIState } from "@/context/UIStateContext";
import { useActiveGenre, useVisualMode } from "@/hooks/use-ui-mode";
import { sfx } from "@/lib/scu-audio";

export type SensoryFeedbackKind = "snap" | "click" | "switch" | "tap" | "cta" | "combat";

export type SensoryProfileFamily = "parchment" | "digital" | "ink" | "classic" | "minimal";

export interface SensoryProfile {
  family: SensoryProfileFamily;
  label: string;
  snapHaptic: number | number[] | null;
  clickHaptic: number | number[] | null;
  switchHaptic: number | number[] | null;
  ctaHaptic: number | number[] | null;
}

const HAPTICS_KEY = "scu-haptics";

export function isHapticsEnabled(): boolean {
  try {
    return localStorage.getItem(HAPTICS_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_KEY, enabled ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function safeVibrate(pattern: number | number[] | null): void {
  if (pattern === null || !isHapticsEnabled()) return;
  const navObj =
    typeof window !== "undefined"
      ? window.navigator
      : typeof navigator !== "undefined"
        ? navigator
        : undefined;
  if (!navObj || typeof navObj.vibrate !== "function") return;
  const resolved = prefersReducedMotion() && Array.isArray(pattern) ? (pattern[0] ?? 8) : pattern;
  try {
    navObj.vibrate(resolved);
  } catch {
    /* vibration blocked or unsupported */
  }
}

const PARCHMENT_SUBTHEMES = new Set(["fantasy", "isekai", "ghibli"]);
const DIGITAL_SUBTHEMES = new Set(["scifiAnime", "manhwa", "cyber-anime"]);

const PROFILES: Record<SensoryProfileFamily, SensoryProfile> = {
  minimal: {
    family: "minimal",
    label: "Silent",
    snapHaptic: null,
    clickHaptic: null,
    switchHaptic: null,
    ctaHaptic: null,
  },
  parchment: {
    family: "parchment",
    label: "Parchment & Brass",
    snapHaptic: [10, 14],
    clickHaptic: 10,
    switchHaptic: 12,
    ctaHaptic: [14, 18, 12],
  },
  digital: {
    family: "digital",
    label: "Digital Telemetry",
    snapHaptic: [7, 10],
    clickHaptic: 6,
    switchHaptic: 8,
    ctaHaptic: [10, 14, 10],
  },
  ink: {
    family: "ink",
    label: "Ink & Brush",
    snapHaptic: [10, 12],
    clickHaptic: 8,
    switchHaptic: [10, 12],
    ctaHaptic: 14,
  },
  classic: {
    family: "classic",
    label: "Archive Tactile",
    snapHaptic: 8,
    clickHaptic: 6,
    switchHaptic: 6,
    ctaHaptic: 10,
  },
};

export function resolveSensoryProfile(
  primarySystem: string,
  mangaSubTheme?: string | null,
): SensoryProfile {
  if (primarySystem === "minimal") return PROFILES.minimal;

  const normalizedSub = mangaSubTheme ? normalizeMangaSubTheme(mangaSubTheme) : null;

  if (primarySystem === "manga" && normalizedSub && PARCHMENT_SUBTHEMES.has(normalizedSub)) {
    return PROFILES.parchment;
  }

  if (
    primarySystem === "nexus" ||
    (primarySystem === "manga" && normalizedSub && DIGITAL_SUBTHEMES.has(normalizedSub))
  ) {
    return PROFILES.digital;
  }

  if (primarySystem === "manga") {
    return PROFILES.ink;
  }

  return PROFILES.classic;
}

export function triggerThemeSensoryFeedback(
  kind: SensoryFeedbackKind,
  primarySystem: string,
  mangaSubTheme?: string | null,
): void {
  const profile = resolveSensoryProfile(primarySystem, mangaSubTheme);

  if (kind === "combat") {
    if (profile.family === "minimal") return;
    sfx.comic();
    safeVibrate([16, 24, 28]);
    return;
  }

  switch (profile.family) {
    case "minimal":
      return;

    case "parchment": {
      if (kind === "cta") {
        sfx.parchmentSnap();
        sfx.angel();
        safeVibrate(profile.ctaHaptic);
      } else if (kind === "click") {
        sfx.parchmentClick();
        safeVibrate(profile.clickHaptic);
      } else if (kind === "snap") {
        sfx.parchmentSnap();
        safeVibrate(profile.snapHaptic);
      } else {
        sfx.parchmentSnap();
        safeVibrate(profile.switchHaptic);
      }
      return;
    }

    case "digital": {
      if (kind === "cta") {
        sfx.terminalClick();
        sfx.hud();
        safeVibrate(profile.ctaHaptic);
      } else if (kind === "snap") {
        sfx.terminalSnap();
        safeVibrate(profile.snapHaptic);
      } else if (kind === "click") {
        sfx.terminalClick();
        safeVibrate(profile.clickHaptic);
      } else {
        sfx.terminalClick();
        safeVibrate(profile.switchHaptic);
      }
      return;
    }

    case "ink": {
      if (kind === "cta") {
        sfx.pop();
        safeVibrate(profile.ctaHaptic);
      } else if (kind === "snap") {
        sfx.inkSnap();
        safeVibrate(profile.snapHaptic);
      } else if (kind === "switch") {
        sfx.comic();
        safeVibrate(profile.switchHaptic);
      } else if (kind === "click") {
        sfx.inkClick();
        safeVibrate(profile.clickHaptic);
      } else {
        sfx.click();
        safeVibrate(profile.clickHaptic);
      }
      return;
    }

    case "classic":
    default: {
      if (kind === "cta") {
        sfx.add();
        safeVibrate(profile.ctaHaptic);
      } else if (kind === "snap") {
        sfx.whoosh();
        safeVibrate(profile.snapHaptic);
      } else {
        sfx.click();
        safeVibrate(profile.clickHaptic);
      }
    }
  }
}

export interface SensoryFeedbackOverride {
  primarySystem?: string;
  mangaSubTheme?: string | null;
}

export function useSensoryFeedback(override?: SensoryFeedbackOverride) {
  const themeCtx = useOptionalThemeContext();
  const uiStateCtx = useOptionalUIState();
  const modeFallback = useVisualMode();
  const activeGenre = useActiveGenre();

  const primary =
    override?.primarySystem ?? themeCtx?.primarySystem ?? uiStateCtx?.mode ?? modeFallback;
  const sub =
    override?.mangaSubTheme !== undefined
      ? override.mangaSubTheme
      : (themeCtx?.mangaSubTheme ?? (activeGenre ? genreThemeToMangaSubTheme(activeGenre) : null));

  const profile = useMemo(() => resolveSensoryProfile(primary, sub), [primary, sub]);

  const playSnap = useCallback(() => {
    triggerThemeSensoryFeedback("snap", primary, sub);
  }, [primary, sub]);

  const playClick = useCallback(() => {
    triggerThemeSensoryFeedback("click", primary, sub);
  }, [primary, sub]);

  const playSwitch = useCallback(() => {
    triggerThemeSensoryFeedback("switch", primary, sub);
  }, [primary, sub]);

  const playTap = useCallback(() => {
    triggerThemeSensoryFeedback("tap", primary, sub);
  }, [primary, sub]);

  const playCta = useCallback(() => {
    triggerThemeSensoryFeedback("cta", primary, sub);
  }, [primary, sub]);

  const playCombat = useCallback(() => {
    triggerThemeSensoryFeedback("combat", primary, sub);
  }, [primary, sub]);

  return {
    profile,
    playSnap,
    playClick,
    playSwitch,
    playTap,
    playCta,
    playCombat,
  };
}
