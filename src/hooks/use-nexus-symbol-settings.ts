import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NEXUS_SYMBOL_SETTINGS_KEY, type NexusSymbolSettings } from "@/lib/nexus-symbol-settings";
export const nexusSymbolSettingsQuery = {
  queryKey: ["app-settings", NEXUS_SYMBOL_SETTINGS_KEY],
  staleTime: 30_000,
  queryFn: async (): Promise<NexusSymbolSettings> => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", NEXUS_SYMBOL_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    return (data?.value ?? {}) as NexusSymbolSettings;
  },
};
export function useNexusSymbolSettings() {
  return useQuery(nexusSymbolSettingsQuery).data ?? {};
}
