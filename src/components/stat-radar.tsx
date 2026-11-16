import { motion } from "framer-motion";
import { COMBAT_STATS, type CombatStats } from "@/lib/combat-stats";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useIsManga } from "@/hooks/use-ui-mode";

const CX = 110;
const CY = 105;
const R = 78;

function point(i: number, value: number) {
  const angle = (Math.PI * 2 * i) / COMBAT_STATS.length - Math.PI / 2;
  const r = (Math.max(0, Math.min(100, value)) / 100) * R;
  return { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r };
}

function ringPath(scale: number) {
  return (
    COMBAT_STATS.map((_, i) => {
      const p = point(i, 100 * scale);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

function seriesPath(stats: CombatStats) {
  return (
    COMBAT_STATS.map((s, i) => {
      const p = point(i, stats[s.key]);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + " Z"
  );
}

const SERIES_COLORS = ["#fb4d6d", "#f5b942"] as const;

/**
 * Cinematic radar chart for the five canonical combat stats.
 * `a` renders crimson, optional `b` renders gold — used for comparisons.
 * In Manga UI mode renders a circular Intervention Mandala ink wheel.
 */
export function StatRadar({
  a,
  b,
  nameA,
  nameB,
  size = 220,
}: {
  a: CombatStats;
  b?: CombatStats;
  nameA?: string;
  nameB?: string;
  size?: number;
}) {
  const isManga = useIsManga();
  const { motionActive } = useAppMotion();
  const labelR = R + 20;
  const pathTransition = motionActive
    ? { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const }
    : { duration: 0 };

  if (isManga) {
    return (
      <div className="grid justify-items-center gap-2" data-manga-chart="mandala">
        <svg
          viewBox="0 0 220 215"
          width={size}
          height={size * (215 / 220)}
          role="img"
          aria-label="Combat Intervention Mandala chart"
        >
          {/* Concentric dashed ink calibration rings */}
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <circle
              key={s}
              cx={CX}
              cy={CY}
              r={R * s}
              fill="none"
              stroke="currentColor"
              strokeOpacity={s === 1 ? 0.85 : 0.25}
              strokeWidth={s === 1 ? 2 : 0.9}
              strokeDasharray={s === 1 ? undefined : "3 3"}
            />
          ))}
          <circle
            cx={CX}
            cy={CY}
            r={R + 5}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity={0.65}
            strokeWidth={1}
          />
          {COMBAT_STATS.map((_, i) => {
            const p = point(i, 100);
            return (
              <line
                key={i}
                x1={CX}
                y1={CY}
                x2={p.x}
                y2={p.y}
                stroke="currentColor"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
            );
          })}
          {b && (
            <motion.path
              initial={false}
              animate={{ d: seriesPath(b) }}
              transition={pathTransition}
              fill="var(--primary)"
              fillOpacity={0.14}
              stroke="var(--primary)"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
          )}
          <motion.path
            initial={false}
            animate={{ d: seriesPath(a) }}
            transition={pathTransition}
            fill="currentColor"
            fillOpacity={0.14}
            stroke="currentColor"
            strokeWidth={2.4}
          />
          {COMBAT_STATS.map((s, i) => {
            const lp = {
              x: CX + Math.cos((Math.PI * 2 * i) / COMBAT_STATS.length - Math.PI / 2) * labelR,
              y: CY + Math.sin((Math.PI * 2 * i) / COMBAT_STATS.length - Math.PI / 2) * labelR,
            };
            const v = a[s.key];
            const vp = point(i, v);
            const vb = b ? b[s.key] : null;
            const vbp = vb !== null ? point(i, vb) : null;
            return (
              <g key={s.key}>
                <text
                  x={lp.x}
                  y={lp.y}
                  textAnchor={lp.x > CX + 4 ? "start" : lp.x < CX - 4 ? "end" : "middle"}
                  dominantBaseline="middle"
                  className="fill-current font-mono font-bold"
                  fontSize={8}
                  letterSpacing={0.6}
                >
                  {s.label.toUpperCase()}
                </text>
                {vbp && (
                  <motion.circle
                    initial={false}
                    animate={{ cx: vbp.x, cy: vbp.y }}
                    transition={pathTransition}
                    r={2.8}
                    fill="var(--primary)"
                    stroke="var(--card)"
                    strokeWidth={1}
                  >
                    <title>{`${nameB ?? "Target"} · ${s.label}: ${vb}`}</title>
                  </motion.circle>
                )}
                <motion.rect
                  initial={false}
                  animate={{ x: vp.x - 3, y: vp.y - 3 }}
                  transition={pathTransition}
                  width={6}
                  height={6}
                  fill="var(--foreground)"
                  stroke="var(--card)"
                  strokeWidth={1}
                >
                  <title>{`${nameA ? `${nameA} · ` : ""}${s.label}: ${v}`}</title>
                </motion.rect>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={3} fill="currentColor" />
        </svg>
        {(nameA || nameB) && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] font-bold uppercase tracking-widest">
            {nameA && (
              <span className="flex items-center gap-1.5 border border-border px-2 py-0.5 transition-colors duration-200">
                <span className="h-2 w-2 bg-foreground" />
                {nameA}
              </span>
            )}
            {nameB && (
              <span className="flex items-center gap-1.5 border border-primary px-2 py-0.5 text-primary transition-colors duration-200">
                <span className="h-2 w-2 bg-primary" />
                {nameB}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid justify-items-center gap-2">
      <svg
        viewBox="0 0 220 215"
        width={size}
        height={size * (215 / 220)}
        role="img"
        aria-label="Combat stats radar"
      >
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <path
            key={s}
            d={ringPath(s)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={s === 1 ? 1.2 : 0.7}
          />
        ))}
        {COMBAT_STATS.map((_, i) => {
          const p = point(i, 100);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth={0.7}
            />
          );
        })}
        {b && (
          <motion.path
            initial={false}
            animate={{ d: seriesPath(b) }}
            transition={pathTransition}
            fill={SERIES_COLORS[1]}
            fillOpacity={0.14}
            stroke={SERIES_COLORS[1]}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        )}
        <motion.path
          initial={false}
          animate={{ d: seriesPath(a) }}
          transition={pathTransition}
          fill={SERIES_COLORS[0]}
          fillOpacity={0.18}
          stroke={SERIES_COLORS[0]}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {COMBAT_STATS.map((s, i) => {
          const lp = {
            x: CX + Math.cos((Math.PI * 2 * i) / COMBAT_STATS.length - Math.PI / 2) * labelR,
            y: CY + Math.sin((Math.PI * 2 * i) / COMBAT_STATS.length - Math.PI / 2) * labelR,
          };
          return (
            <text
              key={s.key}
              x={lp.x}
              y={lp.y}
              textAnchor={lp.x > CX + 4 ? "start" : lp.x < CX - 4 ? "end" : "middle"}
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={8.5}
              letterSpacing={0.6}
            >
              {s.label.toUpperCase()}
            </text>
          );
        })}
        {b &&
          COMBAT_STATS.map((s, i) => {
            const v = b[s.key];
            const p = point(i, v);
            return (
              <motion.circle
                key={`${s.key}-b`}
                initial={false}
                animate={{ cx: p.x, cy: p.y }}
                transition={pathTransition}
                r={2.4}
                fill={SERIES_COLORS[1]}
              >
                <title>{`${nameB ?? "Target"} · ${s.label}: ${v}`}</title>
              </motion.circle>
            );
          })}
        {COMBAT_STATS.map((s, i) => {
          const v = a[s.key];
          const p = point(i, v);
          return (
            <motion.circle
              key={s.key}
              initial={false}
              animate={{ cx: p.x, cy: p.y }}
              transition={pathTransition}
              r={2.5}
              fill={SERIES_COLORS[0]}
            >
              <title>{`${nameA ? `${nameA} · ` : ""}${s.label}: ${v}`}</title>
            </motion.circle>
          );
        })}
      </svg>
      {(nameA || nameB) && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-widest">
          {nameA && (
            <span className="flex items-center gap-1.5 transition-opacity duration-200">
              <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[0] }} />
              {nameA}
            </span>
          )}
          {nameB && (
            <span className="flex items-center gap-1.5 transition-opacity duration-200">
              <span className="h-2 w-2 rounded-full" style={{ background: SERIES_COLORS[1] }} />
              {nameB}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
