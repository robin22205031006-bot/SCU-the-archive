import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery, getMergedSecondaryIds, type Entity } from "@/lib/entities";
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
import { resolveEntityEmblemRoles, roleKeyForEmblem } from "@/lib/role-emblems";

const CUSTOM_SETTINGS_KEY = "ability_registry";
const OVERRIDES_SETTINGS_KEY = "ability_overrides";
const HUB_ENTITY_KINDS = ["character", "organization", "clan", "bloodline", "faction"] as const;

type HolderAbilityRow = {
  entity_id: string;
  ability_key: string;
  level: number;
  series_id: string | null;
  season_number: number | null;
};

const allHolderAbilityRowsQuery = {
  queryKey: ["character-abilities", "all-holders"] as const,
  staleTime: 1000 * 60 * 5,
  queryFn: async (): Promise<HolderAbilityRow[]> => {
    const { data, error } = await supabase
      .from("character_abilities")
      .select("entity_id, ability_key, level, series_id, season_number");
    if (error) return [];
    return (data ?? []) as HolderAbilityRow[];
  },
};

let hydrated = false;
let inflight: Promise<void> | null = null;

function formatCanonName(raw: string): string {
  return raw.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

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
 * registry + admin custom/overrides + canon roster + ad-hoc entity abilities/beast traits + seasonal character_abilities.
 */
export function useAllHubAbilities(): AbilityDef[] {
  const registryVersion = useAbilityRegistryVersion();
  const { data: entities } = useQuery(entitiesQuery([...HUB_ENTITY_KINDS]));
  const { data: charAbilityRows } = useQuery(allHolderAbilityRowsQuery);

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

    for (const row of charAbilityRows ?? []) {
      addIfMissing(row.ability_key);
    }

    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, charAbilityRows, registryVersion]);
}

export interface AbilityHoldersIndex {
  /** DB entity holders keyed by normalized ability key. */
  holdersMap: Map<string, Entity[]>;
  /** Canon wielder names (from CANON_CHARACTER_ABILITIES) keyed by normalized ability key. */
  canonNamesMap: Map<string, string[]>;
  isLoading: boolean;
}

const CANON_HOLDERS_BY_KEY: Map<string, string[]> = (() => {
  const map = new Map<string, string[]>();
  for (const [charName, abilities] of Object.entries(CANON_CHARACTER_ABILITIES)) {
    const displayName = formatCanonName(charName);
    for (const raw of abilities) {
      const nk = normalizeAbilityKey(abilityDef(raw).key);
      if (!nk) continue;
      const arr = map.get(nk) ?? [];
      if (!arr.includes(displayName)) arr.push(displayName);
      map.set(nk, arr);
    }
  }
  return map;
})();

/**
 * Shared reverse index from normalized ability key -> live entity wielders + canon character names.
 * Combines base entity arrays with seasonal/per-series rows in `character_abilities`.
 * Used across Abilities Hub catalog, Ability FX cards/showcase/simulator, and Ability in Action.
 */
export function useAbilityHolders(): AbilityHoldersIndex {
  const registryVersion = useAbilityRegistryVersion();
  const { data: entities, isLoading: entitiesLoading } = useQuery(
    entitiesQuery([...HUB_ENTITY_KINDS]),
  );
  const { data: charAbilityRows, isLoading: abilitiesLoading } =
    useQuery(allHolderAbilityRowsQuery);

  const holdersMap = useMemo(() => {
    const map = new Map<string, Entity[]>();
    const entityById = new Map<string, Entity>();
    const seenByAbility = new Map<string, Set<string>>();

    const addHolder = (rawAbility: string, entity: Entity) => {
      const nk = normalizeAbilityKey(abilityDef(rawAbility).key);
      if (!nk) return;
      let seen = seenByAbility.get(nk);
      if (!seen) {
        seen = new Set<string>();
        seenByAbility.set(nk, seen);
      }
      if (seen.has(entity.id)) return;
      seen.add(entity.id);
      const arr = map.get(nk) ?? [];
      arr.push(entity);
      map.set(nk, arr);
    };

    for (const e of entities ?? []) {
      entityById.set(e.id, e);
      for (const secId of getMergedSecondaryIds(e.id)) {
        if (!entityById.has(secId)) entityById.set(secId, e);
      }
      for (const n of [...(e.abilities ?? []), ...(e.beast_traits ?? [])]) {
        addHolder(n, e);
      }
      for (const r of resolveEntityEmblemRoles(e)) {
        addHolder(roleKeyForEmblem(r), e);
      }
    }

    for (const row of charAbilityRows ?? []) {
      const entity = entityById.get(row.entity_id);
      if (entity) addHolder(row.ability_key, entity);
    }

    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, charAbilityRows, registryVersion]);

  return {
    holdersMap,
    canonNamesMap: CANON_HOLDERS_BY_KEY,
    isLoading: entitiesLoading || abilitiesLoading,
  };
}
