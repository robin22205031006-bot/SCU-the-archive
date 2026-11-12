import type { Fx } from "@/lib/ability-action";
type C = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** Painted water volumes and shadow weapon choreography, layered around the body. */
export function characterCombatFx(
  c: C,
  fx: Fx[],
  x: number,
  y: number,
  ground: number,
  target: number,
  s: number,
  k: number,
  t: number,
  front: boolean,
) {
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  const ribbon = (pts: { x: number; y: number }[], width: number, shadow = false) => {
    const first = pts[0];
    if (!first) return;
    const stroke = (col: string, w: number) => {
      c.fillStyle = col;
      c.beginPath();
      const edges = pts.map((p, i) => {
        const next = pts[Math.min(pts.length - 1, i + 1)] ?? p,
          prev = pts[Math.max(0, i - 1)] ?? p;
        const dx = next.x - prev.x,
          dy = next.y - prev.y,
          length = Math.hypot(dx, dy) || 1;
        const profile = Math.pow(Math.sin((i / Math.max(1, pts.length - 1)) * Math.PI), 0.55);
        const half = w * 0.5 * profile * (0.8 + 0.2 * Math.sin(i * 0.45 + t * 5));
        return {
          a: { x: p.x - (dy / length) * half, y: p.y + (dx / length) * half },
          b: { x: p.x + (dy / length) * half, y: p.y - (dx / length) * half },
        };
      });
      for (const e of edges) c.lineTo(e.a.x, e.a.y);
      for (const e of edges.reverse()) c.lineTo(e.b.x, e.b.y);
      c.closePath();
      c.fill();
    };
    stroke(shadow ? "#09161b" : "#075f91", width * 1.18);
    stroke(shadow ? "#164851" : "#27a9de", width);
    stroke(shadow ? "#53c8c4" : "#b6f6ff", width * 0.45);
    stroke(shadow ? "#bdffec" : "#efffff", width * 0.1);
  };
  if (fx.includes("waterRibbon") || fx.includes("waterSpiral")) {
    const spiral = fx.includes("waterSpiral"),
      rings = spiral ? 4 : 1;
    for (let ring = 0; ring < rings; ring++) {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const a = (i / 48) * Math.PI + (front ? 0 : Math.PI) + t * 5;
        const radius = s * (0.18 + ring * 0.014),
          height = spiral ? ground - ring * s * 0.105 - s * 0.045 : y - s * 0.19;
        pts.push({
          x: x + Math.cos(a) * radius,
          y: height + Math.sin(a) * s * 0.045 + Math.sin(a * 2 + t * 4) * s * 0.012,
        });
      }
      ribbon(pts, s * (spiral ? 0.034 : 0.043));
    }
    for (let i = 0; i < 15; i++) {
      const a = i * 2.4 + t * 3;
      c.fillStyle = i % 2 ? "#b6f6ff" : "#27a9de";
      c.beginPath();
      c.ellipse(
        x + Math.cos(a) * s * 0.23,
        ground - ((i * 0.071 + t * 0.2) % 1) * s * 0.4,
        s * 0.004,
        s * 0.01,
        a,
        0,
        TAU,
      );
      c.fill();
    }
  }
  if (fx.includes("waterCrash") && front) {
    const cx = x + (target - x) * Math.min(1, k * 1.5),
      crest = s * (0.21 + 0.14 * Math.sin(k * Math.PI));
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const a = -Math.PI * 0.7 + (i / 60) * Math.PI * 1.35;
      pts.push({ x: cx + Math.cos(a) * crest * 0.65, y: ground - crest + Math.sin(a) * crest });
    }
    ribbon(pts, s * 0.085);
    for (let i = 0; i < 14; i++) {
      const px = cx + s * (i / 14 - 0.5) * 0.5;
      ribbon(
        [
          { x: px, y: ground },
          {
            x: px + s * 0.06 * Math.sin(i),
            y: ground - s * (0.08 + 0.16 * Math.abs(Math.sin(i + k * 4))),
          },
        ],
        s * 0.012,
      );
    }
  }
  if (fx.includes("shadowPool") && !front) {
    c.fillStyle = "#081215";
    c.beginPath();
    c.ellipse(x, ground, s * 0.17, s * 0.026, 0, 0, TAU);
    c.fill();
    c.strokeStyle = "#4bc8ba";
    c.lineWidth = s * 0.004;
    c.stroke();
    for (let i = 0; i < 20; i++) {
      const q = (t * 0.7 + i * 0.063) % 1;
      c.fillStyle = i % 3 ? "#172c32" : "#54bdb6";
      c.fillRect(
        x + Math.sin(i * 3.7) * s * 0.17 * (1 - q),
        ground - q * s * 0.34,
        s * 0.007 * (1 - q),
        s * 0.018,
      );
    }
  }
  if (fx.includes("shadowSlash") && front) {
    const pts = [];
    for (let i = 0; i <= 60; i++) {
      const a = -2.8 + (i / 60) * 4.7;
      pts.push({
        x: x + Math.cos(a) * s * (0.21 + k * 0.06),
        y: y - s * 0.2 + Math.sin(a) * s * 0.24,
      });
    }
    ribbon(pts, s * 0.024, true);
    for (let i = 0; i < 12; i++) {
      c.fillStyle = "#0a2027";
      c.fillRect(
        x + Math.sin(i * 6 + t) * s * 0.3,
        y - s * 0.2 + Math.cos(i * 4) * s * 0.24,
        s * 0.008,
        s * 0.017,
      );
    }
  }
  if (fx.includes("kunai") && front) {
    for (let i = -2; i <= 2; i++) {
      const px = x + (target - x) * k,
        py = y - s * 0.22 + i * s * 0.032 * k;
      c.save();
      c.translate(px, py);
      c.rotate(i * 0.16 + t * 8);
      c.fillStyle = "#d1eeef";
      c.beginPath();
      c.moveTo(s * 0.035, 0);
      c.lineTo(-s * 0.012, -s * 0.009);
      c.lineTo(-s * 0.012, s * 0.009);
      c.closePath();
      c.fill();
      c.strokeStyle = "#73bbc0";
      c.lineWidth = s * 0.002;
      c.beginPath();
      c.moveTo(-s * 0.012, 0);
      c.lineTo(-s * 0.09, 0);
      c.stroke();
      c.restore();
    }
  }
  c.restore();
}
