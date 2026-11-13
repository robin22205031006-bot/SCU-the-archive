import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getAbilityRegistryVersion,
  setAbilityOverridesCache,
  setCustomAbilitiesCache,
  subscribeAbilityRegistry,
  type AbilityDef,
  type AbilityOverride,
} from "@/lib/abilities";

const CUSTOM_SETTINGS_KEY = "ability_registry";
const OVERRIDES_SETTINGS_KEY = "ability_overrides";

let hydrated = false;
let inflight: Promise<void> | null = null;

/** Hydrate admin-defined abilities and overrides from app_settings once per session (or when forced). */
export async function hydrateAbilityRegistry(force = false): Promise<void> {
  if (hydrated && !force) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", [CUSTOM_SETTINGS_KEY, OVERRIDES_SETTINGS_KEY]);
      if (error) return;
      hydrated = true;
      const registry = data?.find((row) => row.key === CUSTOM_SETTINGS_KEY)?.value;
      const list = Array.isArray(registry) ? (registry as unknown as AbilityDef[]) : [];
      setCustomAbilitiesCache(list);
      const overrides = data?.find((row) => row.key === OVERRIDES_SETTINGS_KEY)?.value;
      if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
        setAbilityOverridesCache(overrides as unknown as Record<string, AbilityOverride>);
      }
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Subscribe a component to ability registry/override changes and ensure server overrides are hydrated. */
export function useAbilityRegistryVersion(): number {
  const version = useSyncExternalStore(
    subscribeAbilityRegistry,
    getAbilityRegistryVersion,
    getAbilityRegistryVersion,
  );
  useEffect(() => {
    void hydrateAbilityRegistry();
  }, []);
  return version;
}
