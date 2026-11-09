import { COMBAT_STATS, getCombatStats } from "@/lib/combat-stats";

export const NEXUS_STATS = [...COMBAT_STATS, { key: "wisdom", label: "Wisdom" }, { key: "vitality", label: "Vitality" }] as const;
export type SeasonDossier = {
  story?: string;
  role?: string;
  impact?: string;
  codename?: string;
  roster?: boolean;
  status?: string;
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
  return raw && typeof raw === "object" ? raw as DossierMap : {};
}
export function clampStat(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}
export function resolveNexusStats(stats: unknown, seasonKey: string | null, ability: string | null) {
  const base = stats && typeof stats === "object" ? stats as Record<string, unknown> : {};
  const dossier = readDossier(stats);
  const selected = dossier[seasonKey ?? "all"] ?? {};
  // An ability without a recorded profile must not masquerade as character stats.
  const source = ability ? selected.abilityStats?.[ability] ?? {} : selected.stats ?? (seasonKey ? {} : { ...base, ...getCombatStats(stats) });
  return NEXUS_STATS.map(({ key, label }) => ({ key, label, value: clampStat(source[key]) }));
}
export function highestStatRadius(values: { value: number }[]): number {
  return 46 + 52 * Math.max(0, ...values.map(s => clampStat(s.value))) / 100;
}
export function nexusRole(role: string, masked = false): "hero" | "villain" | "antihero" | "support" | "neutral" {
  if (masked) return "neutral";
  if (/anti.?hero|anti.?villain/i.test(role)) return "antihero";
  if (/antagonist|villain/i.test(role)) return "villain";
  if (/protagonist|hero/i.test(role)) return "hero";
  if (/support|mentor|ally/i.test(role)) return "support";
  return "neutral";
}