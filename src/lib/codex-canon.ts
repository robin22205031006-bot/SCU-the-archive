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
  /** Archive ties created after this moment are staff edits and win in every style. */
  baselineAt?: string;
  cast: CodexCanonCharacter[];
  groups: CodexCanonGroup[];
  bonds: { a: string; b: string; type: string; label: string }[];
}

const CANON = canonData as CodexCanon;
export const CODEX_BASELINE = CANON.baselineAt ?? "1970-01-01T00:00:00.000Z";

/** True for archive rows made after the canon baseline (staff edits): they show in every style. */
export function isFreshArchiveRow(row: { id?: string; created_at?: string | null }): boolean {
  return (
    !!row.created_at &&
    !String(row.id ?? "").startsWith("codex:") &&
    row.created_at > CODEX_BASELINE
  );
}

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

export interface RelationRow {
  id: string;
  source_id: string;
  target_id: string;
  rel: string;
  label: string | null;
  created_at: string;
}

/** Codex edge -> the archive's relation vocabulary (direction: a is <rel> of b). */
function codexRel(type: string, label: string): string {
  if (type === "blood") {
    if (/^(father|mother)$/i.test(label)) return "parent";
    if (/ancestor/i.test(label)) return "ancestor";
    if (/^(brothers|sisters|siblings|twins)$/i.test(label)) return "sibling";
    return "kin";
  }
  if (type === "conflict") return "rival";
  if (type === "contract") return "contract";
  if (/^married$/i.test(label)) return "spouse";
  if (/^mentor$/i.test(label)) return "mentor";
  if (/right hand|hired/i.test(label)) return "commands";
  return "ally";
}

/** True for relation rows that come from the Codex canon (not editable database rows). */
export function isCodexRelation(row: { id: string }): boolean {
  return row.id.startsWith("codex:");
}

/**
 * Relations every style shows: the Codex's ties win for any pair of characters it covers
 * (database rows for that pair are replaced), and database-only pairs stay as they are.
 */
export function mergeRelationsWithCodex<T extends RelationRow>(
  rows: readonly T[],
  characters: ReadonlyArray<{ id: string; name: string; alias?: string | null }>,
): Array<T | RelationRow> {
  const idByCast = new Map<string, string>();
  for (const c of characters) {
    const cast = codexCastName(c.name, c.alias ?? null);
    if (cast && !idByCast.has(cast)) idByCast.set(cast, c.id);
  }
  const pair = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const codexRows: RelationRow[] = [];
  const covered = new Set<string>();
  CANON.bonds.forEach((e, i) => {
    const s = idByCast.get(e.a);
    const t = idByCast.get(e.b);
    if (!s || !t || s === t) return;
    covered.add(pair(s, t));
    codexRows.push({
      id: `codex:${i}`,
      source_id: s,
      target_id: t,
      rel: codexRel(e.type, e.label),
      label: e.label || null,
      created_at: "1970-01-01T00:00:00.000Z",
    });
  });
  // Older archive rows for Codex pairs were the wrong data; newer ones are staff edits and stay.
  const kept = rows.filter(
    (r) => !covered.has(pair(r.source_id, r.target_id)) || isFreshArchiveRow(r),
  );
  return [...codexRows, ...kept];
}
