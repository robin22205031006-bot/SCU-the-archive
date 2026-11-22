import { triggerAnimeActionCut } from "@/hooks/use-anime-hitstop";
import { isAnimeMotionAllowed } from "@/lib/anime-motion-gate";

let tierHitstopTimer = 0;

function tierColorAndLabel(
  targetTier: string,
  subTheme?: string | null,
): { color: string; label: string } {
  if (targetTier === "nexus") {
    return { color: "#38bdf8", label: "NEXUS // ENGAGED" };
  }
  if (targetTier === "manga" || subTheme) {
    switch (subTheme) {
      case "shounen":
      case "shonen":
        return { color: "#e86a33", label: "SHOUNEN // CITADEL" };
      case "fantasy":
        return { color: "#5ce1b8", label: "FANTASY // GRIMOIRE" };
      case "darkFantasy":
      case "dark-fantasy":
        return { color: "#8b5cf6", label: "DARK FANTASY" };
      case "scifiAnime":
      case "cyber-anime":
      case "manhwa":
        return { color: "#38bdf8", label: "ANIME // OVERDRIVE" };
      case "ghibli":
        return { color: "#2f7a4d", label: "PASTORAL // WIND" };
      case "isekai":
        return { color: "#e09f3e", label: "ISEKAI // HUD" };
      case "anime":
      case "xianxia":
        return { color: "#d6b26a", label: "ANIME // SCROLL" };
      default:
        return { color: "#b91c1c", label: "MANGA // INK CUT" };
    }
  }
  return { color: "#f59e0b", label: "ARCHIVE // CLASSIC" };
}

/**
 * Triggers a heavy 40ms high-contrast visual flash + glowing border highlight hit-stop
 * when switching between major UI tiers (e.g., Nexus <-> Shounen).
 * Automatically bypassed in Minimal mode, FX:OFF, or `prefers-reduced-motion`.
 */
export function triggerTierSwitchHitstop(targetTier: string, subTheme?: string | null): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (targetTier === "minimal" || !isAnimeMotionAllowed()) return;

  const { color, label } = tierColorAndLabel(targetTier, subTheme);
  const root = document.documentElement;

  window.clearTimeout(tierHitstopTimer);
  root.style.setProperty("--scu-hitstop-color", color);
  root.dataset["tierHitstop"] = "true";

  triggerAnimeActionCut({
    color,
    label,
    intensity:
      targetTier === "nexus" || subTheme === "shounen" || subTheme === "shonen"
        ? "heavy"
        : "normal",
  });

  tierHitstopTimer = window.setTimeout(() => {
    delete root.dataset["tierHitstop"];
  }, 110);
}
