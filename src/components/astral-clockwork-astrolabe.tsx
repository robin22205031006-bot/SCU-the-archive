import { useId, useMemo, useState, type ReactNode } from "react";
import { Compass, Sparkles } from "lucide-react";
import { useAnimationsEnabled } from "@/lib/animations";
import type { DossierTabDescriptor } from "@/components/dossier-component";
import { AbilityRankPips } from "@/components/ability-rank-pips";

export interface AstrolabeAbilityNode {
  name: string;
  label: string;
  tier?: string | undefined;
  rank?: number | undefined;
}

export interface AstralClockworkAstrolabeProps {
  name: string;
  subtitle?: string | undefined;
  seriesTitle?: string | undefined;
  status?: string | undefined;
  tierLabel?: string | null | undefined;
  tabs: DossierTabDescriptor[];
  activeTab: string;
  onSelectTab?: ((tabId: string, ev: React.MouseEvent<HTMLElement>) => void) | undefined;
  portraitSlot?: ReactNode | undefined;
  badgesSlot?: ReactNode | undefined;
  abilities?: AstrolabeAbilityNode[] | undefined;
  variant?: "fantasy" | "isekai" | undefined;
  compact?: boolean | undefined;
  showTitle?: boolean | undefined;
  className?: string | undefined;
}

const SECTOR_ANGLES = [-54, -18, 18, 54, 90, 126] as const;

/**
 * Ornate inline SVG crest fallback when a character portrait is absent or fails to load.
 * Guarantees zero broken images and clean theme integration.
 */
export function PortraitSvgFallback({
  name,
  variant = "fantasy",
  className = "",
}: {
  name: string;
  variant?: "fantasy" | "isekai";
  className?: string;
}) {
  const monogram = (name.trim()[0] ?? "?").toUpperCase();
  const isFantasy = variant === "fantasy";
  const ringStroke = isFantasy ? "#c5a869" : "var(--genre-gold, #e09f3e)";
  const glowColor = isFantasy ? "#5ce1b8" : "var(--accent, #2dd4bf)";
  const bgSurface = isFantasy ? "#111915" : "var(--card, #161310)";

  return (
    <div
      data-portrait-fallback="svg-crest"
      className={`relative grid h-full w-full place-items-center overflow-hidden ${className}`}
      style={{ backgroundColor: bgSurface }}
    >
      <svg
        viewBox="0 0 160 200"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
      >
        <defs>
          <radialGradient id={`crest-glow-${monogram}`} cx="50%" cy="46%" r="52%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.22" />
            <stop offset="65%" stopColor={ringStroke} stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="160" height="200" fill={`url(#crest-glow-${monogram})`} />
        <circle
          cx="80"
          cy="94"
          r="56"
          stroke={ringStroke}
          strokeOpacity="0.55"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
        <circle cx="80" cy="94" r="44" stroke={glowColor} strokeOpacity="0.45" strokeWidth="1" />
        <polygon
          points="80,26 138,94 80,162 22,94"
          stroke={ringStroke}
          strokeOpacity="0.7"
          strokeWidth="1.2"
        />
        <path
          d="M80 34 L86 88 L140 94 L86 100 L80 154 L74 100 L20 94 L74 88 Z"
          stroke={glowColor}
          strokeOpacity="0.32"
          strokeWidth="0.9"
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center text-center">
        <span
          className="font-display text-4xl font-bold uppercase tracking-wider"
          style={{ color: isFantasy ? "#f5ebe6" : "var(--foreground)" }}
        >
          {monogram}
        </span>
        <span
          className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.26em] opacity-80"
          style={{ color: isFantasy ? "#5ce1b8" : glowColor }}
        >
          ARCHIVED SIGIL
        </span>
      </div>
    </div>
  );
}

function buildGearTeethPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  teeth: number,
): string {
  const step = (Math.PI * 2) / teeth;
  const parts: string[] = [];
  for (let i = 0; i < teeth; i += 1) {
    const a0 = i * step;
    const a1 = a0 + step * 0.24;
    const a2 = a0 + step * 0.5;
    const a3 = a0 + step * 0.74;
    const p0x = cx + Math.cos(a0) * innerR;
    const p0y = cy + Math.sin(a0) * innerR;
    const p1x = cx + Math.cos(a1) * outerR;
    const p1y = cy + Math.sin(a1) * outerR;
    const p2x = cx + Math.cos(a2) * outerR;
    const p2y = cy + Math.sin(a2) * outerR;
    const p3x = cx + Math.cos(a3) * innerR;
    const p3y = cy + Math.sin(a3) * innerR;
    parts.push(
      `${i === 0 ? "M" : "L"}${p0x.toFixed(1)},${p0y.toFixed(1)}`,
      `L${p1x.toFixed(1)},${p1y.toFixed(1)}`,
      `L${p2x.toFixed(1)},${p2y.toFixed(1)}`,
      `L${p3x.toFixed(1)},${p3y.toFixed(1)}`,
    );
  }
  parts.push("Z");
  return parts.join(" ");
}

/**
 * Interactive Astral Clockwork Astrolabe layout component.
 * Features concentric graduated brass/celestial rings, gear-tooth retes,
 * azimuth alidade pointer synced to dossier sections, and safe portrait fallback.
 */
export function AstralClockworkAstrolabe({
  name,
  subtitle = "ASTRAL CHRONOMETER",
  seriesTitle = "MASTER RECORD",
  status = "Active",
  tierLabel,
  tabs,
  activeTab,
  onSelectTab,
  portraitSlot,
  badgesSlot,
  abilities = [],
  variant = "isekai",
  compact = false,
  showTitle = false,
  className = "",
}: AstralClockworkAstrolabeProps) {
  const uid = useId().replace(/:/g, "");
  const animOn = useAnimationsEnabled();
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  const isFantasy = variant === "fantasy";
  const primaryBrass = isFantasy ? "#c5a869" : "var(--genre-gold, #e09f3e)";
  const astralAccent = isFantasy ? "#5ce1b8" : "var(--accent, #2dd4bf)";
  const bezelFill = isFantasy ? "#111915" : "color-mix(in oklab, var(--card) 92%, black)";

  const activeIdx = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab),
  );
  const inspectedIdx =
    hoveredSector !== null
      ? Math.max(
          0,
          tabs.findIndex((t) => t.id === hoveredSector),
        )
      : activeIdx;
  const activeAngle = SECTOR_ANGLES[inspectedIdx % SECTOR_ANGLES.length] ?? 0;
  const azimuthDeg = ((activeAngle + 360) % 360).toString().padStart(3, "0");

  const gearPath = useMemo(() => buildGearTeethPath(180, 180, 152, 160, 32), []);
  const innerGearPath = useMemo(() => buildGearTeethPath(180, 180, 114, 120, 20), []);

  const tickMarks = useMemo(
    () =>
      Array.from({ length: 72 }, (_, idx) => {
        const deg = idx * 5;
        const rad = ((deg - 90) * Math.PI) / 180;
        const major = idx % 6 === 0;
        const r1 = major ? 162 : 167;
        const r2 = 173;
        return {
          deg,
          major,
          x1: 180 + Math.cos(rad) * r1,
          y1: 180 + Math.sin(rad) * r1,
          x2: 180 + Math.cos(rad) * r2,
          y2: 180 + Math.sin(rad) * r2,
        };
      }),
    [],
  );

  return (
    <div
      data-astral-astrolabe="true"
      data-astrolabe-variant={variant}
      data-astrolabe-angle={String(activeAngle)}
      data-astrolabe-animated={animOn ? "true" : "false"}
      className={`relative overflow-hidden rounded-xl border-2 p-3 sm:p-5 ${
        isFantasy
          ? "border-[#c5a869] bg-[#15221b] text-[#f5ebe6] shadow-[0_18px_48px_-14px_rgba(0,0,0,0.75),inset_0_0_24px_rgba(92,225,184,0.1)]"
          : "border-[var(--genre-gold,#e09f3e)]/80 bg-card/90 text-foreground shadow-[0_18px_42px_-16px_rgba(0,0,0,0.55)]"
      } ${className}`}
    >
      {/* Top Celestial Coordinate Bar */}
      <div
        className={`relative mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 ${
          isFantasy ? "border-[#c5a869]/35" : "border-border/50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-full border"
            style={{ borderColor: primaryBrass, color: astralAccent }}
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p
              className="font-mono text-[9px] font-bold uppercase tracking-[0.26em]"
              style={{ color: primaryBrass }}
            >
              ASTRAL CLOCKWORK ASTROLABE · {seriesTitle}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider opacity-80">
              {subtitle} · {status}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tierLabel && (
            <span
              className="rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tabular-nums"
              style={{
                borderColor: primaryBrass,
                color: isFantasy ? "#f5ebe6" : "var(--foreground)",
                backgroundColor: isFantasy ? "#111915" : "var(--background)",
              }}
            >
              CLASS {tierLabel}
            </span>
          )}
          <span
            data-astrolabe-azimuth={azimuthDeg}
            className="inline-flex items-center gap-1.5 rounded border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest tabular-nums"
            style={{
              borderColor: astralAccent,
              color: astralAccent,
              backgroundColor: isFantasy ? "rgba(17,25,21,0.85)" : "var(--background)",
            }}
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            AZM {azimuthDeg}°
          </span>
        </div>
      </div>

      {/* Main Astrolabe Dial + Interactive Sector Rails */}
      <div
        className={`relative grid items-center gap-5 ${
          compact ? "lg:grid-cols-[minmax(0,1fr)_220px]" : "lg:grid-cols-[minmax(280px,360px)_1fr]"
        }`}
      >
        {/* Clockwork SVG Concentric Wheel + Portrait Core */}
        <div className="relative mx-auto flex aspect-square w-full max-w-[340px] items-center justify-center">
          <svg
            viewBox="0 0 360 360"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={`astro-halo-${uid}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={astralAccent} stopOpacity="0.22" />
                <stop offset="55%" stopColor={primaryBrass} stopOpacity="0.1" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </defs>

            <circle cx="180" cy="180" r="174" fill={`url(#astro-halo-${uid})`} />

            {/* Outer Degree Bezel */}
            <circle
              cx="180"
              cy="180"
              r="173"
              fill="none"
              stroke={primaryBrass}
              strokeOpacity="0.7"
              strokeWidth="1.4"
            />
            {tickMarks.map((tk) => (
              <line
                key={tk.deg}
                x1={tk.x1}
                y1={tk.y1}
                x2={tk.x2}
                y2={tk.y2}
                stroke={tk.major ? astralAccent : primaryBrass}
                strokeOpacity={tk.major ? 0.85 : 0.45}
                strokeWidth={tk.major ? 1.4 : 0.8}
              />
            ))}

            {/* Rotating Outer Brass Clockwork Gear */}
            <g
              className={animOn ? "astrolabe-ring-cw" : undefined}
              style={{ transformOrigin: "180px 180px" }}
            >
              <path
                d={gearPath}
                fill="none"
                stroke={primaryBrass}
                strokeOpacity="0.55"
                strokeWidth="1.15"
              />
              <circle
                cx="180"
                cy="180"
                r="142"
                fill="none"
                stroke={primaryBrass}
                strokeOpacity="0.35"
                strokeWidth="0.9"
                strokeDasharray="6 4"
              />
            </g>

            {/* Counter-Rotating Inner Celestial Rete & Ecliptic Arc */}
            <g
              className={animOn ? "astrolabe-ring-ccw" : undefined}
              style={{ transformOrigin: "180px 180px" }}
            >
              <path
                d={innerGearPath}
                fill="none"
                stroke={astralAccent}
                strokeOpacity="0.48"
                strokeWidth="1"
              />
              <circle
                cx="196"
                cy="168"
                r="92"
                fill="none"
                stroke={primaryBrass}
                strokeOpacity="0.42"
                strokeWidth="0.95"
              />
              <polygon
                points="180,46 296,180 180,314 64,180"
                fill="none"
                stroke={astralAccent}
                strokeOpacity="0.28"
                strokeWidth="0.9"
              />
              <circle cx="180" cy="46" r="3.2" fill={astralAccent} />
              <circle cx="296" cy="180" r="2.8" fill={primaryBrass} />
              <circle cx="180" cy="314" r="3.2" fill={astralAccent} />
              <circle cx="64" cy="180" r="2.8" fill={primaryBrass} />
            </g>

            {/* Interactive Alidade Arm tracking selected sector */}
            <g
              style={{
                transformOrigin: "180px 180px",
                transform: `rotate(${activeAngle}deg)`,
                transition: animOn ? "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
              }}
            >
              <line
                x1="180"
                y1="180"
                x2="338"
                y2="180"
                stroke={astralAccent}
                strokeWidth="2"
                strokeOpacity="0.9"
              />
              <polygon points="342,180 328,174 332,180 328,186" fill={astralAccent} />
              <circle cx="342" cy="180" r="3.5" fill={primaryBrass} />
            </g>

            {/* Cardinal Letters */}
            <text
              x="180"
              y="21"
              textAnchor="middle"
              fill={primaryBrass}
              fontSize="9"
              fontWeight="700"
            >
              N
            </text>
            <text
              x="342"
              y="183"
              textAnchor="middle"
              fill={astralAccent}
              fontSize="9"
              fontWeight="700"
            >
              E
            </text>
            <text
              x="180"
              y="348"
              textAnchor="middle"
              fill={primaryBrass}
              fontSize="9"
              fontWeight="700"
            >
              S
            </text>
            <text
              x="18"
              y="183"
              textAnchor="middle"
              fill={primaryBrass}
              fontSize="9"
              fontWeight="700"
            >
              W
            </text>
          </svg>

          {/* Central Aperture Portrait */}
          <div
            className="relative z-10 flex h-[58%] w-[58%] items-center justify-center overflow-hidden rounded-full border-2 p-1 shadow-[0_0_24px_rgba(0,0,0,0.6)]"
            style={{
              borderColor: primaryBrass,
              backgroundColor: bezelFill,
            }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-full">
              {portraitSlot ?? <PortraitSvgFallback name={name} variant={variant} />}
            </div>
          </div>
        </div>

        {/* Right Sector Dial Controls & Orbital Skill Constellation */}
        <div className="flex min-w-0 flex-col gap-3">
          {(badgesSlot || showTitle) && (
            <div>
              {badgesSlot && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">{badgesSlot}</div>
              )}
              {showTitle && (
                <h2 className="font-display text-xl font-bold uppercase tracking-wider sm:text-2xl">
                  {name}
                </h2>
              )}
            </div>
          )}

          {/* Sector Tabs synced with Astrolabe Alidade */}
          <div
            role="tablist"
            aria-label="Astrolabe dossier sectors"
            className="flex flex-col gap-2 border-l border-dashed pl-3"
            style={{ borderColor: primaryBrass }}
          >
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] opacity-75">
              COMPASS DIAL · CELESTIAL SECTORS
            </span>
            {tabs.map((t, idx) => {
              const active = activeTab === t.id;
              const sectorAngle = SECTOR_ANGLES[idx % SECTOR_ANGLES.length] ?? 0;
              const sectorDeg = ((sectorAngle + 360) % 360).toString().padStart(3, "0");
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onMouseEnter={() => setHoveredSector(t.id)}
                  onMouseLeave={() => setHoveredSector(null)}
                  onClick={(ev) => onSelectTab?.(t.id, ev)}
                  className={`group flex min-h-[44px] items-center justify-between gap-2.5 rounded-r-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ce1b8] ${
                    active
                      ? isFantasy
                        ? "fantasy-discover-btn border-[#5ce1b8] text-[#f5ebe6]"
                        : "border-[var(--genre-gold,#e09f3e)] bg-primary/20 text-foreground shadow-[0_0_14px_color-mix(in_oklab,var(--accent)_28%,transparent)]"
                      : isFantasy
                        ? "border-[#c5a869]/35 bg-[#111915]/80 text-[#e6dcc5]/85 hover:border-[#c5a869] hover:text-[#f5ebe6]"
                        : "border-border/55 bg-background/65 text-muted-foreground hover:border-[var(--genre-gold,#e09f3e)]/75 hover:text-foreground"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rotate-45 border"
                      style={{
                        borderColor: active ? astralAccent : primaryBrass,
                        backgroundColor: active ? astralAccent : "transparent",
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[11px] font-bold uppercase tracking-wider">
                        0{idx + 1}. {t.short}
                      </span>
                      <span className="block font-mono text-[9px] opacity-75">{t.jp}</span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums opacity-75">
                    {sectorDeg}°
                  </span>
                </button>
              );
            })}
          </div>

          {/* Orbital Ability Nodes summary (safe fallback if none) */}
          {abilities.length > 0 && (
            <div
              className="rounded-lg border p-2.5"
              style={{
                borderColor: isFantasy ? "rgba(197,168,105,0.4)" : "var(--border)",
                backgroundColor: isFantasy ? "rgba(17,25,21,0.65)" : "var(--background)",
              }}
            >
              <p
                className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.22em]"
                style={{ color: primaryBrass }}
              >
                ORBITAL RESONANCE NODES ({abilities.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {abilities.slice(0, 4).map((ab) => (
                  <span
                    key={ab.name}
                    data-ability-rank={ab.rank}
                    className="inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10px] font-semibold"
                    style={{
                      borderColor: isFantasy ? "rgba(92,225,184,0.45)" : "var(--border)",
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: astralAccent }}
                    />
                    <span>{ab.label}</span>
                    {ab.tier && <span className="opacity-70">· {ab.tier}</span>}
                    {ab.rank && <AbilityRankPips rank={ab.rank} compact />}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
