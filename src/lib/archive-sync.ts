import type { QueryClient } from "@tanstack/react-query";

/**
 * Every cached view that reads shared archive records (characters, groups,
 * memberships, series appearances, abilities). Any write to shared data calls
 * invalidateArchive so all tabs, graphs and dossiers refresh together.
 */
export const SHARED_ARCHIVE_KEYS = [
  ["entities"],
  ["entity"],
  ["entity-categories"],
  ["entity-children"],
  ["all-characters-short"],
  ["first-character"],
  ["search-index"],
  ["entity-links"],
  ["entity-link-targets"],
  ["clan-graph-memberships"],
  ["graph-memberships"],
  ["character-series"],
  ["series-characters"],
  ["series-member-entities"],
  ["series"],
  ["character-abilities"],
  ["roster-abilities"],
  ["nexus-series-abilities"],
  ["char-relationships"],
  ["rel-targets"],
  ["entity-relations"],
  ["admin-conflicts"],
] as const;

export function invalidateArchive(qc: QueryClient) {
  return Promise.all(
    SHARED_ARCHIVE_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey: [...queryKey] })),
  );
}

const norm = (s: string) => s.trim().toLowerCase();

/** Resolve typed group names to existing group entity ids (exact, case-insensitive). */
export function resolveGroupIds(names: string[], groups: { id: string; name: string }[]) {
  const byName = new Map(groups.map((g) => [norm(g.name), g.id]));
  return [...new Set(names.map((n) => byName.get(norm(n))).filter((x): x is string => !!x))];
}
