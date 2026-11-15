import { useCallback, useEffect, useMemo, useState } from "react";
import { genreThemeToMangaSubTheme, useOptionalThemeContext } from "@/context/ThemeContext";
import {
  HAPTIC_INTENSITY_OPTIONS,
  HAPTIC_INTENSITY_STORAGE_KEY,
  resolveHapticIntensity,
  useOptionalUIState,
  type HapticIntensity,
} from "@/context/UIStateContext";
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
  withAudioPan,
  type AudioPreloadResult,
  type AudioSpatialPan,
} from "@/lib/scu-audio";

export type UIFeedbackEvent = "nav" | "navigation" | "click" | "snap" | "switch" | "cta";

export type UIFeedbackStyle = "parchment" | "sharp" | "ink" | "classic" | "minimal";

export interface UIFeedbackRectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface UIFeedbackEventLike {
  currentTarget?: EventTarget | null;
  target?: EventTarget | null;
  clientX?: number;
  clientY?: number;
}

export interface UIFeedbackPointLike {
  x: number;
  y: number;
}

export type UIFeedbackTarget =
  Element | UIFeedbackEventLike | UIFeedbackRectLike | UIFeedbackPointLike | null | undefined;

export interface SpatialAudioPosition extends AudioSpatialPan {
  pan: number;
  x: number;
  y: number;
  distanceFromCenter: number;
}

export interface TriggerUIFeedbackOptions {
  subTheme?: string | null;
  target?: UIFeedbackTarget;
  pan?: number;
  positionalAudio?: boolean;
  hapticIntensity?: HapticIntensity;
}

export interface UseUIFeedbackOptions {
  /** Override the active UI mode (e.g., "fantasy", "nexus", "manga", "classic", "minimal"). */
  mode?: string;
  /** Override the active Manga sub-theme (e.g., "fantasy", "scifiAnime", "shounen"). */
  subTheme?: string | null;
  /** Disable both Web Audio and device vibration feedback for this consumer. */
  enabled?: boolean;
  /** Default UI element / event / rect / coordinate source for positional audio panning. */
  target?: UIFeedbackTarget | (() => UIFeedbackTarget);
  /** Enable or disable screen-center positional audio panning (defaults to true). */
  positionalAudio?: boolean;
  /** Override user haptic intensity preference from UIStateContext ("low" | "medium" | "high"). */
  hapticIntensity?: HapticIntensity;
}

export interface UIFeedbackVibrationSet {
  nav: number | number[] | null;
  click: number | number[] | null;
  switch: number | number[] | null;
  cta: number | number[] | null;
}

export const HAPTIC_INTENSITY_SCALES: Record<HapticIntensity, number> = {
  low: 0.5,
  medium: 1,
  high: 1.5,
};

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

function readStoredHapticIntensity(): HapticIntensity {
  if (typeof window === "undefined") return "medium";
  try {
    return resolveHapticIntensity(window.localStorage.getItem(HAPTIC_INTENSITY_STORAGE_KEY));
  } catch {
    return "medium";
  }
}

export function scaleVibrationPattern(
  pattern: number | number[] | null,
  intensity: HapticIntensity = "medium",
): number | number[] | null {
  if (pattern === null) return null;
  const scale = HAPTIC_INTENSITY_SCALES[intensity] ?? 1;
  if (scale === 1) return pattern;
  if (typeof pattern === "number") {
    return Math.max(1, Math.round(pattern * scale));
  }
  return pattern.map((ms) => Math.max(1, Math.round(ms * scale)));
}

function clampSigned(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function isRectLike(value: unknown): value is UIFeedbackRectLike {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["left"] === "number" &&
    typeof v["top"] === "number" &&
    typeof v["width"] === "number" &&
    typeof v["height"] === "number"
  );
}

function isPointLike(value: unknown): value is UIFeedbackPointLike {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v["x"] === "number" && typeof v["y"] === "number";
}

function isElementLike(value: unknown): value is Element {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { getBoundingClientRect?: unknown }).getBoundingClientRect === "function";
}

function isEventLike(value: unknown): value is UIFeedbackEventLike {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if ("subTheme" in v || "pan" in v || "positionalAudio" in v || "hapticIntensity" in v) {
    return false;
  }
  return (
    typeof v["preventDefault"] === "function" ||
    "nativeEvent" in v ||
    "currentTarget" in v ||
    (typeof v["type"] === "string" && "target" in v) ||
    (typeof v["clientX"] === "number" && typeof v["clientY"] === "number")
  );
}

function isFeedbackTargetLike(value: unknown): value is UIFeedbackTarget {
  if (value === null || value === undefined) return false;
  return isElementLike(value) || isEventLike(value) || isRectLike(value) || isPointLike(value);
}

function isTriggerOptionsObject(value: unknown): value is TriggerUIFeedbackOptions {
  if (!value || typeof value !== "object") return false;
  if (isElementLike(value) || isEventLike(value) || isRectLike(value) || isPointLike(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    "subTheme" in v ||
    "target" in v ||
    "pan" in v ||
    "positionalAudio" in v ||
    "hapticIntensity" in v
  );
}

/**
 * Calculates stereo panning (`pan` in [-1, 1]) and normalized screen-center distance
 * (`distanceFromCenter` in [0, 1]) from a UI element, event, DOMRect, or point.
 */
export function calculateElementAudioPan(
  target?: UIFeedbackTarget,
  viewport?: { width?: number; height?: number },
): SpatialAudioPosition | null {
  if (!target) return null;

  const vwRaw =
    viewport?.width ?? (typeof window !== "undefined" ? window.innerWidth : undefined) ?? 1280;
  const vhRaw =
    viewport?.height ?? (typeof window !== "undefined" ? window.innerHeight : undefined) ?? 720;
  const vw = vwRaw > 0 ? vwRaw : 1280;
  const vh = vhRaw > 0 ? vhRaw : 720;

  let cx: number | null = null;
  let cy: number | null = null;

  if (isEventLike(target)) {
    const el = isElementLike(target.currentTarget)
      ? target.currentTarget
      : isElementLike(target.target)
        ? target.target
        : null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const hasLayout = rect.width !== 0 || rect.height !== 0 || rect.left !== 0 || rect.top !== 0;
      if (hasLayout) {
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
      }
    }
    if (
      cx === null &&
      typeof target.clientX === "number" &&
      typeof target.clientY === "number" &&
      (target.clientX !== 0 || target.clientY !== 0)
    ) {
      cx = target.clientX;
      cy = target.clientY;
    }
    if (cx === null && el) {
      return { pan: 0, x: 0, y: 0, distanceFromCenter: 0 };
    }
  } else if (isElementLike(target)) {
    const rect = target.getBoundingClientRect();
    const hasLayout = rect.width !== 0 || rect.height !== 0 || rect.left !== 0 || rect.top !== 0;
    if (!hasLayout) {
      return { pan: 0, x: 0, y: 0, distanceFromCenter: 0 };
    }
    cx = rect.left + rect.width / 2;
    cy = rect.top + rect.height / 2;
  } else if (isRectLike(target)) {
    cx = target.left + target.width / 2;
    cy = target.top + target.height / 2;
  } else if (isPointLike(target)) {
    cx = target.x;
    cy = target.y;
  }

  if (cx === null || cy === null || !Number.isFinite(cx) || !Number.isFinite(cy)) {
    return null;
  }

  const x = clampSigned((cx - vw / 2) / (vw / 2));
  const y = clampSigned((cy - vh / 2) / (vh / 2));
  const distanceFromCenter = clampUnit(Math.hypot(x, y) / Math.SQRT2);

  return {
    pan: x,
    x,
    y,
    distanceFromCenter,
  };
}

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
  hapticIntensity: HapticIntensity = "medium",
): number | number[] | null {
  const style = resolveUIFeedbackStyle(mode, subTheme);
  const set = UI_FEEDBACK_VIBRATION_PATTERNS[style];
  const raw =
    event === "nav" || event === "navigation" || event === "snap"
      ? set.nav
      : event === "switch"
        ? set.switch
        : event === "cta"
          ? set.cta
          : set.click;
  return scaleVibrationPattern(raw, hapticIntensity);
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function vibrateWithPattern(
  pattern: number | number[] | null,
  hapticIntensity: HapticIntensity = "medium",
): void {
  if (pattern === null || !isHapticsEnabled()) return;
  const navObj =
    typeof window !== "undefined"
      ? window.navigator
      : typeof navigator !== "undefined"
        ? navigator
        : undefined;
  if (!navObj || typeof navObj.vibrate !== "function") return;
  const scaled = scaleVibrationPattern(pattern, hapticIntensity);
  if (scaled === null) return;
  const resolved = prefersReducedMotion() && Array.isArray(scaled) ? (scaled[0] ?? 6) : scaled;
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
  const sourcesKey = sources ? JSON.stringify(sources) : "";
  useEffect(() => {
    void preloadUIFeedbackAudio(sources);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey]);
}

function resolveSpatialPanForTrigger(
  style: UIFeedbackStyle,
  opts: TriggerUIFeedbackOptions,
): SpatialAudioPosition | null {
  if (opts.positionalAudio === false) return null;
  const spatialSupportedByDefault = style === "parchment" || style === "sharp";
  if (!spatialSupportedByDefault && opts.positionalAudio !== true && opts.pan === undefined) {
    return null;
  }
  if (typeof opts.pan === "number" && Number.isFinite(opts.pan)) {
    const p = clampSigned(opts.pan);
    return {
      pan: p,
      x: p,
      y: 0,
      distanceFromCenter: Math.abs(p),
    };
  }
  if (opts.target) {
    return calculateElementAudioPan(opts.target);
  }
  return null;
}

/**
 * Imperatively plays Web Audio API SFX and triggers window.navigator.vibrate feedback
 * calibrated for the given UI mode, spatial position, and haptic intensity.
 */
export function triggerUIFeedback(
  event: UIFeedbackEvent,
  mode: string,
  subThemeOrOptions?: string | null | TriggerUIFeedbackOptions,
  extraOptions?: TriggerUIFeedbackOptions,
): void {
  const opts: TriggerUIFeedbackOptions = isTriggerOptionsObject(subThemeOrOptions)
    ? subThemeOrOptions
    : {
        ...(subThemeOrOptions !== undefined ? { subTheme: subThemeOrOptions } : {}),
        ...(extraOptions ?? {}),
      };

  const subTheme = opts.subTheme;
  const style = resolveUIFeedbackStyle(mode, subTheme);
  if (style === "minimal") return;

  const isNav = event === "nav" || event === "navigation" || event === "snap";
  const intensity = opts.hapticIntensity ?? readStoredHapticIntensity();
  const pattern = getUIFeedbackVibrationPattern(mode, event, subTheme, "medium");
  const spatialPan = resolveSpatialPanForTrigger(style, opts);

  const playAudio = () => {
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
      }
    }
  };

  if (spatialPan) {
    withAudioPan(spatialPan, playAudio);
  } else {
    playAudio();
  }

  vibrateWithPattern(pattern, intensity);
}

export {
  HAPTIC_INTENSITY_OPTIONS,
  HAPTIC_INTENSITY_STORAGE_KEY,
  getDecodedAudioBuffer,
  isHapticsEnabled,
  resetAudioBufferCache,
  resolveHapticIntensity,
  setHapticsEnabled,
  type HapticIntensity,
};

/**
 * React hook for mode-aware Web Audio API sounds (with positional panning in 'nexus' &
 * 'fantasy' modes) and window.navigator.vibrate haptic feedback scaled by context intensity.
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
  const [fallbackIntensity, setFallbackIntensity] = useState<HapticIntensity>(() =>
    readStoredHapticIntensity(),
  );

  const hasUIState = Boolean(uiStateCtx);
  const setContextHapticIntensity = uiStateCtx?.setHapticIntensity;

  useEffect(() => {
    if (hasUIState || typeof window === "undefined") return;
    const sync = () => {
      const next = readStoredHapticIntensity();
      setFallbackIntensity((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("scu:haptic-intensity-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("scu:haptic-intensity-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, [hasUIState]);

  const enabled = options?.enabled ?? true;
  const rawMode = options?.mode ?? themeCtx?.primarySystem ?? uiStateCtx?.mode ?? modeFallback;
  const rawSubTheme =
    options?.subTheme !== undefined
      ? options.subTheme
      : (themeCtx?.mangaSubTheme ?? (activeGenre ? genreThemeToMangaSubTheme(activeGenre) : null));
  const hapticIntensity =
    options?.hapticIntensity ?? uiStateCtx?.hapticIntensity ?? fallbackIntensity;
  const defaultTargetOpt = options?.target;
  const defaultPositionalAudio = options?.positionalAudio;

  const setHapticIntensity = useCallback(
    (next: HapticIntensity) => {
      const normalized = resolveHapticIntensity(next);
      if (setContextHapticIntensity) {
        setContextHapticIntensity(normalized);
        return;
      }
      setFallbackIntensity((prev) => (prev === normalized ? prev : normalized));
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(HAPTIC_INTENSITY_STORAGE_KEY, normalized);
          window.dispatchEvent(
            new CustomEvent("scu:haptic-intensity-change", { detail: { intensity: normalized } }),
          );
        } catch {
          /* ignore storage restrictions */
        }
      }
    },
    [setContextHapticIntensity],
  );

  const style = useMemo(
    () => (enabled ? resolveUIFeedbackStyle(rawMode, rawSubTheme) : "minimal"),
    [enabled, rawMode, rawSubTheme],
  );

  const resolveHookTarget = useCallback(
    (override?: UIFeedbackTarget): UIFeedbackTarget => {
      if (override !== undefined) return override;
      if (typeof defaultTargetOpt === "function") return defaultTargetOpt();
      return defaultTargetOpt;
    },
    [defaultTargetOpt],
  );

  const triggerFeedback = useCallback(
    (
      event: UIFeedbackEvent,
      modeOrOptionsOrTarget?: string | TriggerUIFeedbackOptions | UIFeedbackTarget,
      subThemeOrTarget?: string | null | TriggerUIFeedbackOptions | UIFeedbackTarget,
      extraOptions?: TriggerUIFeedbackOptions,
    ) => {
      if (!enabled) return;

      let modeOverride: string | undefined;
      let subThemeOverride: string | null | undefined;
      let callOptions: TriggerUIFeedbackOptions = {};

      if (typeof modeOrOptionsOrTarget === "string") {
        modeOverride = modeOrOptionsOrTarget;
        if (typeof subThemeOrTarget === "string" || subThemeOrTarget === null) {
          subThemeOverride = subThemeOrTarget;
          if (extraOptions) callOptions = extraOptions;
        } else if (isTriggerOptionsObject(subThemeOrTarget)) {
          callOptions = subThemeOrTarget;
        } else if (isFeedbackTargetLike(subThemeOrTarget)) {
          callOptions = { target: subThemeOrTarget };
        }
      } else if (isTriggerOptionsObject(modeOrOptionsOrTarget)) {
        callOptions = modeOrOptionsOrTarget;
        subThemeOverride = callOptions.subTheme;
      } else if (isFeedbackTargetLike(modeOrOptionsOrTarget)) {
        callOptions = { target: modeOrOptionsOrTarget };
      }

      const effectiveMode = modeOverride ?? rawMode;
      const effectiveSub =
        subThemeOverride !== undefined
          ? subThemeOverride
          : modeOverride && modeOverride !== rawMode
            ? null
            : rawSubTheme;
      const resolvedTarget = resolveHookTarget(callOptions.target);
      const resolvedPositional = callOptions.positionalAudio ?? defaultPositionalAudio;

      triggerUIFeedback(event, effectiveMode, {
        ...(effectiveSub !== undefined ? { subTheme: effectiveSub } : {}),
        ...(resolvedTarget !== undefined ? { target: resolvedTarget } : {}),
        ...(callOptions.pan !== undefined ? { pan: callOptions.pan } : {}),
        ...(resolvedPositional !== undefined ? { positionalAudio: resolvedPositional } : {}),
        hapticIntensity: callOptions.hapticIntensity ?? hapticIntensity,
      });
    },
    [defaultPositionalAudio, enabled, hapticIntensity, rawMode, rawSubTheme, resolveHookTarget],
  );

  const triggerNavigation = useCallback(
    (modeOrTargetOrOptions?: string | UIFeedbackTarget | TriggerUIFeedbackOptions) => {
      triggerFeedback("nav", modeOrTargetOrOptions);
    },
    [triggerFeedback],
  );

  const triggerClick = useCallback(
    (modeOrTargetOrOptions?: string | UIFeedbackTarget | TriggerUIFeedbackOptions) => {
      triggerFeedback("click", modeOrTargetOrOptions);
    },
    [triggerFeedback],
  );

  const triggerAction = useCallback(
    (modeOrTargetOrOptions?: string | UIFeedbackTarget | TriggerUIFeedbackOptions) => {
      triggerFeedback("cta", modeOrTargetOrOptions);
    },
    [triggerFeedback],
  );

  return {
    mode: rawMode,
    subTheme: rawSubTheme,
    style,
    hapticIntensity,
    setHapticIntensity,
    triggerFeedback,
    triggerNavigation,
    triggerClick,
    triggerAction,
  };
}
