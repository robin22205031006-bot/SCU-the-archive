import canonData from "@/generated/codex-canon.json";
import { canonicalCharacterName } from "./adminLoreSync";
import { resolveAbilityAliasPure } from "./ability-rank";

/**
 * Codex canon for every UI style. The SCU Codex holds the most accurate story data, so where
 * it has a detail, every style shows the Codex version; where it has none, the archive's
 * value stays (and the archive's extras are also added to the Codex by the Codex feed).
 * Data is exported from the real Codex page by scripts/export-codex-canon.mjs.
 */
export interface CodexCanonCharacter {
  name: string;
  realName: string;
  codename: string;
  bloodline: string;
  desc: string;
  group: string;
}
export interface CodexCanonGroup {
  name: string;
  branch: string;
  tier: string;
  desc: string;
  holders: string[];
  leaves: string[];
}
export interface CodexCanon {
  cast: CodexCanonCharacter[];
  groups: CodexCanonGroup[];
  bonds: { a: string; b: string; type: string; label: string }[];
}

const CANON = canonData as CodexCanon;

const key = (s: string) => canonicalCharacterName(s);
const abilityKey = (s: string) => resolveAbilityAliasPure(s.replace(/\*$/, ""));

/** canonical character key -> Codex cast name */
const castByKey = new Map<string, string>();
for (const c of CANON.cast) {
  const names = [c.name, ...c.codename.split(/,|\/|\bor\b/)].map((x) => x.trim()).filter(Boolean);
  for (const n of names) {
    const k = key(n);
    if (k && !castByKey.has(k)) castByKey.set(k, c.name);
  }
}
/** Codex cast name -> canon ability group names (in Codex order) */
const abilitiesByCast = new Map<string, string[]>();
/** ability key (group or technique) -> Codex cast names that hold it */
const holdersByAbility = new Map<string, Set<string>>();
for (const g of CANON.groups) {
  for (const h of g.holders) {
    const list = abilitiesByCast.get(h) ?? [];
    if (!list.includes(g.name)) list.push(g.name);
    abilitiesByCast.set(h, list);
  }
  for (const n of [g.name, ...g.leaves]) {
    const k = abilityKey(n);
    if (!k) continue;
    const set = holdersByAbility.get(k) ?? new Set<string>();
    g.holders.forEach((h) => set.add(h));
    holdersByAbility.set(k, set);
  }
}

/** The Codex cast name for an archive card, matched by name, codename or alias. */
export function codexCastName(name: string, alias?: string | null): string | null {
  const direct = castByKey.get(key(name));
  if (direct) return direct;
  for (const a of (alias ?? "").split(/[,/]/)) {
    const hit = a.trim() ? castByKey.get(key(a)) : undefined;
    if (hit) return hit;
  }
  return null;
}

/** Canon abilities the Codex lists for a character (empty when the Codex has none). */
export function codexAbilitiesFor(name: string, alias?: string | null): string[] {
  const cast = codexCastName(name, alias);
  return cast ? [...(abilitiesByCast.get(cast) ?? [])] : [];
}

/**
 * Ability list every style shows: the Codex's canon first, then archive abilities the Codex
 * does not know at all or also gives this character. Archive abilities the Codex assigns to
 * other characters are dropped. Returns the archive list unchanged when the Codex has no
 * abilities for this character.
 */
export function mergeAbilitiesWithCodex(
  name: string,
  alias: string | null | undefined,
  archive: readonly string[],
): string[] {
  const cast = codexCastName(name, alias);
  const canon = cast ? (abilitiesByCast.get(cast) ?? []) : [];
  if (!cast || !canon.length) return [...archive];
  const out = [...canon];
  const seen = new Set(out.map(abilityKey));
  for (const a of archive) {
    const k = abilityKey(a);
    if (!k || seen.has(k)) continue;
    // "wind_guardian" and the Codex's "wind_guardian_mode" are the same power.
    if ([...seen].some((x) => x.startsWith(`${k}_`) || k.startsWith(`${x}_`))) continue;
    const holders = holdersByAbility.get(k);
    if (holders && holders.size && !holders.has(cast)) continue;
    seen.add(k);
    out.push(a);
  }
  return out;
}

export const codexCanon: CodexCanon = CANON;
