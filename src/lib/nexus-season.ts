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

export function highestStatRadius(values: { value: number }[]): number {
  return 46 + (52 * Math.max(0, ...values.map((s) => clampStat(s.value)))) / 100;
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
