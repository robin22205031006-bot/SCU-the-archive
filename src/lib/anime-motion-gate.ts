/**
 * Checks whether Anime.js transitions and rune animations may run.
 * Respects Minimal mode, FX:OFF (`data-motion="off"`), and OS reduced motion.
 * Lives apart from anime-animations.ts so callers that only need this check
 * (hitstops, style switches) do not pull the animejs runtime into startup.
 */
export function isAnimeMotionAllowed(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const d = document.documentElement.dataset;
  if (d["primarySystem"] === "minimal" || d["uiMode"] === "minimal") return false;
  if (d["motion"] === "off") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  return true;
}
