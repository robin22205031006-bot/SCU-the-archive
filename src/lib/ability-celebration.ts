import confetti from "canvas-confetti";
import {
  HAPTIC_INTENSITY_STORAGE_KEY,
  resolveHapticIntensity,
  type HapticIntensity,
} from "@/context/UIStateContext";
import { isHapticsEnabled } from "@/hooks/use-sensory-feedback";
import { scaleVibrationPattern } from "@/hooks/use-ui-feedback";
import { clampDbAbilityLevel, type AbilityEmblemRank } from "@/lib/ability-rank";

export const LEGENDARY_SHAKE_CLASS = "scu-legendary-page-shake";
export const LEGENDARY_SHAKE_DURATION_MS = 520;
export const LEGENDARY_SECONDARY_BURST_DELAY_MS = 160;
export const LEGENDARY_CONFETTI_FALLBACK_SETTLE_MS = 1240;
export const EMBLEM_FLOAT_TRANSITION_MS = 440;

/**
 * Escalating tactile vibration waveforms (ms) per ability rank upgrade (1..5).
 */
export const ABILITY_RANK_UP_VIBRATION_PATTERNS: Record<AbilityEmblemRank, number | number[]> = {
  1: 12,
  2: [14, 24, 18],
  3: [16, 22, 20, 22, 24],
  4: [20, 20, 26, 20, 32],
  5: [26, 22, 34, 22, 46, 28, 60],
};

const RANK_UP_HAPTIC_DEDUP_MS = 80;
let lastRankUpHaptic: { signature: string; at: number } | null = null;

/**
 * Resets internal rank-up haptic deduplication state (intended for tests).
 */
export function resetAbilityRankUpHapticState(): void {
  lastRankUpHaptic = null;
}

/**
 * Detects whether the current runtime is a mobile device that supports hardware
 * vibration feedback via the Vibration API (`navigator.vibrate`), ensuring desktop
 * browsers do not emit vibration calls.
 */
export function isMobileHapticDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (typeof navigator.vibrate !== "function") return false;

  const cap = (
    window as Window & {
      Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
    }
  ).Capacitor;
  if (
    cap?.isNativePlatform?.() ||
    cap?.getPlatform?.() === "android" ||
    cap?.getPlatform?.() === "ios"
  ) {
    return true;
  }

  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") {
    return uaData.mobile;
  }

  const ua = navigator.userAgent || "";
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
    return true;
  }

  const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
  let coarsePointer = false;
  try {
    coarsePointer = Boolean(window.matchMedia?.("(pointer: coarse)").matches);
  } catch {
    coarsePointer = false;
  }
  return hasTouch && coarsePointer;
}

function readStoredHapticIntensitySafe(): HapticIntensity {
  if (typeof window === "undefined") return "medium";
  try {
    return resolveHapticIntensity(window.localStorage.getItem(HAPTIC_INTENSITY_STORAGE_KEY));
  } catch {
    return "medium";
  }
}

export interface AbilityRankUpHapticOptions {
  previousRank?: AbilityEmblemRank | undefined;
  abilityKey?: string | undefined;
  hapticIntensity?: HapticIntensity | undefined;
}

/**
 * Triggers rank-specific device-vibration feedback on a successful ability rank-up,
 * strictly gated to mobile devices that support haptic feedback (`navigator.vibrate`)
 * and respecting haptics enablement, Minimal UI mode, and reduced-motion preferences.
 */
export function triggerAbilityRankUpHaptic(
  nextRank: AbilityEmblemRank,
  options?: AbilityRankUpHapticOptions,
): boolean {
  const rank = clampDbAbilityLevel(nextRank);
  if (options?.previousRank !== undefined && rank <= options.previousRank) {
    return false;
  }
  if (!isHapticsEnabled()) return false;

  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (root?.dataset["ui"] === "minimal") return false;
  if (!isMobileHapticDevice()) return false;

  const now = Date.now();
  const signature = `${options?.abilityKey ?? "ability"}:${rank}`;
  if (
    lastRankUpHaptic &&
    lastRankUpHaptic.signature === signature &&
    now - lastRankUpHaptic.at < RANK_UP_HAPTIC_DEDUP_MS
  ) {
    return false;
  }

  const intensity = options?.hapticIntensity ?? readStoredHapticIntensitySafe();
  const basePattern = ABILITY_RANK_UP_VIBRATION_PATTERNS[rank];
  const scaled = scaleVibrationPattern(basePattern, intensity);
  if (scaled === null) return false;

  let reducedMotion = false;
  try {
    reducedMotion = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  } catch {
    reducedMotion = false;
  }
  const resolved = reducedMotion && Array.isArray(scaled) ? (scaled[0] ?? 10) : scaled;

  try {
    const ok = window.navigator.vibrate(resolved);
    if (ok === false) return false;
    lastRankUpHaptic = { signature, at: now };
    return true;
  } catch {
    return false;
  }
}

export interface LegendaryConfettiOptions {
  originElement?: HTMLElement | null | undefined;
  accentColor?: string | undefined;
  /** Optional target container to shake upon animation completion (defaults to main page root). */
  shakeTarget?: HTMLElement | null | undefined;
  /** Enables the post-confetti screen-shake on the main page (default: true). */
  screenShake?: boolean | undefined;
  /** Invoked when the Rank 5 confetti animation finishes (after screen-shake is triggered). */
  onComplete?: (() => void) | undefined;
  /** Fallback settle window (ms after secondary bursts) when confetti returns a non-thenable. */
  fallbackSettleMs?: number | undefined;
}

export function isReducedMotionOrMinimal(): boolean {
  if (typeof window === "undefined") return true;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return true;
    }
  } catch {
    // ignore matchMedia errors in restricted environments
  }
  const root = typeof document !== "undefined" ? document.documentElement : null;
  if (root?.dataset["ui"] === "minimal" || root?.dataset["motion"] === "off") {
    return true;
  }
  return false;
}

function canRenderConfetti(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof (confetti as unknown as { mock?: unknown }).mock === "object") {
    return true;
  }
  try {
    const probe = document.createElement("canvas");
    return Boolean(probe.getContext?.("2d"));
  } catch {
    return false;
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

let activeShakeTimer: number | null = null;
let activeShakeTarget: HTMLElement | null = null;

/**
 * Resolves the main page container to animate for screen-shake without breaking
 * viewport-fixed dialogs/modals portaled into document.body.
 */
export function resolveLegendaryShakeTarget(customTarget?: HTMLElement | null): HTMLElement | null {
  if (customTarget) return customTarget;
  if (typeof document === "undefined") return null;
  return (
    document.querySelector<HTMLElement>("body [data-ui-mode]") ??
    document.querySelector<HTMLElement>("main") ??
    (document.body?.firstElementChild as HTMLElement | null) ??
    document.body ??
    null
  );
}

/**
 * Clears any active Legendary screen-shake class/attribute from the page target.
 */
export function clearLegendaryPageShake(target?: HTMLElement | null): void {
  if (typeof window !== "undefined" && activeShakeTimer !== null) {
    window.clearTimeout(activeShakeTimer);
    activeShakeTimer = null;
  }
  const el = target ?? activeShakeTarget ?? resolveLegendaryShakeTarget();
  if (el) {
    el.classList.remove(LEGENDARY_SHAKE_CLASS);
    delete el.dataset["legendaryShake"];
  }
  if (!target || target === activeShakeTarget) {
    activeShakeTarget = null;
  }
}

/**
 * Triggers a brief kinetic screen-shake on the main page container,
 * automatically respecting reduced-motion & Minimal mode settings.
 */
export function triggerLegendaryPageShake(options?: {
  target?: HTMLElement | null | undefined;
  durationMs?: number | undefined;
}): boolean {
  if (isReducedMotionOrMinimal() || typeof window === "undefined") return false;
  const target = resolveLegendaryShakeTarget(options?.target);
  if (!target) return false;

  if (activeShakeTimer !== null) {
    window.clearTimeout(activeShakeTimer);
    activeShakeTimer = null;
  }
  if (activeShakeTarget && activeShakeTarget !== target) {
    activeShakeTarget.classList.remove(LEGENDARY_SHAKE_CLASS);
    delete activeShakeTarget.dataset["legendaryShake"];
  }

  // Restart CSS keyframe cleanly if retriggered rapidly
  if (target.classList.contains(LEGENDARY_SHAKE_CLASS)) {
    target.classList.remove(LEGENDARY_SHAKE_CLASS);
    void target.offsetWidth;
  }

  activeShakeTarget = target;
  target.classList.add(LEGENDARY_SHAKE_CLASS);
  target.dataset["legendaryShake"] = "active";

  const durationMs = options?.durationMs ?? LEGENDARY_SHAKE_DURATION_MS;
  activeShakeTimer = window.setTimeout(() => {
    activeShakeTimer = null;
    target.classList.remove(LEGENDARY_SHAKE_CLASS);
    delete target.dataset["legendaryShake"];
    if (activeShakeTarget === target) {
      activeShakeTarget = null;
    }
  }, durationMs);

  return true;
}

/**
 * Triggers a celebratory 'Legendary' particle burst via canvas-confetti
 * when an ability is upgraded to Rank 5 (Apex), followed by a kinetic
 * main-page screen-shake when the confetti animation completes.
 */
export function triggerLegendaryRankUpConfetti(options?: LegendaryConfettiOptions): boolean {
  if (isReducedMotionOrMinimal() || !canRenderConfetti()) return false;

  let origin = { x: 0.5, y: 0.52 };
  const el = options?.originElement;
  if (el && typeof el.getBoundingClientRect === "function" && typeof window !== "undefined") {
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    if (rect.width > 0 && rect.height > 0) {
      origin = {
        x: Math.min(0.92, Math.max(0.08, (rect.left + rect.width / 2) / vw)),
        y: Math.min(0.9, Math.max(0.1, (rect.top + rect.height / 2) / vh)),
      };
    }
  }

  const palette = ["#fbbf24", "#ff2d2d", "#fde68a", "#ffffff"];
  if (options?.accentColor && !palette.includes(options.accentColor)) {
    palette.push(options.accentColor);
  }

  let completed = false;
  const completeCelebration = () => {
    if (completed) return;
    completed = true;
    if (!isReducedMotionOrMinimal() && options?.screenShake !== false) {
      triggerLegendaryPageShake({ target: options?.shakeTarget });
    }
    options?.onComplete?.();
  };

  try {
    const burstPromises: Promise<unknown>[] = [];
    const primaryResult = confetti({
      particleCount: 72,
      spread: 78,
      startVelocity: 36,
      decay: 0.91,
      scalar: 1.05,
      ticks: 180,
      zIndex: 9999,
      origin,
      colors: palette,
    });
    if (isThenable(primaryResult)) {
      burstPromises.push(Promise.resolve(primaryResult));
    }

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        try {
          const leftResult = confetti({
            particleCount: 32,
            angle: 60,
            spread: 58,
            startVelocity: 30,
            ticks: 150,
            zIndex: 9999,
            origin: { x: Math.max(0.12, origin.x - 0.18), y: Math.min(0.85, origin.y + 0.08) },
            colors: palette,
          });
          const rightResult = confetti({
            particleCount: 32,
            angle: 120,
            spread: 58,
            startVelocity: 30,
            ticks: 150,
            zIndex: 9999,
            origin: { x: Math.min(0.88, origin.x + 0.18), y: Math.min(0.85, origin.y + 0.08) },
            colors: palette,
          });
          if (isThenable(leftResult)) {
            burstPromises.push(Promise.resolve(leftResult));
          }
          if (isThenable(rightResult)) {
            burstPromises.push(Promise.resolve(rightResult));
          }
        } catch {
          // ignore secondary burst issues if unmounted or canvas unavailable
        }

        if (burstPromises.length > 0) {
          void Promise.allSettled(burstPromises).then(() => {
            completeCelebration();
          });
        } else {
          const settleMs = options?.fallbackSettleMs ?? LEGENDARY_CONFETTI_FALLBACK_SETTLE_MS;
          window.setTimeout(completeCelebration, settleMs);
        }
      }, LEGENDARY_SECONDARY_BURST_DELAY_MS);
    }
    return true;
  } catch {
    return false;
  }
}
