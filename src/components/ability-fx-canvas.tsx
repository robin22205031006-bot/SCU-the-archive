import { useEffect, useMemo, useRef } from "react";
import { abilityFxRecipe, type FxRecipe } from "@/lib/ability-fx";
import { parseAbilityRank, type AbilityEmblemRank } from "@/lib/ability-rank";
import { glowDot, guardianAura, rgba, type PF } from "@/components/fx-painters";
import { ALL_PAINT } from "@/components/fx-brush";
import { resolvePerformanceFxCaps, useOptionalAbilityContext } from "@/context/AbilityContext";

type C = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const IMPACT_ANIM_MS = 1250;

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

function powerToRank(power: number): AbilityEmblemRank {
  if (power <= 2) return 1;
  if (power <= 4) return 2;
  if (power <= 5) return 3;
  if (power <= 6) return 4;
  return 5;
}

function aura(
  c: C,
  s: number,
  t: number,
  r: FxRecipe,
  boosted = false,
  rank: AbilityEmblemRank = 3,
  complexityRank: AbilityEmblemRank = rank,
) {
  const effectiveRank = Math.min(5, rank + (boosted ? 1 : 0)) as AbilityEmblemRank;
  const budgetRank = Math.min(complexityRank, effectiveRank) as AbilityEmblemRank;
  const p = Math.min(8, Math.round(r.power + (budgetRank - 3) * 0.75 + (boosted ? 2 : 0)));
  const [a, b, hi] = r.palette;

  c.save();
  c.globalCompositeOperation = "lighter";
  glowDot(
    c,
    0,
    0,
    s * (0.32 + effectiveRank * 0.04 + (boosted ? 0.06 : 0)),
    a,
    boosted ? 0.28 : 0.07 + effectiveRank * 0.03,
  );

  // Rank 1+: Minimal breathing ring and sparse motes (restrained at Rank 1)
  const pulse = Math.sin(t * 3.2) * (0.015 + effectiveRank * 0.005);
  ring(
    c,
    s * (0.36 + effectiveRank * 0.015 + pulse),
    rgba(a, boosted ? 0.65 : 0.16 + effectiveRank * 0.07),
    boosted ? 2 : 0.8 + effectiveRank * 0.22,
    [s * 0.02, s * 0.035],
  );

  const moteCount =
    budgetRank === 1
      ? 3
      : Math.min(budgetRank >= 4 ? 14 : 9, 3 + budgetRank * 2 + Math.max(0, p - 4));
  for (let m = 0; m < moteCount; m++) {
    const k = (t * (0.28 + budgetRank * 0.04) + ((m * 47) % 100) / 100) % 1;
    const ang = m * 1.618 * TAU + t * 0.15;
    const dist = s * (0.24 + k * (0.14 + effectiveRank * 0.02));
    dot(
      c,
      Math.cos(ang) * dist,
      Math.sin(ang) * dist,
      s * (0.005 + (1 - k) * (0.006 + effectiveRank * 0.002)),
      hi,
    );
  }

  // Rank 2+: Inner resonant harmonic ring
  if (effectiveRank >= 2 || p >= 4) {
    c.save();
    c.rotate(t * (0.25 + budgetRank * 0.06));
    ring(
      c,
      s * (0.31 + effectiveRank * 0.012),
      rgba(b, boosted ? 0.8 : 0.24 + effectiveRank * 0.08),
      boosted ? 2.4 : 0.9 + effectiveRank * 0.2,
      [s * 0.04, s * 0.03],
    );
    c.restore();
  }

  // Rank 3+: Rotating outer runic celestial compass ring with capped ticks in performanceMode
  if (effectiveRank >= 3 || p >= 6) {
    c.save();
    c.rotate(-t * 0.25);
    ring(
      c,
      s * 0.45,
      rgba(a, boosted ? 0.95 : 0.35 + effectiveRank * 0.1),
      effectiveRank >= 4 || boosted ? 2.4 : 1.4,
      [s * 0.025, s * 0.04],
    );
    const ticks =
      budgetRank < effectiveRank ? 8 : effectiveRank >= 5 ? 16 : effectiveRank >= 4 ? 12 : 8;
    for (let i = 0; i < ticks; i++) {
      c.rotate(TAU / ticks);
      c.fillStyle = i % 2 === 0 ? hi : a;
      c.fillRect(s * 0.44, -1, s * (0.02 + effectiveRank * 0.004), 2);
    }
    c.restore();
  }

  // Rank 4+: Cardinal resonance nodes; Rank 5: Apex coronal starbursts (preserving Rank 4-5 milestone look)
  if (effectiveRank >= 4 || p >= 8) {
    c.save();
    c.rotate(t * 0.45);
    const flares = budgetRank < effectiveRank ? 4 : effectiveRank >= 5 ? 8 : 4;
    for (let i = 0; i < flares; i++) {
      c.rotate(TAU / flares);
      c.fillStyle = hi;
      c.fillRect(s * 0.44, -1.5, s * (effectiveRank >= 5 ? 0.055 : 0.035), 2.5);
      if (effectiveRank >= 5 && (budgetRank >= 5 || i % 2 === 0)) {
        c.save();
        c.translate(s * 0.47, 0);
        star(c, 4, s * 0.008, s * 0.026, t * 2 + i, hi);
        c.restore();
      }
    }
    c.restore();
  }
  c.restore();
}

/** High-tier AbilityImpact burst: shockwaves, anime speed lines, central starburst, and shard debris. */
function drawAbilityImpact(
  c: C,
  s: number,
  progress: number,
  palette: [string, string, string],
  rank: AbilityEmblemRank,
  complexityRank: AbilityEmblemRank = rank,
) {
  const [a, b, hi] = palette;
  const k = Math.max(0, Math.min(1, progress));
  const env = Math.sin(k * Math.PI);
  const flash = Math.max(0, 1 - k * 3.2);

  c.save();
  c.globalCompositeOperation = "lighter";

  // Initial bright core flash
  if (flash > 0.01) {
    glowDot(c, 0, 0, s * (0.35 + flash * 0.35), hi, flash * 0.65);
  }

  // Dual expanding shockwave rings
  const r1 = s * (0.08 + k * (0.48 + rank * 0.02));
  ring(c, r1, rgba(hi, env * 0.9), Math.max(1.5, (1 - k) * (4 + rank)));
  const r2 = s * (0.04 + Math.max(0, k - 0.12) * 0.46);
  if (r2 > 2) {
    ring(c, r2, rgba(a, env * 0.75), Math.max(1, (1 - k) * 3), [s * 0.03, s * 0.02]);
  }

  // Anime radial speed lines converging / bursting from the impact center (capped cleanly via complexityRank)
  const rays = 12 + complexityRank * 4;
  for (let i = 0; i < rays; i++) {
    const ang = (i / rays) * TAU + (i % 2 ? 0.08 : -0.04);
    const inner = s * (0.14 + k * 0.18 + (i % 3) * 0.03);
    const outer = s * (0.44 + (i % 4) * 0.035);
    c.strokeStyle = rgba(i % 2 === 0 ? hi : b, env * 0.75);
    c.lineWidth = i % 3 === 0 ? 2.4 : 1.2;
    c.beginPath();
    c.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner);
    c.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer);
    c.stroke();
  }

  // Central 4-point starburst + diamond spark shards
  const starScale = (1 - k * 0.45) * (0.11 + rank * 0.018);
  star(c, 4, s * starScale * 0.28, s * starScale, k * 0.9, hi);
  for (let i = 0; i < 6 + complexityRank * 2; i++) {
    const ang = i * 2.39996 + k * 1.4;
    const dist = s * (0.12 + k * (0.34 + (i % 3) * 0.04));
    const sz = s * (0.012 * (1 - k * 0.6));
    c.save();
    c.translate(Math.cos(ang) * dist, Math.sin(ang) * dist);
    c.rotate(ang);
    c.fillStyle = rgba(i % 2 === 0 ? hi : a, env);
    c.fillRect(-sz * 1.5, -sz * 0.4, sz * 3, sz * 0.8);
    c.restore();
  }

  c.restore();
}

/** Cel-style frame-stepped ability FX renderer ("on twos": 12 drawn frames per second). */
export function AbilityFxCanvas({
  recipe,
  abilityKey,
  className = "",
  playing = true,
  fps,
  label,
  boosted,
  rank,
  impactActive,
  performanceMode,
}: {
  recipe?: FxRecipe | undefined;
  abilityKey?: string | undefined;
  className?: string;
  playing?: boolean;
  fps?: number | undefined;
  label?: string;
  boosted?: boolean | undefined;
  rank?: number | undefined;
  impactActive?: boolean | undefined;
  performanceMode?: boolean | undefined;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ctx = useOptionalAbilityContext();

  const targetKey = recipe?.key ?? abilityKey ?? ctx?.abilityKey ?? "red_lightning";
  const ctxTrackedRank = ctx?.getActiveAbilityRank(targetKey);
  const resolvedRank: AbilityEmblemRank =
    parseAbilityRank(rank) ?? ctxTrackedRank ?? powerToRank(recipe?.power ?? 4);

  const effectivePerformanceMode = performanceMode ?? ctx?.performanceMode ?? false;
  const fxCaps = useMemo(
    () => resolvePerformanceFxCaps(resolvedRank, effectivePerformanceMode),
    [resolvedRank, effectivePerformanceMode],
  );

  const resolvedRecipe = useMemo(() => {
    const dynamic = abilityFxRecipe(targetKey, resolvedRank);
    if (!recipe) return dynamic;
    if (recipe.key === targetKey && recipe.power !== dynamic.power) {
      return { ...dynamic, power: recipe.power };
    }
    return dynamic;
  }, [targetKey, resolvedRank, recipe]);

  const effectiveBoosted = (boosted ?? ctx?.boosted ?? false) && !effectivePerformanceMode;
  const requestedFps = fps ?? ctx?.fps ?? 24;
  const effectiveFps = Math.min(requestedFps, fxCaps.maxFps);
  const selectedEntityId = ctx?.selectedEntityId ?? null;

  const isImpacting = Boolean(
    impactActive ||
    (ctx?.abilityImpact?.active && ctx.abilityImpact.abilityKey === resolvedRecipe.key),
  );
  const impactId = ctx?.abilityImpact?.id ?? 0;

  const impactStartRef = useRef<number | null>(null);
  useEffect(() => {
    if (isImpacting) {
      impactStartRef.current = performance.now();
    } else {
      impactStartRef.current = null;
    }
  }, [isImpacting, impactId]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const rnd = seeded(resolvedRecipe.variant + resolvedRecipe.key.length * 31);
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
      const dpr = Math.min(fxCaps.maxDpr, window.devicePixelRatio || 1);
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
      const frame = Math.floor(
        ((now - start) / 1000) * (effectiveBoosted ? effectiveFps * 1.25 : effectiveFps),
      );
      if (frame !== last || !playing || reduce || isImpacting) {
        last = frame;
        const t =
          ((reduce || !playing ? (2.9 * resolvedRecipe.tempo) / 1.6 : frame / effectiveFps) /
            resolvedRecipe.tempo) *
          (effectiveBoosted ? 2.2 : 1.6);
        let impactProgress = 0;
        if (isImpacting) {
          if (reduce || !playing) {
            impactProgress = 0.42;
          } else {
            const elapsed = Math.max(0, now - (impactStartRef.current ?? now));
            impactProgress = Math.min(1, elapsed / IMPACT_ANIM_MS);
          }
        }
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        c.clearRect(0, 0, w, h);
        c.fillStyle = "#07070d";
        c.fillRect(0, 0, w, h);
        const s = Math.min(w, h);
        c.save();
        c.translate(w / 2, h / 2);
        const bg = c.createRadialGradient(
          0,
          0,
          0,
          0,
          0,
          s * (0.42 + resolvedRank * 0.04 + (effectiveBoosted ? 0.14 : 0)),
        );
        bg.addColorStop(
          0,
          rgba(resolvedRecipe.palette[1], effectiveBoosted ? 0.62 : 0.22 + resolvedRank * 0.05),
        );
        bg.addColorStop(1, "transparent");
        c.fillStyle = bg;
        c.fillRect(-w, -h, w * 2, h * 2);
        const painter = ALL_PAINT[resolvedRecipe.motif];
        const effectivePower = Math.min(
          fxCaps.maxPower,
          resolvedRecipe.power + (effectiveBoosted ? 2 : 0),
        );
        const pf: PF = {
          c,
          t,
          p: effectivePower,
          s,
          r: resolvedRecipe,
          rnd,
          v: resolvedRecipe.variant,
          step: Math.floor(t * (effectivePerformanceMode ? 6 : effectiveBoosted ? 12 : 8)),
          rank: resolvedRank,
          complexityRank: fxCaps.complexityRank,
          performanceMode: effectivePerformanceMode,
          impact: impactProgress,
        };
        const guardian = resolvedRecipe.key.endsWith("_guardian");
        if (guardian) guardianAura(pf, true);
        if (painter) {
          painter(pf);
          c.globalCompositeOperation = "source-over";
          c.globalAlpha = 1;
        }
        aura(c, s, t, resolvedRecipe, effectiveBoosted, resolvedRank, fxCaps.complexityRank);
        if (guardian) {
          guardianAura(pf, false);
        }
        if (isImpacting && impactProgress > 0 && impactProgress < 1) {
          drawAbilityImpact(
            c,
            s,
            impactProgress,
            resolvedRecipe.palette,
            resolvedRank,
            fxCaps.complexityRank,
          );
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
  }, [
    resolvedRecipe,
    playing,
    effectiveFps,
    effectiveBoosted,
    resolvedRank,
    fxCaps,
    effectivePerformanceMode,
    isImpacting,
    selectedEntityId,
  ]);

  return (
    <canvas
      ref={ref}
      data-motif={resolvedRecipe.motif}
      data-variant={resolvedRecipe.variant}
      data-ability-key={resolvedRecipe.key}
      data-ability-rank={resolvedRank}
      data-fx-complexity-rank={fxCaps.complexityRank}
      data-performance-mode={effectivePerformanceMode ? "on" : "off"}
      data-ability-impact={isImpacting ? "active" : "idle"}
      data-ability-character={selectedEntityId ?? undefined}
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label={label ?? `${resolvedRecipe.key} animation`}
      className={`absolute inset-0 block h-full w-full ${className}`}
    />
  );
}
