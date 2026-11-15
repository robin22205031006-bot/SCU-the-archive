import { useCallback, useEffect, useRef, useState } from "react";
import { isAnimeMotionAllowed } from "@/lib/anime-animations";

export interface AnimeActionCutDetail {
  color?: string | undefined;
  label?: string | undefined;
  intensity?: "normal" | "heavy" | undefined;
}

const ACTION_CUT_EVENT = "scu:anime-action-cut";

/**
 * Triggers a high-budget studio action cut:
 * - 40ms high-contrast light flash
 * - Snappy kinetic lunge (`cubic-bezier(0.22, 1, 0.36, 1)`)
 * - Subtle 160ms micro-shake
 * Automatically skipped in Minimal mode, FX:OFF, or reduced motion.
 */
export function triggerAnimeActionCut(detail: AnimeActionCutDetail = {}): void {
  if (typeof window === "undefined" || !isAnimeMotionAllowed()) return;
  window.dispatchEvent(new CustomEvent<AnimeActionCutDetail>(ACTION_CUT_EVENT, { detail }));
}

export interface AnimeHitstopState {
  flashing: boolean;
  shaking: boolean;
  lunging: boolean;
  color: string;
  label: string | null;
  burstKey: number;
}

/**
 * Listens for action-cut triggers and manages 40ms flash + kinetic lunge + micro-shake
 * with guaranteed timeout cleanup so React state never leaks across unmounts.
 */
export function useAnimeActionCutListener(): AnimeHitstopState {
  const [state, setState] = useState<AnimeHitstopState>({
    flashing: false,
    shaking: false,
    lunging: false,
    color: "#38bdf8",
    label: null,
    burstKey: 0,
  });
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const onCut = (ev: Event) => {
      if (!isAnimeMotionAllowed()) return;
      const detail = (ev as CustomEvent<AnimeActionCutDetail>).detail ?? {};
      clearTimers();
      setState((prev) => ({
        flashing: true,
        shaking: true,
        lunging: true,
        color: detail.color || prev.color || "#38bdf8",
        label: detail.label ?? null,
        burstKey: prev.burstKey + 1,
      }));

      // 40ms high-contrast light flash (impact hit-stop)
      const flashTimer = window.setTimeout(() => {
        setState((prev) => ({ ...prev, flashing: false }));
      }, 40);

      // 160ms subtle micro-shake settles
      const shakeTimer = window.setTimeout(() => {
        setState((prev) => ({ ...prev, shaking: false }));
      }, 170);

      // 280ms kinetic lunge settles
      const lungeTimer = window.setTimeout(() => {
        setState((prev) => ({ ...prev, lunging: false, label: null }));
      }, 280);

      timersRef.current = [flashTimer, shakeTimer, lungeTimer];
    };

    window.addEventListener(ACTION_CUT_EVENT, onCut);
    return () => {
      window.removeEventListener(ACTION_CUT_EVENT, onCut);
      clearTimers();
    };
  }, [clearTimers]);

  return state;
}

/**
 * Local hook for triggering action cuts on character selection or ability activation
 * with automatic class names for kinetic lunge & micro-shake on the local showcase container.
 */
export function useAnimeHitstop() {
  const state = useAnimeActionCutListener();
  const trigger = useCallback((detail?: AnimeActionCutDetail) => {
    triggerAnimeActionCut(detail);
  }, []);
  return { ...state, trigger };
}
