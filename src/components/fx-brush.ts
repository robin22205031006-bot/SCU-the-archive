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
  if (v >= 3 || r.key === "demonic_hemokinesis" || rk >= 3) {
    add(c);
    for (let i = 0; i < 4 + rk * 3; i++) {
      const k = fr(t * 0.8 + i / (4 + rk * 3)),
        x = Math.sin(i * 3.1 + v) * s * 0.22;
      glowDot(c, x, s * GY - k * s * 0.6, s * 0.055 * (1 - k), "#ff1a1a", (1 - k) * 0.7);
    }
    norm(c);
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
  groundBurst(c, 0, s * GY, s * (0.62 + rk * 0.08), fr(q * 1.3), ink, "#3a0a0e", 3 + rk);
  for (let i = 0; i < 4 + rk * 2; i++) {
    const k = fr(t * 1.4 + i / (4 + rk * 2));
    glowDot(
      c,
      Math.cos(i + v * 0.2) * s * 0.25 * k,
      -s * 0.1 + k * k * s * 0.35,
      s * 0.012,
      "#ff3344",
      1 - k,
    );
  }
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
  const motes = 8 + rk * 5;
  for (let i = 0; i < motes; i++) {
    const k = fr(t * 0.9 + i / motes),
      a = i * 2.4 + t + v * 0.2,
      d = s * 0.48 * (1 - k);
    glowDot(
      c,
      Math.cos(a) * d,
      -s * 0.08 + Math.sin(a) * d * 0.45,
      s * 0.014,
      i % 2 ? ink.mid : ink.core,
      k,
    );
  }
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
  if (v === 3) {
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
    }
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
        v === 2 ? i * 0.9 : 0,
        v === 4 ? 5.2 : 3.6,
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
  swirl(c, -t * (1 + (v % 5) * 0.2), 0, -s * 0.1, s * (0.3 + rk * 0.03), 1 + Math.ceil(rk / 2), ink, 0.8, -1.2, 0.09);
}
function chaos(f: PF) {
  const { c, s, t, r, v, step, rnd } = f,
    rk = rankLevel(f),
    light: Ink = { edge: "#1a1a1a", mid: "#f4f4f4", core: "#ffffff" },
    dark: Ink = { edge: "#000000", mid: shade(r.palette[0], -0.2), core: r.palette[2] };
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
    r.key === "chaos_order" ? [light, dark] : [dark, inkOf(r.palette)],
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
  if (v === 3 || rk >= 4) {
    add(c);
    c.save();
    c.translate(0, -s * 0.08);
    c.rotate(t * 2.5);
    c.strokeStyle = rgba(ink.mid, 0.75);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(s * (0.28 + rk * 0.02), 0);
    c.stroke();
    c.restore();
    c.strokeStyle = rgba(ink.core, 0.55);
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(0, -s * 0.08, s * (0.26 + rk * 0.02), 0, TAU);
    c.stroke();
    norm(c);
  }
  if (v === 1) {
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
      c.restore();
    }
    norm(c);
  }
  humanoid(c, 0, s * GY, s * 0.42, "#0c1016", 0, 0.3);
  const count = 4 + rk * 2;
  for (let i = 0; i < count; i++) {
    const k = clamp(q * 1.6 - i * 0.07),
      a = i * 0.63 + (v % 4) * 0.4,
      d = s * 0.4 * (1 - ease(k)),
      x = Math.cos(a) * d * 1.3,
      y = -s * 0.05 + (i / count - 0.5) * s * 0.35 + Math.sin(a) * d * 0.3;
    c.save();
    c.translate(x, y);
    c.rotate((1 - k) * 3 + v * 0.2);
    c.fillStyle = ink.edge;
    c.fillRect(-s * 0.03, -s * 0.02, s * 0.06, s * 0.04);
    add(c);
    c.strokeStyle = ink.core;
    c.lineWidth = 1.2;
    c.strokeRect(-s * 0.03, -s * 0.02, s * 0.06, s * 0.04);
    norm(c);
    c.restore();
  }
  add(c);
  for (let i = 0; i < 1 + Math.ceil(rk / 2); i++) {
    const k = fr(q * 1.5 + i / (1 + Math.ceil(rk / 2)));
    c.strokeStyle = rgba(ink.mid, 1 - k);
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, s * GY, s * 0.45 * k, s * 0.08 * k, 0, 0, TAU);
    c.stroke();
  }
  for (const sx of [-1, 1])
    glowDot(c, sx * s * 0.04, s * 0.26, s * (0.04 + rk * 0.008 + 0.02 * Math.sin(t * 30 + v)), ink.core, 0.8);
  norm(c);
}
function shadow(f: PF) {
  const { c, s, t, r, v } = f,
    rk = rankLevel(f),
    q = cyc(f, 0.7);
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
  const clones = 2 + rk;
  for (let i = 0; i < clones; i++) {
    const x = lerp(-s * 0.4, s * 0.3, ease(clamp(q * 1.5 - i * 0.06)));
    c.globalAlpha = 0.15 + (i / clones) * 0.7;
    humanoid(c, x, s * GY, s * 0.38, i === clones - 1 ? "#000000" : shade(r.palette[0], -0.6), 0.2, 0.7);
  }
  c.globalAlpha = 1;
  add(c);
  for (let i = 0; i < 6 + rk * 3; i++) {
    const k = fr(t + i / (6 + rk * 3));
    glowDot(
      c,
      lerp(-s * 0.4, s * 0.3, i / (6 + rk * 3)),
      s * GY - s * 0.2 - k * s * 0.2,
      s * 0.03 * (1 - k),
      "#3a2a55",
      1 - k,
    );
  }
  norm(c);
  if (q > 0.55)
    arcCycle(
      c,
      (q - 0.55) / 0.45,
      s * 0.32,
      -s * 0.05,
      s * (0.22 + rk * 0.025),
      -1.9 - (v % 6) * 0.25,
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
  const specters = 1 + Math.min(4, rk);
  for (let i = 0; i < specters; i++) {
    const x = Math.sin(t * 1.5 + i * 1.7 + v * 0.3) * s * 0.25,
      a = 0.25 + 0.2 * Math.sin(t * 3 + i);
    c.globalAlpha = a;
    humanoid(c, x, s * GY, s * 0.4, shade(r.palette[0], 0.3), 0, 0.4, true);
  }
  c.globalAlpha = 1;
  add(c);
  for (let i = 0; i < 8 + rk * 3; i++) {
    const k = fr(t * 0.6 + i / (8 + rk * 3)),
      x = Math.sin(i * 2.3 + t + v) * s * 0.3;
    glowDot(c, x, s * GY - k * s * 0.7, s * 0.04 * (1 - k), ink.core, (1 - k) * 0.6);
  }
  norm(c);
  swirl(
    c,
    t,
    0,
    -s * 0.1,
    s * (0.22 + rk * 0.025),
    1 + Math.ceil(rk / 2),
    { ...ink, edge: "rgba(0,0,0,0)" as string },
    0.6,
    1 + (v % 3) * 0.25,
    0.1,
  );
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
    arcCycle(c, fr(t * 0.6), 0, 0, s * (0.13 + rk * 0.012), t * 3 * d + gi, 5.2, s * 0.04, ink, 5 + gi);
    c.restore();
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
    arcCycle(c, fr(t * 0.5 + i / rings), 0, 0, s * 0.22, t * 2 + i * 2 + v * 0.4, 4, s * 0.05, ink, i + v);
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
      c.ellipse(sx + s * 0.1, sy, s * 0.03 + phase * s * 0.09, s * 0.08 + phase * s * 0.12, 0, 0, TAU);
      c.stroke();
    }
    norm(c);
    return;
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
    swirl(c, t * 1.4, 0, -s * 0.08, s * 0.24, Math.min(4, 1 + Math.ceil(rk / 2)), ink, 0.5, 2.2, 0.08);
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
  arcCycle(
    c,
    q,
    -s * 0.05,
    0,
    s * (0.25 + rk * 0.025),
    2.4 - (v % 7) * 0.25,
    -2.6,
    s * (0.065 + rk * 0.008),
    ink,
    6 + v,
  );
  groundBurst(c, s * 0.1, s * GY, s * (0.7 + rk * 0.07), fr(q + 0.3), ink, "#cfe6f2", 3 + rk);
  if (v >= 20 || rk >= 3) {
    add(c);
    c.save();
    c.translate(0, -s * 0.06);
    c.rotate(t * 0.6 + v);
    const pts = 4 + rk;
    c.strokeStyle = rgba(ink.core, 0.7);
    c.lineWidth = 2;
    for (let i = 0; i < pts; i++) {
      c.rotate(TAU / pts);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(s * (0.18 + rk * 0.025), 0);
      c.stroke();
    }
    c.restore();
    norm(c);
  }
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
      c.ellipse(rx, y + Math.sin(rx * 0.04) * s * 0.02, s * 0.025, s * (0.07 + rk * 0.01), 0, 0, TAU);
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
