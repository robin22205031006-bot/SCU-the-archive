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
}

export interface CodexEntityInput {
  name: string;
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
export interface CodexAbilityInput {
  label: string;
  description?: string | undefined;
}

const clip = (s: unknown, n: number) => {
  const t = typeof s === "string" ? s.trim() : "";
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
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
      abilities: list(d.abilityKeys).slice(0, 24),
      stats: values,
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
}: {
  entities: ReadonlyArray<CodexEntityInput>;
  series: ReadonlyArray<CodexSeriesInput>;
  abilities: ReadonlyArray<CodexAbilityInput>;
  staff: boolean;
  mode: string;
  modes: CodexFeedMode[];
}): CodexFeed {
  const characters: CodexFeedCharacter[] = [];
  const dossiers: CodexFeed["dossiers"] = {};
  const holders = new Map<string, string[]>();
  for (const e of entities) {
    if (e.kind && e.kind !== "character") continue;
    const name = e.name?.trim();
    if (!name) continue;
    characters.push({
      name,
      aliases: (e.alias ?? "")
        .split(/[,/]/)
        .map((a) => a.trim())
        .filter(Boolean),
      desc: clip(e.role || e.category, 280) || undefined,
    });
    for (const ab of list(e.abilities)) {
      const k = ab.trim();
      const h = holders.get(k.toLowerCase()) ?? [];
      h.push(name);
      holders.set(k.toLowerCase(), h);
    }
    const seasons = codexSeasonsFor(e.stats, series);
    if (seasons.length) dossiers[name] = { seasons };
  }
  const seen = new Set<string>();
  const abilityOut: CodexFeedAbility[] = [];
  const push = (name: string, desc?: string) => {
    const k = name.trim().toLowerCase();
    if (!k || seen.has(k)) return;
    seen.add(k);
    const h = holders.get(k) ?? [];
    if (!h.length && !desc) return;
    abilityOut.push({ name: name.trim(), desc: clip(desc, 400) || undefined, holders: h });
  };
  for (const a of abilities) push(a.label, a.description);
  for (const e of entities) for (const ab of list(e.abilities)) push(ab);
  return { version: 1, staff, mode, modes, characters, abilities: abilityOut, dossiers };
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
