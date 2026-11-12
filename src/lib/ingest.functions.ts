import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { filterGrounded, normalize } from "./lore-merge";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { loreExtractionPrompt, loreJsonSchema, parseLoreExtraction } from "./lore-extraction";
import { isSuperadminEmail } from "./roles";
import {
  ALIAS_MAP,
  aliasesForCanonical,
  canonicalCharacterName,
  planLoreSync,
  type SyncInput,
  type SyncPlan,
} from "./adminLoreSync";
import { CANON_CHARACTER_ABILITIES } from "./abilities";

const kinds = ["character", "organization", "clan", "bloodline", "faction"] as const;

async function assertAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
  email?: string | null,
) {
  if (isSuperadminEmail(email)) return;
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Only the admin can do this.");
}

function claimEmail(claims: unknown): string | null {
  const email = (claims as { email?: unknown } | null | undefined)?.email;
  return typeof email === "string" ? email : null;
}

/** Load custom runtime aliases from entity_name_aliases if the table exists. */
async function loadDynamicAliases(sb: SupabaseClient<Database>): Promise<Record<string, string>> {
  try {
    const { data, error } = await sb
      .from("entity_name_aliases")
      .select("alias_norm, canonical_name");
    if (error || !data) return {};
    const out: Record<string, string> = {};
    for (const row of data) {
      if (row.alias_norm && row.canonical_name) {
        out[normalize(row.alias_norm)] = normalize(row.canonical_name);
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** Best-effort backfill of canonical character abilities where unlocked and empty. */
async function backfillCanonAbilities(sb: SupabaseClient<Database>) {
  try {
    const { data: chars, error } = await sb
      .from("entities")
      .select("id, name, abilities, locked_fields")
      .eq("kind", "character");
    if (error || !chars) return;
    for (const ch of chars) {
      const locks = ch.locked_fields ?? [];
      if (locks.includes("abilities")) continue;
      if ((ch.abilities?.length ?? 0) > 0) continue;
      const canonAbilities = CANON_CHARACTER_ABILITIES[canonicalCharacterName(ch.name)];
      if (!canonAbilities?.length) continue;
      await sb
        .from("entities")
        .update({ abilities: canonAbilities, updated_at: new Date().toISOString() })
        .eq("id", ch.id);
    }
  } catch {
    /* non-fatal best-effort ability hydration */
  }
}

async function executeSyncPlan(sb: SupabaseClient<Database>, plan: SyncPlan, filename: string) {
  const checked = <T>(result: { data: T; error: unknown }, label = "write") => {
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
  };

  for (const ins of plan.entityInserts) {
    const inserted = checked(
      await sb
        .from("entities")
        .insert({
          kind: ins.kind,
          name: ins.name,
          alias: ins.alias,
          role: ins.role,
          status: ins.status ?? (ins.kind === "character" ? "Alive" : "Active"),
          category: ins.category,
          description: ins.description,
          image_url: ins.image_url,
        })
        .select("id")
        .single(),
      `entity insert '${ins.name}'`,
    );
    if (!inserted) {
      throw new Error(
        `The sync could not finish (entity insert '${ins.name}'). Some entries may have saved; review the archive before retrying.`,
      );
    }
    for (const note of ins.notes) {
      checked(
        await sb
          .from("lore_notes")
          .insert({ entity_id: inserted.id, text: note, source: ins.source }),
        `conflict note for '${ins.name}'`,
      );
    }
  }

  for (const note of plan.loreNoteInserts) {
    checked(await sb.from("lore_notes").insert(note), `lore note for entity ${note.entity_id}`);
  }

  for (const upd of plan.entityUpdates) {
    checked(
      await sb
        .from("entities")
        .update({ ...upd.patch, updated_at: new Date().toISOString() })
        .eq("id", upd.id),
      `entity update ${upd.id}`,
    );
  }

  for (const ev of plan.timelineInserts) {
    checked(
      await sb.from("timeline_events").insert({
        title: ev.title,
        era: ev.era,
        description: ev.description,
        source: ev.source,
        sort_order: ev.sort_order,
      }),
      `timeline event '${ev.title}'`,
    );
  }

  await backfillCanonAbilities(sb);

  const updatedIds = new Set<string>([
    ...plan.entityUpdates.map((u) => u.id),
    ...plan.loreNoteInserts.map((n) => n.entity_id),
  ]);

  const summary = {
    created: plan.entityInserts.length,
    notes: plan.loreNoteInserts.length,
    updated: updatedIds.size,
    events: plan.timelineInserts.length,
    warnings: plan.warnings,
  };

  checked(await sb.from("ingest_jobs").insert({ filename, summary }), "ingest_jobs insert");

  return summary;
}

export const analyzeLore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().min(20).max(400_000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId, claimEmail(context.claims));
    const [{ data: existing, error }, dynamicAliases] = await Promise.all([
      context.supabase.from("entities").select("name, kind, alias"),
      loadDynamicAliases(context.supabase),
    ]);
    if (error) throw new Error("The archive could not be loaded. Please try again.");

    const names =
      (existing ?? [])
        .map((e) => `${e.name} (${e.kind}${e.alias ? `; aliases: ${e.alias}` : ""})`)
        .join("; ") || "none";

    const aliasPairs = Object.entries({ ...ALIAS_MAP, ...dynamicAliases })
      .map(([a, c]) => `${a} -> ${c}`)
      .join(", ");

    const userText =
      `Existing archive entries: ${names}\n` +
      `Known merged aliases (always map these in updates using the existing archive entry name): ${aliasPairs}\n\n` +
      `STORY TEXT:\n${data.text}`;

    let raw: string;
    try {
      const { generateGemini, pickGeminiKey } = await import("./gemini.server");
      raw = await generateGemini(pickGeminiKey("admin"), {
        contents: [{ role: "user", parts: [{ text: userText }] }],
        config: {
          systemInstruction: loreExtractionPrompt,
          responseMimeType: "application/json",
          responseJsonSchema: loreJsonSchema,
        },
      });
    } catch {
      // Gemini keys are unreliable; fall back to the AI Gateway with the same prompt.
      const { generateResponse } = await import("@lovable.dev/ai-gateway");
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          loreExtractionPrompt +
          "\nReturn ONLY a JSON object matching this JSON schema, no prose:\n" +
          JSON.stringify(loreJsonSchema),
        input: [{ role: "user", content: userText }],
      });
      raw = "";
      for (const item of response.output ?? [])
        if (item.type === "message")
          for (const c of item.content) if (c.type === "output_text") raw += c.text;
      raw = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
      if (!raw) throw new Error("The lore reader is busy. Nothing was saved; try again shortly.");
    }
    try {
      return parseLoreExtraction(raw, data.text, dynamicAliases);
    } catch {
      throw new Error(
        "Gemini returned invalid lore data. Nothing was saved; analyze the PDF again.",
      );
    }
  });

const applySchema = z.object({
  filename: z.string().max(300),
  source_text: z.string().min(20).max(400_000),
  new_entities: z.array(
    z.object({
      kind: z.enum(kinds),
      name: z.string(),
      alias: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
      role: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
      status: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
      category: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
      description: z.string().optional().default(""),
      quote: z.string().optional().default(""),
    }),
  ),
  updates: z.array(
    z.object({
      existing_name: z.string(),
      new_facts: z.string().optional().default(""),
      status: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
      quote: z.string().optional().default(""),
    }),
  ),
  events: z.array(
    z.object({
      title: z.string(),
      era: z
        .string()
        .nullish()
        .transform((v) => v ?? null),
      description: z.string().optional().default(""),
      quote: z.string().optional().default(""),
    }),
  ),
});

export const applyLore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => applySchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertAdmin(sb, context.userId, claimEmail(context.claims));
    const src = data.filename;
    const dynamicAliases = await loadDynamicAliases(sb);
    const grounded = filterGrounded(data, data.source_text, (name) =>
      aliasesForCanonical(name, undefined, dynamicAliases),
    );
    if (
      grounded.new_entities.length !== data.new_entities.length ||
      grounded.updates.length !== data.updates.length ||
      grounded.events.length !== data.events.length
    ) {
      throw new Error("Some selected lore is no longer supported by the PDF. Analyze it again.");
    }

    const [archive, existingTimeline] = await Promise.all([
      sb.from("entities").select("id, name, alias, kind, status, category, locked_fields"),
      sb
        .from("timeline_events")
        .select("title, era, sort_order")
        .order("sort_order", { ascending: false }),
    ]);
    if (archive.error) throw new Error("The archive could not be loaded. Nothing was saved.");
    if (existingTimeline.error)
      throw new Error("The timeline could not be loaded. Nothing was saved.");

    const lastSortOrder = existingTimeline.data?.[0]?.sort_order ?? 0;
    const plan = planLoreSync(
      (archive.data ?? []).map((e) => ({ ...e, locked_fields: e.locked_fields ?? [] })),
      [
        {
          source: src,
          new_entities: grounded.new_entities,
          updates: grounded.updates,
          events: grounded.events,
        },
      ],
      lastSortOrder,
      {
        dynamicAliases,
        existingTimeline: existingTimeline.data ?? [],
      },
    );

    const summary = await executeSyncPlan(sb, plan, src);
    return {
      created: summary.created,
      updated: summary.updated,
      events: summary.events,
      warnings: summary.warnings,
    };
  });

const consolidatedEntity = z.object({
  kind: z.enum(kinds),
  name: z.string(),
  alias: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  role: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  status: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  category: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  description: z.string().optional().default(""),
  quote: z.string().optional().default(""),
  sources: z.array(z.string()).optional(),
  conflicts: z.array(z.string()).optional(),
});
const consolidatedUpdate = z.object({
  existing_name: z.string(),
  new_facts: z.string().optional().default(""),
  status: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  quote: z.string().optional().default(""),
  source: z.string().optional(),
});
const consolidatedEvent = z.object({
  title: z.string(),
  era: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  description: z.string().optional().default(""),
  quote: z.string().optional().default(""),
  sources: z.array(z.string()).optional(),
});

/**
 * Bulk-sync the consolidated lore-export JSON (entities/updates/events already
 * grounded per-file by lore-batch.mjs) through the non-destructive planLoreSync
 * planner: inserts new entities, appends lore_notes for known names, patches only
 * unlocked status/alias fields, and appends deduplicated timeline events.
 */
export const syncLoreExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        entities: z.array(consolidatedEntity),
        updates: z.array(consolidatedUpdate).default([]),
        events: z.array(consolidatedEvent).default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    await assertAdmin(sb, context.userId, claimEmail(context.claims));

    const [archive, existingTimeline, dynamicAliases] = await Promise.all([
      sb.from("entities").select("id, name, alias, kind, status, category, locked_fields"),
      sb
        .from("timeline_events")
        .select("title, era, sort_order")
        .order("sort_order", { ascending: false }),
      loadDynamicAliases(sb),
    ]);
    if (archive.error) throw new Error("The archive could not be loaded. Nothing was saved.");
    if (existingTimeline.error)
      throw new Error("The timeline could not be loaded. Nothing was saved.");

    // Group items by PDF source so lore_notes keep their provenance.
    const groups = new Map<string, SyncInput>();
    const groupFor = (source: string) => {
      let g = groups.get(source);
      if (!g) {
        g = { source, new_entities: [], updates: [], events: [] };
        groups.set(source, g);
      }
      return g;
    };
    for (const e of data.entities) {
      groupFor((e.sources ?? []).join("; ") || "lore-export").new_entities.push({
        kind: e.kind,
        name: e.name,
        alias: e.alias,
        role: e.role,
        status: e.status,
        description: e.description,
        quote: e.quote,
        ...(e.category ? { category: e.category } : {}),
        ...(e.conflicts ? { conflicts: e.conflicts } : {}),
      });
    }
    for (const u of data.updates) {
      groupFor(u.source ?? "lore-export").updates.push({
        existing_name: u.existing_name,
        new_facts: u.new_facts,
        status: u.status,
        quote: u.quote,
      });
    }
    for (const ev of data.events) {
      groupFor((ev.sources ?? []).join("; ") || "lore-export").events.push({
        title: ev.title,
        era: ev.era,
        description: ev.description,
        quote: ev.quote,
      });
    }

    const lastSortOrder = existingTimeline.data?.[0]?.sort_order ?? 0;
    const plan = planLoreSync(
      (archive.data ?? []).map((e) => ({ ...e, locked_fields: e.locked_fields ?? [] })),
      [...groups.values()],
      lastSortOrder,
      {
        dynamicAliases,
        existingTimeline: existingTimeline.data ?? [],
      },
    );

    return executeSyncPlan(sb, plan, "lore-export batch");
  });
