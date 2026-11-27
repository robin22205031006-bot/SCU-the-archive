import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { SyncPlan } from "./adminLoreSync";
import { CANON_CHARACTER_ABILITIES } from "./abilities";
import { canonicalCharacterName } from "./adminLoreSync";

/**
 * Writes a planned lore sync in batches.
 *
 * The planner (planLoreSync) decides what changes; this only executes it. Writes used
 * to go one row at a time, so a full Cast or lore-export sync made hundreds to
 * thousands of database calls in one server request and was cut off by the hosting
 * time/subrequest limits before it finished. Batches keep the call count small
 * (bulk inserts, updates grouped by identical patch, chunked lookups) while every
 * write is still checked, so partial failures are reported instead of false success.
 */
export const SYNC_CHUNK = 200;
/** Ids per `.in()` filter: keeps GET URLs well under proxy limits. */
export const SYNC_ID_CHUNK = 60;

export interface SyncSummary {
  created: number;
  notes: number;
  updated: number;
  events: number;
  warnings: string[];
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function checked<T>(result: { data: T; error: unknown }, label: string): T {
  if (result.error) {
    const detail =
      typeof result.error === "object" && result.error !== null && "message" in result.error
        ? String((result.error as { message: unknown }).message)
        : String(result.error);
    console.error(`[loreSync] ${label} failed:`, result.error);
    throw new Error(
      `The sync could not finish (${label}): ${detail}. Some entries may have saved; review the archive before retrying.`,
    );
  }
  return result.data;
}

/** Groups rows whose patch is identical, so one UPDATE … WHERE id IN (…) covers them. */
function groupByPatch<P>(
  rows: Array<{ id: string; patch: P }>,
): Array<{ patch: P; ids: string[] }> {
  const map = new Map<string, { patch: P; ids: string[] }>();
  for (const r of rows) {
    const key = JSON.stringify(r.patch);
    const g = map.get(key);
    if (g) g.ids.push(r.id);
    else map.set(key, { patch: r.patch, ids: [r.id] });
  }
  return [...map.values()];
}

/** Best-effort backfill of canonical character abilities where unlocked and empty. */
export async function backfillCanonAbilities(sb: SupabaseClient<Database>): Promise<void> {
  try {
    const { data: chars, error } = await sb
      .from("entities")
      .select("id, name, abilities, locked_fields")
      .eq("kind", "character");
    if (error || !chars) return;
    const todo: Array<{ id: string; patch: string[] }> = [];
    for (const ch of chars) {
      if ((ch.locked_fields ?? []).includes("abilities")) continue;
      if ((ch.abilities?.length ?? 0) > 0) continue;
      const canon = CANON_CHARACTER_ABILITIES[canonicalCharacterName(ch.name)];
      if (canon?.length) todo.push({ id: ch.id, patch: canon });
    }
    const now = new Date().toISOString();
    for (const g of groupByPatch(todo)) {
      for (const ids of chunks(g.ids, SYNC_ID_CHUNK)) {
        await sb.from("entities").update({ abilities: g.patch, updated_at: now }).in("id", ids);
      }
    }
  } catch {
    /* non-fatal best-effort ability hydration */
  }
}

export async function executeSyncPlan(
  sb: SupabaseClient<Database>,
  plan: SyncPlan,
  filename: string,
): Promise<SyncSummary> {
  // 1. new entities, in bulk; their conflict notes follow once ids exist
  const conflictNotes: Array<{ entity_id: string; text: string; source: string }> = [];
  for (const batch of chunks(plan.entityInserts, SYNC_CHUNK)) {
    const rows = checked(
      await sb
        .from("entities")
        .insert(
          batch.map((ins) => ({
            kind: ins.kind,
            name: ins.name,
            alias: ins.alias,
            role: ins.role,
            status: ins.status ?? (ins.kind === "character" ? "Alive" : "Active"),
            category: ins.category,
            description: ins.description,
            image_url: ins.image_url,
          })),
        )
        .select("id, name"),
      `entity insert (${batch.length} cards)`,
    );
    const byName = new Map<string, string>();
    for (const r of rows ?? []) byName.set(r.name, r.id);
    if (byName.size < new Set(batch.map((b) => b.name)).size) {
      throw new Error(
        "The sync could not finish (entity insert): the archive did not confirm every new card. Some entries may have saved; review the archive before retrying.",
      );
    }
    for (const ins of batch) {
      const id = byName.get(ins.name);
      if (!id) continue;
      for (const text of ins.notes) conflictNotes.push({ entity_id: id, text, source: ins.source });
    }
  }
  for (const batch of chunks(conflictNotes, SYNC_CHUNK)) {
    checked(await sb.from("lore_notes").insert(batch), `conflict notes (${batch.length})`);
  }

  // 2. lore notes for existing cards, skipping ones the card already has
  const noteEntityIds = [...new Set(plan.loreNoteInserts.map((n) => n.entity_id))];
  const existingNotes = new Set<string>();
  for (const ids of chunks(noteEntityIds, SYNC_ID_CHUNK)) {
    const rows = checked(
      await sb.from("lore_notes").select("entity_id, text").in("entity_id", ids),
      "existing lore notes",
    );
    for (const r of rows ?? []) existingNotes.add(`${r.entity_id}::${r.text.trim()}`);
  }
  const freshNotes: SyncPlan["loreNoteInserts"] = [];
  for (const note of plan.loreNoteInserts) {
    const key = `${note.entity_id}::${note.text.trim()}`;
    if (existingNotes.has(key)) continue;
    existingNotes.add(key);
    freshNotes.push(note);
  }
  for (const batch of chunks(freshNotes, SYNC_CHUNK)) {
    checked(await sb.from("lore_notes").insert(batch), `lore notes (${batch.length})`);
  }

  // 3. status/alias patches (planner already respects locked_fields), grouped
  const now = new Date().toISOString();
  for (const g of groupByPatch(plan.entityUpdates.map((u) => ({ id: u.id, patch: u.patch })))) {
    for (const ids of chunks(g.ids, SYNC_ID_CHUNK)) {
      checked(
        await sb
          .from("entities")
          .update({ ...g.patch, updated_at: now })
          .in("id", ids),
        `entity update (${ids.length} cards)`,
      );
    }
  }

  // 4. timeline events, in bulk
  for (const batch of chunks(plan.timelineInserts, SYNC_CHUNK)) {
    checked(
      await sb.from("timeline_events").insert(
        batch.map((ev) => ({
          title: ev.title,
          era: ev.era,
          description: ev.description,
          source: ev.source,
          sort_order: ev.sort_order,
        })),
      ),
      `timeline events (${batch.length})`,
    );
  }

  await backfillCanonAbilities(sb);

  const updatedIds = new Set<string>([
    ...plan.entityUpdates.map((u) => u.id),
    ...plan.loreNoteInserts.map((n) => n.entity_id),
  ]);
  const summary: SyncSummary = {
    created: plan.entityInserts.length,
    notes: freshNotes.length,
    updated: updatedIds.size,
    events: plan.timelineInserts.length,
    warnings: plan.warnings,
  };
  checked(
    await sb.from("ingest_jobs").insert({ filename, summary: summary as unknown as Json }),
    "ingest_jobs insert",
  );
  return summary;
}
