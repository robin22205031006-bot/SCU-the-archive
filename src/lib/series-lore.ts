import { z } from "zod";

export const seasonTitlesInput = z.object({
  seriesId: z.string().uuid(),
  titles: z.array(z.string().trim().max(200)).max(100),
});
export const seriesQuestionInput = z.object({
  seriesId: z.string().uuid(),
  season: z.number().int().min(1).max(100).nullable(),
  question: z.string().trim().min(1).max(2000),
});
export function savedSeasonTitles(titles: string[]) {
  return titles.map((title, i) => title.trim() || `Season ${i + 1}`);
}

/** Only explicitly labelled lore is eligible; unscoped material never fills a season gap. */
export function scopeLoreText(text: string, seriesTitle: string, season: number | null) {
  const title = seriesTitle.toLowerCase().replace(/^the\s+/, "");
  const matchesSeries = (part: string) => part.toLowerCase().includes(title);
  if (season === null) return matchesSeries(text) ? text : "";
  const parts = text.split(/(?=\b(?:S\d+|Season\s+\d+)\b)/i);
  const selected = parts.filter(part => {
    const number = part.match(/^(?:S|Season\s+)(\d+)\b/i)?.[1];
    return Number(number) === season;
  });
  // Bare S1 labels in archive notes refer to the principal Sentinels saga.
  return selected.filter(part => matchesSeries(part) || (title === "sentinels" && !/redline|bloodlines?|divine beast/i.test(part))).join("\n");
}
export function loreQuestionsBlocked(mask: unknown) {
  if (!mask || typeof mask !== "object") return false;
  const settings = mask as Record<string, unknown>;
  return settings["characters"] === true || settings["abilities"] === true || settings["archive"] === true;
}

export type LoreEvidence = { label: string; text: string };
export function rankLoreEvidence(evidence: LoreEvidence[], question: string) {
  const words = question.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return evidence.filter(e => e.text.trim()).map((entry, index) => ({
    entry, index, score: words.reduce((sum, word) => sum + (entry.text.toLowerCase().includes(word) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 24).map(e => e.entry);
}