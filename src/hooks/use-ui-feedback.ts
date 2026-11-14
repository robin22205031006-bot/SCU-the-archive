import { useCallback, useEffect, useMemo } from "react";
import { genreThemeToMangaSubTheme, useOptionalThemeContext } from "@/context/ThemeContext";
import { useOptionalUIState } from "@/context/UIStateContext";
import { useActiveGenre, useVisualMode } from "@/hooks/use-ui-mode";
import {
  isHapticsEnabled,
  resolveSensoryProfile,
  setHapticsEnabled,
  type SensoryProfileFamily,
} from "@/hooks/use-sensory-feedback";
import {
  getDecodedAudioBuffer,
  preloadAudioBuffers,
  resetAudioBufferCache,
  resumeAudioContext,
  sfx,
  type AudioPreloadResult,
} from "@/lib/scu-audio";

export type UIFeedbackEvent = "nav" | "navigation" | "click" | "snap" | "switch" | "cta";

export type UIFeedbackStyle = "parchment" | "sharp" | "ink" | "classic" | "minimal";

export interface UseUIFeedbackOptions {
  /** Override the active UI mode (e.g., "fantasy", "nexus", "manga", "classic", "minimal"). */
  mode?: string;
  /** Override the active Manga sub-theme (e.g., "fantasy", "scifiAnime", "shounen"). */
  subTheme?: string | null;
  /** Disable both Web Audio and device vibration feedback for this consumer. */
  enabled?: boolean;
}

export interface UIFeedbackVibrationSet {
  nav: number | number[] | null;
  click: number | number[] | null;
  switch: number | number[] | null;
  cta: number | number[] | null;
}

/**
 * Mode-calibrated Navigator.vibrate patterns:
 * - parchment (Fantasy/Isekai/Ghibli): softer, rhythmic multi-beat pulses
 * - sharp (Nexus/Sci-Fi Anime/Manhwa): crisp, ultra-short micro-bursts
 * - ink (Shounen/Dark Fantasy/Manga Ink): snappy comic panel pulses
 * - classic: subtle tactile clicks
 * - minimal: silent (null)
 */
export const UI_FEEDBACK_VIBRATION_PATTERNS: Record<UIFeedbackStyle, UIFeedbackVibrationSet> = {
  parchment: {
    nav: [12, 26, 10],
    click: [8, 18, 6],
    switch: [10, 22, 8],
    cta: [14, 24, 12, 20, 10],
  },
  sharp: {
    nav: [6, 8],
    click: 5,
    switch: 8,
    cta: [8, 10, 8],
  },
  ink: {
    nav: [10, 12],
    click: 8,
    switch: [10, 12],
    cta: 14,
  },
  classic: {
    nav: 8,
    click: 6,
    switch: 6,
    cta: 10,
  },
  minimal: {
    nav: null,
    click: null,
    switch: null,
    cta: null,
  },
};

function normalizeModeAndSubTheme(
  mode: string,
  subTheme?: string | null,
): { primary: string; sub: string | null } {
  const lower = mode.trim();
  if (lower === "fantasy" || lower === "isekai" || lower === "ghibli" || lower === "parchment") {
    return {
      primary: "manga",
      sub: lower === "parchment" ? "fantasy" : lower,
    };
  }
  if (lower === "sharp" || lower === "digital") {
    return { primary: "nexus", sub: null };
  }
  if (lower === "scifiAnime" || lower === "manhwa" || lower === "cyber-anime") {
    return { primary: "manga", sub: lower };
  }
  if (
    lower === "shounen" ||
    lower === "shonen" ||
    lower === "darkFantasy" ||
    lower === "dark-fantasy" ||
    lower === "anime"
  ) {
    return { primary: "manga", sub: lower };
  }
  return { primary: lower, sub: subTheme ?? null };
}

function familyToStyle(family: SensoryProfileFamily): UIFeedbackStyle {
  return family === "digital" ? "sharp" : family;
}

/**
 * Resolves the sensory feedback style ("parchment" for Fantasy/Isekai/Ghibli,
 * "sharp" for Nexus/Sci-Fi/Manhwa, "ink" for Manga/Shounen, "classic", or "minimal").
 */
export function resolveUIFeedbackStyle(mode: string, subTheme?: string | null): UIFeedbackStyle {
  const { primary, sub } = normalizeModeAndSubTheme(mode, subTheme);
  const profile = resolveSensoryProfile(primary, sub);
  return familyToStyle(profile.family);
}

export function getUIFeedbackVibrationPattern(
  mode: string,
  event: UIFeedbackEvent,
  subTheme?: string | null,
): number | number[] | null {
  const style = resolveUIFeedbackStyle(mode, subTheme);
  const set = UI_FEEDBACK_VIBRATION_PATTERNS[style];
  if (event === "nav" || event === "navigation" || event === "snap") return set.nav;
  if (event === "switch") return set.switch;
  if (event === "cta") return set.cta;
  return set.click;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function vibrateWithPattern(pattern: number | number[] | null): void {
  if (pattern === null || !isHapticsEnabled()) return;
  const navObj =
    typeof window !== "undefined"
      ? window.navigator
      : typeof navigator !== "undefined"
        ? navigator
        : undefined;
  if (!navObj || typeof navObj.vibrate !== "function") return;
  const resolved = prefersReducedMotion() && Array.isArray(pattern) ? (pattern[0] ?? 6) : pattern;
  try {
    navObj.vibrate(resolved);
  } catch {
    /* vibration blocked or unsupported */
  }
}

let unlockBound = false;

function bindFirstGestureAudioUnlock(): void {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const unlock = () => {
    resumeAudioContext();
    window.removeEventListener("pointerdown", unlock, true);
    window.removeEventListener("keydown", unlock, true);
    unlockBound = false;
  };
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true, once: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true, once: true });
}

/**
 * Preload utility executed on app initialization to pre-warm PCM noise buffers,
 * decode any custom/external audio clips via AudioContext.decodeAudioData, and
 * prepare AudioContext resumption so the first click has zero audio latency.
 */
export async function preloadUIFeedbackAudio(
  sources?: Record<string, string>,
): Promise<AudioPreloadResult> {
  bindFirstGestureAudioUnlock();
  return preloadAudioBuffers(sources);
}

/**
 * Convenience hook that runs `preloadUIFeedbackAudio` once on app initialization.
 */
export function usePreloadUIFeedback(sources?: Record<string, string>): void {
  useEffect(() => {
    void preloadUIFeedbackAudio(sources);
  }, [sources]);
}

/**
 * Imperatively plays Web Audio API SFX and triggers window.navigator.vibrate feedback
 * calibrated for the given UI mode and interaction type.
 */
export function triggerUIFeedback(
  event: UIFeedbackEvent,
  mode: string,
  subTheme?: string | null,
): void {
  const style = resolveUIFeedbackStyle(mode, subTheme);
  if (style === "minimal") return;

  const isNav = event === "nav" || event === "navigation" || event === "snap";
  const pattern = getUIFeedbackVibrationPattern(mode, event, subTheme);

  switch (style) {
    case "parchment": {
      if (event === "cta") {
        sfx.parchmentSnap();
        sfx.angel();
      } else if (isNav || event === "switch") {
        sfx.parchmentSnap();
      } else {
        sfx.parchmentClick();
      }
      vibrateWithPattern(pattern);
      return;
    }

    case "sharp": {
      if (event === "cta") {
        sfx.terminalClick();
        sfx.hud();
      } else if (isNav) {
        sfx.terminalSnap();
      } else {
        sfx.terminalClick();
      }
      vibrateWithPattern(pattern);
      return;
    }

    case "ink": {
      if (event === "cta") {
        sfx.pop();
      } else if (isNav) {
        sfx.inkSnap();
      } else if (event === "switch") {
        sfx.comic();
      } else {
        sfx.inkClick();
      }
      vibrateWithPattern(pattern);
      return;
    }

    case "classic":
    default: {
      if (event === "cta") {
        sfx.add();
      } else if (isNav) {
        sfx.whoosh();
      } else {
        sfx.click();
      }
      vibrateWithPattern(pattern);
    }
  }
}

export { getDecodedAudioBuffer, isHapticsEnabled, resetAudioBufferCache, setHapticsEnabled };

/**
 * React hook for mode-aware Web Audio API sounds and window.navigator.vibrate haptic feedback
 * across navigation transitions and UI interaction clicks.
 *
 * - Fantasy / Isekai / Ghibli ('parchment'): crisp parchment rustle & softer rhythmic pulses
 * - Nexus / Sci-Fi Anime / Manhwa ('sharp'): high-pitched digital clicks & short sharp vibration bursts
 * - Shounen / Dark Fantasy / Manga Ink ('ink'): dry ink nib clicks & brush snaps
 * - Classic: archive clicks & soft transition sweeps
 * - Minimal: completely silent (zero audio & zero vibration)
 */
export function useUIFeedback(options?: UseUIFeedbackOptions) {
  const themeCtx = useOptionalThemeContext();
  const uiStateCtx = useOptionalUIState();
  const modeFallback = useVisualMode();
  const activeGenre = useActiveGenre();

  const enabled = options?.enabled ?? true;
  const rawMode = options?.mode ?? themeCtx?.primarySystem ?? uiStateCtx?.mode ?? modeFallback;
  const rawSubTheme =
    options?.subTheme !== undefined
      ? options.subTheme
      : (themeCtx?.mangaSubTheme ?? (activeGenre ? genreThemeToMangaSubTheme(activeGenre) : null));

  const style = useMemo(
    () => (enabled ? resolveUIFeedbackStyle(rawMode, rawSubTheme) : "minimal"),
    [enabled, rawMode, rawSubTheme],
  );

  const triggerFeedback = useCallback(
    (event: UIFeedbackEvent, modeOverride?: string, subThemeOverride?: string | null) => {
      if (!enabled) return;
      const effectiveMode = modeOverride ?? rawMode;
      const effectiveSub =
        subThemeOverride !== undefined
          ? subThemeOverride
          : modeOverride && modeOverride !== rawMode
            ? null
            : rawSubTheme;
      triggerUIFeedback(event, effectiveMode, effectiveSub);
    },
    [enabled, rawMode, rawSubTheme],
  );

  const triggerNavigation = useCallback(
    (modeOverride?: string) => {
      triggerFeedback("nav", modeOverride);
    },
    [triggerFeedback],
  );

  const triggerClick = useCallback(
    (modeOverride?: string) => {
      triggerFeedback("click", modeOverride);
    },
    [triggerFeedback],
  );

  const triggerAction = useCallback(
    (modeOverride?: string) => {
      triggerFeedback("cta", modeOverride);
    },
    [triggerFeedback],
  );

  return {
    mode: rawMode,
    subTheme: rawSubTheme,
    style,
    triggerFeedback,
    triggerNavigation,
    triggerClick,
    triggerAction,
  };
}
