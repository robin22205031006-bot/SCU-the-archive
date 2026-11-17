import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { seriesQuery } from "@/lib/series";
import {
  evaluateJourneyPointTrends,
  journeyStatusImpact,
  summarizeJourneyLineTrend,
  timelineRank,
  type JourneyRow,
  type JourneyTrendDirection,
} from "@/lib/journey";
import { useTimelineOrder } from "@/lib/series-order";
import { useIsManga } from "@/hooks/use-ui-mode";

const PALETTE = [
  "var(--accent)",
  "hsl(190 85% 60%)",
  "hsl(30 90% 60%)",
  "hsl(300 75% 65%)",
  "hsl(120 65% 55%)",
];
const MANGA_PALETTE = [
  "var(--foreground)",
  "var(--primary)",
  "var(--accent)",
  "var(--genre-gold, var(--primary))",
  "var(--muted-foreground)",
];
const LEVEL = [
  "",
  "Minor / fallen",
  "Support",
  "Anti / Antagonist",
  "Protagonist / Impactful",
  "Main lead",
];

const TREND_UP_COLOR = "#10b981";
const TREND_DOWN_COLOR = "#f43f5e";
const MANGA_TREND_UP_COLOR = "#16a34a";
const MANGA_TREND_DOWN_COLOR = "#e11d48";

/** Smooth segment i -> i+1 matching Catmull-Rom -> cubic Bézier trajectory. */
function smoothSegment(p: { x: number; y: number }[], i: number): string {
  const a = p[i - 1] ?? p[i]!;
  const b = p[i]!;
  const c = p[i + 1]!;
  const e = p[i + 2] ?? c;
  return `M${b.x},${b.y} C${b.x + (c.x - a.x) / 6},${b.y + (c.y - a.y) / 6} ${c.x - (e.x - b.x) / 6},${c.y - (e.y - b.y) / 6} ${c.x},${c.y}`;
}

/** Crisp stepped manga panel trajectory segment i -> i+1. */
function steppedSegment(p: { x: number; y: number }[], i: number): string {
  const a = p[i]!;
  const b = p[i + 1]!;
  const midX = (a.x + b.x) / 2;
  return `M${a.x},${a.y} L${midX},${a.y} L${midX},${b.y} L${b.x},${b.y}`;
}

function trendBadgeTone(trend: JourneyTrendDirection, isManga: boolean): string {
  if (trend === "up") {
    return isManga
      ? "border-emerald-600/70 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
  }
  if (trend === "down") {
    return isManga
      ? "border-rose-600/70 bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : "border-rose-500/40 bg-rose-500/10 text-rose-400";
  }
  return isManga
    ? "border-border bg-secondary/40 text-muted-foreground"
    : "border-border/70 bg-background/40 text-muted-foreground";
}

function formatSignedDelta(value: number, decimals = 0): string {
  const formatted = decimals > 0 ? Math.abs(value).toFixed(decimals) : String(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

/**
 * Continuous universe-timeline arc: every series season on one axis in the
 * admin-chosen order, each character drawn as one unbroken curve with
 * directional trend arrows and color shifts against overall progression history.
 */
export function JourneyLine({
  lines,
  title = "Journey trajectory",
}: {
  lines: { name: string; rows: JourneyRow[]; color?: string }[];
  title?: string;
}) {
  const isManga = useIsManga();
  const order = useTimelineOrder();
  const { data: series = [] } = useQuery(seriesQuery);
  const slots = new Map<
    number,
    { rank: number; sid: string; season?: number | undefined; title: string }
  >();
  for (const l of lines)
    for (const r of l.rows) {
      const rank = timelineRank(r, order);
      if (!slots.has(rank))
        slots.set(rank, {
          rank,
          sid: r.series?.id ?? "",
          season: r.season,
          title: r.series?.title ?? series.find((s) => s.id === r.series?.id)?.title ?? "?",
        });
    }
  const axis = [...slots.values()].sort((a, b) => a.rank - b.rank);
  if (!axis.length) return null;
  const W = 640,
    H = 190,
    padL = 30,
    padR = 16,
    top = 26,
    bottom = 44;
  const step = (W - padL - padR) / Math.max(axis.length - 1, 1);
  const xOf = (rank: number) =>
    padL +
    (axis.length === 1 ? (W - padL - padR) / 2 : axis.findIndex((a) => a.rank === rank) * step);
  const yOf = (s: number) => top + (1 - (s - 1) / 4) * (H - top - bottom);
  const bands: { sid: string; title: string; from: number; to: number }[] = [];
  axis.forEach((a, i) => {
    const last = bands[bands.length - 1];
    if (last && last.sid === a.sid) last.to = i;
    else bands.push({ sid: a.sid, title: a.title, from: i, to: i });
  });
  const palette = isManga ? MANGA_PALETTE : PALETTE;
  const upColor = isManga ? MANGA_TREND_UP_COLOR : TREND_UP_COLOR;
  const downColor = isManga ? MANGA_TREND_DOWN_COLOR : TREND_DOWN_COLOR;
  const isSingleLine = lines.length === 1;
  const primaryLine = isSingleLine ? lines[0] : undefined;
  const primarySorted = primaryLine
    ? [...primaryLine.rows].sort((a, b) => timelineRank(a, order) - timelineRank(b, order))
    : [];
  const primarySummary =
    primaryLine && primarySorted.length > 1
      ? summarizeJourneyLineTrend(primarySorted, order)
      : null;

  return (
    <figure
      data-manga-chart={isManga ? "journey-stepped" : undefined}
      className={
        isManga
          ? "min-w-0 border-2 border-border bg-card p-3 shadow-[3px_3px_0_currentColor]"
          : "min-w-0 rounded-xl border border-border bg-secondary/20 p-3"
      }
    >
      <figcaption className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span
          className={
            isManga
              ? "border-b border-border/60 pb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-foreground"
              : "text-[11px] uppercase tracking-widest text-muted-foreground"
          }
        >
          {title}
        </span>

        {primarySummary && (
          <div className="flex flex-wrap items-center gap-1.5" data-testid="journey-trend-summary">
            <span
              data-testid="journey-trend-badge"
              data-trend={primarySummary.overallTrend}
              title={`Overall journey score ${
                primarySummary.scoreDeltaVsHistory === 0
                  ? "matches"
                  : primarySummary.scoreDeltaVsHistory > 0
                    ? `is +${primarySummary.scoreDeltaVsHistory.toFixed(1)} above`
                    : `is ${primarySummary.scoreDeltaVsHistory.toFixed(1)} below`
              } prior progression history`}
              className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold ${
                isManga ? "font-mono uppercase" : "rounded-full"
              } ${trendBadgeTone(primarySummary.overallTrend, isManga)}`}
            >
              {primarySummary.overallTrend === "up" ? (
                <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : primarySummary.overallTrend === "down" ? (
                <TrendingDown className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : (
                <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              <span>
                {primarySummary.overallTrend === "up"
                  ? `Trending Up (${formatSignedDelta(primarySummary.scoreDeltaVsHistory, 1)})`
                  : primarySummary.overallTrend === "down"
                    ? `Trending Down (${formatSignedDelta(primarySummary.scoreDeltaVsHistory, 1)})`
                    : "Steady vs history"}
              </span>
            </span>

            {primarySummary.statsTrend !== null && (
              <span
                data-testid="journey-stats-trend"
                data-trend={primarySummary.statsTrend}
                title="Ability & character stats vs overall progression history"
                className={`inline-flex items-center gap-0.5 border px-1.5 py-0.5 text-[10px] font-medium ${
                  isManga ? "font-mono" : "rounded-full"
                } ${trendBadgeTone(primarySummary.statsTrend, isManga)}`}
              >
                {primarySummary.statsTrend === "up" ? (
                  <ArrowUp className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                ) : primarySummary.statsTrend === "down" ? (
                  <ArrowDown className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Minus className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {primarySummary.statsDeltaVsHistory !== null
                    ? `Stats ${formatSignedDelta(primarySummary.statsDeltaVsHistory)}`
                    : primarySummary.statsTrend === "up"
                      ? "Abilities ↑"
                      : "Stats —"}
                </span>
              </span>
            )}

            {primarySummary.statusTrend !== null &&
              (primarySummary.statusTrend !== "steady" ||
                (primarySummary.previousStatus &&
                  primarySummary.latestStatus &&
                  primarySummary.previousStatus.toLowerCase() !==
                    primarySummary.latestStatus.toLowerCase())) && (
                <span
                  data-testid="journey-status-trend"
                  data-trend={primarySummary.statusTrend}
                  title="Status shift vs overall progression history"
                  className={`inline-flex items-center gap-0.5 border px-1.5 py-0.5 text-[10px] font-medium ${
                    isManga ? "font-mono" : "rounded-full"
                  } ${trendBadgeTone(primarySummary.statusTrend, isManga)}`}
                >
                  {primarySummary.statusTrend === "up" ? (
                    <ArrowUp className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  ) : primarySummary.statusTrend === "down" ? (
                    <ArrowDown className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Minus className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>Status {primarySummary.latestStatus ?? "Updated"}</span>
                </span>
              )}
          </div>
        )}
      </figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="min-w-[480px] w-full"
          role="img"
          aria-label={`${title} across the series timeline`}
        >
          {bands.map((b, i) => {
            const x1 = xOf(axis[b.from]!.rank) - step / 2,
              x2 = xOf(axis[b.to]!.rank) + step / 2;
            return (
              <g key={b.sid + i}>
                <rect
                  x={Math.max(padL - 8, x1)}
                  y={top - 14}
                  width={Math.min(W - padR, x2) - Math.max(padL - 8, x1)}
                  height={H - top - bottom + 22}
                  fill={i % 2 ? "transparent" : "currentColor"}
                  opacity={isManga ? 0.06 : 0.04}
                  rx={isManga ? 0 : 6}
                />
                <text
                  x={(xOf(axis[b.from]!.rank) + xOf(axis[b.to]!.rank)) / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={isManga ? 700 : 400}
                  fill="currentColor"
                  opacity={isManga ? 0.9 : 0.75}
                >
                  {b.title.length > 18 ? b.title.slice(0, 17) + "…" : b.title}
                </text>
              </g>
            );
          })}
          {[1, 2, 3, 4, 5].map((g) => (
            <g key={g}>
              <line
                x1={padL}
                x2={W - padR}
                y1={yOf(g)}
                y2={yOf(g)}
                stroke="currentColor"
                strokeDasharray={isManga ? "4 3" : undefined}
                opacity={isManga ? 0.2 : 0.08}
              />
              <text
                x={4}
                y={yOf(g) + 3}
                fontSize={8}
                fontWeight={isManga ? 700 : 400}
                fill="currentColor"
                opacity={isManga ? 0.75 : 0.45}
              >
                <title>{LEVEL[g]}</title>
                {g}
              </text>
            </g>
          ))}
          {axis.map(
            (a) =>
              a.season && (
                <text
                  key={a.rank}
                  x={xOf(a.rank)}
                  y={H - bottom + 14}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={isManga ? 700 : 400}
                  fill="currentColor"
                  opacity={isManga ? 0.8 : 0.55}
                >
                  S{a.season}
                </text>
              ),
          )}
          {lines.map((l, i) => {
            const color = isManga
              ? palette[i % palette.length]!
              : (l.color ?? palette[i % palette.length]!);
            const sortedRows = [...l.rows].sort(
              (a, b) => timelineRank(a, order) - timelineRank(b, order),
            );
            const trends = evaluateJourneyPointTrends(sortedRows, order);
            const pts = sortedRows.map((r, idx) => {
              const trend = trends[idx]!;
              return {
                x: xOf(timelineRank(r, order)),
                y: yOf(trend.score),
                r,
                trend,
              };
            });

            return (
              <g key={l.name + i}>
                {pts.slice(0, -1).map((_, segIdx) => {
                  const nextTrend = pts[segIdx + 1]!.trend;
                  const segDirection: JourneyTrendDirection =
                    nextTrend.overallTrend !== "steady"
                      ? nextTrend.overallTrend
                      : nextTrend.statsTrend === "up" || nextTrend.statsTrend === "down"
                        ? nextTrend.statsTrend
                        : nextTrend.statusTrend === "up" || nextTrend.statusTrend === "down"
                          ? nextTrend.statusTrend
                          : "steady";
                  const segStroke =
                    isSingleLine && segDirection === "up"
                      ? upColor
                      : isSingleLine && segDirection === "down"
                        ? downColor
                        : color;
                  return (
                    <path
                      key={segIdx}
                      data-testid={isSingleLine ? `journey-segment-${segIdx + 1}` : undefined}
                      data-trend={segDirection}
                      d={isManga ? steppedSegment(pts, segIdx) : smoothSegment(pts, segIdx)}
                      fill="none"
                      stroke={segStroke}
                      strokeWidth={isManga ? 2.8 : 2.5}
                      strokeDasharray={
                        isManga && (i % 2 === 1 || (isSingleLine && segDirection === "down"))
                          ? "6 3"
                          : undefined
                      }
                      strokeLinecap={isManga ? "square" : "round"}
                    />
                  );
                })}
                {pts.map((p, k) => {
                  const { trend } = p;
                  const score = trend.score;
                  const st = journeyStatusImpact(p.r.status);
                  const hasGained = (p.r.gainedAbilities ?? 0) > 0;
                  const pointDirection: JourneyTrendDirection =
                    k === 0
                      ? "steady"
                      : trend.overallTrend !== "steady"
                        ? trend.overallTrend
                        : trend.statsTrend === "up" || trend.statsTrend === "down"
                          ? trend.statsTrend
                          : trend.statusTrend === "up" || trend.statusTrend === "down"
                            ? trend.statusTrend
                            : "steady";

                  const parts = [
                    l.name,
                    `${p.r.series?.title ?? ""}${p.r.season ? ` S${p.r.season}` : ""}`.trim(),
                    p.r.arc_role ?? p.r.role_in_series ?? "—",
                    p.r.status ?? "—",
                  ];
                  if (p.r.statAverage != null && p.r.statAverage > 0) {
                    const statsTrendNote =
                      trend.statsDeltaVsHistory != null && trend.statsDeltaVsHistory !== 0
                        ? ` (${formatSignedDelta(trend.statsDeltaVsHistory)} vs history)`
                        : "";
                    parts.push(`Avg Stats ${p.r.statAverage}${statsTrendNote}`);
                  }
                  if (p.r.abilityCount != null && p.r.abilityCount > 0) {
                    parts.push(
                      `${p.r.abilityCount} ${p.r.abilityCount === 1 ? "ability" : "abilities"}${
                        hasGained ? ` (+${p.r.gainedAbilities} gained)` : ""
                      }`,
                    );
                  }
                  if (k > 0 && pointDirection !== "steady") {
                    parts.push(
                      pointDirection === "up"
                        ? `Trending ↑ (${formatSignedDelta(trend.scoreDeltaVsHistory, 1)} vs history)`
                        : `Trending ↓ (${formatSignedDelta(trend.scoreDeltaVsHistory, 1)} vs history)`,
                    );
                  }
                  parts.push(`Impact ${score.toFixed(1)}`);
                  const tip = parts.filter(Boolean).join(" · ");

                  const trendColor =
                    pointDirection === "up"
                      ? upColor
                      : pointDirection === "down"
                        ? downColor
                        : color;
                  const statusStroke =
                    st.category === "dead" || st.category === "presumed_dead"
                      ? "#f43f5e"
                      : st.category === "missing" || st.category === "sealed"
                        ? "#fbbf24"
                        : st.category === "retired"
                          ? "#94a3b8"
                          : trendColor;
                  const hollow =
                    st.category === "dead" ||
                    st.category === "presumed_dead" ||
                    st.category === "missing" ||
                    st.category === "sealed" ||
                    st.category === "retired";
                  const nodeFill = isSingleLine && pointDirection !== "steady" ? trendColor : color;

                  // Place directional glyph cleanly above (up) or below/offset-right (down)
                  const arrowX =
                    pointDirection === "down" && p.y > 132 ? Math.min(W - padR - 4, p.x + 10) : p.x;
                  const arrowY = pointDirection === "up" ? p.y - 11 : p.y > 132 ? p.y : p.y + 11;
                  const arrowTestId = isSingleLine
                    ? `journey-point-arrow-${k}`
                    : `journey-point-arrow-${i}-${k}`;

                  if (isManga) {
                    return (
                      <g
                        key={k}
                        data-status-category={st.category}
                        data-point-trend={pointDirection}
                        data-stats-trend={trend.statsTrend ?? undefined}
                        data-status-trend={trend.statusTrend ?? undefined}
                      >
                        {hasGained && (
                          <rect
                            x={p.x - 6.5}
                            y={p.y - 6.5}
                            width={13}
                            height={13}
                            fill="none"
                            stroke={nodeFill}
                            strokeWidth={1.2}
                            opacity={0.6}
                          />
                        )}
                        <rect
                          x={p.x - 4}
                          y={p.y - 4}
                          width={8}
                          height={8}
                          fill={
                            hollow
                              ? "var(--card)"
                              : pointDirection !== "steady" && isSingleLine
                                ? nodeFill
                                : k === pts.length - 1
                                  ? "var(--primary)"
                                  : "var(--card)"
                          }
                          stroke={hollow ? statusStroke : nodeFill}
                          strokeWidth={2}
                        >
                          <title>{tip}</title>
                        </rect>
                        {k > 0 && pointDirection !== "steady" && (
                          <g
                            data-testid={arrowTestId}
                            data-trend={pointDirection}
                            transform={`translate(${arrowX}, ${arrowY})`}
                          >
                            <path
                              d={
                                pointDirection === "up"
                                  ? "M0,-3.8 L3.4,1 L1.2,1 L1.2,3.5 L-1.2,3.5 L-1.2,1 L-3.4,1 Z"
                                  : "M0,3.8 L3.4,-1 L1.2,-1 L1.2,-3.5 L-1.2,-3.5 L-1.2,-1 L-3.4,-1 Z"
                              }
                              fill={pointDirection === "up" ? upColor : downColor}
                            />
                          </g>
                        )}
                      </g>
                    );
                  }

                  return (
                    <g
                      key={k}
                      data-status-category={st.category}
                      data-point-trend={pointDirection}
                      data-stats-trend={trend.statsTrend ?? undefined}
                      data-status-trend={trend.statusTrend ?? undefined}
                    >
                      {hasGained && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={7}
                          fill="none"
                          stroke={nodeFill}
                          strokeWidth={1.25}
                          opacity={0.6}
                        />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        fill={hollow ? "var(--background)" : nodeFill}
                        stroke={hollow ? statusStroke : undefined}
                        strokeWidth={hollow ? 2 : undefined}
                      >
                        <title>{tip}</title>
                      </circle>
                      {k > 0 && pointDirection !== "steady" && (
                        <g
                          data-testid={arrowTestId}
                          data-trend={pointDirection}
                          transform={`translate(${arrowX}, ${arrowY})`}
                        >
                          <path
                            d={
                              pointDirection === "up"
                                ? "M0,-3.8 L3.4,1 L1.2,1 L1.2,3.5 L-1.2,3.5 L-1.2,1 L-3.4,1 Z"
                                : "M0,3.8 L3.4,-1 L1.2,-1 L1.2,-3.5 L-1.2,-3.5 L-1.2,-1 L-3.4,-1 Z"
                            }
                            fill={pointDirection === "up" ? upColor : downColor}
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        {lines.length > 1 ? (
          <div className="flex flex-wrap gap-2 text-[11px] text-foreground">
            {lines.map((l, i) => (
              <span
                key={l.name + i}
                className="flex items-center gap-1 font-mono text-[10px] font-bold"
              >
                <span
                  className={
                    isManga ? "h-2.5 w-2.5 border border-foreground" : "h-2 w-2 rounded-full"
                  }
                  style={{
                    background: isManga
                      ? palette[i % palette.length]
                      : (l.color ?? palette[i % palette.length]),
                  }}
                />
                {l.name}
              </span>
            ))}
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2.5 opacity-85">
          <span>Driven by role, status, stats &amp; gained abilities</span>
          <span className="inline-flex items-center gap-0.5 text-emerald-500">
            <ArrowUp className="h-2.5 w-2.5" aria-hidden="true" />
            Upward trend
          </span>
          <span className="inline-flex items-center gap-0.5 text-rose-500">
            <ArrowDown className="h-2.5 w-2.5" aria-hidden="true" />
            Downward trend
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-amber-400" />
            Missing/Sealed
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-slate-400" />
            Retired
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full border-2 border-rose-500" />
            Dead/Presumed
          </span>
        </div>
      </div>
    </figure>
  );
}
