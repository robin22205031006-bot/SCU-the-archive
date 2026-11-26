import { isFamilyRel } from "@/lib/family";
import { resolveCharacterStatusTimeline } from "@/lib/status-history";
import { codexCastName } from "@/lib/codex-canon";
import { lookupAbility } from "@/lib/abilities";
import {
  ABILITY_RANK_META,
  buildAbilityRankMap,
  resolveAssignedAbilityRank,
  type CharacterAbilityRankRow,
} from "@/lib/ability-rank";
import {
  buildSeasonCompareOptions,
  readDossier,
  resolveNexusStats,
  type SeasonDossier,
} from "@/lib/nexus-season";

/**
 * Data the app hands to the embedded Codex (public/codex/index.html).
 * The Codex keeps its own story data as the source of truth: it only adds characters and
 * abilities it has not catalogued, and draws the season dossier from the same
 * entities.stats.dossier map the Nexus dossier reads, so every UI shows the same facts.
 */
export interface CodexFeedCharacter {
  name: string;
  aliases: string[];
  realName?: string | undefined;
  bloodline?: string | undefined;
  desc?: string | undefined;
  /** Portrait (resized data URL or https URL) from entities.image_url. */
  image?: string | undefined;
  /**
   * The Codex cast name this card is, decided by the same matcher every other style uses
   * (src/lib/codex-canon.ts). null = not in the Codex, so the Codex adds it as new.
   */
  codex?: string | null | undefined;
}
export interface CodexFeedRelation {
  /** "source is <rel> of target"; names are the archive's. */
  a: string;
  b: string;
  rel: "parent" | "sibling" | "spouse" | "ancestor";
}
export interface CodexFeedStatusStep {
  label: string;
  short: string;
  status: string;
  from?: string | undefined;
  transition: boolean;
  /** Dossier key ("seriesId:n") when the step is a season, so the Codex can jump to it. */
  season?: string | undefined;
}
export interface CodexFeedBond {
  a: string;
  b: string;
  /** Raw archive bond type: rival, mentor, ally, commands, kin, parent, sibling, spouse, ancestor... */
  rel: string;
  label?: string | undefined;
}
export interface CodexFeedGroup {
  name: string;
  kind: string;
  members: string[];
}
export interface CodexFeedRanks {
  /** ability name -> rank 1..5 across the whole story */
  base: Record<string, number>;
  /** dossier season key -> ability name -> rank as of that season */
  seasons: Record<string, Record<string, number>>;
}
export interface CodexFeedSeries {
  title: string;
  desc?: string | undefined;
  /** Positional season titles ("" where unnamed), same as the shared Series page. */
  seasons: string[];
}
export interface CodexFeedMask {
  characters: boolean;
  abilities: boolean;
  archive: boolean;
  series: boolean;
}
export interface CodexFeedAbility {
  name: string;
  desc?: string | undefined;
  holders: string[];
  /** App registry category (power, element, beast, art, role) to help place it in a Codex branch. */
  group?: string | undefined;
}
export interface CodexFeedSeason {
  key: string;
  label: string;
  series: string;
  codename?: string | undefined;
  role?: string | undefined;
  roles?: string[];
  status?: string | undefined;
  impact?: string | undefined;
  story?: string | undefined;
  gender?: string | undefined;
  philosophy?: string | undefined;
  bloodline?: string | undefined;
  orgs?: string[];
  weapons?: string[];
  abilities?: string[];
  stats: { key: string; label: string; value: number }[];
  /** Per-ability stat profiles (same data the Nexus stat wheel's ability selector reads). */
  profiles?: { name: string; stats: { key: string; label: string; value: number }[] }[];
  /** True when no stats are recorded at all (the wheel shows zeros). */
  empty?: boolean | undefined;
}
export interface CodexFeedMode {
  id: string;
  label: string;
  desc: string;
  signature?: boolean;
}
export interface CodexFeed {
  version: 1;
  staff: boolean;
  mode: string;
  modes: CodexFeedMode[];
  characters: CodexFeedCharacter[];
  abilities: CodexFeedAbility[];
  dossiers: Record<string, { seasons: CodexFeedSeason[] }>;
  relations: CodexFeedRelation[];
  /** Every character-to-character bond (the Nexus constellation's conduits). */
  bonds: CodexFeedBond[];
  /** Organizations, clans, bloodlines and factions with their character members. */
  groups: CodexFeedGroup[];
  /** Status history per character, from the same resolver the Nexus timeline uses. */
  status: Record<string, { current: string; steps: CodexFeedStatusStep[] }>;
  /** Series catalogue from the archive (Codex fills blanks and adds missing series only). */
  series: CodexFeedSeries[];
  /** Ability ranks per character, resolved like the Nexus rank map. */
  ranks: Record<string, CodexFeedRanks>;
  /** Rank names and colours shared with Nexus (index 0 = rank I). */
  rankMeta: { roman: string; title: string; color: string }[];
  /** Shared spoiler mask. Masked scopes are removed from the feed itself, not just hidden. */
  masked: CodexFeedMask;
}

export interface CodexEntityInput {
  id?: string;
  name: string;
  image_url?: string | null;
  status?: string | null;
  kind?: string | undefined;
  alias?: string | null;
  role?: string | null;
  category?: string | null;
  abilities?: string[] | null;
  stats?: unknown;
}
export interface CodexSeriesInput {
  id: string;
  title: string;
  description?: string | null;
  season_count?: number | null;
  season_names?: string[] | null;
}
export interface CodexRelationInput {
  source_id: string;
  target_id: string;
  rel: string;
  label?: string | null;
}
export interface CodexAbilityRowInput extends CharacterAbilityRankRow {
  entity_id: string;
}
export interface CodexMembershipInput {
  character_id: string;
  group_id: string;
}
export interface CodexAbilityInput {
  label: string;
  description?: string | undefined;
  group?: string | undefined;
}

const clip = (s: unknown, n: number) => {
  const t = typeof s === "string" ? s.trim() : "";
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};
/** Only real images may reach the Codex frame: resized data URLs or https links. */
export function safePortrait(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(t) && t.length < 400_000)
    return t;
  if (/^https:\/\/[^\s"'<>]+$/.test(t) && t.length < 2000) return t;
  return undefined;
}
/** Display name for an archive ability key: the registry label Nexus shows, else "aldercrest_arcane" -> "Aldercrest Arcane". */
export function abilityLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const def = lookupAbility(t);
  if (def?.label) return def.label;
  if (t.includes("_") || t === t.toLowerCase())
    return t
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return t;
}
const labels = (v: string[]) => {
  const out: string[] = [];
  for (const x of v) {
    const l = abilityLabel(x);
    if (l && !out.some((o) => o.toLowerCase() === l.toLowerCase())) out.push(l);
  }
  return out;
};
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];

function hasEntry(d: SeasonDossier | undefined): boolean {
  if (!d) return false;
  return Object.values(d).some((v) =>
    Array.isArray(v) ? v.length > 0 : v && typeof v === "object" ? Object.keys(v).length > 0 : !!v,
  );
}

/** Season rail for one character: only seasons that actually hold dossier data or stats. */
export function codexSeasonsFor(
  stats: unknown,
  seriesList: ReadonlyArray<CodexSeriesInput>,
): CodexFeedSeason[] {
  const dossier = readDossier(stats);
  const options = buildSeasonCompareOptions({ stats, seriesList });
  const out: CodexFeedSeason[] = [];
  for (const o of options) {
    const entry = dossier[o.key];
    if (!o.hasStats && !hasEntry(entry)) continue;
    const d: SeasonDossier = entry ?? {};
    const resolved = resolveNexusStats(stats, o.key === "all" ? null : o.key, null);
    const values = resolved.some((s) => s.value > 0) ? resolved : [];
    const seriesTitle = o.seriesId
      ? (seriesList.find((s) => s.id === o.seriesId)?.title ?? "Series")
      : "All seasons";
    const label = o.key === "all" ? "Base" : o.label.split(" · ").slice(1).join(" · ") || o.label;
    out.push({
      key: o.key,
      label: clip(label, 40),
      series: clip(seriesTitle, 40),
      codename: clip(d.codename, 80) || undefined,
      role: clip(d.role, 60) || undefined,
      roles: list(d.roles).slice(0, 6),
      status: clip(d.status, 40) || undefined,
      impact: clip(d.impact, 400) || undefined,
      story: clip(d.story, 1600) || undefined,
      gender: clip(d.gender, 20) || undefined,
      philosophy: clip(d.philosophy, 300) || undefined,
      bloodline: clip(d.bloodline, 120) || undefined,
      orgs: list(d.organizations).slice(0, 12),
      weapons: list(d.weapons).slice(0, 12),
      abilities: labels(list(d.abilityKeys)).slice(0, 24),
      stats: values,
      profiles: Object.keys(d.abilityStats ?? {})
        .slice(0, 12)
        .map((name) => ({
          name: clip(abilityLabel(name), 60),
          stats: resolveNexusStats(stats, o.key === "all" ? null : o.key, name),
        }))
        .filter((p) => p.name && p.stats.some((x) => x.value > 0)),
    });
  }
  return out;
}

export function buildCodexFeed({
  entities,
  series,
  abilities,
  staff,
  mode,
  modes,
  relations = [],
  groups = [],
  memberships = [],
  abilityRows = [],
  masked = { characters: false, abilities: false, archive: false, series: false },
}: {
  entities: ReadonlyArray<CodexEntityInput>;
  series: ReadonlyArray<CodexSeriesInput>;
  abilities: ReadonlyArray<CodexAbilityInput>;
  relations?: ReadonlyArray<CodexRelationInput>;
  groups?: ReadonlyArray<CodexEntityInput>;
  memberships?: ReadonlyArray<CodexMembershipInput>;
  abilityRows?: ReadonlyArray<CodexAbilityRowInput>;
  masked?: CodexFeedMask;
  staff: boolean;
  mode: string;
  modes: CodexFeedMode[];
}): CodexFeed {
  const characters: CodexFeedCharacter[] = [];
  const dossiers: CodexFeed["dossiers"] = {};
  const holders = new Map<string, string[]>();
  const nameById = new Map<string, string>();
  const statusOut: CodexFeed["status"] = {};
  const ranksOut: CodexFeed["ranks"] = {};
  const rowsById = new Map<string, CodexAbilityRowInput[]>();
  for (const r of abilityRows) {
    const l = rowsById.get(r.entity_id) ?? [];
    l.push(r);
    rowsById.set(r.entity_id, l);
  }
  for (const e of entities) {
    if (e.kind && e.kind !== "character") continue;
    const name = e.name?.trim();
    if (!name) continue;
    if (e.id) nameById.set(e.id, name);
    // The shared "characters" mask hides status, role, abilities and skills: none of it is sent.
    characters.push({
      name,
      aliases: (e.alias ?? "")
        .split(/[,/]/)
        .map((a) => a.trim())
        .filter(Boolean),
      desc: masked.characters ? undefined : clip(e.role || e.category, 280) || undefined,
      image: safePortrait(e.image_url),
      codex: codexCastName(name, e.alias ?? null),
    });
    if (masked.characters) continue;
    for (const ab of list(e.abilities)) {
      const k = abilityLabel(ab);
      const h = holders.get(k.toLowerCase()) ?? [];
      h.push(name);
      holders.set(k.toLowerCase(), h);
    }
    const seasons = masked.series ? [] : codexSeasonsFor(e.stats, series);
    if (seasons.length) dossiers[name] = { seasons };
    else if (!masked.series) {
      // Like Nexus, every character gets a dossier: a Base profile from the card's own
      // stats, at zero when nothing is recorded (flagged so the Codex can say so).
      const base = resolveNexusStats(e.stats, null, null);
      dossiers[name] = {
        seasons: [
          {
            key: "all",
            label: "Base",
            series: "All seasons",
            roles: [],
            orgs: [],
            weapons: [],
            abilities: labels(list(e.abilities)).slice(0, 24),
            stats: base,
            empty: !base.some((x) => x.value > 0),
          },
        ],
      };
    }
    const rows = e.id ? rowsById.get(e.id) : undefined;
    if (rows?.length) {
      const names = new Set<string>([...list(e.abilities), ...rows.map((r) => r.ability_key)]);
      for (const sn of seasons) for (const a of sn.abilities ?? []) names.add(a);
      const pick = (map: Record<string, number | undefined>) => {
        const o: Record<string, number> = {};
        for (const n of names) {
          const r = resolveAssignedAbilityRank(n, map);
          if (r) o[abilityLabel(n)] = r;
        }
        return o;
      };
      const seasonRanks: Record<string, Record<string, number>> = {};
      for (const sn of seasons) {
        const colon = sn.key.indexOf(":");
        if (colon <= 0) continue;
        const num = Number(sn.key.slice(colon + 1));
        if (!Number.isInteger(num) || num <= 0) continue;
        const m = pick(
          buildAbilityRankMap(rows, {
            seriesId: sn.key.slice(0, colon),
            seasonNumber: num,
            includePriorSeasons: true,
          }),
        );
        if (Object.keys(m).length) seasonRanks[sn.key] = m;
      }
      const base = pick(buildAbilityRankMap(rows));
      if (Object.keys(base).length || Object.keys(seasonRanks).length)
        ranksOut[name] = { base, seasons: seasonRanks };
    }
    if (!masked.series) {
      const tl = resolveCharacterStatusTimeline({
        entity: { id: e.id ?? name, name, status: e.status ?? null, stats: e.stats },
        seriesList: series,
      });
      if (tl.steps.length > 1 || tl.transitions.length) {
        statusOut[name] = {
          current: clip(tl.currentStatus, 40),
          steps: tl.steps.slice(0, 40).map((st) => ({
            label: clip(st.label, 80),
            short: clip(st.shortLabel, 40),
            status: clip(st.status, 40),
            from: clip(st.fromStatus, 40) || undefined,
            transition: st.isTransition,
            season:
              st.seriesId && st.seasonNumber ? `${st.seriesId}:${st.seasonNumber}` : undefined,
          })),
        };
      }
    }
  }
  const seen = new Set<string>();
  const abilityOut: CodexFeedAbility[] = [];
  const push = (name: string, desc?: string, group?: string) => {
    name = abilityLabel(name);
    const k = name.trim().toLowerCase();
    if (!k || seen.has(k)) return;
    seen.add(k);
    // The "abilities" mask hides who holds what.
    const h = masked.abilities ? [] : (holders.get(k) ?? []);
    if (!h.length && !desc) return;
    abilityOut.push({
      name: name.trim(),
      desc: clip(desc, 400) || undefined,
      holders: h,
      group: group || undefined,
    });
  };
  for (const a of abilities) push(a.label, a.description, a.group);
  if (!masked.characters) for (const e of entities) for (const ab of list(e.abilities)) push(ab);
  const rels: CodexFeedRelation[] = [];
  const bonds: CodexFeedBond[] = [];
  const groupOut: CodexFeedGroup[] = [];
  if (!masked.characters) {
    const bondSeen = new Set<string>();
    for (const r of relations) {
      const a = nameById.get(r.source_id);
      const b = nameById.get(r.target_id);
      const rel = typeof r.rel === "string" ? r.rel.trim().toLowerCase() : "";
      if (!a || !b || a === b || !rel) continue;
      if (isFamilyRel(rel)) rels.push({ a, b, rel });
      const k = `${a}|${rel}|${b}`;
      if (bondSeen.has(k) || bonds.length >= 1500) continue;
      bondSeen.add(k);
      bonds.push({ a, b, rel: clip(rel, 30), label: clip(r.label, 120) || undefined });
    }
    const members = new Map<string, string[]>();
    for (const m of memberships) {
      const who = nameById.get(m.character_id);
      if (!who) continue;
      const list2 = members.get(m.group_id) ?? [];
      if (!list2.includes(who)) list2.push(who);
      members.set(m.group_id, list2);
    }
    for (const g of groups) {
      const name = g.name?.trim();
      if (!g.id || !name || !g.kind || g.kind === "character") continue;
      const m = members.get(g.id);
      if (!m?.length) continue;
      groupOut.push({ name: clip(name, 80), kind: g.kind, members: m.slice(0, 200) });
    }
  }
  return {
    version: 1,
    staff,
    mode,
    modes,
    characters,
    abilities: abilityOut,
    dossiers,
    relations: rels,
    bonds,
    groups: groupOut,
    status: statusOut,
    series: masked.series
      ? []
      : series.slice(0, 60).map((sr) => {
          const names = sr.season_names ?? [];
          const count = Math.min(60, Math.max(sr.season_count ?? 0, names.length));
          return {
            title: clip(sr.title, 80),
            desc: clip(sr.description, 400) || undefined,
            seasons: Array.from({ length: count }, (_, i) => clip(names[i], 80)),
          };
        }),
    ranks: ranksOut,
    rankMeta: ([1, 2, 3, 4, 5] as const).map((r) => ({
      roman: ABILITY_RANK_META[r].roman,
      title: ABILITY_RANK_META[r].shortTitle,
      color: ABILITY_RANK_META[r].ringColor,
    })),
    masked,
  };
}

/** App path <-> Codex dock tab. Only these paths render the Codex itself. */
export const CODEX_NATIVE_PATHS: Record<string, string> = {
  "/": "home",
  "/characters": "characters",
  "/series": "series",
  "/clans": "clans",
  "/orgs": "orgs",
  "/abilities": "abilities",
  "/arsenal": "arsenal",
  "/timeline": "timeline",
  "/graph": "graph",
};

export function codexTabForPath(pathname: string): string | null {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return CODEX_NATIVE_PATHS[clean] ?? null;
}

/** Only in-app, same-origin paths may be opened from the Codex frame. */
export function safeCodexPath(path: unknown): string | null {
  if (typeof path !== "string") return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (!/^\/[A-Za-z0-9\-/]*$/.test(path)) return null;
  return path;
}
