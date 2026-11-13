import type { Entity } from "@/lib/entities";
import { readDossier } from "@/lib/nexus-season";

export const NEXUS_ROLES = [
  "Main Protagonist",
  "Protagonist",
  "Main Antagonist",
  "Antagonist",
  "Support",
  "Impactful Character",
  "Anti-Hero",
  "Anti-Villain",
  "Philosophy",
];
export function normalizeNexusRole(role: string | null | undefined): string {
  const key = (role ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const aliases: Record<string, string> = {
    mainprotagonist: "Main Protagonist",
    lead: "Main Protagonist",
    leadprotagonist: "Main Protagonist",
    mainantagonist: "Main Antagonist",
    protagonist: "Protagonist",
    antagonist: "Antagonist",
    support: "Support",
    supporting: "Support",
    antihero: "Anti-Hero",
    antivillain: "Anti-Villain",
    impactfulcharacter: "Impactful Character",
    philosophy: "Philosophy",
  };
  const trimmed = role?.trim();
  return aliases[key] ?? (trimmed || "Unclassified");
}
export function nexusDotRole(role: string | null, masked = false) {
  const normalized = normalizeNexusRole(role);
  const tokens: Record<string, string> = {
    "Main Protagonist": "main-protagonist",
    Protagonist: "protagonist",
    "Main Antagonist": "main-antagonist",
    Antagonist: "antagonist",
    Support: "support",
    "Impactful Character": "impactful",
    "Anti-Hero": "anti-hero",
    "Anti-Villain": "anti-villain",
    Philosophy: "neutral",
  };
  return masked ? "neutral" : (tokens[normalized] ?? "neutral");
}
export function projectSeasonRoster(
  entities: Entity[],
  seriesId: string,
  season: number | null,
  memberships: Array<{
    character_id: string;
    role_in_series: string | null;
    arc_role: string | null;
    status: string;
  }>,
) {
  if (!seriesId) return entities;
  const key = `${seriesId}:${season ?? "all"}`;
  return entities.flatMap((e) => {
    const map = readDossier(e.stats);
    const profile = map[key] ?? {};
    const inSeries = Object.entries(map).some(
      ([k, v]) => k.startsWith(`${seriesId}:`) && v.roster !== false,
    );
    const member = memberships.find((m) => m.character_id === e.id);
    if (
      profile.roster === false ||
      (!member && !profile.roster && !map[key] && !(season == null && inSeries))
    )
      return [];
    return [
      {
        ...e,
        category: normalizeNexusRole(
          profile.role ?? member?.arc_role ?? member?.role_in_series ?? e.category,
        ),
        role: profile.role ?? member?.role_in_series ?? e.role,
        status: profile.status ?? member?.status ?? e.status,
        alias: profile.codename ?? e.alias,
        description: profile.story ?? e.description,
      },
    ];
  });
}
