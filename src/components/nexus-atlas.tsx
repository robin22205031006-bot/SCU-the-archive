import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Globe2, MapPin, X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { ATLAS, WORLD_MAP, type AtlasFx, type AtlasLocation } from "@/lib/nexus-atlas";
import { useNexusMotion } from "@/hooks/use-nexus-motion";

const FX_COLORS: Record<AtlasFx, string> = { snow: "235,245,255", fireflies: "255,230,140", mist: "220,230,240", embers: "255,120,60", wind: "230,245,255", spores: "190,255,170" };

/** Lightweight particle overlay; pauses when hidden or when motion is reduced. */
function AtlasFxLayer({ fx, active }: { fx: AtlasFx[]; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || !active) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; };
    resize(); window.addEventListener("resize", resize);
    const count = Math.min(90, Math.round((c.clientWidth * c.clientHeight) / 12000));
    const ps = Array.from({ length: count }, (_, i) => {
      const kind = fx[i % fx.length]!;
      return { kind, x: Math.random(), y: Math.random(), r: kind === "mist" ? 60 + Math.random() * 120 : 1 + Math.random() * 2.5, s: 0.2 + Math.random(), p: Math.random() * 6.28 };
    });
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      for (const q of ps) {
        q.p += dt * q.s;
        if (q.kind === "snow") { q.y += dt * 0.04 * q.s; q.x += Math.sin(q.p) * dt * 0.01; }
        else if (q.kind === "embers") { q.y -= dt * 0.05 * q.s; q.x += Math.sin(q.p * 2) * dt * 0.01; }
        else if (q.kind === "wind") { q.x += dt * 0.12 * q.s; }
        else if (q.kind === "mist") { q.x += dt * 0.006 * q.s; }
        else { q.x += Math.cos(q.p) * dt * 0.012; q.y += Math.sin(q.p * 1.3) * dt * 0.01; }
        if (q.y > 1.05) q.y = -0.05; if (q.y < -0.05) q.y = 1.05; if (q.x > 1.1) q.x = -0.1; if (q.x < -0.1) q.x = 1.1;
        const px = q.x * w, py = q.y * h, col = FX_COLORS[q.kind];
        if (q.kind === "mist") {
          const g = ctx.createRadialGradient(px, py, 0, px, py, q.r * dpr);
          g.addColorStop(0, `rgba(${col},0.08)`); g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g; ctx.fillRect(px - q.r * dpr, py - q.r * dpr, q.r * 2 * dpr, q.r * 2 * dpr);
        } else if (q.kind === "wind") {
          ctx.strokeStyle = `rgba(${col},${0.12 + 0.1 * Math.sin(q.p)})`; ctx.lineWidth = dpr;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px - 30 * dpr, py - 6 * dpr * Math.sin(q.p), px - 70 * dpr, py); ctx.stroke();
        } else {
          const a = q.kind === "fireflies" || q.kind === "spores" ? 0.35 + 0.5 * Math.abs(Math.sin(q.p * 2)) : 0.7;
          ctx.fillStyle = `rgba(${col},${a})`; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = q.kind === "snow" ? 0 : 8 * dpr;
          ctx.beginPath(); ctx.arc(px, py, q.r * dpr, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    document.addEventListener("visibilitychange", vis); raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", vis); };
  }, [fx, active]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}

function Controls({ zoomIn, zoomOut, reset }: { zoomIn: () => void; zoomOut: () => void; reset: () => void }) {
  const b = "grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur hover:bg-background";
  return <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2">
    <button className={b} onClick={zoomIn} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
    <button className={b} onClick={zoomOut} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
    <button className={b} onClick={reset} aria-label="Reset view"><Maximize2 className="h-4 w-4" /></button>
  </div>;
}

function LocationView({ loc, onClose, onWorld }: { loc: AtlasLocation; onClose: () => void; onWorld: () => void }) {
  const moving = useNexusMotion();
  const [eraId, setEraId] = useState(loc.eras[loc.eras.length - 1]!.id);
  const [pin, setPin] = useState<string | null>(null);
  const [info, setInfo] = useState(true);
  const era = loc.eras.find(e => e.id === eraId) ?? loc.eras[0]!;
  const mark = era.landmarks.find(l => l.id === pin);
  useEffect(() => setPin(null), [eraId]);
  return <div className="absolute inset-0">
    <TransformWrapper panning={{ excluded: ["atlas-pin"] }} minScale={1} maxScale={5} initialScale={1} centerOnInit limitToBounds doubleClick={{ mode: "zoomIn" }}>
      {({ zoomIn, zoomOut, resetTransform }) => <>
        <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
          <div className="relative mx-auto h-[100dvh] aspect-[1024/1792] max-w-none">
            <AnimatePresence mode="sync">
              <motion.img key={era.id} src={era.image} alt={`${loc.name} — ${era.label} map`} width={1024} height={1792} draggable={false}
                initial={moving ? { opacity: 0, scale: 1.04, filter: "blur(6px)" } : false} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }} className="absolute inset-0 h-full w-full select-none object-cover" />
            </AnimatePresence>
            <AtlasFxLayer fx={era.fx} active={moving} />
            {era.landmarks.map(l => <button key={l.id} onClick={() => { setPin(l.id); setInfo(true); }} style={{ left: `${l.x}%`, top: `${l.y}%` }}
              className="atlas-pin group absolute z-10 -translate-x-1/2 -translate-y-1/2" aria-label={l.name}>
              <span className={`pointer-events-none absolute inset-0 rounded-full bg-primary/50 ${moving ? "animate-ping" : ""}`} />
              <span className={`relative grid h-6 w-6 place-items-center rounded-full border border-primary bg-background/80 text-primary shadow-[0_0_14px_var(--primary)] ${pin === l.id ? "scale-125" : ""}`}><MapPin className="h-3 w-3" /></span>
              <span className="pointer-events-none absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap rounded bg-background/75 px-1.5 py-0.5 text-[10px] text-foreground opacity-0 backdrop-blur transition group-hover:opacity-100 sm:opacity-80">{l.name}</span>
            </button>)}
          </div>
        </TransformComponent>
        <Controls zoomIn={() => zoomIn()} zoomOut={() => zoomOut()} reset={() => resetTransform()} />
      </>}
    </TransformWrapper>

    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background/90 to-transparent p-4 pb-10">
      <div className="pointer-events-auto flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent">{loc.epithet}</p>
          <h2 className="text-2xl font-medium glow-text">{loc.name}</h2>
        </div>
        <button onClick={onWorld} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur" aria-label="World map"><Globe2 className="h-4 w-4" /></button>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur" aria-label="Close map"><X className="h-4 w-4" /></button>
      </div>
      {loc.eras.length > 1 && <div className="pointer-events-auto mt-3 flex gap-1 overflow-x-auto rounded-full border border-border bg-background/60 p-1 backdrop-blur">
        {loc.eras.map(e => <button key={e.id} onClick={() => setEraId(e.id)} className={`relative flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${e.id === era.id ? "text-primary-foreground" : "text-muted-foreground"}`}>
          {e.id === era.id && <motion.span layoutId="atlas-era" className="absolute inset-0 rounded-full bg-primary" />}
          <span className="relative">{e.label}</span>
        </button>)}
      </div>}
    </div>

    {!info && <button onClick={() => setInfo(true)} className="absolute bottom-4 left-4 z-20 rounded-full border border-border bg-background/75 px-3 py-2 text-xs backdrop-blur">About {era.label}</button>}
    <AnimatePresence>
      {info && <motion.div key={mark?.id ?? era.id} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
        className="absolute inset-x-3 bottom-3 z-20 rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-md sm:left-auto sm:w-96">
        <p className="text-[10px] uppercase tracking-[0.25em] text-accent">{mark ? "Landmark" : era.label}</p>
        <h3 className="mt-1 text-base font-medium">{mark?.name ?? `${loc.name} overview`}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{mark?.note ?? era.summary}</p>
        <button onClick={() => { setInfo(false); setPin(null); }} className="absolute right-3 top-3 text-muted-foreground" aria-label="Hide details"><X className="h-4 w-4" /></button>
      </motion.div>}
    </AnimatePresence>
  </div>;
}

function WorldView({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const moving = useNexusMotion();
  return <div className="absolute inset-0">
    <TransformWrapper panning={{ excluded: ["atlas-pin"] }} minScale={1} maxScale={4} centerOnInit limitToBounds>
      {({ zoomIn, zoomOut, resetTransform }) => <>
        <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
          <div className="relative mx-auto h-[100dvh] aspect-[1024/1792]">
            <img src={WORLD_MAP} alt="World map of all regions" width={1024} height={1792} draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
            <AtlasFxLayer fx={["mist", "fireflies"]} active={moving} />
            {ATLAS.map(l => <button key={l.id} onClick={() => onPick(l.id)} style={{ left: `${l.worldX}%`, top: `${l.worldY}%` }} className="atlas-pin absolute z-10 -translate-x-1/2 -translate-y-1/2">
              <span className="block rounded-full border border-primary bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-[0_0_18px_var(--primary)] backdrop-blur">{l.name}</span>
            </button>)}
          </div>
        </TransformComponent>
        <Controls zoomIn={() => zoomIn()} zoomOut={() => zoomOut()} reset={() => resetTransform()} />
      </>}
    </TransformWrapper>
    <div className="absolute inset-x-0 top-0 z-20 flex items-start gap-3 bg-gradient-to-b from-background/90 to-transparent p-4 pb-10">
      <div className="flex-1"><p className="text-[10px] uppercase tracking-[0.3em] text-accent">All regions</p><h2 className="text-2xl font-medium glow-text">World Atlas</h2></div>
      <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur" aria-label="Close map"><X className="h-4 w-4" /></button>
    </div>
  </div>;
}

/** Full-screen map overlay: world view or a single location. */
function AtlasOverlay({ start, onClose }: { start: string; onClose: () => void }) {
  const [view, setView] = useState(start);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [onClose]);
  const loc = ATLAS.find(l => l.id === view);
  return createPortal(<motion.div role="dialog" aria-modal aria-label="Map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] overflow-hidden bg-background" style={{ maxWidth: "none", maxHeight: "none" }}>
    <AnimatePresence mode="wait">
      <motion.div key={view} className="absolute inset-0" initial={{ opacity: 0, scale: 1.08 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.45 }}>
        {loc ? <LocationView loc={loc} onClose={onClose} onWorld={() => setView("world")} /> : <WorldView onPick={setView} onClose={onClose} />}
      </motion.div>
    </AnimatePresence>
  </motion.div>, document.body);
}

/** Nexus atlas launcher: pick the world map or any location map. */
export function NexusAtlas() {
  const [open, setOpen] = useState<string | null>(null);
  const cards = [{ id: "world", name: "World Atlas", epithet: "Every region together", image: WORLD_MAP }, ...ATLAS.map(l => ({ id: l.id, name: l.name, epithet: l.epithet, image: l.eras[l.eras.length - 1]!.image }))];
  return <section aria-label="Atlas">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c, i) => <motion.button key={c.id} onClick={() => setOpen(c.id)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
        className={`group relative overflow-hidden rounded-2xl border border-border text-left ${c.id === "world" ? "col-span-2 sm:col-span-1" : ""}`}>
        <img src={c.image} alt="" loading="lazy" width={1024} height={1792} className="aspect-[3/4] w-full object-cover transition duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[9px] uppercase tracking-[0.25em] text-accent">{c.epithet}</p>
          <p className="text-sm font-medium">{c.name}</p>
        </div>
      </motion.button>)}
    </div>
    <AnimatePresence>{open && <AtlasOverlay start={open} onClose={() => setOpen(null)} />}</AnimatePresence>
  </section>;
}
