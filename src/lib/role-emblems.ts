import type { Entity } from "@/lib/entities";
import { readDossier } from "@/lib/nexus-season";

export const ROLE_EMBLEM_LABELS = [
  "Captain",
  "Leader",
  "Director",
  "Founder",
  "Support",
  "Main Lead",
  "Main Antagonist",
  "Antagonist",
  "Anti-Villain",
  "Anti-Hero",
] as const;

export type EmblemRoleLabel = (typeof ROLE_EMBLEM_LABELS)[number];

export type EmblemRoleCategory = "team" | "narrative" | "alignment";

export type EmblemRoleAbilityKey =
  | "captain"
  | "leader"
  | "director"
  | "founder"
  | "support"
  | "main_lead"
  | "main_antagonist"
  | "antagonist"
  | "anti_villain"
  | "anti_hero";

export interface RoleEmblemDef {
  label: EmblemRoleLabel;
  shortLabel: string;
  abilityKey: EmblemRoleAbilityKey;
  color: string;
  secondaryColor: string;
  bgTint: string;
  borderTint: string;
  category: EmblemRoleCategory;
  categoryLabel: string;
  description: string;
}

export const ROLE_EMBLEM_DEFS: readonly RoleEmblemDef[] = [
  {
    label: "Captain",
    shortLabel: "CAPT",
    abilityKey: "captain",
    color: "#38bdf8",
    secondaryColor: "#0284c7",
    bgTint: "rgba(56, 189, 248, 0.14)",
    borderTint: "rgba(56, 189, 248, 0.48)",
    category: "team",
    categoryLabel: "Team & Command",
    description: "Field squad captain leading tactical strikes and frontline team formations.",
  },
  {
    label: "Leader",
    shortLabel: "LEAD",
    abilityKey: "leader",
    color: "#f59e0b",
    secondaryColor: "#b45309",
    bgTint: "rgba(245, 158, 11, 0.14)",
    borderTint: "rgba(245, 158, 11, 0.48)",
    category: "team",
    categoryLabel: "Team & Command",
    description:
      "Primary sovereign commander setting doctrine, alliances, and strategic direction.",
  },
  {
    label: "Director",
    shortLabel: "DIR",
    abilityKey: "director",
    color: "#818cf8",
    secondaryColor: "#4338ca",
    bgTint: "rgba(129, 140, 248, 0.14)",
    borderTint: "rgba(129, 140, 248, 0.48)",
    category: "team",
    categoryLabel: "Team & Command",
    description:
      "Executive overseer directing intelligence networks, missions, and covert operations.",
  },
  {
    label: "Founder",
    shortLabel: "FNDR",
    abilityKey: "founder",
    color: "#d4af37",
    secondaryColor: "#92400e",
    bgTint: "rgba(212, 175, 55, 0.15)",
    borderTint: "rgba(212, 175, 55, 0.52)",
    category: "team",
    categoryLabel: "Team & Command",
    description:
      "Original architect and progenitor who forged the organization, bloodline, or order.",
  },
  {
    label: "Support",
    shortLabel: "SUPP",
    abilityKey: "support",
    color: "#10b981",
    secondaryColor: "#047857",
    bgTint: "rgba(16, 185, 129, 0.14)",
    borderTint: "rgba(16, 185, 129, 0.48)",
    category: "team",
    categoryLabel: "Team & Command",
    description:
      "Vital backline, barrier, medical, or logistical specialist sustaining allies in battle.",
  },
  {
    label: "Main Lead",
    shortLabel: "LEAD*",
    abilityKey: "main_lead",
    color: "#22d3ee",
    secondaryColor: "#0e7490",
    bgTint: "rgba(34, 211, 238, 0.14)",
    borderTint: "rgba(34, 211, 238, 0.5)",
    category: "narrative",
    categoryLabel: "Story Arc",
    description: "Central protagonist anchoring the series narrative and primary conflict.",
  },
  {
    label: "Main Antagonist",
    shortLabel: "M.ANT",
    abilityKey: "main_antagonist",
    color: "#ef4444",
    secondaryColor: "#991b1b",
    bgTint: "rgba(239, 68, 68, 0.15)",
    borderTint: "rgba(239, 68, 68, 0.52)",
    category: "narrative",
    categoryLabel: "Story Arc",
    description: "Supreme opposing force driving the existential threat of the arc or series.",
  },
  {
    label: "Antagonist",
    shortLabel: "ANTG",
    abilityKey: "antagonist",
    color: "#e11d48",
    secondaryColor: "#881337",
    bgTint: "rgba(225, 29, 72, 0.14)",
    borderTint: "rgba(225, 29, 72, 0.48)",
    category: "narrative",
    categoryLabel: "Story Arc",
    description: "Active adversary opposing the protagonists across engagements and schemes.",
  },
  {
    label: "Anti-Villain",
    shortLabel: "A-VLN",
    abilityKey: "anti_villain",
    color: "#a855f7",
    secondaryColor: "#6b21a8",
    bgTint: "rgba(168, 85, 247, 0.14)",
    borderTint: "rgba(168, 85, 247, 0.48)",
    category: "alignment",
    categoryLabel: "Alignment",
    description: "Villainous figure driven by tragic conviction, honor, or sympathetic ideals.",
  },
  {
    label: "Anti-Hero",
    shortLabel: "A-HRO",
    abilityKey: "anti_hero",
    color: "#f97316",
    secondaryColor: "#c2410c",
    bgTint: "rgba(249, 115, 22, 0.14)",
    borderTint: "rgba(249, 115, 22, 0.48)",
    category: "alignment",
    categoryLabel: "Alignment",
    description:
      "Unconventional hero operating beyond conventional codes to secure ruthless justice.",
  },
] as const;

export const TEAM_EMBLEM_ROLE_DEFS = ROLE_EMBLEM_DEFS.filter((d) => d.category === "team");
export const STORY_EMBLEM_ROLE_DEFS = ROLE_EMBLEM_DEFS.filter((d) => d.category !== "team");

const BY_LABEL = new Map<EmblemRoleLabel, RoleEmblemDef>(ROLE_EMBLEM_DEFS.map((d) => [d.label, d]));
const BY_KEY = new Map<EmblemRoleAbilityKey, RoleEmblemDef>(
  ROLE_EMBLEM_DEFS.map((d) => [d.abilityKey, d]),
);

const NORMALIZED_ALIASES: Record<string, EmblemRoleLabel> = {
  captain: "Captain",
  rolecaptain: "Captain",
  squadcaptain: "Captain",
  teamcaptain: "Captain",
  leader: "Leader",
  roleleader: "Leader",
  teamleader: "Leader",
  squadleader: "Leader",
  director: "Director",
  roledirector: "Director",
  support: "Support",
  rolesupport: "Support",
  supporting: "Support",
  founder: "Founder",
  rolefounder: "Founder",
  cofounder: "Founder",
  mainlead: "Main Lead",
  rolemainlead: "Main Lead",
  mainprotagonist: "Main Lead",
  leadprotagonist: "Main Lead",
  mainantagonist: "Main Antagonist",
  rolemainantagonist: "Main Antagonist",
  mainvillain: "Main Antagonist",
  antagonist: "Antagonist",
  roleantagonist: "Antagonist",
  villain: "Antagonist",
  antivillain: "Anti-Villain",
  roleantivillain: "Anti-Villain",
  antihero: "Anti-Hero",
  roleantihero: "Anti-Hero",
};

export function normalizeEmblemRole(raw: string | null | undefined): EmblemRoleLabel | null {
  if (!raw || typeof raw !== "string") return null;
  const compact = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (!compact) return null;
  return NORMALIZED_ALIASES[compact] ?? null;
}

export function roleEmblemDef(raw: string | null | undefined): RoleEmblemDef | null {
  const norm = normalizeEmblemRole(raw);
  return norm ? (BY_LABEL.get(norm) ?? null) : null;
}

export function roleKeyForEmblem(role: EmblemRoleLabel): EmblemRoleAbilityKey {
  return BY_LABEL.get(role)?.abilityKey ?? "support";
}

export function emblemRoleFromAbilityKey(key: string | null | undefined): EmblemRoleLabel | null {
  if (!key) return null;
  const clean = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_") as EmblemRoleAbilityKey;
  return BY_KEY.get(clean)?.label ?? normalizeEmblemRole(key);
}

export function isEmblemRoleAbilityKey(key: string | null | undefined): boolean {
  return emblemRoleFromAbilityKey(key) !== null;
}

/**
 * Parses either an array of roles or a multi-role string (comma, semicolon, pipe, ampersand, slash, plus).
 * Does NOT split on `-`, so `Anti-Hero` and `Anti-Villain` stay intact.
 */
export function parseEmblemRoles(raw: unknown): EmblemRoleLabel[] {
  const out: EmblemRoleLabel[] = [];
  const seen = new Set<EmblemRoleLabel>();

  const pushToken = (token: string) => {
    const norm = normalizeEmblemRole(token);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  };

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        for (const part of item.split(/[,;|+/&]+/)) pushToken(part);
      }
    }
    return out;
  }

  if (typeof raw === "string" && raw.trim()) {
    for (const part of raw.split(/[,;|+/&]+/)) pushToken(part);
  }

  return out;
}

export function mergeEmblemRoles(
  ...lists: Array<readonly string[] | undefined | null>
): EmblemRoleLabel[] {
  const seen = new Set<EmblemRoleLabel>();
  const out: EmblemRoleLabel[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const role of list) {
      const norm = normalizeEmblemRole(role);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        out.push(norm);
      }
    }
  }
  return out;
}

export function formatEmblemRolesText(
  roles: readonly EmblemRoleLabel[],
  fallbackNonEmblemRole?: string | null,
): string {
  const clean = mergeEmblemRoles(roles);
  if (clean.length > 0) return clean.join(", ");
  const fb = fallbackNonEmblemRole?.trim() ?? "";
  // If fallback only consisted of emblem roles that were all removed, return empty string.
  if (fb && parseEmblemRoles(fb).length > 0) {
    const nonEmblemParts = fb
      .split(/[,;|+/&]+/)
      .map((p) => p.trim())
      .filter((p) => p && !normalizeEmblemRole(p));
    return nonEmblemParts.join(", ");
  }
  return fb;
}

export function readEntityGlobalRoles(stats: unknown): EmblemRoleLabel[] {
  if (!stats || typeof stats !== "object") return [];
  const raw = (stats as Record<string, unknown>)["roles"];
  return parseEmblemRoles(raw);
}

export function readEntityAllTeamRolesMap(stats: unknown): Record<string, EmblemRoleLabel[]> {
  if (!stats || typeof stats !== "object") return {};
  const raw = (stats as Record<string, unknown>)["teamRoles"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, EmblemRoleLabel[]> = {};
  for (const [groupId, list] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = parseEmblemRoles(list);
    if (parsed.length > 0) out[groupId] = parsed;
  }
  return out;
}

export function readEntityTeamRoles(stats: unknown, groupId: string): EmblemRoleLabel[] {
  return readEntityAllTeamRolesMap(stats)[groupId] ?? [];
}

export interface ResolveEntityEmblemRolesOptions {
  seriesId?: string | null | undefined;
  seasonNumber?: number | null | undefined;
  groupId?: string | null | undefined;
  membership?:
    | {
        arc_role?: string | null | undefined;
        role_in_series?: string | null | undefined;
      }
    | null
    | undefined;
  abilityKeys?: readonly string[] | null | undefined;
}

/**
 * Resolves all canonical role emblems held by an entity, merging:
 * - explicit team roles (`stats.teamRoles[groupId]`, plus global/team roles when relevant)
 * - series/season dossier roles (`stats.dossier[seasonKey].roles`, `.role`, `series_characters`)
 * - global `stats.roles` & `entity.role` & `entity.category`
 * - any role ability keys present in `entity.abilities` / `abilityKeys`
 */
export function resolveEntityEmblemRoles(
  entity: Pick<Entity, "role" | "category" | "stats" | "abilities"> | null | undefined,
  options: ResolveEntityEmblemRolesOptions = {},
): EmblemRoleLabel[] {
  if (!entity) return [];

  const dossierMap = readDossier(entity.stats);
  const globalStatsRoles = readEntityGlobalRoles(entity.stats);
  const teamRolesMap = readEntityAllTeamRolesMap(entity.stats);
  const fromAbilities = [...(entity.abilities ?? []), ...(options.abilityKeys ?? [])]
    .map((k) => emblemRoleFromAbilityKey(k))
    .filter((r): r is EmblemRoleLabel => r !== null);

  if (options.groupId) {
    const teamSpecific = teamRolesMap[options.groupId] ?? [];
    const globalCommand = globalStatsRoles.filter((r) => BY_LABEL.get(r)?.category === "team");
    const entityRoleTeam = parseEmblemRoles(entity.role).filter(
      (r) => BY_LABEL.get(r)?.category === "team",
    );
    const abilityTeam = fromAbilities.filter((r) => BY_LABEL.get(r)?.category === "team");
    return mergeEmblemRoles(teamSpecific, globalCommand, entityRoleTeam, abilityTeam);
  }

  const allTeamRoles = Object.values(teamRolesMap).flat();

  if (options.seriesId) {
    const seasonKey = `${options.seriesId}:${options.seasonNumber ?? "all"}`;
    const seriesAllKey = `${options.seriesId}:all`;
    const seasonProfile = dossierMap[seasonKey];
    const seriesProfile = dossierMap[seriesAllKey];
    const seasonExplicit = mergeEmblemRoles(
      parseEmblemRoles(seasonProfile?.roles),
      parseEmblemRoles(seasonProfile?.role),
    );
    const seriesFallback = mergeEmblemRoles(
      parseEmblemRoles(seriesProfile?.roles),
      parseEmblemRoles(seriesProfile?.role),
    );
    const membershipRoles = mergeEmblemRoles(
      parseEmblemRoles(options.membership?.arc_role),
      parseEmblemRoles(options.membership?.role_in_series),
    );
    // Keep global command/team roles & global multi-roles synchronized with seasonal story roles.
    const globalCommandOrShared = globalStatsRoles.filter((r) => {
      if (BY_LABEL.get(r)?.category === "team") return true;
      return seasonExplicit.length === 0;
    });
    return mergeEmblemRoles(
      seasonExplicit,
      seriesFallback,
      membershipRoles,
      allTeamRoles,
      globalCommandOrShared,
      parseEmblemRoles(entity.role),
      fromAbilities,
    );
  }

  // Global dossier / hub view: merge global roles, entity role/category, team roles, dossier roles, and role ability keys.
  const allDossierRoles = Object.values(dossierMap).flatMap((d) =>
    mergeEmblemRoles(parseEmblemRoles(d.roles), parseEmblemRoles(d.role)),
  );
  return mergeEmblemRoles(
    globalStatsRoles,
    parseEmblemRoles(entity.role),
    parseEmblemRoles(entity.category),
    allTeamRoles,
    fromAbilities,
    allDossierRoles,
  );
}
