import { isFamilyRel } from "@/lib/family";
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
}
export interface CodexFeedRelation {
  /** "source is <rel> of target"; names are the archive's. */
  a: string;
  b: string;
  rel: "parent" | "sibling" | "spouse" | "ancestor";
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
  /** Shared spoiler mask. Masked scopes are removed from the feed itself, not just hidden. */
  masked: CodexFeedMask;
}

export interface CodexEntityInput {
  id?: string;
  name: string;
  image_url?: string | null;
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
  season_count?: number | null;
  season_names?: string[] | null;
}
export interface CodexRelationInput {
  source_id: string;
  target_id: string;
  rel: string;
}
export interface CodexAbilityInput {
  label: string;
  description?: string | undefined;
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
      abilities: list(d.abilityKeys).slice(0, 24),
      stats: values,
      profiles: Object.keys(d.abilityStats ?? {})
        .slice(0, 12)
        .map((name) => ({
          name: clip(name, 60),
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
  masked = { characters: false, abilities: false, archive: false, series: false },
}: {
  entities: ReadonlyArray<CodexEntityInput>;
  series: ReadonlyArray<CodexSeriesInput>;
  abilities: ReadonlyArray<CodexAbilityInput>;
  relations?: ReadonlyArray<CodexRelationInput>;
  masked?: CodexFeedMask;
  staff: boolean;
  mode: string;
  modes: CodexFeedMode[];
}): CodexFeed {
  const characters: CodexFeedCharacter[] = [];
  const dossiers: CodexFeed["dossiers"] = {};
  const holders = new Map<string, string[]>();
  const nameById = new Map<string, string>();
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
    });
    if (masked.characters) continue;
    for (const ab of list(e.abilities)) {
      const k = ab.trim();
      const h = holders.get(k.toLowerCase()) ?? [];
      h.push(name);
      holders.set(k.toLowerCase(), h);
    }
    const seasons = masked.series ? [] : codexSeasonsFor(e.stats, series);
    if (seasons.length) dossiers[name] = { seasons };
  }
  const seen = new Set<string>();
  const abilityOut: CodexFeedAbility[] = [];
  const push = (name: string, desc?: string) => {
    const k = name.trim().toLowerCase();
    if (!k || seen.has(k)) return;
    seen.add(k);
    // The "abilities" mask hides who holds what.
    const h = masked.abilities ? [] : (holders.get(k) ?? []);
    if (!h.length && !desc) return;
    abilityOut.push({ name: name.trim(), desc: clip(desc, 400) || undefined, holders: h });
  };
  for (const a of abilities) push(a.label, a.description);
  if (!masked.characters) for (const e of entities) for (const ab of list(e.abilities)) push(ab);
  const rels: CodexFeedRelation[] = [];
  if (!masked.characters) {
    for (const r of relations) {
      const a = nameById.get(r.source_id);
      const b = nameById.get(r.target_id);
      if (!a || !b || a === b || !isFamilyRel(r.rel)) continue;
      rels.push({ a, b, rel: r.rel });
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
