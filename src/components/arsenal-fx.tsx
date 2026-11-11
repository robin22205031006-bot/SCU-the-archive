import { useEffect, useRef } from "react";
import type { FxLayer } from "@/lib/arsenal-art";

/** Seeded pseudo-random so every frame is deterministic. */
const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const col = (l: FxLayer, a: number, dl = 0) => `hsla(${l.hue},${l.sat ?? 90}%,${Math.min(98, (l.light ?? 65) + dl)}%,${a})`;

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, layers: FxLayer[], t: number, density: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  const m = Math.min(w, h);
  layers.forEach((l, li) => {
    const cx = (l.x ?? .5) * w, cy = (l.y ?? .5) * h, r = (l.r ?? .3) * m, sp = l.speed ?? 1;
    const n = Math.max(1, Math.round((l.n ?? 12) * density));
    const seed = li * 1000;
    switch (l.kind) {
      case "pulse": {
        const k = .55 + .45 * Math.sin(t * 2.2 * sp + li);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * (1 + k * .4));
        g.addColorStop(0, col(l, .55 * k, 25)); g.addColorStop(.4, col(l, .25 * k)); g.addColorStop(1, col(l, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, 7); ctx.fill(); break;
      }
      case "rays": {
        for (let i = 0; i < n; i++) {
          const a = rnd(seed + i) * 6.283 + t * .15 * sp * (i % 2 ? 1 : -1);
          const len = r * (.5 + .5 * Math.abs(Math.sin(t * 1.7 * sp + i * 1.3)));
          const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
          g.addColorStop(0, col(l, .5, 20)); g.addColorStop(1, col(l, 0));
          ctx.strokeStyle = g; ctx.lineWidth = 1 + rnd(seed + i + 50) * 2.5;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
        }
        break;
      }
      case "arcs": {
        // Re-roll each bolt ~8 times a second for a crackling, frame-stepped look.
        const step = Math.floor(t * 8 * sp);
        for (let i = 0; i < n; i++) {
          if (rnd(step * 7 + i + seed) < .35) continue;
          let a = rnd(step * 13 + i + seed) * 6.283, x = cx, y = cy;
          ctx.strokeStyle = col(l, .85, 20); ctx.lineWidth = 1.6; ctx.shadowColor = col(l, 1); ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let s = 0; s < 9; s++) { a += (rnd(step * 31 + s + i * 9 + seed) - .5) * 1.4; x += Math.cos(a) * r / 7; y += Math.sin(a) * r / 7; ctx.lineTo(x, y); }
          ctx.stroke(); ctx.shadowBlur = 0;
        }
        break;
      }
      case "rise": {
        for (let i = 0; i < n; i++) {
          const life = (t * .35 * sp + rnd(seed + i)) % 1;
          const x = cx + (rnd(seed + i + 9) - .5) * r * 2 + Math.sin(t * 2 + i) * r * .15 * life;
          const y = cy + r * .4 - life * r * 2.2;
          const s = (1 - life) * (m * .025 + rnd(seed + i + 3) * m * .03);
          const g = ctx.createRadialGradient(x, y, 0, x, y, s);
          g.addColorStop(0, col(l, .55 * (1 - life), 15)); g.addColorStop(1, col(l, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.fill();
        }
        break;
      }
      case "fall": {
        for (let i = 0; i < n; i++) {
          const life = (t * .08 * sp + rnd(seed + i)) % 1;
          const x = rnd(seed + i + 4) * w + Math.sin(t * 1.3 + i) * m * .04;
          const y = -20 + life * (h + 40);
          ctx.save(); ctx.translate(x, y); ctx.rotate(t * (rnd(seed + i) - .5) * 3 + i);
          ctx.globalCompositeOperation = (l.light ?? 65) < 30 ? "source-over" : "lighter";
          ctx.fillStyle = col(l, .7 * Math.sin(life * Math.PI));
          const s = m * (.008 + rnd(seed + i + 2) * .012);
          ctx.beginPath(); ctx.ellipse(0, 0, s * 2.2, s, 0, 0, 7); ctx.fill(); ctx.restore();
        }
        ctx.globalCompositeOperation = "lighter";
        break;
      }
      case "orbit": {
        for (let i = 0; i < n; i++) {
          const a = t * .5 * sp + (i / n) * 6.283;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .7;
          const g = ctx.createRadialGradient(x, y, 0, x, y, m * .03);
          g.addColorStop(0, col(l, .8, 25)); g.addColorStop(1, col(l, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, m * .03, 0, 7); ctx.fill();
        }
        break;
      }
      case "ring": {
        for (let k = 0; k < 2; k++) {
          const p = (t * .4 * sp + k * .5) % 1;
          ctx.strokeStyle = col(l, .5 * (1 - p), 15); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(cx, cy, r * p, r * p * .55, 0, 0, 7); ctx.stroke();
        }
        break;
      }
      case "scan": {
        const y = ((t * .25 * sp) % 1) * h;
        const g = ctx.createLinearGradient(0, y - 30, 0, y + 4);
        g.addColorStop(0, col(l, 0)); g.addColorStop(1, col(l, .28, 10));
        ctx.fillStyle = g; ctx.fillRect(0, y - 30, w, 34);
        ctx.strokeStyle = col(l, .25); ctx.lineWidth = 1;
        const c = m * .08;
        ([[c, c, 1, 1], [w - c, c, -1, 1], [c, h - c, 1, -1], [w - c, h - c, -1, -1]] as const).forEach(([x, yy, dx, dy]) => { ctx.beginPath(); ctx.moveTo(x, yy + dy * c * .5); ctx.lineTo(x, yy); ctx.lineTo(x + dx * c * .5, yy); ctx.stroke(); });
        break;
      }
      case "motes": {
        for (let i = 0; i < n; i++) {
          const x = (rnd(seed + i) * w + t * 6 * (rnd(seed + i + 1) - .5)) % w;
          const y = ((rnd(seed + i + 2) * h - t * 10 * sp * (.5 + rnd(seed + i + 3))) % h + h) % h;
          const a = .3 + .7 * Math.abs(Math.sin(t * 2 + i));
          ctx.fillStyle = col(l, a, 25); ctx.beginPath(); ctx.arc(x, y, .8 + rnd(seed + i + 5) * 1.6, 0, 7); ctx.fill();
        }
        break;
      }
    }
  });
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Frame-stepped FX overlay painted over reference art. Pauses offscreen and when
 * motion is off. `density` < 1 gives the lighter Descrete treatment.
 */
export function ArsenalFx({ layers, animate, density = 1, fps = 24, className = "" }: { layers: FxLayer[]; animate: boolean; density?: number; fps?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0, visible = true, last = 0;
    const size = () => { const r = c.getBoundingClientRect(); const d = Math.min(2, window.devicePixelRatio || 1); c.width = Math.max(1, r.width * d); c.height = Math.max(1, r.height * d); ctx.setTransform(d, 0, 0, d, 0, 0); return r; };
    let box = size();
    const draw = (ms: number) => { paint(ctx, box.width, box.height, layers, ms / 1000, density); };
    const loop = (ms: number) => { raf = requestAnimationFrame(loop); if (!visible || ms - last < 1000 / fps) return; last = ms; draw(ms); };
    const ro = new ResizeObserver(() => { box = size(); if (!animate) draw(1200); });
    ro.observe(c);
    const io = new IntersectionObserver((es) => { visible = es[0]?.isIntersecting ?? true; });
    io.observe(c);
    if (animate) raf = requestAnimationFrame(loop); else draw(1200);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); };
  }, [layers, animate, density, fps]);
  return <canvas ref={ref} aria-hidden className={`atlas-keep pointer-events-none absolute inset-0 ${className}`} style={{ width: "100%", height: "100%" }} />;
}
