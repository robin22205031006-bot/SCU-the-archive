import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeriesArchiveSummary, SeriesSagaSummaryDatum } from "@/lib/series-summary";

export interface SeriesSummaryChartProps {
  summary: SeriesArchiveSummary;
  isManga: boolean;
  loading?: boolean | undefined;
}

export function SeriesSummaryChart({ summary, isManga, loading = false }: SeriesSummaryChartProps) {
  const { sagas, totalCharacters, totalOrganizations, totalSagas } = summary;
  const charColor = isManga ? "#b91c1c" : "var(--accent)";
  const orgColor = isManga ? "var(--foreground)" : "#0ea5e9";

  return (
    <section
      data-no-swipe
      data-testid="series-summary-chart"
      aria-label="Summary of characters and organizations across all series sagas"
      className={
        isManga
          ? "manga-panel mb-6 border-[3px] border-foreground bg-card p-4"
          : "glass mb-6 rounded-2xl p-4 sm:p-5"
      }
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-border/50 pb-3">
        <div className="min-w-0">
          <p
            className={`text-[11px] uppercase tracking-widest ${
              isManga ? "font-mono font-bold text-[#b91c1c] dark:text-[#fca5a5]" : "text-accent"
            }`}
          >
            {isManga ? "SAGA ROSTER SUMMARY // 総覧" : "Saga Roster Summary"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Characters and organizations recorded across all series sagas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Sagas{" "}
            <span
              data-testid="total-sagas-count"
              className="font-mono font-semibold tabular-nums text-foreground"
            >
              {totalSagas}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Characters{" "}
            <span
              data-testid="total-characters-count"
              className="font-mono font-semibold tabular-nums text-foreground"
            >
              {totalCharacters}
            </span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Organizations{" "}
            <span
              data-testid="total-organizations-count"
              className="font-mono font-semibold tabular-nums text-foreground"
            >
              {totalOrganizations}
            </span>
          </span>
        </div>
      </div>

      {loading && sagas.length === 0 ? (
        <p role="status" className="py-12 text-center text-xs text-muted-foreground">
          Loading saga summary…
        </p>
      ) : sagas.length === 0 ? (
        <p className="py-12 text-center text-xs text-muted-foreground">
          No series sagas available to chart yet.
        </p>
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
            initialDimension={{ width: 640, height: 224 }}
          >
            <BarChart data={sagas} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
              <CartesianGrid
                stroke={isManga ? "var(--foreground)" : "var(--border)"}
                strokeOpacity={isManga ? 0.16 : 0.35}
                strokeDasharray={isManga ? "3 3" : undefined}
                vertical={false}
              />
              <XAxis
                dataKey="shortTitle"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={34}
              />
              <Tooltip
                cursor={{
                  fill: isManga ? "var(--foreground)" : "var(--accent)",
                  fillOpacity: 0.08,
                }}
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
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as SeriesSagaSummaryDatum | undefined;
                  return item?.title ?? "";
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  paddingTop: 6,
                  fontFamily: isManga ? "monospace" : undefined,
                }}
              />
              <Bar
                dataKey="characters"
                name="Characters"
                fill={charColor}
                radius={isManga ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
              />
              <Bar
                dataKey="organizations"
                name="Organizations"
                fill={orgColor}
                radius={isManga ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
