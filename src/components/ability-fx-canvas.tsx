import { useEffect, useRef } from "react";
import type { FxRecipe } from "@/lib/ability-fx";
import { glowDot, guardianAura, rgba, type PF } from "@/components/fx-painters";
import { ALL_PAINT } from "@/components/fx-brush";

type C = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
function seeded(seed: number) {
  return (i: number) => {
    const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
}
function ring(c: C, r: number, col: string, w: number, dash?: number[]) {
  c.beginPath();
  c.setLineDash(dash ?? []);
  c.strokeStyle = col;
  c.lineWidth = w;
  c.arc(0, 0, Math.max(0, r), 0, TAU);
  c.stroke();
  c.setLineDash([]);
}
function dot(c: C, x: number, y: number, r: number, col: string) {
  c.beginPath();
  c.fillStyle = col;
  c.arc(x, y, Math.max(0, r), 0, TAU);
  c.fill();
}
function star(c: C, n: number, r0: number, r1: number, rot: number, col: string) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n;
    const r = i % 2 ? r0 : r1;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fillStyle = col;
  c.fill();
}

function aura(c: C, s: number, t: number, r: FxRecipe, boosted = false) {
  const p = r.power + (boosted ? 2 : 0);
  const [a, b, hi] = r.palette;

  c.save();
  c.globalCompositeOperation = "lighter";
  glowDot(c, 0, 0, s * (boosted ? 0.52 : 0.44), a, boosted ? 0.28 : 0.14);

  // Level 1+: Soft breathing glow ring and celestial motes
  const pulse = Math.sin(t * 3.2) * 0.03;
  ring(c, s * (0.42 + pulse), rgba(a, boosted ? 0.65 : 0.3), boosted ? 2 : 1, [s * 0.02, s * 0.03]);

  // Floating ambient motes for every power level
  for (let m = 0; m < 4 + p; m++) {
    const k = (t * 0.35 + ((m * 47) % 100) / 100) % 1;
    const ang = m * 1.618 * TAU + t * 0.15;
    const dist = s * (0.28 + k * 0.18);
    dot(c, Math.cos(ang) * dist, Math.sin(ang) * dist, s * (0.008 + (1 - k) * 0.012), hi);
  }

  // Level 4+: Inner resonant harmonic ring with counter-rotation
  if (p >= 4) {
    c.save();
    c.rotate(t * 0.35);
    ring(c, s * 0.36, rgba(b, boosted ? 0.8 : 0.42), boosted ? 2.5 : 1.2, [s * 0.04, s * 0.03]);
    c.restore();
  }

  // Level 6+: Rotating outer runic celestial compass ring with tick marks
  if (p >= 6) {
    c.save();
    c.rotate(-t * 0.25);
    ring(c, s * 0.46, rgba(a, boosted ? 0.95 : 0.65), p >= 8 || boosted ? 3 : 1.8, [
      s * 0.025,
      s * 0.04,
    ]);
    const ticks = p >= 8 ? 16 : 8;
    for (let i = 0; i < ticks; i++) {
      c.rotate(TAU / ticks);
      c.fillStyle = i % 2 === 0 ? hi : a;
      c.fillRect(s * 0.45, -1, s * 0.035, 2);
    }
    c.restore();
  }

  // Level 8+ (Apex / Mythic / Overcharged): Coronal bursts and geometric diamond flares
  if (p >= 8) {
    c.save();
    c.rotate(t * 0.45);
    for (let i = 0; i < 8; i++) {
      c.rotate(TAU / 8);
      c.fillStyle = hi;
      c.fillRect(s * 0.44, -1.5, s * 0.05, 3);
      star(c, 4, s * 0.01, s * 0.03, t * 2 + i, hi);
    }
    c.restore();
  }
  c.restore();
}

/** Cel-style frame-stepped ability FX renderer ("on twos": 12 drawn frames per second). */
export function AbilityFxCanvas({
  recipe,
  className = "",
  playing = true,
  fps = 24,
  label,
  boosted = false,
}: {
  recipe: FxRecipe;
  className?: string;
  playing?: boolean;
  fps?: number;
  label?: string;
  boosted?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rnd = seeded(recipe.variant + recipe.key.length * 31);
    let raf = 0;
    let last = -1;
    const start = performance.now();
    let visible = true;
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([e]) => {
            const was = visible;
            visible = !!e?.isIntersecting;
            if (visible && !was && playing && !reduce) raf = requestAnimationFrame(draw);
          })
        : null;
    io?.observe(cv);
    const draw = (now: number) => {
      if (!visible) return; // paused off-screen; resumed by the observer
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth,
        h = cv.clientHeight;
      if (w === 0 || h === 0) {
        if (playing && !reduce) raf = requestAnimationFrame(draw);
        return;
      }
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      const frame = Math.floor(((now - start) / 1000) * (boosted ? fps * 1.25 : fps));
      if (frame !== last || !playing || reduce) {
        last = frame;
        const t =
          ((reduce || !playing ? (2.9 * recipe.tempo) / 1.6 : frame / fps) / recipe.tempo) *
          (boosted ? 2.2 : 1.6);
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        c.fillStyle = "#07070d";
        c.fillRect(0, 0, w, h);
        const s = Math.min(w, h);
        c.save();
        c.translate(w / 2, h / 2);
        const bg = c.createRadialGradient(0, 0, 0, 0, 0, s * (boosted ? 0.75 : 0.55));
        bg.addColorStop(0, rgba(recipe.palette[1], boosted ? 0.6 : 0.4));
        bg.addColorStop(1, "transparent");
        c.fillStyle = bg;
        c.fillRect(-w, -h, w * 2, h * 2);
        const painter = ALL_PAINT[recipe.motif];
        const effectivePower = Math.min(8, recipe.power + (boosted ? 2 : 0));
        const pf: PF = {
          c,
          t,
          p: effectivePower,
          s,
          r: recipe,
          rnd,
          v: recipe.variant,
          step: Math.floor(t * (boosted ? 12 : 8)),
        };
        const guardian = recipe.key.endsWith("_guardian");
        if (guardian) guardianAura(pf, true);
        if (painter) {
          painter(pf);
          c.globalCompositeOperation = "source-over";
          c.globalAlpha = 1;
        }
        aura(c, s, t, recipe, boosted);
        if (guardian) {
          guardianAura(pf, false);
        }
        c.globalCompositeOperation = "source-over";
        c.restore();
        c.globalAlpha = 1;
      }
      if (playing && !reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [recipe, playing, fps, boosted]);
  return (
    <canvas
      ref={ref}
      data-motif={recipe.motif}
      data-variant={recipe.variant}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label={label ?? `${recipe.key} animation`}
      className={`absolute inset-0 block h-full w-full ${className}`}
    />
  );
}
