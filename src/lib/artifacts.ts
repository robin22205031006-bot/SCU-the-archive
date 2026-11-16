import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_ARTIFACTS } from "@/lib/arsenal-art";
import { readDossier } from "@/lib/nexus-season";

const isMissingTable = (error: { message?: string; code?: string } | null, table: string) =>
  !!error &&
  (error.code === "PGRST205" ||
    new RegExp(`${table}|schema cache|does not exist`, "i").test(error.message ?? ""));

export const artifactsQuery = queryOptions({
  queryKey: ["artifacts"],
  staleTime: 1000 * 60 * 15,
  gcTime: 1000 * 60 * 60 * 24,
  refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase.from("artifacts").select("*").order("name");
    if (error) {
      if (isMissingTable(error, "artifacts")) return DEFAULT_ARTIFACTS;
      throw error;
    }
    return data && data.length > 0 ? data : DEFAULT_ARTIFACTS;
  },
});

const normWeapon = (s: string) => s.trim().toLowerCase();

export interface SeasonalWeaponWielder {
  entityId: string;
  entityName: string;
  labels: string[];
}

/**
 * Resolves characters who equipped a given weapon/artifact inside any Series+Season dossier
 * (or global dossier) so the Armory/Arsenal view automatically reflects dossier saves.
 */
export function resolveArtifactSeasonalWielders(
  artifactName: string,
  characters: readonly { id: string; name: string; stats?: unknown }[],
  seriesTitleMap?: ReadonlyMap<string, string> | Record<string, string>,
): SeasonalWeaponWielder[] {
  const target = normWeapon(artifactName);
  if (!target) return [];

  const titleOf = (sid: string) => {
    if (!seriesTitleMap) return "";
    return seriesTitleMap instanceof Map
      ? (seriesTitleMap.get(sid) ?? "")
      : ((seriesTitleMap as Record<string, string>)[sid] ?? "");
  };

  const results: SeasonalWeaponWielder[] = [];
  for (const char of characters) {
    const dossier = readDossier(char.stats);
    const labels: string[] = [];
    const baseWeapons =
      char.stats && typeof char.stats === "object"
        ? (char.stats as Record<string, unknown>)["weapons"]
        : undefined;
    if (
      Array.isArray(baseWeapons) &&
      baseWeapons.some((w) => typeof w === "string" && normWeapon(w) === target)
    ) {
      labels.push("Archive");
    }

    for (const [k, sd] of Object.entries(dossier)) {
      if (!sd.weapons?.length) continue;
      if (!sd.weapons.some((w) => normWeapon(w) === target)) continue;
      if (k === "all") {
        if (!labels.includes("All seasons")) labels.push("All seasons");
        continue;
      }
      const [sid, sNum] = k.split(":");
      const sTitle = sid ? titleOf(sid) : "";
      const tag =
        sTitle && sNum && sNum !== "all"
          ? `${sTitle} · S${sNum}`
          : sTitle || (sNum ? `S${sNum}` : k);
      if (!labels.includes(tag)) labels.push(tag);
    }

    if (labels.length > 0) {
      results.push({ entityId: char.id, entityName: char.name, labels });
    }
  }
  return results;
}
