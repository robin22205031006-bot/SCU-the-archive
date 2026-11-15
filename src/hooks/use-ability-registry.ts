import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery } from "@/lib/entities";
import {
  CANON_CHARACTER_ABILITIES,
  abilityDef,
  allAbilityDefs,
  getAbilityRegistryVersion,
  normalizeAbilityKey,
  setAbilityOverridesCache,
  setCustomAbilitiesCache,
  subscribeAbilityRegistry,
  type AbilityDef,
  type AbilityOverride,
} from "@/lib/abilities";

const CUSTOM_SETTINGS_KEY = "ability_registry";
const OVERRIDES_SETTINGS_KEY = "ability_overrides";
const HUB_ENTITY_KINDS = ["character", "organization", "clan", "bloodline", "faction"] as const;

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

/**
 * Complete deduplicated ability list matching the Abilities Hub:
 * registry + admin custom/overrides + canon roster + ad-hoc entity abilities/beast traits.
 */
export function useAllHubAbilities(): AbilityDef[] {
  const registryVersion = useAbilityRegistryVersion();
  const { data: entities } = useQuery(entitiesQuery([...HUB_ENTITY_KINDS]));

  return useMemo(() => {
    const base = allAbilityDefs();
    const known = new Set(base.map((d) => normalizeAbilityKey(d.key)));
    const merged: AbilityDef[] = [...base];

    const addIfMissing = (rawName: string) => {
      const d = abilityDef(rawName);
      const nk = normalizeAbilityKey(d.key);
      if (!nk || known.has(nk)) return;
      known.add(nk);
      merged.push(d);
    };

    for (const list of Object.values(CANON_CHARACTER_ABILITIES)) {
      for (const name of list) addIfMissing(name);
    }

    for (const e of entities ?? []) {
      for (const n of [...(e.abilities ?? []), ...(e.beast_traits ?? [])]) {
        addIfMissing(n);
      }
    }

    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, registryVersion]);
}
