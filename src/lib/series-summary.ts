import { canonicalCharacterName } from "@/lib/adminLoreSync";
import type { Entity } from "@/lib/entities";
import { readDossier } from "@/lib/nexus-season";
import { CANON_SERIES_ROSTERS, type Series } from "@/lib/series";

export type SeriesSortMode = "title-asc" | "chars-desc" | "chars-asc";

export const SERIES_SORT_OPTIONS: ReadonlyArray<{ value: SeriesSortMode; label: string }> = [
  { value: "title-asc", label: "Title (A–Z)" },
  { value: "chars-desc", label: "Characters (High–Low)" },
  { value: "chars-asc", label: "Characters (Low–High)" },
];

export interface SeriesCharacterCountRow {
  series_id: string;
  character_id?: string | null | undefined;
}

export interface SeriesMembershipRow {
  character_id: string;
  group_id: string;
}

export interface SeriesSagaSummaryDatum {
  seriesId: string;
  title: string;
  shortTitle: string;
  characters: number;
  organizations: number;
}

export interface SeriesArchiveSummary {
  sagas: SeriesSagaSummaryDatum[];
  countsBySeries: Map<string, number>;
  orgCountsBySeries: Map<string, number>;
  totalCharacters: number;
  totalOrganizations: number;
  totalSagas: number;
}

const norm = (s: string) => s.trim().toLowerCase();

function compactTitle(title: string): string {
  const clean = title.trim();
  return clean.length > 16 ? `${clean.slice(0, 15).trimEnd()}…` : clean;
}

export function sortSeriesList(
  seriesList: readonly Series[],
  counts: ReadonlyMap<string, number>,
  sortBy: SeriesSortMode,
): Series[] {
  const copy = [...seriesList];
  if (sortBy === "chars-desc") {
    return copy.sort(
      (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.title.localeCompare(b.title),
    );
  }
  if (sortBy === "chars-asc") {
    return copy.sort(
      (a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) || a.title.localeCompare(b.title),
    );
  }
  return copy.sort((a, b) => a.title.localeCompare(b.title));
}

function hasActiveSeriesDossier(entity: Entity, seriesId: string): boolean {
  const map = readDossier(entity.stats);
  const seriesAll = map[`${seriesId}:all`];
  if (seriesAll?.roster === false) return false;
  return Object.entries(map).some(([k, v]) => k.startsWith(`${seriesId}:`) && v.roster !== false);
}

export function summarizeSeriesSagas({
  series,
  seriesCharacterRows = [],
  characters = [],
  groups = [],
  memberships = [],
}: {
  series: readonly Series[];
  seriesCharacterRows?: readonly SeriesCharacterCountRow[] | undefined;
  characters?: readonly Entity[] | undefined;
  groups?: readonly Entity[] | undefined;
  memberships?: readonly SeriesMembershipRow[] | undefined;
}): SeriesArchiveSummary {
  const charById = new Map<string, Entity>();
  const charByNormName = new Map<string, string>();
  for (const c of characters) {
    charById.set(c.id, c);
    const exact = norm(c.name);
    const canon = canonicalCharacterName(c.name);
    if (exact) charByNormName.set(exact, c.id);
    if (canon && (!charByNormName.has(canon) || exact === canon)) {
      charByNormName.set(canon, c.id);
    }
  }

  const groupById = new Map<string, Entity>();
  const groupByNormName = new Map<string, string>();
  for (const g of groups) {
    groupById.set(g.id, g);
    const exact = norm(g.name);
    if (exact) groupByNormName.set(exact, g.id);
    if (g.alias) {
      for (const part of g.alias.split(/[·,/]/)) {
        const aliasNorm = norm(part);
        if (aliasNorm && !groupByNormName.has(aliasNorm)) {
          groupByNormName.set(aliasNorm, g.id);
        }
      }
    }
  }

  const membershipsByChar = new Map<string, string[]>();
  for (const m of memberships) {
    if (!m.character_id || !m.group_id) continue;
    const list = membershipsByChar.get(m.character_id) ?? [];
    list.push(m.group_id);
    membershipsByChar.set(m.character_id, list);
  }

  const countsBySeries = new Map<string, number>();
  const orgCountsBySeries = new Map<string, number>();
  const globalUniqueCharIds = new Set<string>();
  const globalUniqueOrgIds = new Set<string>();
  const globalUniqueUnlinkedOrgs = new Set<string>();
  let unkeyedCharRowSum = 0;

  const sagas: SeriesSagaSummaryDatum[] = series.map((s) => {
    const charIds = new Set<string>();
    let rawRowCount = 0;
    let unkeyedRows = 0;

    for (const row of seriesCharacterRows) {
      if (row.series_id !== s.id) continue;
      rawRowCount += 1;
      if (row.character_id) {
        charIds.add(row.character_id);
      } else {
        unkeyedRows += 1;
      }
    }

    for (const c of characters) {
      if (hasActiveSeriesDossier(c, s.id)) {
        charIds.add(c.id);
      }
    }

    if (rawRowCount === 0 && characters.length > 0) {
      const roster = CANON_SERIES_ROSTERS[s.id] ?? CANON_SERIES_ROSTERS[s.title];
      if (roster?.length) {
        for (const entry of roster) {
          const matchedId =
            charByNormName.get(norm(entry.characterName)) ??
            charByNormName.get(canonicalCharacterName(entry.characterName));
          if (matchedId) {
            charIds.add(matchedId);
          }
        }
      }
    }

    const charCount = Math.max(charIds.size, rawRowCount);
    countsBySeries.set(s.id, charCount);
    for (const cid of charIds) globalUniqueCharIds.add(cid);
    if (unkeyedRows > 0 && charIds.size === 0) {
      unkeyedCharRowSum += unkeyedRows;
    }

    const orgIds = new Set<string>();
    const unlinkedOrgNames = new Set<string>();

    for (const g of groups) {
      if (hasActiveSeriesDossier(g, s.id)) {
        orgIds.add(g.id);
      }
    }

    for (const cid of charIds) {
      for (const gid of membershipsByChar.get(cid) ?? []) {
        if (groups.length === 0 || groupById.has(gid)) {
          orgIds.add(gid);
        }
      }

      const char = charById.get(cid);
      if (!char) continue;
      const dossier = readDossier(char.stats);
      for (const [key, entry] of Object.entries(dossier)) {
        if (!key.startsWith(`${s.id}:`) || entry.roster === false) continue;
        const refs = [...(entry.organizations ?? []), ...(entry.bloodline ? [entry.bloodline] : [])];
        for (const rawName of refs) {
          const clean = norm(rawName);
          if (!clean) continue;
          const matchedGroupId = groupByNormName.get(clean);
          if (matchedGroupId) {
            orgIds.add(matchedGroupId);
          } else {
            unlinkedOrgNames.add(clean);
          }
        }
      }
    }

    const orgCount = orgIds.size + unlinkedOrgNames.size;
    orgCountsBySeries.set(s.id, orgCount);
    for (const oid of orgIds) globalUniqueOrgIds.add(oid);
    for (const name of unlinkedOrgNames) globalUniqueUnlinkedOrgs.add(name);

    return {
      seriesId: s.id,
      title: s.title,
      shortTitle: compactTitle(s.title),
      characters: charCount,
      organizations: orgCount,
    };
  });

  const totalCharacters =
    globalUniqueCharIds.size > 0
      ? globalUniqueCharIds.size + unkeyedCharRowSum
      : sagas.reduce((sum, d) => sum + d.characters, 0);

  const totalOrganizations = globalUniqueOrgIds.size + globalUniqueUnlinkedOrgs.size;

  return {
    sagas,
    countsBySeries,
    orgCountsBySeries,
    totalCharacters,
    totalOrganizations,
    totalSagas: sagas.length,
  };
}
