import {
  buildUpdatePatch,
  mergeLocks,
  normalize,
  validEntityCategory,
  validLoreStatus,
  type EntityKind,
  type ProposedEntity,
  type ProposedEvent,
  type ProposedUpdate,
} from "./lore-merge";
import { isSuperadminEmail } from "./roles";

/**
 * Non-destructive lore synchronization planner.
 *
 * Turns extracted lore (see lore-export/*.json produced by scripts/lore-batch.mjs)
 * into a write plan that NEVER overwrites admin-edited fields:
 *  - entities are matched by exact name or kind-aware canonical alias,
 *  - existing entries only receive `status`/`alias` patches for fields not in `locked_fields`,
 *  - new facts for existing entries are appended as `lore_notes`, never merged into
 *    `description`,
 *  - new entities are promoted to their canonical name when extracted via an alias,
 *    and keep the alias recorded on the card.
 *
 * Execution must go through an authenticated server function guarded by
 * `assertAdmin` (src/lib/ingest.functions.ts) or `assertRoleManager`
 * (src/lib/roles.functions.ts); both already treat zananrobin@gmail.com as Superadmin.
 */

export interface ArchiveEntity {
  id: string;
  name: string;
  alias?: string | null;
  kind?: EntityKind;
  status: string;
  category?: string | null;
  locked_fields: string[];
}

export interface SyncPlan {
  entityInserts: Array<{
    kind: EntityKind;
    name: string;
    alias: string | null;
    role: string | null;
    status: string | null;
    category: string | null;
    description: string;
    image_url: null;
    source: string;
    /** Conflict flags to store as lore_notes once the entity id exists. */
    notes: string[];
  }>;
  loreNoteInserts: Array<{ entity_id: string; text: string; source: string }>;
  entityUpdates: Array<{ id: string; patch: Record<string, string>; locked_fields?: string[] }>;
  timelineInserts: Array<{
    title: string;
    era: string | null;
    description: string;
    source: string;
    sort_order: number;
  }>;
  /** Non-blocking notices: alias redirects, stub creations, merges. */
  warnings: string[];
}

/** Group-kind aliases (organizations, clans, bloodlines, factions). */
export const GROUP_ALIAS_MAP: Record<string, string> = {
  eldercrest: "aldercrest",
  dew: "d.e.w.",
  ecap: "e.c.a.p.",
  "the covenant": "covenant",
  "the hidden ones": "hidden ones",
  "the umbral": "the obsidians",
  "the 9 bloodlines": "nine clans",
  duskmoors: "duskmoor",
  "duskmoor clan": "duskmoor",
  "demon clan": "demonic clan",
  "the forgotten ones": "hidden ones",
};

/** Character-only aliases (kept separate from group aliases so `[organization] Ravenblade` does not collide with Valeria). */
export const CHARACTER_ALIAS_MAP: Record<string, string> = {
  "silas eldercrest": "silas duskmoor",
  "silas aldercrest": "silas duskmoor",
  "khalid ibn kharif": "khalid",
  "khalid ibn sharif": "khalid",
  "khalid el mansur": "khalid",
  "alt ethan": "ethan",
  "ethan thorne": "ethan",
  robin: "ethan",
  "zaynab al-ahd": "issabela al-ahd",
  zaynab: "issabela al-ahd",
  "nasab ibn khalil": "francisco",
  kelvan: "khalid",
  "alt david": "alter david",
  "covenant leader": "alter david",
  "agnus el-mansur": "altan el-mansur",
  "fahad duskmoor": "rowan colloway",
  "liam aldercrest": "eldrich aldercrest",
  "rohan aldercrest": "damian brown",
  robi: "elizah",
  vanguard: "derek miles",
  "alter ethan": "alt ethan",
  rowan: "rowan colloway",
  "rowan duskmoor": "rowan colloway",
  "rowan calloway": "rowan colloway",
  victor: "william victor",
  hisam: "hisham",
  ravenblade: "valeria",
  // Real names, codenames and duplicate cards → in-story name (character chart PDF).
  bunny: "ethan",
  zayn: "zayn hayes",
  jubayer: "zayn hayes",
  marufa: "xinea",
  nyxia: "xinea",
  "nyxia vale": "xinea",
  nawshin: "valeria",
  nisha: "nilanjona",
  ela: "grace",
  rafi: "weston hale",
  weston: "weston hale",
  rohan: "damian brown",
  fahad: "rowan colloway",
  sammam: "samuel sterling",
  ghost: "samuel sterling",
  tamim: "david",
  dawood: "david",
  luba: "maliha",
  ariyan: "aariz maddox",
  nusrat: "saya",
  madhobi: "nytheris",
  humayra: "amaya",
  shakti: "yoshiko arashi",
  rifat: "derek miles",
  john: "dorian cross",
  "john liam": "dorian cross",
  liam: "eldrich aldercrest",
  agnus: "altan el-mansur",
  mubasshir: "evan grant",
  aeric: "aeric valenheart",
  "alistair graye": "alistair quinn",
  maverick: "sean stone",
  shina: "shina nasrin",
  "major general stitch": "stitch",
  jessy: "asetra",
  "anna la sarta": "anna al-ahd",
  "zaan al-murad": "zaan",
  mashiho: "mashiho kurohana",
  kazumi: "kazumi kurahana",
  "kurahana kazumi": "kazumi kurahana",
  ayaan: "ayaan siddique",
  issabela: "issabela al-ahd",
  ayman: "ayaan siddique",
  echan: "ethan",
  pristine: "elizabeth pristine",
  elina: "elina quins",
  arashi: "kensho arashi",
  "the guardian": "steven aldercrest",
  mephistopheles: "mephisto",
  ramij: "ramiz al-ahd",
  ramiz: "ramiz al-ahd",
  "rahim al-ahd": "ramiz al-ahd",
  "rahim al ahd": "ramiz al-ahd",
  "lucen vale": "lucan vale",
  aariz: "aariz maddox",
  anna: "anna al-ahd",
  corvani: "marcello corvani",
  damian: "damian brown",
  dorian: "dorian cross",
  eldrich: "eldrich aldercrest",
  silas: "silas duskmoor",
  soa: "soa aldercrest",
  tedmond: "tedmond duskmoor",
  yoshiko: "yoshiko arashi",
  samuel: "samuel sterling",
  "ayaan siddiqi": "ayaan siddique",
  "ayman siddiqi": "ayaan siddique",
  "prime nyxia": "xinea",
  sparda: "prince of demons (sparda)",
  "prince of demons": "prince of demons (sparda)",
  derek: "derek miles",
};

/** Historical/variant names → canonical entity name (normalized keys). */
export const ALIAS_MAP: Record<string, string> = {
  ...GROUP_ALIAS_MAP,
  ...CHARACTER_ALIAS_MAP,
};

/** Properly cased display names for canonical keys when inserting promoted entities. */
const CANONICAL_DISPLAY_NAMES: Record<string, string> = {
  "silas duskmoor": "Silas Duskmoor",
  aldercrest: "Aldercrest",
  khalid: "Khalid",
  ethan: "Ethan",
  "alt ethan": "Alt Ethan",
  "issabela al-ahd": "Issabela Al-Ahd",
  francisco: "Francisco",
  "alter david": "Alter David",
  "altan el-mansur": "Altan El-Mansur",
  "rowan colloway": "Rowan Colloway",
  "eldrich aldercrest": "Eldrich Aldercrest",
  "damian brown": "Damian Brown",
  elizah: "Elizah",
  "derek miles": "Derek Miles",
  "william victor": "William Victor",
  hisham: "Hisham",
  valeria: "Valeria",
  "zayn hayes": "Zayn Hayes",
  xinea: "Xinea",
  nilanjona: "Nilanjona",
  grace: "Grace",
  "weston hale": "Weston Hale",
  "samuel sterling": "Samuel Sterling",
  david: "David",
  maliha: "Maliha",
  "aariz maddox": "Aariz Maddox",
  saya: "Saya",
  nytheris: "Nytheris",
  amaya: "Amaya",
  "yoshiko arashi": "Yoshiko Arashi",
  "dorian cross": "Dorian Cross",
  "evan grant": "Evan Grant",
  "aeric valenheart": "Aeric Valenheart",
  "alistair quinn": "Alistair Quinn",
  "sean stone": "Sean Stone",
  "shina nasrin": "Shina Nasrin",
  stitch: "Stitch",
  asetra: "Asetra",
  "anna al-ahd": "Anna Al-Ahd",
  zaan: "Zaan",
  "mashiho kurohana": "Mashiho Kurohana",
  "kazumi kurahana": "Kazumi Kurahana",
  "ayaan siddique": "Ayaan Siddique",
  "elizabeth pristine": "Elizabeth Pristine",
  "elina quins": "Elina Quins",
  "kensho arashi": "Kensho Arashi",
  "steven aldercrest": "Steven Aldercrest",
  mephisto: "Mephisto",
  "ramiz al-ahd": "Ramiz Al-Ahd",
  "d.e.w.": "D.E.W.",
  "e.c.a.p.": "E.C.A.P.",
  covenant: "Covenant",
  "hidden ones": "Hidden Ones",
  "the obsidians": "The Obsidians",
  "nine clans": "Nine Clans",
  duskmoor: "Duskmoor",
  "demonic clan": "Demonic clan",
  "lucan vale": "Lucan Vale",
  "soa aldercrest": "Soa Aldercrest",
  "tedmond duskmoor": "Tedmond Duskmoor",
  "prince of demons (sparda)": "Prince of Demons (Sparda)",
};

export function canonicalDisplayName(keyOrName: string): string {
  const n = normalize(keyOrName);
  if (CANONICAL_DISPLAY_NAMES[n]) return CANONICAL_DISPLAY_NAMES[n];
  return keyOrName.trim().replace(/\b([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

/** Combine alias strings without duplicating the canonical name or existing tokens. */
export function mergeAliasString(
  existing: string | null | undefined,
  incoming: string | null | undefined,
  canonicalName: string,
): string | null {
  const canonNorm = normalize(canonicalName);
  const parts: string[] = [];
  const collect = (raw: string | null | undefined) => {
    if (!raw) return;
    for (const piece of raw.split(/[·,]/)) {
      const t = piece.trim();
      if (t && normalize(t) !== canonNorm) parts.push(t);
    }
  };
  collect(existing);
  collect(incoming);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = normalize(p);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out.length > 0 ? out.join(" · ") : null;
}

/** Resolve an entity name to its normalized canonical key, respecting entity kind and optional runtime aliases. */
export function canonicalEntityName(
  name: string,
  kind?: EntityKind,
  dynamicAliases?: Record<string, string>,
): string {
  const n = normalize(name);
  const dyn = dynamicAliases?.[n];
  if (dyn) {
    const dNorm = normalize(dyn);
    if (kind && kind !== "character") return GROUP_ALIAS_MAP[dNorm] ?? dNorm;
    return ALIAS_MAP[dNorm] ?? dNorm;
  }
  if (kind && kind !== "character") {
    return GROUP_ALIAS_MAP[n] ?? n;
  }
  return ALIAS_MAP[n] ?? n;
}

/** Collect all known alias keys/forms that resolve to the given entity name (plus itself). */
export function aliasesForCanonical(
  name: string,
  kind?: EntityKind,
  dynamicAliases?: Record<string, string>,
): string[] {
  const canon = canonicalEntityName(name, kind, dynamicAliases);
  const set = new Set<string>([normalize(name), canon]);
  const map = kind && kind !== "character" ? GROUP_ALIAS_MAP : ALIAS_MAP;
  for (const [alias, target] of Object.entries(map)) {
    if (normalize(target) === canon) set.add(alias);
  }
  if (dynamicAliases) {
    for (const [alias, target] of Object.entries(dynamicAliases)) {
      if (normalize(target) === canon || canonicalEntityName(target, kind) === canon) {
        set.add(normalize(alias));
      }
    }
  }
  return [...set];
}

export interface SyncInput {
  source: string;
  new_entities: ProposedEntity[];
  updates: ProposedUpdate[];
  events: ProposedEvent[];
}

export interface PlanSyncOptions {
  dynamicAliases?: Record<string, string>;
  existingTimeline?: Array<{ title: string; era?: string | null }>;
}

/** Superadmin (or any admin role) may run a sync; callers should still enforce server-side. */
export function canSyncLore(email: string | null | undefined, roles: string[]): boolean {
  return isSuperadminEmail(email) || roles.includes("admin");
}

function groupBucket(kind: EntityKind | undefined): "char" | "group" {
  return !kind || kind === "character" ? "char" : "group";
}

export function planLoreSync(
  archive: ArchiveEntity[],
  inputs: SyncInput[],
  lastSortOrder = 0,
  options: PlanSyncOptions = {},
): SyncPlan {
  const dynamicAliases = options.dynamicAliases;
  const plan: SyncPlan = {
    entityInserts: [],
    loreNoteInserts: [],
    entityUpdates: [],
    timelineInserts: [],
    warnings: [],
  };

  const byName = new Map<string, ArchiveEntity[]>();
  const byCanon = new Map<string, ArchiveEntity[]>();

  const indexEntity = (entry: ArchiveEntity) => {
    const key = normalize(entry.name);
    byName.set(key, [...(byName.get(key) ?? []), entry]);
    const canon = canonicalEntityName(entry.name, entry.kind, dynamicAliases);
    const cKey = `${groupBucket(entry.kind)}::${canon}`;
    byCanon.set(cKey, [...(byCanon.get(cKey) ?? []), entry]);
  };

  for (const entry of archive) {
    indexEntity(entry);
  }

  const findExact = (name: string, kind?: EntityKind): ArchiveEntity | undefined => {
    const matches = byName.get(normalize(name)) ?? [];
    if (matches.length <= 1) return matches[0];
    if (kind) {
      const sameBucket = matches.find((m) => groupBucket(m.kind) === groupBucket(kind));
      if (sameBucket) return sameBucket;
    }
    return matches[0];
  };

  const findByCanonical = (canon: string, kind?: EntityKind): ArchiveEntity | undefined => {
    const exactMatch = findExact(canon, kind);
    if (exactMatch) return exactMatch;
    if (kind) {
      const bucketMatches = byCanon.get(`${groupBucket(kind)}::${canon}`) ?? [];
      if (bucketMatches.length) {
        return bucketMatches.find((m) => normalize(m.name) === canon) ?? bucketMatches[0];
      }
      return undefined;
    }
    const charMatches = byCanon.get(`char::${canon}`) ?? [];
    const groupMatches = byCanon.get(`group::${canon}`) ?? [];
    const all = [...charMatches, ...groupMatches];
    return all.find((m) => normalize(m.name) === canon) ?? all[0];
  };

  /** Resolve a referenced name: direct → forward alias → reverse canonical match in archive. */
  const resolveRef = (
    name: string,
    kind?: EntityKind,
  ): { entity?: ArchiveEntity; canonKey: string; via?: string } => {
    const direct = findExact(name, kind);
    const canonKey = canonicalEntityName(name, kind, dynamicAliases);
    if (direct && (!kind || groupBucket(direct.kind) === groupBucket(kind))) {
      return { entity: direct, canonKey };
    }
    const target = findByCanonical(canonKey, kind);
    if (target) {
      if (normalize(target.name) !== normalize(name)) {
        plan.warnings.push(
          `[Auto-Merged]: Redirected reference from '${name}' to canonical entity '${target.name}'`,
        );
      }
      return { entity: target, canonKey, via: name };
    }
    return { canonKey };
  };

  let order = lastSortOrder;
  const queuedAliasAdds = new Map<string, string>();

  const queueAliasPatch = (entity: ArchiveEntity, aliasText: string | null | undefined) => {
    if (!aliasText || entity.id.startsWith("pending:") || entity.locked_fields.includes("alias"))
      return;
    const baseAlias = queuedAliasAdds.get(entity.id) ?? entity.alias ?? null;
    const merged = mergeAliasString(baseAlias, aliasText, entity.name);
    if (merged && merged !== (entity.alias ?? null) && merged !== baseAlias) {
      queuedAliasAdds.set(entity.id, merged);
    }
  };

  // Three passes across all inputs: entities are always planned before updates
  // and events, so a base entity defined in one source can satisfy references
  // from another source regardless of group ordering.
  for (const input of inputs) {
    const src = input.source;

    for (const e of input.new_entities) {
      const conflictNotes = (e.conflicts ?? []).map((c) => `[conflict] ${c}`);
      const resolved = resolveRef(e.name, e.kind);
      const existing = resolved.entity;

      if (existing) {
        if (existing.id.startsWith("pending:")) {
          const pendingInsert = plan.entityInserts.find(
            (i) => normalize(i.name) === normalize(existing.name),
          );
          if (pendingInsert) {
            if (e.description && !pendingInsert.description.includes(e.description)) {
              pendingInsert.description = `${pendingInsert.description} ${e.description}`.trim();
            }
            const mergedAlias = mergeAliasString(
              pendingInsert.alias,
              [e.alias, normalize(e.name) !== normalize(pendingInsert.name) ? e.name : null]
                .filter(Boolean)
                .join(" · "),
              pendingInsert.name,
            );
            if (mergedAlias) pendingInsert.alias = mergedAlias;
            if (e.kind !== pendingInsert.kind) {
              pendingInsert.notes.push(
                `[conflict] kind: kept '${pendingInsert.kind}' but also extracted as '${e.kind}'`,
              );
            }
            const eCat = validEntityCategory(e.kind, e.category);
            if (eCat && pendingInsert.category && eCat !== pendingInsert.category) {
              pendingInsert.notes.push(
                `[conflict] category: kept '${pendingInsert.category}' but also extracted as '${eCat}'`,
              );
            }
            pendingInsert.notes.push(...conflictNotes);
          }
          continue;
        }

        // Archived entry match: append description & conflicts as lore notes without overwriting curated bio.
        if (e.description) {
          plan.loreNoteInserts.push({ entity_id: existing.id, text: e.description, source: src });
        }
        queueAliasPatch(
          existing,
          [e.alias, normalize(e.name) !== normalize(existing.name) ? e.name : null]
            .filter(Boolean)
            .join(" · "),
        );
        if (
          existing.kind &&
          e.kind !== existing.kind &&
          groupBucket(e.kind) !== groupBucket(existing.kind)
        ) {
          plan.loreNoteInserts.push({
            entity_id: existing.id,
            text: `[conflict] kind: archived '${existing.kind}' vs extracted '${e.kind}'`,
            source: src,
          });
        }
        const eCat = validEntityCategory(e.kind, e.category);
        if (eCat && existing.category && eCat !== existing.category) {
          plan.loreNoteInserts.push({
            entity_id: existing.id,
            text: `[conflict] category: archived '${existing.category}' vs extracted '${eCat}'`,
            source: src,
          });
        }
        for (const c of conflictNotes)
          plan.loreNoteInserts.push({ entity_id: existing.id, text: c, source: src });
        continue;
      }

      // Not found in archive yet — promote alias names directly to their canonical display name!
      const isChar = e.kind === "character";
      const promotedFromAlias = resolved.canonKey !== normalize(e.name);
      const insertName = promotedFromAlias ? canonicalDisplayName(resolved.canonKey) : e.name;
      const combinedAlias = mergeAliasString(
        e.alias,
        promotedFromAlias ? e.name : null,
        insertName,
      );
      if (promotedFromAlias) {
        plan.warnings.push(
          `[Auto-Merged]: Promoted extracted alias '${e.name}' to canonical card '${insertName}'`,
        );
      }

      const status = validLoreStatus(e.kind, e.status) ?? (isChar ? "Alive" : "Active");
      const category = validEntityCategory(e.kind, e.category);
      plan.entityInserts.push({
        kind: e.kind,
        name: insertName,
        alias: combinedAlias,
        role: e.role,
        status,
        category,
        description: e.description,
        image_url: null,
        source: src,
        notes: conflictNotes,
      });
      indexEntity({
        id: `pending:${normalize(insertName)}`,
        name: insertName,
        alias: combinedAlias,
        kind: e.kind,
        status,
        category,
        locked_fields: [],
      });
    }
  }

  for (const input of inputs) {
    const src = input.source;
    for (const u of input.updates) {
      const resolved = resolveRef(u.existing_name);
      let target = resolved.entity;
      if (!target) {
        // Unknown reference: promote to canonical display name if aliased, else create light stub.
        const promoted = resolved.canonKey !== normalize(u.existing_name);
        const stubName = promoted ? canonicalDisplayName(resolved.canonKey) : u.existing_name;
        const stubAlias = promoted ? u.existing_name : null;
        plan.entityInserts.push({
          kind: "character",
          name: stubName,
          alias: stubAlias,
          role: "Unclassified",
          status: "Alive",
          category: "Support",
          description: "",
          image_url: null,
          source: src,
          notes: [
            `[Auto-Stub]: created placeholder for unresolved sync reference '${u.existing_name}'`,
          ],
        });
        const pendingEntry: ArchiveEntity = {
          id: `pending:${normalize(stubName)}`,
          name: stubName,
          alias: stubAlias,
          kind: "character",
          status: "Alive",
          category: "Support",
          locked_fields: [],
        };
        indexEntity(pendingEntry);
        plan.warnings.push(
          `[Auto-Stub]: Created placeholder entity '${stubName}' — no archive match found`,
        );
        target = pendingEntry;
      }
      u.existing_name = target.name;

      const pendingInsert = plan.entityInserts.find(
        (i) => normalize(i.name) === normalize(target.name),
      );
      if (u.new_facts.trim() && !target.id.startsWith("pending:")) {
        plan.loreNoteInserts.push({ entity_id: target.id, text: u.new_facts, source: src });
      } else if (u.new_facts.trim() && pendingInsert) {
        if (!pendingInsert.description.includes(u.new_facts.trim())) {
          pendingInsert.description = `${pendingInsert.description} ${u.new_facts}`.trim();
        }
      }
      const patch = buildUpdatePatch(target, u);
      const extractedStatus = validLoreStatus(target.kind ?? "character", u.status);
      if (extractedStatus && extractedStatus !== target.status) {
        const note = `[conflict] status: archived '${target.status}' vs extracted '${extractedStatus}'`;
        if (pendingInsert) pendingInsert.notes.push(note);
        else plan.loreNoteInserts.push({ entity_id: target.id, text: note, source: src });
      }
      if (Object.keys(patch).length === 0) continue;
      // If this entity was inserted earlier in the same plan, fold the patch into the insert.
      if (pendingInsert) {
        if (patch["status"]) pendingInsert.status = patch["status"];
        continue;
      }
      plan.entityUpdates.push({ id: target.id, patch });
    }
  }

  for (const [id, alias] of queuedAliasAdds.entries()) {
    const existingUpdate = plan.entityUpdates.find((u) => u.id === id);
    if (existingUpdate) {
      existingUpdate.patch["alias"] = alias;
    } else {
      plan.entityUpdates.push({ id, patch: { alias } });
    }
  }

  const seenEvents = new Set(
    (options.existingTimeline ?? []).map(
      (ev) => `${normalize(ev.title)}::${normalize(ev.era ?? "")}`,
    ),
  );
  for (const input of inputs) {
    const src = input.source;
    for (const ev of input.events) {
      const evKey = `${normalize(ev.title)}::${normalize(ev.era ?? "")}`;
      if (seenEvents.has(evKey)) continue;
      seenEvents.add(evKey);
      plan.timelineInserts.push({
        title: ev.title,
        era: ev.era,
        description: ev.description,
        source: src,
        sort_order: ++order,
      });
    }
  }
  return plan;
}

/** Re-exported so callers can extend locked_fields after admin edits. */
export { mergeLocks };

/** Story-name card a real name, codename or merged duplicate resolves to (or the input when unmapped). */
export function canonicalCharacterName(name: string): string {
  return ALIAS_MAP[normalize(name)] ?? normalize(name);
}
