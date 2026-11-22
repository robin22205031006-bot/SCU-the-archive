import { animate, spring, stagger, svg, type JSAnimation } from "animejs";

export interface AnimeAnimationHandle {
  cancel: () => void;
}

import { isAnimeMotionAllowed } from "./anime-motion-gate";

export { isAnimeMotionAllowed };

function setGpuHint(nodes: HTMLElement[], active: boolean): void {
  for (const el of nodes) {
    try {
      el.style.willChange = active ? "transform, opacity" : "";
    } catch {
      /* ignore detached nodes */
    }
  }
}

function safeRevert(anim: JSAnimation | null | undefined, nodes: HTMLElement[] = []): void {
  setGpuHint(nodes, false);
  if (!anim) return;
  try {
    anim.pause();
    anim.revert();
  } catch {
    /* element may already be unmounted */
  }
}

/**
 * Staggered spring entrance animation for Manga/Anime panels, dossier cards, and badges.
 * Immediately returns a no-op handle if Minimal mode, FX:OFF, or reduced-motion is active.
 */
export function animateMangaStagger(
  container: ParentNode | null | undefined,
  selector = ".manga-panel, [data-anime-stagger]",
): AnimeAnimationHandle {
  if (!container || !isAnimeMotionAllowed()) {
    return { cancel: () => {} };
  }
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(selector)).slice(0, 24);
  if (nodes.length === 0) {
    return { cancel: () => {} };
  }

  setGpuHint(nodes, true);
  let anim: JSAnimation | null = null;
  try {
    anim = animate(nodes, {
      opacity: [0.35, 1],
      translateY: [14, 0],
      scale: [0.97, 1],
      delay: stagger(32, { start: 10 }),
      ease: spring({ stiffness: 420, damping: 24, mass: 0.72 }),
      duration: 420,
      onComplete: () => setGpuHint(nodes, false),
    });
  } catch {
    setGpuHint(nodes, false);
    anim = null;
  }

  return {
    cancel: () => safeRevert(anim, nodes),
  };
}

/**
 * SVG rune / filigree path-drawing entrance when switching to Manga/Anime sub-themes.
 * Uses animejs v4 `svg.createDrawable` with a clean `strokeDashoffset` fallback in headless/JSDOM tests.
 */
export function animateSvgRuneDraw(
  container: ParentNode | null | undefined,
  selector = "[data-anime-rune] path, [data-anime-rune] circle, [data-anime-rune] polygon",
): AnimeAnimationHandle {
  if (!container || !isAnimeMotionAllowed()) {
    return { cancel: () => {} };
  }
  const rawTargets = Array.from(container.querySelectorAll<SVGGeometryElement>(selector)).slice(
    0,
    36,
  );
  if (rawTargets.length === 0) {
    return { cancel: () => {} };
  }

  const animations: JSAnimation[] = [];
  const hasGeometryMeasure = rawTargets.every(
    (el) => typeof (el as SVGGeometryElement).getTotalLength === "function",
  );

  if (hasGeometryMeasure) {
    try {
      const drawables = svg.createDrawable(rawTargets);
      const a = animate(drawables, {
        draw: ["0 0", "0 1"],
        ease: "outCubic",
        delay: stagger(28),
        duration: 540,
      });
      animations.push(a);
      return {
        cancel: () => animations.forEach((anim) => safeRevert(anim)),
      };
    } catch {
      /* fall through to dashoffset fallback */
    }
  }

  // Fallback for synthetic/SVG elements without getTotalLength (e.g. JSDOM)
  try {
    const a = animate(rawTargets, {
      strokeDasharray: ["120 120", "120 0"],
      strokeDashoffset: [120, 0],
      opacity: [0.4, 1],
      ease: "outCubic",
      delay: stagger(22),
      duration: 460,
    });
    animations.push(a);
  } catch {
    /* no-op if DOM doesn't support SVG CSS transforms */
  }

  return {
    cancel: () => animations.forEach((anim) => safeRevert(anim)),
  };
}

/**
 * Smooth spring-physics pop transition on a target panel when switching to or inside Manga UI.
 */
export function animateMangaSpringPanel(
  target: HTMLElement | null | undefined,
): AnimeAnimationHandle {
  if (!target || !isAnimeMotionAllowed()) {
    return { cancel: () => {} };
  }
  const targets = [target];
  setGpuHint(targets, true);
  let anim: JSAnimation | null = null;
  try {
    anim = animate(target, {
      opacity: [0.65, 1],
      scale: [0.965, 1],
      translateY: [10, 0],
      ease: spring({ stiffness: 460, damping: 24, mass: 0.7 }),
      duration: 380,
      onComplete: () => setGpuHint(targets, false),
    });
  } catch {
    setGpuHint(targets, false);
    anim = null;
  }
  return {
    cancel: () => safeRevert(anim, targets),
  };
}
