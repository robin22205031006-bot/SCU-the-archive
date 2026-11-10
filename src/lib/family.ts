/** Family relation kinds stored in entity_relations (source → target). */
export const FAMILY_RELS = ["parent", "sibling", "spouse", "ancestor"] as const;
export type FamilyRel = (typeof FAMILY_RELS)[number];
export const FAMILY_LABEL: Record<FamilyRel, string> = { parent: "is parent of", sibling: "is sibling of", spouse: "is spouse of", ancestor: "is ancestor of" };
export const isFamilyRel = (r: string): r is FamilyRel => (FAMILY_RELS as readonly string[]).includes(r);

type Edge = { source_id: string; target_id: string; rel: string };

/**
 * Generation depth per person: roots (no parent/ancestor) are 0, children one
 * deeper; spouses and siblings share a generation. Cycles are cut safely.
 */
export function generations(ids: string[], edges: Edge[]): Map<string, number> {
  const gen = new Map(ids.map((id) => [id, 0]));
  const fam = edges.filter((e) => gen.has(e.source_id) && gen.has(e.target_id));
  for (let pass = 0; pass < ids.length + 1; pass++) {
    let changed = false;
    for (const e of fam) {
      const a = gen.get(e.source_id)!, b = gen.get(e.target_id)!;
      if (e.rel === "parent" && b < a + 1) { gen.set(e.target_id, a + 1); changed = true; }
      if (e.rel === "ancestor" && b < a + 2) { gen.set(e.target_id, a + 2); changed = true; }
      if ((e.rel === "spouse" || e.rel === "sibling") && a !== b) { const m = Math.max(a, b); gen.set(e.source_id, m); gen.set(e.target_id, m); changed = true; }
    }
    if (!changed) break;
  }
  const min = Math.min(...gen.values());
  for (const [k, v] of gen) gen.set(k, Math.min(v - min, 12));
  return gen;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Resolve a name to an entity id by exact normalized name or alias. */
export function resolvePerson(name: string, people: { id: string; name: string; alias?: string | null }[]) {
  const n = norm(name);
  return people.find((p) => norm(p.name) === n || (p.alias ?? "").split(/[,/]/).some((a) => norm(a) === n))?.id;
}
