import { describe, expect, it } from "vitest";
import entities from "../../public/lore-export/entities.json";
import { planLoreSync, type ArchiveEntity } from "@/lib/adminLoreSync";
import { normalize } from "@/lib/lore-merge";
import {
  castMemberFor,
  castSyncEntities,
  filterByCastGroup,
  SCU_CAST,
  sortByStoryOrder,
} from "@/lib/scu-cast";

// The bundled lore export mirrors the archive's character cards.
const archive: ArchiveEntity[] = (entities as Array<{ name: string; kind: string }>)
  .filter((e) => e.kind === "character")
  .map((e, i) => ({
    id: `id-${i}`,
    name: e.name,
    kind: "character" as const,
    status: "Alive",
    locked_fields: [],
  }));

describe("SCU Cast", () => {
  it("keeps all 131 characters in the chart's story order", () => {
    expect(SCU_CAST).toHaveLength(131);
    expect(SCU_CAST[0]?.name).toBe("Ethan");
    expect(SCU_CAST[1]?.name).toBe("Elizah");
    expect(SCU_CAST.at(-1)?.name).toBe("Ravek Stillfang");
  });

  it("matches archive cards through their real names and aliases", () => {
    expect(castMemberFor("Altan El-Mansur")?.name).toBe("Agnus El-Mansur");
    expect(castMemberFor("David")?.name).toBe("David (Dawood)");
    expect(castMemberFor("Ayesha")?.name).toBe("Ayesha (Khalid’s mother)");
    expect(castMemberFor("Elizabeth Pristine")?.name).toBe("Pristine");
    expect(castMemberFor("Lucan Vale")?.name).toBe("Lucen Vale");
    expect(castMemberFor("Saya")?.group).toBe("redline");
    expect(castMemberFor("Saya (Divine Beasts)")?.group).toBe("beasts");
  });

  it("sorts story-wise and filters by group", () => {
    const sorted = sortByStoryOrder([
      { name: "Zz Uncharted" },
      { name: "Xinea" },
      { name: "Ethan" },
    ]);
    expect(sorted.map((e) => e.name)).toEqual(["Ethan", "Xinea", "Zz Uncharted"]);
    expect(filterByCastGroup([{ name: "Khalid" }, { name: "Grace" }], "villains")).toEqual([
      { name: "Khalid" },
    ]);
  });

  it("merges existing characters instead of creating duplicate cards", () => {
    const plan = planLoreSync(archive, [
      { source: "SCU Cast chart", new_entities: castSyncEntities(), updates: [], events: [] },
    ]);
    const inserted = new Set(plan.entityInserts.map((e) => normalize(e.name)));
    for (const name of ["elizah", "ethan", "zayn hayes", "altan el-mansur", "david", "ayesha"]) {
      expect(inserted.has(name)).toBe(false);
    }
    // Existing cards receive the cast text as a lore note rather than a new card.
    const elizah = archive.find((e) => e.name === "Elizah");
    expect(plan.loreNoteInserts.some((n) => n.entity_id === elizah?.id)).toBe(true);
    // Characters missing from the archive are added, each exactly once.
    expect(inserted.has("mateo cruz")).toBe(true);
    expect(inserted.has("kaelor ashvane")).toBe(true);
    expect(plan.entityInserts).toHaveLength(inserted.size);
    // 85 chart characters already have cards (by name or alias); the other 46 are new.
    expect(plan.entityInserts).toHaveLength(46);
    expect(plan.entityInserts.length + 85).toBe(SCU_CAST.length);
  });
});
