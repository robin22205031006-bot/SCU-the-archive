import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAppMotion } from "@/hooks/use-app-motion";
import { cinematicTitleFor } from "@/lib/cinematic";

const TITLE_CARD_MS = 1100;

/**
 * Cinematic chrome: a static vignette, stepped film grain and soft letterbox
 * shading, plus a title card on each route change. Everything is decorative and
 * pointer-events-none; the next page mounts underneath immediately, so motion
 * never delays archive data. Motion-off and reduced-motion skip the title card.
 */
export function CinematicChrome() {
  const { pathname } = useLocation();
  const { motionActive } = useAppMotion();
  const [card, setCard] = useState<{ id: number; title: string; scene: number } | null>(null);
  // Compare against the last path (not a first-run flag) so the initial load and
  // React's dev double-invoke never show a card.
  const lastPath = useRef(pathname);
  const scene = useRef(1);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    if (!motionActive || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setCard(null);
      return;
    }
    scene.current += 1;
    const next = { id: Date.now(), title: cinematicTitleFor(pathname), scene: scene.current };
    setCard(next);
    const timer = window.setTimeout(
      () => setCard((cur) => (cur?.id === next.id ? null : cur)),
      TITLE_CARD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [pathname, motionActive]);

  // Turning motion off mid-card clears it instead of leaving it on screen.
  useEffect(() => {
    if (!motionActive) setCard(null);
  }, [motionActive]);

  return (
    <div
      aria-hidden="true"
      className="cinematic-chrome"
      data-cine-motion={motionActive ? "on" : "off"}
    >
      <div className="cinematic-vignette" />
      <div className="cinematic-grain" />
      <div className="cinematic-matte cinematic-matte-top" />
      <div className="cinematic-matte cinematic-matte-bottom" />
      {card && (
        <div key={card.id} className="cinematic-title-card" data-testid="cinematic-title-card">
          <div className="cinematic-bar cinematic-bar-top" />
          <div className="cinematic-bar cinematic-bar-bottom" />
          <div className="cinematic-title">
            <span className="cinematic-scene">
              SCU · Scene {String(card.scene).padStart(2, "0")}
            </span>
            <span className="cinematic-title-text">{card.title}</span>
          </div>
        </div>
      )}
    </div>
  );
}
