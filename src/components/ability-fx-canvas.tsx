import { useEffect, useRef } from "react";
import type { FxRecipe } from "@/lib/ability-fx";
import { guardianAura, type PF } from "@/components/fx-painters";
import { ALL_PAINT } from "@/components/fx-brush";

type C = CanvasRenderingContext2D;
interface F {
  c: C;
  t: number;
  p: number;
  s: number;
  r: FxRecipe;
  rnd: (i: number) => number;
  v: number;
}

const TAU = Math.PI * 2;
function seeded(seed: number) {
  return (i: number) => {
    const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
}
function glow(c: C, col: string, b: number) {
  c.shadowColor = col;
  c.shadowBlur = b;
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
function bolt(
  c: C,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  jag: number,
  rnd: (i: number) => number,
  seed: number,
  w: number,
  col: string,
  core: string,
) {
  const pts: [number, number][] = [[x0, y0]];
  const n = 9;
  for (let i = 1; i < n; i++) {
    const k = i / n;
    const nx = -(y1 - y0),
      ny = x1 - x0;
    const len = Math.hypot(nx, ny) || 1;
    const o = (rnd(seed + i) - 0.5) * jag;
    pts.push([x0 + (x1 - x0) * k + (nx / len) * o, y0 + (y1 - y0) * k + (ny / len) * o]);
  }
  pts.push([x1, y1]);
  for (const [lw, cl] of [
    [w * 3, col],
    [w, core],
  ] as const) {
    c.beginPath();
    c.lineWidth = lw;
    c.strokeStyle = cl;
    c.lineJoin = "miter";
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
}
function tongue(c: C, x: number, base: number, h: number, w: number, sway: number, col: string) {
  c.beginPath();
  c.fillStyle = col;
  c.moveTo(x - w, base);
  c.quadraticCurveTo(x - w * 0.9 + sway * 0.5, base - h * 0.55, x + sway, base - h);
  c.quadraticCurveTo(x + w * 0.9 + sway * 0.5, base - h * 0.5, x + w, base);
  c.closePath();
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
function crescent(c: C, r: number, a0: number, sweep: number, w: number, col: string) {
  c.beginPath();
  c.arc(0, 0, r, a0, a0 + sweep);
  c.arc(0, 0, r - w, a0 + sweep, a0, true);
  c.closePath();
  c.fillStyle = col;
  c.fill();
}

const DRAW: Record<FxRecipe["motif"], (f: F) => void> = {
  flame(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    const n = 5 + p + v;
    if (v === 4) {
      c.globalAlpha = 0.5;
      ring(c, s * 0.36, a, 2, [4, 8]);
      c.globalAlpha = 1;
    }
    if (v === 2) {
      for (let i = 0; i < 14; i++) {
        c.save();
        c.rotate((i / 14) * TAU + t * 0.4);
        tongue(c, 0, -s * 0.3, s * (0.14 + 0.05 * Math.sin(t * 6 + i)), s * 0.05, 0, i % 2 ? a : b);
        c.restore();
      }
    }
    if (v === 5) {
      c.save();
      c.rotate(-Math.PI / 2 + Math.sin(t) * 0.15);
      for (let i = 0; i < 12; i++) {
        const k = (t * 1.6 + i / 12) % 1;
        c.globalAlpha = 1 - k;
        star(c, 6, s * 0.02, s * 0.06 * (1 + k), k * 4, i % 2 ? a : hi);
        c.translate(s * 0.06, 0);
      }
      c.restore();
      c.globalAlpha = 1;
    }
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1) - 0.5) * s * (v === 3 ? 0.35 : 0.5);
      const ph = t * (v === 4 ? 3 : 7) + i * 1.7;
      const h =
        s * (0.32 + 0.14 * Math.sin(ph)) * (1 - (Math.abs(x) / s) * 1.4) * (v === 5 ? 1.25 : 1);
      tongue(c, x, s * 0.22, h, s * 0.06, Math.sin(ph * 1.3) * s * 0.05, b);
      tongue(c, x * 0.9, s * 0.22, h * 0.7, s * 0.04, Math.sin(ph * 1.1) * s * 0.03, a);
      tongue(c, x * 0.8, s * 0.22, h * 0.38, s * 0.02, 0, hi);
    }
    if (v === 3) {
      c.save();
      c.rotate(t);
      c.globalAlpha = 0.8;
      star(c, 5, s * 0.2, s * 0.26, 0, "transparent");
      ring(c, s * 0.3, a, 3, [12, 6]);
      c.restore();
      c.globalAlpha = 1;
    }
    for (let i = 0; i < 6 + p * 2; i++) {
      const k = (t * 0.6 + f.rnd(i)) % 1;
      dot(c, (f.rnd(i + 50) - 0.5) * s * 0.5, s * 0.2 - k * s * 0.6, s * 0.012 * (1 - k), hi);
    }
  },
  lightning(f) {
    const { c, t, s, r, v, p, rnd } = f;
    const [a, b, hi] = r.palette;
    const step = Math.floor(t * 12);
    if (v === 3) {
      dot(c, 0, 0, s * 0.12, "#000");
      ring(c, s * 0.13, a, 3);
    }
    if (v === 2) {
      glow(c, a, 30);
      c.globalAlpha = 0.35;
      dot(c, 0, 0, s * (0.2 + 0.02 * Math.sin(t * 9)), b);
      c.globalAlpha = 1;
    }
    const bolts = 2 + p + (v === 3 ? 4 : 0);
    for (let i = 0; i < bolts; i++) {
      const ang = rnd(step * 7 + i) * TAU;
      const len = s * (0.25 + rnd(step + i * 3) * 0.2) * (v === 3 ? 1.2 : 1);
      if (v === 0 && rnd(step + i * 9) > 0.55) continue;
      const inner = v === 1 ? s * 0.05 : v === 3 ? s * 0.13 : 0;
      bolt(
        c,
        Math.cos(ang) * inner,
        Math.sin(ang) * inner,
        Math.cos(ang) * len,
        Math.sin(ang) * len,
        s * (v === 0 ? 0.14 : 0.08),
        rnd,
        step * 13 + i * 5,
        v === 3 ? 3 : 1.6,
        b,
        hi,
      );
    }
    if (v === 1) {
      c.save();
      c.rotate(t * 3);
      ring(c, s * 0.18, a, 2, [s * 0.05, s * 0.03]);
      c.restore();
    }
    if (v === 5)
      for (let i = 0; i < 8; i++) {
        const k = (t * 2 + i / 8) % 1;
        c.globalAlpha = 1 - k;
        c.fillStyle = hi;
        c.fillRect(-s * 0.4 + k * s * 0.8, (i - 4) * s * 0.04, s * 0.1, 2);
      }
    if (v === 6)
      for (let i = 0; i < 4; i++) {
        c.globalAlpha = 0.6 - i * 0.13;
        dot(c, Math.sin(t * 6 - i * 0.4) * s * 0.25, 0, s * 0.05, a);
      }
    if (v === 4) {
      c.save();
      c.rotate(-t * 2);
      crescent(c, s * 0.3, 0, Math.PI, 4, a);
      c.restore();
    }
    c.globalAlpha = 1;
    if (rnd(step) > 0.8) {
      c.globalAlpha = 0.18;
      c.fillStyle = hi;
      c.fillRect(-s, -s, s * 2, s * 2);
      c.globalAlpha = 1;
    }
  },
  blood(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    if (v === 4 || v === 5) {
      dot(c, 0, 0, s * 0.1, b);
    }
    const n = 6 + p;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * TAU + (v === 0 ? t : v === 3 ? -t * 0.5 : 0);
      const k = v === 2 ? Math.max(0, Math.sin(t * 4 + i)) : 0.5 + 0.5 * Math.sin(t * 2 + i);
      c.save();
      c.rotate(ang);
      if (v === 0 || v === 1) {
        const d = s * (0.18 + 0.08 * k);
        dot(c, d, 0, s * 0.03, a);
        dot(c, d - s * 0.02, 0, s * 0.012, hi);
      }
      if (v === 1) {
        c.strokeStyle = a;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(s * 0.1, 0);
        c.bezierCurveTo(s * 0.2, s * 0.1, s * 0.25, -s * 0.1, s * 0.32, 0);
        c.stroke();
      }
      if (v === 2 || v === 4) {
        c.beginPath();
        c.fillStyle = a;
        c.moveTo(s * 0.08, -s * 0.02);
        c.lineTo(s * (0.12 + 0.3 * k), 0);
        c.lineTo(s * 0.08, s * 0.02);
        c.fill();
      }
      if (v === 3) {
        c.globalAlpha = 0.4 + 0.4 * k;
        dot(c, s * (0.12 + 0.2 * ((t + i / n) % 1)), 0, s * 0.04 * (1 - k), a);
      }
      if (v === 4) crescent(c, s * 0.38, -0.3, 0.6 * k, s * 0.04, b === "#120004" ? a : b);
      if (v === 5 || v === 6) {
        const d = s * (0.4 - 0.3 * ((t * 0.8 + i / n) % 1));
        dot(c, d, 0, s * 0.015, a);
      }
      c.restore();
      c.globalAlpha = 1;
    }
    if (v === 5) {
      c.save();
      c.rotate(Math.PI);
      crescent(c, s * 0.2, 0.4, 2.3, s * 0.05, a);
      c.restore();
    }
    if (v === 6) {
      c.save();
      c.rotate(t);
      ring(c, s * 0.26, "#818cf8", 2, [6, 10]);
      c.restore();
    }
  },
  void(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    for (let i = 0; i < 3 + p; i++) {
      c.save();
      c.rotate(t * (v === 2 ? -1 : 0.6) * (1 + i * 0.2));
      c.scale(1, 0.35 + i * 0.05);
      ring(c, s * (0.15 + i * 0.045), i % 2 ? a : hi, 1.5);
      c.restore();
    }
    if (v === 2)
      for (let i = 0; i < 20; i++) {
        const k = 1 - ((t * 0.5 + i / 20) % 1);
        c.save();
        c.rotate(i * 2.4);
        dot(c, k * s * 0.45, 0, s * 0.01 * (1 + k), hi);
        c.restore();
      }
    dot(c, 0, 0, s * (0.08 + 0.01 * Math.sin(t * 4)), "#000");
    ring(c, s * 0.09, a, 2);
    if (v === 1) {
      for (let i = 0; i < 7; i++) {
        c.save();
        c.rotate((i / 7) * TAU + t * 0.2);
        c.translate(0, -s * 0.28);
        star(c, 3, s * 0.02, s * 0.06, -Math.PI / 2, a);
        c.restore();
      }
    }
    for (let i = 0; i < 12; i++) {
      c.save();
      c.rotate(i * 0.52 + t * 0.3);
      dot(c, s * (0.25 + 0.15 * f.rnd(i)), 0, 1.5, b === "#000000" ? hi : hi);
      c.restore();
    }
  },
  prism(f) {
    const { c, t, s, r, v, p } = f;
    const cols = ["#ff6a00", "#38bdf8", "#4ade80", "#d6a76c", ...r.palette];
    const collapse = v === 0 ? Math.sin(t * 1.2) * 0.5 + 0.5 : 1;
    for (let i = 0; i < 4; i++) {
      c.save();
      c.rotate(t * (i % 2 ? 1 : -1) * 0.8 + (i * Math.PI) / 4);
      c.scale(1, 0.3);
      ring(c, s * 0.32 * collapse + s * 0.05, cols[i]!, 3);
      c.restore();
    }
    if (v === 2)
      for (let i = 0; i < 8; i++) {
        c.save();
        c.rotate((i / 8) * TAU + t);
        c.translate(s * 0.22, 0);
        c.rotate(t * 3);
        star(c, 3, s * 0.015, s * 0.05, 0, cols[i % cols.length]!);
        c.restore();
      }
    c.save();
    c.rotate(t * 0.5);
    star(c, 4 + (p % 4), s * 0.04, s * (0.12 + 0.04 * (1 - collapse)), 0, r.palette[2]);
    c.restore();
    if (v === 1) {
      c.save();
      c.rotate(-t * 0.4);
      ring(c, s * 0.42, "#ffffff55", 1, [2, 6]);
      c.restore();
    }
  },
  judgement(f) {
    const { c, t, s, r, v, p } = f;
    const [a, , hi] = r.palette;
    const fall = (t * 0.7) % 1;
    for (let i = 0; i < 10 + p * 2; i++) {
      c.save();
      c.rotate((i / (10 + p * 2)) * TAU + t * 0.15);
      c.globalAlpha = 0.6;
      c.fillStyle = a;
      c.fillRect(s * 0.1, -1.5, s * (0.25 + 0.05 * Math.sin(t * 3 + i)), 3);
      c.restore();
    }
    c.globalAlpha = 1;
    if (v === 0) {
      c.fillStyle = hi;
      c.globalAlpha = 1 - fall;
      c.fillRect(-s * 0.03, -s * 0.5, s * 0.06, s * 0.5 * (fall * 2));
      c.globalAlpha = 1;
    }
    if (v === 1) {
      c.save();
      c.translate(0, -s * 0.12);
      c.beginPath();
      c.fillStyle = a;
      [-0.12, -0.06, 0, 0.06, 0.12].forEach((x, i) => {
        c.lineTo(x * s, (i % 2 ? -0.02 : -0.1) * s);
      });
      c.lineTo(s * 0.12, 0);
      c.lineTo(-s * 0.12, 0);
      c.fill();
      c.restore();
      ring(c, s * (0.3 - fall * 0.1), a, 3);
    }
    dot(c, 0, 0, s * 0.08, hi);
  },
  impact(f) {
    const { c, t, s, r, v, p, rnd } = f;
    const [a, b, hi] = r.palette;
    const k = (t * (v === 3 ? 2 : 1)) % 1;
    for (let i = 0; i < 2 + (p > 5 ? 2 : 0); i++) {
      const kk = (k + i * 0.25) % 1;
      c.globalAlpha = 1 - kk;
      ring(c, s * 0.45 * kk, i % 2 ? a : hi, 6 * (1 - kk));
    }
    c.globalAlpha = 1;
    if (v === 0 || v === 1)
      for (let i = 0; i < 8; i++) {
        c.save();
        c.rotate(i * 0.8 + rnd(i));
        c.strokeStyle = b === "#1c1917" ? a : hi;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(s * 0.05, 0);
        c.lineTo(s * 0.15, s * 0.03);
        c.lineTo(s * 0.3 * (0.5 + k), -s * 0.02);
        c.stroke();
        c.restore();
      }
    if (v === 2) {
      star(c, 8, s * 0.04, s * 0.14 * (1 - k), 0, hi);
    }
    if (v === 3)
      for (let i = 0; i < 4; i++) {
        const ox = (rnd(Math.floor(t * 8) + i) - 0.5) * s * 0.5,
          oy = (rnd(Math.floor(t * 8) + i + 9) - 0.5) * s * 0.5;
        c.save();
        c.translate(ox, oy);
        star(c, 5, s * 0.02, s * 0.06, 0, a);
        c.restore();
      }
    dot(c, 0, 0, s * 0.06 * (1 - k) + 2, hi);
  },
  wind(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    const n = 4 + p;
    for (let i = 0; i < n; i++) {
      c.save();
      if (v === 0) {
        c.rotate(t * 3 + (i / n) * TAU);
        crescent(c, s * (0.2 + (i % 3) * 0.06), 0, 1.2, s * 0.025, i % 2 ? a : hi);
      }
      if (v === 1 || v === 2) {
        const y = (i / n - 0.5) * s * 0.6;
        const off = ((t * (v === 1 ? 1.4 : 0.5) + i * 0.3) % 1) * s * 1.2 - s * 0.6;
        c.strokeStyle = i % 2 ? a : hi;
        c.lineWidth = v === 1 ? 4 : 2;
        c.globalAlpha = v === 2 ? 0.6 : 1;
        c.beginPath();
        c.moveTo(off - s * 0.2, y);
        c.bezierCurveTo(off - s * 0.1, y - s * 0.05, off, y + s * 0.05, off + s * 0.15, y);
        c.stroke();
      }
      if (v === 3) {
        const side = i % 2 ? 1 : -1;
        c.scale(side, 1);
        c.rotate(-0.4 - i * 0.12 + Math.sin(t * 2) * 0.15);
        crescent(c, s * (0.18 + i * 0.03), -Math.PI / 2, 0.9, s * 0.03, i % 3 ? a : hi);
      }
      c.restore();
    }
    c.globalAlpha = 1;
    if (v === 0) ring(c, s * 0.08, b, 3);
  },
  water(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    if (v === 0) {
      c.save();
      c.globalAlpha = 0.4;
      c.beginPath();
      c.fillStyle = a;
      c.arc(0, s * 0.15, s * 0.32, Math.PI, 0);
      c.fill();
      c.restore();
      c.globalAlpha = 1;
      c.beginPath();
      c.strokeStyle = hi;
      c.lineWidth = 3;
      for (let x = -s * 0.32; x <= s * 0.32; x += 4)
        c.lineTo(x, s * 0.15 + Math.sin(x * 0.1 + t * 5) * 3);
      c.stroke();
    }
    if (v === 1)
      for (let j = 0; j < 2 + (p > 4 ? 1 : 0); j++) {
        c.beginPath();
        c.strokeStyle = j ? hi : a;
        c.lineWidth = 6 - j * 2;
        for (let i = 0; i < 40; i++) {
          const k = i / 40;
          const ang = k * TAU * 1.2 + t * 2 + j;
          c.lineTo(Math.cos(ang) * s * 0.3 * k, Math.sin(ang) * s * 0.3 * k);
        }
        c.stroke();
      }
    if (v === 2) {
      const k = (t * 1.2) % 1;
      for (let i = 0; i < 10 + p; i++) {
        const ang = -Math.PI * (i / (10 + p));
        const d = s * 0.35 * k;
        dot(
          c,
          Math.cos(ang) * d,
          s * 0.15 + Math.sin(ang) * d + k * k * s * 0.2,
          s * 0.03 * (1 - k),
          i % 2 ? a : hi,
        );
      }
      c.globalAlpha = 1 - k;
      ring(c, s * 0.3 * k, b, 3);
      c.globalAlpha = 1;
    }
  },
  frost(f) {
    const { c, t, s, r, p } = f;
    const [a, b, hi] = r.palette;
    const grow = Math.min(1, (t * 0.6) % 1.3);
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i * Math.PI) / 3);
      c.strokeStyle = a;
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(s * 0.35 * grow, 0);
      for (let j = 1; j <= 2 + (p > 4 ? 1 : 0); j++) {
        const x = s * 0.1 * j * grow;
        c.moveTo(x, 0);
        c.lineTo(x + s * 0.05, -s * 0.05);
        c.moveTo(x, 0);
        c.lineTo(x + s * 0.05, s * 0.05);
      }
      c.stroke();
      c.restore();
    }
    star(c, 6, s * 0.03, s * 0.08, t, hi);
    ring(c, s * 0.38 * grow, b, 1, [2, 4]);
  },
  earth(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    const n = 5 + p;
    for (let i = 0; i < n; i++) {
      const k = Math.max(0, Math.sin(t * 2 - i * 0.5));
      c.save();
      if (v === 0) {
        c.rotate((i / n) * TAU);
        c.translate(0, -s * 0.25);
      } else c.translate((i / (n - 1) - 0.5) * s * 0.7, s * 0.2);
      c.beginPath();
      c.fillStyle = i % 2 ? a : b;
      c.moveTo(-s * 0.04, 0);
      c.lineTo(-s * 0.02, -s * 0.14 * k);
      c.lineTo(s * 0.03, -s * 0.18 * k);
      c.lineTo(s * 0.045, 0);
      c.fill();
      c.strokeStyle = hi;
      c.lineWidth = 1;
      c.stroke();
      c.restore();
    }
    if (v === 1) {
      const k = (t * 0.8) % 1;
      c.globalAlpha = 1 - k;
      c.save();
      c.translate(0, s * 0.2);
      c.scale(1, 0.25);
      ring(c, s * 0.5 * k, hi, 4);
      c.restore();
      c.globalAlpha = 1;
    }
  },
  nature(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    const n = 5 + p;
    for (let i = 0; i < n; i++) {
      c.save();
      c.rotate((i / n) * TAU + (v === 0 ? t * 0.3 : 0));
      if (v === 0) {
        c.strokeStyle = b;
        c.lineWidth = 3;
        c.beginPath();
        for (let j = 0; j < 20; j++) {
          const k = j / 20;
          c.lineTo(s * 0.35 * k, Math.sin(k * 8 + t * 2) * s * 0.03);
        }
        c.stroke();
      }
      const bloom = v === 1 ? 0.5 + 0.5 * Math.sin(t * 1.5 + i) : 1;
      c.translate(s * (v === 0 ? 0.3 : 0.14), 0);
      c.rotate(t + i);
      c.beginPath();
      c.fillStyle = i % 2 ? a : hi;
      c.ellipse(0, 0, s * 0.06 * bloom, s * 0.025 * bloom, 0, 0, TAU);
      c.fill();
      c.restore();
    }
    dot(c, 0, 0, s * 0.05, hi);
  },
  arcane(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    const rings = v === 1 ? 3 : 2;
    for (let i = 0; i < rings; i++) {
      c.save();
      c.rotate(t * (i % 2 ? -0.5 : 0.7));
      ring(c, s * (0.22 + i * 0.08), i ? a : hi, 2);
      const glyphs = 8 + i * 4;
      for (let g = 0; g < glyphs; g++) {
        if (v === 2 && g / glyphs > (t * 0.5) % 1) break;
        c.save();
        c.rotate((g / glyphs) * TAU);
        c.translate(s * (0.22 + i * 0.08), 0);
        c.fillStyle = a;
        c.fillRect(-2, -5, 4, 10);
        c.restore();
      }
      c.restore();
    }
    if (v === 3)
      for (let i = 0; i < 5; i++) {
        c.save();
        c.rotate(-0.6 + i * 0.3 + Math.sin(t * 2) * 0.1);
        c.translate(0, -s * 0.2);
        c.fillStyle = i % 2 ? a : hi;
        c.fillRect(-s * 0.04, -s * 0.06, s * 0.08, s * 0.12);
        c.strokeStyle = b;
        c.strokeRect(-s * 0.04, -s * 0.06, s * 0.08, s * 0.12);
        c.restore();
      }
    if (v === 4) {
      c.globalAlpha = 0.5 + 0.5 * Math.sin(t);
      star(c, 8, s * 0.06, s * 0.14, t * 0.2, a);
      c.globalAlpha = 1;
    }
    for (let i = 0; i < 4 + p; i++) {
      const k = (t * 0.4 + i / (4 + p)) % 1;
      dot(c, Math.sin(i * 3) * s * 0.15, s * 0.2 - k * s * 0.5, 2, hi);
    }
    star(c, v === 0 ? 6 : 5, s * 0.03, s * 0.07, -t, hi);
  },
  shadow(f) {
    const { c, t, s, r, v, p, rnd } = f;
    const [a, b, hi] = r.palette;
    if (v === 2) {
      const step = Math.floor(t * 3);
      const x = (rnd(step) - 0.5) * s * 0.6,
        px = (rnd(step - 1) - 0.5) * s * 0.6;
      c.globalAlpha = 0.4;
      c.fillStyle = a;
      c.fillRect(Math.min(x, px), -2, Math.abs(x - px), 4);
      c.globalAlpha = 1;
      dot(c, x, 0, s * 0.06, b);
      ring(c, s * 0.07, a, 2);
      c.save();
      c.translate(x, s * 0.1);
      c.scale(1, 0.25);
      dot(c, 0, 0, s * 0.1, a);
      c.restore();
      return;
    }
    for (let i = 0; i < 6 + p; i++) {
      c.save();
      c.rotate((i / (6 + p)) * TAU + (v === 0 ? -t * 0.6 : 0));
      c.strokeStyle = i % 2 ? a : hi;
      c.lineWidth = v === 1 ? 5 : 3;
      c.beginPath();
      const L = s * (0.3 + 0.08 * Math.sin(t * 3 + i));
      c.moveTo(s * 0.05, 0);
      if (v === 1) c.lineTo(L, 0);
      else c.quadraticCurveTo(L * 0.6, L * 0.4, L, 0);
      c.stroke();
      c.restore();
    }
    if (v === 3) {
      c.fillStyle = a;
      [-1, 1].forEach((sd) => {
        c.beginPath();
        c.moveTo(sd * s * 0.05, -s * 0.08);
        c.quadraticCurveTo(sd * s * 0.15, -s * 0.2, sd * s * 0.1, -s * 0.3);
        c.lineTo(sd * s * 0.08, -s * 0.12);
        c.fill();
      });
    }
    dot(c, 0, 0, s * 0.07, b);
  },
  chaos(f) {
    const { c, t, s, r, v, p, rnd } = f;
    const [a, b, hi] = r.palette;
    const step = Math.floor(t * 8);
    if (v === 1) {
      c.save();
      c.rotate(t * 0.6);
      c.beginPath();
      c.fillStyle = a;
      c.arc(0, 0, s * 0.2, -Math.PI / 2, Math.PI / 2);
      c.fill();
      c.beginPath();
      c.fillStyle = b;
      c.arc(0, 0, s * 0.2, Math.PI / 2, Math.PI * 1.5);
      c.fill();
      dot(c, 0, -s * 0.1, s * 0.1, b);
      dot(c, 0, s * 0.1, s * 0.1, a);
      dot(c, 0, -s * 0.1, s * 0.03, a);
      dot(c, 0, s * 0.1, s * 0.03, hi);
      c.restore();
      ring(c, s * 0.21, hi, 2);
      return;
    }
    for (let i = 0; i < 8 + p * 2; i++) {
      const ang = rnd(step * 3 + i) * TAU;
      const d = s * (v === 2 ? ((t * 2 + rnd(i)) % 1) * 0.45 : 0.1 + rnd(i + step) * 0.3);
      c.save();
      c.translate(Math.cos(ang) * d, Math.sin(ang) * d);
      c.rotate(rnd(i) * 6 + t * 4);
      star(c, 3, s * 0.01, s * 0.04, 0, [a, b, hi][i % 3]!);
      c.restore();
    }
    if (v === 0) ring(c, s * (0.12 + rnd(step) * 0.05), hi, 2, [3, 5]);
  },
  mind(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    if (v === 0) {
      for (let i = 0; i < 5 + p; i++) {
        const x = (i / (4 + p) - 0.5) * s * 0.6;
        c.strokeStyle = a;
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, -s * 0.4);
        c.lineTo(x + Math.sin(t * 2 + i) * s * 0.03, s * 0.1 + Math.sin(t * 3 + i) * s * 0.05);
        c.stroke();
      }
    }
    if (v === 1)
      for (let i = 0; i < 3; i++) {
        const ang = t * 3 + (i / 3) * TAU;
        c.save();
        c.translate(Math.cos(ang) * s * 0.2, Math.sin(ang) * s * 0.12 - s * 0.05);
        c.rotate(ang * 2);
        dot(c, 0, 0, s * 0.05, i % 2 ? a : hi);
        dot(c, -s * 0.015, -s * 0.01, 2, b);
        dot(c, s * 0.015, -s * 0.01, 2, b);
        c.restore();
      }
    if (v === 2) {
      const k = (t * 0.7) % 1;
      c.save();
      c.rotate(k * TAU);
      c.fillStyle = a;
      c.globalAlpha = 0.3;
      c.beginPath();
      c.moveTo(0, 0);
      c.arc(0, 0, s * 0.4, 0, 0.5);
      c.fill();
      c.restore();
      c.globalAlpha = 1;
      ring(c, s * 0.4, a, 1, [2, 4]);
    }
    if (v === 3) {
      c.strokeStyle = a + "88";
      c.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        c.beginPath();
        c.moveTo(i * s * 0.08, -s * 0.26);
        c.lineTo(i * s * 0.08, s * 0.26);
        c.moveTo(-s * 0.26, i * s * 0.08);
        c.lineTo(s * 0.26, i * s * 0.08);
        c.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const k = Math.floor(t + i) % 6;
        c.fillStyle = i ? a : hi;
        c.fillRect((k - 3) * s * 0.08 + 2, (i - 1) * s * 0.08 + 2, s * 0.08 - 4, s * 0.08 - 4);
      }
      return;
    }
    c.beginPath();
    c.fillStyle = hi;
    c.ellipse(0, 0, s * 0.12, s * 0.06, 0, 0, TAU);
    c.fill();
    dot(c, 0, 0, s * 0.04 * (0.8 + 0.2 * Math.sin(t * 4)), b);
  },
  chrono(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    if (v === 1) {
      const k = Math.min(1, (t * 0.45) % 1.4);
      c.globalAlpha = 0.25;
      dot(c, 0, 0, s * 0.45 * k, b);
      c.globalAlpha = 1;
      ring(c, s * 0.45 * k, hi, 3);
      for (let i = 0; i < 24; i++) {
        c.save();
        c.rotate((i / 24) * TAU);
        c.fillStyle = hi;
        c.fillRect(s * 0.45 * k - 4, -1, 8, 2);
        c.restore();
      }
      star(c, 4, s * 0.03, s * 0.1, t * 0.3, hi);
      return;
    }
    for (let i = 0; i < 4 + p; i++) {
      const k = (t * 0.4 + i / (4 + p)) % 1;
      c.save();
      c.scale(1 + 0.3 * Math.sin(t * 2 + i), 1 - 0.3 * Math.sin(t * 2 + i));
      c.globalAlpha = 1 - k;
      ring(c, s * 0.45 * (1 - k), i % 2 ? a : hi, 2);
      c.restore();
    }
    c.globalAlpha = 1;
    c.save();
    c.rotate(t);
    c.strokeStyle = hi;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -s * 0.16);
    c.stroke();
    c.rotate(t * 4);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -s * 0.1);
    c.stroke();
    c.restore();
  },
  portal(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    for (let i = 0; i < 30; i++) {
      const k = i / 30;
      c.save();
      c.rotate(k * TAU * 2 - t * 2);
      dot(c, s * 0.3 * (1 - k), 0, s * 0.02 * (1 - k) + 1, i % 2 ? a : hi);
      c.restore();
    }
    if (v === 1)
      for (let i = 0; i < 3 + (p > 4 ? 2 : 0); i++) {
        const phase = (t * 0.8) % 1;
        const align = phase > 0.5;
        const ang = align ? 0 : (i / 3) * TAU + t * 3;
        c.save();
        c.rotate(ang);
        c.translate(
          align ? s * (0.1 + (phase - 0.5) * 1.2) : s * 0.25,
          (i - 1) * s * (align ? 0.06 : 0),
        );
        c.beginPath();
        c.fillStyle = hi;
        c.moveTo(s * 0.07, 0);
        c.lineTo(-s * 0.03, -s * 0.015);
        c.lineTo(-s * 0.03, s * 0.015);
        c.fill();
        c.restore();
      }
    dot(c, 0, 0, s * 0.05, b);
  },
  blade(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    if (v === 0) {
      for (let i = 0; i < 6 + p; i++) {
        const k = Math.sin(t * 1.5) * 0.5 + 0.5;
        c.save();
        c.rotate((i / (6 + p)) * TAU + t);
        c.translate(s * (0.12 + 0.2 * k), 0);
        c.rotate((Math.PI / 2) * k);
        c.fillStyle = hi;
        c.fillRect(-s * 0.08, -2, s * 0.16, 4);
        c.fillStyle = a;
        c.fillRect(-s * 0.1, -4, s * 0.03, 8);
        c.restore();
      }
      return;
    }
    const slashes = v === 3 ? 3 : 1;
    const k = (t * (v === 1 ? 1.2 : 0.9)) % 1;
    for (let i = 0; i < slashes; i++) {
      c.save();
      c.rotate((i * TAU) / 3 - 0.6);
      const sweep = Math.min(1, k * 3) * 2.2;
      c.globalAlpha = 1 - Math.max(0, k * 2 - 1);
      crescent(c, s * 0.34, -1.1, sweep, s * 0.04, i ? a : hi);
      if (v === 2) {
        c.globalAlpha *= 0.4;
        crescent(c, s * 0.3, -1.2, sweep, s * 0.02, a);
      }
      c.restore();
    }
    c.globalAlpha = 1;
    if (v === 1 && k > 0.4) {
      c.strokeStyle = b === "#020617" ? hi : hi;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-s * 0.35, s * 0.1);
      c.lineTo(s * 0.35, -s * 0.1);
      c.stroke();
    }
  },
  beast(f) {
    const { c, t, s, r, v, p, rnd } = f;
    const [a, b, hi] = r.palette;
    const k = (t * (v === 6 ? 2.5 : 1)) % 1;
    if (v === 0) {
      for (let i = 0; i < 4; i++) {
        const kk = (k + i / 4) % 1;
        c.save();
        c.rotate((i / 4) * TAU);
        c.translate(s * 0.35 * (1 - kk), 0);
        c.globalAlpha = 1 - kk * 0.5;
        dot(c, 0, 0, s * 0.05, a);
        [-1, 0, 1].forEach((j) => dot(c, s * 0.06, j * s * 0.04, s * 0.02, a));
        c.restore();
      }
      c.globalAlpha = 1;
      return;
    }
    if (v === 1 || v === 4) {
      c.globalAlpha = 1 - k;
      ring(c, s * 0.4 * k, a, 6 * (1 - k));
      c.globalAlpha = 1;
      for (let i = 0; i < 12; i++) {
        c.save();
        c.rotate((i / 12) * TAU);
        tongue(
          c,
          0,
          -s * 0.1,
          s * (0.12 + 0.04 * Math.sin(t * 6 + i)),
          s * 0.03,
          0,
          i % 2 ? a : hi,
        );
        c.restore();
      }
    }
    if (v === 2 || v === 3) {
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * s * 0.07;
        c.globalAlpha = 1 - Math.max(0, k * 2 - 1);
        c.strokeStyle = v === 3 && i % 2 ? b : a;
        c.lineWidth = v === 3 ? 6 : 4;
        c.beginPath();
        const L = Math.min(1, k * 3);
        c.moveTo(-s * 0.25 + off, -s * 0.25);
        c.lineTo(-s * 0.25 + off + s * 0.45 * L, -s * 0.25 + s * 0.45 * L);
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    if (v === 5) {
      c.strokeStyle = b;
      c.lineWidth = 8;
      c.beginPath();
      for (let i = 0; i < 40; i++) {
        const kk = i / 40;
        const ang = kk * TAU + t;
        c.lineTo(Math.cos(ang) * s * (0.2 + kk * 0.12), Math.sin(ang) * s * (0.2 + kk * 0.12));
      }
      c.stroke();
      dot(c, 0, 0, s * (0.08 + 0.02 * Math.sin(t * 5)), a);
      dot(c, 0, 0, s * 0.04, hi);
    }
    if (v === 6)
      for (let i = 0; i < 3; i++) {
        const ang = rnd(Math.floor(t * 6) + i) * TAU;
        c.save();
        c.rotate(ang);
        c.translate(s * 0.2, 0);
        crescent(c, s * 0.06, 0.5, 2.2, s * 0.02, a);
        c.restore();
      }
    if (v === 7)
      for (let j = 0; j < 2 + (p > 4 ? 1 : 0); j++) {
        c.strokeStyle = j % 2 ? a : b;
        c.lineWidth = 5;
        c.beginPath();
        for (let i = 0; i < 30; i++) {
          const kk = i / 30;
          c.lineTo(
            -s * 0.35 + kk * s * 0.7 * Math.min(1, k * 1.5),
            Math.sin(kk * 10 + t * 5 + j * 2) * s * 0.06 + (j - 0.5) * s * 0.1,
          );
        }
        c.stroke();
      }
    if (v !== 5 && v !== 7) dot(c, 0, 0, s * 0.03, hi);
  },
  heal(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    for (let i = 0; i < 6 + p; i++) {
      const x = (i / (5 + p) - 0.5) * s * 0.6;
      const k = (t * 0.5 + i * 0.17) % 1;
      c.globalAlpha = Math.sin(k * Math.PI) * 0.7;
      c.fillStyle = i % 2 ? a : hi;
      c.fillRect(x - 2, s * 0.3 - k * s * 0.7, 4, s * 0.15);
    }
    c.globalAlpha = 1;
    if (v === 1) {
      c.fillStyle = a;
      c.fillRect(-s * 0.03, -s * 0.12, s * 0.06, s * 0.24);
      c.fillRect(-s * 0.12, -s * 0.03, s * 0.24, s * 0.06);
      ring(c, s * (0.18 + 0.02 * Math.sin(t * 2)), hi, 2);
    } else {
      c.save();
      c.rotate(t);
      for (let i = 0; i < 3; i++) {
        c.rotate(TAU / 3);
        c.scale(1, 0.4);
        ring(c, s * 0.2, i % 2 ? a : b, 2);
        c.scale(1, 2.5);
      }
      c.restore();
      dot(c, 0, 0, s * 0.05, hi);
    }
  },
  tech(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    if (v === 0) {
      const k = Math.min(1, (t * 0.5) % 1.3);
      for (let i = 0; i < 8; i++) {
        const x = ((i % 2) - 0.5) * s * 0.14,
          y = (((i >> 1) % 2) - 0.5) * s * 0.14,
          z = (i >> 2) - 0.5;
        const spread = (1 - k) * s * 0.25;
        c.fillStyle = i % 2 ? a : hi;
        c.fillRect(
          x * (1 + z * 0.3) - s * 0.06 + Math.sign(x) * spread,
          y - s * 0.06 + Math.sign(y) * spread + z * s * 0.03,
          s * 0.12,
          s * 0.12,
        );
        c.strokeStyle = b;
        c.strokeRect(
          x * (1 + z * 0.3) - s * 0.06 + Math.sign(x) * spread,
          y - s * 0.06 + Math.sign(y) * spread + z * s * 0.03,
          s * 0.12,
          s * 0.12,
        );
      }
      return;
    }
    if (v === 1) {
      const k = (t * 0.5) % 1;
      c.strokeStyle = a;
      c.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        c.save();
        c.rotate((i * Math.PI) / 4);
        c.beginPath();
        c.moveTo(s * 0.06, 0);
        c.lineTo(s * 0.2 * Math.min(1, k * 2), 0);
        c.lineTo(s * 0.2 * Math.min(1, k * 2), s * 0.08 * Math.max(0, k * 2 - 1));
        c.stroke();
        dot(c, s * 0.2 * Math.min(1, k * 2), s * 0.08 * Math.max(0, k * 2 - 1), 3, hi);
        c.restore();
      }
    }
    if (v === 2 || v === 4) {
      const plates = 6;
      const k = Math.sin(t * 1.4) * 0.5 + 0.5;
      for (let i = 0; i < plates; i++) {
        c.save();
        c.rotate((i / plates) * TAU);
        c.translate(s * (0.15 + 0.12 * k), 0);
        c.fillStyle = i % 2 ? a : b;
        c.beginPath();
        c.moveTo(0, -s * 0.06);
        c.lineTo(s * 0.06, 0);
        c.lineTo(0, s * 0.06);
        c.lineTo(-s * 0.03, 0);
        c.fill();
        c.strokeStyle = hi;
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }
    }
    if (v === 3) {
      const k = (t * 0.8) % 1;
      c.save();
      c.rotate(k * TAU);
      c.strokeStyle = a;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(s * 0.4, 0);
      c.stroke();
      c.restore();
      ring(c, s * 0.4, a + "88", 1);
      ring(c, s * 0.2, a + "88", 1, [3, 3]);
      [-1, 1].forEach((d) => {
        c.fillStyle = hi;
        c.fillRect(d * s * 0.1 - 1, -s * 0.03, 2, s * 0.06);
      });
    }
    if (v === 5) {
      const k = (t * 0.7) % 1;
      const charge = Math.min(1, k * 1.6);
      dot(c, 0, 0, s * 0.06 + s * 0.06 * charge, a);
      if (k > 0.62) {
        const kk = (k - 0.62) / 0.38;
        c.globalAlpha = 1 - kk;
        ring(c, s * 0.45 * kk, hi, 5);
        c.globalAlpha = 1;
      }
    }
    dot(c, 0, 0, s * 0.04 * (1 + p * 0.05), hi);
  },
  ghost(f) {
    const { c, t, s, r, v, p, rnd } = f;
    const [a, b, hi] = r.palette;
    const flick = v === 0 ? (rnd(Math.floor(t * 10)) > 0.3 ? 1 : 0.15) : 1;
    c.globalAlpha = flick * 0.85;
    c.beginPath();
    c.fillStyle = v === 2 ? hi : a;
    const rise = v === 1 ? Math.sin(t) * s * 0.04 : 0;
    c.moveTo(-s * 0.14, s * 0.2 + rise);
    c.lineTo(-s * 0.14, -s * 0.05 + rise);
    c.arc(0, -s * 0.05 + rise, s * 0.14, Math.PI, 0);
    c.lineTo(s * 0.14, s * 0.2 + rise);
    for (let i = 0; i < 4; i++)
      c.lineTo(
        s * (0.14 - (i + 0.5) * 0.07),
        s * (0.2 + (i % 2 ? 0 : 0.05) + 0.02 * Math.sin(t * 6 + i)) + rise,
      );
    c.fill();
    dot(c, -s * 0.05, -s * 0.06 + rise, s * 0.025, b);
    dot(c, s * 0.05, -s * 0.06 + rise, s * 0.025, b);
    c.globalAlpha = 1;
    if (v === 2)
      for (let i = 0; i < 4 + (p % 3); i++) {
        c.save();
        c.rotate(t * 0.8 + (i / 4) * TAU);
        c.translate(s * 0.32, 0);
        c.globalAlpha = 0.5;
        dot(c, 0, 0, s * 0.04, hi);
        c.restore();
      }
    c.globalAlpha = 1;
    if (v === 1) ring(c, s * 0.3, hi + "66", 1, [2, 6]);
    if (v === 0)
      for (let i = 0; i < 6; i++) {
        c.fillStyle = hi;
        c.globalAlpha = 0.3;
        c.fillRect(-s * 0.3, (rnd(Math.floor(t * 10) + i) - 0.5) * s * 0.5, s * 0.6, 1);
      }
    c.globalAlpha = 1;
  },
  beam(f) {
    const { c, t, s, r, v, p } = f;
    const [a, b, hi] = r.palette;
    const k = (t * (v >= 2 ? 2 : 0.8)) % 1;
    if (v === 0 || v === 1) {
      c.save();
      c.translate(-s * 0.3, 0);
      ring(c, s * 0.06 + s * 0.04 * (1 - k), a, 2);
      c.strokeStyle = a;
      c.beginPath();
      c.moveTo(-s * 0.1, 0);
      c.lineTo(s * 0.1, 0);
      c.moveTo(0, -s * 0.1);
      c.lineTo(0, s * 0.1);
      c.stroke();
      c.restore();
      if (k > 0.5) {
        const kk = (k - 0.5) * 2;
        c.fillStyle = hi;
        c.fillRect(-s * 0.3, -1.5 - (v === 0 ? 1 : 0), s * 0.75 * kk, v === 0 ? 5 : 3);
        for (let i = 0; i < 5; i++) {
          c.save();
          c.translate(-s * 0.3 + s * 0.75 * kk * (i / 5), 0);
          c.scale(0.4, 1);
          ring(c, s * 0.05, b === "#334155" ? a : a, 1.5);
          c.restore();
        }
      }
    }
    if (v === 2 || v === 3) {
      for (let i = 0; i < 5 + p; i++) {
        const kk = (k + i / (5 + p)) % 1;
        c.globalAlpha = 1 - kk;
        c.fillStyle = i % 2 ? a : hi;
        c.fillRect(s * 0.4 - kk * s * 0.8, (i - (5 + p) / 2) * s * 0.05, s * 0.2, v === 2 ? 3 : 2);
      }
      c.globalAlpha = 1;
      dot(c, s * 0.3, 0, s * 0.05, hi);
      if (v === 3)
        for (let i = 0; i < 4; i++)
          dot(c, -s * 0.2 - k * s * 0.1 * i, s * 0.2, s * 0.02 * (1 - k), b);
    }
  },
};

function aura(c: C, s: number, t: number, r: FxRecipe, boosted = false) {
  const p = r.power + (boosted ? 2 : 0);
  const [a, b, hi] = r.palette;

  // Level 1+: Soft breathing glow ring and celestial motes
  c.save();
  const pulse = Math.sin(t * 3.2) * 0.03;
  ring(c, s * (0.42 + pulse), a + (boosted ? "99" : "44"), boosted ? 2 : 1, [s * 0.02, s * 0.03]);
  c.restore();

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
    ring(c, s * 0.36, b + (boosted ? "cc" : "66"), boosted ? 2.5 : 1.2, [s * 0.04, s * 0.03]);
    c.restore();
  }

  // Level 6+: Rotating outer runic celestial compass ring with tick marks
  if (p >= 6) {
    c.save();
    c.rotate(-t * 0.25);
    ring(c, s * 0.46, a + (boosted ? "ff" : "aa"), p >= 8 || boosted ? 3 : 1.8, [
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
        bg.addColorStop(0, recipe.palette[1] + (boosted ? "99" : "66"));
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
          c.shadowBlur = 0;
          painter(pf);
          c.globalCompositeOperation = "source-over";
          c.globalAlpha = 1;
          glow(c, recipe.palette[0], boosted ? 14 : 6);
          aura(c, s, t, recipe, boosted);
          c.shadowBlur = 0;
        } else {
          glow(c, recipe.palette[0], (8 + recipe.power * 2) * (boosted ? 1.5 : 1));
          aura(c, s, t, recipe, boosted);
          DRAW[recipe.motif]({
            c,
            t,
            p: effectivePower,
            s,
            r: recipe,
            rnd,
            v: recipe.variant % 8,
          });
        }
        if (guardian) {
          c.shadowBlur = 0;
          guardianAura(pf, false);
        }
        c.globalCompositeOperation = "source-over";
        c.restore();
        c.shadowBlur = 0;
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
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label={label ?? `${recipe.key} animation`}
      className={`absolute inset-0 block h-full w-full ${className}`}
    />
  );
}
