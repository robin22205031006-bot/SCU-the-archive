/** Painted brush-stroke FX (dark edges, bright cores, shard break-up) plus painters for the remaining motifs. Browser-only (canvas). */
import type { FxMotif } from "@/lib/ability-fx";
import { glowDot, humanoid, rgba, runeCircle, type PF } from "@/components/fx-painters";

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
    ink = inkOf(r.palette),
    q = cyc(f, 0.8);
  if (r.key === "gladiokinesis" || v === 2) {
    for (let i = 0; i < 6; i++) {
      const a = t * 1.6 + (i * TAU) / 6,
        x = Math.cos(a) * s * 0.3,
        y = -s * 0.05 + Math.sin(a) * s * 0.12;
      streak(c, x, y, s * 0.2, s * 0.025, Math.sin(a) > 0 ? -1 : 1, ink, t);
    }
    arcCycle(c, q, 0, 0, s * 0.35, -2.4, 2.8, s * 0.08, ink, 9);
    return;
  }
  arcCycle(c, q, 0, -s * 0.05, s * 0.34, -2.6 + v * 0.3, 2.9, s * 0.1, ink, 2);
  arcCycle(
    c,
    fr(q + 0.45),
    s * 0.04,
    -s * 0.02,
    s * 0.3,
    0.6 - v * 0.2,
    -2.6,
    s * 0.08,
    { ...ink, mid: shade(ink.mid, 0.25) },
    4,
  );
}
function blood(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette),
    q = cyc(f);
  if (v >= 3 || r.key === "demonic_hemokinesis") {
    add(c);
    for (let i = 0; i < 14; i++) {
      const k = fr(t * 0.8 + i / 14),
        x = Math.sin(i * 3.1) * s * 0.2;
      glowDot(c, x, s * GY - k * s * 0.6, s * 0.06 * (1 - k), "#ff1a1a", (1 - k) * 0.7);
    }
    norm(c);
  }
  swirl(c, t, 0, -s * 0.1, s * 0.3, 3 + (v % 2), ink, 0.5, 2.6, 0.16);
  groundBurst(c, 0, s * GY, s * 0.8, fr(q * 1.3), ink, "#3a0a0e", 5 + v);
  for (let i = 0; i < 10; i++) {
    const k = fr(t * 1.4 + i * 0.1);
    glowDot(
      c,
      Math.cos(i) * s * 0.25 * k,
      -s * 0.1 + k * k * s * 0.35,
      s * 0.012,
      "#ff3344",
      1 - k,
    );
  }
}
function voidRift(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette),
    q = cyc(f);
  c.save();
  c.translate(0, -s * 0.08);
  c.rotate(-0.35 + v * 0.1);
  const open = Math.sin(Math.PI * clamp(q * 1.2)) * (r.power > 5 ? 1.25 : 1);
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
  c.lineWidth = 3;
  c.stroke();
  add(c);
  c.strokeStyle = ink.core;
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();
  for (let i = 0; i < 26; i++) {
    const k = fr(t * 0.9 + i / 26),
      a = i * 2.4 + t,
      d = s * 0.5 * (1 - k);
    glowDot(
      c,
      Math.cos(a) * d,
      -s * 0.08 + Math.sin(a) * d * 0.45,
      s * 0.014,
      i % 2 ? ink.mid : ink.core,
      k,
    );
  }
  swirl(c, -t, 0, -s * 0.08, s * 0.36, 2, ink, 0.4, -1.4, 0.1);
  norm(c);
}
function arcane(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette);
  runeCircle(c, s, t, r.palette[0], r.palette[2], s * (0.3 + v * 0.02));
  column(c, s, t, ink, s * 0.55, s * 0.16);
  c.save();
  c.translate(0, -s * 0.15);
  for (let i = 0; i < 3; i++) {
    c.save();
    c.rotate(t * (1 + i * 0.4) * (i % 2 ? -1 : 1));
    c.scale(1, 0.35 + i * 0.15);
    arcCycle(c, fr(t * 0.5 + i / 3), 0, 0, s * (0.2 + i * 0.06), 0, 3.6, s * 0.03, ink, i);
    c.restore();
  }
  c.restore();
}
function chrono(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette);
  c.save();
  c.translate(0, -s * 0.1);
  add(c);
  for (let i = 0; i < 4; i++) {
    c.strokeStyle = rgba(i % 2 ? ink.mid : ink.core, 0.6);
    c.lineWidth = 2;
    c.setLineDash([s * 0.02, s * 0.015]);
    c.lineDashOffset = t * 60 * (i % 2 ? 1 : -1);
    c.beginPath();
    c.arc(0, 0, s * (0.12 + i * 0.07), 0, TAU);
    c.stroke();
  }
  c.setLineDash([]);
  c.strokeStyle = ink.core;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(Math.cos(t * 2) * s * 0.25, Math.sin(t * 2) * s * 0.25);
  c.moveTo(0, 0);
  c.lineTo(Math.cos(t * 0.3) * s * 0.15, Math.sin(t * 0.3) * s * 0.15);
  c.stroke();
  norm(c);
  c.restore();
  swirl(c, -t * (1 + v * 0.2), 0, -s * 0.1, s * 0.42, 3, ink, 0.8, -1.2, 0.09);
}
function chaos(f: PF) {
  const { c, s, t, r, v } = f,
    light: Ink = { edge: "#1a1a1a", mid: "#f4f4f4", core: "#ffffff" },
    dark: Ink = { edge: "#000000", mid: shade(r.palette[0], -0.2), core: r.palette[2] };
  swirl(
    c,
    t,
    0,
    -s * 0.1,
    s * 0.34,
    4,
    r.key === "chaos_order" ? [light, dark] : [dark, inkOf(r.palette)],
    0.7,
    2.8 + v * 0.2,
    0.2,
  );
  add(c);
  for (let i = 0; i < 16; i++) {
    const k = fr(t * 1.3 + i / 16),
      a = i * 1.7;
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
    ink = inkOf(r.palette),
    q = cyc(f);
  humanoid(c, 0, s * GY, s * 0.42, "#0c1016", 0, 0.3);
  for (let i = 0; i < 10; i++) {
    const k = clamp(q * 1.6 - i * 0.07),
      a = i * 0.63,
      d = s * 0.4 * (1 - ease(k)),
      x = Math.cos(a) * d * 1.3,
      y = -s * 0.05 + (i / 10 - 0.5) * s * 0.35 + Math.sin(a) * d * 0.3;
    c.save();
    c.translate(x, y);
    c.rotate((1 - k) * 3);
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
  for (let i = 0; i < 3; i++) {
    const k = fr(q * 1.5 + i / 3);
    c.strokeStyle = rgba(ink.mid, 1 - k);
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, s * GY, s * 0.45 * k, s * 0.08 * k, 0, 0, TAU);
    c.stroke();
  }
  for (const sx of [-1, 1])
    glowDot(c, sx * s * 0.04, s * 0.26, s * (0.06 + 0.02 * Math.sin(t * 30 + v)), ink.core, 0.8);
  norm(c);
}
function shadow(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette),
    q = cyc(f, 0.7);
  for (let i = 0; i < 5; i++) {
    const x = lerp(-s * 0.4, s * 0.3, ease(clamp(q * 1.5 - i * 0.06)));
    c.globalAlpha = 0.15 + i * 0.15;
    humanoid(c, x, s * GY, s * 0.38, i === 4 ? "#000000" : shade(r.palette[0], -0.6), 0.2, 0.7);
  }
  c.globalAlpha = 1;
  add(c);
  for (let i = 0; i < 18; i++) {
    const k = fr(t + i / 18);
    glowDot(
      c,
      lerp(-s * 0.4, s * 0.3, i / 18),
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
      s * 0.3,
      -1.9 - v * 0.2,
      2.2,
      s * 0.05,
      { edge: "#000000", mid: r.palette[0], core: "#ffffff" },
      7,
    );
}
function ghost(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette);
  for (let i = 0; i < 4; i++) {
    const x = Math.sin(t * 1.5 + i * 1.7) * s * 0.25,
      a = 0.25 + 0.2 * Math.sin(t * 3 + i);
    c.globalAlpha = a;
    humanoid(c, x, s * GY, s * 0.4, shade(r.palette[0], 0.3), 0, 0.4, true);
  }
  c.globalAlpha = 1;
  add(c);
  for (let i = 0; i < 20; i++) {
    const k = fr(t * 0.6 + i / 20),
      x = Math.sin(i * 2.3 + t) * s * 0.3;
    glowDot(c, x, s * GY - k * s * 0.7, s * 0.04 * (1 - k), ink.core, (1 - k) * 0.6);
  }
  norm(c);
  swirl(
    c,
    t,
    0,
    -s * 0.1,
    s * 0.3,
    2 + (v % 2),
    { ...ink, edge: "rgba(0,0,0,0)" as string },
    0.6,
    1,
    0.1,
  );
}
function portal(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette),
    q = cyc(f);
  for (const [px, d] of [
    [-s * 0.3, 1],
    [s * 0.3, -1],
  ] as const) {
    c.save();
    c.translate(px, -s * 0.05);
    c.scale(0.35, 1);
    c.fillStyle = "#04030a";
    c.beginPath();
    c.arc(0, 0, s * 0.16, 0, TAU);
    c.fill();
    c.restore();
    c.save();
    c.translate(px, -s * 0.05);
    c.scale(0.4, 1);
    arcCycle(c, fr(t * 0.6), 0, 0, s * 0.17, t * 3 * d, 5.2, s * 0.04, ink, 5);
    c.restore();
  }
  for (let i = 0; i < 3 + (v % 2); i++) {
    const k = fr(q * 1.4 + i * 0.18),
      x = lerp(-s * 0.3, s * 0.3, ease(k));
    streak(c, x, -s * 0.05 + (i - 1) * s * 0.06, s * 0.14, s * 0.022, 1, ink, t);
  }
}
function heal(f: PF) {
  const { c, s, t, r } = f,
    ink = inkOf(r.palette);
  runeCircle(c, s, t, r.palette[0], r.palette[2], s * 0.34);
  column(c, s, t, ink, s * 0.7, s * 0.14);
  c.save();
  c.translate(0, -s * 0.05);
  for (let i = 0; i < 3; i++) {
    c.save();
    c.translate(0, (i - 1) * s * 0.14);
    c.scale(1, 0.28);
    arcCycle(c, fr(t * 0.5 + i / 3), 0, 0, s * 0.22, t * 2 + i * 2, 4, s * 0.05, ink, i);
    c.restore();
  }
  c.restore();
  humanoid(c, 0, s * GY, s * 0.38, shade(r.palette[0], -0.7), 0, 0.6, true);
}
function judgement(f: PF) {
  const { c, s, t, r } = f,
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
  bar(s * 0.5 * pulse, s * 0.07, 0.8);
  c.save();
  c.translate(0, cy);
  c.rotate(Math.PI / 2);
  c.translate(0, -cy);
  bar(s * 0.55 * pulse, s * 0.08, 0.9);
  c.restore();
  c.strokeStyle = rgba(ink.core, 0.7);
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, cy, s * 0.24, 0, TAU);
  c.stroke();
  norm(c);
  humanoid(c, 0, s * GY, s * 0.38, shade(r.palette[0], -0.7), 0, 0.9, true);
  add(c);
  for (let i = 0; i < 12; i++) {
    const k = fr(t * 0.7 + i / 12);
    glowDot(c, Math.sin(i * 3) * s * 0.25, s * 0.2 - k * s * 0.6, s * 0.02, ink.core, 1 - k);
  }
  norm(c);
}
function prism(f: PF) {
  const { c, s, t, r } = f;
  const inks: Ink[] = ["#ff7a1a", "#3ab8ff", "#9be15d", "#e6d3a3", r.palette[0]].map((h) => ({
    edge: shade(h, -0.6),
    mid: h,
    core: "#ffffff",
  }));
  swirl(c, t, 0, -s * 0.1, s * 0.38, 5, inks, 0.55, 2, 0.14);
  glowDot(c, 0, -s * 0.1, s * 0.2, "#ffffff", 0.7);
}
function impact(f: PF) {
  const { c, s, t, r, v } = f,
    ink = inkOf(r.palette),
    q = cyc(f, 0.6);
  groundBurst(c, 0, s * GY, s, q, ink, "#a8977a", 5 + (v % 4));
  add(c);
  for (let i = 0; i < 2; i++) {
    const k = fr(q + i * 0.3);
    c.strokeStyle = rgba(ink.core, 1 - k);
    c.lineWidth = 4 * (1 - k);
    c.beginPath();
    c.ellipse(0, s * GY, s * 0.55 * k, s * 0.1 * k, 0, 0, TAU);
    c.stroke();
  }
  norm(c);
}
function mind(f: PF) {
  const { c, s, t, r } = f,
    ink = inkOf(r.palette);
  add(c);
  for (let i = 0; i < 5; i++) {
    const k = fr(t * 0.5 + i / 5);
    c.strokeStyle = rgba(ink.mid, 1 - k);
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, -s * 0.1, s * 0.45 * k, s * 0.22 * k, 0, 0, TAU);
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
  const { c, s, r, v } = f,
    ink = inkOf(r.palette),
    q = cyc(f, 0.8);
  arcCycle(c, q, -s * 0.05, 0, s * 0.34, 2.4 - v * 0.1, -2.6, s * 0.09, ink, 6);
  groundBurst(c, s * 0.1, s * GY, s * 0.9, fr(q + 0.3), ink, "#cfe6f2", 6);
}
function beam(f: PF) {
  const { c, s, t, r } = f,
    ink = inkOf(r.palette),
    q = cyc(f, 0.5);
  const x = lerp(-s * 0.5, s * 0.5, ease(q));
  for (let i = 0; i < 8; i++) {
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
  streak(c, x, -s * 0.05, s * 0.5, s * 0.04, 1, ink, t);
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
