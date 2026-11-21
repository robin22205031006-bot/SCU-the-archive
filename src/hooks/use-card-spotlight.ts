import { useEffect } from "react";

/**
 * Classic-style pointer spotlight: one delegated, rAF-throttled listener writes
 * the pointer position onto the hovered card as --spot-x/--spot-y. Cards opt in
 * by rendering a `.scu-spotlight` layer; CSS paints the light, so no React state
 * changes and nothing re-renders while the pointer moves.
 */
export function useCardSpotlight(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
    let raf = 0;
    let pending: PointerEvent | null = null;
    const apply = () => {
      raf = 0;
      const ev = pending;
      pending = null;
      if (!ev) return;
      const target = ev.target instanceof Element ? ev.target : null;
      const layer = target?.closest(".glass")?.querySelector(":scope > .scu-spotlight");
      const card = layer?.parentElement;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${Math.round(ev.clientX - rect.left)}px`);
      card.style.setProperty("--spot-y", `${Math.round(ev.clientY - rect.top)}px`);
    };
    const onMove = (ev: PointerEvent) => {
      pending = ev;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);
}
