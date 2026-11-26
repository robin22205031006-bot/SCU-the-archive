/**
 * Codex -> archive sync planning (pure, tested). Staff edits saved inside the Codex are turned
 * into the smallest archive change; writes then go through the app's existing checked paths
 * (saveSeasonTitles for seasons, the RLS-protected client for character cards).
 */

/**
 * New positional season titles for an archive series, or null when nothing changes. Only
 * seasons the archive already has are touched (adding seasons stays a Series-page action), and
 * a blank Codex title never erases an archive title.
 */
export function planSeasonTitles(
  current: readonly string[],
  codexSeasons: ReadonlyArray<{ n: number; name: string }>,
): string[] | null {
  const next = [...current];
  let changed = false;
  for (const s of codexSeasons) {
    const i = s.n - 1;
    const name = (s.name ?? "").trim();
    if (i < 0 || i >= next.length || !name) continue;
    if ((next[i] ?? "").trim() !== name) {
      next[i] = name;
      changed = true;
    }
  }
  return changed ? next : null;
}

export interface CharacterCardPatch {
  alias?: string;
  description?: string;
  locked_fields: string[];
}

/**
 * Card fields a Codex character edit changes. Title/codename maps to alias and the "who they
 * are" text to description; changed fields are locked so imports never overwrite them.
 * Returns null when nothing differs. Blank Codex values never erase archive text.
 */
export function planCharacterPatch(
  card: { alias: string | null; description: string | null; locked_fields: string[] | null },
  edit: { title?: string | undefined; abil?: string | undefined },
): CharacterCardPatch | null {
  const patch: CharacterCardPatch = { locked_fields: [...(card.locked_fields ?? [])] };
  const title = (edit.title ?? "").trim();
  const desc = (edit.abil ?? "").trim();
  if (title && title !== (card.alias ?? "").trim()) {
    patch.alias = title;
    if (!patch.locked_fields.includes("alias")) patch.locked_fields.push("alias");
  }
  if (desc && desc !== (card.description ?? "").trim()) {
    patch.description = desc;
    if (!patch.locked_fields.includes("description")) patch.locked_fields.push("description");
  }
  return patch.alias === undefined && patch.description === undefined ? null : patch;
}
