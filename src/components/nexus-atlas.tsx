import { useEffect, useRef, useState, type RefObject } from "react";
import type React from "react";
import { Link } from "@tanstack/react-router";
import { AtlasSimulation } from "@/components/atlas-simulation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";
import {
  Globe2,
  MapPin,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Mountain,
  Map as MapIcon,
  Film,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Eye,
  EyeOff,
  Sparkles,
  Navigation,
} from "lucide-react";
import {
  ATLAS,
  ATLAS_WORLD_ROUTES,
  WORLD_IMAGE_HEIGHT,
  WORLD_IMAGE_WIDTH,
  WORLD_MAP,
  WORLD_TOP,
  computeFitDimensions,
  type AtlasFx,
  type AtlasLandmark,
  type AtlasLocation,
} from "@/lib/nexus-atlas";
import { useNexusMotion } from "@/hooks/use-nexus-motion";

const FX_COLORS: Record<AtlasFx, string> = {
  snow: "235,245,255",
  fireflies: "255,230,140",
  mist: "220,230,240",
  embers: "255,120,60",
  wind: "230,245,255",
  spores: "190,255,170",
  rift: "190,145,255",
  lanterns: "255,196,95",
  ash: "210,190,185",
};

function useContainerSize(ref: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 720,
  }));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || window.innerWidth;
      const h = el.clientHeight || window.innerHeight;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
  return size;
}

/** Lightweight particle overlay; pauses when hidden or when motion is reduced. */
function AtlasFxLayer({ fx, active }: { fx: AtlasFx[]; active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !active || fx.length === 0) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      c.width = Math.max(1, c.clientWidth * dpr);
      c.height = Math.max(1, c.clientHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    const area = Math.max(1, c.clientWidth * c.clientHeight);
    const count = Math.max(24, Math.min(95, Math.round(area / 11000)));
    const ps = Array.from({ length: count }, (_, i) => {
      const kind = fx[i % fx.length]!;
      return {
        kind,
        x: Math.random(),
        y: Math.random(),
        r:
          kind === "mist"
            ? 55 + Math.random() * 110
            : kind === "lanterns"
              ? 2 + Math.random() * 2.5
              : 1 + Math.random() * 2.5,
        s: 0.25 + Math.random() * 0.9,
        p: Math.random() * 6.28,
      };
    });
    let raf = 0,
      last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const w = c.width,
        h = c.height;
      ctx.clearRect(0, 0, w, h);
      for (const q of ps) {
        q.p += dt * q.s;
        if (q.kind === "snow" || q.kind === "ash") {
          q.y += dt * (q.kind === "ash" ? 0.025 : 0.04) * q.s;
          q.x += Math.sin(q.p) * dt * 0.012;
        } else if (q.kind === "embers" || q.kind === "lanterns") {
          q.y -= dt * (q.kind === "lanterns" ? 0.02 : 0.05) * q.s;
          q.x += Math.sin(q.p * 2) * dt * 0.01;
        } else if (q.kind === "wind") {
          q.x += dt * 0.12 * q.s;
        } else if (q.kind === "rift") {
          q.y -= dt * 0.018 * q.s;
          q.x += Math.sin(q.p * 3) * dt * 0.018;
        } else if (q.kind === "mist") {
          q.x += dt * 0.006 * q.s;
        } else {
          q.x += Math.cos(q.p) * dt * 0.012;
          q.y += Math.sin(q.p * 1.3) * dt * 0.01;
        }
        if (q.y > 1.05) q.y = -0.05;
        if (q.y < -0.05) q.y = 1.05;
        if (q.x > 1.1) q.x = -0.1;
        if (q.x < -0.1) q.x = 1.1;
        const px = q.x * w,
          py = q.y * h,
          col = FX_COLORS[q.kind];
        if (q.kind === "mist") {
          const g = ctx.createRadialGradient(px, py, 0, px, py, q.r * dpr);
          g.addColorStop(0, `rgba(${col},0.08)`);
          g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g;
          ctx.fillRect(px - q.r * dpr, py - q.r * dpr, q.r * 2 * dpr, q.r * 2 * dpr);
        } else if (q.kind === "wind") {
          ctx.strokeStyle = `rgba(${col},${0.13 + 0.1 * Math.sin(q.p)})`;
          ctx.lineWidth = dpr;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.quadraticCurveTo(px - 30 * dpr, py - 6 * dpr * Math.sin(q.p), px - 70 * dpr, py);
          ctx.stroke();
        } else if (q.kind === "rift") {
          const a = 0.25 + 0.55 * Math.abs(Math.sin(q.p * 2.4));
          ctx.strokeStyle = `rgba(${col},${a})`;
          ctx.lineWidth = 1.2 * dpr;
          ctx.beginPath();
          ctx.moveTo(px, py - 7 * dpr);
          ctx.lineTo(px + 3 * dpr, py);
          ctx.lineTo(px - 2 * dpr, py + 7 * dpr);
          ctx.stroke();
        } else {
          const a =
            q.kind === "fireflies" || q.kind === "spores" || q.kind === "lanterns"
              ? 0.35 + 0.5 * Math.abs(Math.sin(q.p * 2))
              : 0.68;
          ctx.fillStyle = `rgba(${col},${a})`;
          ctx.shadowColor = `rgba(${col},1)`;
          ctx.shadowBlur = q.kind === "snow" || q.kind === "ash" ? 0 : 8 * dpr;
          ctx.beginPath();
          ctx.arc(px, py, q.r * dpr, 0, 6.28);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    const vis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", vis);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [fx, active]);
  if (!active || fx.length === 0) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="atlas-keep pointer-events-none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

function Controls({
  zoomIn,
  zoomOut,
  reset,
}: {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
}) {
  const b =
    "grid h-9 w-9 place-items-center rounded-full border border-border bg-background/75 text-foreground backdrop-blur hover:border-primary hover:bg-background";
  return (
    <div className="absolute bottom-36 right-4 z-20 flex flex-col gap-1.5 sm:bottom-28">
      <button type="button" className={b} onClick={zoomIn} aria-label="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </button>
      <button type="button" className={b} onClick={zoomOut} aria-label="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </button>
      <button type="button" className={b} onClick={reset} aria-label="Reset view">
        <Maximize2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function Compass({ coords }: { coords: { x: number; y: number } | null }) {
  return (
    <div className="pointer-events-none absolute bottom-16 left-4 z-20 flex items-center gap-2.5 sm:bottom-16">
      <svg viewBox="0 0 60 60" className="atlas-compass h-12 w-12 text-primary" aria-hidden>
        <circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeOpacity=".5" />
        <circle
          cx="30"
          cy="30"
          r="21"
          fill="none"
          stroke="currentColor"
          strokeOpacity=".25"
          strokeDasharray="2 3"
        />
        <path d="M30 4 L35 30 L30 56 L25 30 Z" fill="currentColor" fillOpacity=".85" />
        <path d="M4 30 L30 26 L56 30 L30 34 Z" fill="currentColor" fillOpacity=".4" />
        <text
          x="30"
          y="13"
          textAnchor="middle"
          fontSize="7"
          fill="currentColor"
          className="font-medium"
        >
          N
        </text>
      </svg>
      {coords && (
        <span className="rounded border border-border/70 bg-background/75 px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground backdrop-blur">
          {String(coords.x).padStart(2, "0")}E · {String(coords.y).padStart(2, "0")}N
        </span>
      )}
    </div>
  );
}

export type AtlasMode = "illustrated" | "top" | "sim";

/** Fit-the-screen map surface: preserves every pixel of portrait or landscape maps with zero cropped landmarks. */
function MapSurface({
  image,
  compareImage,
  compareLabelLeft,
  compareLabelRight,
  compareSplit,
  onCompareSplitChange,
  alt,
  mediaWidth,
  mediaHeight,
  fitSize,
  fx,
  pins,
  routes,
  active,
  onPin,
  showLabels,
  showFx,
  moving,
  onHoverCoords,
}: {
  image: string;
  compareImage?: string | undefined;
  compareLabelLeft?: string | undefined;
  compareLabelRight?: string | undefined;
  compareSplit?: number | undefined;
  onCompareSplitChange?: ((v: number) => void) | undefined;
  alt: string;
  mediaWidth: number;
  mediaHeight: number;
  fitSize: { width: number; height: number };
  fx: AtlasFx[];
  pins: AtlasLandmark[];
  routes?: [string, string][] | undefined;
  active: string | null;
  onPin: (id: string) => void;
  showLabels: boolean;
  showFx: boolean;
  moving: boolean;
  onHoverCoords?: ((coords: { x: number; y: number } | null) => void) | undefined;
}) {
  const pinMap = new Map(pins.map((p) => [p.id, p]));

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onHoverCoords) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    onHoverCoords({ x, y });
  };

  return (
    <div
      data-testid="atlas-fit-stage"
      data-map-aspect={`${mediaWidth}x${mediaHeight}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => onHoverCoords?.(null)}
      style={{ width: `${fitSize.width}px`, height: `${fitSize.height}px` }}
      className="relative shrink-0 overflow-hidden rounded-lg border border-border/50 shadow-2xl"
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={image}
          src={image}
          alt={alt}
          width={mediaWidth}
          height={mediaHeight}
          draggable={false}
          initial={moving ? { opacity: 0, scale: 1.03, filter: "blur(6px) saturate(.7)" } : false}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px) saturate(1)" }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 h-full w-full select-none object-contain"
        />
      </AnimatePresence>

      {compareImage && compareSplit !== undefined && (
        <>
          <img
            src={compareImage}
            alt={`${alt} comparison`}
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
          />
          <div
            aria-hidden
            style={{ left: `${compareSplit}%` }}
            className="atlas-divider pointer-events-none absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-accent shadow-[0_0_12px_var(--accent)]"
          >
            <div className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-accent bg-background/90 text-accent shadow-lg">
              <Columns2 className="h-3.5 w-3.5" />
            </div>
          </div>
          {compareLabelLeft && (
            <span className="pointer-events-none absolute left-3 top-24 z-10 rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent backdrop-blur">
              {compareLabelLeft}
            </span>
          )}
          {compareLabelRight && (
            <span className="pointer-events-none absolute right-3 top-24 z-10 rounded bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground backdrop-blur">
              {compareLabelRight}
            </span>
          )}
          {onCompareSplitChange && (
            <input
              type="range"
              min={5}
              max={95}
              value={compareSplit}
              aria-label="Compare era split"
              onChange={(e) => onCompareSplitChange(Number(e.target.value))}
              className="absolute inset-x-6 bottom-24 z-20 cursor-ew-resize accent-[var(--accent)]"
            />
          )}
        </>
      )}

      {showFx && moving && (
        <div className="atlas-clouds pointer-events-none absolute inset-0" aria-hidden />
      )}
      <AtlasFxLayer fx={fx} active={showFx && moving} />
      <div className="atlas-vignette pointer-events-none absolute inset-0" aria-hidden />

      {showLabels && routes && routes.length > 0 && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
        >
          {routes.map(([aId, bId]) => {
            const a = pinMap.get(aId);
            const b = pinMap.get(bId);
            if (!a || !b) return null;
            const highlighted = active === a.id || active === b.id;
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2 - 4;
            return (
              <path
                key={`${a.id}-${b.id}`}
                d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={highlighted ? 0.45 : 0.25}
                strokeOpacity={highlighted ? 0.9 : 0.4}
                strokeDasharray="1.4 1.2"
                className={moving ? "atlas-route-line" : ""}
              />
            );
          })}
        </svg>
      )}

      {pins.map((l, i) => {
        const isActive = active === l.id;
        return (
          <motion.button
            key={l.id}
            id={`atlas-pin-${l.id}`}
            type="button"
            onClick={() => onPin(l.id)}
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
            initial={moving ? { opacity: 0, y: -12, scale: 0.7 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.04, type: "spring", stiffness: 260, damping: 18 }}
            className="atlas-pin group absolute z-10 -translate-x-1/2 -translate-y-1/2"
            aria-label={l.name}
          >
            <span
              className={`pointer-events-none absolute -inset-2 rounded-full border border-primary/50 ${
                moving && isActive ? "animate-ping" : ""
              }`}
            />
            <span
              className={`relative grid h-7 w-7 place-items-center rounded-full border-2 border-primary bg-background/85 text-primary shadow-[0_0_16px_var(--primary)] transition ${
                isActive ? "scale-125 bg-primary text-primary-foreground" : "group-hover:scale-110"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
            </span>
            {showLabels && (
              <span className="atlas-label pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground">
                {l.name}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function ModeSwitch({ mode, setMode }: { mode: AtlasMode; setMode: (m: AtlasMode) => void }) {
  const opts: { id: AtlasMode; label: string; icon: React.ReactNode }[] = [
    { id: "illustrated", label: "Scenic", icon: <Mountain className="h-3.5 w-3.5" /> },
    { id: "top", label: "Top view", icon: <MapIcon className="h-3.5 w-3.5" /> },
    { id: "sim", label: "Simulate", icon: <Film className="h-3.5 w-3.5" /> },
  ];
  return (
    <div
      className="flex gap-1 rounded-full border border-border bg-background/65 p-1 backdrop-blur"
      role="tablist"
      aria-label="Map view"
    >
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={mode === o.id}
          onClick={() => setMode(o.id)}
          className={`relative flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${mode === o.id ? "text-primary-foreground" : "text-muted-foreground"}`}
        >
          {mode === o.id && (
            <motion.span
              layoutId="atlas-mode"
              className="absolute inset-0 rounded-full bg-primary"
            />
          )}
          <span className="relative flex items-center gap-1.5">
            {o.icon}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

function QuickRealmBar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Jump to realm"
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-20 flex items-center gap-1.5 overflow-x-auto rounded-full border border-border/80 bg-background/80 p-1 backdrop-blur-md sm:inset-x-auto sm:left-4 sm:max-w-[calc(100vw-28rem)]"
    >
      <button
        type="button"
        onClick={() => onSelect("world")}
        className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
          activeId === "world"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        World
      </button>
      {ATLAS.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onSelect(l.id)}
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
            activeId === l.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {l.name}
        </button>
      ))}
    </nav>
  );
}

function LocationView({
  loc,
  onClose,
  onWorld,
  onSelectRealm,
  initialMode,
}: {
  loc: AtlasLocation;
  onClose: () => void;
  onWorld: () => void;
  onSelectRealm: (id: string) => void;
  initialMode?: AtlasMode | undefined;
}) {
  const moving = useNexusMotion();
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const viewport = useContainerSize(stageContainerRef);

  const [mode, setMode] = useState<AtlasMode>(initialMode ?? "illustrated");
  const [eraId, setEraId] = useState(loc.eras[loc.eras.length - 1]!.id);
  const [pin, setPin] = useState<string | null>(null);
  const [info, setInfo] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showFx, setShowFx] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSplit, setCompareSplit] = useState(50);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setEraId(loc.eras[loc.eras.length - 1]!.id);
    setPin(null);
    setCompareMode(false);
  }, [loc]);

  useEffect(() => {
    setPin(null);
    if (mode !== "illustrated") setCompareMode(false);
  }, [eraId, mode]);

  const era = loc.eras.find((e) => e.id === eraId) ?? loc.eras[loc.eras.length - 1]!;
  const activeImage = mode === "top" ? loc.top.image : era.image;
  const mediaWidth = mode === "top" ? loc.top.width : era.width;
  const mediaHeight = mode === "top" ? loc.top.height : era.height;
  const fitSize = computeFitDimensions(viewport.w, viewport.h, mediaWidth, mediaHeight);

  const pins = mode === "top" ? loc.top.landmarks : era.landmarks;
  const routes = mode === "top" ? loc.top.routes : era.routes;
  const mark = pins.find((l) => l.id === pin);
  const canCompare = mode === "illustrated" && loc.eras.length > 1;
  const compareBaseEra = loc.eras[0]!;
  const compareTargetEra = era.id === compareBaseEra.id ? loc.eras[loc.eras.length - 1]! : era;

  const focusLandmark = (id: string) => {
    setPin(id);
    setInfo(true);
    const ref = transformRef.current;
    if (ref?.zoomToElement) {
      try {
        ref.zoomToElement(`atlas-pin-${id}`, 2.1, 450, "easeOut");
      } catch {
        /* ignore in headless test environments */
      }
    }
  };

  const stepLandmark = (delta: number) => {
    if (pins.length === 0) return;
    const idx = pin ? pins.findIndex((p) => p.id === pin) : -1;
    const nextIdx = (idx + delta + pins.length) % pins.length;
    focusLandmark(pins[nextIdx]!.id);
  };

  return (
    <div ref={stageContainerRef} className="absolute inset-0 overflow-hidden bg-background">
      {/* Ambient blurred fill matching the active map so margins never feel stark */}
      <img
        src={activeImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl"
      />

      {mode === "sim" ? (
        <AtlasSimulation loc={loc} />
      ) : (
        <TransformWrapper
          ref={transformRef}
          key={`${loc.id}-${mode}-${mediaWidth}x${mediaHeight}`}
          panning={{ excluded: ["atlas-pin"] }}
          minScale={1}
          maxScale={5}
          initialScale={1}
          centerOnInit
          limitToBounds
          doubleClick={{ mode: "zoomIn" }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperClass="!h-full !w-full"
                contentClass="!h-full !w-full flex items-center justify-center"
              >
                <MapSurface
                  image={compareMode ? compareTargetEra.image : activeImage}
                  compareImage={compareMode ? compareBaseEra.image : undefined}
                  compareLabelLeft={compareMode ? compareBaseEra.label : undefined}
                  compareLabelRight={compareMode ? compareTargetEra.label : undefined}
                  compareSplit={compareMode ? compareSplit : undefined}
                  onCompareSplitChange={compareMode ? setCompareSplit : undefined}
                  alt={`${loc.name} — ${mode === "top" ? "top view" : era.label} map`}
                  mediaWidth={mediaWidth}
                  mediaHeight={mediaHeight}
                  fitSize={fitSize}
                  fx={mode === "top" ? ["mist"] : era.fx}
                  pins={pins}
                  routes={routes}
                  active={pin}
                  onPin={focusLandmark}
                  showLabels={showLabels}
                  showFx={showFx}
                  moving={moving}
                  onHoverCoords={setCoords}
                />
              </TransformComponent>
              <Controls
                zoomIn={() => zoomIn()}
                zoomOut={() => zoomOut()}
                reset={() => resetTransform()}
              />
              <Compass coords={coords} />
            </>
          )}
        </TransformWrapper>
      )}

      {/* Top HUD Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background via-background/75 to-transparent p-3 pb-10 sm:p-4 sm:pb-12">
        <div className="pointer-events-auto flex items-start gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] uppercase tracking-[0.28em] text-accent">
              {loc.epithet}
            </p>
            <h2 className="truncate text-xl font-medium glow-text sm:text-2xl">{loc.name}</h2>
          </div>

          {mode !== "sim" && (
            <div className="flex items-center gap-1.5">
              {canCompare && (
                <button
                  type="button"
                  onClick={() => setCompareMode((v) => !v)}
                  aria-pressed={compareMode}
                  title="Compare historical and present eras"
                  className={`flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs backdrop-blur transition ${
                    compareMode
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-background/75 text-foreground hover:border-primary"
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compare</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFx((v) => !v)}
                aria-pressed={showFx}
                aria-label={showFx ? "Hide atmosphere" : "Show atmosphere"}
                title="Toggle atmosphere FX"
                className={`grid h-9 w-9 place-items-center rounded-full border backdrop-blur transition ${
                  showFx
                    ? "border-primary/60 bg-background/75 text-primary"
                    : "border-border bg-background/75 text-muted-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowLabels((v) => !v)}
                aria-pressed={showLabels}
                aria-label={showLabels ? "Hide labels" : "Show labels"}
                title="Toggle pin labels and routes"
                className={`grid h-9 w-9 place-items-center rounded-full border backdrop-blur transition ${
                  showLabels
                    ? "border-primary/60 bg-background/75 text-primary"
                    : "border-border bg-background/75 text-muted-foreground"
                }`}
              >
                {showLabels ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onWorld}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background/75 backdrop-blur hover:border-primary"
            aria-label="World map"
          >
            <Globe2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background/75 backdrop-blur hover:border-primary"
            aria-label="Close map"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="pointer-events-auto mt-2.5 flex flex-wrap items-center gap-2">
          <div className="min-w-[230px] flex-1 sm:max-w-sm">
            <ModeSwitch mode={mode} setMode={setMode} />
          </div>
          {mode === "illustrated" && loc.eras.length > 1 && (
            <div
              className="flex gap-1 overflow-x-auto rounded-full border border-border bg-background/65 p-1 backdrop-blur"
              aria-label="Era"
              role="tablist"
            >
              {loc.eras.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  role="tab"
                  aria-selected={e.id === era.id}
                  onClick={() => setEraId(e.id)}
                  className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${e.id === era.id ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {e.id === era.id && (
                    <motion.span
                      layoutId="atlas-era"
                      className="absolute inset-0 rounded-full bg-accent"
                    />
                  )}
                  <span className="relative">{e.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Realm Quick Switcher */}
      {mode !== "sim" && <QuickRealmBar activeId={loc.id} onSelect={onSelectRealm} />}

      {/* Landmark Tour & Overview Card */}
      {mode !== "sim" && (
        <>
          {!info && (
            <button
              type="button"
              onClick={() => setInfo(true)}
              className="absolute bottom-16 right-16 z-20 flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-2 text-xs backdrop-blur sm:bottom-3"
            >
              <Navigation className="h-3.5 w-3.5 text-accent" />
              Dossier & Tour
            </button>
          )}
          <AnimatePresence>
            {info && (
              <motion.div
                key={(mark?.id ?? era.id) + mode}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 24, opacity: 0 }}
                className="absolute inset-x-3 bottom-16 z-20 rounded-2xl border border-border bg-background/85 p-3.5 backdrop-blur-md sm:bottom-3 sm:left-auto sm:w-96"
              >
                <div className="flex items-center justify-between gap-2 pr-6">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-accent">
                    {mark ? "Landmark" : mode === "top" ? `Top view · ${loc.top.era}` : era.label}
                  </p>
                  {pins.length > 0 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => stepLandmark(-1)}
                        aria-label="Previous landmark"
                        className="grid h-6 w-6 place-items-center rounded border border-border/80 bg-background/60 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => stepLandmark(1)}
                        aria-label="Next landmark"
                        className="grid h-6 w-6 place-items-center rounded border border-border/80 bg-background/60 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="mt-1 text-base font-medium">
                  {mark?.name ?? `${loc.name} overview`}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {mark?.note ?? era.summary}
                </p>
                {mark && (mark.characters?.length || mark.faction) && (
                  <p className="mt-2 text-[11px] text-foreground/85">
                    {[
                      mark.faction ? `Faction: ${mark.faction}` : null,
                      mark.characters?.length ? `Figures: ${mark.characters.join(", ")}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {!mark && pins.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {pins.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => focusLandmark(p.id)}
                        className="rounded border border-border/80 bg-background/60 px-2 py-0.5 text-[10px] text-foreground/90 transition hover:border-accent hover:text-accent"
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setInfo(false);
                    setPin(null);
                  }}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  aria-label="Hide details"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function WorldView({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const moving = useNexusMotion();
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const viewport = useContainerSize(stageContainerRef);
  const [top, setTop] = useState(true);
  const [hoveredRealm, setHoveredRealm] = useState<string | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  const fitSize = computeFitDimensions(
    viewport.w,
    viewport.h,
    WORLD_IMAGE_WIDTH,
    WORLD_IMAGE_HEIGHT,
  );
  const realmMap = new Map(ATLAS.map((l) => [l.id, l]));
  const worldImg = top ? WORLD_TOP : WORLD_MAP;

  return (
    <div ref={stageContainerRef} className="absolute inset-0 overflow-hidden bg-background">
      <img
        src={worldImg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-2xl"
      />
      <TransformWrapper
        key={String(top)}
        panning={{ excluded: ["atlas-pin"] }}
        minScale={1}
        maxScale={4}
        centerOnInit
        limitToBounds
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent
              wrapperClass="!h-full !w-full"
              contentClass="!h-full !w-full flex items-center justify-center"
            >
              <div
                data-testid="atlas-fit-stage"
                style={{ width: `${fitSize.width}px`, height: `${fitSize.height}px` }}
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (!rect.width || !rect.height) return;
                  setCoords({
                    x: Math.max(
                      0,
                      Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)),
                    ),
                    y: Math.max(
                      0,
                      Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)),
                    ),
                  });
                }}
                onPointerLeave={() => setCoords(null)}
                className="relative shrink-0 overflow-hidden rounded-lg border border-border/50 shadow-2xl"
              >
                <img
                  src={worldImg}
                  alt="World map of all regions"
                  width={WORLD_IMAGE_WIDTH}
                  height={WORLD_IMAGE_HEIGHT}
                  draggable={false}
                  className="absolute inset-0 h-full w-full select-none object-contain"
                />
                {moving && (
                  <div className="atlas-clouds pointer-events-none absolute inset-0" aria-hidden />
                )}
                <AtlasFxLayer fx={["mist", "fireflies"]} active={moving} />
                <div className="atlas-vignette pointer-events-none absolute inset-0" aria-hidden />

                {showRoutes && (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
                  >
                    {ATLAS_WORLD_ROUTES.map((r) => {
                      const a = realmMap.get(r.from);
                      const b = realmMap.get(r.to);
                      if (!a || !b) return null;
                      const lit = hoveredRealm === a.id || hoveredRealm === b.id;
                      const mx = (a.worldX + b.worldX) / 2;
                      const my = (a.worldY + b.worldY) / 2 - 4;
                      return (
                        <path
                          key={`${r.from}-${r.to}`}
                          d={`M ${a.worldX} ${a.worldY} Q ${mx} ${my} ${b.worldX} ${b.worldY}`}
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth={lit ? 0.55 : 0.25}
                          strokeOpacity={lit ? 0.95 : 0.35}
                          strokeDasharray="1.5 1.2"
                          className={moving ? "atlas-route-line" : ""}
                        />
                      );
                    })}
                  </svg>
                )}

                {ATLAS.map((l, i) => (
                  <motion.button
                    key={l.id}
                    type="button"
                    onClick={() => onPick(l.id)}
                    onMouseEnter={() => setHoveredRealm(l.id)}
                    onMouseLeave={() => setHoveredRealm(null)}
                    style={{ left: `${l.worldX}%`, top: `${l.worldY}%` }}
                    initial={moving ? { opacity: 0, scale: 0.75 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.06 }}
                    className="atlas-pin group absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  >
                    <span className="atlas-banner block whitespace-nowrap px-2.5 py-1 text-[11px] font-medium text-foreground transition group-hover:scale-105 group-hover:border-accent group-hover:text-accent">
                      {l.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </TransformComponent>
            <Controls
              zoomIn={() => zoomIn()}
              zoomOut={() => zoomOut()}
              reset={() => resetTransform()}
            />
            <Compass coords={coords} />
          </>
        )}
      </TransformWrapper>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background via-background/75 to-transparent p-4 pb-12">
        <div className="pointer-events-auto flex items-start gap-2.5">
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent">
              {ATLAS.length} Realms · Interconnected Chronicles
            </p>
            <h2 className="text-2xl font-medium glow-text">World Atlas</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowRoutes((v) => !v)}
            aria-pressed={showRoutes}
            className="rounded-full border border-border bg-background/75 px-3 py-2 text-xs backdrop-blur hover:border-primary"
          >
            {showRoutes ? "Routes On" : "Routes Off"}
          </button>
          <button
            type="button"
            onClick={() => setTop((t) => !t)}
            className="rounded-full border border-border bg-background/75 px-3 py-2 text-xs backdrop-blur hover:border-primary"
          >
            {top ? "Scenic" : "Top view"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-background/75 backdrop-blur hover:border-primary"
            aria-label="Close map"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <QuickRealmBar activeId="world" onSelect={onPick} />
    </div>
  );
}

/** Full-screen map overlay: world view or a single location. */
export function AtlasOverlay({
  start,
  mode,
  onClose,
}: {
  start: string;
  mode?: AtlasMode | undefined;
  onClose: () => void;
}) {
  const [view, setView] = useState(start);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);
  const loc = ATLAS.find((l) => l.id === view);
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal
      aria-label="Map"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] overflow-hidden bg-background"
      style={{ maxWidth: "none", maxHeight: "none" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.96, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {loc ? (
            <LocationView
              loc={loc}
              initialMode={mode}
              onClose={onClose}
              onWorld={() => setView("world")}
              onSelectRealm={setView}
            />
          ) : (
            <WorldView onPick={setView} onClose={onClose} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}

/** Nexus atlas launcher: pick the world map or any location map. */
export function NexusAtlas() {
  const [open, setOpen] = useState<string | null>(null);
  const cards = [
    {
      id: "world",
      name: "World Atlas",
      epithet: "All 8 realms & routes",
      eraSummary: "Scenic & Top View",
      image: WORLD_MAP,
      width: WORLD_IMAGE_WIDTH,
      height: WORLD_IMAGE_HEIGHT,
    },
    ...ATLAS.map((l) => {
      const latest = l.eras[l.eras.length - 1]!;
      return {
        id: l.id,
        name: l.name,
        epithet: l.epithet,
        eraSummary: l.eras.map((e) => e.label).join(" · "),
        image: latest.image,
        width: latest.width,
        height: latest.height,
      };
    }),
  ];
  return (
    <section aria-label="Atlas">
      <Link
        to="/atlas"
        className="mb-3 flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3 text-sm hover:border-primary"
      >
        <span>
          <span className="block text-[10px] uppercase tracking-[0.25em] text-accent">
            Full section · {ATLAS.length} Realms
          </span>
          Open the World Atlas page
        </span>
        <ArrowRight className="h-4 w-4 text-primary" />
      </Link>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => (
          <motion.button
            key={c.id}
            type="button"
            onClick={() => setOpen(c.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/50 text-left transition hover:border-primary"
          >
            <div className="relative h-48 w-full overflow-hidden bg-background/80">
              <img
                src={c.image}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-lg"
              />
              <img
                src={c.image}
                alt={`${c.name} map preview`}
                loading="lazy"
                width={c.width}
                height={c.height}
                className="relative h-full w-full object-contain transition duration-700 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
            </div>
            <div className="p-3.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-accent">{c.eraSummary}</p>
              <p className="mt-0.5 text-base font-medium">{c.name}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.epithet}</p>
            </div>
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {open && <AtlasOverlay start={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </section>
  );
}
