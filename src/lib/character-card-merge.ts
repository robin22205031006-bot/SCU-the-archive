import { canonicalCharacterName } from "./adminLoreSync";
import { normalize } from "./lore-merge";
import type { Entity } from "./entities";

/** Dynamic lookup from secondary/merged entity ID to the canonical primary entity ID */
const ID_TO_PRIMARY = new Map<string, string>();
/** Dynamic lookup from primary entity ID to all secondary entity IDs merged into it */
const PRIMARY_TO_SECONDARIES = new Map<string, Set<string>>();

/**
 * Returns the canonical entity ID if `id` belonged to an entity merged into another,
 * or the original `id` if unmerged.
 */
export function resolveEntityId(id: string | null | undefined): string {
  if (!id) return "";
  return ID_TO_PRIMARY.get(id) ?? id;
}

/**
 * Returns all secondary entity IDs that were merged into the given primary ID.
 */
export function getMergedSecondaryIds(primaryId: string | null | undefined): string[] {
  if (!primaryId) return [];
  const secondaries = PRIMARY_TO_SECONDARIES.get(primaryId);
  return secondaries ? Array.from(secondaries) : [];
}

/**
 * Helper to split, clean, and deduplicate alias strings.
 */
function combineAliases(
  primaryAlias: string | null | undefined,
  secondaryAlias: string | null | undefined,
  secondaryName: string | null | undefined,
  primaryName: string,
): string | null {
  const primaryNorm = normalize(primaryName);
  const parts: string[] = [];

  const addPart = (val: string | null | undefined) => {
    if (!val) return;
    for (const chunk of val.split(/[·,]/)) {
      const trimmed = chunk.trim();
      if (trimmed && normalize(trimmed) !== primaryNorm) {
        parts.push(trimmed);
      }
    }
  };

  addPart(primaryAlias);
  addPart(secondaryAlias);
  addPart(secondaryName);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of parts) {
    const key = normalize(p);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  return unique.length > 0 ? unique.join(" · ") : null;
}

/**
 * Helper to combine distinct roles.
 */
function combineRoles(
  primaryRole: string | null | undefined,
  secondaryRole: string | null | undefined,
): string | null {
  const parts: string[] = [];
  const add = (r: string | null | undefined) => {
    if (!r) return;
    for (const chunk of r.split(/[·,]/)) {
      const trimmed = chunk.trim();
      if (trimmed) parts.push(trimmed);
    }
  };
  add(primaryRole);
  add(secondaryRole);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of parts) {
    const key = normalize(p);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }
  return unique.length > 0 ? unique.join(" · ") : null;
}

/**
 * Merges description texts non-destructively.
 */
function combineDescriptions(
  pDesc: string | null | undefined,
  sDesc: string | null | undefined,
): string {
  const p = (pDesc ?? "").trim();
  const s = (sDesc ?? "").trim();
  if (!p) return s;
  if (!s) return p;
  if (p.includes(s) || normalize(p).includes(normalize(s))) return p;
  return `${p}\n\n[Merged Info]:\n${s}`;
}

/**
 * Merges character cards according to SCU merge logic:
 *  - Maps character cards to their in-story canonical card via ALIAS_MAP / canonicalCharacterName()
 *  - Groups duplicate cards and preserves all lore, notes, abilities, and per-season stats
 *  - Non-character cards (organizations, clans, etc.) are untouched
 */
export function mergeCharacterCards<
  T extends Partial<Entity> & { id: string; name: string; kind?: string | null },
>(entities: T[]): T[] {
  if (!entities || entities.length <= 1) return entities;

  // Separate characters from non-characters
  const characters: T[] = [];
  const others: T[] = [];

  for (const e of entities) {
    if (e.kind === "character" || !e.kind) {
      characters.push(e);
    } else {
      others.push(e);
    }
  }

  if (characters.length === 0) return entities;

  // Group characters by canonical name
  const groups = new Map<string, T[]>();
  for (const c of characters) {
    const canonKey = normalize(canonicalCharacterName(c.name));
    if (!groups.has(canonKey)) {
      groups.set(canonKey, []);
    }
    groups.get(canonKey)!.push(c);
  }

  const mergedCharacters: T[] = [];

  for (const [canonKey, group] of groups.entries()) {
    if (group.length === 1) {
      // Single card - already canonical or standalone
      mergedCharacters.push(group[0]!);
      continue;
    }

    // Multiple cards in the group: pick the best primary entry
    // 1. Exact match with canonical name
    let primaryIndex = group.findIndex((c) => normalize(c.name) === canonKey);

    // 2. If no exact match, pick the entry with the longest description or image
    if (primaryIndex === -1) {
      let maxScore = -1;
      primaryIndex = 0;
      for (let i = 0; i < group.length; i++) {
        const item = group[i]!;
        let score = (item.description?.length ?? 0) + (item.image_url ? 1000 : 0);
        if (normalize(item.name).includes(canonKey) || canonKey.includes(normalize(item.name))) {
          score += 500;
        }
        if (score > maxScore) {
          maxScore = score;
          primaryIndex = i;
        }
      }
    }

    const primary = { ...group[primaryIndex]! };
    const secondaries = group.filter((_, idx) => idx !== primaryIndex);

    // Record mappings
    let secondarySet = PRIMARY_TO_SECONDARIES.get(primary.id);
    if (!secondarySet) {
      secondarySet = new Set<string>();
      PRIMARY_TO_SECONDARIES.set(primary.id, secondarySet);
    }

    // Fold each secondary card into the primary
    for (const sec of secondaries) {
      ID_TO_PRIMARY.set(sec.id, primary.id);
      secondarySet.add(sec.id);

      // Merge aliases
      primary.alias = combineAliases(primary.alias, sec.alias, sec.name, primary.name);

      // Merge roles
      primary.role = combineRoles(primary.role, sec.role);

      // Merge descriptions
      primary.description = combineDescriptions(primary.description, sec.description);

      // Merge image
      if (!primary.image_url && sec.image_url) {
        primary.image_url = sec.image_url;
      }

      // Merge category & status
      if (!primary.category && sec.category) {
        primary.category = sec.category;
      }
      if ((!primary.status || primary.status === "Unknown") && sec.status) {
        primary.status = sec.status;
      }

      // Merge character_tier & theme_color
      if (!primary.character_tier && sec.character_tier) {
        primary.character_tier = sec.character_tier;
      }
      if (!primary.theme_color && sec.theme_color) {
        primary.theme_color = sec.theme_color;
      }

      // Merge abilities (union)
      if (Array.isArray(sec.abilities) && sec.abilities.length > 0) {
        const currentAbilities = Array.isArray(primary.abilities) ? primary.abilities : [];
        const unionSet = new Set([...currentAbilities, ...sec.abilities]);
        primary.abilities = Array.from(unionSet);
      }

      // Merge stats & season dossiers
      if (sec.stats && typeof sec.stats === "object") {
        const secStats = sec.stats as Record<string, unknown>;
        const primStats = (primary.stats as Record<string, unknown>) ?? {};
        const mergedStats: Record<string, unknown> = {
          ...secStats,
          ...primStats,
        };

        // Deep merge dossier
        if (secStats["dossier"] || primStats["dossier"]) {
          mergedStats["dossier"] = {
            ...((secStats["dossier"] as Record<string, unknown>) ?? {}),
            ...((primStats["dossier"] as Record<string, unknown>) ?? {}),
          };
        }

        primary.stats = mergedStats as Entity["stats"];
      }
    }

    mergedCharacters.push(primary);
  }

  // Preserve initial relative ordering (by name)
  mergedCharacters.sort((a, b) => a.name.localeCompare(b.name));

  return [...mergedCharacters, ...others];
}
