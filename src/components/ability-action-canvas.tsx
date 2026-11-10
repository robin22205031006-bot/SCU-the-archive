import { useEffect, useRef } from "react";
import { abilityFxRecipe, type FxRecipe } from "@/lib/ability-fx";
import { TARGET_X, actionStyle, choreography, totalDuration, weaponFor, type Cam, type FightStyleId, type Gender, type Seg } from "@/lib/ability-action";
import { glowDot, quadruped, rgba, type PF, type Species } from "@/components/fx-painters";
import { ALL_PAINT, arcCycle, groundBurst, inkOf, paintedArc, streak } from "@/components/fx-brush";
import { POSES, drawFighter, type P } from "@/components/fighter-rig";

type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const fr = (x: number) => x - Math.floor(x);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
/** Snappy anime timing: fast attack into the pose, then settle. */
const ease = (x: number) => { const k = clamp(x); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

interface State { pose: P; x: number; y: number; ly: number; seg: Seg; k: number; i: number }
function stateAt(segs: Seg[], t: number): State {
  const tot = totalDuration(segs); let tt = ((t % tot) + tot) % tot; let prev = segs[segs.length - 1]!;
  for (let i = 0; i < segs.length; i++) { const sg = segs[i]!, span = sg.d + (sg.hold ?? 0);
    if (tt <= span || i === segs.length - 1) { const raw = Math.min(1, tt / sg.d), k = ease(raw), a = POSES[prev.pose], b = POSES[sg.pose];
      return { pose: a.map((v, j) => lerp(v, b[j]!, k)), x: lerp(prev.x, sg.x, k), y: lerp(prev.y ?? 0, sg.y ?? 0, Math.sin(raw * Math.PI) * .5 + k * .5), ly: lerp(prev.launch ?? 0, sg.launch ?? 0, k), seg: sg, k: raw, i }; }
    tt -= span; prev = sg; }
  return { pose: POSES.stand, x: -.3, y: 0, ly: 0, seg: segs[0]!, k: 0, i: 0 };
}

function paintAt(c: C, r: FxRecipe, t: number, x: number, gy: number, S: number, scale: number, alpha: number, rnd: (i: number) => number) {
  const painter = ALL_PAINT[r.motif]; if (alpha <= 0 || !painter) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, gy - S * .3 * scale); c.scale(scale, scale);
  painter({ c, t, s: S, r, v: r.variant, p: r.power, rnd, step: Math.floor(t * 8) } as PF);
  c.restore(); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
}

/** Camera framing per beat: zoom, vertical bias and dutch tilt (radians). */
const CAM: Record<Cam, { z: number; dy: number; tilt: number }> = {
  wide: { z: 1, dy: 0, tilt: 0 }, close: { z: 1.45, dy: -.08, tilt: 0 }, punch: { z: 1.7, dy: -.1, tilt: .05 },
  track: { z: 1.25, dy: -.04, tilt: -.03 }, low: { z: 1.35, dy: .04, tilt: .07 }, air: { z: 1.3, dy: -.22, tilt: -.06 },
};
function camOf(sg: Seg): Cam { if (sg.cam) return sg.cam; const f = sg.fx ?? []; return f.includes("impact") ? "punch" : f.includes("trail") ? "track" : f.includes("charge") ? "close" : f.includes("beam") || f.includes("wave") || f.includes("aura") ? "wide" : "wide"; }

const SPECIES: Record<string, Species> = { tiger: "tiger", lion: "lion", wolf: "wolf", hyena: "hyena", dragon: "lion", snakes: "wolf" };

export function AbilityActionCanvas({ name, gender, style = "auto", speed = 1, playing = true, onPhase, caption }: { name: string; gender: Gender; style?: FightStyleId; speed?: number; playing?: boolean; onPhase?: (label: string, i: number, n: number) => void; caption?: string | undefined }) {
  const ref = useRef<HTMLCanvasElement>(null); const phaseRef = useRef(onPhase); phaseRef.current = onPhase;
  const pausedAt = useRef(0);
  useEffect(() => {
    const cv = ref.current; const c = cv?.getContext("2d"); if (!cv || !c) return;
    const r = abilityFxRecipe(name), segs = choreography(name, gender, style), ink = inkOf(r.palette), weapon = weaponFor(name, gender), aStyle = actionStyle(name);
    const species = SPECIES[r.key] ?? (aStyle === "beastPounce" ? "tiger" : null);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const seed = (i: number) => { const x = Math.sin(i * 12.9898 + r.key.length * 78.233) * 43758.5453; return x - Math.floor(x); };
    let raf = 0, lastLabel = ""; const cam = { z: 1, x: 0, y: 0, tilt: 0 }; const start = performance.now() - pausedAt.current * 1000 / speed;
    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
      const t = reduce ? 2.2 : playing ? (now - start) / 1000 * speed : pausedAt.current; if (playing && !reduce) pausedAt.current = t;
      const S = Math.min(Hh, W * .7), gy = Hh * .8, X = (fx: number) => W / 2 + fx * W;
      const st0 = stateAt(segs, t); const stopped = (st0.seg.fx ?? []).includes("impact") && st0.k * st0.seg.d < .07;
      const st = stopped ? { ...st0, k: Math.min(st0.k, .02) } : st0, fxs = st.seg.fx ?? [], prevSt = stateAt(segs, t - .04), vel = (st.x - prevSt.x) * W / .04;
      if (st.seg.label !== lastLabel) { lastLabel = st.seg.label; phaseRef.current?.(st.seg.label, st.i, segs.length); }
      const impact = fxs.includes("impact") ? 1 - st.k : 0;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = c.createLinearGradient(0, 0, 0, Hh); bg.addColorStop(0, "#1b1c22"); bg.addColorStop(1, "#2a2a31"); c.fillStyle = bg; c.fillRect(0, 0, W, Hh);
      const vig = c.createRadialGradient(W / 2, gy, 0, W / 2, gy, W * .7); vig.addColorStop(0, rgba(r.palette[0], .08)); vig.addColorStop(1, "rgba(0,0,0,.45)"); c.fillStyle = vig; c.fillRect(0, 0, W, Hh);
      // speed lines behind the action while dashing
      if (fxs.includes("trail") || (fxs.includes("impact") && st.k < .25)) { c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = rgba(r.palette[0], .18); c.lineWidth = 1.5;
        const cxl = X(st.x), cyl = gy - S * .25; for (let i = 0; i < 26; i++) { const a = seed(i + Math.floor(t * 20)) * TAU, r0 = S * (.35 + seed(i + 3) * .2); c.beginPath(); c.moveTo(cxl + Math.cos(a) * r0, cyl + Math.sin(a) * r0); c.lineTo(cxl + Math.cos(a) * W, cyl + Math.sin(a) * W); c.stroke(); } c.restore(); }
      // cinematic camera: ease towards the beat's framing, centred between fighter and target
      const cf = CAM[camOf(st.seg)], ease2 = 1 - Math.exp(-(reduce ? 99 : 9) * .016);
      const focusX = camOf(st.seg) === "wide" ? (X(st.x) + X(TARGET_X)) / 2 : lerp(X(st.x), X(TARGET_X), camOf(st.seg) === "punch" ? .6 : .35);
      const focusY = gy - S * .25 - (st.y + st.ly) * Hh * .5 + cf.dy * Hh;
      cam.z += (cf.z * (stopped ? 1.08 : 1) - cam.z) * ease2; cam.x += (focusX - cam.x) * ease2; cam.y += (focusY - cam.y) * ease2; cam.tilt += (cf.tilt - cam.tilt) * ease2;
      if (!cam.x) { cam.x = focusX; cam.y = focusY; }
      c.translate(W / 2, Hh / 2); c.rotate(cam.tilt); c.scale(cam.z, cam.z); c.translate(-Math.max(W / 2 / cam.z, Math.min(W - W / 2 / cam.z, cam.x)), -Math.min(Hh - Hh / 2 / cam.z + Hh * .05, cam.y));
      if (impact > .5) c.translate((seed(Math.floor(t * 30)) - .5) * S * (gender === "male" ? .03 : .015) * impact, (seed(Math.floor(t * 30) + 7) - .5) * S * .012 * impact);
      c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(-W, gy, W * 3, Hh); c.strokeStyle = "rgba(255,255,255,.06)"; c.lineWidth = 1; for (let i = -12; i <= 12; i++) { c.beginPath(); c.moveTo(W / 2 + i * W * .06, gy); c.lineTo(W / 2 + i * W * .2, Hh * 1.4); c.stroke(); }
      const tx = X(TARGET_X), face = st.x > TARGET_X ? -1 : 1, fxPos = X(st.x), fy = gy - st.y * Hh;
      // ground shadow
      c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(fxPos, gy, S * .08 * (1 - st.y), S * .015, 0, 0, TAU); c.fill();
      if (fxs.includes("aura")) paintAt(c, r, t, fxPos, gy, S, .75, .85 * Math.sin(Math.min(1, st.k * 1.2 + .2) * Math.PI) + .15, seed);
      if (fxs.includes("charge")) { paintAt(c, r, t, fxPos, gy, S, .4, st.k * .7, seed); c.globalCompositeOperation = "lighter";
        for (let i = 0; i < 30; i++) { const q = fr(t * 1.6 + seed(i)), ang = seed(i + 40) * TAU; glowDot(c, fxPos + Math.cos(ang) * (1 - q) * S * .35, fy - S * .2 + Math.sin(ang) * (1 - q) * S * .28, S * .011, i % 2 ? r.palette[0] : r.palette[2], q); } c.globalCompositeOperation = "source-over"; }
      // opponent (armoured, recoils on impact)
      const kb = fxs.includes("impact") ? Math.sin(st.k * Math.PI) : 0;
      c.fillStyle = "rgba(0,0,0,.3)"; c.beginPath(); c.ellipse(tx, gy, S * .08 * (1 - st.ly), S * .014, 0, 0, TAU); c.fill();
      drawFighter(c, S, tx + kb * S * .06, gy - st.ly * Hh, -1, [-kb * 35, -14, 8, 16, 10, -20 - kb * 60, 20, -10 - kb * 70, 25], { body: "#3a3943", back: "#2b2a33", rim: "#8a8798", gender: "male", weapon: "none" }, t, kb * S);
      // afterimages + speed streak
      if (fxs.includes("trail")) { const pts: { x: number; y: number }[] = [];
        for (let i = 6; i >= 1; i--) { const s2 = stateAt(segs, t - i * .035); c.globalAlpha = .22 * (1 - i / 7); const hp = drawFighter(c, S, X(s2.x), gy - s2.y * Hh, s2.x > TARGET_X ? -1 : 1, s2.pose, { body: r.palette[0], back: r.palette[0], rim: r.palette[0], gender, weapon }, t); pts.push(hp.centre); }
        c.globalAlpha = 1; const a = pts[0], b = pts[pts.length - 1]; if (a && b && Math.abs(b.x - a.x) > 4) streak(c, b.x, b.y, Math.abs(b.x - a.x) + S * .1, S * .05, Math.sign(b.x - a.x), ink, t); }
      const isBeast = species && st.i >= segs.findIndex(s => s.label === "Pounce");
      let me: { hand: { x: number; y: number }; tip: { x: number; y: number }; centre: { x: number; y: number } };
      if (isBeast && species) { c.shadowColor = r.palette[0]; c.shadowBlur = 12; c.save(); c.translate(fxPos, fy); c.scale(face, 1); quadruped(c, species, 0, 0, S * .32, t * 9, fxs.includes("impact") ? 1 : 0, "#141219", r.palette[0], r.palette[2], r.palette[0]); c.restore(); c.shadowBlur = 0;
        me = { hand: { x: fxPos + face * S * .15, y: fy - S * .12 }, tip: { x: fxPos + face * S * .18, y: fy - S * .12 }, centre: { x: fxPos, y: fy - S * .1 } }; }
      else { c.save(); c.shadowColor = r.palette[0]; c.shadowBlur = 0; c.restore(); me = drawFighter(c, S, fxPos, fy, face, st.pose, { body: "#4a4955", back: "#33323c", rim: r.palette[0], gender, weapon, heavy: gender === "male" }, t, vel); }
      if (fxs.includes("slash")) { const R = S * (weapon === "spear" ? .26 : .22); c.save(); c.translate(me.centre.x, me.centre.y); c.scale(face, 1);
        paintedArc(c, 0, 0, R, -2.2 + (st.i % 2) * .5, st.i % 2 ? -2.9 : 2.9, S * .07, ink, ease(st.k * 1.6), clamp((st.k - .55) * 2.2), st.i + 1); c.restore(); }
      if (fxs.includes("projectile")) { const k = ease(st.k), px = lerp(me.hand.x, tx, k), py = lerp(me.hand.y, gy - S * .22, k), dir = Math.sign(tx - me.hand.x) || 1;
        if (r.motif === "wind" || r.motif === "blade") { c.save(); c.translate(px, py); c.scale(dir, 1); paintedArc(c, -S * .08, 0, S * .1, -1.3, 2.6, S * .04, ink, 1, 0); c.restore(); }
        else streak(c, px, py, S * .25, S * .045, dir, ink, t); glowDot(c, px, py, S * .06, r.palette[2], .9); }
      if (fxs.includes("beam")) { const len = (tx - me.hand.x) * ease(st.k * 3); streak(c, me.hand.x + len, me.hand.y, Math.abs(len), S * (.035 + .01 * Math.sin(t * 30)), Math.sign(len) || 1, ink, t); glowDot(c, me.hand.x, me.hand.y, S * .08, r.palette[2]); }
      if (fxs.includes("wave")) { const wx = lerp(fxPos, tx, ease(st.k)); groundBurst(c, wx, gy, S * .7, fr(st.k * 3), ink); paintAt(c, r, t, wx, gy, S, .35, .7, seed); }
      if (fxs.includes("impact")) { paintAt(c, r, t, tx, gy, S, gender === "male" ? .6 : .5, Math.sin(Math.min(1, st.k * 1.3) * Math.PI), seed); groundBurst(c, tx, gy, S * (gender === "male" ? 1 : .75), st.k, ink);
        c.save(); c.translate(tx, gy - S * .2); arcCycle(c, st.k, 0, 0, S * .16, -2.4, 4.4, S * .05, ink, 11); c.restore();
        if (st.k < .2) { c.globalCompositeOperation = "lighter"; glowDot(c, tx, gy - S * .2, S * .45, r.palette[2], (1 - st.k * 5) * .9); c.globalCompositeOperation = "source-over"; } }
      // impact frame: one-frame inverted flash, then letterbox bars
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stopped && !reduce) { c.globalCompositeOperation = "difference"; c.fillStyle = "rgba(255,255,255,.85)"; c.fillRect(0, 0, W, Hh); c.globalCompositeOperation = "source-over"; }
      const bar = Hh * .06 * (cam.z - 1) / .7; if (bar > .5) { c.fillStyle = "#000"; c.fillRect(0, 0, W, bar); c.fillRect(0, Hh - bar, W, bar); }
      if (caption) { c.font = `600 ${Math.max(11, S * .03)}px system-ui`; c.fillStyle = "rgba(255,255,255,.75)"; c.textAlign = "right"; c.fillText(caption, W - 14, Hh - 14); c.textAlign = "left"; }
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (playing && !reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [name, gender, style, speed, playing, caption]);
  useEffect(() => { pausedAt.current = 0; }, [name, gender, style]);
  return <canvas ref={ref} role="img" aria-label={`${gender} fighter using ${name}`} className="block h-full w-full" />;
}
