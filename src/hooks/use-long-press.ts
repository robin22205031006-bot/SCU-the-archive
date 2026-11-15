import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  isInteractiveLongPressTarget,
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_THRESHOLD_PX,
  shouldCancelLongPress,
} from "@/lib/lore-card-actions";

export interface LongPressPosition {
  x: number;
  y: number;
}

export interface UseLongPressOptions {
  delayMs?: number;
  moveThresholdPx?: number;
  onTrigger: (pos: LongPressPosition) => void;
}

/**
 * Reliable touch & pointer long-press hook with drift cancellation, scroll cancellation,
 * child-control exclusion, and desktop contextmenu support.
 */
export function useLongPress({
  delayMs = LONG_PRESS_DELAY_MS,
  moveThresholdPx = LONG_PRESS_MOVE_THRESHOLD_PX,
  onTrigger,
}: UseLongPressOptions) {
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
    setPressing(false);
  }, []);

  useEffect(() => {
    if (!pressing) return;
    const handleScroll = () => cancel();
    const handleGlobalMove = (e: PointerEvent) => {
      const start = startRef.current;
      if (!start) return;
      if (shouldCancelLongPress(start.x, start.y, e.clientX, e.clientY, moveThresholdPx)) {
        cancel();
      }
    };
    const handleGlobalUp = () => cancel();
    window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    window.addEventListener("pointermove", handleGlobalMove, { passive: true });
    window.addEventListener("pointerup", handleGlobalUp, { passive: true });
    window.addEventListener("pointercancel", handleGlobalUp, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      window.removeEventListener("pointermove", handleGlobalMove);
      window.removeEventListener("pointerup", handleGlobalUp);
      window.removeEventListener("pointercancel", handleGlobalUp);
    };
  }, [pressing, cancel, moveThresholdPx]);

  useEffect(() => () => cancel(), [cancel]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      // Ignore right-clicks (handled by onContextMenu) and secondary buttons
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (isInteractiveLongPressTarget(e.target, e.currentTarget)) return;

      cancel();
      longPressFiredRef.current = false;
      const x = e.clientX;
      const y = e.clientY;
      startRef.current = { x, y };
      setPressing(true);

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        startRef.current = null;
        longPressFiredRef.current = true;
        setPressing(false);
        onTriggerRef.current({ x, y });
      }, delayMs);
    },
    [cancel, delayMs],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const start = startRef.current;
      if (!start) return;
      if (shouldCancelLongPress(start.x, start.y, e.clientX, e.clientY, moveThresholdPx)) {
        cancel();
      }
    },
    [cancel, moveThresholdPx],
  );

  const onPointerUp = useCallback(() => {
    cancel();
  }, [cancel]);

  const onPointerCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  const onContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLElement>) => {
      if (isInteractiveLongPressTarget(e.target, e.currentTarget)) return;
      e.preventDefault();
      cancel();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX > 0 ? e.clientX : rect.left + Math.min(rect.width / 2, 160);
      const y = e.clientY > 0 ? e.clientY : rect.top + 48;
      onTriggerRef.current({ x, y });
    },
    [cancel],
  );

  return {
    pressing,
    longPressFiredRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
    },
  };
}
