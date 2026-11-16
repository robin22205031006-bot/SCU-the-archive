import { useEffect, type RefObject } from "react";

const SELECTOR = "[data-nx-tilt], button.group, a.group, .rounded-2xl.border, .rounded-xl.border";
const MAX_DEG = 4;
const MAX_WIDTH = 520; // only card-sized elements tilt, never whole panels

/** Clamp a pointer offset (-0.5..0.5) to a tilt angle capped at ±4deg. */
export function tiltAngle(offset: number) {
  return Math.max(-MAX_DEG, Math.min(MAX_DEG, offset * MAX_DEG * 2));
}

/** Delegated, rAF-throttled card tilt + cursor glare inside the Nexus shell. Transform only. */
export function useNexusTilt(root: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const host = root.current;
    if (!host || !enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    let active: HTMLElement | null = null;
    let frame = 0;
    let last: PointerEvent | null = null;
    const reset = (el: HTMLElement) => {
      el.style.transform = "";
      el.removeAttribute("data-nx-tilting");
    };
    const apply = () => {
      frame = 0;
      if (!active || !last) return;
      const r = active.getBoundingClientRect();
      const x = (last.clientX - r.left) / r.width - 0.5;
      const y = (last.clientY - r.top) / r.height - 0.5;
      active.style.transform = `perspective(800px) rotateX(${tiltAngle(-y)}deg) rotateY(${tiltAngle(x)}deg)`;
      active.style.setProperty("--nx-gx", `${(x + 0.5) * 100}%`);
      active.style.setProperty("--nx-gy", `${(y + 0.5) * 100}%`);
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      const target = el && host.contains(el) && el.offsetWidth <= MAX_WIDTH ? el : null;
      if (target !== active) {
        if (active) reset(active);
        active = target;
        active?.setAttribute("data-nx-tilting", "");
      }
      last = e;
      if (active && !frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (active) reset(active);
      active = null;
    };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
      if (active) reset(active);
    };
  }, [root, enabled]);
}
