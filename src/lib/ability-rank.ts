export type AbilityEmblemRank = 1 | 2 | 3 | 4 | 5;

export const ABILITY_RANKS: readonly AbilityEmblemRank[] = [1, 2, 3, 4, 5] as const;

export interface AbilityRankMetadata {
  rank: AbilityEmblemRank;
  roman: "I" | "II" | "III" | "IV" | "V";
  shortTitle: string;
  label: string;
  tagline: string;
  ringColor: string;
  glowRadiusPx: number;
}

export const ABILITY_RANK_META: Record<AbilityEmblemRank, AbilityRankMetadata> = {
  1: {
    rank: 1,
    roman: "I",
    shortTitle: "Initiate",
    label: "Rank I · Initiate",
    tagline: "Foundational mastery",
    ringColor: "#94a3b8",
    glowRadiusPx: 0,
  },
  2: {
    rank: 2,
    roman: "II",
    shortTitle: "Adept",
    label: "Rank II · Adept",
    tagline: "Focused refinement",
    ringColor: "#38bdf8",
    glowRadiusPx: 6,
  },
  3: {
    rank: 3,
    roman: "III",
    shortTitle: "Veteran",
    label: "Rank III · Veteran",
    tagline: "Seasoned command",
    ringColor: "#a855f7",
    glowRadiusPx: 10,
  },
  4: {
    rank: 4,
    roman: "IV",
    shortTitle: "Master",
    label: "Rank IV · Master",
    tagline: "High-tier authority",
    ringColor: "#d4af37",
    glowRadiusPx: 14,
  },
  5: {
    rank: 5,
    roman: "V",
    shortTitle: "Apex",
    label: "Rank V · Apex",
    tagline: "Pinnacle sovereignty",
    ringColor: "#ff2d2d",
    glowRadiusPx: 18,
  },
};

const RANK_ALIASES: Record<string, string> = {
  athenas_judgment: "athenas_judgement",
  athena_s_judgment: "athenas_judgement",
  athena_s_judgement: "athenas_judgement",
  blue_flame: "duskmoor_blue_flame",
  blade: "gladiokinesis",
  combat_training: "combat_specialist",
  qahr: "qahr_al_wujud",
  twin_blades: "blades",
  energy_manipulation: "energy",
};

export function normalizeAbilityKeyPure(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveAbilityAliasPure(s: string): string {
  const key = normalizeAbilityKeyPure(s);
  return RANK_ALIASES[key] ?? key;
}

/**
 * Parses a numeric rank/level into 1..5, returning undefined when absent or non-positive.
 * Clamps any positive number > 5 to 5 (DB schema constraint: CHECK level BETWEEN 1 AND 5).
 */
export function parseAbilityRank(value: unknown): AbilityEmblemRank | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  const rounded = Math.round(num);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as AbilityEmblemRank;
}

/** Always returns a valid 1..5 rank, falling back when input is absent or invalid. */
export function normalizeAbilityRank(
  value: unknown,
  fallback: AbilityEmblemRank = 1,
): AbilityEmblemRank {
  return parseAbilityRank(value) ?? fallback;
}

/** Clamps user/editor input to the Postgres `character_abilities.level` constraint (1..5). */
export function clampDbAbilityLevel(value: unknown): AbilityEmblemRank {
  return normalizeAbilityRank(value, 1);
}

/** Maps an ability's registry tier onto the 1..5 emblem rank scale. */
export function tierToIntrinsicRank(tier: string): AbilityEmblemRank {
  switch (tier.trim().toLowerCase()) {
    case "mythic":
      return 5;
    case "legendary":
      return 4;
    case "rare":
    case "exceptional":
    case "unique":
      return 3;
    case "ancient":
    case "standard":
      return 2;
    default:
      return 1;
  }
}

export function abilityRankMeta(rank: unknown): AbilityRankMetadata {
  return ABILITY_RANK_META[normalizeAbilityRank(rank, 1)];
}

export interface CharacterAbilityRankRow {
  ability_key: string;
  level: number;
  series_id?: string | null | undefined;
  season_number?: number | null | undefined;
  note?: string | null | undefined;
}

/**
 * Builds a lookup map of normalized ability key -> rank (1..5) from character_abilities rows.
 * Specificity precedence: exact (series + season) > series-wide > global; ties take higher rank.
 */
export function buildAbilityRankMap(
  rows: readonly CharacterAbilityRankRow[],
  options?: {
    seriesId?: string | null | undefined;
    seasonNumber?: number | null | undefined;
    includePriorSeasons?: boolean | undefined;
  },
): Record<string, AbilityEmblemRank | undefined> {
  const seriesId = options?.seriesId ?? null;
  const seasonNumber = options?.seasonNumber ?? null;
  const includePrior = !!options?.includePriorSeasons;

  const best = new Map<string, { score: number; rank: AbilityEmblemRank }>();

  for (const row of rows) {
    const canon = resolveAbilityAliasPure(row.ability_key);
    const rawKey = normalizeAbilityKeyPure(row.ability_key);
    if (!canon && !rawKey) continue;

    if (seriesId && row.series_id && row.series_id !== seriesId) continue;
    if (seasonNumber !== null && row.season_number != null) {
      if (row.season_number > seasonNumber) continue;
      if (!includePrior && row.season_number !== seasonNumber) continue;
    }

    let score = 1;
    if (seriesId && row.series_id === seriesId) score += 2;
    if (seasonNumber !== null && row.season_number != null) {
      if (row.season_number === seasonNumber) score += 4;
      else if (row.season_number < seasonNumber) score += 1 + row.season_number * 0.01;
    }

    const rank = clampDbAbilityLevel(row.level);
    const prev = best.get(canon);
    if (!prev || score > prev.score || (score === prev.score && rank > prev.rank)) {
      best.set(canon, { score, rank });
    }
  }

  const out: Record<string, AbilityEmblemRank | undefined> = {};
  for (const [k, v] of best) {
    out[k] = v.rank;
  }
  return out;
}

export function resolveAssignedAbilityRank(
  name: string,
  rankMap: Record<string, number | undefined> | undefined,
): AbilityEmblemRank | undefined {
  if (!rankMap) return undefined;
  const rawKey = normalizeAbilityKeyPure(name);
  const canon = resolveAbilityAliasPure(name);
  return parseAbilityRank(rankMap[rawKey] ?? rankMap[canon]);
}

export interface MergedCharacterAbility {
  key: string;
  level: AbilityEmblemRank;
  note?: string | undefined;
  isAssigned: boolean;
}

/**
 * Deduplicates and merges `character_abilities` rows with string `entity.abilities` entries.
 * Respects canonical aliases (e.g. `twin_blades` vs `blades`) so shared powers are never shown twice.
 */
export function mergeCharacterAbilityList(
  rows: readonly CharacterAbilityRankRow[],
  entityAbilities: readonly string[] | null | undefined,
  options?: {
    seriesId?: string | null | undefined;
    seasonNumber?: number | null | undefined;
    allowedKeys?: readonly string[] | null | undefined;
    includePriorSeasons?: boolean | undefined;
  },
): MergedCharacterAbility[] {
  const allowedSet =
    options?.allowedKeys !== undefined && options.allowedKeys !== null
      ? new Set(options.allowedKeys.map(resolveAbilityAliasPure))
      : null;

  const seriesId = options?.seriesId ?? null;
  const seasonNumber = options?.seasonNumber ?? null;
  const includePrior = !!options?.includePriorSeasons;
  const items = new Map<string, MergedCharacterAbility & { score: number }>();

  for (const row of rows) {
    const canon = resolveAbilityAliasPure(row.ability_key);
    if (!canon) continue;
    if (allowedSet && !allowedSet.has(canon)) continue;
    if (seriesId && row.series_id && row.series_id !== seriesId) continue;
    if (seasonNumber !== null && row.season_number != null) {
      if (row.season_number > seasonNumber) continue;
      if (!includePrior && row.season_number !== seasonNumber) continue;
    }

    let score = 1;
    if (seriesId && row.series_id === seriesId) score += 2;
    if (seasonNumber !== null && row.season_number != null) {
      if (row.season_number === seasonNumber) score += 4;
      else if (row.season_number < seasonNumber) score += 1 + row.season_number * 0.01;
    }

    const level = clampDbAbilityLevel(row.level);
    const prev = items.get(canon);
    if (!prev || score > prev.score || (score === prev.score && level > prev.level)) {
      items.set(canon, {
        key: row.ability_key,
        level,
        note: row.note ?? undefined,
        isAssigned: true,
        score,
      });
    }
  }

  for (const raw of entityAbilities ?? []) {
    const canon = resolveAbilityAliasPure(raw);
    if (!canon) continue;
    if (allowedSet && !allowedSet.has(canon)) continue;
    if (!items.has(canon)) {
      items.set(canon, {
        key: raw,
        level: 1,
        isAssigned: false,
        score: 0,
      });
    }
  }

  return [...items.values()]
    .sort((a, b) => Number(b.isAssigned) - Number(a.isAssigned) || b.level - a.level)
    .map(({ score: _score, ...rest }) => rest);
}

export interface AbilityProgressionStep {
  id: string;
  seriesId: string | null;
  seriesTitle: string;
  seasonNumber: number | null;
  seasonLabel: string;
  level: AbilityEmblemRank;
  note?: string | undefined;
}

export interface AbilityProgressionGroup {
  canonKey: string;
  displayKey: string;
  steps: AbilityProgressionStep[];
  minLevel: AbilityEmblemRank;
  maxLevel: AbilityEmblemRank;
}

/**
 * Groups character ability assignments by canonical ability key and sorts each ability's
 * steps chronologically from Global base -> Series -> Season 1..N so multi-season mastery
 * growth (e.g. Zayn S3 Lv.II -> S5 Lv.V) renders consistently across all UI modes.
 */
export function groupCharacterAbilityProgression(
  rows: readonly (CharacterAbilityRankRow & { id?: string | undefined })[],
  seriesTitleMap?: ReadonlyMap<string, string> | Record<string, string>,
  seasonNamesMap?: ReadonlyMap<string, readonly string[]>,
): AbilityProgressionGroup[] {
  const resolveTitle = (seriesId: string | null | undefined): string => {
    if (!seriesId) return "Base / Global";
    if (!seriesTitleMap) return "Series";
    if (seriesTitleMap instanceof Map) return seriesTitleMap.get(seriesId) ?? "Series";
    const rec = seriesTitleMap as Record<string, string>;
    return rec[seriesId] ?? "Series";
  };

  const groups = new Map<string, { displayKey: string; steps: AbilityProgressionStep[] }>();

  rows.forEach((row, idx) => {
    const canon = resolveAbilityAliasPure(row.ability_key);
    if (!canon) return;
    const seriesId = row.series_id ?? null;
    const seasonNumber = row.season_number ?? null;
    const seriesTitle = resolveTitle(seriesId);
    const customSeasonName =
      seriesId && seasonNumber != null
        ? seasonNamesMap?.get(seriesId)?.[seasonNumber - 1]
        : undefined;
    const seasonLabel = seriesId
      ? seasonNumber != null
        ? customSeasonName
          ? `${customSeasonName} (S${seasonNumber})`
          : `S${seasonNumber}`
        : "Series-wide"
      : "Global";

    const step: AbilityProgressionStep = {
      id: row.id ?? `${canon}:${seriesId ?? "global"}:${seasonNumber ?? "all"}:${idx}`,
      seriesId,
      seriesTitle,
      seasonNumber,
      seasonLabel,
      level: clampDbAbilityLevel(row.level),
      note: row.note ?? undefined,
    };

    const existing = groups.get(canon);
    if (existing) {
      existing.steps.push(step);
    } else {
      groups.set(canon, { displayKey: row.ability_key, steps: [step] });
    }
  });

  const out: AbilityProgressionGroup[] = [];
  for (const [canonKey, group] of groups) {
    const sorted = [...group.steps].sort((a, b) => {
      const aScoped = a.seriesId ? 1 : 0;
      const bScoped = b.seriesId ? 1 : 0;
      if (aScoped !== bScoped) return aScoped - bScoped;
      if (a.seriesTitle !== b.seriesTitle) return a.seriesTitle.localeCompare(b.seriesTitle);
      const aSeason = a.seasonNumber ?? 0;
      const bSeason = b.seasonNumber ?? 0;
      if (aSeason !== bSeason) return aSeason - bSeason;
      return a.level - b.level;
    });
    const levels = sorted.map((s) => s.level);
    out.push({
      canonKey,
      displayKey: group.displayKey,
      steps: sorted,
      minLevel: Math.min(...levels) as AbilityEmblemRank,
      maxLevel: Math.max(...levels) as AbilityEmblemRank,
    });
  }

  return out.sort(
    (a, b) =>
      b.maxLevel - a.maxLevel ||
      b.steps.length - a.steps.length ||
      a.canonKey.localeCompare(b.canonKey),
  );
}
