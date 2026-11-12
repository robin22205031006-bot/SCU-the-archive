/** Browser-only painted VFX for character combat scenes: lightning, energy orbs, blood, fire, earth, chaos. */
import type { Fx } from "@/lib/ability-action";
type C = CanvasRenderingContext2D;
type Pt = { x: number; y: number };
const TAU = Math.PI * 2;
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export interface VfxCtx {
  hand: Pt;
  tip: Pt;
  centre: Pt;
  x: number;
  ground: number;
  target: number;
  s: number;
  k: number;
  t: number;
  tint: [string, string, string];
  face: number;
}

function glow(c: C, x: number, y: number, r: number, col: string, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, "rgba(0,0,0,0)");
  c.globalAlpha = a;
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
  c.globalAlpha = 1;
}
/** Jagged bolt with sub-branches, re-randomised every 1/24s like hand-drawn cels. */
function bolt(
  c: C,
  a: Pt,
  b: Pt,
  w: number,
  seed: number,
  cols: [string, string, string],
  depth = 0,
) {
  const n = 9,
    pts: Pt[] = [a];
  const dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.hypot(dx, dy) || 1,
    nx = -dy / len,
    ny = dx / len;
  for (let i = 1; i < n; i++) {
    const q = i / n,
      off = (hash(seed + i) - 0.5) * len * 0.22 * Math.sin(q * Math.PI);
    pts.push({ x: a.x + dx * q + nx * off, y: a.y + dy * q + ny * off });
  }
  pts.push(b);
  const stroke = (col: string, lw: number) => {
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.beginPath();
    pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.stroke();
  };
  c.shadowColor = cols[0];
  c.shadowBlur = w * 4;
  stroke(cols[0], w * 2.2);
  c.shadowBlur = 0;
  stroke(cols[1], w);
  stroke(cols[2], w * 0.35);
  if (depth < 1)
    for (let i = 2; i < n; i += 3) {
      const p = pts[i];
      if (!p) continue;
      const ang = Math.atan2(dy, dx) + (hash(seed + i * 7) - 0.5) * 2.2,
        l = len * (0.12 + hash(seed + i) * 0.18);
      bolt(
        c,
        p,
        { x: p.x + Math.cos(ang) * l, y: p.y + Math.sin(ang) * l },
        w * 0.5,
        seed + i * 31,
        cols,
        depth + 1,
      );
    }
}
function spike(
  c: C,
  x: number,
  g: number,
  h: number,
  w: number,
  lean: number,
  dark: string,
  mid: string,
  hi: string,
) {
  c.fillStyle = dark;
  c.beginPath();
  c.moveTo(x - w, g);
  c.lineTo(x + lean, g - h);
  c.lineTo(x + w, g);
  c.closePath();
  c.fill();
  c.fillStyle = mid;
  c.beginPath();
  c.moveTo(x - w * 0.4, g);
  c.lineTo(x + lean, g - h);
  c.lineTo(x + w * 0.5, g);
  c.closePath();
  c.fill();
  c.strokeStyle = hi;
  c.lineWidth = Math.max(1, w * 0.12);
  c.beginPath();
  c.moveTo(x + lean, g - h);
  c.lineTo(x - w * 0.2, g - h * 0.2);
  c.stroke();
}

export function combatVfx(c: C, fx: Fx[], o: VfxCtx, front: boolean) {
  const { hand, tip, x, ground: g, target: tx, s, k, t, tint } = o,
    step = Math.floor(t * 24);
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  if (fx.includes("ripple") && !front)
    for (let i = 0; i < 4; i++) {
      const q = (t * 0.9 + i / 4) % 1;
      c.strokeStyle = `rgba(200,240,255,${0.55 * (1 - q)})`;
      c.lineWidth = s * 0.004 * (1 - q) + 1;
      c.beginPath();
      c.ellipse(x, g, s * (0.05 + q * 0.38), s * (0.01 + q * 0.06), 0, 0, TAU);
      c.stroke();
    }
  if (fx.includes("embers")) {
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const q = (t * 0.45 + hash(i)) % 1;
      glow(
        c,
        x + (hash(i + 9) - 0.5) * s * 0.8 + Math.sin(t * 2 + i) * s * 0.03,
        g - q * s * 0.6,
        s * 0.012,
        i % 3 ? "#ff7a2a" : "#ffd27a",
        1 - q,
      );
    }
    c.globalCompositeOperation = "source-over";
  }
  if (fx.includes("bloodSpike") && front) {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1),
        px = x + (tx - x) * q,
        rise = Math.max(0, Math.min(1, k * 2.2 - q * 1.1));
      if (rise > 0)
        spike(
          c,
          px,
          g,
          s * (0.1 + 0.18 * hash(i + 3)) * rise,
          s * 0.022,
          (hash(i) - 0.5) * s * 0.05,
          "#2a0006",
          "#8e0b1a",
          "#ff5a6a",
        );
    }
    c.globalCompositeOperation = "lighter";
    glow(c, tx, g - s * 0.1, s * 0.2 * k, "#b0102a", 0.6);
    c.globalCompositeOperation = "source-over";
  }
  if (fx.includes("bloodSpray") && front)
    for (let i = 0; i < 28; i++) {
      const a =
          -Math.PI * (0.15 + hash(i) * 0.7) * (o.face > 0 ? 1 : -1) + (o.face > 0 ? 0 : Math.PI),
        v = s * (0.1 + hash(i + 5) * 0.35) * k;
      c.fillStyle = i % 4 ? "#7a0010" : "#d01830";
      c.beginPath();
      c.ellipse(
        tx + Math.cos(a) * v,
        g - s * 0.22 + Math.sin(a) * v + k * k * s * 0.15,
        s * 0.007 * (1 - k * 0.5),
        s * 0.004,
        a,
        0,
        TAU,
      );
      c.fill();
    }
  if (fx.includes("earthShatter") && front) {
    const n = 11;
    for (let i = 0; i < n; i++) {
      const q = i / (n - 1),
        px = x + (tx - x) * q + (hash(i + 2) - 0.5) * s * 0.05,
        rise = Math.max(0, Math.min(1, k * 2 - q));
      if (rise > 0)
        spike(
          c,
          px,
          g,
          s * (0.06 + 0.14 * hash(i + 11)) * rise,
          s * 0.03,
          (hash(i) - 0.5) * s * 0.06,
          "#15171b",
          "#3b4048",
          "#9aa3ad",
        );
    }
    c.strokeStyle = "#0b0c0f";
    c.lineWidth = s * 0.004;
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.moveTo(x, g);
      let px = x,
        py = g;
      for (let j = 0; j < 5; j++) {
        px += ((tx - x) / 5) * k + (hash(i * 9 + j) - 0.5) * s * 0.05;
        py += (hash(i * 5 + j) - 0.5) * s * 0.025;
        c.lineTo(px, py);
      }
      c.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const q = k,
        a = -Math.PI * hash(i + 40);
      c.fillStyle = i % 2 ? "#2c3036" : "#5c636c";
      const px = tx + Math.cos(a) * s * 0.3 * q * hash(i),
        py = g + Math.sin(a) * s * 0.45 * q + q * q * s * 0.2;
      c.save();
      c.translate(px, py);
      c.rotate(t * 6 + i);
      c.fillRect(-s * 0.01, -s * 0.01, s * 0.02, s * 0.016);
      c.restore();
    }
  }
  if (fx.includes("shockwave") && front) {
    const q = Math.min(1, k * 1.4);
    for (let i = 0; i < 3; i++) {
      const r = s * (0.08 + q * (0.45 + i * 0.1));
      c.strokeStyle = `rgba(255,255,255,${(0.7 - i * 0.2) * (1 - q)})`;
      c.lineWidth = s * 0.012 * (1 - q) + 1;
      c.beginPath();
      c.ellipse(tx, g, r, r * 0.2, 0, 0, TAU);
      c.stroke();
    }
    c.fillStyle = `rgba(150,140,125,${0.35 * (1 - q)})`;
    for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.arc(
        tx + (hash(i) - 0.5) * s * 0.7 * q,
        g - hash(i + 4) * s * 0.08 * q,
        s * (0.03 + q * 0.05),
        0,
        TAU,
      );
      c.fill();
    }
  }
  if (fx.includes("fireCleave") && front) {
    c.globalCompositeOperation = "lighter";
    const cx = o.centre.x,
      cy = o.centre.y,
      R = Math.hypot(tip.x - cx, tip.y - cy) || s * 0.25,
      end = Math.atan2(tip.y - cy, tip.x - cx);
    for (let i = 0; i < 22; i++) {
      const q = i / 22,
        a = end - o.face * q * 2.4,
        rr = R * (1 - q * 0.1);
      glow(
        c,
        cx + Math.cos(a) * rr,
        cy + Math.sin(a) * rr,
        s * (0.05 * (1 - q) + 0.015),
        q < 0.3 ? "#fff1b0" : q < 0.6 ? "#ff8a2a" : "#b02a0a",
        (1 - q) * 0.9,
      );
    }
    c.globalCompositeOperation = "source-over";
  }
  if (fx.includes("debris") && front) {
    const px = hand.x + (tx - hand.x) * Math.min(1, k * 1.3),
      py = hand.y + (g - s * 0.22 - hand.y) * k - Math.sin(k * Math.PI) * s * 0.12;
    c.save();
    c.translate(px, py);
    c.rotate(t * 10);
    c.fillStyle = "#4b4f57";
    c.fillRect(-s * 0.05, -s * 0.02, s * 0.1, s * 0.04);
    c.strokeStyle = "#a5acb6";
    c.lineWidth = 1.5;
    c.strokeRect(-s * 0.05, -s * 0.02, s * 0.1, s * 0.04);
    c.restore();
  }
  if (fx.includes("lightning") && front) {
    c.globalCompositeOperation = "lighter";
    const end = {
      x: hand.x + (tx - hand.x) * Math.min(1, k * 2),
      y: hand.y + (g - s * 0.22 - hand.y) * Math.min(1, k * 2),
    };
    bolt(c, hand, end, s * 0.007, step * 13, tint);
    for (let i = 0; i < 3; i++) {
      const a = hash(step + i) * TAU;
      bolt(
        c,
        hand,
        { x: hand.x + Math.cos(a) * s * 0.1, y: hand.y + Math.sin(a) * s * 0.1 },
        s * 0.003,
        step * 7 + i,
        tint,
        1,
      );
    }
    glow(c, hand.x, hand.y, s * 0.09, tint[0], 0.9);
    glow(c, hand.x, hand.y, s * 0.03, "#ffffff");
    if (k > 0.45) glow(c, tx, g - s * 0.22, s * 0.22 * (1.4 - k), tint[0], 0.8);
    c.globalCompositeOperation = "source-over";
  }
  if (fx.includes("orb") && front) {
    const grow = Math.min(1, k * 1.6),
      R = s * (0.03 + 0.045 * grow);
    c.globalCompositeOperation = "lighter";
    glow(c, hand.x, hand.y, R * 3.2, tint[0], 0.55);
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = i % 2 ? tint[1] : tint[2];
      c.lineWidth = s * 0.004;
      c.beginPath();
      c.ellipse(hand.x, hand.y, R * (1.1 + i * 0.08), R * 0.35, t * 12 + i * 0.8, 0, TAU);
      c.stroke();
    }
    glow(c, hand.x, hand.y, R * 1.2, tint[1]);
    glow(c, hand.x, hand.y, R * 0.55, "#ffffff");
    for (let i = 0; i < 18; i++) {
      const q = (t * 2 + hash(i)) % 1,
        a = hash(i + 3) * TAU,
        d = R * 3 * (1 - q);
      glow(c, hand.x + Math.cos(a) * d, hand.y + Math.sin(a) * d, s * 0.006, tint[2], q);
    }
    c.globalCompositeOperation = "source-over";
  }
  if (fx.includes("blast") && front) {
    const q = Math.min(1, k * 1.2),
      cy = g - s * 0.22;
    c.globalCompositeOperation = "lighter";
    glow(c, tx, cy, s * (0.15 + q * 0.5), tint[0], 1 - q * 0.6);
    glow(c, tx, cy, s * (0.06 + q * 0.25), tint[1], 1 - q);
    glow(c, tx, cy, s * 0.08 * (1 - q), "#ffffff");
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU + hash(i),
        l = s * (0.2 + q * 0.6);
      c.strokeStyle = tint[2];
      c.globalAlpha = 1 - q;
      c.lineWidth = s * 0.006;
      c.beginPath();
      c.moveTo(tx + Math.cos(a) * l * 0.4, cy + Math.sin(a) * l * 0.4);
      c.lineTo(tx + Math.cos(a) * l, cy + Math.sin(a) * l);
      c.stroke();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
    for (let i = 0; i < 9; i++) {
      c.fillStyle = `rgba(30,28,34,${0.45 * q * (1 - q)})`;
      c.beginPath();
      c.arc(
        tx + (hash(i) - 0.5) * s * 0.6 * q,
        cy - hash(i + 2) * s * 0.4 * q,
        s * (0.06 + q * 0.1),
        0,
        TAU,
      );
      c.fill();
    }
  }
  if (fx.includes("chaosRift") && front) {
    c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 5; i++) {
      const a = hash(step * 3 + i) * TAU,
        l = s * (0.15 + hash(i + step) * 0.2);
      bolt(
        c,
        o.centre,
        { x: o.centre.x + Math.cos(a) * l, y: o.centre.y + Math.sin(a) * l * 0.7 },
        s * 0.004,
        step * 17 + i,
        ["#7a2cff", "#d38bff", "#ffffff"],
        1,
      );
    }
    for (let r = 0; r < 3; r++) {
      c.strokeStyle = r % 2 ? "#ff3df0" : "#6f3cff";
      c.globalAlpha = 0.7;
      c.lineWidth = s * 0.01;
      c.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * Math.PI * 1.4 + t * (4 + r) + r * 2;
        const p = {
          x: o.centre.x + Math.cos(a) * s * (0.14 + r * 0.04),
          y: o.centre.y + Math.sin(a) * s * (0.1 + r * 0.03),
        };
        if (i) {
          c.lineTo(p.x, p.y);
        } else {
          c.moveTo(p.x, p.y);
        }
      }
      c.stroke();
    }
    c.globalAlpha = 1;
    glow(c, o.centre.x, o.centre.y, s * 0.25, "#4a1080", 0.5);
    c.globalCompositeOperation = "source-over";
  }
  c.restore();
}

export type SceneBackdrop = "ocean" | "shatter" | "arena" | "night" | "street" | "void" | "ember";
/** Procedural parallax environments; `pan` is camera x offset in px so far layers move slower. */
export function paintBackdrop(
  c: C,
  kind: SceneBackdrop,
  W: number,
  H: number,
  gy: number,
  pan: number,
  t: number,
) {
  const sky = (a: string, b: string) => {
    const g = c.createLinearGradient(0, 0, 0, gy);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  };
  const floor = (a: string, b: string) => {
    const g = c.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    c.fillStyle = g;
    c.fillRect(0, gy - 1, W, H - gy + 1);
  };
  const grid = (col: string) => {
    c.strokeStyle = col;
    c.lineWidth = 1;
    for (let i = -12; i <= 12; i++) {
      const x0 = W / 2 + i * W * 0.08 - pan * 0.6;
      c.beginPath();
      c.moveTo(W / 2 + (x0 - W / 2) * 0.15, gy);
      c.lineTo(x0 * 1.8 - W * 0.4, H);
      c.stroke();
    }
    for (let j = 1; j < 7; j++) {
      const y = gy + (H - gy) * Math.pow(j / 7, 1.8);
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
  };
  if (kind === "ocean") {
    sky("#9fc4dc", "#4f86ad");
    floor("#3d7aa6", "#123c5e");
    for (let i = 0; i < 70; i++) {
      const y = gy + (H - gy) * Math.pow(hash(i), 1.6),
        w = W * (0.03 + ((y - gy) / H) * 0.2);
      const x =
        ((hash(i + 7) * W * 1.4 - ((pan * (y - gy)) / H) * 2 + t * 20 * (i % 3)) % (W * 1.4)) -
        W * 0.2;
      c.strokeStyle = `rgba(220,245,255,${0.15 + 0.25 * hash(i + 2)})`;
      c.lineWidth = 1 + ((y - gy) / H) * 3;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + w / 2, y - 2, x + w, y);
      c.stroke();
    }
  } else if (kind === "shatter") {
    sky("#2b3034", "#4b5257");
    floor("#1d2124", "#0b0d0f");
    for (let i = 0; i < 9; i++) {
      const x = ((hash(i) * W * 1.6 - pan * 0.3) % (W * 1.6)) - W * 0.3,
        y = gy * (0.2 + hash(i + 4) * 0.6) + Math.sin(t + i) * 6;
      c.fillStyle = "#15181b";
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 14, y + 6);
      c.lineTo(x + 4, y + 16);
      c.closePath();
      c.fill();
    }
    for (let i = 0; i < 14; i++) {
      const x = ((hash(i + 30) * W * 1.5 - pan * 0.9) % (W * 1.5)) - W * 0.25,
        h = H * (0.04 + hash(i + 2) * 0.1);
      c.fillStyle = i % 2 ? "#23282c" : "#30373c";
      c.beginPath();
      c.moveTo(x - h * 0.4, gy + 4);
      c.lineTo(x + (hash(i) - 0.5) * h * 0.5, gy - h);
      c.lineTo(x + h * 0.4, gy + 4);
      c.fill();
    }
  } else if (kind === "arena") {
    sky("#8ea4b8", "#c6d3dd");
    floor("#a9b7c4", "#6f8193");
    grid("rgba(255,255,255,.35)");
  } else if (kind === "ember") {
    sky("#071012", "#1d3a3a");
    floor("#3a2f28", "#120e0c");
    grid("rgba(255,150,90,.12)");
    c.fillStyle = "rgba(120,220,210,.15)";
    c.fillRect(0, gy - H * 0.05, W, H * 0.05);
  } else if (kind === "void") {
    sky("#06030c", "#1b0b2c");
    floor("#140a1f", "#040208");
    grid("rgba(170,110,255,.18)");
    for (let i = 0; i < 40; i++) {
      const x = (hash(i) * W * 1.3 - pan * 0.2) % (W * 1.3),
        y = hash(i + 1) * gy;
      c.fillStyle = `rgba(200,150,255,${0.3 + 0.5 * Math.abs(Math.sin(t * 2 + i))})`;
      c.fillRect(x, y, 2, 2);
    }
  } else if (kind === "night") {
    sky("#0a1424", "#283b4a");
    c.fillStyle = "#f3f0d6";
    c.beginPath();
    c.arc(W * 0.22 - pan * 0.05, H * 0.14, H * 0.05, 0, TAU);
    c.fill();
    glow(c, W * 0.22 - pan * 0.05, H * 0.14, H * 0.2, "rgba(240,240,200,.35)");
    c.fillStyle = "#1a2530";
    c.beginPath();
    c.moveTo(-50, gy);
    for (let i = 0; i <= 12; i++) {
      const x = (i / 12) * (W + 200) - 100 - pan * 0.4;
      c.lineTo(x, gy - H * (0.12 + hash(i) * 0.2));
    }
    c.lineTo(W + 100, gy);
    c.fill();
    floor("#24342c", "#0c1410");
  } else if (kind === "street") {
    sky("#5d6166", "#8c9094");
    floor("#3d4044", "#202225");
    for (let i = 0; i < 3; i++) {
      const x = ((i * W * 0.55 - pan * 0.5) % (W * 1.6)) - W * 0.1,
        y = gy - H * 0.2;
      c.fillStyle = "#6c7075";
      c.fillRect(x, y, W * 0.4, H * 0.16);
      c.fillStyle = "#2a2c2f";
      for (let j = 0; j < 4; j++) {
        c.beginPath();
        c.arc(x + W * (0.05 + j * 0.1), gy - H * 0.03, H * 0.03, 0, TAU);
        c.fill();
      }
    }
    c.strokeStyle = "rgba(255,255,255,.5)";
    c.lineWidth = 3;
    c.setLineDash([30, 24]);
    c.lineDashOffset = pan * 1.2;
    c.beginPath();
    c.moveTo(0, gy + (H - gy) * 0.4);
    c.lineTo(W, gy + (H - gy) * 0.4);
    c.stroke();
    c.setLineDash([]);
  }
}
