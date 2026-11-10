import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ABILITY_FX_LINEAGES_KEY, FX_LINEAGES, sanitizeLineages, type FxLineage } from "@/lib/ability-fx";

export const abilityLineagesQuery = {
  queryKey: ["app-settings", ABILITY_FX_LINEAGES_KEY], staleTime: 30_000,
  queryFn: async (): Promise<FxLineage[] | null> => {
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", ABILITY_FX_LINEAGES_KEY).maybeSingle();
    if (error) throw error;
    return sanitizeLineages(data?.value ?? null);
  },
};
/** Admin-saved upgrade chains, falling back to the defaults. */
export function useAbilityLineages(): FxLineage[] { return useQuery(abilityLineagesQuery).data ?? FX_LINEAGES; }
