import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { AtlasSimulation } from "@/components/atlas-simulation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Globe2, MapPin, X, ZoomIn, ZoomOut, Maximize2, Mountain, Map as MapIcon, Film, ArrowRight } from "lucide-react";
import { ATLAS, WORLD_MAP, WORLD_TOP, type AtlasFx, type AtlasLandmark, type AtlasLocation } from "@/lib/nexus-atlas";
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
  return <canvas ref={ref} aria-hidden className="atlas-keep pointer-events-none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

function Controls({ zoomIn, zoomOut, reset }: { zoomIn: () => void; zoomOut: () => void; reset: () => void }) {
  const b = "grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur hover:bg-background";
  return <div className="absolute bottom-28 right-4 z-20 flex flex-col gap-2">
    <button className={b} onClick={zoomIn} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
    <button className={b} onClick={zoomOut} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
    <button className={b} onClick={reset} aria-label="Reset view"><Maximize2 className="h-4 w-4" /></button>
  </div>;
}

function Compass() {
  return <svg viewBox="0 0 60 60" className="atlas-compass pointer-events-none absolute bottom-28 left-4 z-20 h-14 w-14 text-primary" aria-hidden>
    <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeOpacity=".5" />
    <circle cx="30" cy="30" r="21" fill="none" stroke="currentColor" strokeOpacity=".25" strokeDasharray="2 3" />
    <path d="M30 4 L35 30 L30 56 L25 30 Z" fill="currentColor" fillOpacity=".85" />
    <path d="M4 30 L30 26 L56 30 L30 34 Z" fill="currentColor" fillOpacity=".4" />
    <text x="30" y="13" textAnchor="middle" fontSize="7" fill="currentColor" className="font-medium">N</text>
  </svg>;
}

export type AtlasMode = "illustrated" | "top" | "sim";

/** Cinematic map surface: painted image + edge fog, cloud shadows, vignette, FX and staggered landmark pins. */
function MapSurface({ image, alt, fx, pins, active, onPin, moving }: { image: string; alt: string; fx: AtlasFx[]; pins: AtlasLandmark[]; active: string | null; onPin: (id: string) => void; moving: boolean }) {
  return <div className="relative mx-auto h-[100dvh] aspect-[1024/1792] max-w-none overflow-hidden">
    <AnimatePresence mode="sync">
      <motion.img key={image} src={image} alt={alt} width={1024} height={1792} draggable={false}
        initial={moving ? { opacity: 0, scale: 1.06, filter: "blur(8px) saturate(.6)" } : false} animate={{ opacity: 1, scale: 1, filter: "blur(0px) saturate(1)" }} exit={{ opacity: 0 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} className={`absolute inset-0 h-full w-full select-none object-cover ${moving ? "atlas-drift" : ""}`} />
    </AnimatePresence>
    {moving && <div className="atlas-clouds pointer-events-none absolute inset-0" aria-hidden />}
    <AtlasFxLayer fx={fx} active={moving} />
    <div className="atlas-vignette pointer-events-none absolute inset-0" aria-hidden />
    {pins.map((l, i) => <motion.button key={l.id} onClick={() => onPin(l.id)} style={{ left: `${l.x}%`, top: `${l.y}%` }}
      initial={moving ? { opacity: 0, y: -14, scale: 0.6 } : false} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5 + i * 0.07, type: "spring", stiffness: 260, damping: 18 }}
      className="atlas-pin group absolute z-10 -translate-x-1/2 -translate-y-1/2" aria-label={l.name}>
      <span className={`pointer-events-none absolute -inset-2 rounded-full border border-primary/60 ${moving ? "animate-ping" : ""}`} />
      <span className={`relative grid h-7 w-7 place-items-center rounded-full border-2 border-primary bg-background/85 text-primary shadow-[0_0_18px_var(--primary)] transition ${active === l.id ? "scale-125 bg-primary text-primary-foreground" : ""}`}><MapPin className="h-3.5 w-3.5" /></span>
      <span className="atlas-label pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground">{l.name}</span>
    </motion.button>)}
  </div>;
}

function ModeSwitch({ mode, setMode }: { mode: AtlasMode; setMode: (m: AtlasMode) => void }) {
  const opts: { id: AtlasMode; label: string; icon: React.ReactNode }[] = [
    { id: "illustrated", label: "Scenic", icon: <Mountain className="h-3.5 w-3.5" /> },
    { id: "top", label: "Top view", icon: <MapIcon className="h-3.5 w-3.5" /> },
    { id: "sim", label: "Simulate", icon: <Film className="h-3.5 w-3.5" /> },
  ];
  return <div className="flex gap-1 rounded-full border border-border bg-background/60 p-1 backdrop-blur" role="tablist" aria-label="Map view">
    {opts.map(o => <button key={o.id} role="tab" aria-selected={mode === o.id} onClick={() => setMode(o.id)} className={`relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${mode === o.id ? "text-primary-foreground" : "text-muted-foreground"}`}>
      {mode === o.id && <motion.span layoutId="atlas-mode" className="absolute inset-0 rounded-full bg-primary" />}
      <span className="relative flex items-center gap-1.5">{o.icon}{o.label}</span>
    </button>)}
  </div>;
}

function LocationView({ loc, onClose, onWorld, initialMode }: { loc: AtlasLocation; onClose: () => void; onWorld: () => void; initialMode?: AtlasMode | undefined }) {
  const moving = useNexusMotion();
  const [mode, setMode] = useState<AtlasMode>(initialMode ?? "illustrated");
  const [eraId, setEraId] = useState(loc.eras[loc.eras.length - 1]!.id);
  const [pin, setPin] = useState<string | null>(null);
  const [info, setInfo] = useState(true);
  const era = loc.eras.find(e => e.id === eraId) ?? loc.eras[0]!;
  const pins = mode === "top" ? loc.top.landmarks : era.landmarks;
  const mark = pins.find(l => l.id === pin);
  useEffect(() => setPin(null), [eraId, mode]);
  return <div className="absolute inset-0">
    {mode === "sim" ? <AtlasSimulation loc={loc} /> :
    <TransformWrapper key={mode} panning={{ excluded: ["atlas-pin"] }} minScale={1} maxScale={5} initialScale={1} centerOnInit limitToBounds doubleClick={{ mode: "zoomIn" }}>
      {({ zoomIn, zoomOut, resetTransform }) => <>
        <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
          <MapSurface image={mode === "top" ? loc.top.image : era.image} alt={`${loc.name} — ${mode === "top" ? "top view" : era.label} map`} fx={mode === "top" ? ["mist"] : era.fx} pins={pins} active={pin} onPin={id => { setPin(id); setInfo(true); }} moving={moving} />
        </TransformComponent>
        <Controls zoomIn={() => zoomIn()} zoomOut={() => zoomOut()} reset={() => resetTransform()} />
        <Compass />
      </>}
    </TransformWrapper>}

    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background via-background/70 to-transparent p-4 pb-12">
      <div className="pointer-events-auto flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent">{loc.epithet}</p>
          <h2 className="text-2xl font-medium glow-text">{loc.name}</h2>
        </div>
        <button onClick={onWorld} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur" aria-label="World map"><Globe2 className="h-4 w-4" /></button>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur" aria-label="Close map"><X className="h-4 w-4" /></button>
      </div>
      <div className="pointer-events-auto mt-3 space-y-2">
        <ModeSwitch mode={mode} setMode={setMode} />
        {mode === "illustrated" && loc.eras.length > 1 && <div className="flex gap-1 overflow-x-auto rounded-full border border-border bg-background/60 p-1 backdrop-blur" aria-label="Era">
          {loc.eras.map(e => <button key={e.id} onClick={() => setEraId(e.id)} className={`relative flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${e.id === era.id ? "text-accent-foreground" : "text-muted-foreground"}`}>
            {e.id === era.id && <motion.span layoutId="atlas-era" className="absolute inset-0 rounded-full bg-accent" />}
            <span className="relative">{e.label}</span>
          </button>)}
        </div>}
      </div>
    </div>

    {mode !== "sim" && <>
      {!info && <button onClick={() => setInfo(true)} className="absolute bottom-4 left-4 z-20 rounded-full border border-border bg-background/75 px-3 py-2 text-xs backdrop-blur">About this map</button>}
      <AnimatePresence>
        {info && <motion.div key={(mark?.id ?? era.id) + mode} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
          className="absolute inset-x-3 bottom-3 z-20 rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-md sm:left-auto sm:w-96">
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent">{mark ? "Landmark" : mode === "top" ? `Top view · ${loc.top.era}` : era.label}</p>
          <h3 className="mt-1 text-base font-medium">{mark?.name ?? `${loc.name} overview`}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{mark?.note ?? era.summary}</p>
          <button onClick={() => { setInfo(false); setPin(null); }} className="absolute right-3 top-3 text-muted-foreground" aria-label="Hide details"><X className="h-4 w-4" /></button>
        </motion.div>}
      </AnimatePresence>
    </>}
  </div>;
}

function WorldView({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const moving = useNexusMotion();
  const [top, setTop] = useState(true);
  return <div className="absolute inset-0">
    <TransformWrapper key={String(top)} panning={{ excluded: ["atlas-pin"] }} minScale={1} maxScale={4} centerOnInit limitToBounds>
      {({ zoomIn, zoomOut, resetTransform }) => <>
        <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
          <div className="relative mx-auto h-[100dvh] aspect-[1024/1792] overflow-hidden">
            <img src={top ? WORLD_TOP : WORLD_MAP} alt="World map of all regions" width={1024} height={1792} draggable={false} className={`absolute inset-0 h-full w-full select-none object-cover ${moving ? "atlas-drift" : ""}`} />
            {moving && <div className="atlas-clouds pointer-events-none absolute inset-0" aria-hidden />}
            <AtlasFxLayer fx={["mist", "fireflies"]} active={moving} />
            <div className="atlas-vignette pointer-events-none absolute inset-0" aria-hidden />
            {ATLAS.map((l, i) => <motion.button key={l.id} onClick={() => onPick(l.id)} style={{ left: `${l.worldX}%`, top: `${l.worldY}%` }}
              initial={moving ? { opacity: 0, scale: 0.7 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.12 }}
              className="atlas-pin absolute z-10 -translate-x-1/2 -translate-y-1/2">
              <span className="atlas-banner block px-3 py-1.5 text-xs font-medium text-foreground">{l.name}</span>
            </motion.button>)}
          </div>
        </TransformComponent>
        <Controls zoomIn={() => zoomIn()} zoomOut={() => zoomOut()} reset={() => resetTransform()} />
        <Compass />
      </>}
    </TransformWrapper>
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background via-background/70 to-transparent p-4 pb-12">
      <div className="pointer-events-auto flex items-start gap-3">
        <div className="flex-1"><p className="text-[10px] uppercase tracking-[0.3em] text-accent">All regions</p><h2 className="text-2xl font-medium glow-text">World Atlas</h2></div>
        <button onClick={() => setTop(t => !t)} className="rounded-full border border-border bg-background/70 px-3 py-2 text-xs backdrop-blur">{top ? "Scenic" : "Top view"}</button>
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/70 backdrop-blur" aria-label="Close map"><X className="h-4 w-4" /></button>
      </div>
    </div>
  </div>;
}

/** Full-screen map overlay: world view or a single location. */
export function AtlasOverlay({ start, mode, onClose }: { start: string; mode?: AtlasMode | undefined; onClose: () => void }) {
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
      <motion.div key={view} className="absolute inset-0" initial={{ opacity: 0, scale: 1.12, filter: "blur(10px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        {loc ? <LocationView loc={loc} initialMode={mode} onClose={onClose} onWorld={() => setView("world")} /> : <WorldView onPick={setView} onClose={onClose} />}
      </motion.div>
    </AnimatePresence>
  </motion.div>, document.body);
}

/** Nexus atlas launcher: pick the world map or any location map. */
export function NexusAtlas() {
  const [open, setOpen] = useState<string | null>(null);
  const cards = [{ id: "world", name: "World Atlas", epithet: "Every region together", image: WORLD_MAP }, ...ATLAS.map(l => ({ id: l.id, name: l.name, epithet: l.epithet, image: l.eras[l.eras.length - 1]!.image }))];
  return <section aria-label="Atlas">
    <Link to="/atlas" className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3 text-sm hover:border-primary">
      <span><span className="block text-[10px] uppercase tracking-[0.25em] text-accent">Full section</span>Open the World Atlas page</span><ArrowRight className="h-4 w-4 text-primary" />
    </Link>
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
