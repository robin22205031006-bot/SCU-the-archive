import { readDossier } from "@/lib/nexus-season";

export type JourneyRow = { id: string; series_id?: string; season?: number | undefined; series?: { id?: string; title?: string | null } | null; arc_role?: string | null | undefined; status?: string | null | undefined; role_in_series?: string | null | undefined };

/** Prominence score 1-5 from role, falling back to status. */
export function journeyScore(r: { arc_role?: string | null | undefined; status?: string | null | undefined; role_in_series?: string | null | undefined }): number {
  const role = `${r.arc_role ?? ""} ${r.role_in_series ?? ""}`.toLowerCase();
  if (/main\s*protagonist|lead\s*protagonist|main\s*antagonist/.test(role)) return 5;
  if (/impactful|protagonist|legend/.test(role)) return 4;
  if (/anti-?hero|antagonist|anti-?villain|villain/.test(role)) return 3;
  if (/support|mentor|side/.test(role)) return 2;
  if (/cameo/.test(role)) return 1;
  const st = (r.status ?? "").toLowerCase();
  if (st === "dead" || st === "presumed dead" || st === "missing") return 1;
  if (st === "alive" || st === "realive") return 3;
  return 2;
}

/**
 * One journey point per season: season dossier role/status (set in the Series
 * roster) override the series-level row, so curves redraw per season.
 */
export function seasonJourneyRows(rows: JourneyRow[], stats: unknown, seriesTitles: Record<string, string> = {}): JourneyRow[] {
  const dossier = readDossier(stats);
  const bySeries = new Map<string, JourneyRow>();
  for (const r of rows) bySeries.set(r.series_id ?? r.series?.id ?? r.id, r);
  const seasonKeys = Object.keys(dossier).map((k) => k.split(":")).filter(([, n]) => n && n !== "all" && Number(n) > 0) as [string, string][];
  for (const [sid] of seasonKeys) if (!bySeries.has(sid) && seriesTitles[sid]) bySeries.set(sid, { id: sid, series: { id: sid, title: seriesTitles[sid] } });
  const out: JourneyRow[] = [];
  for (const [sid, base] of bySeries) {
    const series = { ...base.series, id: sid, title: base.series?.title ?? seriesTitles[sid] ?? "?" };
    const seasons = seasonKeys.filter(([s]) => s === sid).map(([, n]) => Number(n)).sort((a, b) => a - b);
    if (!seasons.length) { out.push({ ...base, series }); continue; }
    for (const n of seasons) {
      const d = dossier[`${sid}:${n}`]!;
      if (d.roster === false) continue;
      out.push({ ...base, id: `${sid}:${n}`, season: n, series, arc_role: d.role ?? base.arc_role, role_in_series: d.role ?? base.role_in_series, status: d.status ?? base.status });
    }
  }
  return out;
}

/** Position on the universe timeline: admin series order, then season number. */
export function timelineRank(r: JourneyRow, order: string[]) {
  const sid = r.series?.id ?? r.series_id ?? "";
  const i = order.indexOf(sid);
  return (i < 0 ? 999 : i) * 1000 + (r.season ?? 0);
}
