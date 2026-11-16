import { useMemo, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { abilityDef } from "@/lib/abilities";
import { getAbilityRankRadarSeries, type AbilityRankRadarPoint } from "@/lib/ability-benefits";
import { ABILITY_RANKS, ABILITY_RANK_META, type AbilityEmblemRank } from "@/lib/ability-rank";

export interface AbilityRankRadarProps {
  abilityKey: string;
  activeRank: AbilityEmblemRank;
  onSelectRank?: ((rank: AbilityEmblemRank) => void) | undefined;
  animate?: boolean | undefined;
}

const RANK_DATA_KEYS: Record<
  AbilityEmblemRank,
  keyof Pick<AbilityRankRadarPoint, "r1" | "r2" | "r3" | "r4" | "r5">
> = {
  1: "r1",
  2: "r2",
  3: "r3",
  4: "r4",
  5: "r5",
};

interface TooltipPayloadItem {
  payload?: AbilityRankRadarPoint;
}

function RadarRankTooltip({
  active,
  payload,
  focusedRank,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  focusedRank: AbilityEmblemRank;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-border bg-popover/95 px-2.5 py-2 text-[11px] shadow-md backdrop-blur">
      <p className="font-semibold text-foreground">{point.stat} Scaling (I–V)</p>
      <div className="mt-1 grid grid-cols-5 gap-2 font-mono tabular-nums">
        {ABILITY_RANKS.map((r) => {
          const meta = ABILITY_RANK_META[r];
          const val = point[RANK_DATA_KEYS[r]];
          const isFocused = r === focusedRank;
          return (
            <div key={r} className="flex flex-col items-center">
              <span className="text-[10px] font-bold" style={{ color: meta.ringColor }}>
                {meta.roman}
              </span>
              <span
                className={
                  isFocused
                    ? "font-bold text-foreground underline underline-offset-2"
                    : "text-muted-foreground"
                }
              >
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AbilityRankRadar({
  abilityKey,
  activeRank,
  onSelectRank,
  animate = true,
}: AbilityRankRadarProps) {
  const [hoveredRank, setHoveredRank] = useState<AbilityEmblemRank | null>(null);
  const def = useMemo(() => abilityDef(abilityKey), [abilityKey]);
  const data = useMemo(() => getAbilityRankRadarSeries(def.key), [def.key]);

  const focusedRank = hoveredRank ?? activeRank;
  const focusedMeta = ABILITY_RANK_META[focusedRank];

  const renderOrder = useMemo(() => {
    const others = ABILITY_RANKS.filter((r) => r !== focusedRank);
    return [...others, focusedRank];
  }, [focusedRank]);

  return (
    <div
      data-testid="ability-rank-radar"
      data-active-rank={activeRank}
      aria-label={`Radar chart comparing ${def.label} stats across Ranks I to V`}
      className="grid gap-2 rounded-lg border border-border/60 bg-background/45 p-2.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            5-Rank Stat Scaling (I–V)
          </p>
          <p className="text-[11px] text-muted-foreground">
            Highlighting{" "}
            <span className="font-semibold" style={{ color: focusedMeta.ringColor }}>
              {focusedMeta.label}
            </span>
          </p>
        </div>

        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Inspect rank ring on radar chart"
        >
          {ABILITY_RANKS.map((r) => {
            const meta = ABILITY_RANK_META[r];
            const isSelected = activeRank === r;
            const isFocused = focusedRank === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onSelectRank?.(r)}
                onMouseEnter={() => setHoveredRank(r)}
                onMouseLeave={() => setHoveredRank(null)}
                onFocus={() => setHoveredRank(r)}
                onBlur={() => setHoveredRank(null)}
                aria-pressed={isSelected}
                aria-label={`Focus Rank ${meta.roman} (${meta.shortTitle}) on radar chart`}
                className={`whitespace-nowrap shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isFocused
                    ? "bg-accent/15 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}
                style={{
                  borderColor: isFocused ? meta.ringColor : undefined,
                  boxShadow: `inset 0 -2px 0 ${meta.ringColor}`,
                }}
              >
                {meta.roman}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[206px] w-full">
        <ResponsiveContainer
          width="100%"
          height={206}
          initialDimension={{ width: 320, height: 206 }}
        >
          <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
            <PolarGrid stroke="var(--border)" strokeOpacity={0.6} />
            <PolarAngleAxis
              dataKey="stat"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
              tickCount={5}
            />
            <Tooltip content={<RadarRankTooltip focusedRank={focusedRank} />} />
            {renderOrder.map((r) => {
              const meta = ABILITY_RANK_META[r];
              const isFocused = r === focusedRank;
              return (
                <Radar
                  key={r}
                  name={`Rank ${meta.roman}`}
                  dataKey={RANK_DATA_KEYS[r]}
                  stroke={meta.ringColor}
                  fill={meta.ringColor}
                  strokeWidth={isFocused ? 2.4 : 1.15}
                  strokeOpacity={isFocused ? 1 : 0.55}
                  fillOpacity={isFocused ? 0.24 : 0.04}
                  dot={isFocused ? { r: 2.5, fill: meta.ringColor, strokeWidth: 0 } : false}
                  isAnimationActive={animate}
                  animationDuration={220}
                />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
