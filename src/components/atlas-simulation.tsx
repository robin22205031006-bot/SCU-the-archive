import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import type { AtlasLocation } from "@/lib/nexus-atlas";

const FPS = 24,
  HOLD = 48,
  MORPH = 60;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}
function cover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  dx = 0,
  dy = 0,
  zoom = 1,
) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const iw = img.width * s,
    ih = img.height * s;
  ctx.drawImage(img, (w - iw) / 2 + dx, (h - ih) / 2 + dy, iw, ih);
}
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Frame-by-frame 2D simulation of a location across its eras (or a day cycle for single-era places). Deterministic per frame so stepping is exact. */
export function AtlasSimulation({ loc }: { loc: AtlasLocation }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const imgs = useRef<HTMLImageElement[]>([]);
  const noise = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 70;
    const x = c.getContext("2d")!;
    const d = x.createImageData(40, 70);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    return c;
  }, []);
  const n = loc.eras.length;
  const single = n === 1;
  const total = single ? 240 : n * HOLD + (n - 1) * MORPH;
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    setFrame(0);
    Promise.all(loc.eras.map((e) => loadImage(e.image))).then((r) => {
      imgs.current = r;
      setReady(true);
    });
  }, [loc]);
  useEffect(() => {
    if (!playing || !ready) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % total), 1000 / FPS);
    return () => clearInterval(id);
  }, [playing, ready, total]);

  const segment = (f: number) => {
    let t = f;
    for (let i = 0; i < n; i++) {
      if (t < HOLD) return { a: i, b: i, p: 0 };
      t -= HOLD;
      if (i < n - 1) {
        if (t < MORPH) return { a: i, b: i + 1, p: t / MORPH };
        t -= MORPH;
      }
    }
    return { a: n - 1, b: n - 1, p: 0 };
  };

  useEffect(() => {
    const c = ref.current;
    if (!c || !ready) return;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const w = (c.width = c.clientWidth * dpr),
      h = (c.height = c.clientHeight * dpr);
    const { a, b, p } = single ? { a: 0, b: 0, p: 0 } : segment(frame);
    const e = ease(p),
      t = frame / FPS;
    const peak = Math.sin(Math.PI * p);
    let dx = 0,
      dy = 0;
    if (loc.transition === "quake" && a !== b) {
      dx = Math.sin(frame * 2.7) * 14 * dpr * peak;
      dy = Math.cos(frame * 3.3) * 10 * dpr * peak;
    }
    const zoom = 1.04 + 0.03 * Math.sin(t * 0.25);
    ctx.clearRect(0, 0, w, h);
    cover(ctx, imgs.current[a]!, w, h, dx, dy, zoom);
    if (a !== b) {
      // noise-threshold dissolve: build mask, keep B where noise < progress
      const m = document.createElement("canvas");
      m.width = 40;
      m.height = 70;
      const mx = m.getContext("2d")!;
      mx.drawImage(noise, 0, 0);
      const id = mx.getImageData(0, 0, 40, 70);
      for (let i = 0, y = 0; i < id.data.length; i += 4) {
        y = Math.floor(i / 4 / 40) / 70;
        const bias =
          loc.transition === "growth" ? y * 0.5 : loc.transition === "war" ? (1 - y) * 0.4 : 0;
        const v = (id.data[i]! / 255) * 0.8 + bias * 0.5;
        const alpha = Math.max(0, Math.min(1, (e * 1.3 - 0.15 - v) * 6));
        id.data[i] = id.data[i + 1] = id.data[i + 2] = 255;
        id.data[i + 3] = alpha * 255;
      }
      mx.putImageData(id, 0, 0);
      const tmp = document.createElement("canvas");
      tmp.width = w;
      tmp.height = h;
      const tx = tmp.getContext("2d")!;
      tx.imageSmoothingEnabled = true;
      tx.drawImage(m, 0, 0, w, h);
      tx.globalCompositeOperation = "source-in";
      cover(tx, imgs.current[b]!, w, h, dx, dy, zoom);
      ctx.drawImage(tmp, 0, 0);
      if (loc.transition === "quake") {
        ctx.fillStyle = `rgba(60,45,30,${0.35 * peak})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (loc.transition === "war") {
        ctx.fillStyle = `rgba(255,70,30,${0.3 * peak * (0.6 + 0.4 * Math.sin(frame))})`;
        ctx.fillRect(0, 0, w, h);
      }
      if (loc.transition === "growth") {
        ctx.fillStyle = `rgba(255,250,235,${0.25 * peak})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
    // drifting cloud shadows
    for (let k = 0; k < 5; k++) {
      const cx = (((k * 0.27 + t * 0.012 * (1 + k * 0.2)) % 1.4) - 0.2) * w,
        cy = ((k * 0.37) % 1) * h,
        r = (0.25 + 0.08 * k) * w;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(10,15,25,0.18)");
      g.addColorStop(1, "rgba(10,15,25,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    if (single) {
      // day cycle: day -> dusk -> night -> dawn
      const ph = (frame / total) * Math.PI * 2,
        night = (1 - Math.cos(ph)) / 2;
      ctx.fillStyle = `rgba(15,20,60,${0.55 * night})`;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = `rgba(255,140,60,${0.18 * Math.max(0, Math.sin(ph))})`;
      ctx.fillRect(0, 0, w, h);
      for (let k = 0; k < 60 * night; k++) {
        const x = (((k * 97.3) % 1000) / 1000) * w,
          y = (((k * 61.7) % 1000) / 1000) * h;
        ctx.fillStyle = `rgba(190,255,200,${night * (0.4 + 0.6 * Math.abs(Math.sin(frame * 0.2 + k)))})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 * dpr, 0, 6.28);
        ctx.fill();
      }
    }
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }, [frame, ready, loc, single, total, noise]);

  const seg = single ? null : segment(frame);
  const label = single
    ? `${loc.eras[0]!.label} · day cycle`
    : seg!.a === seg!.b
      ? loc.eras[seg!.a]!.label
      : `${loc.eras[seg!.a]!.label} → ${loc.eras[seg!.b]!.label}`;
  const btn =
    "grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur";
  return (
    <div className="absolute inset-0">
      <canvas
        ref={ref}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        className="atlas-keep block"
        aria-label={`${loc.name} frame-by-frame simulation`}
      />
      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          Loading frames…
        </div>
      )}
      <div className="absolute inset-x-3 bottom-3 z-20 rounded-2xl border border-border bg-background/80 p-3 backdrop-blur-md sm:left-auto sm:w-[26rem]">
        <div className="flex items-center justify-between text-[11px]">
          <span className="uppercase tracking-[0.2em] text-accent">{label}</span>
          <span className="tabular-nums text-muted-foreground">
            Frame {frame + 1}/{total} · {FPS} fps
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={total - 1}
          value={frame}
          onChange={(e) => {
            setPlaying(false);
            setFrame(+e.target.value);
          }}
          className="mt-2 w-full accent-[var(--primary)]"
          aria-label="Simulation frame"
        />
        <div className="mt-2 flex justify-center gap-2">
          <button
            className={btn}
            onClick={() => {
              setPlaying(false);
              setFrame((f) => (f - 1 + total) % total);
            }}
            aria-label="Previous frame"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            className={btn}
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            className={btn}
            onClick={() => {
              setPlaying(false);
              setFrame((f) => (f + 1) % total);
            }}
            aria-label="Next frame"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
