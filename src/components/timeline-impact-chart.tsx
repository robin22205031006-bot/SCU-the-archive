import {
  Area,
  AreaChart,
  CartesianGrid,
  Dot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const IMPACT_TIERS = [
  { label: "Low", value: 2, color: "var(--status-neutral, #8b93a7)" },
  { label: "Medium", value: 5, color: "var(--accent)" },
  { label: "High", value: 8, color: "#f59e0b" },
  { label: "Catastrophic", value: 10, color: "#ef4444" },
] as const;

export function impactTier(raw: number | null | undefined) {
  const v = Number.isFinite(raw) ? (raw as number) : 5;
  return IMPACT_TIERS.reduce((best, t) =>
    Math.abs(t.value - v) < Math.abs(best.value - v) ? t : best,
  );
}

export interface TimelineChartDatum {
  xlabel: string;
  impact: number;
  title: string;
  era?: string | null;
  series?: string | null;
  color: string;
}

export function TimelineImpactChart({
  data,
  isManga,
}: {
  data: TimelineChartDatum[];
  isManga: boolean;
}) {
  return (
    <div
      data-no-swipe
      className={
        isManga
          ? "manga-panel mb-6 h-60 border-[3px] border-foreground bg-card p-3"
          : "glass mb-6 h-56 rounded-2xl p-3"
      }
    >
      <div className="flex items-center justify-between px-2">
        <p
          className={`text-[11px] uppercase tracking-widest ${
            isManga ? "font-mono font-bold text-foreground" : "text-muted-foreground"
          }`}
        >
          {isManga ? "CRISIS INTENSITY // 衝撃度" : "Impact"}
        </p>
        <div className="flex gap-3">
          {IMPACT_TIERS.map((t) => (
            <span
              key={t.label}
              className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"
            >
              <span
                className={`h-1.5 w-1.5 ${isManga ? "" : "rounded-full"}`}
                style={{ background: t.color }}
              />
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height="88%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="imp" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0"
                stopColor={isManga ? "#b91c1c" : "var(--accent)"}
                stopOpacity={isManga ? 0.28 : 0.6}
              />
              <stop
                offset="1"
                stopColor={isManga ? "#b91c1c" : "var(--accent)"}
                stopOpacity={isManga ? 0.04 : 0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={isManga ? "var(--foreground)" : "var(--border)"}
            strokeOpacity={isManga ? 0.16 : 0.35}
            strokeDasharray={isManga ? "3 3" : undefined}
            vertical={false}
          />
          <XAxis
            dataKey="xlabel"
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(v) => String(v).slice(0, 14)}
          />
          <YAxis
            domain={[0, 10]}
            tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={
              isManga
                ? {
                    background: "var(--card)",
                    border: "2px solid var(--foreground)",
                    borderRadius: 0,
                    color: "var(--foreground)",
                    fontFamily: "monospace",
                    fontSize: 11,
                  }
                : {
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }
            }
            formatter={(v) => [`${v} · ${impactTier(Number(v)).label}`, "Impact"]}
            labelFormatter={(_, p) => {
              const d = p?.[0]?.payload as TimelineChartDatum | undefined;
              return [d?.title, d?.era, d?.series].filter(Boolean).join(" — ");
            }}
          />
          <Area
            type={isManga ? "stepAfter" : "monotone"}
            dataKey="impact"
            stroke={isManga ? "#b91c1c" : "var(--accent)"}
            strokeWidth={isManga ? 2.5 : 2}
            fill="url(#imp)"
            isAnimationActive={false}
            dot={(p: {
              cx: number;
              cy: number;
              index?: number;
              payload?: { impact: number; color: string };
            }) => {
              const r =
                p.payload && p.payload.impact >= 8
                  ? 4
                  : p.payload && p.payload.impact >= 5
                    ? 3
                    : 2;
              if (isManga) {
                return (
                  <rect
                    key={`d${p.index ?? `${p.cx}-${p.cy}`}`}
                    x={p.cx - r}
                    y={p.cy - r}
                    width={r * 2}
                    height={r * 2}
                    fill={p.payload && p.payload.impact >= 8 ? "#b91c1c" : "var(--foreground)"}
                    stroke="var(--card)"
                    strokeWidth={1}
                  />
                );
              }
              return (
                <Dot
                  key={`d${p.index ?? `${p.cx}-${p.cy}`}`}
                  cx={p.cx}
                  cy={p.cy}
                  r={r}
                  fill={p.payload?.color ?? "var(--accent)"}
                  stroke="none"
                />
              );
            }}
            activeDot={{
              r: 4,
              fill: isManga ? "#b91c1c" : "var(--accent)",
              stroke: "var(--background)",
              strokeWidth: 1,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
