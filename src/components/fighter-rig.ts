/** Articulated anatomical shadow mannequins based on the approved male/female body sheets. */
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
  waterDraw: [-15, -38, 30, 40, 38, 70, 60, 115, 45], waterSweep: [24, -58, 40, 55, 45, -50, 18, 105, 20],
  assassinGuard: [18, -35, 45, 38, 30, 35, 105, 70, 100], aerialTuck: [-40, 105, 125, 115, 130, 120, 110, 115, 95], swordDraw: [12, -30, 25, 40, 25, 85, 85, 40, 100],
};

export interface Look { body: string; back: string; rim: string; gender: Gender; weapon: Weapon; heavy?: boolean }
type V = { x: number; y: number };

/** Anatomical limb volumes: rounded muscle belly tapering into each joint. */
function limb(c: C, a: V, b: V, w0: number, w1: number, col: string, shade: string) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  c.save(); c.translate(a.x, a.y); c.rotate(Math.atan2(dy, dx) - Math.PI / 2);
  const g = c.createLinearGradient(-w0, 0, w0, 0);
  g.addColorStop(0, shade); g.addColorStop(.38, col); g.addColorStop(.7, col); g.addColorStop(1, shade);
  c.fillStyle = g; c.beginPath(); c.moveTo(-w0 * .55, 0);
  c.bezierCurveTo(-w0 * 1.15, L * .2, -w1 * 1.5, L * .7, -w1, L);
  c.quadraticCurveTo(0, L + w1, w1, L);
  c.bezierCurveTo(w1 * 1.5, L * .7, w0 * 1.15, L * .2, w0 * .55, 0);
  c.quadraticCurveTo(0, -w0 * .5, -w0 * .55, 0); c.fill(); c.restore();
}

/** All combat scenes share this articulated, neutral anatomical mannequin. */
export function drawFighter(c: C, S: number, gx: number, gy: number, face: number, p: P, look: Look, t: number, vel = 0) {
  const f = look.gender === "female", H = S * .46, th = H * .245, sh = H * .245, to = H * .32, ua = H * .175, fa = H * .16;
  const w = H * (f ? .049 : .063);
  const angles = p.map(v => v * D);
  const lean = angles[0] ?? 0, lT = angles[1] ?? 0, lS = angles[2] ?? 0, rT = angles[3] ?? 0, rS = angles[4] ?? 0;
  const lU = angles[5] ?? 0, lF = angles[6] ?? 0, rU = angles[7] ?? 0, rF = angles[8] ?? 0;
  const leg = (a: number, b: number) => { const kx = Math.sin(a) * th, ky = Math.cos(a) * th; return { kx, ky, fx: kx + Math.sin(a - b) * sh, fy: ky + Math.cos(a - b) * sh }; };
  const Lg = leg(lT, lS), Rg = leg(rT, rS), drop = Math.max(Lg.fy, Rg.fy);
  const hip = { x: gx, y: gy - drop };
  const neck = { x: hip.x + Math.sin(lean) * to * face, y: hip.y - Math.cos(lean) * to };
  const P2 = (o: V, a: number, l: number) => ({ x: o.x + Math.sin(a) * l * face, y: o.y + Math.cos(a) * l });
  const shoulder = P2(neck, lean, H * .035);
  const arm = (u: number, fo: number) => { const e = P2(shoulder, u, ua); return { e, h: P2(e, u - fo, fa), dir: u - fo }; };
  const la = arm(lU, lF), ra = arm(rU, rF);
  const knee = (g: typeof Lg) => ({ x: hip.x + g.kx * face, y: hip.y + g.ky }), foot = (g: typeof Lg) => ({ x: hip.x + g.fx * face, y: hip.y + g.fy });
  const head = { x: neck.x + Math.sin(lean) * H * .09 * face, y: neck.y - Math.cos(lean) * H * .09 };
  const nx = Math.cos(lean) * face, ny = Math.sin(lean), sw = (f ? 1.22 : 1.52) * w, ww = (f ? .74 : .95) * w, hw = (f ? 1.5 : 1.05) * w;
  const mid = { x: (neck.x + hip.x) / 2, y: (neck.y + hip.y) / 2 };
  c.save(); c.lineJoin = "round"; c.globalCompositeOperation = "source-over"; c.shadowBlur = 0; c.filter = "none";
  const mass = (a: V, b: V, aW: number, bW: number, back = false) => limb(c, a, b, aW, bW, back ? look.back : look.body, look.back);
  const joint = (v: V, radius: number) => { c.fillStyle = look.body; c.beginPath(); c.ellipse(v.x, v.y, radius, radius * .9, lean * face, 0, TAU); c.fill(); };
  const drawLeg = (g: typeof Lg, back: boolean) => {
    const k = knee(g), ft = foot(g);
    mass(hip, k, w * (f ? 1.25 : 1.15), w * .61, back);
    mass(k, ft, w * .72, w * .32, back);
    c.fillStyle = back ? look.back : look.body; c.beginPath();
    c.moveTo(ft.x - face * w * .35, ft.y - w * .3);
    c.quadraticCurveTo(ft.x + face * w * .45, ft.y - w * .45, ft.x + face * w * 1.2, ft.y - w * .03);
    c.lineTo(ft.x + face * w * 1.15, ft.y + w * .12); c.lineTo(ft.x - face * w * .4, ft.y + w * .12); c.closePath(); c.fill();
  };
  mass(shoulder, la.e, w * .72, w * .39, true); mass(la.e, la.h, w * .5, w * .26, true); drawLeg(Lg, true);
  // Torso in its own rotated coordinate space: trapezius, rib cage, waist and pelvis.
  c.save(); c.translate(neck.x, neck.y); c.rotate(lean * face); c.scale(face, 1);
  const skin = c.createLinearGradient(-sw, 0, sw, 0); skin.addColorStop(0, look.back); skin.addColorStop(.42, look.body); skin.addColorStop(.72, look.body); skin.addColorStop(1, look.back);
  c.fillStyle = skin; c.beginPath(); c.moveTo(-w * .35, -H * .018); c.lineTo(w * .35, -H * .018);
  c.quadraticCurveTo(w * .48, H * .025, sw, H * .065);
  c.bezierCurveTo(sw * 1.12, H * .13, ww, H * .2, ww, H * .225);
  c.bezierCurveTo(ww, H * .27, hw * 1.1, H * .27, hw, to);
  c.quadraticCurveTo(0, to + H * .045, -hw, to);
  c.bezierCurveTo(-hw * 1.1, H * .27, -ww, H * .27, -ww, H * .225);
  c.bezierCurveTo(-ww, H * .2, -sw * 1.12, H * .13, -sw, H * .065);
  c.quadraticCurveTo(-w * .48, H * .025, -w * .35, -H * .018); c.fill();
  // Subtle chest / abdominal planes, not armour or costume.
  c.strokeStyle = look.back; c.lineWidth = Math.max(.6, H * .005); c.globalAlpha *= .65;
  for (const side of [-1, 1]) {
    c.beginPath(); c.moveTo(side * w * .1, H * .065);
    c.bezierCurveTo(side * sw * .55, H * .045, side * sw * .95, H * .085, side * sw * .8, H * .115);
    c.quadraticCurveTo(side * w * .4, H * (f ? .16 : .13), side * w * .1, H * .12); c.stroke();
    c.beginPath(); c.moveTo(side * ww * .75, H * .16); c.lineTo(side * ww * .55, H * .23); c.lineTo(side * hw * .6, H * .29); c.stroke();
  }
  c.beginPath(); c.moveTo(0, H * .13); c.lineTo(0, H * .25); c.stroke();
  if (!f) for (let i = 0; i < 3; i++) { const y = H * (.155 + i * .03); c.beginPath(); c.moveTo(-ww * .55, y); c.quadraticCurveTo(0, y + H * .015, ww * .55, y); c.stroke(); }
  c.restore(); drawLeg(Rg, false);
  // Bald neutral head, jaw and face planes matching the reference mannequins.
  mass(neck, head, w * .38, w * .4);
  c.save(); c.translate(head.x, head.y); c.rotate(lean * face); c.scale(face, 1);
  c.fillStyle = skin; c.beginPath(); c.moveTo(-H * .055, -H * .026);
  c.bezierCurveTo(-H * .06, -H * .095, H * .057, -H * .095, H * .061, -H * .034);
  c.lineTo(H * .067, H * .008); c.lineTo(H * .057, H * .035); c.lineTo(H * .022, H * .06);
  c.lineTo(-H * .036, H * .048); c.quadraticCurveTo(-H * .057, H * .018, -H * .055, -H * .026); c.fill();
  c.strokeStyle = look.back; c.lineWidth = Math.max(.7, H * .006);
  c.beginPath(); c.moveTo(H * .015, -H * .014); c.lineTo(H * .045, -H * .013); c.moveTo(H * .038, -H * .005); c.lineTo(H * .048, H * .017); c.lineTo(H * .025, H * .019); c.moveTo(H * .012, H * .034); c.lineTo(H * .039, H * .034); c.stroke(); c.restore();
  mass(shoulder, ra.e, w * .82, w * .4); joint(shoulder, w * .85);
  mass(ra.e, ra.h, w * .57, w * .27); joint(ra.h, w * .34);
  void t; void vel;

  // weapon in the front hand, continuing the forearm line
  let tip = ra.h;
  if (look.weapon !== "none") { const wp = look.weapon, long = wp === "spear" || wp === "scythe" || wp === "hammer", L = H * (wp === "scythe" ? 1.05 : wp === "hammer" ? .85 : long ? .95 : wp === "daggers" ? .25 : wp === "kara" ? .72 : wp === "greatsword" ? .9 : .55), back = long ? H * .35 : H * .06;
    const wd = Math.cos(ra.dir) > .6 ? ra.dir + Math.PI : ra.dir, dx = Math.sin(wd) * face, dy = Math.cos(wd); tip = { x: ra.h.x + dx * L, y: ra.h.y + dy * L }; const butt = { x: ra.h.x - dx * back, y: ra.h.y - dy * back };
    c.shadowBlur = 0; c.strokeStyle = look.body; c.lineCap = "round"; c.lineWidth = long ? w * .3 : wp === "greatsword" ? w * .7 : w * .42; c.beginPath(); c.moveTo(butt.x, butt.y); c.lineTo(tip.x, tip.y); c.stroke();
    c.fillStyle = look.rim; c.beginPath(); const bw = long ? w * .45 : w * .55, bx = tip.x - dx * (long ? H * .12 : L * .85), by = tip.y - dy * (long ? H * .12 : L * .85);
    c.moveTo(tip.x, tip.y); c.lineTo(bx - dy * bw, by + dx * bw); c.lineTo(bx + dy * bw, by - dx * bw); c.closePath(); c.globalAlpha = .55; c.fill(); c.globalAlpha = 1;
    if (wp === "scythe") { c.fillStyle = look.rim; c.globalAlpha = .8; c.beginPath(); c.moveTo(tip.x, tip.y); c.quadraticCurveTo(tip.x - dy * H * .32 + dx * H * .05, tip.y + dx * H * .32 + dy * H * .05, tip.x - dy * H * .38 - dx * H * .14, tip.y + dx * H * .38 - dy * H * .14); c.quadraticCurveTo(tip.x - dy * H * .2, tip.y + dx * H * .2, tip.x - dx * H * .04, tip.y - dy * H * .04); c.closePath(); c.fill(); c.globalAlpha = 1; }
    if (wp === "hammer") { c.save(); c.translate(tip.x, tip.y); c.rotate(Math.atan2(dy, dx)); c.fillStyle = look.body; c.fillRect(-H * .09, -H * .1, H * .18, H * .2); c.fillStyle = look.rim; c.globalAlpha = .6; c.fillRect(-H * .09, -H * .1, H * .03, H * .2); c.globalAlpha = 1; c.restore(); }
    if (!long) { c.strokeStyle = look.body; c.lineWidth = w * .35; c.beginPath(); c.moveTo(ra.h.x - dy * w * .9, ra.h.y + dx * w * .9); c.lineTo(ra.h.x + dy * w * .9, ra.h.y - dx * w * .9); c.stroke(); } }
  if (look.weapon === "daggers") { c.strokeStyle = look.rim; c.lineWidth = w * .28; c.beginPath(); c.moveTo(la.h.x, la.h.y); c.lineTo(la.h.x - Math.sin(la.dir) * H * .2 * face, la.h.y - Math.cos(la.dir) * H * .2); c.stroke(); }
  c.restore();
  // rim highlight on the leading edge + eye glint
  c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = look.rim; c.globalAlpha = .45; c.lineWidth = Math.max(1, S * .003);
  c.beginPath(); c.moveTo(neck.x + nx * sw, neck.y + ny * sw * face); c.lineTo(hip.x + nx * hw, hip.y + ny * hw * face); c.stroke();
  c.globalAlpha = 1; const g = c.createRadialGradient(head.x + face * H * .035, head.y - H * .01, 0, head.x + face * H * .035, head.y - H * .01, S * .012);
  g.addColorStop(0, look.rim); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(head.x - S * .02, head.y - S * .03, S * .06, S * .04); c.restore();
  return { hand: ra.h, tip, centre: mid, head };
}
