import { useEffect, useRef } from "react";
import { abilityFxRecipe, type FxRecipe } from "@/lib/ability-fx";
import { TARGET_X, choreography, totalDuration, type Fx, type Gender, type PoseName, type Seg } from "@/lib/ability-action";
import { PAINT, glowDot, rgba, type PF } from "@/components/fx-painters";

type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2, D = Math.PI / 180;
const fr = (x: number) => x - Math.floor(x);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const k = clamp(x); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** [lean, lThigh, lShin, rThigh, rShin, lUp, lFore, rUp, rFore] in degrees; 0 = straight down, + = forward. Front limbs are "r". */
type P = number[];
const POSES: Record<PoseName, P> = {
  stand: [0, -6, 4, 6, 4, -8, 10, 8, 14], guard: [10, -22, 28, 26, 22, 40, 100, 55, 95], crouch: [28, -45, 85, 55, 75, -35, 25, -45, 25],
  dash: [55, -75, 45, 65, 50, -80, 10, -95, 15], punch: [22, -35, 12, 45, 22, -20, 110, 92, 0], kick: [-22, -8, 6, 98, 0, -45, 50, 50, 60],
  cast: [12, -25, 10, 30, 16, 82, 8, 92, 0], raise: [-6, -15, 5, 15, 5, 165, 5, 170, 5], slashUp: [10, -30, 15, 40, 20, -30, 40, 170, 0],
  slashDown: [38, -45, 25, 55, 25, -40, 40, 35, 0], knee: [4, -6, 4, 95, 100, -30, 40, 40, 80], stomp: [18, -30, 30, 35, 30, -30, 40, 40, 40],
  leap: [30, -30, 95, 50, 100, 120, 10, 135, 10], flip: [-60, 60, 80, 110, 70, 150, 20, 170, 10],
};
interface State { pose: P; x: number; y: number; seg: Seg; k: number; i: number; segT: number }
function stateAt(segs: Seg[], t: number): State {
  const tot = totalDuration(segs); let tt = ((t % tot) + tot) % tot; let prev = segs[segs.length - 1]!;
  for (let i = 0; i < segs.length; i++) { const sg = segs[i]!; if (tt <= sg.d || i === segs.length - 1) { const k = ease(tt / sg.d); const a = POSES[prev.pose], b = POSES[sg.pose];
      return { pose: a.map((v, j) => lerp(v, b[j]!, k)), x: lerp(prev.x, sg.x, k), y: lerp(prev.y ?? 0, sg.y ?? 0, Math.sin(Math.min(1, tt / sg.d) * Math.PI) * .5 + k * .5), seg: sg, k: clamp(tt / sg.d), i, segT: tt }; }
    tt -= sg.d; prev = sg; }
  return { pose: POSES.stand, x: -.3, y: 0, seg: segs[0]!, k: 0, i: 0, segT: 0 };
}

/** Draws an articulated shadow fighter; returns hand/centre positions in canvas coords. */
function fighter(c: C, S: number, gx: number, gy: number, face: number, p: P, g: Gender, body: string, rim: string, t: number) {
  const f = g === "female", H = S * .4, th = H * .25, sh = H * .24, to = H * .32, ua = H * .17, fa = H * .17, w = (f ? .055 : .07) * H * 1.6;
  const [lean, lT, lS, rT, rS, lU, lF, rU, rF] = p.map(v => v * D) as [number, number, number, number, number, number, number, number, number];
  const leg = (a: number, b: number) => { const kx = Math.sin(a) * th, ky = Math.cos(a) * th; return { kx, ky, fx: kx + Math.sin(a + b * -1 + 0) * 0 + Math.sin(a - b) * sh, fy: ky + Math.cos(a - b) * sh }; };
  const L = leg(lT, lS), R = leg(rT, rS); const drop = Math.max(L.fy, R.fy);
  const hip = { x: gx, y: gy - drop };
  const neck = { x: hip.x + Math.sin(lean) * to * face, y: hip.y - Math.cos(lean) * to };
  const P2 = (o: { x: number; y: number }, a: number, l: number) => ({ x: o.x + Math.sin(a) * l * face, y: o.y + Math.cos(a) * l });
  const arm = (u: number, fo: number) => { const e = P2(neck, u, ua); const hnd = P2(e, u - fo, fa); return { e, h: hnd }; };
  c.save(); c.lineCap = "round"; c.lineJoin = "round"; c.shadowColor = rim; c.shadowBlur = S * .025;
  const limb = (pts: { x: number; y: number }[], wd: number, col: string) => { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke(); };
  const back = "#05040a";
  const la = arm(lU, lF), ra = arm(rU, rF);
  limb([neck, la.e, la.h], w * .8, back);
  limb([hip, { x: hip.x + L.kx * face, y: hip.y + L.ky }, { x: hip.x + L.fx * face, y: hip.y + L.fy }], w, back);
  // torso
  const sw = (f ? .8 : 1.15) * w, hw = (f ? 1.05 : .8) * w; const nx = Math.cos(lean) * face, ny = Math.sin(lean);
  c.fillStyle = body; c.beginPath(); c.moveTo(neck.x - nx * sw, neck.y - ny * sw * face); c.lineTo(neck.x + nx * sw, neck.y + ny * sw * face); c.lineTo(hip.x + nx * hw, hip.y + ny * hw * face); c.lineTo(hip.x - nx * hw, hip.y - ny * hw * face); c.closePath(); c.fill();
  limb([hip, { x: hip.x + R.kx * face, y: hip.y + R.ky }, { x: hip.x + R.fx * face, y: hip.y + R.fy }], w, body);
  const head = { x: neck.x + Math.sin(lean) * H * .1 * face, y: neck.y - Math.cos(lean) * H * .1 };
  if (f) { c.strokeStyle = body; c.lineWidth = w * .45; c.beginPath(); c.moveTo(head.x - face * H * .04, head.y - H * .03); c.quadraticCurveTo(head.x - face * H * .16, head.y + Math.sin(t * 9) * H * .03, head.x - face * H * .22, head.y + H * .05 + Math.sin(t * 7) * H * .04); c.stroke(); }
  c.fillStyle = body; c.beginPath(); c.arc(head.x, head.y, H * .075, 0, TAU); c.fill();
  limb([neck, ra.e, ra.h], w * .8, body);
  c.restore();
  glowDot(c, head.x + face * H * .035, head.y - H * .01, S * .012, rim);
  return { hand: ra.h, centre: { x: (neck.x + hip.x) / 2, y: (neck.y + hip.y) / 2 }, head };
}

function paintAt(c: C, r: FxRecipe, t: number, x: number, gy: number, S: number, scale: number, alpha: number, rnd: (i: number) => number) {
  const painter = PAINT[r.motif]; if (alpha <= 0) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, gy - S * .3 * scale); c.scale(scale, scale);
  const pf: PF = { c, t, s: S, r, v: r.variant, p: r.power, rnd, step: Math.floor(t * 8) };
  if (painter) painter(pf); else { c.globalCompositeOperation = "lighter"; for (let i = 0; i < 3; i++) { const q = fr(t * .8 + i / 3); c.strokeStyle = rgba(r.palette[0], 1 - q); c.lineWidth = 6 * (1 - q); c.beginPath(); c.arc(0, S * .1, S * .4 * q, 0, TAU); c.stroke(); } glowDot(c, 0, S * .1, S * .3, r.palette[0], .8); }
  c.restore(); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
}

function projectile(c: C, r: FxRecipe, x: number, y: number, S: number, t: number, dir: number) {
  const [a, , hi] = r.palette; c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) { const q = i / 14; glowDot(c, x - dir * q * S * .22, y + Math.sin(t * 20 + i) * S * .01 * q, S * (.07 - q * .045), q < .3 ? hi : a, 1 - q); }
  if (r.motif === "wind") { c.strokeStyle = rgba(hi, .9); c.lineWidth = S * .012; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - dir * i * S * .05, y, S * .09, -1.1, 1.1); c.stroke(); } }
  if (r.motif === "lightning") { c.strokeStyle = rgba(hi, .95); c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 8; i++) c.lineTo(x - dir * i * S * .03, y + (Math.sin(t * 40 + i * 3) * S * .025)); c.stroke(); }
  glowDot(c, x, y, S * .05, "#ffffff", .9); c.globalCompositeOperation = "source-over";
}

export function AbilityActionCanvas({ name, gender, speed = 1, playing = true, onPhase }: { name: string; gender: Gender; speed?: number; playing?: boolean; onPhase?: (label: string, i: number, n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null); const phaseRef = useRef(onPhase); phaseRef.current = onPhase;
  const pausedAt = useRef(0); const offset = useRef(0);
  useEffect(() => {
    const cv = ref.current; const c = cv?.getContext("2d"); if (!cv || !c) return;
    const r = abilityFxRecipe(name), segs = choreography(name, gender);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const seed = (i: number) => { const x = Math.sin(i * 12.9898 + r.key.length * 78.233) * 43758.5453; return x - Math.floor(x); };
    let raf = 0, lastLabel = ""; const start = performance.now() - pausedAt.current * 1000 / speed;
    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, Hh = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
      const t = reduce ? 2.2 : playing ? (now - start) / 1000 * speed : pausedAt.current; if (playing && !reduce) pausedAt.current = t;
      const S = Math.min(Hh, W * .7), gy = Hh * .8, X = (fx: number) => W / 2 + fx * W;
      const st = stateAt(segs, t), fxs = st.seg.fx ?? [];
      if (st.seg.label !== lastLabel) { lastLabel = st.seg.label; phaseRef.current?.(st.seg.label, st.i, segs.length); }
      const impact = fxs.includes("impact") ? 1 - st.k : 0;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = c.createLinearGradient(0, 0, 0, Hh); bg.addColorStop(0, "#07070d"); bg.addColorStop(1, "#0d0c16"); c.fillStyle = bg; c.fillRect(0, 0, W, Hh);
      if (impact > .5 && gender === "male") c.translate((seed(Math.floor(t * 30)) - .5) * S * .03 * impact, (seed(Math.floor(t * 30) + 7) - .5) * S * .015 * impact);
      // ground grid
      c.strokeStyle = rgba(r.palette[0], .12); c.lineWidth = 1; for (let i = -10; i <= 10; i++) { c.beginPath(); c.moveTo(W / 2 + i * W * .05, gy); c.lineTo(W / 2 + i * W * .12, Hh); c.stroke(); }
      c.strokeStyle = rgba(r.palette[0], .35); c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke();
      const tx = X(TARGET_X), face = st.x > TARGET_X ? -1 : 1, fxPos = X(st.x), fy = gy - st.y * Hh;
      if (fxs.includes("aura")) paintAt(c, r, t, fxPos, gy, S, .75, .85 * Math.sin(Math.min(1, st.k * 1.2 + .2) * Math.PI) + .15, seed);
      if (fxs.includes("charge")) { paintAt(c, r, t, fxPos, gy, S, .45, st.k * .8, seed); c.globalCompositeOperation = "lighter";
        for (let i = 0; i < 36; i++) { const q = fr(t * 1.6 + seed(i)), ang = seed(i + 40) * TAU; glowDot(c, fxPos + Math.cos(ang) * (1 - q) * S * .4, fy - S * .2 + Math.sin(ang) * (1 - q) * S * .3, S * .012, i % 2 ? r.palette[0] : r.palette[2], q); } c.globalCompositeOperation = "source-over"; }
      // opponent
      const kb = fxs.includes("impact") ? Math.sin(st.k * Math.PI) : 0;
      fighter(c, S, tx + kb * S * .06, gy, -1, [ -kb * 35, -10, 6, 10, 6, -20 - kb * 60, 20, -10 - kb * 70, 25], "male", "#1a1822", "#555068", t);
      // afterimages
      if (fxs.includes("trail")) { c.globalCompositeOperation = "lighter"; const pts: { x: number; y: number }[] = [];
        for (let i = 7; i >= 1; i--) { const s2 = stateAt(segs, t - i * .03); c.globalAlpha = .3 * (1 - i / 8); const hp = fighter(c, S, X(s2.x), gy - s2.y * Hh, s2.x > TARGET_X ? -1 : 1, s2.pose, gender, r.palette[0], r.palette[0], t); pts.push(hp.centre); }
        c.globalAlpha = 1; for (const [wd, col] of [[S * .06, rgba(r.palette[0], .25)], [S * .02, rgba(r.palette[2], .8)]] as const) { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.stroke(); }
        c.globalCompositeOperation = "source-over"; }
      const me = fighter(c, S, fxPos, fy, face, st.pose, gender, "#14111c", r.palette[0], t);
      if (fxs.includes("slash")) { c.globalCompositeOperation = "lighter"; const R = S * .2; c.save(); c.translate(me.centre.x, me.centre.y); c.scale(face, 1);
        const a0 = -1.6 + st.k * .6; c.beginPath(); c.arc(0, 0, R, a0, a0 + 2.6 * ease(st.k * 1.4)); c.arc(R * .12, 0, R * .92, a0 + 2.6 * ease(st.k * 1.4), a0, true); c.closePath(); c.fillStyle = rgba(r.palette[0], .85 * (1 - st.k * .6)); c.fill(); c.restore(); c.globalCompositeOperation = "source-over"; }
      if (fxs.includes("projectile")) projectile(c, r, lerp(me.hand.x, tx, ease(st.k)), lerp(me.hand.y, gy - S * .22, st.k), S, t, Math.sign(tx - me.hand.x) || 1);
      if (fxs.includes("beam")) { c.globalCompositeOperation = "lighter"; const len = (tx - me.hand.x) * ease(st.k * 3), wob = S * (.025 + .01 * Math.sin(t * 30));
        for (const [wd, col] of [[wob * 3, rgba(r.palette[0], .3)], [wob, rgba(r.palette[0], .9)], [wob * .35, "#ffffff"]] as const) { c.fillStyle = col; c.fillRect(me.hand.x, me.hand.y - wd / 2, len, wd); }
        glowDot(c, me.hand.x, me.hand.y, S * .08, r.palette[2]); c.globalCompositeOperation = "source-over"; }
      if (fxs.includes("wave")) { const wx = lerp(fxPos, tx, ease(st.k)); paintAt(c, r, t, wx, gy, S, .45, .9, seed);
        c.globalCompositeOperation = "lighter"; for (let i = 0; i < 8; i++) glowDot(c, lerp(fxPos, wx, i / 8), gy, S * .04, r.palette[0], .6 * (i / 8)); c.globalCompositeOperation = "source-over"; }
      if (fxs.includes("impact")) { paintAt(c, r, t, tx, gy, S, gender === "male" ? .7 : .6, Math.sin(Math.min(1, st.k * 1.3) * Math.PI), seed);
        if (st.k < .25) { c.globalCompositeOperation = "lighter"; glowDot(c, tx, gy - S * .2, S * .5, r.palette[2], (1 - st.k * 4) * .9); c.globalCompositeOperation = "source-over"; }
        c.globalCompositeOperation = "lighter"; for (let i = 0; i < 16; i++) { const q = st.k, ang = seed(i + 90) * TAU; glowDot(c, tx + Math.cos(ang) * q * S * .35, gy - S * .2 + Math.sin(ang) * q * S * .25, S * .015 * (1 - q), r.palette[2], 1 - q); } c.globalCompositeOperation = "source-over"; }
      c.setTransform(1, 0, 0, 1, 0, 0);
      if (playing && !reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw); return () => cancelAnimationFrame(raf);
  }, [name, gender, speed, playing]);
  useEffect(() => { pausedAt.current = 0; offset.current = 0; }, [name, gender]);
  return <canvas ref={ref} role="img" aria-label={`${gender} fighter using ${name}`} className="block h-full w-full" />;
}
