import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Zap,
  Sparkles,
  ShieldAlert,
  Compass,
  Cpu,
  Layers,
  Search,
  Maximize2,
  Volume2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Gauge,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/integrations/supabase/types";
import { artFor, artUrl, type ArsenalArt, type ArsenalForm } from "@/lib/arsenal-art";
import { ArsenalEmblem } from "@/components/arsenal-emblem";
import { sfx } from "@/lib/scu-audio";

type Artifact = Tables<"artifacts">;

export type ElementBoosterType =
  "auto" | "flame" | "lightning" | "void" | "aether" | "frost" | "curse" | "cyber";

const BOOSTER_CONFIGS: Record<
  Exclude<ElementBoosterType, "auto">,
  { label: string; hue: number; icon: typeof Flame; glow: string; desc: string }
> = {
  flame: {
    label: "Pyre Overdrive",
    hue: 24,
    icon: Flame,
    glow: "rgba(255, 100, 20, 0.8)",
    desc: "Superheated thermal jetstreams and volatile dragon embers.",
  },
  lightning: {
    label: "Plasma Surge",
    hue: 195,
    icon: Zap,
    glow: "rgba(56, 189, 248, 0.9)",
    desc: "High-frequency Astrapo electric discharge and coronal arcs.",
  },
  void: {
    label: "Void Singularity",
    hue: 270,
    icon: Compass,
    glow: "rgba(168, 85, 247, 0.85)",
    desc: "Gravitational lensing horizon, tearing local spacetime.",
  },
  aether: {
    label: "Aether Celestial",
    hue: 48,
    icon: Sparkles,
    glow: "rgba(250, 204, 21, 0.9)",
    desc: "Sacred starlight geometry and radiant cosmic harmonics.",
  },
  frost: {
    label: "Absolute Zero",
    hue: 180,
    icon: Layers,
    glow: "rgba(103, 232, 249, 0.85)",
    desc: "Sub-zero crystalline fractals and flash-freeze shock aura.",
  },
  curse: {
    label: "Blood Curse",
    hue: 350,
    icon: ShieldAlert,
    glow: "rgba(239, 68, 68, 0.9)",
    desc: "Unstable demonic bloodline corruption and crimson hexes.",
  },
  cyber: {
    label: "Nanotech Matrix",
    hue: 160,
    icon: Cpu,
    glow: "rgba(52, 211, 153, 0.9)",
    desc: "Quantum telemetry scanning grid and hyper-conductive lattices.",
  },
};

/** High-speed canvas-based elemental particle booster behind isolated weapon */
function ElementalBoosterCanvas({
  element,
  intensity = 1,
  fps = 60,
  boostActive = false,
  hueOverride,
}: {
  element: Exclude<ElementBoosterType, "auto">;
  intensity?: number;
  fps?: number;
  boostActive?: boolean;
  hueOverride?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let running = true;
    const cfg = BOOSTER_CONFIGS[element];
    const hue = hueOverride ?? cfg.hue;

    const resize = () => {
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.max(1, rect.width * dpr);
      c.height = Math.max(1, rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return rect;
    };

    let rect = resize();
    const ro = new ResizeObserver(() => {
      rect = resize();
    });
    ro.observe(c);

    // Particle pool
    const particleCount = Math.floor((boostActive ? 80 : 45) * intensity);
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      angle: (i / particleCount) * Math.PI * 2,
      dist: 20 + Math.random() * 120,
      speed: (0.4 + Math.random() * 1.8) * (boostActive ? 2.4 : 1),
      size: 1 + Math.random() * 3.5,
      life: Math.random(),
      lifeSpeed: 0.008 + Math.random() * 0.02,
      seed: Math.random() * 100,
    }));

    const draw = (ms: number) => {
      const t = ms / 1000;
      const w = rect.width;
      const h = rect.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const m = Math.min(w, h);

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // Center booster aura
      const basePulse = 0.5 + 0.5 * Math.sin(t * 3.5);
      const rad = (m * 0.28 + (boostActive ? 30 : 0)) * intensity;
      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      radGrad.addColorStop(
        0,
        `hsla(${hue}, 95%, ${boostActive ? "75%" : "60%"}, ${boostActive ? 0.65 : 0.4})`,
      );
      radGrad.addColorStop(0.4, `hsla(${hue}, 85%, 45%, ${boostActive ? 0.3 : 0.15})`);
      radGrad.addColorStop(1, `hsla(${hue}, 85%, 20%, 0)`);
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      // Rotating sacred / technological booster circles
      const ringCount = boostActive ? 3 : 2;
      for (let rIdx = 0; rIdx < ringCount; rIdx++) {
        const dir = rIdx % 2 === 0 ? 1 : -1;
        const ringRad = m * (0.22 + rIdx * 0.09) * (1 + basePulse * 0.04);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 0.8 * dir + rIdx);

        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.25 + (boostActive ? 0.35 : 0)})`;
        ctx.lineWidth = boostActive ? 2 : 1.2;
        ctx.setLineDash(rIdx === 0 ? [8, 12] : [4, 6, 14, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, ringRad, 0, Math.PI * 2);
        ctx.stroke();

        // Node points on ring
        const nodes = 4 + rIdx * 2;
        for (let n = 0; n < nodes; n++) {
          const a = (n / nodes) * Math.PI * 2;
          const nx = Math.cos(a) * ringRad;
          const ny = Math.sin(a) * ringRad;
          ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${boostActive ? 0.9 : 0.6})`;
          ctx.beginPath();
          ctx.arc(nx, ny, boostActive ? 3.5 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Element-specific animations
      if (element === "lightning") {
        // High voltage electric discharge arcs
        const arcCount = boostActive ? 8 : 4;
        for (let i = 0; i < arcCount; i++) {
          const startAngle = (i / arcCount) * Math.PI * 2 + Math.sin(t * 4 + i) * 0.4;
          let px = cx + Math.cos(startAngle) * 30;
          let py = cy + Math.sin(startAngle) * 30;
          ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${0.7 + Math.random() * 0.3})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(px, py);
          const steps = 7;
          for (let s = 0; s < steps; s++) {
            const stepLen = (m * 0.35) / steps;
            const deviation = (Math.random() - 0.5) * 45;
            px += Math.cos(startAngle) * stepLen - Math.sin(startAngle) * deviation;
            py += Math.sin(startAngle) * stepLen + Math.cos(startAngle) * deviation;
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      } else if (element === "flame") {
        // Flame tongue eruption
        const flameSpirals = boostActive ? 12 : 6;
        for (let f = 0; f < flameSpirals; f++) {
          const fAngle = t * 1.5 + (f / flameSpirals) * Math.PI * 2;
          const fDist = m * (0.15 + 0.22 * Math.sin(t * 3 + f));
          const fx = cx + Math.cos(fAngle) * fDist;
          const fy = cy + Math.sin(fAngle) * (fDist * 0.8) - Math.abs(Math.sin(t * 4 + f)) * 30;
          const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 25);
          g.addColorStop(0, `hsla(${hue + (f % 2 ? 20 : -10)}, 100%, 65%, 0.8)`);
          g.addColorStop(1, `hsla(${hue}, 90%, 35%, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(fx, fy, 25, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Dynamic Particles
      for (const p of particles) {
        p.life += p.lifeSpeed;
        if (p.life > 1) {
          p.life = 0;
          p.dist = 10 + Math.random() * 40;
          p.angle = Math.random() * Math.PI * 2;
        }
        p.dist += p.speed * (boostActive ? 3.5 : 1.5);
        p.angle += 0.015 * (boostActive ? 2 : 1);

        const px = cx + Math.cos(p.angle) * p.dist;
        const py = cy + Math.sin(p.angle) * p.dist;
        const alpha = Math.sin(p.life * Math.PI) * (boostActive ? 0.95 : 0.7);

        ctx.fillStyle = `hsla(${hue + (p.seed % 20) - 10}, 100%, 75%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size * (boostActive ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (ms: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (ms - last < 1000 / fps) return;
      last = ms;
      draw(ms);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [element, intensity, fps, boostActive, hueOverride]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}

/** Detects optimal element from artifact attributes */
function resolveElementForArtifact(
  a: Artifact,
  art: ArsenalArt,
): Exclude<ElementBoosterType, "auto"> {
  const text =
    `${a.name} ${a.weapon_type ?? ""} ${a.lore ?? ""} ${a.how_it_works ?? ""}`.toLowerCase();
  if (/curse|kara yazgi|blood|demonic|dark/.test(text) || a.curse_level > 0) return "curse";
  if (/lightning|electric|astrapo|voltage|plasma|thunder/.test(text)) return "lightning";
  if (/flame|fire|pyre|draconic|burn|inferno/.test(text)) return "flame";
  if (/void|cube|rift|abyss|space|gravity/.test(text)) return "void";
  if (/aether|celestial|sacred|divine|clover|starlight|light/.test(text)) return "aether";
  if (/ice|frost|cryo|glacier|snow/.test(text)) return "frost";
  if (/nano|suit|drone|chip|probes|tech|cyber/.test(text)) return "cyber";

  if (art.hue >= 180 && art.hue <= 220) return "lightning";
  if (art.hue >= 10 && art.hue <= 45) return "flame";
  if (art.hue >= 260 && art.hue <= 310) return "void";
  return "aether";
}

export function ArsenalIsolatedView({
  artifacts,
  onSelectArtifact,
}: {
  artifacts: Artifact[];
  onSelectArtifact?: (a: Artifact) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [formIdx, setFormIdx] = useState(0);
  const [boosterType, setBoosterType] = useState<ElementBoosterType>("auto");
  const [boostSurge, setBoostSurge] = useState(false);
  const [boostLevel, setBoostLevel] = useState<1 | 1.5 | 2 | 2.5>(1.5);
  const [fps, setFps] = useState<24 | 30 | 60>(60);
  const [search, setSearch] = useState("");
  const [rotationActive, setRotationActive] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return artifacts;
    return artifacts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.weapon_type ?? "").toLowerCase().includes(q) ||
        (a.wielders ?? []).some((w) => w.toLowerCase().includes(q)),
    );
  }, [artifacts, search]);

  const current = filtered[selectedIdx] ?? filtered[0] ?? artifacts[0];
  const art = useMemo(
    () => (current ? artFor(current.name, current.weapon_type, current.category) : null),
    [current],
  );

  const activeForm: ArsenalForm | undefined = art?.forms[formIdx] ?? art?.forms[0];
  const autoElement = useMemo(
    () => (current && art ? resolveElementForArtifact(current, art) : "aether"),
    [current, art],
  );
  const activeElement = boosterType === "auto" ? autoElement : boosterType;
  const cfg = BOOSTER_CONFIGS[activeElement];

  // Sound and visual surge trigger
  const triggerOverdrive = () => {
    sfx.whoosh();
    setBoostSurge(true);
    setTimeout(() => setBoostSurge(false), 2400);
  };

  const nextItem = () => {
    setSelectedIdx((prev) => (prev + 1) % filtered.length);
    setFormIdx(0);
    sfx.click();
  };

  const prevItem = () => {
    setSelectedIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
    setFormIdx(0);
    sfx.click();
  };

  // Cursor 3D tilt tracking for isolated item
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: nx * 18, y: -ny * 18 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  const imgUrl = activeForm ? artUrl(activeForm.art) : undefined;

  return (
    <div className="relative grid gap-6 pb-20">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-nexus-glow/20 bg-background/80 p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gauge className="size-4 text-nexus-glow" />
            <span>Booster Mode:</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {(
              [
                ["auto", "Auto Resonance"],
                ["flame", "Pyre"],
                ["lightning", "Plasma"],
                ["void", "Void"],
                ["aether", "Aether"],
                ["frost", "Cryo"],
                ["curse", "Curse"],
                ["cyber", "Nanotech"],
              ] as const
            ).map(([key, label]) => {
              const active = boosterType === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setBoosterType(key);
                    sfx.click();
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "border border-nexus-glow bg-nexus-glow/20 text-nexus-fg shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                      : "border border-border bg-card/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Surge and Tuning Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={triggerOverdrive}
            className={`font-semibold transition-all ${
              boostSurge
                ? "scale-105 border-amber-400 bg-amber-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.8)]"
                : "bg-red-600 text-white hover:bg-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
            }`}
          >
            <Sparkles className="mr-1.5 size-4 animate-spin" />
            {boostSurge ? "SURGE ACTIVE" : "IGNITE BOOSTER BURST"}
          </Button>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1 text-xs">
            <span className="px-1 text-muted-foreground">Power:</span>
            {([1, 1.5, 2, 2.5] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setBoostLevel(lvl)}
                className={`rounded px-1.5 py-0.5 font-mono ${
                  boostLevel === lvl
                    ? "bg-accent text-accent-foreground font-bold"
                    : "text-muted-foreground"
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1 text-xs">
            <span className="px-1 text-muted-foreground">FPS:</span>
            {([24, 30, 60] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFps(f)}
                className={`rounded px-1.5 py-0.5 font-mono ${
                  fps === f ? "bg-accent text-accent-foreground font-bold" : "text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Isolated Weapon Stage - Zero Background Box! */}
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative flex min-h-[520px] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-radial from-zinc-950 via-zinc-950/95 to-black p-6 select-none sm:p-10"
      >
        {/* Background Grid & Spatial Telemetry */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Elemental Booster Canvas Field */}
        <ElementalBoosterCanvas
          element={activeElement}
          intensity={boostLevel}
          fps={fps}
          boostActive={boostSurge}
          {...(art?.hue !== undefined ? { hueOverride: art.hue } : {})}
        />

        {/* Overdrive Shockwave Ring on Burst */}
        <AnimatePresence>
          {boostSurge && (
            <motion.div
              initial={{ scale: 0.2, opacity: 1 }}
              animate={{ scale: 2.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="pointer-events-none absolute rounded-full border-2 border-accent"
              style={{
                width: "340px",
                height: "340px",
                boxShadow: `0 0 50px ${cfg.glow}, inset 0 0 50px ${cfg.glow}`,
              }}
            />
          )}
        </AnimatePresence>

        {/* Orbiting Rotating HUD Crests */}
        <div
          className={`pointer-events-none absolute size-80 rounded-full border border-dashed opacity-30 ${
            rotationActive ? "nexus-orbit-cw" : ""
          }`}
          style={{
            borderColor: `hsl(${art?.hue ?? cfg.hue} 80% 60%)`,
            boxShadow: `0 0 40px hsla(${art?.hue ?? cfg.hue}, 80%, 50%, 0.2)`,
          }}
        />
        <div
          className={`pointer-events-none absolute size-[460px] rounded-full border border-dotted opacity-20 ${
            rotationActive ? "nexus-orbit-ccw" : ""
          }`}
          style={{
            borderColor: `hsl(${art?.hue ?? cfg.hue} 70% 50%)`,
          }}
        />

        {/* Navigation Arrows for Quick Weapon Swapping */}
        <button
          onClick={prevItem}
          className="group absolute left-4 z-20 flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur transition hover:border-nexus-glow hover:bg-black/90 hover:scale-110 sm:left-8"
          aria-label="Previous weapon"
        >
          <ChevronLeft className="size-6 transition group-hover:-translate-x-0.5" />
        </button>

        <button
          onClick={nextItem}
          className="group absolute right-4 z-20 flex size-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur transition hover:border-nexus-glow hover:bg-black/90 hover:scale-110 sm:right-8"
          aria-label="Next weapon"
        >
          <ChevronRight className="size-6 transition group-hover:translate-x-0.5" />
        </button>

        {/* Pure Floating Weapon / Relic Object */}
        {current && (
          <div
            className="relative z-10 flex flex-col items-center justify-center transition-transform duration-150 ease-out"
            style={{
              transform: `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
            }}
          >
            <div
              className={`relative flex items-center justify-center ${rotationActive ? "arsenal-isolated-obj" : ""}`}
            >
              {imgUrl ? (
                <div className="relative max-h-[380px] max-w-[380px] sm:max-h-[440px] sm:max-w-[440px]">
                  {/* High contrast screen-blended image: eliminates black bounding box! */}
                  <img
                    src={imgUrl}
                    alt={current.name}
                    className={`h-full w-full object-contain arsenal-isolated-weapon-img ${
                      boostSurge ? "arsenal-booster-active" : ""
                    }`}
                    style={{
                      maxHeight: "420px",
                      filter: `drop-shadow(0 0 ${boostSurge ? "35px" : "18px"} ${cfg.glow}) contrast(1.18) brightness(${
                        boostSurge ? 1.3 : 1.05
                      })`,
                    }}
                  />
                </div>
              ) : (
                /* Emblem representation for weapons without photographic assets */
                <div className="flex size-72 items-center justify-center">
                  <ArsenalEmblem
                    glyph={art?.glyph ?? "sword"}
                    hue={art?.hue ?? cfg.hue}
                    nexus
                    animate={rotationActive}
                    className={`size-56 ${boostSurge ? "scale-115" : ""}`}
                  />
                </div>
              )}
            </div>

            {/* Weapon Identity Hologram */}
            <div className="mt-4 flex flex-col items-center text-center">
              <span className="text-xs uppercase tracking-widest text-accent font-mono">
                {current.category.replace("_", " ")} · {current.weapon_type ?? "Artifact"}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl">
                {current.name}
              </h2>

              {current.wielders && current.wielders.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Wielded by:{" "}
                  <span className="text-foreground font-medium">{current.wielders.join(", ")}</span>
                </p>
              )}

              {/* Form tabs if artifact has multiple forms */}
              {art && art.forms.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {art.forms.map((f, n) => (
                    <button
                      key={f.label}
                      onClick={() => {
                        setFormIdx(n);
                        sfx.click();
                      }}
                      className={`rounded-full border px-3 py-0.5 text-xs transition ${
                        n === formIdx
                          ? "border-accent bg-accent/25 text-white shadow-sm"
                          : "border-border bg-black/40 text-muted-foreground hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Status Overlay */}
        <div className="absolute bottom-4 left-6 right-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>BOOSTER: {cfg.label.toUpperCase()}</span>
            <span className="text-zinc-500">|</span>
            <span>HUE: {art?.hue ?? cfg.hue}°</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRotationActive((r) => !r)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
            >
              <RotateCcw className="size-3.5" />
              <span>{rotationActive ? "Motion: ON" : "Motion: FROZEN"}</span>
            </button>
            <span className="text-zinc-500">|</span>
            <span>
              {selectedIdx + 1} / {filtered.length} ARTIFACTS
            </span>
          </div>
        </div>
      </div>

      {/* Quick Isolated Weapons Carousel Grid */}
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
            Relic & Weapon Vault ({filtered.length})
          </h3>
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIdx(0);
              }}
              placeholder="Filter weapons & objects…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {filtered.map((item, idx) => {
            const isSelected = item.id === current?.id;
            const itemArt = artFor(item.name, item.weapon_type, item.category);
            const thumbUrl = itemArt.forms[0]?.art ? artUrl(itemArt.forms[0].art) : null;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedIdx(idx);
                  setFormIdx(0);
                  sfx.click();
                }}
                className={`group relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all ${
                  isSelected
                    ? "border-nexus-glow bg-nexus-glow/15 shadow-[0_0_18px_rgba(56,189,248,0.3)] scale-[1.03]"
                    : "border-border/60 bg-card/40 hover:border-nexus-glow/60 hover:bg-card/70"
                }`}
              >
                <div className="relative flex size-20 items-center justify-center overflow-hidden">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={item.name}
                      className="size-full object-contain arsenal-isolated-weapon-img transition duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <ArsenalEmblem
                      glyph={itemArt.glyph}
                      hue={itemArt.hue}
                      nexus
                      animate={false}
                      className="size-12"
                    />
                  )}
                </div>

                <div className="mt-2 w-full truncate">
                  <p className="truncate text-xs font-semibold text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {item.weapon_type ?? item.category}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
