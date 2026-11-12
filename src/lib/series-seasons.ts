/** Numbered seasons and named standalone entries share the existing season selector. */
export function seriesSeasonNames(series: { season_count: number | null; season_names: string[] }) {
  return Array.from(
    { length: Math.max(series.season_count ?? 0, series.season_names.length) },
    (_, i) => series.season_names[i] || `Season ${i + 1}`,
  );
}
