import type { CSSProperties } from "react";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useOptionalThemeContext } from "@/context/ThemeContext";
import { useActiveGenre } from "@/hooks/use-ui-mode";

interface StudioParticleSpec {
  id: number;
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
  blur: string;
  kind: "mote" | "ember" | "spark" | "leaf";
  depth: "far" | "near";
}

const PARTICLES: readonly StudioParticleSpec[] = [
  {
    id: 1,
    left: "7%",
    top: "18%",
    size: 7,
    duration: "13s",
    delay: "0s",
    blur: "2px",
    kind: "mote",
    depth: "far",
  },
  {
    id: 2,
    left: "16%",
    top: "74%",
    size: 5,
    duration: "11s",
    delay: "1.4s",
    blur: "1px",
    kind: "ember",
    depth: "near",
  },
  {
    id: 3,
    left: "26%",
    top: "36%",
    size: 9,
    duration: "15s",
    delay: "0.6s",
    blur: "2.5px",
    kind: "spark",
    depth: "far",
  },
  {
    id: 4,
    left: "34%",
    top: "82%",
    size: 6,
    duration: "10.5s",
    delay: "2.3s",
    blur: "0.5px",
    kind: "ember",
    depth: "near",
  },
  {
    id: 5,
    left: "44%",
    top: "24%",
    size: 11,
    duration: "14s",
    delay: "1.1s",
    blur: "1px",
    kind: "leaf",
    depth: "near",
  },
  {
    id: 6,
    left: "53%",
    top: "64%",
    size: 8,
    duration: "12.5s",
    delay: "3.0s",
    blur: "2px",
    kind: "mote",
    depth: "far",
  },
  {
    id: 7,
    left: "63%",
    top: "15%",
    size: 6,
    duration: "10s",
    delay: "0.9s",
    blur: "0.5px",
    kind: "spark",
    depth: "near",
  },
  {
    id: 8,
    left: "71%",
    top: "78%",
    size: 10,
    duration: "16s",
    delay: "2.0s",
    blur: "3px",
    kind: "mote",
    depth: "far",
  },
  {
    id: 9,
    left: "80%",
    top: "42%",
    size: 5,
    duration: "11.5s",
    delay: "1.7s",
    blur: "1px",
    kind: "ember",
    depth: "near",
  },
  {
    id: 10,
    left: "88%",
    top: "22%",
    size: 12,
    duration: "13.5s",
    delay: "0.4s",
    blur: "1px",
    kind: "leaf",
    depth: "near",
  },
  {
    id: 11,
    left: "93%",
    top: "68%",
    size: 6,
    duration: "12s",
    delay: "2.7s",
    blur: "2px",
    kind: "spark",
    depth: "far",
  },
  {
    id: 12,
    left: "12%",
    top: "48%",
    size: 10,
    duration: "14.5s",
    delay: "3.4s",
    blur: "1.5px",
    kind: "leaf",
    depth: "far",
  },
];

/**
 * Lightweight, GPU-accelerated ambient atmospheric particles (glowing dust motes,
 * floating embers, mana sparks, and wind-swept leaves in Shounen daylight) with
 * radial depth-of-field blur. Never renders in Minimal mode or when FX are paused.
 */
export function AmbientStudioParticles() {
  const { primarySystem, isMinimal, motionActive } = useAppMotion();
  const themeCtx = useOptionalThemeContext();
  const activeGenre = useActiveGenre();

  if (isMinimal || !motionActive) return null;

  const isShounen =
    primarySystem === "manga" &&
    (themeCtx?.mangaSubTheme === "shounen" || activeGenre === "shonen");
  const isNexus = primarySystem === "nexus";

  const isManga = primarySystem === "manga";
  const visibleParticles = isManga ? PARTICLES.filter((p) => p.depth === "near") : PARTICLES;

  return (
    <div
      aria-hidden="true"
      data-testid="ambient-studio-particles"
      data-particle-theme={isShounen ? "shounen-daylight" : isNexus ? "nexus-hud" : primarySystem}
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden select-none"
    >
      {visibleParticles.map((p) => {
        if (isShounen && p.kind === "leaf") {
          return (
            <svg
              key={p.id}
              viewBox="0 0 24 16"
              className="studio-particle studio-leaf-wind absolute"
              style={
                {
                  left: p.left,
                  top: p.top,
                  width: `${p.size * 1.4}px`,
                  height: `${p.size}px`,
                  animationDuration: p.duration,
                  animationDelay: p.delay,
                } as CSSProperties
              }
            >
              <path
                d="M2 10 C8 1, 18 1, 22 6 C17 13, 8 14, 2 10 Z"
                fill={p.id % 2 === 0 ? "#10B981" : "#34D399"}
                stroke="#065F46"
                strokeWidth="1"
              />
            </svg>
          );
        }

        const particleColor = isShounen
          ? p.kind === "ember"
            ? "#E86A33"
            : p.kind === "spark"
              ? "#14B8A6"
              : "#FFFBEB"
          : isNexus
            ? p.kind === "ember"
              ? "#F59E0B"
              : "#38BDF8"
            : p.kind === "ember"
              ? "var(--primary, #f97316)"
              : p.kind === "spark"
                ? "var(--accent, #38bdf8)"
                : "#fde68a";

        return (
          <span
            key={p.id}
            className="studio-particle studio-mote-drift absolute rounded-full"
            style={
              {
                left: p.left,
                top: p.top,
                width: `${Math.round(p.size * 1.6)}px`,
                height: `${Math.round(p.size * 1.6)}px`,
                background:
                  p.kind === "spark"
                    ? `radial-gradient(circle, #ffffff 0%, ${particleColor} 45%, transparent 80%)`
                    : `radial-gradient(circle, ${particleColor} 25%, transparent 75%)`,
                opacity: p.depth === "far" ? 0.52 : 0.76,
                animationDuration: p.duration,
                animationDelay: p.delay,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
