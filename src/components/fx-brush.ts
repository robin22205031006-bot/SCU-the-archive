/** Painted brush-stroke FX (dark edges, bright cores, shard break-up) plus painters for the remaining motifs. Browser-only (canvas). */
import type { FxMotif } from "@/lib/ability-fx";
import { glowDot, humanoid, rankLevel, rgba, runeCircle, type PF } from "@/components/fx-painters";

type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const fr = (x: number) => x - Math.floor(x);
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const add = (c: C) => {
  c.globalCompositeOperation = "lighter";
};
const norm = (c: C) => {
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1;
};
const GY = 0.3;

/** Mixes a hex colour toward black (k<0) or white (k>0). */
export function shade(hex: string, k: number) {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  const n = parseInt(h.slice(0, 6), 16) || 0,
    t = k < 0 ? 0 : 255,
    a = Math.abs(k);
  const ch = (v: number) =>
    Math.round(lerp(v, t, a))
      .toString(16)
      .padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

export interface Ink {
  edge: string;
  mid: string;
  core: string;
}
export const inkOf = (pal: [string, string, string]): Ink => ({
  edge: shade(pal[1], -0.55),
  mid: pal[0],
  core: pal[2],
});

function band(
  c: C,
  cx: number,
  cy: number,
  R: number,
  a0: number,
  sweep: number,
  th: number,
  u0: number,
  u1: number,
  w: number,
) {
  const N = 28;
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const u = lerp(u0, u1, i / N),
      a = a0 + sweep * u;
    c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  }
  for (let i = N; i >= 0; i--) {
    const u = lerp(u0, u1, i / N),
      a = a0 + sweep * u,
      k = Math.sin(Math.PI * clamp(u)) * th * w;
    c.lineTo(cx + Math.cos(a) * (R - k), cy + Math.sin(a) * (R - k));
  }
  c.closePath();
}
/** A painted crescent: grows to `grow` (0..1) and dissolves from the tail at `fade` (0..1) into shards. */
export function paintedArc(
  c: C,
  cx: number,
  cy: number,
  R: number,
  a0: number,
  sweep: number,
  th: number,
  ink: Ink,
  grow: number,
  fade = 0,
  seed = 1,
) {
  const u1 = clamp(grow),
    u0 = clamp(fade);
  if (u1 <= u0) return;
  c.save();
  norm(c);
  c.globalAlpha = 0.92;
  band(c, cx, cy, R, a0, sweep, th, u0, u1, 1);
  c.fillStyle = ink.edge;
  c.fill();
  add(c);
  c.globalAlpha = 0.9;
  band(c, cx, cy, R - th * 0.08, a0, sweep, th, u0 + (u1 - u0) * 0.05, u1, 0.72);
  c.fillStyle = ink.mid;
  c.fill();
  c.globalAlpha = 1;
  band(c, cx, cy, R - th * 0.14, a0, sweep, th, u0 + (u1 - u0) * 0.15, u1 - (u1 - u0) * 0.05, 0.32);
  c.fillStyle = ink.core;
  c.fill();
  // streak hatching inside the stroke for a hand-painted feel
  c.strokeStyle = rgba(ink.core, 0.55);
  c.lineWidth = 1.2;
  for (let j = 0; j < 5; j++) {
    const rr = R - th * (0.15 + j * 0.12);
    c.beginPath();
    c.arc(cx, cy, rr, a0 + sweep * (u0 + (u1 - u0) * (0.2 + j * 0.1)), a0 + sweep * u1, sweep < 0);
    c.stroke();
  }
  // shards breaking off the tail
  if (u0 > 0)
    for (let i = 0; i < 10; i++) {
      const r1 = (Math.sin(i * 91.7 + seed) * 43758.5) % 1,
        rr = Math.abs(r1),
        u = u0 - rr * 0.2,
        a = a0 + sweep * u,
        d = (u0 - u) * R * 1.4 + rr * th;
      const x = cx + Math.cos(a) * (R + d * 0.6),
        y = cy + Math.sin(a) * (R + d * 0.6),
        z = th * (0.18 - rr * 0.12);
      if (z <= 0) continue;
      c.globalAlpha = clamp(1 - u0);
      c.fillStyle = i % 3 ? ink.mid : ink.core;
      c.beginPath();
      c.moveTo(x, y - z);
      c.lineTo(x + z * 0.5, y);
      c.lineTo(x, y + z * 0.4);
      c.lineTo(x - z * 0.5, y);
      c.closePath();
      c.fill();
    }
  glowDot(
    c,
    cx + Math.cos(a0 + sweep * u1) * (R - th * 0.2),
    cy + Math.sin(a0 + sweep * u1) * (R - th * 0.2),
    th * 1.1,
    ink.core,
    0.7,
  );
  c.restore();
}
/** Cyclic helper: grows over the first half of q, dissolves over the second. */
export function arcCycle(
  c: C,
  q: number,
  cx: number,
  cy: number,
  R: number,
  a0: number,
  sweep: number,
  th: number,
  ink: Ink,
  seed = 1,
) {
  paintedArc(c, cx, cy, R, a0, sweep, th, ink, ease(q * 2.2), clamp((q - 0.45) * 1.9), seed);
}
/** Several crescents spinning around a point, squashed into an orbit (wind / blood / chaos swirls). */
export function swirl(
  c: C,
  t: number,
  cx: number,
  cy: number,
  R: number,
  n: number,
  ink: Ink | Ink[],
  squash = 0.55,
  spin = 2.2,
  th = 0.18,
) {
  c.save();
  c.translate(cx, cy);
  c.scale(1, squash);
  for (let i = 0; i < n; i++) {
    const q = fr(t * 0.7 + i / n),
      k = Array.isArray(ink) ? ink[i % ink.length]! : ink;
    arcCycle(
      c,
      q,
      0,
      0,
      R * (0.7 + 0.3 * Math.sin(i * 2.1)),
      t * spin + (i * TAU) / n,
      2.4,
      R * th,
      k,
      i + 3,
    );
  }
  c.restore();
}
/** Dust puffs + flying debris + upward spikes at a ground point. */
export function groundBurst(
  c: C,
  x: number,
  gy: number,
  s: number,
  k: number,
  ink: Ink,
  dust = "#b9a98a",
  spikes = 7,
) {
  const q = clamp(k);
  if (q <= 0 || q >= 1) return;
  c.save();
  norm(c);
  for (let i = 0; i < 9; i++) {
    const sd = (i - 4) / 4,
      r = s * (0.05 + 0.04 * Math.abs(Math.sin(i * 3.3))) * (0.6 + q),
      px = x + sd * s * 0.3 * ease(q),
      py = gy - s * 0.03 * Math.abs(Math.cos(i)) - q * s * 0.04;
    c.globalAlpha = 0.5 * (1 - q);
    c.fillStyle = dust;
    c.beginPath();
    c.ellipse(px, py, r * 1.4, r, 0, 0, TAU);
    c.fill();
  }
  for (let i = 0; i < spikes; i++) {
    const sd = (i - (spikes - 1) / 2) / spikes,
      h = s * (0.18 + 0.14 * Math.abs(Math.sin(i * 7.1))) * Math.sin(Math.PI * q),
      w = s * 0.03,
      px = x + sd * s * 0.32;
    c.globalAlpha = 1;
    c.fillStyle = ink.edge;
    c.beginPath();
    c.moveTo(px - w, gy);
    c.lineTo(px + sd * s * 0.05, gy - h);
    c.lineTo(px + w, gy);
    c.closePath();
    c.fill();
    add(c);
    c.fillStyle = ink.mid;
    c.beginPath();
    c.moveTo(px - w * 0.55, gy);
    c.lineTo(px + sd * s * 0.05, gy - h * 0.9);
    c.lineTo(px + w * 0.55, gy);
    c.closePath();
    c.fill();
    c.fillStyle = ink.core;
    c.beginPath();
    c.moveTo(px - w * 0.2, gy);
    c.lineTo(px + sd * s * 0.05, gy - h * 0.7);
    c.lineTo(px + w * 0.2, gy);
    c.closePath();
    c.fill();
    norm(c);
  }
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI * (0.1 + 0.8 * Math.abs(Math.sin(i * 5.7))),
      d = s * 0.35 * ease(q),
      px = x + Math.cos(a) * d,
      py = gy + Math.sin(a) * d + q * q * s * 0.25;
    c.globalAlpha = 1 - q;
    c.fillStyle = i % 2 ? "#2a2018" : ink.mid;
    c.fillRect(px, py, s * 0.012, s * 0.012);
  }
  glowDot(c, x, gy - s * 0.04, s * 0.3 * (1 - q), ink.core, 0.8);
  c.restore();
}
/** Straight painted streak (spear dash, thrown energy), tip at (x,y), pointing along dir. */
export function streak(
  c: C,
  x: number,
  y: number,
  len: number,
  th: number,
  dir: number,
  ink: Ink,
  t: number,
) {
  c.save();
  c.translate(x, y);
  c.scale(dir, 1);
  const body = (w: number, col: string, a: number, l: number) => {
    c.globalAlpha = a;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(-l * 0.3, -th * w, -l, -th * w * 0.1);
    c.lineTo(-l, th * w * 0.1);
    c.quadraticCurveTo(-l * 0.3, th * w, 0, 0);
    c.fill();
  };
  norm(c);
  body(1, ink.edge, 0.9, len);
  add(c);
  body(0.7, ink.mid, 0.9, len * 0.92);
  body(0.3, ink.core, 1, len * 0.8);
  c.strokeStyle = rgba(ink.core, 0.8);
  c.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const yy = (i - 2.5) * th * 0.4,
      o = fr(t * 3 + i * 0.37) * len;
    c.beginPath();
    c.moveTo(-o, yy);
    c.lineTo(-o - len * 0.25, yy * 1.4);
    c.stroke();
  }
  c.restore();
  norm(c);
}
function column(c: C, s: number, t: number, ink: Ink, h: number, w: number) {
  add(c);
  for (let i = 0; i < 9; i++) {
    const x = ((i - 4) / 4) * w,
      q = fr(t * 1.2 + i * 0.23),
      hh = h * (0.5 + 0.5 * Math.abs(Math.sin(i * 2.7)));
    const g = c.createLinearGradient(0, s * GY, 0, s * GY - hh);
    g.addColorStop(0, rgba(ink.mid, 0.8));
    g.addColorStop(1, rgba(ink.core, 0));
    c.fillStyle = g;
    c.fillRect(x - w * 0.06, s * GY - hh, w * 0.12, hh);
    glowDot(c, x, s * GY - hh * q, s * 0.02, ink.core, 1 - q);
  }
  norm(c);
}

// ---------------------------------------------------------------- painters
const cyc = (f: PF, mul = 1) => fr(f.t / (f.r.tempo * mul));

function blade(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f, 0.8),
    amp = 0.72 + rk * 0.08;
  if (r.key === "gladiokinesis" || v === 0) {
    const blades = 2 + rk;
    for (let i = 0; i < blades; i++) {
      const a = t * 1.6 + (i * TAU) / blades,
        x = Math.cos(a) * s * 0.3,
        y = -s * 0.05 + Math.sin(a) * s * 0.12;
      streak(c, x, y, s * (0.14 + rk * 0.02), s * 0.024, Math.sin(a) > 0 ? -1 : 1, ink, t);
    }
    arcCycle(c, q, 0, 0, s * 0.35 * amp, -2.4, 2.8, s * 0.08, ink, 9);
    return;
  }
  if (v === 1) {
    // Assassin: stealth cloak fade -> single razor-thin crimson iaijutsu line -> sheath spark
    const stealth = clamp(q < 0.25 ? 1 - q * 3 : q > 0.7 ? (q - 0.7) * 3 : 0.25);
    c.save();
    c.globalAlpha = stealth * 0.7;
    humanoid(c, -s * 0.12, s * GY, s * 0.38, "#05070d", 0.15, 0.8);
    c.restore();
    const cutProg = clamp((q - 0.18) * 3.5);
    if (cutProg > 0 && q < 0.88) {
      const fadeOut = q > 0.55 ? 1 - (q - 0.55) / 0.33 : 1;
      const len = s * (0.36 + rk * 0.045) * ease(cutProg);
      c.save();
      c.translate(0, -s * 0.05);
      c.rotate(-0.34);
      add(c);
      c.strokeStyle = rgba(ink.core, 0.92 * fadeOut);
      c.lineWidth = (1.6 + rk * 0.45) * fadeOut;
      c.beginPath();
      c.moveTo(-len, 0);
      c.lineTo(len, 0);
      c.stroke();
      c.strokeStyle = rgba("#ffffff", 0.9 * fadeOut);
      c.lineWidth = Math.max(1, 1.2 * fadeOut);
      c.beginPath();
      c.moveTo(-len * 0.85, 0);
      c.lineTo(len * 0.85, 0);
      c.stroke();
      if (rk >= 3) {
        const secondary = rk - 2;
        for (let i = 1; i <= secondary; i++) {
          c.strokeStyle = rgba(ink.mid, 0.55 * fadeOut);
          c.lineWidth = 1.2;
          c.beginPath();
          c.moveTo(-len * 0.65, i * s * 0.028 * (i % 2 ? 1 : -1));
          c.lineTo(len * 0.65, -i * s * 0.022 * (i % 2 ? 1 : -1));
          c.stroke();
        }
      }
      glowDot(c, len * 0.9, 0, s * (0.045 + rk * 0.01) * fadeOut, ink.core, fadeOut);
      norm(c);
      c.restore();
    }
    return;
  }
  if (v === 2) {
    // Swordsman: disciplined single clean crescent slash + fading sword afterimage + guard glint
    humanoid(c, -s * 0.1, s * GY, s * 0.38, "#0c1018", 0.18, 0.75);
    arcCycle(
      c,
      q,
      s * 0.03,
      -s * 0.06,
      s * (0.29 + rk * 0.022),
      -2.2,
      2.7,
      s * (0.068 + rk * 0.008),
      ink,
      22,
    );
    if (rk >= 2) {
      arcCycle(
        c,
        fr(q + 0.12),
        s * 0.03,
        -s * 0.06,
        s * (0.25 + rk * 0.018),
        -2.0,
        2.3,
        s * 0.032,
        { ...ink, mid: shade(ink.mid, 0.35) },
        23,
      );
    }
    if (q > 0.25 && q < 0.7) {
      add(c);
      glowDot(c, s * 0.22, -s * 0.12, s * (0.045 + rk * 0.008), ink.core, 0.85);
      norm(c);
    }
    return;
  }
  if (v === 3 || v === 4) {
    // Sword Master triple star (v=3) or Twin Blades perpetual figure-8 flurry (v=4)
    const count = v === 3 ? 2 + Math.min(3, Math.ceil(rk / 2)) : 2 + rk;
    for (let i = 0; i < count; i++) {
      const phase = fr(q + i * (1 / count));
      arcCycle(
        c,
        phase,
        v === 4 ? Math.cos(t * 2 + i) * s * 0.05 : 0,
        -s * 0.04,
        s * (0.28 + rk * 0.015 - (i % 2) * 0.04),
        (i * TAU) / count + (v === 4 ? t * 2.4 : -0.6),
        i % 2 ? 2.4 : -2.4,
        s * (0.065 + rk * 0.005 - (i % 2) * 0.012),
        i % 2 ? { ...ink, mid: shade(ink.mid, 0.2) } : ink,
        11 + i,
      );
    }
    return;
  }
  const extra = (v >= 20 ? 1 + (v % 3) : 0) + Math.max(0, rk - 2);
  arcCycle(c, q, 0, -s * 0.05, s * 0.32 * amp, -2.6 + (v % 9) * 0.3, 2.9, s * 0.095, ink, 2 + v);
  if (rk >= 2) {
    arcCycle(
      c,
      fr(q + 0.45),
      s * 0.04,
      -s * 0.02,
      s * 0.28 * amp,
      0.6 - (v % 7) * 0.2,
      -2.6,
      s * 0.075,
      { ...ink, mid: shade(ink.mid, 0.25) },
      4 + v,
    );
  }
  for (let i = 0; i < extra; i++) {
    streak(
      c,
      Math.sin(t * 2 + i + v) * s * 0.22,
      -s * 0.1 + i * s * 0.06,
      s * (0.12 + rk * 0.015),
      s * 0.02,
      i % 2 ? 1 : -1,
      ink,
      t + i,
    );
  }
}
function blood(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f);
  if (v === 7 || r.key === "bloodbinding") {
    // Bloodbinding: crimson oath chains linking two vitality cores
    add(c);
    const nodes = 6 + rk * 2;
    for (let i = 0; i < nodes; i++) {
      const k = i / (nodes - 1);
      const x = lerp(-s * 0.28, s * 0.28, k);
      const y = -s * 0.06 + Math.sin(k * Math.PI * 3 + t * 5) * s * (0.03 + rk * 0.008);
      glowDot(c, x, y, s * (0.018 + rk * 0.002), i % 2 ? ink.core : "#ff1a3c", 0.9);
    }
    glowDot(c, -s * 0.28, -s * 0.06, s * (0.07 + rk * 0.01), ink.mid, 0.85);
    glowDot(c, s * 0.28, -s * 0.06, s * (0.07 + rk * 0.01), ink.mid, 0.85);
    norm(c);
    swirl(c, t, 0, -s * 0.06, s * (0.24 + rk * 0.025), 1 + Math.ceil(rk / 2), ink, 0.4, 2.2, 0.14);
    return;
  }
  if (v === 0) {
    // Blood Manipulation: suspended orbiting crimson blood spheres + thin steering ribbon streams
    const orbs = 2 + rk * 2;
    for (let i = 0; i < orbs; i++) {
      const a = t * 1.4 + (i / orbs) * TAU;
      const rad = s * (0.16 + 0.06 * Math.sin(t * 2 + i) + rk * 0.016);
      const ox = Math.cos(a) * rad;
      const oy = -s * 0.08 + Math.sin(a) * rad * 0.45;
      c.fillStyle = ink.edge;
      c.beginPath();
      c.arc(ox, oy, s * (0.024 + rk * 0.004), 0, TAU);
      c.fill();
      c.fillStyle = ink.mid;
      c.beginPath();
      c.arc(ox, oy, s * (0.017 + rk * 0.003), 0, TAU);
      c.fill();
      add(c);
      glowDot(c, ox, oy, s * 0.035, ink.core, 0.5);
      norm(c);
    }
    swirl(c, t, 0, -s * 0.08, s * (0.22 + rk * 0.025), 1 + Math.ceil(rk / 2), ink, 0.42, 1.8, 0.12);
    return;
  }
  if (v === 1) {
    // Blood Art: sweeping calligraphy ink-blood brush arcs suspended in midair
    const strokes = 2 + rk;
    for (let i = 0; i < strokes; i++) {
      const ph = fr(q + i * (1 / strokes));
      arcCycle(
        c,
        ph,
        Math.cos(i * 1.8) * s * 0.08,
        -s * 0.06 + (i - strokes / 2) * s * 0.045,
        s * (0.18 + rk * 0.024),
        i * 1.1 + t * 0.4,
        2.6,
        s * (0.04 + rk * 0.006),
        ink,
        50 + i,
      );
    }
    add(c);
    glowDot(c, 0, -s * 0.06, s * (0.1 + rk * 0.016), ink.mid, 0.45);
    norm(c);
    return;
  }
  if (v === 2) {
    // Hemokinesis: sharp arterial crimson needles erupting radially and retracting
    const needles = 4 + rk * 2;
    const ext = Math.sin(q * Math.PI);
    add(c);
    glowDot(c, 0, s * GY - s * 0.06, s * (0.12 + rk * 0.02), ink.mid, 0.55);
    norm(c);
    for (let i = 0; i < needles; i++) {
      const ang = -Math.PI * 0.88 + (i / (needles - 1 || 1)) * Math.PI * 0.76;
      const bx = (i / (needles - 1 || 1) - 0.5) * s * 0.38;
      const len = s * (0.24 + rk * 0.04) * ext;
      const tx = bx + Math.cos(ang) * len;
      const ty = s * GY + Math.sin(ang) * len;
      c.fillStyle = ink.edge;
      c.beginPath();
      c.moveTo(bx - s * 0.014, s * GY);
      c.lineTo(tx, ty);
      c.lineTo(bx + s * 0.014, s * GY);
      c.closePath();
      c.fill();
      add(c);
      c.strokeStyle = rgba(i % 2 ? ink.core : ink.mid, 0.9);
      c.lineWidth = 1.6 + rk * 0.25;
      c.beginPath();
      c.moveTo(bx, s * GY);
      c.lineTo(tx, ty);
      c.stroke();
      norm(c);
    }
    return;
  }
  if (v === 3) {
    // Sanguine Shift: silhouette dissolves into rising crimson droplets and reforms across the stage
    const shift = Math.sin(q * TAU) * s * 0.22;
    const solid = Math.abs(Math.cos(q * Math.PI));
    c.save();
    c.globalAlpha = 0.25 + solid * 0.65;
    humanoid(c, shift, s * GY, s * 0.39, ink.edge, solid * 0.2, 0.8, true);
    c.restore();
    add(c);
    const drops = 10 + rk * 5;
    for (let i = 0; i < drops; i++) {
      const life = fr(t * 1.1 + i / drops);
      const dx = shift + Math.sin(i * 3.1 + t * 4) * s * (0.18 + rk * 0.02) * (1 - solid * 0.5);
      const dy = s * GY - life * s * 0.56;
      glowDot(
        c,
        dx,
        dy,
        s * (0.02 + rk * 0.003) * (1 - life),
        i % 2 ? ink.mid : ink.core,
        1 - life,
      );
    }
    norm(c);
    return;
  }
  if (v === 4) {
    // Demonic Hemokinesis: twin dark-core orbiting blood scythe crescents + rising black-crimson sparks
    add(c);
    glowDot(c, 0, -s * 0.05, s * (0.14 + rk * 0.025), "#ff003c", 0.55);
    norm(c);
    const scythes = Math.min(4, 1 + Math.ceil(rk / 2));
    for (let i = 0; i < scythes; i++) {
      const a0 = t * 2.4 + (i * TAU) / scythes;
      paintedArc(
        c,
        0,
        -s * 0.06,
        s * (0.24 + rk * 0.025),
        a0,
        2.1,
        s * (0.065 + rk * 0.008),
        { edge: "#080002", mid: "#ff003c", core: "#ff99ac" },
        0.92,
        0.1,
        70 + i,
      );
    }
    add(c);
    for (let i = 0; i < 6 + rk * 3; i++) {
      const k = fr(t * 0.9 + i / (6 + rk * 3));
      glowDot(
        c,
        Math.sin(i * 2.7 + t * 2) * s * 0.3,
        s * GY - k * s * 0.65,
        s * 0.025 * (1 - k),
        "#ff003c",
        1 - k,
      );
    }
    norm(c);
    return;
  }
  if (v === 5 || v === 6) {
    // Vampire (v=5) fanged inward crimson drain; Vampire Hybrid (v=6) drain + triple beast claw swipe
    const fangOpen = 0.3 + 0.7 * Math.abs(Math.sin(q * Math.PI));
    add(c);
    glowDot(c, 0, -s * 0.06, s * (0.16 + rk * 0.02), ink.mid, 0.5);
    norm(c);
    for (const sy of [-1, 1]) {
      const gap = sy * s * (0.06 + fangOpen * 0.07);
      for (const sx of [-1, 1]) {
        c.fillStyle = ink.core;
        c.beginPath();
        c.moveTo(sx * s * 0.14 - s * 0.015, -s * 0.06 + gap);
        c.lineTo(sx * s * 0.14, -s * 0.06 + gap - sy * s * (0.065 + rk * 0.01));
        c.lineTo(sx * s * 0.14 + s * 0.015, -s * 0.06 + gap);
        c.closePath();
        c.fill();
      }
    }
    // Inward life-drain streams
    add(c);
    const streams = 5 + rk * 2;
    for (let i = 0; i < streams; i++) {
      const k = fr(t * 1.1 + i / streams);
      const a = (i / streams) * TAU + t * 0.8;
      const dist = s * 0.38 * (1 - k);
      glowDot(
        c,
        Math.cos(a) * dist,
        -s * 0.06 + Math.sin(a) * dist * 0.55,
        s * 0.018 * k,
        ink.core,
        k,
      );
    }
    if (v === 6) {
      for (let i = 0; i < 3; i++) {
        arcCycle(
          c,
          fr(q + i * 0.07),
          0,
          -s * 0.06,
          s * (0.24 + rk * 0.02 + i * 0.03),
          -2.1,
          2.2,
          s * 0.035,
          { ...ink, mid: "#f43f5e" },
          80 + i,
        );
      }
    }
    norm(c);
    return;
  }
  swirl(
    c,
    t * (1 + (v % 3) * 0.15),
    0,
    -s * 0.1,
    s * (0.22 + rk * 0.025),
    1 + rk,
    ink,
    0.5,
    2.6,
    0.16,
  );
}
function voidRift(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f);
  if (v === 3 || r.key === "ethereal_splicing") {
    add(c);
    const strands = 1 + Math.min(4, rk);
    for (let j = 0; j < strands; j++) {
      c.beginPath();
      for (let i = 0; i <= 36; i++) {
        const k = i / 36;
        const x = lerp(-s * 0.42, s * 0.42, k);
        const y = -s * 0.06 + Math.sin(k * 10 + t * 3 + (j * TAU) / strands) * s * 0.12;
        if (i) c.lineTo(x, y);
        else c.moveTo(x, y);
      }
      c.strokeStyle = rgba(j % 2 ? ink.core : ink.mid, 0.85);
      c.lineWidth = j === 1 ? 3 : 2;
      c.stroke();
    }
    norm(c);
  }
  if (v === 0) {
    // Aether: serene luminous orbiting lotus ribbons & hovering stardust motes
    add(c);
    glowDot(c, 0, -s * 0.08, s * (0.18 + rk * 0.03), ink.mid, 0.45);
    swirl(
      c,
      t * 0.65,
      0,
      -s * 0.08,
      s * (0.25 + rk * 0.028),
      2 + Math.ceil(rk / 2),
      ink,
      0.46,
      1.3,
      0.13,
    );
    const motes = 6 + rk * 4;
    for (let i = 0; i < motes; i++) {
      const a = t * 0.8 + (i / motes) * TAU;
      const dist = s * (0.16 + (i % 3) * 0.07);
      glowDot(
        c,
        Math.cos(a) * dist,
        -s * 0.08 + Math.sin(a) * dist * 0.45,
        s * 0.016,
        ink.core,
        0.85,
      );
    }
    norm(c);
    return;
  }
  if (v === 1) {
    // Aether Dominion: cosmic black-hole singularity with gravitational lensing crown & spire rays
    const cy = -s * 0.08;
    c.save();
    c.translate(0, cy);
    add(c);
    const rays = 4 + rk * 2;
    for (let i = 0; i < rays; i++) {
      const ang = t * 0.35 + (i / rays) * TAU;
      c.strokeStyle = rgba(i % 2 ? ink.mid : ink.core, 0.55);
      c.lineWidth = 1.5 + rk * 0.35;
      c.beginPath();
      c.moveTo(Math.cos(ang) * s * 0.08, Math.sin(ang) * s * 0.08);
      c.lineTo(Math.cos(ang) * s * (0.3 + rk * 0.035), Math.sin(ang) * s * (0.3 + rk * 0.035));
      c.stroke();
    }
    for (let ringIdx = 0; ringIdx < 1 + Math.ceil(rk / 2); ringIdx++) {
      c.save();
      c.rotate(t * (0.5 + ringIdx * 0.3) * (ringIdx % 2 ? -1 : 1));
      c.scale(1, 0.34);
      c.strokeStyle = rgba(ringIdx % 2 ? ink.core : ink.mid, 0.82);
      c.lineWidth = 2.2;
      c.beginPath();
      c.arc(0, 0, s * (0.2 + ringIdx * 0.065), 0, TAU);
      c.stroke();
      c.restore();
    }
    norm(c);
    c.fillStyle = "#04010a";
    c.beginPath();
    c.arc(0, 0, s * (0.085 + rk * 0.01), 0, TAU);
    c.fill();
    c.strokeStyle = ink.core;
    c.lineWidth = 2;
    c.stroke();
    c.restore();
    return;
  }
  if (v === 2) {
    // Qahr Al-Wujud: crushing spatial triangle shards collapsing violently into zero-point
    const cy = -s * 0.08;
    const collapse = Math.sin(q * Math.PI);
    const shards = 6 + rk * 3;
    add(c);
    glowDot(c, 0, cy, s * (0.12 + rk * 0.02) * (1 - collapse * 0.4), "#ffffff", 0.7);
    norm(c);
    for (let i = 0; i < shards; i++) {
      const k = fr(q + i / shards);
      const ang = (i / shards) * TAU + t * 0.5;
      const dist = s * 0.4 * (1 - ease(k));
      const px = Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist;
      c.save();
      c.translate(px, py);
      c.rotate(ang);
      c.fillStyle = i % 2 ? "#050208" : ink.mid;
      c.beginPath();
      c.moveTo(s * 0.03, 0);
      c.lineTo(-s * 0.02, -s * 0.018);
      c.lineTo(-s * 0.02, s * 0.018);
      c.closePath();
      c.fill();
      c.strokeStyle = ink.core;
      c.lineWidth = 1;
      c.stroke();
      c.restore();
    }
    c.fillStyle = "#020006";
    c.beginPath();
    c.arc(0, cy, s * (0.045 + rk * 0.008) * (0.6 + 0.5 * collapse), 0, TAU);
    c.fill();
    c.strokeStyle = ink.core;
    c.lineWidth = 1.8;
    c.stroke();
    return;
  }
  c.save();
  c.translate(0, -s * 0.08);
  c.rotate(-0.35 + (v % 11) * 0.25);
  const open = Math.sin(Math.PI * clamp(q * 1.2)) * (0.72 + rk * 0.12);
  c.beginPath();
  for (let i = 0; i <= 24; i++) {
    const u = i / 24,
      a = u * TAU,
      rr = (i % 2 ? 0.9 : 1.05) * s * 0.1 * open;
    c.lineTo(Math.cos(a) * rr * 2.4, Math.sin(a) * rr);
  }
  c.closePath();
  c.fillStyle = "#050208";
  c.fill();
  c.strokeStyle = ink.mid;
  c.lineWidth = 2 + rk * 0.4;
  c.stroke();
  add(c);
  c.strokeStyle = ink.core;
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
  swirl(c, -t, 0, -s * 0.08, s * (0.26 + rk * 0.03), 1 + Math.ceil(rk / 2), ink, 0.4, -1.4, 0.1);
  norm(c);
}
function arcane(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette);
  runeCircle(c, s, t, r.palette[0], r.palette[2], s * (0.24 + rk * 0.025 + (v % 3) * 0.015));
  column(c, s, t, ink, s * (0.38 + rk * 0.06), s * (0.11 + rk * 0.015));
  c.save();
  c.translate(0, -s * 0.15);
  if (v === 1) {
    // Aldercrest Arcane: triple concentric sacred geometry seal + counter-rotating hexagram star
    add(c);
    for (let ringIdx = 0; ringIdx < 3; ringIdx++) {
      c.strokeStyle = rgba(ringIdx % 2 ? ink.core : ink.mid, 0.65 + rk * 0.06);
      c.lineWidth = ringIdx === 0 ? 2 : 1.4;
      c.beginPath();
      c.arc(0, 0, s * (0.11 + ringIdx * 0.06 + rk * 0.008), 0, TAU);
      c.stroke();
    }
    const tris = rk >= 3 ? 2 : 1;
    for (let ti = 0; ti < tris; ti++) {
      c.save();
      c.rotate(t * (ti === 0 ? 0.6 : -0.6) + ti * Math.PI);
      c.strokeStyle = rgba(ink.core, 0.82);
      c.lineWidth = 1.8;
      c.beginPath();
      for (let k = 0; k <= 3; k++) {
        const ang = (k / 3) * TAU;
        const px = Math.cos(ang) * s * (0.22 + rk * 0.012);
        const py = Math.sin(ang) * s * (0.22 + rk * 0.012);
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
      c.restore();
    }
    norm(c);
  } else if (v === 2) {
    // Rune Magic: angular glyph nodes inscribing sequentially around an orbit then igniting
    const nodes = 4 + rk;
    const prog = fr(t * 0.7) * nodes;
    add(c);
    for (let i = 0; i < nodes; i++) {
      const ang = (i / nodes) * TAU - Math.PI / 2;
      const nx = Math.cos(ang) * s * (0.21 + rk * 0.014);
      const ny = Math.sin(ang) * s * (0.21 + rk * 0.014);
      const lit = i <= prog;
      c.strokeStyle = rgba(lit ? ink.core : ink.mid, lit ? 0.95 : 0.3);
      c.lineWidth = lit ? 2.2 : 1.2;
      c.save();
      c.translate(nx, ny);
      c.rotate(ang);
      c.strokeRect(-s * 0.022, -s * 0.022, s * 0.044, s * 0.044);
      c.restore();
      if (lit) glowDot(c, nx, ny, s * 0.032, ink.core, 0.75);
    }
    norm(c);
  } else if (v === 3) {
    // Card Magic: spell cards fan out and launch blazing card-dart projectiles
    const cards = 2 + rk;
    for (let i = 0; i < cards; i++) {
      c.save();
      c.rotate(-((cards - 1) * 0.16) + i * 0.32 + Math.sin(t * 2 + i) * 0.08);
      c.translate(0, -s * 0.22);
      c.fillStyle = i % 2 ? ink.mid : ink.core;
      c.fillRect(-s * 0.035, -s * 0.055, s * 0.07, s * 0.11);
      c.strokeStyle = ink.edge;
      c.lineWidth = 1.5;
      c.strokeRect(-s * 0.035, -s * 0.055, s * 0.07, s * 0.11);
      c.restore();
      const dart = fr(t * 1.4 + i / cards);
      streak(
        c,
        lerp(-s * 0.15, s * 0.42, ease(dart)),
        (i - (cards - 1) / 2) * s * 0.06,
        s * 0.15,
        s * 0.018,
        1,
        ink,
        t + i,
      );
    }
  } else if (v === 4) {
    // Ancient Art: monolithic counter-rotating notched gold glyph rings awakening a pillar
    add(c);
    for (let ringIdx = 0; ringIdx < 2; ringIdx++) {
      c.save();
      c.rotate(t * (ringIdx === 0 ? 0.35 : -0.45));
      c.strokeStyle = rgba(ringIdx === 0 ? ink.mid : ink.core, 0.88);
      c.lineWidth = 2.4;
      c.setLineDash([s * 0.06, s * 0.025]);
      c.beginPath();
      c.arc(0, 0, s * (0.17 + ringIdx * 0.075 + rk * 0.01), 0, TAU);
      c.stroke();
      c.setLineDash([]);
      c.restore();
    }
    norm(c);
  } else {
    const rings = Math.min(5, 1 + rk);
    for (let i = 0; i < rings; i++) {
      c.save();
      c.rotate(t * (1 + i * 0.4) * (i % 2 ? -1 : 1) + (v % 7) * 0.4);
      c.scale(1, 0.35 + i * 0.12);
      arcCycle(
        c,
        fr(t * 0.5 + i / rings),
        0,
        0,
        s * (0.16 + i * 0.048),
        0,
        3.6,
        s * 0.03,
        ink,
        i + v,
      );
      c.restore();
    }
  }
  c.restore();
}
function chrono(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette);
  c.save();
  c.translate(0, -s * 0.1);
  if (v === 1) {
    const lock = Math.min(1, fr(t * 0.45) * 1.4);
    add(c);
    glowDot(c, 0, 0, s * (0.28 + rk * 0.04) * lock, ink.mid, 0.32);
    c.strokeStyle = ink.core;
    c.lineWidth = 2 + rk * 0.3;
    c.beginPath();
    c.arc(0, 0, s * (0.26 + rk * 0.03) * lock, 0, TAU);
    c.stroke();
    const ticks = 8 + rk * 4;
    for (let i = 0; i < ticks; i++) {
      const ang = (i / ticks) * TAU + t * 0.25;
      c.fillStyle = ink.core;
      c.save();
      c.rotate(ang);
      c.fillRect(s * (0.24 + rk * 0.03) * lock, -1, s * 0.04, 2);
      c.restore();
    }
    norm(c);
    c.restore();
    return;
  }
  add(c);
  const rings = 1 + rk;
  for (let i = 0; i < rings; i++) {
    c.strokeStyle = rgba(i % 2 ? ink.mid : ink.core, 0.6);
    c.lineWidth = 1.5 + rk * 0.25;
    c.setLineDash([s * 0.02, s * 0.015]);
    c.lineDashOffset = t * 60 * (i % 2 ? 1 : -1) + v * 7;
    c.beginPath();
    c.arc(0, 0, s * (0.1 + i * 0.055), 0, TAU);
    c.stroke();
  }
  c.setLineDash([]);
  c.strokeStyle = ink.core;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(t * 2 + v) * s * 0.25, Math.sin(t * 2 + v) * s * 0.25);
  c.moveTo(0, 0);
  c.lineTo(Math.cos(t * 0.3 - v) * s * 0.15, Math.sin(t * 0.3 - v) * s * 0.15);
  c.stroke();
  norm(c);
  c.restore();
  swirl(
    c,
    -t * (1 + (v % 5) * 0.2),
    0,
    -s * 0.1,
    s * (0.3 + rk * 0.03),
    1 + Math.ceil(rk / 2),
    ink,
    0.8,
    -1.2,
    0.09,
  );
}
function chaos(f: PF) {
  const { c, s, t, r, v, step, rnd } = f,
    rk = rankLevel(f),
    light: Ink = { edge: "#1a1a1a", mid: "#f8fafc", core: "#ffffff" },
    dark: Ink = { edge: "#000000", mid: shade(r.palette[0], -0.2), core: r.palette[2] };
  if (v === 1 || r.key === "chaos_order") {
    // Chaos & Order: Yin-Yang twin white order & dark/crimson chaos crescents trading halves
    const cy = -s * 0.08;
    const rad = s * (0.16 + rk * 0.022);
    c.save();
    c.translate(0, cy);
    c.rotate(t * 1.4);
    c.fillStyle = "#f8fafc";
    c.beginPath();
    c.arc(0, 0, rad, -Math.PI / 2, Math.PI / 2);
    c.arc(0, rad / 2, rad / 2, Math.PI / 2, -Math.PI / 2, true);
    c.arc(0, -rad / 2, rad / 2, Math.PI / 2, -Math.PI / 2);
    c.fill();
    c.fillStyle = "#0f172a";
    c.beginPath();
    c.arc(0, 0, rad, Math.PI / 2, -Math.PI / 2);
    c.arc(0, -rad / 2, rad / 2, -Math.PI / 2, Math.PI / 2, true);
    c.arc(0, rad / 2, rad / 2, -Math.PI / 2, Math.PI / 2);
    c.fill();
    c.fillStyle = "#ef4444";
    c.beginPath();
    c.arc(0, -rad / 2, rad * 0.18, 0, TAU);
    c.fill();
    c.fillStyle = "#f8fafc";
    c.beginPath();
    c.arc(0, rad / 2, rad * 0.18, 0, TAU);
    c.fill();
    c.strokeStyle = "#ef4444";
    c.lineWidth = 1.6 + rk * 0.25;
    c.beginPath();
    c.arc(0, 0, rad, 0, TAU);
    c.stroke();
    c.restore();
    swirl(
      c,
      t * 1.2,
      0,
      cy,
      s * (0.26 + rk * 0.025),
      1 + Math.ceil(rk / 2),
      [light, dark],
      0.45,
      2.2,
      0.14,
    );
    return;
  }
  if (v === 2) {
    // Wild Energy: volatile jagged multi-directional energy starburst fractures
    add(c);
    const bolts = 4 + rk * 3;
    for (let i = 0; i < bolts; i++) {
      const ang = (i / bolts) * TAU + rnd(step + i) * 0.35;
      const len = s * (0.22 + rk * 0.04 + rnd(step * 2 + i) * 0.12);
      const midX = Math.cos(ang + 0.15) * len * 0.5;
      const midY = -s * 0.08 + Math.sin(ang + 0.15) * len * 0.5;
      c.strokeStyle = rgba(i % 2 ? r.palette[0] : r.palette[2], 0.85);
      c.lineWidth = 1.8 + rk * 0.3;
      c.beginPath();
      c.moveTo(0, -s * 0.08);
      c.lineTo(midX, midY);
      c.lineTo(Math.cos(ang) * len, -s * 0.08 + Math.sin(ang) * len);
      c.stroke();
    }
    glowDot(c, 0, -s * 0.08, s * (0.14 + rk * 0.025), r.palette[2], 0.8);
    norm(c);
    return;
  }
  if (v === 3 || r.key === "errorcore" || rk >= 4) {
    add(c);
    for (let i = 0; i < 3 + rk * 2; i++) {
      const y = (rnd(step + i) - 0.5) * s * 0.65;
      const w = s * (0.18 + rnd(step * 2 + i) * 0.45);
      c.fillStyle = rgba(i % 2 ? r.palette[0] : r.palette[2], 0.72);
      c.fillRect((rnd(step * 3 + i) - 0.5) * s * 0.4 - w / 2, y, w, 2.5);
    }
    norm(c);
  }
  swirl(
    c,
    t,
    0,
    -s * 0.1,
    s * (0.24 + rk * 0.03),
    2 + rk,
    [dark, inkOf(r.palette)],
    0.7,
    2.8 + (v % 6) * 0.25,
    0.2,
  );
  add(c);
  for (let i = 0; i < 6 + rk * 3; i++) {
    const k = fr(t * 1.3 + i / (6 + rk * 3)),
      a = i * 1.7 + v * 0.3;
    glowDot(
      c,
      Math.cos(a) * s * 0.4 * k,
      -s * 0.1 + Math.sin(a) * s * 0.3 * k,
      s * 0.02,
      i % 2 ? "#ffffff" : r.palette[0],
      1 - k,
    );
  }
  norm(c);
}
function tech(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f);
  if (v === 0) {
    // Architect Cube Guardian: 3D isometric wireframe/lit cube lattice shield assembling around caster
    humanoid(c, 0, s * GY, s * 0.38, "#0c1016", 0, 0.5, true);
    const cubes = 3 + rk * 2;
    for (let i = 0; i < cubes; i++) {
      const a = t * 0.8 + (i / cubes) * TAU;
      const pulse = 0.82 + 0.18 * Math.sin(t * 2.5 + i);
      const cx = Math.cos(a) * s * (0.23 + rk * 0.015) * pulse;
      const cy = -s * 0.06 + Math.sin(a) * s * 0.14 * pulse;
      const r0 = s * (0.04 + rk * 0.004);
      c.save();
      c.translate(cx, cy);
      c.fillStyle = rgba(ink.mid, 0.24);
      c.strokeStyle = ink.core;
      c.lineWidth = 1.5;
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const ha = (k / 6) * TAU - Math.PI / 6;
        const px = Math.cos(ha) * r0;
        const py = Math.sin(ha) * r0;
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(0, r0);
      c.moveTo(0, 0);
      c.lineTo(Math.cos(-Math.PI / 6) * r0, Math.sin(-Math.PI / 6) * r0);
      c.moveTo(0, 0);
      c.lineTo(Math.cos((-5 * Math.PI) / 6) * r0, Math.sin((-5 * Math.PI) / 6) * r0);
      c.stroke();
      c.restore();
    }
    return;
  }
  if (v === 1) {
    // Tech Genius: clean blueprint PCB circuit grid + glowing compile nodes
    humanoid(c, 0, s * GY, s * 0.38, "#0c1016", 0, 0.45);
    add(c);
    c.strokeStyle = rgba(ink.core, 0.85);
    c.lineWidth = 2;
    const traces = 4 + rk * 2;
    for (let i = 0; i < traces; i++) {
      c.save();
      c.translate(0, -s * 0.08);
      c.rotate((i * TAU) / traces);
      c.beginPath();
      c.moveTo(s * 0.08, 0);
      c.lineTo(s * 0.24 * ease(q), 0);
      c.lineTo(s * 0.24 * ease(q), s * 0.08 * clamp(q * 2 - 0.5));
      c.stroke();
      glowDot(c, s * 0.24 * ease(q), s * 0.08 * clamp(q * 2 - 0.5), s * 0.018, ink.core, 0.9);
      c.restore();
    }
    norm(c);
    return;
  }
  if (v === 2) {
    // Sentinel Frame Tech: tactical HUD lock-on corner brackets + blue repulsor core
    humanoid(c, 0, s * GY, s * 0.4, "#0b111d", 0.05, 0.6);
    add(c);
    const box = s * (0.2 + (1 - Math.sin(q * Math.PI) * 0.2) * 0.06);
    c.strokeStyle = rgba(ink.core, 0.9);
    c.lineWidth = 2;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        c.beginPath();
        c.moveTo(sx * box, -s * 0.06 + sy * (box - s * 0.06));
        c.lineTo(sx * box, -s * 0.06 + sy * box);
        c.lineTo(sx * (box - s * 0.06), -s * 0.06 + sy * box);
        c.stroke();
      }
    }
    glowDot(c, 0, -s * 0.06, s * (0.09 + rk * 0.015), ink.mid, 0.85);
    glowDot(c, 0, -s * 0.06, s * 0.045, "#ffffff", 0.95);
    norm(c);
    return;
  }
  if (v === 3) {
    // Vanguard-X Protocol: sweeping crosshair reticle + crimson X-shaped laser detonation
    add(c);
    const rad = s * (0.22 + rk * 0.02);
    c.strokeStyle = rgba(ink.mid, 0.85);
    c.lineWidth = 1.8;
    c.beginPath();
    c.arc(0, -s * 0.08, rad, 0, TAU);
    c.stroke();
    const xSize = s * (0.24 + rk * 0.03) * (0.5 + 0.5 * Math.sin(q * Math.PI));
    c.strokeStyle = rgba(ink.core, 0.92);
    c.lineWidth = 2.5 + rk * 0.5;
    c.beginPath();
    c.moveTo(-xSize, -s * 0.08 - xSize);
    c.lineTo(xSize, -s * 0.08 + xSize);
    c.moveTo(xSize, -s * 0.08 - xSize);
    c.lineTo(-xSize, -s * 0.08 + xSize);
    c.stroke();
    glowDot(c, 0, -s * 0.08, s * (0.1 + rk * 0.02), ink.mid, 0.8);
    norm(c);
    return;
  }
  if (v === 4) {
    // Tech Suits: hexagonal reactor core + hinged armor plates folding inward cleanly
    humanoid(c, 0, s * GY, s * 0.4, "#0c1016", 0, 0.4);
    add(c);
    const coreR = s * (0.08 + rk * 0.01);
    c.strokeStyle = ink.core;
    c.lineWidth = 2;
    c.beginPath();
    for (let k = 0; k <= 6; k++) {
      const ang = (k / 6) * TAU + t * 0.4;
      const px = Math.cos(ang) * coreR;
      const py = -s * 0.06 + Math.sin(ang) * coreR;
      if (k === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    const panels = 2 + rk;
    for (let i = 0; i < panels; i++) {
      const a = (i / panels) * TAU + t * 0.5;
      const d = lerp(s * 0.34, s * 0.14, ease(Math.sin(q * Math.PI)));
      c.save();
      c.translate(Math.cos(a) * d, -s * 0.06 + Math.sin(a) * d * 0.7);
      c.rotate(a);
      c.fillStyle = ink.edge;
      c.fillRect(-s * 0.028, -s * 0.018, s * 0.056, s * 0.036);
      c.strokeStyle = ink.core;
      c.lineWidth = 1.2;
      c.strokeRect(-s * 0.028, -s * 0.018, s * 0.056, s * 0.036);
      c.restore();
    }
    norm(c);
    return;
  }
  // Kinetic Suits (v=5) / custom: concentric kinetic shock rings charging & bursting outward
  humanoid(c, 0, s * GY, s * 0.4, "#121016", 0.1, 0.5);
  add(c);
  const charge = q < 0.65 ? q / 0.65 : 1 - (q - 0.65) / 0.35;
  glowDot(c, 0, -s * 0.06, s * (0.12 + rk * 0.02) * charge, ink.core, 0.85);
  const waves = 1 + rk;
  for (let i = 0; i < waves; i++) {
    const wk = fr(q * 1.4 + i / waves);
    c.strokeStyle = rgba(ink.mid, 1 - wk);
    c.lineWidth = 2 + rk * 0.4;
    c.beginPath();
    c.arc(0, -s * 0.06, s * (0.12 + wk * (0.28 + rk * 0.03)), 0, TAU);
    c.stroke();
  }
  norm(c);
}
function shadow(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    q = cyc(f, 0.7);
  if (v === 0) {
    // Dark Magic: curling black-violet nocturnal smoke tendrils spiraling into a dark hex seal
    runeCircle(c, s, -t, r.palette[0], r.palette[2], s * (0.24 + rk * 0.025), 0.75);
    add(c);
    const coils = 2 + rk;
    for (let i = 0; i < coils; i++) {
      const a0 = t * 1.8 + (i / coils) * TAU;
      arcCycle(
        c,
        fr(t * 0.7 + i / coils),
        0,
        -s * 0.08,
        s * (0.14 + i * 0.035),
        a0,
        2.5,
        s * 0.045,
        { edge: "#040008", mid: r.palette[0], core: r.palette[2] },
        30 + i,
      );
    }
    norm(c);
    humanoid(c, 0, s * GY, s * 0.36, "#05010a", 0, 0.7, true);
    return;
  }
  if (v === 1) {
    // Umbrakinesis: solid jagged obsidian floor shadow blades erupting upward from pool
    const gy = s * GY;
    c.fillStyle = "#04010a";
    c.beginPath();
    c.ellipse(0, gy, s * (0.3 + rk * 0.03), s * 0.055, 0, 0, TAU);
    c.fill();
    const blades = 3 + rk * 2;
    const grow = Math.sin(q * Math.PI);
    for (let i = 0; i < blades; i++) {
      const bx = (i / (blades - 1 || 1) - 0.5) * s * 0.44;
      const bh = s * (0.24 + 0.14 * ((i % 2) + 0.5) + rk * 0.035) * (0.35 + 0.65 * grow);
      c.fillStyle = "#04010c";
      c.beginPath();
      c.moveTo(bx - s * 0.022, gy);
      c.lineTo(bx + bx * 0.15, gy - bh);
      c.lineTo(bx + s * 0.022, gy);
      c.closePath();
      c.fill();
      c.strokeStyle = rgba(i % 2 ? r.palette[2] : r.palette[0], 0.85);
      c.lineWidth = 1.6;
      c.stroke();
    }
    return;
  }
  if (v === 3) {
    // Demonic: horned infernal shadow entity silhouette with glowing twin horns & ember aura
    const gy = s * GY;
    add(c);
    glowDot(c, 0, gy - s * 0.24, s * (0.26 + rk * 0.04), r.palette[0], 0.5);
    norm(c);
    humanoid(c, 0, gy, s * 0.42, "#070102", 0.08, 0.9, true);
    add(c);
    for (const sx of [-1, 1]) {
      c.strokeStyle = r.palette[2];
      c.lineWidth = 2.5 + rk * 0.4;
      c.beginPath();
      c.moveTo(sx * s * 0.035, gy - s * 0.36);
      c.quadraticCurveTo(sx * s * 0.12, gy - s * 0.46, sx * s * (0.14 + rk * 0.015), gy - s * 0.52);
      c.stroke();
    }
    for (let i = 0; i < 6 + rk * 3; i++) {
      const k = fr(t * 0.85 + i / (6 + rk * 3));
      glowDot(
        c,
        Math.sin(i * 2.2 + t * 3) * s * 0.28,
        gy - k * s * 0.62,
        s * 0.022 * (1 - k),
        i % 2 ? r.palette[0] : r.palette[2],
        1 - k,
      );
    }
    norm(c);
    return;
  }
  if (v === 4 || r.key === "umbra_control") {
    // Rebuilt Umbra Control: dark ground pool + writhing curved shadow tendrils + silhouette caster + violet embers
    const gy = s * GY;
    c.save();
    c.fillStyle = "#030108";
    c.beginPath();
    c.ellipse(0, gy, s * (0.28 + rk * 0.035), s * 0.06, 0, 0, TAU);
    c.fill();
    c.strokeStyle = rgba(r.palette[0], 0.55);
    c.lineWidth = 1.8;
    c.stroke();
    c.restore();

    const tendrils = 2 + rk * 2;
    for (let i = 0; i < tendrils; i++) {
      const side = (i / (tendrils - 1 || 1) - 0.5) * 2;
      const bx = side * s * (0.22 + rk * 0.025);
      const sway = Math.sin(t * 2.8 + i * 1.3) * s * 0.08;
      const tipX = bx * 0.75 + sway;
      const tipY = gy - s * (0.2 + rk * 0.055 + 0.06 * Math.sin(t * 2 + i * 1.7));
      const bw = s * (0.028 + rk * 0.004);
      c.fillStyle = "#05020d";
      c.beginPath();
      c.moveTo(bx - bw, gy);
      c.quadraticCurveTo(bx - sway * 0.5, (gy + tipY) * 0.5, tipX, tipY);
      c.quadraticCurveTo(bx + bw * 0.4, (gy + tipY) * 0.5, bx + bw, gy);
      c.closePath();
      c.fill();
      c.strokeStyle = rgba(i % 2 ? r.palette[2] : r.palette[0], 0.75);
      c.lineWidth = 1.4;
      c.stroke();
      add(c);
      glowDot(c, tipX, tipY, s * 0.026, r.palette[2], 0.75);
      norm(c);
    }
    humanoid(c, 0, gy, s * 0.34, "#06030d", 0.12, 0.75, true);
    add(c);
    for (let i = 0; i < 4 + rk * 3; i++) {
      const k = fr(t * 0.75 + i / (4 + rk * 3));
      glowDot(
        c,
        Math.sin(i * 2.1 + t) * s * 0.28,
        gy - k * s * 0.58,
        s * 0.018 * (1 - k),
        r.palette[2],
        1 - k,
      );
    }
    norm(c);
    return;
  }
  // Shadow Steps (v=2) / fallback: rapid blink afterimage clones between shadow pools
  c.fillStyle = "#03020c";
  c.beginPath();
  c.ellipse(-s * 0.35, s * GY, s * 0.12, s * 0.03, 0, 0, TAU);
  c.ellipse(s * 0.3, s * GY, s * 0.12, s * 0.03, 0, 0, TAU);
  c.fill();
  const clones = 2 + rk;
  for (let i = 0; i < clones; i++) {
    const x = lerp(-s * 0.36, s * 0.28, ease(clamp(q * 1.5 - i * 0.06)));
    c.globalAlpha = 0.15 + (i / clones) * 0.7;
    humanoid(
      c,
      x,
      s * GY,
      s * 0.38,
      i === clones - 1 ? "#000000" : shade(r.palette[0], -0.6),
      0.2,
      0.7,
    );
  }
  c.globalAlpha = 1;
  if (q > 0.55)
    arcCycle(
      c,
      (q - 0.55) / 0.45,
      s * 0.3,
      -s * 0.05,
      s * (0.22 + rk * 0.025),
      -1.9,
      2.2,
      s * 0.05,
      { edge: "#000000", mid: r.palette[0], core: "#ffffff" },
      7 + v,
    );
}
function ghost(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette);
  if (v === 3 || r.key === "shishjutsu") {
    // Rebuilt Shishjutsu: rotating necromantic seal + tethered 3D tumbling ofuda talismans + rising spirits
    const gy = s * GY;
    runeCircle(c, s, t, r.palette[0], r.palette[2], s * (0.25 + rk * 0.025), 0.55 + rk * 0.08);
    add(c);
    glowDot(c, 0, gy - s * 0.24, s * (0.2 + rk * 0.03), r.palette[0], 0.45);
    norm(c);
    humanoid(c, 0, gy, s * 0.4, shade(r.palette[0], -0.55), 0, 0.65, true);
    const talismans = 3 + rk * 2;
    for (let i = 0; i < talismans; i++) {
      const ang = t * 1.5 + (i / talismans) * TAU;
      const rx = s * (0.22 + rk * 0.025);
      const ox = Math.cos(ang) * rx;
      const oy = -s * 0.06 + Math.sin(ang) * s * 0.11;
      add(c);
      c.strokeStyle = rgba(r.palette[2], 0.45);
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, -s * 0.04);
      c.quadraticCurveTo(ox * 0.5, oy - s * 0.08, ox, oy);
      c.stroke();
      norm(c);
      c.save();
      c.translate(ox, oy);
      c.rotate(ang + Math.PI / 2);
      c.fillStyle = "#fef2f2";
      c.fillRect(-s * 0.017, -s * 0.042, s * 0.034, s * 0.084);
      c.strokeStyle = r.palette[1];
      c.lineWidth = 1;
      c.strokeRect(-s * 0.017, -s * 0.042, s * 0.034, s * 0.084);
      c.fillStyle = r.palette[0];
      c.fillRect(-s * 0.005, -s * 0.028, s * 0.01, s * 0.056);
      c.restore();
    }
    add(c);
    for (let i = 0; i < 4 + rk * 3; i++) {
      const k = fr(t * 0.65 + i / (4 + rk * 3));
      glowDot(
        c,
        Math.sin(i * 2.5 + t * 2) * s * 0.26,
        gy - k * s * 0.68,
        s * 0.024 * (1 - k),
        ink.core,
        (1 - k) * 0.75,
      );
    }
    norm(c);
    return;
  }
  if (v === 0) {
    // Ghost 01 Armament: phase-cloaked tactical operative flickering between steel-cyan blade arcs
    const flick = 0.25 + 0.65 * Math.abs(Math.sin(t * 5));
    c.save();
    c.globalAlpha = flick;
    humanoid(c, Math.sin(t * 3) * s * 0.08, s * GY, s * 0.4, "#0b1420", 0.2, 0.8);
    c.restore();
    const slashes = 1 + Math.min(3, Math.ceil(rk / 2));
    for (let i = 0; i < slashes; i++) {
      arcCycle(
        c,
        fr(t * 1.1 + i * 0.25),
        s * 0.05,
        -s * 0.06,
        s * (0.24 + rk * 0.02),
        -1.5 + i * 0.9,
        2.1,
        s * 0.042,
        ink,
        61 + i,
      );
    }
    return;
  }
  if (v === 1) {
    // Azure Revenant State: crowned spectral azure form rising with trailing revenant claws
    const gy = s * GY;
    add(c);
    glowDot(c, 0, gy - s * 0.24, s * (0.24 + rk * 0.035), ink.mid, 0.55);
    norm(c);
    humanoid(
      c,
      0,
      gy - Math.sin(t * 2) * s * 0.03,
      s * 0.42,
      shade(r.palette[0], 0.25),
      0.1,
      0.75,
      true,
    );
    add(c);
    for (let i = 0; i < 2 + rk; i++) {
      const a = t * 1.5 + (i / (2 + rk)) * TAU;
      streak(
        c,
        Math.cos(a) * s * 0.25,
        -s * 0.08 + Math.sin(a) * s * 0.12,
        s * 0.16,
        s * 0.02,
        Math.cos(a) > 0 ? 1 : -1,
        ink,
        t + i,
      );
    }
    norm(c);
    return;
  }
  if (v === 2) {
    // Paleborne Nightmare: hollow-eyed pale nightmare masks orbiting a dread void core
    const gy = s * GY;
    add(c);
    glowDot(c, 0, -s * 0.08, s * (0.14 + rk * 0.025), r.palette[0], 0.45);
    norm(c);
    const masks = 2 + rk;
    for (let i = 0; i < masks; i++) {
      const a = t * 0.9 + (i / masks) * TAU;
      const mx = Math.cos(a) * s * (0.22 + rk * 0.02);
      const my = -s * 0.08 + Math.sin(a) * s * 0.13;
      c.save();
      c.translate(mx, my);
      c.fillStyle = "#e2e8f0";
      c.beginPath();
      c.ellipse(0, 0, s * 0.03, s * 0.042, 0, 0, TAU);
      c.fill();
      c.fillStyle = "#09090b";
      c.beginPath();
      c.arc(-s * 0.01, -s * 0.008, s * 0.006, 0, TAU);
      c.arc(s * 0.01, -s * 0.008, s * 0.006, 0, TAU);
      c.ellipse(0, s * 0.018, s * 0.007, s * 0.012, 0, 0, TAU);
      c.fill();
      c.restore();
    }
    humanoid(c, 0, gy, s * 0.36, "#18181b", 0, 0.5, true);
    return;
  }
  const specters = 1 + Math.min(4, rk);
  for (let i = 0; i < specters; i++) {
    const x = Math.sin(t * 1.5 + i * 1.7 + v * 0.3) * s * 0.25,
      a = 0.25 + 0.2 * Math.sin(t * 3 + i);
    c.globalAlpha = a;
    humanoid(c, x, s * GY, s * 0.4, shade(r.palette[0], 0.3), 0, 0.4, true);
  }
  c.globalAlpha = 1;
}
function portal(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f);
  const gates = v >= 20 || rk === 5 ? 3 : 2;
  for (let gi = 0; gi < gates; gi++) {
    const ang = gates === 2 ? (gi === 0 ? Math.PI : 0) : (gi / gates) * TAU + t * 0.3;
    const px = gates === 2 ? (gi === 0 ? -s * 0.3 : s * 0.3) : Math.cos(ang) * s * 0.26;
    const py = gates === 2 ? -s * 0.05 : -s * 0.05 + Math.sin(ang) * s * 0.14;
    const d = gi % 2 ? -1 : 1;
    c.save();
    c.translate(px, py);
    c.scale(0.35, 1);
    c.fillStyle = "#04030a";
    c.beginPath();
    c.arc(0, 0, s * (0.12 + rk * 0.012), 0, TAU);
    c.fill();
    c.restore();
    c.save();
    c.translate(px, py);
    c.scale(0.4, 1);
    arcCycle(
      c,
      fr(t * 0.6),
      0,
      0,
      s * (0.13 + rk * 0.012),
      t * 3 * d + gi,
      5.2,
      s * 0.04,
      ink,
      5 + gi,
    );
    c.restore();
  }
  if (v === 1) {
    // Psychokinetic Daggers: daggers orbit center, align, then dart from entry to exit gate
    const count = 2 + rk;
    for (let i = 0; i < count; i++) {
      const k = fr(q * 1.4 + i / count);
      const x = lerp(-s * 0.28, s * 0.28, ease(k));
      const y = -s * 0.06 + (i - (count - 1) / 2) * s * 0.06;
      c.save();
      c.translate(x, y);
      c.fillStyle = ink.core;
      c.beginPath();
      c.moveTo(s * 0.045, 0);
      c.lineTo(-s * 0.035, -s * 0.012);
      c.lineTo(-s * 0.02, 0);
      c.lineTo(-s * 0.035, s * 0.012);
      c.closePath();
      c.fill();
      c.restore();
      streak(c, x - s * 0.02, y, s * 0.1, s * 0.014, 1, ink, t + i);
    }
    return;
  }
  for (let i = 0; i < 1 + rk; i++) {
    const k = fr(q * 1.4 + i * 0.16),
      x = lerp(-s * 0.3, s * 0.3, ease(k));
    streak(c, x, -s * 0.05 + (i - rk / 2) * s * 0.05, s * 0.14, s * 0.022, 1, ink, t);
  }
}
function heal(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette);
  runeCircle(c, s, t, r.palette[0], r.palette[2], s * (0.26 + rk * 0.025));
  column(c, s, t, ink, s * (0.48 + rk * 0.055), s * (0.1 + rk * 0.012));
  if (v === 1 || rk >= 4) {
    add(c);
    c.fillStyle = rgba(ink.core, 0.85);
    c.fillRect(-s * 0.025, -s * 0.24, s * 0.05, s * 0.26);
    c.fillRect(-s * 0.13, -s * 0.135, s * 0.26, s * 0.05);
    norm(c);
  }
  c.save();
  c.translate(0, -s * 0.05);
  const rings = 1 + Math.min(4, rk);
  for (let i = 0; i < rings; i++) {
    c.save();
    c.translate(0, (i - (rings - 1) / 2) * s * 0.1);
    c.scale(1, 0.28);
    arcCycle(
      c,
      fr(t * 0.5 + i / rings),
      0,
      0,
      s * 0.22,
      t * 2 + i * 2 + v * 0.4,
      4,
      s * 0.05,
      ink,
      i + v,
    );
    c.restore();
  }
  c.restore();
  humanoid(c, 0, s * GY, s * 0.38, shade(r.palette[0], -0.7), 0, 0.6, true);
}
function judgement(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    pulse = 0.8 + 0.2 * Math.sin(t * 4);
  add(c);
  const cy = -s * 0.08;
  const bar = (w: number, h: number, a: number) => {
    const g = c.createLinearGradient(-w, 0, w, 0);
    g.addColorStop(0, rgba(ink.mid, 0));
    g.addColorStop(0.5, rgba(ink.core, a));
    g.addColorStop(1, rgba(ink.mid, 0));
    c.fillStyle = g;
    c.fillRect(-w, cy - h / 2, w * 2, h);
  };
  if (v === 1) {
    c.strokeStyle = rgba(ink.mid, 0.9);
    c.lineWidth = 2 + rk * 0.3;
    c.beginPath();
    c.ellipse(0, s * GY - s * 0.02, s * (0.3 + rk * 0.03) * pulse, s * 0.1 * pulse, 0, 0, TAU);
    c.stroke();
    c.fillStyle = rgba(ink.core, 0.9);
    c.beginPath();
    [-0.14, -0.07, 0, 0.07, 0.14].forEach((x, i) =>
      c.lineTo(x * s, cy - s * (i % 2 ? 0.05 : 0.13 + rk * 0.01)),
    );
    c.lineTo(s * 0.14, cy + s * 0.02);
    c.lineTo(-s * 0.14, cy + s * 0.02);
    c.closePath();
    c.fill();
  } else {
    bar(s * (0.34 + rk * 0.04) * pulse, s * (0.045 + rk * 0.008), 0.8);
    c.save();
    c.translate(0, cy);
    c.rotate(Math.PI / 2 + (v >= 20 ? (v % 5) * 0.2 : 0));
    c.translate(0, -cy);
    bar(s * (0.38 + rk * 0.04) * pulse, s * (0.05 + rk * 0.008), 0.9);
    c.restore();
    if (rk >= 4) {
      c.save();
      c.translate(0, cy);
      c.rotate(Math.PI / 4);
      c.translate(0, -cy);
      bar(s * 0.38 * pulse, s * 0.03, 0.65);
      c.restore();
    }
  }
  c.strokeStyle = rgba(ink.core, 0.7);
  c.lineWidth = 2 + rk * 0.35;
  c.beginPath();
  c.arc(0, cy, s * (0.18 + rk * 0.02), 0, TAU);
  c.stroke();
  norm(c);
  humanoid(c, 0, s * GY, s * 0.38, shade(r.palette[0], -0.7), 0, 0.9, true);
  add(c);
  for (let i = 0; i < 4 + rk * 2; i++) {
    const k = fr(t * 0.7 + i / (4 + rk * 2));
    glowDot(c, Math.sin(i * 3 + v) * s * 0.25, s * 0.2 - k * s * 0.6, s * 0.02, ink.core, 1 - k);
  }
  norm(c);
}
function prism(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f);
  const inks: Ink[] = ["#ff7a1a", "#3ab8ff", "#9be15d", "#e6d3a3", r.palette[0]].map((h) => ({
    edge: shade(h, -0.6),
    mid: h,
    core: "#ffffff",
  }));
  swirl(c, t, 0, -s * 0.1, s * (0.28 + rk * 0.025), 2 + rk, inks, 0.55, 2 + (v % 2), 0.14);
  if (v === 2 || rk >= 4) {
    const shards = 3 + rk;
    for (let i = 0; i < shards; i++) {
      const a = t * 1.4 + (i / shards) * TAU;
      streak(
        c,
        Math.cos(a) * s * 0.26,
        -s * 0.1 + Math.sin(a) * s * 0.18,
        s * 0.12,
        s * 0.018,
        Math.cos(a) > 0 ? 1 : -1,
        inks[i % inks.length]!,
        t + i,
      );
    }
  }
  glowDot(c, 0, -s * 0.1, s * (0.14 + rk * 0.018), "#ffffff", 0.7);
}
function impact(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f, 0.6);
  if (v === 2) {
    // Super Soldier: kinetic punch shock-cone forward + steel-blue armor glint bursts
    humanoid(c, -s * 0.16, s * GY, s * 0.36, "#0d1626", 0.28, 0.9);
    add(c);
    const cone = s * (0.2 + q * (0.18 + rk * 0.03));
    c.strokeStyle = rgba(ink.core, (1 - q) * 0.9);
    c.lineWidth = 2.5 + rk * 0.4;
    c.beginPath();
    c.ellipse(s * 0.04 + q * s * 0.14, -s * 0.06, s * 0.05 + q * s * 0.06, cone * 0.45, 0, 0, TAU);
    c.stroke();
    streak(c, s * (0.1 + q * 0.22), -s * 0.06, s * (0.24 + rk * 0.03), s * 0.035, 1, ink, t);
    glowDot(c, -s * 0.12, -s * 0.12, s * (0.045 + rk * 0.008), "#ffffff", 0.75);
    norm(c);
    return;
  }
  if (v === 3) {
    // Combat Specialist: rapid multi-hit directional martial strike cones + stance silhouette
    humanoid(c, -s * 0.14, s * GY, s * 0.34, "#0d0f17", 0.25, 0.85);
    add(c);
    const strikes = 2 + rk;
    for (let i = 0; i < strikes; i++) {
      const phase = fr(t * 2.2 + i / strikes);
      const sx = s * (0.04 + (i % 2) * 0.14);
      const sy = -s * (0.08 + (i % 3) * 0.07);
      streak(c, sx + phase * s * 0.16, sy, s * 0.22 * (1 - phase * 0.4), s * 0.026, 1, ink, t + i);
      c.strokeStyle = rgba(ink.core, (1 - phase) * 0.85);
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(
        sx + s * 0.1,
        sy,
        s * 0.03 + phase * s * 0.09,
        s * 0.08 + phase * s * 0.12,
        0,
        0,
        TAU,
      );
      c.stroke();
    }
    norm(c);
    return;
  }
  if (v === 0) {
    // Destructive Legendary: jagged seismic fissure lines across ground + crater dome waves
    const fissures = 3 + rk;
    c.strokeStyle = rgba(ink.mid, 0.9);
    c.lineWidth = 2 + rk * 0.35;
    for (let i = 0; i < fissures; i++) {
      const side = i - (fissures - 1) / 2;
      c.beginPath();
      c.moveTo(0, s * GY);
      c.lineTo(side * s * 0.07, s * GY - s * 0.03);
      c.lineTo(side * s * 0.14, s * GY + s * 0.04);
      c.stroke();
    }
  }
  groundBurst(c, 0, s * GY, s * (0.72 + rk * 0.08), q, ink, "#a8977a", 3 + rk);
  add(c);
  const rings = 1 + Math.min(4, rk);
  for (let i = 0; i < rings; i++) {
    const k = fr(q + i * (1 / rings));
    c.strokeStyle = rgba(ink.core, 1 - k);
    c.lineWidth = (2.5 + rk * 0.5) * (1 - k);
    c.beginPath();
    c.ellipse(0, s * GY, s * 0.55 * k, s * 0.1 * k, 0, 0, TAU);
    c.stroke();
  }
  norm(c);
}
function mind(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette);
  if (v === 0) {
    // Manipulation: upper control eye/sigil casting luminous puppet strings down onto swaying silhouette
    const eyeY = -s * 0.25;
    const sway = Math.sin(t * 2.2) * s * 0.06;
    humanoid(c, sway, s * GY, s * 0.34, "#14081c", sway * 0.02, 0.65);
    add(c);
    const strings = 2 + rk;
    for (let i = 0; i < strings; i++) {
      const tx = sway + (i / (strings - 1 || 1) - 0.5) * s * 0.22;
      c.strokeStyle = rgba(i % 2 ? ink.core : ink.mid, 0.78);
      c.lineWidth = 1.4 + rk * 0.2;
      c.beginPath();
      c.moveTo(0, eyeY + s * 0.02);
      c.quadraticCurveTo(tx * 0.5, -s * 0.06, tx, s * 0.05);
      c.stroke();
    }
    glowDot(c, 0, eyeY, s * (0.065 + rk * 0.01), ink.core, 0.9);
    norm(c);
    return;
  }
  if (v === 1) {
    // Rebuilt Jester: stylized dual trickster diamond masks + orbiting chaos cards & spiral ribbons
    const count = 2 + rk;
    for (let i = 0; i < count; i++) {
      const ang = t * 2.4 + (i / count) * TAU;
      const mx = Math.cos(ang) * s * (0.2 + rk * 0.02);
      const my = -s * 0.08 + Math.sin(ang) * s * 0.13;
      c.save();
      c.translate(mx, my);
      c.rotate(Math.sin(t * 3 + i) * 0.35);
      c.fillStyle = i % 2 ? ink.mid : ink.core;
      c.beginPath();
      c.moveTo(0, -s * 0.045);
      c.lineTo(s * 0.032, 0);
      c.lineTo(0, s * 0.045);
      c.lineTo(-s * 0.032, 0);
      c.closePath();
      c.fill();
      c.strokeStyle = ink.edge;
      c.lineWidth = 1.4;
      c.stroke();
      c.restore();
    }
    swirl(
      c,
      t * 1.4,
      0,
      -s * 0.08,
      s * 0.24,
      Math.min(4, 1 + Math.ceil(rk / 2)),
      ink,
      0.5,
      2.2,
      0.08,
    );
  } else if (v === 2) {
    // Spy: sweeping stealth radar scan wedge + scanline static dissolve
    add(c);
    const sweep = t * 2;
    c.fillStyle = rgba(ink.mid, 0.24 + rk * 0.04);
    c.beginPath();
    c.moveTo(0, -s * 0.1);
    c.arc(0, -s * 0.1, s * (0.28 + rk * 0.025), sweep, sweep + 0.75);
    c.closePath();
    c.fill();
    for (let i = 0; i < 4 + rk * 2; i++) {
      const y = -s * 0.28 + (i / (4 + rk * 2)) * s * 0.38;
      c.fillStyle = rgba(ink.core, 0.45);
      c.fillRect(-s * 0.22 + Math.sin(t * 9 + i) * s * 0.08, y, s * 0.3, 1.5);
    }
    norm(c);
  } else if (v === 3) {
    // Rebuilt Tactician: perspective tilted holographic battle grid + sweep radar + linked node lock-ons
    c.save();
    c.translate(0, s * 0.12);
    c.scale(1, 0.38);
    c.strokeStyle = rgba(ink.mid, 0.5);
    c.lineWidth = 1.2;
    const cols = 2 + Math.ceil(rk / 2);
    for (let i = -cols; i <= cols; i++) {
      const off = (i / cols) * s * 0.36;
      c.beginPath();
      c.moveTo(off, -s * 0.36);
      c.lineTo(off, s * 0.36);
      c.moveTo(-s * 0.36, off);
      c.lineTo(s * 0.36, off);
      c.stroke();
    }
    add(c);
    c.save();
    c.rotate(t * 1.8);
    c.strokeStyle = rgba(ink.core, 0.85);
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(s * 0.34, 0);
    c.stroke();
    c.restore();
    c.restore();
    const nodes = 2 + rk;
    for (let i = 0; i < nodes; i++) {
      const a = t * 0.6 + (i / nodes) * TAU;
      const nx = Math.cos(a) * s * 0.26;
      const ny = -s * 0.08 + Math.sin(a) * s * 0.14;
      c.strokeStyle = rgba(ink.core, 0.6);
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, -s * 0.08);
      c.lineTo(nx, ny);
      c.stroke();
      glowDot(c, nx, ny, s * 0.025, ink.core, 0.9);
    }
    norm(c);
  } else if (v === 4) {
    // Omen Sight crimson fracture rays
    add(c);
    const rays = 3 + rk * 2;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU + t * 0.4;
      c.strokeStyle = rgba(ink.mid, 0.75);
      c.lineWidth = 1.5 + rk * 0.3;
      c.beginPath();
      c.moveTo(0, -s * 0.1);
      c.lineTo(Math.cos(a) * s * (0.28 + rk * 0.03), -s * 0.1 + Math.sin(a) * s * 0.26);
      c.stroke();
    }
    norm(c);
  }
  add(c);
  for (let i = 0; i < 2 + rk; i++) {
    const k = fr(t * 0.5 + i / (2 + rk));
    c.strokeStyle = rgba(ink.mid, 1 - k);
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, -s * 0.1, s * 0.45 * k, s * 0.22 * k, (v % 4) * 0.2, 0, TAU);
    c.stroke();
  }
  c.fillStyle = ink.core;
  c.beginPath();
  c.ellipse(0, -s * 0.1, s * 0.09, s * 0.035 * (0.4 + 0.6 * Math.abs(Math.sin(t))), 0, 0, TAU);
  c.fill();
  norm(c);
  c.fillStyle = "#000";
  c.beginPath();
  c.arc(0, -s * 0.1, s * 0.018, 0, TAU);
  c.fill();
}
function frost(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f, 0.8);
  // Crisp glacial floor circle + 6-fold branched crystalline ice dendrites scaling Lv 1..5
  add(c);
  glowDot(c, 0, s * GY - s * 0.04, s * (0.24 + rk * 0.035), ink.mid, 0.35 + rk * 0.06);
  c.strokeStyle = rgba(ink.core, 0.65);
  c.lineWidth = 1.6;
  c.beginPath();
  c.ellipse(0, s * GY, s * (0.24 + rk * 0.03), s * 0.075, 0, 0, TAU);
  c.stroke();
  // Branched crystalline snowflake mandala
  c.save();
  c.translate(0, -s * 0.07);
  c.rotate(t * 0.35 + v * 0.2);
  const arms = 6;
  const armLen = s * (0.16 + rk * 0.032) * (0.8 + 0.2 * Math.sin(q * TAU));
  c.strokeStyle = rgba(ink.core, 0.9);
  c.lineWidth = 1.8 + rk * 0.25;
  for (let i = 0; i < arms; i++) {
    c.rotate(TAU / arms);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(armLen, 0);
    if (rk >= 2) {
      c.moveTo(armLen * 0.55, 0);
      c.lineTo(armLen * 0.78, s * 0.04);
      c.moveTo(armLen * 0.55, 0);
      c.lineTo(armLen * 0.78, -s * 0.04);
    }
    if (rk >= 4) {
      c.moveTo(armLen * 0.8, 0);
      c.lineTo(armLen * 0.95, s * 0.03);
      c.moveTo(armLen * 0.8, 0);
      c.lineTo(armLen * 0.95, -s * 0.03);
    }
    c.stroke();
  }
  c.restore();
  // Rising crystalline ice spires along the ground
  const spires = 2 + rk * 2;
  for (let i = 0; i < spires; i++) {
    const sx = (i / (spires - 1 || 1) - 0.5) * s * 0.44;
    const h =
      s *
      (0.1 + rk * 0.025 + 0.06 * Math.abs(Math.sin(i * 2.1))) *
      Math.sin(Math.PI * fr(q + i * 0.07));
    c.fillStyle = rgba(i % 2 ? ink.mid : ink.core, 0.8);
    c.beginPath();
    c.moveTo(sx - s * 0.018, s * GY);
    c.lineTo(sx, s * GY - h);
    c.lineTo(sx + s * 0.018, s * GY);
    c.closePath();
    c.fill();
  }
  norm(c);
}
function beam(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    ink = inkOf(r.palette),
    q = cyc(f, 0.5);
  if (v === 4) {
    // Rebuilt Energy Manipulation: multi-ring hexagonal plasma reactor + charge filaments + shockwave pulse
    const cy = -s * 0.06;
    const orb = 0.06 + rk * 0.015 + 0.09 * Math.sin(q * Math.PI);
    add(c);
    glowDot(c, 0, cy, s * orb * 2.4, ink.mid, 0.65);
    glowDot(c, 0, cy, s * orb, ink.core, 0.95);
    const rings = 1 + Math.floor(rk / 2);
    for (let ringIdx = 0; ringIdx < rings; ringIdx++) {
      const rr = s * (orb + 0.05 + ringIdx * 0.065);
      c.save();
      c.translate(0, cy);
      c.rotate(t * (1.8 + ringIdx * 0.6) * (ringIdx % 2 ? -1 : 1));
      c.strokeStyle = rgba(ringIdx % 2 ? ink.mid : ink.core, 0.8);
      c.lineWidth = 1.8;
      c.beginPath();
      for (let k = 0; k <= 6; k++) {
        const ang = (k / 6) * TAU;
        const px = Math.cos(ang) * rr;
        const py = Math.sin(ang) * rr;
        if (k === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
      c.restore();
    }
    for (let i = 0; i < 3 + rk * 2; i++) {
      const a = t * 2.5 + (i / (3 + rk * 2)) * TAU;
      const dist = s * (0.34 - q * 0.24);
      glowDot(c, Math.cos(a) * dist, cy + Math.sin(a) * dist, s * 0.018, ink.core, 1 - q * 0.5);
    }
    norm(c);
    return;
  }
  if (v === 0) {
    // Rebuilt Long-Range Overwatch: telescopic scope crosshair lock + scanning laser + rail beam fire
    const tx = Math.sin(t * 1.4) * s * 0.14;
    const ty = -s * 0.08 + Math.cos(t * 1.1) * s * 0.08;
    add(c);
    c.strokeStyle = rgba(ink.mid, 0.75);
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(tx, ty, s * (0.14 + rk * 0.015), 0, TAU);
    c.stroke();
    c.beginPath();
    c.moveTo(tx - s * 0.22, ty);
    c.lineTo(tx + s * 0.22, ty);
    c.moveTo(tx, ty - s * 0.22);
    c.lineTo(tx, ty + s * 0.22);
    c.stroke();
    if (q < 0.45) {
      const beamAlpha = 1 - q / 0.45;
      c.strokeStyle = rgba(ink.core, beamAlpha);
      c.lineWidth = 2 + rk * 0.8;
      c.beginPath();
      c.moveTo(-s * 0.5, s * 0.14);
      c.lineTo(tx, ty);
      c.stroke();
      glowDot(c, tx, ty, s * (0.12 + rk * 0.025) * beamAlpha, ink.core, beamAlpha);
    }
    norm(c);
    return;
  }
  if (v === 1) {
    // Rebuilt Long-Range: precision ballistic arrow/bolt trajectory with spiral slipstream rings
    const x = lerp(-s * 0.46, s * 0.46, ease(q));
    const y = -s * 0.06 - Math.sin(q * Math.PI) * s * 0.12;
    streak(c, x, y, s * (0.36 + rk * 0.03), s * (0.024 + rk * 0.003), 1, ink, t);
    add(c);
    for (let i = 0; i < 1 + Math.ceil(rk / 2); i++) {
      const rx = lerp(-s * 0.36, x - s * 0.08, (i + 1) / (2 + Math.ceil(rk / 2)));
      c.strokeStyle = rgba(ink.core, 0.55 * (1 - q));
      c.lineWidth = 1.8;
      c.beginPath();
      c.ellipse(
        rx,
        y + Math.sin(rx * 0.04) * s * 0.02,
        s * 0.025,
        s * (0.07 + rk * 0.01),
        0,
        0,
        TAU,
      );
      c.stroke();
    }
    norm(c);
    return;
  }
  const x = lerp(-s * 0.5, s * 0.5, ease(q));
  for (let i = 0; i < 4 + rk; i++) {
    c.globalAlpha = 0.45 * (1 - q);
    c.fillStyle = "#d8c79a";
    c.beginPath();
    c.ellipse(
      x - s * 0.25 - i * s * 0.04,
      s * GY - s * 0.04 - Math.abs(Math.sin(i)) * s * 0.05,
      s * 0.05,
      s * 0.035,
      0,
      0,
      TAU,
    );
    c.fill();
  }
  c.globalAlpha = 1;
  const lanes = v === 5 ? Math.min(5, 1 + rk) : v >= 20 ? 1 + (v % 3) : 1 + Math.floor(rk / 3);
  for (let i = 0; i < lanes; i++) {
    const yy = -s * 0.05 + (i - (lanes - 1) / 2) * s * 0.09;
    streak(c, x - i * s * 0.06, yy, s * (0.38 + rk * 0.03), s * 0.036, 1, ink, t + i);
  }
}

export const BRUSH_PAINT: Partial<Record<FxMotif, (f: PF) => void>> = {
  blade,
  blood,
  void: voidRift,
  arcane,
  chrono,
  chaos,
  tech,
  shadow,
  ghost,
  portal,
  heal,
  judgement,
  prism,
  impact,
  mind,
  frost,
  beam,
};

import { PAINT } from "@/components/fx-painters";
/** Every motif's painter: shape painters first, brush painters for the rest. */
export const ALL_PAINT: Partial<Record<FxMotif, (f: PF) => void>> = { ...BRUSH_PAINT, ...PAINT };
