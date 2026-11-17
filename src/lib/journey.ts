import { resolveAbilityAliasPure } from "@/lib/ability-rank";
import { NEXUS_STATS, clampStat, readDossier, type SeasonDossier } from "@/lib/nexus-season";

export type JourneyRow = {
  id: string;
  series_id?: string;
  season?: number | undefined;
  series?: { id?: string; title?: string | null } | null;
  arc_role?: string | null | undefined;
  status?: string | null | undefined;
  role_in_series?: string | null | undefined;
  statAverage?: number | undefined;
  statPeak?: number | undefined;
  abilityCount?: number | undefined;
  gainedAbilities?: number | undefined;
};

export type JourneyStatusCategory =
  "active" | "missing" | "retired" | "presumed_dead" | "sealed" | "dead" | "neutral";

export function journeyStatusImpact(status: string | null | undefined): {
  delta: number;
  dampenGrowth: number;
  category: JourneyStatusCategory;
} {
  const st = (status ?? "").trim().toLowerCase();
  if (!st) return { delta: 0, dampenGrowth: 1, category: "neutral" };
  if (st.includes("presumed"))
    return { delta: -1.35, dampenGrowth: 0.3, category: "presumed_dead" };
  if (st === "dead" || st === "deceased" || st === "killed") {
    return { delta: -1.85, dampenGrowth: 0.25, category: "dead" };
  }
  if (st === "sealed" || st === "imprisoned") {
    return { delta: -1.25, dampenGrowth: 0.3, category: "sealed" };
  }
  if (st === "missing" || st === "unknown") {
    return { delta: -0.85, dampenGrowth: 0.4, category: "missing" };
  }
  if (st === "retired") {
    return { delta: -0.7, dampenGrowth: 0.45, category: "retired" };
  }
  if (st === "realive" || st === "revived") {
    return { delta: 0.35, dampenGrowth: 1, category: "active" };
  }
  if (st === "alive" || st === "active") {
    return { delta: 0.25, dampenGrowth: 1, category: "active" };
  }
  return { delta: 0, dampenGrowth: 1, category: "neutral" };
}

function summarizeStatBlock(source: Record<string, unknown> | undefined): {
  avg: number | undefined;
  peak: number | undefined;
} {
  if (!source) return { avg: undefined, peak: undefined };
  const vals = NEXUS_STATS.map(({ key }) => clampStat(source[key]));
  const max = Math.max(0, ...vals);
  if (max <= 0) return { avg: undefined, peak: undefined };
  const avg = Math.round(vals.reduce((sum, v) => sum + v, 0) / vals.length);
  return { avg, peak: max };
}

function summarizeDossierSeasonStats(d: SeasonDossier | undefined): {
  statAverage: number | undefined;
  statPeak: number | undefined;
} {
  if (!d) return { statAverage: undefined, statPeak: undefined };
  const charStats = summarizeStatBlock(d.stats);
  let abilityAvg: number | undefined;
  let abilityPeak = 0;
  if (d.abilityStats && typeof d.abilityStats === "object") {
    const avgs: number[] = [];
    for (const block of Object.values(d.abilityStats)) {
      const s = summarizeStatBlock(block);
      if (s.avg !== undefined) avgs.push(s.avg);
      if (s.peak !== undefined && s.peak > abilityPeak) abilityPeak = s.peak;
    }
    if (avgs.length > 0) {
      abilityAvg = Math.round(avgs.reduce((sum, v) => sum + v, 0) / avgs.length);
    }
  }
  const statAverage = charStats.avg ?? abilityAvg;
  const combinedPeak = Math.max(charStats.peak ?? 0, abilityPeak);
  return {
    statAverage,
    statPeak: combinedPeak > 0 ? combinedPeak : undefined,
  };
}

function extractDossierAbilityCanons(d: SeasonDossier | undefined): Set<string> {
  const out = new Set<string>();
  if (!d) return out;
  for (const key of d.abilityKeys ?? []) {
    const canon = resolveAbilityAliasPure(key);
    if (canon) out.add(canon);
  }
  for (const key of Object.keys(d.abilityStats ?? {})) {
    const canon = resolveAbilityAliasPure(key);
    if (canon) out.add(canon);
  }
  return out;
}

/**
 * Narrative & progression score (1.0 - 5.0) combining:
 * - Seasonal role prominence
 * - Status impact (Alive / Realive / Missing / Retired / Presumed Dead / Sealed / Dead)
 * - Seasonal character/ability stats
 * - Active abilities and newly gained abilities across seasons
 */
export function journeyScore(r: {
  arc_role?: string | null | undefined;
  status?: string | null | undefined;
  role_in_series?: string | null | undefined;
  statAverage?: number | null | undefined;
  statPeak?: number | null | undefined;
  abilityCount?: number | null | undefined;
  gainedAbilities?: number | null | undefined;
}): number {
  const role = `${r.arc_role ?? ""} ${r.role_in_series ?? ""}`.toLowerCase();
  let base = 2.6;
  if (/main\s*protagonist|lead\s*protagonist|main\s*lead|main\s*antagonist/.test(role)) base = 4.2;
  else if (/impactful|protagonist|legend/.test(role)) base = 3.7;
  else if (/anti-?hero|antagonist|anti-?villain|villain/.test(role)) base = 3.1;
  else if (/support|mentor|side/.test(role)) base = 2.4;
  else if (/cameo/.test(role)) base = 1.6;

  const statusEffect = journeyStatusImpact(r.status);

  const statAvg = r.statAverage != null && r.statAverage > 0 ? clampStat(r.statAverage) : 0;
  const statPeak = r.statPeak != null && r.statPeak > 0 ? clampStat(r.statPeak) : statAvg;
  const rawStatBoost = statAvg > 0 ? (statAvg / 100) * 0.6 + (statPeak / 100) * 0.15 : 0;

  const abilityCount = Math.max(0, r.abilityCount ?? 0);
  const gained = Math.max(0, r.gainedAbilities ?? 0);
  const rawAbilityBoost = Math.min(0.45, abilityCount * 0.09) + Math.min(0.25, gained * 0.12);

  const growth = (rawStatBoost + rawAbilityBoost) * statusEffect.dampenGrowth;
  const total = base + statusEffect.delta + growth;
  return Math.max(1, Math.min(5, Number(total.toFixed(2))));
}

/**
 * One journey point per season: season dossier role, status, stats, and
 * gained abilities override/enrich the series-level row so curves redraw per season.
 */
export function seasonJourneyRows(
  rows: JourneyRow[],
  stats: unknown,
  seriesTitles: Record<string, string> = {},
): JourneyRow[] {
  const dossier = readDossier(stats);
  const bySeries = new Map<string, JourneyRow>();
  for (const r of rows) bySeries.set(r.series_id ?? r.series?.id ?? r.id, r);
  const seasonKeys = Object.keys(dossier)
    .map((k) => k.split(":"))
    .filter(([, n]) => n && n !== "all" && Number(n) > 0) as [string, string][];
  for (const [sid] of seasonKeys)
    if (!bySeries.has(sid) && seriesTitles[sid])
      bySeries.set(sid, { id: sid, series: { id: sid, title: seriesTitles[sid] } });
  const out: JourneyRow[] = [];
  const seenAbilities = new Set<string>();
  let hasPriorSeason = false;

  for (const [sid, base] of bySeries) {
    const series = {
      ...base.series,
      id: sid,
      title: base.series?.title ?? seriesTitles[sid] ?? "?",
    };
    const seasons = seasonKeys
      .filter(([s]) => s === sid)
      .map(([, n]) => Number(n))
      .sort((a, b) => a - b);
    if (!seasons.length) {
      const rootRec =
        stats && typeof stats === "object" ? (stats as Record<string, unknown>) : undefined;
      const fallbackStats = summarizeDossierSeasonStats(dossier[`${sid}:all`] ?? dossier["all"]);
      const rootSummary =
        fallbackStats.statAverage !== undefined ? fallbackStats : summarizeStatBlock(rootRec);
      const statAverage = "statAverage" in rootSummary ? rootSummary.statAverage : rootSummary.avg;
      const statPeak = "statPeak" in rootSummary ? rootSummary.statPeak : rootSummary.peak;
      const baseAbilities = extractDossierAbilityCanons(dossier[`${sid}:all`] ?? dossier["all"]);
      out.push({
        ...base,
        series,
        ...(statAverage !== undefined ? { statAverage } : {}),
        ...(statPeak !== undefined ? { statPeak } : {}),
        ...(baseAbilities.size > 0 ? { abilityCount: baseAbilities.size } : {}),
      });
      continue;
    }
    for (const n of seasons) {
      const d = dossier[`${sid}:${n}`]!;
      if (d.roster === false) continue;
      const { statAverage, statPeak } = summarizeDossierSeasonStats(d);
      const currentAbilities = extractDossierAbilityCanons(d);
      let gainedAbilities = 0;
      if (hasPriorSeason) {
        for (const key of currentAbilities) {
          if (!seenAbilities.has(key)) gainedAbilities++;
        }
      }
      for (const key of currentAbilities) seenAbilities.add(key);
      hasPriorSeason = true;

      out.push({
        ...base,
        id: `${sid}:${n}`,
        season: n,
        series,
        arc_role: d.role ?? base.arc_role,
        role_in_series: d.role ?? base.role_in_series,
        status: d.status ?? base.status,
        ...(statAverage !== undefined ? { statAverage } : {}),
        ...(statPeak !== undefined ? { statPeak } : {}),
        ...(currentAbilities.size > 0 ? { abilityCount: currentAbilities.size } : {}),
        ...(gainedAbilities > 0 ? { gainedAbilities } : {}),
      });
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

export type JourneyTrendDirection = "up" | "down" | "steady";

export interface JourneyPointTrend {
  score: number;
  overallTrend: JourneyTrendDirection;
  statsTrend: JourneyTrendDirection | null;
  statusTrend: JourneyTrendDirection | null;
  scoreDeltaVsHistory: number;
  statsDeltaVsHistory: number | null;
  statusDeltaVsHistory: number;
  statusChanged: boolean;
  previousStatus: string | null;
}

export interface JourneyLineSummary {
  overallTrend: JourneyTrendDirection;
  statsTrend: JourneyTrendDirection | null;
  statusTrend: JourneyTrendDirection | null;
  scoreDeltaVsHistory: number;
  statsDeltaVsHistory: number | null;
  statusDeltaVsHistory: number;
  latestStatus: string | null;
  previousStatus: string | null;
  pointCount: number;
}

function normalizeStatusValue(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

/**
 * Evaluates each chronologically sorted journey point against the character's
 * overall progression history (prior timeline points) for impact score, ability
 * stats, and status transitions.
 */
export function evaluateJourneyPointTrends(
  rows: readonly JourneyRow[],
  order: readonly string[] = [],
): JourneyPointTrend[] {
  const sorted = [...rows].sort(
    (a, b) => timelineRank(a, [...order]) - timelineRank(b, [...order]),
  );

  const trends: JourneyPointTrend[] = [];
  const priorScores: number[] = [];
  const priorStatAverages: number[] = [];
  const priorStatusDeltas: number[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]!;
    const score = journeyScore(row);
    const statusImpact = journeyStatusImpact(row.status);
    const currentStatAvg =
      row.statAverage != null && row.statAverage > 0 ? clampStat(row.statAverage) : null;

    if (i === 0) {
      trends.push({
        score,
        overallTrend: "steady",
        statsTrend: null,
        statusTrend: null,
        scoreDeltaVsHistory: 0,
        statsDeltaVsHistory: null,
        statusDeltaVsHistory: 0,
        statusChanged: false,
        previousStatus: null,
      });
      priorScores.push(score);
      if (currentStatAvg !== null) priorStatAverages.push(currentStatAvg);
      priorStatusDeltas.push(statusImpact.delta);
      continue;
    }

    const prevRow = sorted[i - 1]!;
    const prevScore = priorScores[priorScores.length - 1]!;
    const priorMeanScore = priorScores.reduce((sum, v) => sum + v, 0) / priorScores.length;
    const scoreDeltaVsHistory = Number((score - priorMeanScore).toFixed(2));
    const scoreDeltaFromPrev = Number((score - prevScore).toFixed(2));

    let statsDeltaVsHistory: number | null = null;
    let statsTrend: JourneyTrendDirection | null = null;
    if (currentStatAvg !== null && priorStatAverages.length > 0) {
      const priorMeanStats =
        priorStatAverages.reduce((sum, v) => sum + v, 0) / priorStatAverages.length;
      statsDeltaVsHistory = Math.round(currentStatAvg - priorMeanStats);
      if (statsDeltaVsHistory >= 2) statsTrend = "up";
      else if (statsDeltaVsHistory <= -2) statsTrend = "down";
      else statsTrend = "steady";
    } else if ((row.gainedAbilities ?? 0) > 0) {
      statsTrend = "up";
    }

    const priorMeanStatusDelta =
      priorStatusDeltas.reduce((sum, v) => sum + v, 0) / priorStatusDeltas.length;
    const statusDeltaVsHistory = Number((statusImpact.delta - priorMeanStatusDelta).toFixed(2));
    const prevStatusNorm = normalizeStatusValue(prevRow.status);
    const currStatusNorm = normalizeStatusValue(row.status);
    const statusChanged = Boolean(
      prevStatusNorm && currStatusNorm && prevStatusNorm !== currStatusNorm,
    );

    let statusTrend: JourneyTrendDirection | null = null;
    if (priorStatusDeltas.length > 0) {
      if (statusDeltaVsHistory >= 0.1) statusTrend = "up";
      else if (statusDeltaVsHistory <= -0.1) statusTrend = "down";
      else if (statusChanged) {
        const stepDelta = statusImpact.delta - journeyStatusImpact(prevRow.status).delta;
        if (stepDelta >= 0.1) statusTrend = "up";
        else if (stepDelta <= -0.1) statusTrend = "down";
        else statusTrend = "steady";
      } else {
        statusTrend = "steady";
      }
    }

    let overallTrend: JourneyTrendDirection = "steady";
    if (scoreDeltaVsHistory >= 0.08) overallTrend = "up";
    else if (scoreDeltaVsHistory <= -0.08) overallTrend = "down";
    else if (scoreDeltaFromPrev >= 0.12) overallTrend = "up";
    else if (scoreDeltaFromPrev <= -0.12) overallTrend = "down";
    else if (statusTrend === "down" && statsTrend !== "up") overallTrend = "down";
    else if (statsTrend === "up" && statusTrend !== "down") overallTrend = "up";

    trends.push({
      score,
      overallTrend,
      statsTrend,
      statusTrend,
      scoreDeltaVsHistory,
      statsDeltaVsHistory,
      statusDeltaVsHistory,
      statusChanged,
      previousStatus: prevRow.status?.trim() || null,
    });

    priorScores.push(score);
    if (currentStatAvg !== null) priorStatAverages.push(currentStatAvg);
    priorStatusDeltas.push(statusImpact.delta);
  }

  return trends;
}

/**
 * Summarizes whether the character's latest progression node is trending upward,
 * downward, or steady compared to their overall progression history.
 */
export function summarizeJourneyLineTrend(
  rows: readonly JourneyRow[],
  order: readonly string[] = [],
): JourneyLineSummary {
  const sorted = [...rows].sort(
    (a, b) => timelineRank(a, [...order]) - timelineRank(b, [...order]),
  );
  const trends = evaluateJourneyPointTrends(sorted, order);
  const latest = trends[trends.length - 1];
  const latestRow = sorted[sorted.length - 1];

  if (!latest || sorted.length <= 1) {
    return {
      overallTrend: "steady",
      statsTrend: null,
      statusTrend: null,
      scoreDeltaVsHistory: 0,
      statsDeltaVsHistory: null,
      statusDeltaVsHistory: 0,
      latestStatus: latestRow?.status?.trim() || null,
      previousStatus: null,
      pointCount: sorted.length,
    };
  }

  return {
    overallTrend: latest.overallTrend,
    statsTrend: latest.statsTrend,
    statusTrend: latest.statusTrend,
    scoreDeltaVsHistory: latest.scoreDeltaVsHistory,
    statsDeltaVsHistory: latest.statsDeltaVsHistory,
    statusDeltaVsHistory: latest.statusDeltaVsHistory,
    latestStatus: latestRow?.status?.trim() || null,
    previousStatus: latest.previousStatus,
    pointCount: sorted.length,
  };
}
