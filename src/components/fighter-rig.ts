/** Filled shadow-fighter silhouettes in the style of the fire-sword reference sheets. Browser-only (canvas). */
import type { Gender, PoseName, Weapon } from "@/lib/ability-action";

type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2, D = Math.PI / 180;
/** [lean, lThigh, lShin, rThigh, rShin, lUp, lFore, rUp, rFore] in degrees; 0 = straight down, + = forward. Front limbs are "r". */
export type P = number[];
export const POSES: Record<PoseName, P> = {
  stand: [0, -6, 4, 6, 4, -8, 10, 8, 14], guard: [10, -22, 28, 26, 22, 40, 100, 55, 95], crouch: [28, -45, 85, 55, 75, -35, 25, -45, 25],
  dash: [55, -75, 45, 65, 50, -80, 10, -95, 15], punch: [22, -35, 12, 45, 22, -20, 110, 92, 0], kick: [-22, -8, 6, 98, 0, -45, 50, 50, 60],
  cast: [12, -25, 10, 30, 16, 82, 8, 92, 0], raise: [-6, -15, 5, 15, 5, 165, 5, 170, 5], slashUp: [10, -30, 15, 40, 20, -30, 40, 170, 0],
  slashDown: [38, -45, 25, 55, 25, -40, 40, 35, 0], knee: [4, -6, 4, 95, 100, -30, 40, 40, 80], stomp: [18, -30, 30, 35, 30, -30, 40, 40, 40],
  leap: [30, -30, 95, 50, 100, 120, 10, 135, 10], flip: [-60, 60, 80, 110, 70, 150, 20, 170, 10],
  windUp: [-10, -28, 18, 32, 14, 150, 40, 195, 40], lunge: [42, -62, 20, 72, 62, -70, 15, 88, 0], spinCut: [18, -42, 22, 44, 22, -95, 0, 105, -5],
  throw: [22, -30, 25, 62, 35, -65, 20, 100, -10], kneelFinish: [32, -82, 150, 72, 92, -55, 25, 55, 0],
};

export interface Look { body: string; back: string; rim: string; gender: Gender; weapon: Weapon; heavy?: boolean }
type V = { x: number; y: number };

function capsule(c: C, a: V, b: V, w0: number, w1: number) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  c.beginPath(); c.moveTo(a.x + nx * w0, a.y + ny * w0); c.lineTo(b.x + nx * w1, b.y + ny * w1); c.lineTo(b.x - nx * w1, b.y - ny * w1); c.lineTo(a.x - nx * w0, a.y - ny * w0); c.closePath(); c.fill();
  c.beginPath(); c.arc(a.x, a.y, w0, 0, TAU); c.arc(b.x, b.y, w1, 0, TAU); c.fill();
}

/**
 * Draws one fighter with feet at (gx, gy). `vel` (px/s, signed) bends hair, scarf and cape behind the body.
 * Returns hand, weapon tip, body centre and head positions in canvas coordinates.
 */
export function drawFighter(c: C, S: number, gx: number, gy: number, face: number, p: P, look: Look, t: number, vel = 0) {
  const f = look.gender === "female", H = S * .42, th = H * .25, sh = H * .25, to = H * .31, ua = H * .17, fa = H * .17;
  const w = H * (f ? .052 : .066);
  const [lean, lT, lS, rT, rS, lU, lF, rU, rF] = p.map(v => v * D) as [number, number, number, number, number, number, number, number, number];
  const leg = (a: number, b: number) => { const kx = Math.sin(a) * th, ky = Math.cos(a) * th; return { kx, ky, fx: kx + Math.sin(a - b) * sh, fy: ky + Math.cos(a - b) * sh }; };
  const Lg = leg(lT, lS), Rg = leg(rT, rS), drop = Math.max(Lg.fy, Rg.fy);
  const hip = { x: gx, y: gy - drop };
  const neck = { x: hip.x + Math.sin(lean) * to * face, y: hip.y - Math.cos(lean) * to };
  const P2 = (o: V, a: number, l: number) => ({ x: o.x + Math.sin(a) * l * face, y: o.y + Math.cos(a) * l });
  const shoulder = P2(neck, lean + Math.PI, -H * .02);
  const arm = (u: number, fo: number) => { const e = P2(shoulder, u, ua); return { e, h: P2(e, u - fo, fa), dir: u - fo }; };
  const la = arm(lU, lF), ra = arm(rU, rF);
  const knee = (g: typeof Lg) => ({ x: hip.x + g.kx * face, y: hip.y + g.ky }), foot = (g: typeof Lg) => ({ x: hip.x + g.fx * face, y: hip.y + g.fy });
  const head = { x: neck.x + Math.sin(lean) * H * .1 * face, y: neck.y - Math.cos(lean) * H * .1 };
  const drag = Math.max(-1, Math.min(1, -vel / (S * 2))) , trail = -face * (.35 + Math.abs(drag) * .9) - drag * .2;
  c.save(); c.lineJoin = "round"; c.globalCompositeOperation = "source-over"; c.shadowBlur = 0; c.filter = "none";

  // back limbs
  c.fillStyle = look.back;
  capsule(c, shoulder, la.e, w * .75, w * .6); capsule(c, la.e, la.h, w * .6, w * .45);
  capsule(c, hip, knee(Lg), w * 1.05, w * .75); capsule(c, knee(Lg), foot(Lg), w * .75, w * .5);
  // cape (male) or long scarf (female) streaming behind
  const flow = (len: number, wd: number, col: string, ph: number) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(neck.x - face * w * .6, neck.y);
    const N = 10; const pts: V[] = [];
    for (let i = 1; i <= N; i++) { const k = i / N; pts.push({ x: neck.x + trail * len * k * S * (.04 + Math.abs(drag) * .22), y: neck.y + k * len * S * .17 * (1 - Math.abs(drag) * .6) + Math.sin(t * 9 + k * 5 + ph) * S * .02 * k }); }
    pts.forEach(q => c.lineTo(q.x, q.y - wd * .5)); for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]!, k = (i + 1) / N; c.lineTo(q.x, q.y + wd * (1 - k * .7)); } c.closePath(); c.fill();
  };
  if (f) flow(1.1, w * .9, look.back, 0); else flow(.75, w * 2.4, look.back, 1.3);

  // torso (tapered; women narrower shoulders, defined waist)
  const nx = Math.cos(lean) * face, ny = Math.sin(lean), sw = (f ? .95 : 1.45) * w, ww = (f ? .6 : 1.0) * w, hw = (f ? 1.1 : 1.0) * w;
  const mid = { x: (neck.x + hip.x) / 2, y: (neck.y + hip.y) / 2 };
  c.fillStyle = look.body; c.beginPath();
  c.moveTo(neck.x - nx * sw, neck.y - ny * sw * face); c.lineTo(neck.x + nx * sw, neck.y + ny * sw * face);
  c.quadraticCurveTo(mid.x + nx * ww * 1.2, mid.y + ny * ww * face, hip.x + nx * hw, hip.y + ny * hw * face);
  c.lineTo(hip.x - nx * hw, hip.y - ny * hw * face); c.quadraticCurveTo(mid.x - nx * ww * 1.2, mid.y - ny * ww * face, neck.x - nx * sw, neck.y - ny * sw * face); c.fill();
  // skirt / armour tassets
  c.beginPath(); const sk = f ? .9 : 1.25;
  c.moveTo(hip.x - nx * hw * 1.1, hip.y - ny * hw * face); c.lineTo(hip.x + nx * hw * 1.1, hip.y + ny * hw * face);
  c.lineTo(hip.x + nx * hw * 1.6 + Math.sin(lean) * w * face, hip.y + H * .11 * sk); c.lineTo(hip.x - nx * hw * 1.5 - trail * w, hip.y + H * .12 * sk); c.closePath(); c.fill();
  if (!f) { c.beginPath(); c.ellipse(shoulder.x + face * w * .3, shoulder.y + w * .2, w * 1.25, w * .85, lean * face, 0, TAU); c.fill(); }

  // front leg
  capsule(c, hip, knee(Rg), w * 1.1, w * .8); capsule(c, knee(Rg), foot(Rg), w * .8, w * .55);
  c.beginPath(); const ft = foot(Rg); c.ellipse(ft.x + face * w * .5, ft.y, w * .9, w * .4, 0, 0, TAU); c.fill();

  // head + hair
  if (f) { c.fillStyle = look.body; c.beginPath(); const hx = head.x - face * H * .05, hy = head.y - H * .05;
    c.moveTo(hx, hy - w * .5); for (let i = 1; i <= 8; i++) { const k = i / 8; c.lineTo(hx + trail * k * S * .07, hy + k * H * .16 + Math.sin(t * 8 + k * 4) * H * .025 * k - w * .5 * (1 - k)); }
    for (let i = 8; i >= 1; i--) { const k = i / 8; c.lineTo(hx + trail * k * S * .07, hy + k * H * .16 + Math.sin(t * 8 + k * 4) * H * .025 * k + w * .5 * (1 - k)); } c.fill(); }
  c.fillStyle = look.body; c.beginPath(); c.ellipse(head.x, head.y, H * .068, H * .078, lean * face, 0, TAU); c.fill();
  if (!f) { c.beginPath(); c.moveTo(head.x - face * H * .06, head.y - H * .05); c.lineTo(head.x - face * H * .13, head.y - H * .1); c.lineTo(head.x - face * H * .02, head.y - H * .07); c.fill(); }

  // front arm
  capsule(c, shoulder, ra.e, w * .8, w * .62); capsule(c, ra.e, ra.h, w * .62, w * .48);

  // weapon in the front hand, continuing the forearm line
  let tip = ra.h;
  if (look.weapon !== "none") { const long = look.weapon === "spear", L = H * (long ? .95 : .55), back = long ? H * .35 : H * .06;
    const wd = Math.cos(ra.dir) > .6 ? ra.dir + Math.PI : ra.dir, dx = Math.sin(wd) * face, dy = Math.cos(wd); tip = { x: ra.h.x + dx * L, y: ra.h.y + dy * L }; const butt = { x: ra.h.x - dx * back, y: ra.h.y - dy * back };
    c.shadowBlur = 0; c.strokeStyle = look.body; c.lineCap = "round"; c.lineWidth = long ? w * .3 : w * .42; c.beginPath(); c.moveTo(butt.x, butt.y); c.lineTo(tip.x, tip.y); c.stroke();
    c.fillStyle = look.rim; c.beginPath(); const bw = long ? w * .45 : w * .55, bx = tip.x - dx * (long ? H * .12 : L * .85), by = tip.y - dy * (long ? H * .12 : L * .85);
    c.moveTo(tip.x, tip.y); c.lineTo(bx - dy * bw, by + dx * bw); c.lineTo(bx + dy * bw, by - dx * bw); c.closePath(); c.globalAlpha = .55; c.fill(); c.globalAlpha = 1;
    if (!long) { c.strokeStyle = look.body; c.lineWidth = w * .35; c.beginPath(); c.moveTo(ra.h.x - dy * w * .9, ra.h.y + dx * w * .9); c.lineTo(ra.h.x + dy * w * .9, ra.h.y - dx * w * .9); c.stroke(); } }
  c.restore();
  // rim highlight on the leading edge + eye glint
  c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = look.rim; c.globalAlpha = .45; c.lineWidth = Math.max(1, S * .003);
  c.beginPath(); c.moveTo(neck.x + nx * sw, neck.y + ny * sw * face); c.lineTo(hip.x + nx * hw, hip.y + ny * hw * face); c.stroke();
  c.globalAlpha = 1; const g = c.createRadialGradient(head.x + face * H * .035, head.y - H * .01, 0, head.x + face * H * .035, head.y - H * .01, S * .012);
  g.addColorStop(0, look.rim); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(head.x - S * .02, head.y - S * .03, S * .06, S * .04); c.restore();
  return { hand: ra.h, tip, centre: mid, head };
}
