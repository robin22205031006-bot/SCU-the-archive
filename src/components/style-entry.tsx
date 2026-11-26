import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { VisualUiMode } from "@/hooks/use-ui-mode";
import { useAppMotion } from "@/hooks/use-app-motion";

/**
 * Entry animation when a reader switches INTO one of the two signature styles. Nexus boots
 * like a holographic HUD; the Codex opens like an astrolabe. Plays on a switch (not on every
 * page load), never takes pointer events or focus, and becomes a short static card when
 * motion is off or reduced. Transform/opacity only.
 */
const DURATION: Record<"nexus" | "codex", number> = { nexus: 2600, codex: 3000 };
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+<>/\\";

function useDecrypt(word: string, active: boolean, ms = 900) {
  const [text, setText] = useState(word);
  useEffect(() => {
    if (!active) {
      setText(word);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const fixed = Math.floor(p * word.length);
      setText(
        word
          .split("")
          .map((ch, i) => (i < fixed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(""),
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [word, active, ms]);
  return text;
}

function NexusEntry({ animated }: { animated: boolean }) {
  const title = useDecrypt("NEXUS", animated, 1000);
  return (
    <div className="sx-nexus" data-animated={animated ? "true" : "false"}>
      <div className="sx-n-veil" />
      {animated && (
        <>
          <div className="sx-n-floor" />
          <div className="sx-n-scan" />
          <span className="sx-n-br tl" />
          <span className="sx-n-br tr" />
          <span className="sx-n-br bl" />
          <span className="sx-n-br br" />
          <svg className="sx-n-reticle" viewBox="0 0 200 200" aria-hidden="true">
            <circle className="o" cx="100" cy="100" r="92" />
            <circle className="m" cx="100" cy="100" r="74" />
            <circle className="i" cx="100" cy="100" r="54" />
            <path className="t" d="M100 2 v14 M100 184 v14 M2 100 h14 M184 100 h14" />
          </svg>
        </>
      )}
      <div className="sx-n-copy">
        <p className="sx-n-kicker">Constellation link established</p>
        <p className="sx-n-title" aria-hidden="true">
          {title}
        </p>
        <p className="sx-n-sub">Welcome to the Sentinels Universe</p>
      </div>
    </div>
  );
}

function CodexEntry({ animated }: { animated: boolean }) {
  const word = "The Codex";
  return (
    <div className="sx-codex" data-animated={animated ? "true" : "false"}>
      <div className="sx-c-veil" />
      {animated && (
        <>
          <div className="sx-c-rays" />
          <svg className="sx-c-astro" viewBox="0 0 240 240" aria-hidden="true">
            <g className="r3">
              <circle cx="120" cy="120" r="112" />
              <path d="M120 4 l5 10 h-10z M120 236 l5 -10 h-10z M4 120 l10 5 v-10z M236 120 l-10 5 v-10z" />
            </g>
            <g className="r2">
              <circle cx="120" cy="120" r="92" />
            </g>
            <g className="r1">
              <circle cx="120" cy="120" r="70" />
            </g>
          </svg>
          <div className="sx-c-gem">
            <span className="h l" />
            <span className="h r" />
            <span className="core" />
          </div>
          <div className="sx-c-motes">
            {Array.from({ length: 16 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    left: `${(i * 37) % 100}%`,
                    "--d": `${1.6 + (i % 5) * 0.25}s`,
                    "--dl": `${(i % 7) * 0.12}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </>
      )}
      <div className="sx-c-copy">
        <p className="sx-c-title" aria-hidden="true">
          {word.split("").map((ch, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties}>
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </p>
        <p className="sx-c-sub">Welcome to the Sentinels Universe</p>
      </div>
    </div>
  );
}

export function StyleEntry({ mode }: { mode: VisualUiMode }) {
  const { motionActive } = useAppMotion();
  const prev = useRef<VisualUiMode | null>(null);
  const [show, setShow] = useState<null | "nexus" | "codex">(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = mode;
    // Only a real switch plays it: not the first render, not re-renders in the same style.
    if (before === null || before === mode) return;
    if (mode !== "nexus" && mode !== "codex") {
      setShow(null);
      return;
    }
    setShow(mode);
    const ms = motionActive ? DURATION[mode] : 1300;
    const t = window.setTimeout(() => setShow(null), ms);
    return () => window.clearTimeout(t);
  }, [mode, motionActive]);

  if (!show) return null;
  const reduced =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const animated = motionActive && !reduced;
  return (
    <div
      className="style-entry"
      data-style={show}
      data-motion={animated ? "on" : "off"}
      role="status"
      aria-live="polite"
      data-testid="style-entry"
    >
      <span className="sr-only">
        {show === "nexus" ? "Entering Nexus" : "Entering the Codex"}. Welcome to the Sentinels
        Universe.
      </span>
      {show === "nexus" ? <NexusEntry animated={animated} /> : <CodexEntry animated={animated} />}
    </div>
  );
}

export default StyleEntry;
