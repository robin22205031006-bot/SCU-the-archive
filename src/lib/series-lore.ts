import { z } from "zod";
import { seriesSeasonNames } from "@/lib/series-seasons";

export const seasonTitlesInput = z.object({
  seriesId: z.string().uuid(),
  titles: z.array(z.string().trim().max(200)).max(100),
});
export const deleteSeriesInput = z.object({
  seriesId: z.string().uuid(),
});
export const deleteSeasonInput = z.object({
  seriesId: z.string().uuid(),
  season: z.number().int().min(1).max(100),
});
export const seriesQuestionInput = z.object({
  seriesId: z.string().uuid(),
  season: z.number().int().min(1).max(100).nullable(),
  question: z.string().trim().min(1).max(2000),
});
export function savedSeasonTitles(titles: string[]) {
  return titles.map((title, i) => title.trim() || `Season ${i + 1}`);
}

/** Remove one 1-based season from a series, keeping remaining season titles aligned. */
export function removeSeasonAt(
  series: { season_count: number | null; season_names: string[] },
  season: number,
) {
  const names = seriesSeasonNames(series);
  if (!Number.isInteger(season) || season < 1 || season > names.length) return null;
  const removedTitle = names[season - 1] ?? `Season ${season}`;
  const nextNames = names.filter((_, i) => i !== season - 1);
  return {
    season_count: nextNames.length,
    season_names: nextNames,
    removedTitle,
  };
}

/** Drop a deleted season's dossier entry and shift higher season numbers down by one. */
export function removeSeasonFromDossier(stats: unknown, seriesId: string, season: number) {
  const base =
    stats && typeof stats === "object" && !Array.isArray(stats)
      ? ({ ...(stats as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const rawDossier = base["dossier"];
  if (!rawDossier || typeof rawDossier !== "object" || Array.isArray(rawDossier)) {
    return { changed: false, nextStats: base };
  }
  const prefix = `${seriesId}:`;
  let changed = false;
  const nextDossier: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawDossier as Record<string, unknown>)) {
    if (!key.startsWith(prefix)) {
      nextDossier[key] = value;
      continue;
    }
    const suffix = key.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) {
      nextDossier[key] = value;
      continue;
    }
    const n = Number(suffix);
    if (n === season) {
      changed = true;
      continue;
    }
    if (n > season) {
      changed = true;
      nextDossier[`${prefix}${n - 1}`] = value;
      continue;
    }
    nextDossier[key] = value;
  }
  return {
    changed,
    nextStats: changed ? { ...base, dossier: nextDossier } : base,
  };
}

/** Remove every dossier entry scoped to a deleted series. */
export function removeSeriesFromDossier(stats: unknown, seriesId: string) {
  const base =
    stats && typeof stats === "object" && !Array.isArray(stats)
      ? ({ ...(stats as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const rawDossier = base["dossier"];
  if (!rawDossier || typeof rawDossier !== "object" || Array.isArray(rawDossier)) {
    return { changed: false, nextStats: base };
  }
  const prefix = `${seriesId}:`;
  let changed = false;
  const nextDossier: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawDossier as Record<string, unknown>)) {
    if (key === seriesId || key.startsWith(prefix)) {
      changed = true;
      continue;
    }
    nextDossier[key] = value;
  }
  return {
    changed,
    nextStats: changed ? { ...base, dossier: nextDossier } : base,
  };
}

/** Remove a deleted series id from app_settings series_order arrays. */
export function removeSeriesFromOrder(order: unknown, seriesId: string) {
  const base =
    order && typeof order === "object" && !Array.isArray(order)
      ? ({ ...(order as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  let changed = false;
  for (const field of ["release", "story"] as const) {
    const list = base[field];
    if (Array.isArray(list) && list.includes(seriesId)) {
      base[field] = list.filter((id) => id !== seriesId);
      changed = true;
    }
  }
  return { changed, nextValue: base };
}

/** Remove a deleted series entry from app_settings series_styles. */
export function removeSeriesFromStyles(styles: unknown, seriesId: string) {
  const base =
    styles && typeof styles === "object" && !Array.isArray(styles)
      ? ({ ...(styles as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  if (!Object.prototype.hasOwnProperty.call(base, seriesId)) {
    return { changed: false, nextValue: base };
  }
  const nextValue = { ...base };
  delete nextValue[seriesId];
  return { changed: true, nextValue };
}

/** Only explicitly labelled lore is eligible; unscoped material never fills a season gap. */
export function scopeLoreText(text: string, seriesTitle: string, season: number | null) {
  const title = seriesTitle.toLowerCase().replace(/^the\s+/, "");
  const matchesSeries = (part: string) => part.toLowerCase().includes(title);
  if (season === null) return matchesSeries(text) ? text : "";
  const markers = [
    ...text.matchAll(
      /\b(?:(The Sentinels|Sentinels|Redline|Bloodlines?|Divine Beast)\s+)?(?:S|Season\s+)(\d+)\b/gi,
    ),
  ];
  let activeSeries = "sentinels";
  const selected: string[] = [];
  markers.forEach((marker, i) => {
    if (marker[1])
      activeSeries = marker[1]
        .toLowerCase()
        .replace(/^the\s+/, "")
        .replace(/^bloodlines$/, "bloodline");
    if (Number(marker[2]) !== season || activeSeries !== title.replace(/^bloodlines$/, "bloodline"))
      return;
    const part = text.slice(marker.index, markers[i + 1]?.index ?? text.length);
    selected.push(part);
  });
  return selected.join("\n");
}
export function loreQuestionsBlocked(mask: unknown) {
  if (!mask || typeof mask !== "object") return false;
  const settings = mask as Record<string, unknown>;
  return (
    settings["characters"] === true ||
    settings["abilities"] === true ||
    settings["archive"] === true
  );
}

export type LoreEvidence = { label: string; text: string };
export function rankLoreEvidence(evidence: LoreEvidence[], question: string) {
  const words = question.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return evidence
    .filter((e) => e.text.trim())
    .map((entry, index) => ({
      entry,
      index,
      score: words.reduce(
        (sum, word) => sum + (entry.text.toLowerCase().includes(word) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 24)
    .map((e) => e.entry);
}
