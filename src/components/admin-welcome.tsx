import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { WelcomeMotion } from "@/lib/admin-welcome";

export type WelcomeFlavor = "classic" | "nexus" | "manga" | "cinematic" | "minimal";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#@$%&";

/** Nexus flavour: the name resolves from scrambled glyphs, left to right. */
function useDecrypt(text: string, active: boolean) {
  const [out, setOut] = useState(active ? "" : text);
  useEffect(() => {
    if (!active) {
      setOut(text);
      return;
    }
    let frame = 0;
    const total = 18;
    const id = window.setInterval(() => {
      frame += 1;
      const settled = Math.floor((frame / total) * text.length);
      setOut(
        Array.from(text, (ch, i) =>
          i < settled || ch === " " ? ch : GLYPHS[(i * 7 + frame * 13) % GLYPHS.length],
        ).join(""),
      );
      if (frame >= total) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [text, active]);
  return out;
}

const DURATION: Record<WelcomeMotion, number> = { animated: 4200, static: 4800 };

/**
 * One-shot admin welcome. Decorative and non-blocking: the overlay ignores pointer
 * input except the Skip button, Esc closes it, focus never moves, and the accessible
 * text is a polite status line. Each UI style gets its own flavour; Minimal,
 * motion-off and reduced motion get the static card.
 */
export default function AdminWelcome({
  name,
  role,
  greeting,
  flavor,
  motion,
  onDone,
}: {
  name: string;
  role: string;
  greeting: string;
  flavor: WelcomeFlavor;
  motion: WelcomeMotion;
  onDone: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const animated = motion === "animated";
  const decrypted = useDecrypt(name, animated && flavor === "nexus");

  useEffect(() => {
    const leave = window.setTimeout(() => setLeaving(true), DURATION[motion] - 500);
    const done = window.setTimeout(() => doneRef.current(), DURATION[motion]);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") doneRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
      window.removeEventListener("keydown", onKey);
    };
  }, [motion]);

  const letters = Array.from(name);
  return (
    <div
      className="awel"
      data-flavor={flavor}
      data-motion={motion}
      data-leaving={leaving ? "true" : "false"}
      data-testid="admin-welcome"
    >
      <div className="awel-backdrop" aria-hidden="true" />
      {animated && (
        <div className="awel-fx" aria-hidden="true">
          {flavor === "classic" && <span className="awel-aurora" />}
          {flavor === "nexus" && (
            <>
              <span className="awel-scan" />
              <span className="awel-bracket awel-bracket-tl" />
              <span className="awel-bracket awel-bracket-br" />
            </>
          )}
          {flavor === "manga" && <span className="awel-speedlines" />}
          {flavor === "cinematic" && (
            <>
              <span className="awel-bar awel-bar-top" />
              <span className="awel-bar awel-bar-bottom" />
              <span className="awel-flare" />
            </>
          )}
        </div>
      )}
      <div className="awel-card">
        <p className="awel-kicker" aria-hidden="true">
          {flavor === "nexus"
            ? "Access granted · Clearance: " + role
            : flavor === "cinematic"
              ? "SCU presents"
              : greeting}
        </p>
        <p className="awel-name" aria-hidden="true">
          {flavor === "nexus"
            ? decrypted
            : animated && (flavor === "classic" || flavor === "cinematic")
              ? letters.map((ch, i) => (
                  <span key={i} className="awel-letter" style={{ "--i": i } as CSSProperties}>
                    {ch === " " ? " " : ch}
                  </span>
                ))
              : name}
        </p>
        <p className="awel-role" aria-hidden="true">
          {flavor === "manga" ? "★ " + role + " ★" : role} · Welcome back to the archive
        </p>
        {flavor === "manga" && animated && (
          <span className="awel-sfx" aria-hidden="true">
            ADMIN ARRIVES!
          </span>
        )}
        <span role="status" className="sr-only">
          {greeting}, {name}. Signed in as {role}.
        </span>
      </div>
      <button type="button" className="awel-skip" onClick={() => doneRef.current()}>
        Skip
      </button>
    </div>
  );
}
