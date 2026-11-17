import { COMBAT_STATS, getCombatStats } from "@/lib/combat-stats";
import {
  clampDbAbilityLevel,
  resolveAbilityAliasPure,
  type AbilityEmblemRank,
  type CharacterAbilityRankRow,
} from "@/lib/ability-rank";

export const DOSSIER_ROLES = [
  "Main Lead",
  "Main Antagonist",
  "Support",
  "Anti-Hero",
  "Anti-Villain",
  "Cameo",
] as const;

export const DOSSIER_STATUSES = ["Alive", "Dead", "Missing", "Presumed Dead", "Sealed"] as const;

export const DOSSIER_GENDERS = ["Male", "Female"] as const;

export const NEXUS_STATS = [
  ...COMBAT_STATS,
  { key: "wisdom", label: "Wisdom" },
  { key: "vitality", label: "Vitality" },
] as const;

export type SeasonDossier = {
  story?: string;
  role?: string;
  impact?: string;
  codename?: string;
  roster?: boolean;
  status?: string;
  gender?: string;
  weapons?: string[];
  philosophy?: string;
  bloodline?: string;
  organizations?: string[];
  abilityKeys?: string[];
  stats?: Record<string, number>;
  abilityStats?: Record<string, Record<string, number>>;
};

export type DossierMap = Record<string, SeasonDossier>;

export function readDossier(stats: unknown): DossierMap {
  if (!stats || typeof stats !== "object") return {};
  const raw = (stats as Record<string, unknown>)["dossier"];
  return raw && typeof raw === "object" ? (raw as DossierMap) : {};
}

export function clampStat(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

export function resolveNexusStats(
  stats: unknown,
  seasonKey: string | null,
  ability: string | null,
) {
  const base = stats && typeof stats === "object" ? (stats as Record<string, unknown>) : {};
  const dossier = readDossier(stats);
  const selected = dossier[seasonKey ?? "all"] ?? {};
  // An ability without a recorded profile must not masquerade as character stats.
  const source = ability
    ? (selected.abilityStats?.[ability] ??
      selected.abilityStats?.[resolveAbilityAliasPure(ability)] ??
      {})
    : (selected.stats ?? (seasonKey ? {} : { ...base, ...getCombatStats(stats) }));
  return NEXUS_STATS.map(({ key, label }) => ({ key, label, value: clampStat(source[key]) }));
}

export interface PreviousSeasonStats {
  seasonNumber: number;
  seasonKey: string;
  label: string;
  values: Record<(typeof NEXUS_STATS)[number]["key"], number>;
}

function hasPositiveNexusStat(source: Record<string, unknown> | undefined): boolean {
  if (!source) return false;
  return NEXUS_STATS.some(({ key }) => clampStat(source[key]) > 0);
}

/**
 * Finds the most recent prior season in the same series that has recorded
 * character or ability stats (> 0) for the given stats profile.
 */
export function resolvePreviousSeasonStats(
  stats: unknown,
  seriesId: string | null | undefined,
  seasonNumber: number | null | undefined,
  ability: string | null = null,
  seasonNames?: readonly string[] | null,
): PreviousSeasonStats | null {
  if (!seriesId || seasonNumber == null || seasonNumber <= 1) return null;
  const dossier = readDossier(stats);
  const alias = ability ? resolveAbilityAliasPure(ability) : "";

  for (let prev = seasonNumber - 1; prev >= 1; prev--) {
    const prevKey = `${seriesId}:${prev}`;
    const entry = dossier[prevKey];
    if (!entry) continue;
    const source = ability
      ? (entry.abilityStats?.[ability] ?? (alias ? entry.abilityStats?.[alias] : undefined))
      : entry.stats;
    if (!hasPositiveNexusStat(source)) continue;

    const values = Object.fromEntries(
      NEXUS_STATS.map(({ key }) => [key, clampStat(source?.[key])]),
    ) as Record<(typeof NEXUS_STATS)[number]["key"], number>;

    const customName = seasonNames?.[prev - 1]?.trim();
    const label = customName || `Season ${prev}`;
    return {
      seasonNumber: prev,
      seasonKey: prevKey,
      label,
      values,
    };
  }

  return null;
}

export function highestStatRadius(values: { value: number }[]): number {
  return 46 + (52 * Math.max(0, ...values.map((s) => clampStat(s.value)))) / 100;
}

export interface SeasonCompareOption {
  key: string;
  label: string;
  shortLabel: string;
  seriesId: string | null;
  seasonNumber: number | null;
  hasStats: boolean;
}

export interface SeasonStatDelta {
  key: (typeof NEXUS_STATS)[number]["key"];
  label: string;
  valueA: number;
  valueB: number;
  delta: number;
}

export interface SeasonStatComparisonResult {
  statsA: Array<{ key: (typeof NEXUS_STATS)[number]["key"]; label: string; value: number }>;
  statsB: Array<{ key: (typeof NEXUS_STATS)[number]["key"]; label: string; value: number }>;
  combatA: Record<(typeof COMBAT_STATS)[number]["key"], number>;
  combatB: Record<(typeof COMBAT_STATS)[number]["key"], number>;
  deltas: SeasonStatDelta[];
  summary: {
    avgA: number;
    avgB: number;
    avgDelta: number;
    peakGain: SeasonStatDelta | null;
    peakDrop: SeasonStatDelta | null;
  };
}

function hasNumericRecord(rec: unknown): boolean {
  if (!rec || typeof rec !== "object") return false;
  return Object.values(rec as Record<string, unknown>).some((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  });
}

function hasDossierStats(entry: SeasonDossier | undefined): boolean {
  if (!entry) return false;
  if (hasNumericRecord(entry.stats)) return true;
  if (entry.abilityStats && typeof entry.abilityStats === "object") {
    return Object.values(entry.abilityStats).some((ab) => hasNumericRecord(ab));
  }
  return false;
}

function compactSeriesTitle(title: string): string {
  const clean = title.replace(/^the\s+/i, "").trim();
  return clean.length > 16 ? `${clean.slice(0, 15).trimEnd()}…` : clean;
}

export function buildSeasonCompareOptions({
  stats,
  seriesList,
  memberships,
}: {
  stats: unknown;
  seriesList?: ReadonlyArray<{
    id: string;
    title: string;
    season_count?: number | null;
    season_names?: string[] | null;
  }> | null;
  memberships?: ReadonlyArray<{ series_id?: string | null }> | null;
}): SeasonCompareOption[] {
  const dossier = readDossier(stats);
  const baseStats = getCombatStats(stats);
  const rootRec = stats && typeof stats === "object" ? (stats as Record<string, unknown>) : {};
  const hasRootExtra =
    (Number.isFinite(Number(rootRec["wisdom"])) && Number(rootRec["wisdom"]) > 0) ||
    (Number.isFinite(Number(rootRec["vitality"])) && Number(rootRec["vitality"]) > 0);
  const hasAllStats =
    hasDossierStats(dossier["all"]) ||
    (!!baseStats && Object.values(baseStats).some((v) => v > 0)) ||
    hasRootExtra;

  const options: SeasonCompareOption[] = [
    {
      key: "all",
      label: "All seasons (Base)",
      shortLabel: "Base",
      seriesId: null,
      seasonNumber: null,
      hasStats: hasAllStats,
    },
  ];
  const seenKeys = new Set<string>(["all"]);

  const linkedSeriesIds = new Set(
    (memberships ?? []).map((m) => m.series_id).filter((id): id is string => !!id),
  );
  const dossierKeys = Object.keys(dossier);

  for (const s of seriesList ?? []) {
    const isLinked =
      linkedSeriesIds.has(s.id) || dossierKeys.some((key) => key.startsWith(`${s.id}:`));
    if (!isLinked) continue;

    const names = s.season_names ?? [];
    const count = Math.max(s.season_count ?? 0, names.length, 1);
    const shortTitle = compactSeriesTitle(s.title);

    const seriesAllKey = `${s.id}:all`;
    if (dossier[seriesAllKey] && !seenKeys.has(seriesAllKey)) {
      seenKeys.add(seriesAllKey);
      options.push({
        key: seriesAllKey,
        label: `${s.title} · All seasons`,
        shortLabel: `${shortTitle} · All`,
        seriesId: s.id,
        seasonNumber: null,
        hasStats: hasDossierStats(dossier[seriesAllKey]),
      });
    }

    for (let n = 1; n <= count; n++) {
      const key = `${s.id}:${n}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const seasonName = names[n - 1] || `Season ${n}`;
      const shortSeason = seasonName.length <= 8 ? seasonName : `S${n}`;
      options.push({
        key,
        label: `${s.title} · ${seasonName}`,
        shortLabel: `${shortTitle} · ${shortSeason}`,
        seriesId: s.id,
        seasonNumber: n,
        hasStats: hasDossierStats(dossier[key]),
      });
    }
  }

  // Include any dossier-only season keys (e.g. legacy series IDs or standalone test fixtures)
  const seriesById = new Map((seriesList ?? []).map((s) => [s.id, s]));
  for (const key of dossierKeys) {
    if (seenKeys.has(key)) continue;
    const colon = key.indexOf(":");
    if (colon <= 0) continue;
    seenKeys.add(key);
    const sid = key.slice(0, colon);
    const part = key.slice(colon + 1);
    const seriesMeta = seriesById.get(sid);
    const title = seriesMeta?.title ?? sid;
    const shortTitle = compactSeriesTitle(title);
    const num = Number(part);
    const isNum = part !== "all" && Number.isInteger(num) && num > 0;
    const seasonName = isNum
      ? (seriesMeta?.season_names?.[num - 1] ?? `Season ${num}`)
      : "All seasons";
    const shortSeason = isNum ? (seasonName.length <= 8 ? seasonName : `S${num}`) : "All";
    options.push({
      key,
      label: `${title} · ${seasonName}`,
      shortLabel: `${shortTitle} · ${shortSeason}`,
      seriesId: sid,
      seasonNumber: isNum ? num : null,
      hasStats: hasDossierStats(dossier[key]),
    });
  }

  return options;
}

export function resolveSeasonCombatStats(
  stats: unknown,
  seasonKey: string | null,
  ability: string | null = null,
) {
  const normalizedKey = !seasonKey || seasonKey === "all" ? null : seasonKey;
  const resolved = resolveNexusStats(stats, normalizedKey, ability);
  const byKey = Object.fromEntries(resolved.map((s) => [s.key, s.value])) as Record<string, number>;
  return {
    power: byKey["power"] ?? 0,
    agility: byKey["agility"] ?? 0,
    tactical_iq: byKey["tactical_iq"] ?? 0,
    clan_mastery: byKey["clan_mastery"] ?? 0,
    weapon_proficiency: byKey["weapon_proficiency"] ?? 0,
  };
}

export function resolveSeasonStatComparison(
  stats: unknown,
  seasonKeyA: string | null,
  seasonKeyB: string | null,
  ability: string | null = null,
): SeasonStatComparisonResult {
  const keyA = !seasonKeyA || seasonKeyA === "all" ? null : seasonKeyA;
  const keyB = !seasonKeyB || seasonKeyB === "all" ? null : seasonKeyB;
  const statsA = resolveNexusStats(stats, keyA, ability);
  const statsB = resolveNexusStats(stats, keyB, ability);
  const combatA = resolveSeasonCombatStats(stats, keyA, ability);
  const combatB = resolveSeasonCombatStats(stats, keyB, ability);

  const deltas: SeasonStatDelta[] = NEXUS_STATS.map((s, i) => {
    const valueA = statsA[i]?.value ?? 0;
    const valueB = statsB[i]?.value ?? 0;
    return {
      key: s.key,
      label: s.label,
      valueA,
      valueB,
      delta: valueB - valueA,
    };
  });

  const sumA = deltas.reduce((acc, d) => acc + d.valueA, 0);
  const sumB = deltas.reduce((acc, d) => acc + d.valueB, 0);
  const avgA = Math.round(sumA / Math.max(1, deltas.length));
  const avgB = Math.round(sumB / Math.max(1, deltas.length));
  const avgDelta = avgB - avgA;

  let peakGain: SeasonStatDelta | null = null;
  let peakDrop: SeasonStatDelta | null = null;
  for (const d of deltas) {
    if (d.delta > 0 && (!peakGain || d.delta > peakGain.delta)) {
      peakGain = d;
    }
    if (d.delta < 0 && (!peakDrop || d.delta < peakDrop.delta)) {
      peakDrop = d;
    }
  }

  return {
    statsA,
    statsB,
    combatA,
    combatB,
    deltas,
    summary: {
      avgA,
      avgB,
      avgDelta,
      peakGain,
      peakDrop,
    },
  };
}

export function nexusRole(
  role: string,
  masked = false,
): "hero" | "villain" | "antihero" | "support" | "neutral" {
  if (masked) return "neutral";
  if (/anti.?hero|anti.?villain/i.test(role)) return "antihero";
  if (/antagonist|villain/i.test(role)) return "villain";
  if (/protagonist|hero|main\s*lead|\blead\b/i.test(role)) return "hero";
  if (/support|mentor|ally/i.test(role)) return "support";
  return "neutral";
}

export function resolveDossierMeta(
  entity: {
    status?: string | null;
    role?: string | null;
    category?: string | null;
    alias?: string | null;
    description?: string | null;
    stats?: unknown;
  },
  seriesId?: string | null,
  seasonNumber?: number | null,
  membership?: {
    status?: string | null;
    role_in_series?: string | null;
    arc_role?: string | null;
  } | null,
) {
  const base =
    entity.stats && typeof entity.stats === "object"
      ? (entity.stats as Record<string, unknown>)
      : {};
  const dossier = readDossier(entity.stats);
  const seasonKey = seriesId ? `${seriesId}:${seasonNumber ?? "all"}` : "all";
  const seriesAll = seriesId ? (dossier[`${seriesId}:all`] ?? {}) : {};
  const allDossier = dossier["all"] ?? {};
  const sd = dossier[seasonKey] ?? {};

  const status =
    (sd.status?.trim() || undefined) ??
    seriesNumberFallback(dossier, seriesId, seasonNumber, "status") ??
    (membership?.status?.trim() || undefined) ??
    (allDossier.status?.trim() || undefined) ??
    entity.status ??
    "Alive";

  const role =
    (sd.role?.trim() || undefined) ??
    (membership?.arc_role?.trim() || undefined) ??
    (membership?.role_in_series?.trim() || undefined) ??
    (allDossier.role?.trim() || undefined) ??
    entity.role ??
    entity.category ??
    "";

  const baseGender = typeof base["gender"] === "string" ? base["gender"] : "";
  const gender = sd.gender ?? seriesAll.gender ?? allDossier.gender ?? baseGender;

  const baseWeapons = Array.isArray(base["weapons"])
    ? (base["weapons"] as unknown[]).filter((w): w is string => typeof w === "string" && !!w.trim())
    : [];
  const weapons =
    sd.weapons !== undefined
      ? sd.weapons.filter(Boolean)
      : seriesAll.weapons !== undefined
        ? seriesAll.weapons.filter(Boolean)
        : allDossier.weapons !== undefined
          ? allDossier.weapons.filter(Boolean)
          : baseWeapons;

  const codename = sd.codename ?? allDossier.codename ?? entity.alias ?? "";
  const baseBloodline = typeof base["bloodline"] === "string" ? base["bloodline"] : "";
  const bloodline = sd.bloodline ?? seriesAll.bloodline ?? allDossier.bloodline ?? baseBloodline;

  return {
    sd,
    status,
    role,
    gender,
    weapons,
    codename,
    bloodline,
    story: sd.story ?? "",
    impact: sd.impact ?? "",
    philosophy: sd.philosophy ?? "",
    organizations: sd.organizations,
  };
}

function seriesNumberFallback(
  dossier: DossierMap,
  seriesId: string | null | undefined,
  seasonNumber: number | null | undefined,
  field: "status",
): string | undefined {
  if (!seriesId || seasonNumber == null) return undefined;
  const seriesAll = dossier[`${seriesId}:all`]?.[field]?.trim();
  return seriesAll || undefined;
}

export interface ResolvedSeasonAbility {
  canonKey: string;
  abilityKey: string;
  level: AbilityEmblemRank;
  baseLevel: AbilityEmblemRank;
  origin: "carried" | "newly_acquired" | "base";
  sourceSeason: number | null;
  hasSeasonOverride: boolean;
  excluded: boolean;
  note: string;
}

/**
 * Resolves a character's abilities for a given Series + Season (or "All seasons" when null).
 * - Preserves carry-over from earlier seasons (season_number < activeSeason), series-wide rows,
 *   global rows, and base entity.abilities.
 * - Never includes abilities locked exclusively to future/other seasons or another series.
 * - Honors season-level rank overrides and season removals via `allowedAbilityKeys`.
 */
export function resolveCharacterSeasonAbilities({
  entityAbilities,
  rows,
  seriesId,
  seasonNumber,
  allowedAbilityKeys,
}: {
  entityAbilities?: readonly string[] | null | undefined;
  rows: readonly CharacterAbilityRankRow[];
  seriesId?: string | null | undefined;
  seasonNumber?: number | null | undefined;
  allowedAbilityKeys?: readonly string[] | null | undefined;
}): {
  carriedOver: ResolvedSeasonAbility[];
  newlyAcquired: ResolvedSeasonAbility[];
  active: ResolvedSeasonAbility[];
} {
  const allowedSet =
    allowedAbilityKeys !== undefined && allowedAbilityKeys !== null
      ? new Set(allowedAbilityKeys.map((k) => resolveAbilityAliasPure(k)).filter(Boolean))
      : null;

  // Map canonKey -> best prior/base source and optional exact-season override row
  type PriorSource = {
    abilityKey: string;
    level: AbilityEmblemRank;
    origin: "carried" | "base";
    sourceSeason: number | null;
    note: string;
    priority: number;
  };
  type ExactSource = {
    abilityKey: string;
    level: AbilityEmblemRank;
    note: string;
  };

  const priorMap = new Map<string, PriorSource>();
  const exactMap = new Map<string, ExactSource>();

  const considerPrior = (canon: string, next: PriorSource) => {
    const prev = priorMap.get(canon);
    if (
      !prev ||
      next.priority > prev.priority ||
      (next.priority === prev.priority && next.level > prev.level)
    ) {
      priorMap.set(canon, next);
    }
  };

  if (seriesId && seasonNumber != null) {
    for (const r of rows) {
      const canon = resolveAbilityAliasPure(r.ability_key);
      if (!canon) continue;

      if (r.series_id === seriesId) {
        if (r.season_number === seasonNumber) {
          const lvl = clampDbAbilityLevel(r.level);
          const prev = exactMap.get(canon);
          if (!prev || lvl >= prev.level) {
            exactMap.set(canon, {
              abilityKey: r.ability_key,
              level: lvl,
              note: r.note ?? "",
            });
          }
        } else if (r.season_number != null && r.season_number < seasonNumber) {
          considerPrior(canon, {
            abilityKey: r.ability_key,
            level: clampDbAbilityLevel(r.level),
            origin: "carried",
            sourceSeason: r.season_number,
            note: r.note ?? "",
            priority: 300 + r.season_number,
          });
        } else if (r.season_number == null) {
          considerPrior(canon, {
            abilityKey: r.ability_key,
            level: clampDbAbilityLevel(r.level),
            origin: "carried",
            sourceSeason: null,
            note: r.note ?? "",
            priority: 200,
          });
        }
        // r.season_number > seasonNumber is ignored (future season)
      } else if (r.series_id == null && r.season_number == null) {
        considerPrior(canon, {
          abilityKey: r.ability_key,
          level: clampDbAbilityLevel(r.level),
          origin: "base",
          sourceSeason: null,
          note: r.note ?? "",
          priority: 100,
        });
      }
    }

    for (const raw of entityAbilities ?? []) {
      const canon = resolveAbilityAliasPure(raw);
      if (!canon) continue;
      if (!priorMap.has(canon)) {
        considerPrior(canon, {
          abilityKey: raw,
          level: 1,
          origin: "base",
          sourceSeason: null,
          note: "",
          priority: 10,
        });
      }
    }
  } else {
    // Series-wide ("all seasons" within series) or global Overview
    for (const r of rows) {
      const canon = resolveAbilityAliasPure(r.ability_key);
      if (!canon) continue;
      if (seriesId && r.series_id && r.series_id !== seriesId) continue;

      const lvl = clampDbAbilityLevel(r.level);
      const isGlobal = r.series_id == null && r.season_number == null;
      const priority =
        r.series_id === seriesId && r.season_number == null
          ? 300
          : r.series_id === seriesId
            ? 200 + (r.season_number ?? 0)
            : isGlobal
              ? 150
              : 100;

      considerPrior(canon, {
        abilityKey: r.ability_key,
        level: lvl,
        origin: isGlobal ? "base" : "carried",
        sourceSeason: r.season_number ?? null,
        note: r.note ?? "",
        priority,
      });
    }

    for (const raw of entityAbilities ?? []) {
      const canon = resolveAbilityAliasPure(raw);
      if (!canon) continue;
      if (!priorMap.has(canon)) {
        considerPrior(canon, {
          abilityKey: raw,
          level: 1,
          origin: "base",
          sourceSeason: null,
          note: "",
          priority: 10,
        });
      }
    }
  }

  const carriedOver: ResolvedSeasonAbility[] = [];
  const newlyAcquired: ResolvedSeasonAbility[] = [];

  for (const [canon, prior] of priorMap) {
    const exact = exactMap.get(canon);
    const excluded = allowedSet ? !allowedSet.has(canon) && !exact : false;
    carriedOver.push({
      canonKey: canon,
      abilityKey: exact?.abilityKey ?? prior.abilityKey,
      level: exact ? exact.level : prior.level,
      baseLevel: prior.level,
      origin: prior.origin,
      sourceSeason: prior.sourceSeason,
      hasSeasonOverride: !!exact,
      excluded,
      note: exact?.note || prior.note,
    });
  }

  for (const [canon, exact] of exactMap) {
    if (priorMap.has(canon)) continue;
    newlyAcquired.push({
      canonKey: canon,
      abilityKey: exact.abilityKey,
      level: exact.level,
      baseLevel: exact.level,
      origin: "newly_acquired",
      sourceSeason: seasonNumber ?? null,
      hasSeasonOverride: true,
      excluded: false,
      note: exact.note,
    });
  }

  carriedOver.sort((a, b) => b.level - a.level || a.canonKey.localeCompare(b.canonKey));
  newlyAcquired.sort((a, b) => b.level - a.level || a.canonKey.localeCompare(b.canonKey));

  const active = [...newlyAcquired, ...carriedOver.filter((a) => !a.excluded)].sort(
    (a, b) => b.level - a.level || a.canonKey.localeCompare(b.canonKey),
  );

  return { carriedOver, newlyAcquired, active };
}
