import { describe, expect, it } from "vitest";
import {
  ALIAS_MAP,
  canonicalCharacterName,
  canonicalDisplayName,
  canonicalEntityName,
  planLoreSync,
  type ArchiveEntity,
} from "@/lib/adminLoreSync";
import { parseLoreExtraction } from "@/lib/lore-extraction";
import { CANON_CHARACTER_ABILITIES, lookupAbility } from "@/lib/abilities";
import { CHARACTER_COMBAT } from "@/lib/character-combat";
import { abilityFxRecipe, fxSignature } from "@/lib/ability-fx";

describe("merge-aware canonicalization & ingest sync", () => {
  it("maps new character aliases and keeps distinct characters separate", () => {
    expect(canonicalCharacterName("Kazumi")).toBe("kazumi kurahana");
    expect(canonicalCharacterName("Pristine")).toBe("elizabeth pristine");
    expect(canonicalCharacterName("Elina")).toBe("elina quins");
    expect(canonicalCharacterName("Ghost")).toBe("samuel sterling");
    expect(canonicalCharacterName("Ramiz")).toBe("ramiz al-ahd");
    expect(canonicalCharacterName("Covenant Leader")).toBe("alter david");
    expect(canonicalCharacterName("The Guardian")).toBe("steven aldercrest");
    expect(canonicalCharacterName("Arashi")).toBe("kensho arashi");
    expect(canonicalCharacterName("Mephistopheles")).toBe("mephisto");

    expect(canonicalCharacterName("Ayesha")).toBe("ayesha");
    expect(canonicalCharacterName("Ayesha Khatoon")).toBe("ayesha khatoon");
    expect(canonicalCharacterName("Ramiz Duskmoor")).toBe("ramiz duskmoor");
    expect(canonicalCharacterName("Rahim ibn Suleiman")).toBe("rahim ibn suleiman");
    expect(ALIAS_MAP["kazumi"]).toBe("kazumi kurahana");
  });

  it("keeps character vs group namespaces isolated so Ravenblade organization does not collide with Valeria", () => {
    expect(canonicalEntityName("Ravenblade", "organization")).toBe("ravenblade");
    expect(canonicalEntityName("Ravenblade", "character")).toBe("valeria");
    expect(canonicalEntityName("Eldercrest", "clan")).toBe("aldercrest");
  });

  it("promotes newly extracted alias names directly to canonical display names and folds batch duplicates", () => {
    const plan = planLoreSync(
      [],
      [
        {
          source: "new-pdf.pdf",
          new_entities: [
            {
              kind: "character",
              name: "Bunny",
              alias: null,
              role: "Wind Guardian",
              status: "Alive",
              description: "Bunny awakened wind abilities in Sector 4.",
              quote: "Bunny awakened wind abilities in Sector 4.",
            },
            {
              kind: "character",
              name: "Echan",
              alias: "Robin",
              role: "Protagonist",
              status: "Alive",
              description: "Echan stood beside Grace.",
              quote: "Echan stood beside Grace.",
            },
          ],
          updates: [
            {
              existing_name: "Ethan Thorne",
              new_facts: "Uses Wind Surge.",
              status: "Alive",
              quote: "Ethan Thorne mastered Wind Surge.",
            },
          ],
          events: [
            {
              title: "Sector 4 Awakening",
              era: "Season 1",
              description: "Bunny awakened his powers.",
              quote: "Bunny awakened his powers.",
            },
            {
              title: "Sector 4 Awakening",
              era: "Season 1",
              description: "Duplicate timeline entry in same PDF.",
              quote: "Duplicate timeline entry in same PDF.",
            },
          ],
        },
      ],
      10,
      {
        existingTimeline: [{ title: "First Awakening", era: "Season 1" }],
      },
    );

    expect(plan.entityInserts).toHaveLength(1);
    expect(plan.entityInserts[0]!.name).toBe("Ethan");
    expect(plan.entityInserts[0]!.alias).toContain("Bunny");
    expect(plan.entityInserts[0]!.alias).toContain("Robin");
    expect(plan.entityInserts[0]!.alias).toContain("Echan");
    expect(plan.entityInserts[0]!.description).toContain("Uses Wind Surge.");
    expect(plan.timelineInserts).toHaveLength(1);
    expect(plan.timelineInserts[0]!.sort_order).toBe(11);
    expect(plan.warnings.some((w) => w.includes("[Auto-Merged]"))).toBe(true);
  });

  it("matches reverse-canonical DB rows, respects locked_fields, and deduplicates existing timeline events", () => {
    const archive: ArchiveEntity[] = [
      {
        id: "ent-nawshin",
        name: "Nawshin",
        alias: null,
        kind: "character",
        status: "Alive",
        locked_fields: ["status"],
      },
      {
        id: "ent-sam",
        name: "Samuel Sterling",
        alias: "Sammam",
        kind: "character",
        status: "Alive",
        locked_fields: ["alias"],
      },
    ];

    const plan = planLoreSync(
      archive,
      [
        {
          source: "sync.pdf",
          new_entities: [
            {
              kind: "character",
              name: "Valeria",
              alias: "Ravenblade",
              role: "Assassin",
              status: "Dead",
              description: "Valeria led the strike.",
              quote: "Valeria led the strike.",
            },
          ],
          updates: [
            {
              existing_name: "Ghost",
              new_facts: "Activated Ghost-01 mode.",
              status: "Missing",
              quote: "Ghost activated Ghost-01 mode.",
            },
          ],
          events: [
            {
              title: "Existing Canon Event",
              era: "Season 2",
              description: "Already in timeline.",
              quote: "Existing Canon Event occurred in Season 2.",
            },
          ],
        },
      ],
      5,
      {
        existingTimeline: [{ title: "Existing Canon Event", era: "Season 2" }],
      },
    );

    expect(plan.entityInserts).toHaveLength(0);
    // Nawshin locked status, so only alias update should be queued
    const nawshinUpdate = plan.entityUpdates.find((u) => u.id === "ent-nawshin");
    expect(nawshinUpdate?.patch["status"]).toBeUndefined();
    expect(nawshinUpdate?.patch["alias"]).toContain("Valeria");

    // Samuel locked alias, so status updates without overwriting alias
    const samUpdate = plan.entityUpdates.find((u) => u.id === "ent-sam");
    expect(samUpdate?.patch["status"]).toBe("Missing");
    expect(samUpdate?.patch["alias"]).toBeUndefined();

    // Existing timeline event filtered out
    expect(plan.timelineInserts).toHaveLength(0);
  });

  it("accepts alias-grounded updates in parseLoreExtraction when PDF uses real name or codename", () => {
    const pdfText =
      "In the northern tunnel, Bunny summoned a compressed sphere of wind against Vanguard while Kazumi guarded the flank.";
    const rawJson = JSON.stringify({
      characters: [],
      organizations: [],
      updates: [
        {
          existing_name: "Ethan",
          new_facts: "Summoned a compressed sphere of wind against Vanguard.",
          status: "Alive",
          quote: "Bunny summoned a compressed sphere of wind against Vanguard",
        },
        {
          existing_name: "Kazumi Kurahana",
          new_facts: "Guarded the northern tunnel flank.",
          status: null,
          quote: "Kazumi guarded the flank.",
        },
      ],
      timeline_events: [],
    });

    const parsed = parseLoreExtraction(rawJson, pdfText);
    expect(parsed.updates).toHaveLength(2);
    expect(canonicalDisplayName("ethan")).toBe("Ethan");
  });

  it("resolves every ability used in CHARACTER_COMBAT and CANON_CHARACTER_ABILITIES via lookupAbility with a unique FX signature", () => {
    for (const scene of CHARACTER_COMBAT) {
      const def = lookupAbility(scene.ability);
      expect(def, `Missing ability def for ${scene.id}: ${scene.ability}`).not.toBeNull();
      const recipe = abilityFxRecipe(def!.key);
      expect(fxSignature(recipe)).toBeTruthy();
    }
    for (const [charName, list] of Object.entries(CANON_CHARACTER_ABILITIES)) {
      for (const abilityKey of list) {
        const def = lookupAbility(abilityKey);
        expect(def, `Missing canon ability ${abilityKey} for ${charName}`).not.toBeNull();
      }
    }
  });
});
