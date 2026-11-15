import { useEffect } from "react";
import { useAnimeActionCutListener } from "@/hooks/use-anime-hitstop";
import { useAppMotion } from "@/hooks/use-app-motion";

/**
 * Viewport-level ufotable / MAPPA action-cut FX overlay:
 * - Applies micro-shake & kinetic lunge attributes to `<html data-anime-hitstop>`
 *   during character selection or ability activation
 * - Renders a 40ms high-contrast impact light flash & luminous slash sheen
 * Strictly non-interactive (`pointer-events-none`) and unrendered in Minimal mode.
 */
export function AnimeActionOverlay() {
  const { isMinimal, motionActive } = useAppMotion();
  const cut = useAnimeActionCutListener();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (!motionActive || isMinimal) {
      delete root.dataset["animeHitstop"];
      return;
    }
    if (cut.shaking || cut.lunging) {
      root.dataset["animeHitstop"] = cut.shaking ? "shake" : "lunge";
    } else {
      delete root.dataset["animeHitstop"];
    }
    return () => {
      delete root.dataset["animeHitstop"];
    };
  }, [cut.shaking, cut.lunging, isMinimal, motionActive]);

  if (isMinimal || !motionActive) return null;

  return (
    <>
      {cut.flashing && (
        <div
          aria-hidden="true"
          data-testid="anime-hitstop-flash"
          className="pointer-events-none fixed inset-0 z-[70] mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.72), color-mix(in oklab, ${cut.color} 35%, rgba(255,255,255,0.22)) 55%, transparent 88%)`,
          }}
        />
      )}
      {cut.lunging && (
        <div
          aria-hidden="true"
          key={cut.burstKey}
          data-testid="anime-action-cut"
          className="anime-action-cut-ring pointer-events-none fixed inset-0 z-[65] overflow-hidden"
          style={{
            boxShadow: `inset 0 0 65px color-mix(in oklab, ${cut.color} 34%, transparent)`,
          }}
        >
          <span
            className="anime-action-cut-slash absolute left-[-20%] top-[44%] h-[3px] w-[140%]"
            style={{
              background: `linear-gradient(90deg, transparent 5%, #ffffff 48%, ${cut.color} 72%, transparent 95%)`,
              boxShadow: `0 0 18px ${cut.color}`,
            }}
          />
        </div>
      )}
    </>
  );
}
