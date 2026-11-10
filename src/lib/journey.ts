import { readDossier } from "@/lib/nexus-season";

type Row = { id: string; series_id?: string; series?: { id?: string; title?: string | null } | null; arc_role?: string | null | undefined; status?: string | null | undefined; role_in_series?: string | null | undefined };

/**
 * One journey point per season: season dossier role/status (set in the Series
 * roster) override the series-level row, so curves redraw per season.
 */
export function seasonJourneyRows(rows: Row[], stats: unknown, seriesTitles: Record<string, string> = {}): Row[] {
  const dossier = readDossier(stats);
  const bySeries = new Map<string, Row>();
  for (const r of rows) bySeries.set(r.series_id ?? r.series?.id ?? r.id, r);
  const seasonKeys = Object.keys(dossier).map((k) => k.split(":")).filter(([, n]) => n && n !== "all" && Number(n) > 0) as [string, string][];
  for (const [sid] of seasonKeys) if (!bySeries.has(sid) && seriesTitles[sid]) bySeries.set(sid, { id: sid, series: { id: sid, title: seriesTitles[sid] } });
  const out: (Row & { _o: string })[] = [];
  for (const [sid, base] of bySeries) {
    const title = base.series?.title ?? seriesTitles[sid] ?? "?";
    const seasons = seasonKeys.filter(([s]) => s === sid).map(([, n]) => Number(n)).sort((a, b) => a - b);
    if (!seasons.length) { out.push({ ...base, _o: `${title}` }); continue; }
    for (const n of seasons) {
      const d = dossier[`${sid}:${n}`]!;
      if (d.roster === false) continue;
      out.push({ ...base, id: `${sid}:${n}`, series: { ...base.series, title: `${title} S${n}` }, arc_role: d.role ?? base.arc_role, role_in_series: d.role ?? base.role_in_series, status: d.status ?? base.status, _o: `${title}\u0000${String(n).padStart(3, "0")}` });
    }
  }
  return out.sort((a, b) => a._o.localeCompare(b._o)).map(({ _o, ...r }) => r);
}
