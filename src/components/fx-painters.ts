/** Hand-painted, cel-shaded 2D FX painters for elements, lightning, flame, beasts and guardians. Browser-only (canvas). */
import type { FxMotif, FxRecipe } from "@/lib/ability-fx";

type C = CanvasRenderingContext2D;
export interface PF { c: C; t: number; s: number; r: FxRecipe; v: number; p: number; rnd: (i: number) => number; step: number }
const TAU = Math.PI * 2;
const fr = (x: number) => x - Math.floor(x);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x: number) => { const k = clamp(x) - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export function rgba(hex: string, a: number) {
  let h = hex.replace("#", ""); if (h.length === 3) h = h.split("").map(x => x + x).join("");
  const n = parseInt(h.slice(0, 6), 16) || 0; return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a)})`;
}
const add = (c: C) => { c.globalCompositeOperation = "lighter"; };
const norm = (c: C) => { c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; };
export function glowDot(c: C, x: number, y: number, r: number, col: string, a = 1) {
  if (r <= 0 || a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(.35, rgba(col, a * .4)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function disc(c: C, x: number, y: number, r: number, col: string) { if (r <= 0) return; c.beginPath(); c.fillStyle = col; c.arc(x, y, r, 0, TAU); c.fill(); }
function smoke(c: C, x: number, y: number, r: number, col: string, a: number) {
  if (r <= 0 || a <= 0) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
const GY = .3;

export function groundGlow(f: PF, col: string, k = 1) {
  const { c, s, t } = f; c.save(); c.translate(0, s * GY); c.scale(1, .26);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, s * .45); g.addColorStop(0, rgba(col, .5 * k)); g.addColorStop(.55, rgba(col, .14 * k)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, s * .45, 0, TAU); c.fill();
  for (let i = 0; i < 2; i++) { const q = fr(t * .45 + i * .5); c.strokeStyle = rgba(col, (1 - q) * .55 * k); c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, s * (.08 + q * .36), 0, TAU); c.stroke(); }
  c.restore();
}

export function runeCircle(c: C, s: number, t: number, col: string, hi: string, R: number, a = 1) {
  c.save(); c.translate(0, s * GY); c.scale(1, .3); c.globalAlpha = a; c.lineWidth = 2; c.strokeStyle = col;
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, R * .88, 0, TAU); c.stroke();
  c.save(); c.rotate(t * .35); for (let i = 0; i < 24; i++) { c.rotate(TAU / 24); c.fillStyle = i % 3 ? col : hi; c.fillRect(R * .9, -2, R * .06, 4); } c.restore();
  c.save(); c.rotate(-t * .25); c.strokeStyle = hi; c.lineWidth = 1.5;
  for (const off of [0, Math.PI / 3]) { c.beginPath(); for (let i = 0; i <= 3; i++) { const q = off + i * TAU / 3; c.lineTo(Math.cos(q) * R * .8, Math.sin(q) * R * .8); } c.stroke(); }
  c.beginPath(); c.arc(0, 0, R * .4, 0, TAU); c.stroke(); c.restore(); c.restore(); c.globalAlpha = 1;
}

/** Silhouette of a person; y is the feet line. Returns the head centre. */
export function humanoid(c: C, x: number, y: number, h: number, fill: string, crouch = 0, arms = 0, robe = false) {
  const u = h / 8, ch = 1 - crouch * .35, hip = -u * 4 * ch, sh = -u * 6.4 * ch;
  c.save(); c.translate(x, y); c.fillStyle = fill; c.strokeStyle = fill; c.lineCap = "round"; c.lineJoin = "round";
  if (robe) { c.beginPath(); c.moveTo(-u * 2, 0); c.quadraticCurveTo(-u * .9, hip, -u * 1.15, sh); c.lineTo(u * 1.15, sh); c.quadraticCurveTo(u * .9, hip, u * 2, 0); c.quadraticCurveTo(0, u * .5, -u * 2, 0); c.fill(); }
  else { c.lineWidth = u * 1.1; c.beginPath(); c.moveTo(-u * (1.2 + crouch), 0); c.lineTo(-u * (.5 + crouch * .9), hip * .5); c.lineTo(-u * .45, hip); c.moveTo(u * (1.2 + crouch), 0); c.lineTo(u * (.5 + crouch * .9), hip * .5); c.lineTo(u * .45, hip); c.stroke(); }
  c.beginPath(); c.moveTo(-u * .85, hip); c.lineTo(-u * 1.3, sh); c.lineTo(u * 1.3, sh); c.lineTo(u * .85, hip); c.closePath(); c.fill();
  c.lineWidth = u * .8; const ax = u * (1.3 + 2.4 * arms), ay = sh + u * (3.4 - 4.6 * arms);
  c.beginPath(); c.moveTo(-u * 1.15, sh + u * .2); c.lineTo(-(u * 1.15 + ax) / 2 - u * .3, (sh + ay) / 2); c.lineTo(-ax, ay); c.moveTo(u * 1.15, sh + u * .2); c.lineTo((u * 1.15 + ax) / 2 + u * .3, (sh + ay) / 2); c.lineTo(ax, ay); c.stroke();
  c.beginPath(); c.arc(0, sh - u * 1.15, u * .95, 0, TAU); c.fill(); c.restore();
  return { hx: x, hy: y + sh - u * 1.15, u };
}

// ---------------------------------------------------------------- beasts
export type Species = "tiger" | "lion" | "wolf" | "hyena";
/** Side-profile quadruped facing right. y = ground, L = body scale. Returns mouth position. */
export function quadruped(c: C, sp: Species, x: number, y: number, L: number, walk: number, roar: number, body: string, rim: string, eye: string, mark: string) {
  const hy0 = sp === "hyena" ? .07 : 0, bob = Math.sin(walk * 2) * .012;
  const sh = { x: .3, y: -.42 - hy0 }, hp = { x: -.3, y: -.4 + hy0 * .5 };
  c.save(); c.translate(x, y); c.scale(L, L); c.translate(0, bob); c.lineCap = "round"; c.lineJoin = "round";
  const leg = (bx: number, by: number, ph: number, far: boolean) => {
    const sw = Math.sin(walk + ph) * .1, lift = Math.max(0, Math.cos(walk + ph)) * .05;
    c.strokeStyle = far ? "#000000" : body; c.lineWidth = sp === "lion" || sp === "tiger" ? .085 : .065;
    c.beginPath(); c.moveTo(bx, by + .08); c.quadraticCurveTo(bx + sw * .3 + (far ? .02 : -.02), by * .45, bx + sw, -lift - bob); c.stroke();
    c.beginPath(); c.fillStyle = far ? "#000000" : body; c.ellipse(bx + sw + .02, -lift - bob - .01, .05, .025, 0, 0, TAU); c.fill();
  };
  leg(sh.x - .05, sh.y, Math.PI, true); leg(hp.x + .05, hp.y, 0, true);
  const tw = Math.sin(walk * .7) * .08; c.strokeStyle = body; c.lineWidth = sp === "wolf" ? .08 : sp === "hyena" ? .05 : .035;
  c.beginPath(); c.moveTo(hp.x - .08, hp.y + .02); c.bezierCurveTo(hp.x - .28, hp.y - .06 + tw, hp.x - .34, hp.y + .14, hp.x - .42, hp.y + .06 + tw); c.stroke();
  if (sp === "lion") disc(c, hp.x - .43, hp.y + .06 + tw, .035, body);
  c.fillStyle = body; c.beginPath(); c.moveTo(hp.x - .1, hp.y + .05);
  c.bezierCurveTo(hp.x - .08, hp.y - .13, sh.x - .12, sh.y - .12 - (sp === "hyena" ? .04 : 0), sh.x + .06, sh.y - .07);
  c.bezierCurveTo(sh.x + .15, sh.y + .02, sh.x + .11, sh.y + .2, sh.x - .02, sh.y + .25);
  c.bezierCurveTo(sh.x - .2, sh.y + .3, hp.x + .1, hp.y + .28, hp.x - .04, hp.y + .23); c.closePath(); c.fill();
  c.strokeStyle = rim; c.lineWidth = .02; c.stroke();
  if (sp === "tiger") { c.save(); c.clip(); c.strokeStyle = mark; c.lineWidth = .028; for (let i = 0; i < 8; i++) { const sx = hp.x - .02 + i * .08; c.beginPath(); c.moveTo(sx, sh.y - .2); c.quadraticCurveTo(sx + .04, sh.y - .02, sx - .01, sh.y + .1); c.stroke(); } c.restore(); }
  if (sp === "hyena") { c.save(); c.clip(); for (let i = 0; i < 14; i++) disc(c, hp.x + (i * .37 % 1) * .6, sh.y - .08 + (i * .61 % 1) * .3, .018, rgba(mark, .7)); c.restore(); }
  if (sp === "wolf") { c.save(); c.clip(); c.strokeStyle = rgba(rim, .5); c.lineWidth = .01; for (let i = 0; i < 10; i++) { const sx = hp.x + i * .06; c.beginPath(); c.moveTo(sx, sh.y - .1); c.lineTo(sx - .03, sh.y - .04); c.stroke(); } c.restore(); }
  const hx = sh.x + .15, hy = sh.y - .1 + (sp === "hyena" ? .03 : 0), sn = sp === "wolf" || sp === "hyena" ? .17 : .13;
  c.save(); c.translate(hx, hy); c.rotate(-roar * .28);
  if (sp === "lion") { c.beginPath(); for (let i = 0; i < 22; i++) { const q = i / 22 * TAU; const rr = i % 2 ? .13 : .2 + Math.sin(walk * 3 + i) * .01; c.lineTo(Math.cos(q) * rr - .02, Math.sin(q) * rr); } c.closePath(); c.fillStyle = "#000000"; c.fill(); c.strokeStyle = mark; c.lineWidth = .012; c.stroke(); }
  c.fillStyle = body; c.beginPath(); c.ellipse(0, 0, .1, .085, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(.03, -.065); c.lineTo(sn, -.025); c.lineTo(sn + .005, .015); c.lineTo(.04, .03); c.closePath(); c.fill();
  c.save(); c.translate(.05, .03); c.rotate(roar * .6); c.beginPath(); c.moveTo(0, 0); c.lineTo(sn - .05, -.005); c.lineTo(sn - .07, .03); c.lineTo(0, .045); c.closePath(); c.fill();
  if (roar > .15) { c.fillStyle = "#ffffff"; for (const fx of [sn - .08, sn - .13]) { c.beginPath(); c.moveTo(fx, -.004); c.lineTo(fx + .012, -.004); c.lineTo(fx + .006, -.03); c.fill(); } } c.restore();
  if (roar > .15) { c.fillStyle = "#ffffff"; for (const fx of [sn - .03, sn - .08]) { c.beginPath(); c.moveTo(fx, .015); c.lineTo(fx + .012, .015); c.lineTo(fx + .006, .045); c.fill(); } }
  c.fillStyle = body; c.beginPath();
  if (sp === "wolf") { c.moveTo(-.07, -.05); c.lineTo(-.05, -.17); c.lineTo(0, -.07); c.moveTo(-.02, -.06); c.lineTo(.01, -.16); c.lineTo(.04, -.06); }
  else { const er = sp === "hyena" ? .04 : .028; c.arc(-.04, -.08, er, 0, TAU); c.moveTo(.02, -.08); c.arc(.0, -.085, er, 0, TAU); }
  c.fill();
  glowDot(c, .05, -.028, .06, eye, 1); disc(c, .05, -.028, .009, "#ffffff");
  c.restore();
  leg(sh.x, sh.y, 0, false); leg(hp.x, hp.y, Math.PI, false);
  c.restore();
  return { mx: x + (hx + sn) * L, my: y + (hy + bob) * L };
}

function roarWaves(c: C, mx: number, my: number, s: number, t: number, col: string, k: number) {
  add(c); for (let i = 0; i < 4; i++) { const q = fr(t * 2.2 + i / 4); c.strokeStyle = rgba(col, (1 - q) * .9 * k); c.lineWidth = 6 * (1 - q) + 1; c.beginPath(); c.arc(mx, my, s * (.03 + q * .42), -.65, .65); c.stroke(); } norm(c);
}

function transformation(f: PF, sp: Species) {
  const { c, s, t, r, rnd } = f; const [a, , hi] = r.palette; const gy = s * GY;
  const ph = fr(t * .2);
  const shaking = ph > .78 && ph < .95; c.save(); if (shaking) c.translate((rnd(f.step) - .5) * s * .02, (rnd(f.step + 9) - .5) * s * .01);
  groundGlow(f, a, .7);
  const vort = clamp(1 - Math.abs(ph - .35) / .16), manA = 1 - ease((ph - .27) / .14), beastA = ease((ph - .3) / .15);
  for (let i = 0; i < 22; i++) { const q = fr(t * .35 + rnd(i)); const ang = rnd(i + 40) * TAU + t * (1 + vort * 4); const rad = s * (.06 + .2 * q) * (1 - vort * .35); smoke(c, Math.cos(ang) * rad, gy - s * .16 - q * s * .26 + Math.sin(ang) * rad * .35, s * (.05 + .06 * q), "#000000", (1 - q) * (.28 + vort * .55)); }
  if (manA > 0) { c.globalAlpha = manA; c.shadowColor = a; c.shadowBlur = 12; const hd = humanoid(c, 0, gy, s * .44, "#110e18", ease((ph - .12) / .15) * .9, 0); glowDot(c, hd.hx + hd.u * .35, hd.hy, s * .03, a); glowDot(c, hd.hx - hd.u * .35, hd.hy, s * .03, a); c.shadowBlur = 0; c.globalAlpha = 1; }
  if (beastA > 0) {
    const L = s * .62 * (.6 + .4 * beastA), walk = ph < .78 ? t * 7 : t * 7 * .2, roar = clamp((ph - .78) / .05) * (1 - clamp((ph - .95) / .05));
    const x = lerp(s * .04, s * .1, clamp((ph - .45) / .33));
    add(c); glowDot(c, x, gy - L * .3, L * .75, a, .35 * beastA); norm(c);
    c.globalAlpha = beastA; c.shadowColor = a; c.shadowBlur = 14; const m = quadruped(c, sp, x, gy, L, walk, roar, "#15111c", a, hi, a); c.shadowBlur = 0; c.globalAlpha = 1;
    if (roar > 0) { roarWaves(c, m.mx, m.my, s, t, hi, roar); add(c); glowDot(c, m.mx, m.my, s * .12, a, .6 * roar); norm(c); }
  }
  if (vort > .2) { add(c); glowDot(c, 0, gy - s * .18, s * .32 * vort, a, .55 * vort); c.strokeStyle = rgba(hi, vort); c.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { const q = rnd(f.step * 3 + i) * TAU; c.beginPath(); c.moveTo(Math.cos(q) * s * .08, gy - s * .18 + Math.sin(q) * s * .1); c.lineTo(Math.cos(q + .2) * s * .2, gy - s * .18 + Math.sin(q + .3) * s * .2); c.stroke(); } norm(c); }
  c.restore();
}

type Pt = [number, number, number];
function tube(c: C, pts: Pt[], body: string, rim: string, spikes?: string) {
  for (const [x, y, rr] of pts) disc(c, x, y, rr + 1.6, rim);
  for (const [x, y, rr] of pts) disc(c, x, y, rr, body);
  if (spikes) { c.fillStyle = spikes; for (let i = 2; i < pts.length - 1; i += 5) { const [x, y, rr] = pts[i]!, [nx, ny] = pts[i + 1]!; const ang = Math.atan2(ny - y, nx - x) - Math.PI / 2; c.beginPath(); c.moveTo(x + Math.cos(ang - .4) * rr, y + Math.sin(ang - .4) * rr); c.lineTo(x + Math.cos(ang) * rr * 2.1, y + Math.sin(ang) * rr * 2.1); c.lineTo(x + Math.cos(ang + .4) * rr, y + Math.sin(ang + .4) * rr); c.fill(); } }
}
function serpentHead(c: C, x: number, y: number, ang: number, r: number, body: string, eye: string, open: number, horns?: string) {
  c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = body;
  c.beginPath(); c.moveTo(-r, -r * .9); c.quadraticCurveTo(r * 1.6, -r * 1.1, r * 2.3, -r * .2); c.lineTo(r * .6, r * .1); c.closePath(); c.fill();
  c.save(); c.rotate(open * .5); c.beginPath(); c.moveTo(-r, r * .7); c.quadraticCurveTo(r * 1.3, r * .8, r * 2, r * .1); c.lineTo(r * .5, 0); c.closePath(); c.fill(); c.restore();
  if (open > .2) { c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(r * 1.5, -r * .25); c.lineTo(r * 1.65, -r * .25); c.lineTo(r * 1.55, r * .4); c.fill(); }
  if (horns) { c.strokeStyle = horns; c.lineWidth = r * .3; c.lineCap = "round"; c.beginPath(); c.moveTo(-r * .3, -r * .8); c.quadraticCurveTo(-r * 1.5, -r * 2, -r * 2.4, -r * 1.6); c.moveTo(r * .2, -r * .9); c.quadraticCurveTo(-r * .6, -r * 2.2, -r * 1.4, -r * 2.3); c.stroke(); }
  glowDot(c, r * .7, -r * .45, r * 1.1, eye); disc(c, r * .7, -r * .45, r * .15, "#ffffff"); c.restore();
}

function snakes(f: PF) {
  const { c, s, t, r } = f; const [a, b, hi] = r.palette; groundGlow(f, a, .6);
  for (let k = 0; k < 3; k++) {
    const y0 = s * (GY - .02 - k * .12), ph = fr(t * .5 + k * .33), strike = ph > .7 ? Math.sin((ph - .7) / .3 * Math.PI) : 0;
    const hx = -s * .1 + k * s * .06 + strike * s * .22, pts: Pt[] = [];
    for (let i = 70; i >= 0; i--) { const q = i / 70; pts.push([hx - q * s * .55, y0 + Math.sin(q * 9 - t * 5 + k) * s * .04 * (q + .2) - strike * s * .06 * (1 - q), s * (.028 - q * .02)]); }
    tube(c, pts, b === "#14532d" ? "#0a1a06" : b, a);
    const [x, y] = pts[pts.length - 1]!; serpentHead(c, x, y, -strike * .3, s * .03, "#0a1a06", hi, strike);
  }
}
function dragon(f: PF) {
  const { c, s, t, r } = f; const [a, b, hi] = r.palette;
  add(c); glowDot(c, 0, -s * .02, s * .2, a, .9); glowDot(c, 0, -s * .02, s * .08, "#ffffff", .9); norm(c);
  const pts: Pt[] = []; const n = 110;
  for (let i = n; i >= 0; i--) { const q = i / n; const ang = -t * 1.4 + q * TAU * 1.15; pts.push([Math.cos(ang) * s * (.24 + q * .1), -s * .02 + Math.sin(ang) * s * (.16 + q * .06) + Math.sin(q * 12 + t * 3) * s * .01, s * (.035 - q * .025)]); }
  tube(c, pts, "#0b1408", b, a);
  const [x, y] = pts[pts.length - 1]!, [px, py] = pts[pts.length - 3]!;
  serpentHead(c, x, y, Math.atan2(y - py, x - px), s * .035, "#0b1408", hi, .5 + .5 * Math.sin(t * 2), hi);
  add(c); for (let i = 0; i < 18; i++) { const q = fr(t * .7 + f.rnd(i)); glowDot(c, x + Math.cos(i) * q * s * .2, y + Math.sin(i * 1.7) * q * s * .2, s * .02 * (1 - q), a); } norm(c);
}
function beastCommand(f: PF) {
  const { c, s, t, r } = f; const [a, , hi] = r.palette; const gy = s * GY; groundGlow(f, a, .8);
  const hd = humanoid(c, 0, gy - s * .12, s * .32, "#06050b", 0, .9);
  add(c); glowDot(c, hd.hx, hd.hy, s * .06, a); norm(c);
  const sp: Species[] = ["wolf", "tiger", "hyena"];
  sp.forEach((k, i) => { const off = (i - 1) * s * .26; const roar = clamp(Math.sin(t * 1.2 + i * 2) * 3 - 2); c.shadowColor = a; c.shadowBlur = 10; quadruped(c, k, off + s * .03, gy + s * .02, s * .28, t * 6 + i, roar, "#15111c", a, hi, a); c.shadowBlur = 0; });
}
function beast(f: PF) {
  switch (f.v) {
    case 0: return beastCommand(f);
    case 1: { const sp: Species[] = ["wolf", "tiger", "lion", "hyena"]; return transformation(f, sp[Math.floor(f.t * .2) % 4]!); }
    case 2: return transformation(f, "wolf");
    case 3: return transformation(f, "tiger");
    case 4: return transformation(f, "lion");
    case 5: return dragon(f);
    case 6: return transformation(f, "hyena");
    case 7: return snakes(f);
    default: return transformation(f, (["wolf", "tiger", "lion", "hyena"] as Species[])[f.v % 4]!);
  }
}

// ---------------------------------------------------------------- flame
function flameBody(c: C, base: number, w: number, H: number, t: number, col: string, tips: number, seed: number) {
  c.beginPath(); c.moveTo(-w, base); const n = 44;
  for (let i = 0; i <= n; i++) {
    const u = i / n, prof = 1 - Math.pow(Math.abs(2 * u - 1), 1.5);
    const tip = .62 + .38 * Math.pow(Math.abs(Math.sin(u * tips * Math.PI + seed + Math.sin(t * 2.3 + seed) * .8)), .6);
    const h = H * prof * tip * (.9 + .1 * Math.sin(t * 9 + u * 7 + seed));
    const sway = Math.sin(t * 4.5 - h / H * 3.5 + seed) * w * .35 * (h / H);
    c.lineTo((u - .5) * 2 * w + sway, base - h);
  }
  c.lineTo(w, base); c.quadraticCurveTo(0, base + w * .35, -w, base); c.fillStyle = col; c.fill();
}
function teardrop(c: C, x: number, y: number, r: number, col: string, st = 2.2) {
  if (r <= 0) return; c.beginPath(); c.moveTo(x, y - r * st); c.bezierCurveTo(x + r * .9, y - r * st * .35, x + r, y + r * .4, x, y + r); c.bezierCurveTo(x - r, y + r * .4, x - r * .9, y - r * st * .35, x, y - r * st); c.fillStyle = col; c.fill();
}
function flameStack(f: PF, x: number, base: number, w: number, H: number, cols: [string, string, string, string], seed = 0) {
  const { c, t } = f; c.save(); c.translate(x, 0);
  flameBody(c, base, w, H, t, cols[0], 3, seed); flameBody(c, base, w * .75, H * .78, t * 1.05, cols[1], 3, seed + 1.3);
  flameBody(c, base, w * .5, H * .52, t * 1.1, cols[2], 2, seed + 2.1); flameBody(c, base, w * .26, H * .28, t * 1.2, cols[3], 1, seed + 3); c.restore();
}
function flame(f: PF) {
  const { c, t, s, r, v, p, rnd } = f; const [mid, outer, core] = r.palette; const gy = s * GY;
  const cols: [string, string, string, string] = [outer, mid, core, "#ffffff"];
  const H = s * (.4 + .06 * p / 8) * (v === 5 ? 1.2 : 1) * (v === 1 ? .85 + .25 * Math.max(0, Math.sin(t * 3)) : 1);
  if (v !== 4) for (let i = 0; i < 10; i++) { const q = fr(t * .25 + rnd(i + 500)); smoke(c, (rnd(i + 501) - .5) * s * .2 + Math.sin(t + i) * s * .05, gy - H * .8 - q * s * .3, s * (.06 + q * .08), "#120806", (1 - q) * .45); }
  groundGlow(f, mid, 1);
  if (v === 3) runeCircle(c, s, t, outer, core, s * .38, .95);
  add(c); glowDot(c, 0, gy - H * .35, s * .38, outer, .55); norm(c);
  if (v === 1) { flameStack(f, -s * .14, gy, s * .08, H * .6, cols, 4); flameStack(f, s * .14, gy, s * .08, H * .55, cols, 7); }
  flameStack(f, 0, gy, s * .15, H, cols);
  if (v === 5) { // draconic: a dragon head forms out of the flame column
    c.save(); c.translate(0, gy - H * .9); const o = .5 + .5 * Math.sin(t * 2.4); c.fillStyle = outer;
    c.beginPath(); c.moveTo(-s * .08, s * .06); c.quadraticCurveTo(-s * .02, -s * .1, s * .14, -s * .05); c.lineTo(s * .17, -s * .01); c.lineTo(s * .05, s * .02); c.closePath(); c.fill();
    c.save(); c.translate(s * .04, s * .02); c.rotate(o * .35); c.beginPath(); c.moveTo(-s * .08, s * .02); c.quadraticCurveTo(s * .04, s * .06, s * .12, s * .01); c.lineTo(0, 0); c.fill(); c.restore();
    c.fillStyle = mid; c.beginPath(); c.moveTo(-s * .04, -s * .05); c.quadraticCurveTo(-s * .12, -s * .16, -s * .18, -s * .12); c.lineTo(-s * .06, -s * .03); c.fill();
    add(c); glowDot(c, s * .07, -s * .045, s * .03, core); for (let i = 0; i < 10; i++) { const q = fr(t * 1.4 + i / 10); teardrop(c, s * (.16 + q * .25), s * (.0 + (rnd(i) - .5) * q * .1), s * .03 * (1 - q * .5), q < .4 ? core : mid, 1.2); } norm(c); c.restore();
  }
  add(c); const N = 28 + p * 4, rate = v === 4 ? .5 : .95;
  for (let i = 0; i < N; i++) { const life = fr(t * rate + rnd(i)); const x0 = (rnd(i + 99) - .5) * s * .28; const x = x0 * (1 - life * .5) + Math.sin(t * 3 + i) * s * .05 * life; const y = gy - s * .02 - life * H * 1.15; const rad = s * .045 * (1 - life) * (.5 + rnd(i + 7)); c.globalAlpha = Math.min(1, (1 - life) * 1.5); teardrop(c, x, y, rad, life < .2 ? core : life < .5 ? mid : outer); }
  c.globalAlpha = 1; for (let i = 0; i < 12 + p * 2; i++) { const life = fr(t * .45 + rnd(i + 300)); const x = (rnd(i + 301) - .5) * s * .5 + Math.sin(t * 2 + i) * s * .04; glowDot(c, x, gy - life * s * .7, s * .014 * (1 - life) + 1, core, 1 - life); }
  norm(c);
  if (v === 4) { c.save(); c.translate(0, gy - H * .4); c.rotate(t * .3); c.strokeStyle = rgba(core, .35); c.setLineDash([3, 9]); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, s * .3, 0, TAU); c.stroke(); c.setLineDash([]); c.restore(); }
}

// ---------------------------------------------------------------- lightning
function mpd(x0: number, y0: number, x1: number, y1: number, disp: number, rnd: (i: number) => number, seed: number, depth = 5) {
  let pts: [number, number][] = [[x0, y0], [x1, y1]]; let d = disp, si = seed;
  for (let k = 0; k < depth; k++) { const nx: [number, number][] = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i]!, [bx, by] = pts[i + 1]!; const px = -(by - ay), py = bx - ax, l = Math.hypot(px, py) || 1, o = (rnd(si++) - .5) * d; nx.push([ax, ay], [(ax + bx) / 2 + px / l * o, (ay + by) / 2 + py / l * o]); } nx.push(pts[pts.length - 1]!); pts = nx; d *= .55; }
  return pts;
}
function polyline(c: C, pts: [number, number][], w: number, col: string) { c.beginPath(); c.lineWidth = w; c.strokeStyle = col; c.lineJoin = "miter"; pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
type BoltCols = { glow: string; mid: string; core: string; darkCore?: boolean };
function strike(f: PF, x0: number, y0: number, x1: number, y1: number, w: number, cols: BoltCols, seed: number, branches = 2, disp?: number) {
  const { c, rnd } = f; const len = Math.hypot(x1 - x0, y1 - y0); const pts = mpd(x0, y0, x1, y1, disp ?? len * .35, rnd, seed);
  add(c); polyline(c, pts, w * 8, rgba(cols.glow, .14)); polyline(c, pts, w * 3.2, rgba(cols.mid, .75));
  if (!cols.darkCore) polyline(c, pts, w, cols.core); norm(c); if (cols.darkCore) polyline(c, pts, w * 1.1, "#000000");
  for (let b = 0; b < branches; b++) { const idx = Math.floor(rnd(seed + 100 + b) * pts.length * .7); const [px, py] = pts[idx]!; const ang = Math.atan2(y1 - y0, x1 - x0) + (rnd(seed + 200 + b) - .5) * 1.6; const bl = len * (.18 + rnd(seed + 300 + b) * .2); strike(f, px, py, px + Math.cos(ang) * bl, py + Math.sin(ang) * bl, w * .55, cols, seed + 1000 * (b + 1), 0); }
}
function stormCloud(f: PF, col: string, flash: number) {
  const { c, s, t, rnd } = f; for (let i = 0; i < 9; i++) { const x = (i / 8 - .5) * s * .9 + Math.sin(t * .5 + i) * s * .02; const y = -s * .42 + rnd(i + 70) * s * .06; smoke(c, x, y, s * (.1 + rnd(i + 71) * .06), "#05060c", .9); }
  if (flash > 0) { add(c); glowDot(c, 0, -s * .4, s * .5, col, flash * .6); norm(c); }
}
function lightning(f: PF) {
  const { c, t, s, r, v, p, rnd, step } = f; const [a, b, hi] = r.palette; const gy = s * GY;
  const cols: BoltCols = { glow: a, mid: a, core: "#ffffff" }; const burst = fr(t * .9), on = burst < .5, flick = rnd(step) > .35;
  switch (v) {
    case 0: { stormCloud(f, a, on && flick ? 1 : 0); groundGlow(f, a, on ? 1 : .3);
      if (on && flick) { const sx = (rnd(Math.floor(t * .9)) - .5) * s * .3; strike(f, sx, -s * .38, 0, gy, 2.2, cols, step * 17, 3 + Math.floor(p / 3)); add(c); glowDot(c, 0, gy, s * .25, a, .9); glowDot(c, 0, gy, s * .08, "#ffffff"); norm(c);
        for (let i = 0; i < 4; i++) { const q = (rnd(step + i * 3) - .5) * s * .7; strike(f, 0, gy, q, gy + (rnd(i + step) - .5) * s * .05, 1, cols, step * 31 + i, 0, s * .03); } }
      break; }
    case 1: { groundGlow(f, a, .7); add(c); glowDot(c, 0, -s * .05, s * .22, a, .8); glowDot(c, 0, -s * .05, s * .06, "#ffffff"); norm(c);
      const k = 4 + Math.floor(p / 2); for (let i = 0; i < k; i++) { const q = t * 2.5 + i / k * TAU; strike(f, 0, -s * .05, Math.cos(q) * s * .26, -s * .05 + Math.sin(q) * s * .26 * .6, 1.6, cols, step * 11 + i, 1, s * .06); }
      c.save(); c.translate(0, -s * .05); c.rotate(t * 3); c.scale(1, .6); c.strokeStyle = rgba(hi, .8); c.lineWidth = 2; c.setLineDash([s * .06, s * .04]); c.beginPath(); c.arc(0, 0, s * .3, 0, TAU); c.stroke(); c.setLineDash([]); c.restore(); break; }
    case 2: { groundGlow(f, a, .8); const R = s * .22, cy = -s * .06; const g = c.createRadialGradient(0, cy, 0, 0, cy, R); g.addColorStop(0, rgba(hi, .9)); g.addColorStop(.6, rgba(a, .55)); g.addColorStop(1, rgba(b, .1)); c.fillStyle = g; c.beginPath(); c.arc(0, cy, R, 0, TAU); c.fill();
      for (let i = 0; i < 5 + p / 2; i++) { const q0 = rnd(step * 5 + i) * TAU, q1 = q0 + .6 + rnd(step + i) * 1.2; strike(f, Math.cos(q0) * R, cy + Math.sin(q0) * R, Math.cos(q1) * R, cy + Math.sin(q1) * R, 1.4, cols, step * 7 + i, 0, R * .3); }
      for (let i = 0; i < 3; i++) { const q = rnd(step * 2 + i + 50) * TAU; strike(f, Math.cos(q) * R, cy + Math.sin(q) * R, Math.cos(q) * R * 2, cy + Math.sin(q) * R * 2, 1.2, cols, step * 3 + i, 1); } break; }
    case 3: { // Red Lightning — Dorian's apex: black core, crimson destruction
      if (on && flick) { c.fillStyle = rgba(a, .12); c.fillRect(-s, -s, s * 2, s * 2); }
      groundGlow(f, a, 1); const cy = -s * .08; add(c); glowDot(c, 0, cy, s * .36, a, .8); norm(c); disc(c, 0, cy, s * .1, "#000000");
      c.strokeStyle = a; c.lineWidth = 3; c.beginPath(); c.arc(0, cy, s * .1 + Math.sin(t * 9) * 1.5, 0, TAU); c.stroke();
      const dc: BoltCols = { glow: a, mid: a, core: "#000", darkCore: true };
      for (let i = 0; i < 6 + Math.floor(p / 2); i++) { const q = rnd(step * 9 + i) * TAU; const L = s * (.3 + rnd(step + i * 5) * .18); strike(f, Math.cos(q) * s * .1, cy + Math.sin(q) * s * .1, Math.cos(q) * L, Math.max(cy + Math.sin(q) * L, -s * .48), 2.8, dc, step * 19 + i, 2); }
      for (let i = 0; i < 5; i++) { const x = (rnd(i + 900) - .5) * s * .8; strike(f, x * .3, gy, x, gy + s * .03, 1.2, dc, 777 + i, 0, s * .03); } break; }
    case 4: { // Crimson Astrapo — red lightning variant: crimson spear wrapped in twin helix bolts
      groundGlow(f, a, .9); runeCircle(c, s, t, a, hi, s * .3, .6); const top = -s * .44;
      add(c); const g = c.createLinearGradient(0, gy, 0, top); g.addColorStop(0, rgba(a, .9)); g.addColorStop(1, rgba(a, 0)); c.fillStyle = g; c.fillRect(-s * .025, top, s * .05, gy - top); c.fillStyle = rgba(hi, .9); c.fillRect(-s * .006, top, s * .012, gy - top); norm(c);
      for (const sgn of [1, -1]) { const pts: [number, number][] = []; for (let i = 0; i <= 40; i++) { const k = i / 40, y = lerp(gy, top, k); pts.push([Math.sin(k * 14 + t * 9 * sgn) * s * .07 * (1 - k * .5) + (rnd(step * 40 + i) - .5) * s * .015, y]); }
        add(c); polyline(c, pts, 10, rgba(a, .15)); polyline(c, pts, 3.5, rgba(a, .85)); polyline(c, pts, 1.2, hi); norm(c); }
      for (let i = 0; i < 5; i++) { const q = -Math.PI / 2 + (i - 2) * .5; strike(f, 0, top + s * .04, Math.cos(q) * s * .14, top + s * .04 + Math.sin(q) * s * .1, 1.2, { glow: a, mid: a, core: hi }, step * 3 + i, 0, s * .03); } break; }
    case 5: { // White Lightning Drive — Weston's speed form
      groundGlow(f, "#e2e8f0", .5); const q = fr(t * .7), x = lerp(-s * .48, s * .48, ease(q * 1.15));
      add(c); for (let i = 0; i < 14; i++) { c.fillStyle = rgba(hi, .5 * (1 - i / 14)); c.fillRect(x - s * (.05 + i * .045), gy - s * (.04 + rnd(i) * .3), s * .2, 1.5); } norm(c);
      for (let i = 5; i >= 1; i--) { c.globalAlpha = .12 * (6 - i) / 6; humanoid(c, x - i * s * .07, gy, s * .32, "#e2e8f0", .55, .25); } c.globalAlpha = 1;
      c.shadowColor = "#ffffff"; c.shadowBlur = 16; humanoid(c, x, gy, s * .32, "#1e2433", .55, .25); c.shadowBlur = 0;
      for (let i = 0; i < 3; i++) strike(f, x - s * .38, gy - s * (.06 + i * .09), x, gy - s * (.08 + i * .08), 1.3, { glow: "#ffffff", mid: "#cbd5e1", core: "#ffffff" }, step * 13 + i, 1, s * .04);
      add(c); glowDot(c, x + s * .03, gy - s * .15, s * .12, "#ffffff", .8); norm(c); break; }
    default: { // hyperkinesis and unknown lightning
      groundGlow(f, a, .7); const pts: [number, number][] = []; for (let i = 0; i < 6; i++) pts.push([lerp(-s * .4, s * .4, i / 5), gy - s * (.1 + (i % 2) * .2)]);
      const k = fr(t * .8) * 5, i0 = Math.floor(k), [x0, y0] = pts[i0]!, [x1, y1] = pts[Math.min(5, i0 + 1)]!, x = lerp(x0, x1, k - i0), y = lerp(y0, y1, k - i0);
      for (let i = 0; i < i0 + 1 && i < 5; i++) { const [ax, ay] = pts[i]!, [bx, by] = i === i0 ? [x, y] : pts[i + 1]!; strike(f, ax, ay, bx, by, 1.4, cols, step * 5 + i, 0, s * .04); }
      add(c); glowDot(c, x, y, s * .1, a); norm(c); c.shadowColor = a; c.shadowBlur = 12; humanoid(c, x, y + s * .12, s * .2, "#141820", .4, .5); c.shadowBlur = 0;
    }
  }
}

// ---------------------------------------------------------------- wind
function windBlade(c: C, cx: number, cy: number, R: number, a0: number, sweep: number, th: number, col: string, hi: string, alpha = 1) {
  const mid = a0 + sweep / 2; c.globalAlpha = alpha;
  c.beginPath(); c.arc(cx, cy, R, a0, a0 + sweep); c.arc(cx + Math.cos(mid) * th, cy + Math.sin(mid) * th, R, a0 + sweep, a0, true); c.closePath(); c.fillStyle = col; c.fill();
  c.beginPath(); c.arc(cx, cy, R, a0 + sweep * .15, a0 + sweep * .85); c.arc(cx + Math.cos(mid) * th * .35, cy + Math.sin(mid) * th * .35, R, a0 + sweep * .85, a0 + sweep * .15, true); c.closePath(); c.fillStyle = hi; c.fill(); c.globalAlpha = 1;
}
function leaf(c: C, x: number, y: number, sz: number, rot: number, col: string) { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo(-sz, 0); c.quadraticCurveTo(0, -sz * .6, sz, 0); c.quadraticCurveTo(0, sz * .6, -sz, 0); c.fillStyle = col; c.fill(); c.restore(); }
function tornado(f: PF, h: number, rTop: number, rBot: number, a: string, hi: string) {
  const { c, s, t, rnd } = f; const gy = s * GY;
  for (let i = 0; i < 16; i++) { const k = i / 15, y = gy - k * h, rr = lerp(rBot, rTop, Math.pow(k, 1.3)) + Math.sin(t * 3 + k * 5) * s * .01, sx = Math.sin(t * 1.5 + k * 3) * s * .04 * k;
    c.save(); c.translate(sx, y); c.scale(1, .28); c.strokeStyle = rgba(i % 2 ? a : hi, .35 + .5 * (1 - k)); c.lineWidth = 3.5 - k * 1.5; c.setLineDash([rr * .9, rr * .5]); c.lineDashOffset = -t * 160 * (1 + k); c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke(); c.restore(); }
  c.setLineDash([]);
  for (let i = 0; i < 18; i++) { const k = rnd(i + 60), y = gy - k * h, rr = lerp(rBot, rTop, k) * 1.1, q = t * 4 * (1 + rnd(i)) + i; leaf(c, Math.cos(q) * rr, y + Math.sin(q) * rr * .28, s * .012, q, i % 3 ? hi : "#8b6b3e"); }
}
function wind(f: PF) {
  const { c, t, s, r, v, rnd } = f; const [a, b, hi] = r.palette; const gy = s * GY;
  groundGlow(f, a, .55);
  switch (v) {
    case 0: tornado(f, s * .62, s * .26, s * .05, a, hi); add(c); for (let i = 0; i < 3; i++) { const q = t * 2.4 + i * TAU / 3; c.save(); c.translate(0, gy - s * .25); c.scale(1, .45); windBlade(c, 0, 0, s * .32, q, 1.1, s * .04, rgba(a, .7), rgba("#ffffff", .8)); c.restore(); } norm(c); break;
    case 1: for (let i = 0; i < 3; i++) { const q = fr(t * .9 + i / 3), x = lerp(-s * .35, s * .5, ease(q)); add(c); windBlade(c, x - s * .2, -s * .05 + (i - 1) * s * .14, s * .2, -.9, 1.8, s * .045, rgba(a, .9), rgba("#ffffff", .9), 1 - q * q); norm(c);
        c.strokeStyle = rgba(hi, .5 * (1 - q)); c.lineWidth = 1.5; for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(x - s * .5, -s * .05 + (i - 1) * s * .14 + (j - 1.5) * s * .025); c.lineTo(x - s * .05, -s * .05 + (i - 1) * s * .14 + (j - 1.5) * s * .02); c.stroke(); } }
      humanoid(c, -s * .38, gy, s * .3, "#04110c", 0, .55); break;
    case 3: { // Sky guardian: wings of sky-current and rising spiral
      const flap = Math.sin(t * 2) * .15; add(c);
      for (const sg of [1, -1]) for (let i = 0; i < 6; i++) { c.save(); c.translate(0, -s * .12); c.scale(sg, 1); c.rotate(-.9 + i * .22 + flap); windBlade(c, s * .08, 0, s * (.18 + i * .03), -1.3, 1.4, s * .03, rgba(i % 2 ? a : hi, .55), rgba("#ffffff", .6)); c.restore(); }
      norm(c); tornado(f, s * .5, s * .14, s * .04, a, hi); break; }
    default: { // gentle wind streams
      add(c); for (let i = 0; i < 7; i++) { c.beginPath(); const y0 = -s * .25 + i * s * .08; for (let k = 0; k <= 30; k++) { const x = lerp(-s * .5, s * .5, k / 30); const y = y0 + Math.sin(k / 30 * 6 + t * 3 + i) * s * .04; k ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.strokeStyle = rgba(i % 2 ? a : hi, .55); c.lineWidth = 2 + (i % 3); c.setLineDash([s * .18, s * .12]); c.lineDashOffset = -t * 200 - i * 40; c.stroke(); } c.setLineDash([]); norm(c);
      for (let i = 0; i < 12; i++) { const q = fr(t * .4 + rnd(i)), x = lerp(-s * .5, s * .5, q); leaf(c, x, -s * .25 + rnd(i + 5) * s * .5 + Math.sin(q * 9) * s * .04, s * .015, q * 12, i % 2 ? hi : b); } }
  }
}

// ---------------------------------------------------------------- water
function water(f: PF) {
  const { c, t, s, r, v, p, rnd } = f; const [a, b, hi] = r.palette; const gy = s * GY; groundGlow(f, a, .8);
  const drops = (n: number, y0: number) => { for (let i = 0; i < n; i++) { const q = fr(t * .8 + rnd(i)), vx = (rnd(i + 10) - .5) * s * .7, vy = -s * (.45 + rnd(i + 20) * .4); teardrop(c, vx * q, y0 + vy * q + s * 1.1 * q * q, s * .012 * (1 - q * .5), i % 3 ? a : hi, 1.6); } };
  if (v === 0) { const cy = gy - s * .2, R = s * .3; const g = c.createRadialGradient(0, cy - R * .3, 0, 0, cy, R); g.addColorStop(0, rgba(hi, .35)); g.addColorStop(.8, rgba(a, .25)); g.addColorStop(1, rgba(a, .6)); c.fillStyle = g; c.beginPath(); c.arc(0, cy, R, Math.PI, 0); c.lineTo(R, gy); c.lineTo(-R, gy); c.fill();
    c.save(); c.beginPath(); c.arc(0, cy, R, Math.PI, 0); c.lineTo(R, gy); c.lineTo(-R, gy); c.clip(); for (let i = 0; i < 6; i++) { c.beginPath(); for (let k = 0; k <= 30; k++) { const x = lerp(-R, R, k / 30); const y = cy - R + i * R * .25 + Math.sin(k / 30 * 8 + t * 3 + i) * s * .015; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.strokeStyle = rgba(hi, .45); c.lineWidth = 2; c.stroke(); } c.restore();
    c.strokeStyle = rgba(hi, .9); c.lineWidth = 2.5; c.beginPath(); c.arc(0, cy, R, Math.PI, 0); c.stroke(); drops(14, gy); return; }
  if (v === 1) { humanoid(c, -s * .36, gy, s * .3, "#03131c", 0, .6); const pts: [number, number][] = []; for (let k = 0; k <= 40; k++) { const q = k / 40; pts.push([lerp(-s * .3, s * .45, q), -s * .14 + Math.sin(q * 5 - t * 6) * s * .14 * q]); }
    for (const [w, col] of [[s * .05, b], [s * .035, a], [s * .012, hi]] as const) { c.beginPath(); pts.forEach(([x, y], i) => { const ww = w * (1 - i / 50); i ? c.lineTo(x, y - ww) : c.moveTo(x, y - ww); }); for (let i = pts.length - 1; i >= 0; i--) { const [x, y] = pts[i]!; c.lineTo(x, y + w * (1 - i / 50)); } c.closePath(); c.fillStyle = col; c.fill(); }
    const [ex, ey] = pts[pts.length - 1]!; for (let i = 0; i < 8; i++) { const q = fr(t * 1.5 + i / 8); disc(c, ex + Math.cos(i) * q * s * .08, ey + Math.sin(i * 2) * q * s * .08, s * .01 * (1 - q), hi); } return; }
  const ph = fr(t * .6), H = s * (.35 + p * .02) * Math.sin(ph * Math.PI);
  c.beginPath(); c.moveTo(-s * .1, gy); for (let k = 0; k <= 20; k++) { const q = k / 20; c.lineTo(-s * .1 * (1 - q * .5) + Math.sin(q * 8 + t * 6) * s * .015, gy - H * q); }
  for (let k = 0; k < 7; k++) { const q = k / 6; c.lineTo(lerp(-s * .05, s * .05, q), gy - H - (k % 2 ? s * .06 : 0) * Math.sin(ph * Math.PI)); }
  for (let k = 20; k >= 0; k--) { const q = k / 20; c.lineTo(s * .1 * (1 - q * .5) + Math.sin(q * 8 + t * 6 + 2) * s * .015, gy - H * q); }
  c.closePath(); const g = c.createLinearGradient(0, gy, 0, gy - H); g.addColorStop(0, b); g.addColorStop(.6, a); g.addColorStop(1, hi); c.fillStyle = g; c.fill(); c.strokeStyle = rgba(hi, .9); c.lineWidth = 2; c.stroke();
  for (let i = 0; i < 6; i++) { const k = (i - 2.5) * s * .06; c.beginPath(); c.moveTo(k, gy); c.quadraticCurveTo(k * 2, gy - s * .08 * Math.sin(ph * Math.PI), k * 3, gy); c.strokeStyle = rgba(hi, .8); c.lineWidth = 2; c.stroke(); }
  drops(18 + p * 2, gy - H * .9);
}

// ---------------------------------------------------------------- earth
function earth(f: PF) {
  const { c, t, s, r, v, p, rnd } = f; const [a, b, hi] = r.palette; const gy = s * GY; const ph = fr(t * .35);
  groundGlow(f, a, .5);
  const spike = (x: number, h: number, w: number, lean: number) => { if (h <= 1) return; const px = x + lean * w; c.beginPath(); c.moveTo(x - w, gy); c.lineTo(px, gy - h); c.lineTo(x + w * .15, gy); c.fillStyle = a; c.fill(); c.beginPath(); c.moveTo(x + w * .15, gy); c.lineTo(px, gy - h); c.lineTo(x + w, gy); c.fillStyle = b; c.fill(); c.strokeStyle = rgba(hi, .6); c.lineWidth = 1; c.beginPath(); c.moveTo(x - w, gy); c.lineTo(px, gy - h); c.stroke(); };
  if (v === 0) { for (let i = 0; i < 8; i++) { const q = i / 8 * TAU + t * .2, z = Math.sin(q); if (z > 0) continue; const h = s * .2 * backOut((ph - i * .03) * 4); c.globalAlpha = .7; spike(Math.cos(q) * s * .34, h, s * .04, 0); }
    c.globalAlpha = 1; for (let i = 0; i < 7; i++) { const q = t * .8 + i / 7 * TAU; c.save(); c.translate(Math.cos(q) * s * .32, gy - s * .3 + Math.sin(q) * s * .06 + Math.sin(t * 2 + i) * s * .02); c.rotate(q); c.fillStyle = i % 2 ? a : b; c.beginPath(); c.moveTo(-s * .03, -s * .02); c.lineTo(s * .02, -s * .03); c.lineTo(s * .035, s * .015); c.lineTo(-s * .01, s * .03); c.fill(); c.restore(); }
    for (let i = 0; i < 8; i++) { const q = i / 8 * TAU + t * .2; if (Math.sin(q) <= 0) continue; spike(Math.cos(q) * s * .34, s * .22 * backOut((ph - i * .03) * 4), s * .045, 0); } return; }
  const n = 5 + Math.floor(p / 2);
  for (let i = 0; i < 6; i++) smoke(c, (rnd(i) - .5) * s * .8, gy - s * .03, s * (.07 + ph * .1), a, .3 * (1 - ph));
  for (let i = 0; i < n; i++) { const d = i * .06, q = backOut((ph - d) * 4) * (1 - ease((ph - .8) * 5)); spike((i / (n - 1) - .5) * s * .75, s * (.14 + .16 * rnd(i + 3)) * q, s * .05, (rnd(i + 8) - .5)); }
  for (let i = 0; i < 16; i++) { const q = clamp((ph - .05) * 1.6), vx = (rnd(i + 30) - .5) * s * .8, vy = -s * (.4 + rnd(i + 31) * .3); c.fillStyle = i % 2 ? a : b; c.fillRect(vx * q, gy + vy * q + s * .9 * q * q, s * .018, s * .018); }
}

// ---------------------------------------------------------------- nature
function petal(c: C, len: number, wid: number, col: string) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(wid, -len * .5, 0, -len); c.quadraticCurveTo(-wid, -len * .5, 0, 0); c.fillStyle = col; c.fill(); }
function lotus(c: C, x: number, y: number, sz: number, open: number, a: string, hi: string) {
  c.save(); c.translate(x, y); for (const [n, l, col] of [[8, 1, a], [6, .78, hi], [4, .5, "#ffffff"]] as const) for (let i = 0; i < n; i++) { const q = (i / (n - 1) - .5) * Math.PI * .95 * open; c.save(); c.rotate(q); petal(c, sz * l, sz * .28, rgba(col, .85)); c.restore(); } c.restore();
}
function nature(f: PF) {
  const { c, t, s, r, v, rnd } = f; const [a, b, hi] = r.palette; const gy = s * GY; groundGlow(f, a, .7); const ph = fr(t * .3);
  for (let i = 0; i < 6; i++) { const x0 = (i - 2.5) * s * .1, grow = ease(ph * 2.2 - i * .05); c.beginPath(); c.moveTo(x0, gy); c.bezierCurveTo(x0 + Math.sin(i) * s * .2, gy - s * .2, x0 - Math.cos(i) * s * .2, gy - s * .35, x0 + Math.sin(t + i) * s * .1, gy - s * .5); c.strokeStyle = b; c.lineWidth = 4; c.setLineDash([s * .8 * grow, s * 2]); c.stroke(); c.strokeStyle = a; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]); }
  add(c); glowDot(c, 0, gy - s * .12, s * .3, a, .5); norm(c);
  lotus(c, 0, gy - s * .02, s * (v === 0 ? .26 : .18), ease(ph * 2), a, hi);
  for (let i = 0; i < 20; i++) { const q = fr(t * .35 + rnd(i)), ang = t * 1.2 + i; leaf(c, Math.cos(ang) * s * (.1 + q * .3), gy - s * .05 - q * s * .55, s * .016, ang, i % 3 ? a : hi); }
  if (v === 0) { c.save(); c.translate(0, gy - s * .25); c.rotate(t * .5); for (let i = 0; i < 2; i++) { c.rotate(Math.PI); c.beginPath(); for (let k = 0; k <= 30; k++) { const q = k / 30 * Math.PI * 1.6; c.lineTo(Math.cos(q) * s * .3 * (k / 30), Math.sin(q) * s * .3 * (k / 30)); } c.strokeStyle = rgba(hi, .7); c.lineWidth = 3; c.stroke(); } c.restore(); }
}

// ---------------------------------------------------------------- guardians
export function guardianAura(f: PF, under: boolean) {
  const { c, s, t, r } = f; const [a, , hi] = r.palette; const gy = s * GY;
  if (under) {
    runeCircle(c, s, t, a, hi, s * .44, .95);
    add(c); const g = c.createLinearGradient(0, gy, 0, -s * .5); g.addColorStop(0, rgba(a, .14)); g.addColorStop(1, rgba(a, 0)); c.fillStyle = g;
    for (let i = 1; i <= 5; i++) { const w = s * .03 * i; c.fillRect(-w, -s * .5, w * 2, gy + s * .5); }
    c.shadowColor = a; c.shadowBlur = 24; c.globalAlpha = .3 + .08 * Math.sin(t * 2); const bob = Math.sin(t * 1.2) * s * .015; const hd = humanoid(c, 0, gy - s * .08 + bob, s * .55, rgba(a, .35), 0, .75 + Math.sin(t) * .05, true);
    c.globalAlpha = 1; c.save(); c.translate(hd.hx, hd.hy - hd.u * 1.6); c.scale(1, .3); c.strokeStyle = rgba(hi, .9); c.lineWidth = 2; c.beginPath(); c.arc(0, 0, hd.u * 1.6, 0, TAU); c.stroke(); c.restore(); c.shadowBlur = 0; norm(c);
  } else {
    add(c); for (let i = 0; i < 18; i++) { const q = i / 18 * TAU + t * .5; glowDot(c, Math.cos(q) * s * .38, gy - s * .14 + Math.sin(q) * s * .08 - (i % 4) * s * .06, s * .022, i % 2 ? a : hi, .9); }
    for (const sg of [1, -1]) { c.beginPath(); for (let k = 0; k <= 40; k++) { const q = k / 40; const ang = sg * (q * TAU * 1.5 + t); c.lineTo(Math.cos(ang) * s * .3 * (1 - q * .5), gy - q * s * .7 + Math.sin(ang) * s * .05); } c.strokeStyle = rgba(hi, .55); c.lineWidth = 2; c.stroke(); } norm(c);
  }
}

export const PAINT: Partial<Record<FxMotif, (f: PF) => void>> = { flame, lightning, wind, water, earth, nature, beast };
