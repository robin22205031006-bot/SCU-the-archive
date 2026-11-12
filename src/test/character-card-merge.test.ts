import { describe, expect, it } from "vitest";
import {
  mergeCharacterCards,
  resolveEntityId,
  getMergedSecondaryIds,
} from "@/lib/character-card-merge";
import type { Entity } from "@/lib/entities";

describe("character card merging logic", () => {
  it("merges duplicate character cards into the canonical card", () => {
    const rawCards = [
      {
        id: "ethan-1",
        name: "Ethan",
        kind: "character",
        alias: "Sky Guardian Candidate",
        role: "Protagonist",
        description: "Primary protagonist of the Sentinels saga.",
        image_url: "https://example.com/ethan.jpg",
        abilities: ["aether_shotgun"],
        status: "Alive",
        category: "Protagonist",
        character_tier: "A",
        stats: { bloodline: "Duskmoor" },
      },
      {
        id: "bunny-1",
        name: "Bunny",
        kind: "character",
        alias: "The Silent Storm",
        role: "Support",
        description: "Operates in the shadows under the codename Bunny.",
        image_url: null,
        abilities: ["shadow_step"],
        status: "Alive",
        category: "Support",
        character_tier: null,
        stats: { bloodline: "Duskmoor" },
      },
      {
        id: "ethan-thorne-1",
        name: "Ethan Thorne",
        kind: "character",
        alias: "Elizah",
        role: "Main Protagonist",
        description: "Full birth name of Ethan before the incident.",
        image_url: null,
        abilities: ["wind_burst"],
        status: "Alive",
        category: "Protagonist",
        character_tier: null,
        stats: { bloodline: "Duskmoor" },
      },
    ];

    const merged = mergeCharacterCards(rawCards as unknown as Entity[]);
    expect(merged.length).toBe(1);

    const ethan = merged[0]!;
    expect(ethan.id).toBe("ethan-1");
    expect(ethan.name).toBe("Ethan");

    // Aliases should combine existing aliases and secondary names
    expect(ethan.alias).toContain("Sky Guardian Candidate");
    expect(ethan.alias).toContain("The Silent Storm");
    expect(ethan.alias).toContain("Bunny");
    expect(ethan.alias).toContain("Ethan Thorne");

    // Abilities should be a union
    expect(ethan.abilities).toEqual(
      expect.arrayContaining(["aether_shotgun", "shadow_step", "wind_burst"]),
    );

    // Descriptions should combine
    expect(ethan.description).toContain("Primary protagonist");
    expect(ethan.description).toContain("[Merged Info]:");
    expect(ethan.description).toContain("codename Bunny");

    // Primary image retained
    expect(ethan.image_url).toBe("https://example.com/ethan.jpg");

    // ID resolutions
    expect(resolveEntityId("bunny-1")).toBe("ethan-1");
    expect(resolveEntityId("ethan-thorne-1")).toBe("ethan-1");
    expect(resolveEntityId("ethan-1")).toBe("ethan-1");

    expect(getMergedSecondaryIds("ethan-1")).toEqual(
      expect.arrayContaining(["bunny-1", "ethan-thorne-1"]),
    );
  });

  it("merges Xinea duplicates (Nyxia Vale, Prime Nyxia, Marufa)", () => {
    const rawCards = [
      {
        id: "xinea-id",
        name: "Xinea",
        kind: "character",
        alias: "The Void Seeker",
        description: "Xinea of the ancient line.",
        abilities: ["void_rip"],
      },
      {
        id: "nyxia-vale-id",
        name: "Nyxia Vale",
        kind: "character",
        alias: "Nyxia",
        description: "Vale operative.",
        abilities: ["shadow_veil"],
      },
      {
        id: "prime-nyxia-id",
        name: "Prime Nyxia",
        kind: "character",
        alias: "Prime",
        description: "Apex incarnation.",
        abilities: ["void_annihilation"],
      },
    ];

    const merged = mergeCharacterCards(rawCards as unknown as Entity[]);
    expect(merged.length).toBe(1);

    const xinea = merged[0]!;
    expect(xinea.name).toBe("Xinea");
    expect(xinea.id).toBe("xinea-id");
    expect(xinea.abilities).toEqual(
      expect.arrayContaining(["void_rip", "shadow_veil", "void_annihilation"]),
    );
    expect(resolveEntityId("nyxia-vale-id")).toBe("xinea-id");
    expect(resolveEntityId("prime-nyxia-id")).toBe("xinea-id");
  });

  it("leaves non-character entities untouched", () => {
    const raw = [
      { id: "org-1", name: "Duskmoor", kind: "clan" },
      { id: "char-1", name: "Zayn", kind: "character" },
      { id: "char-2", name: "Zayn Hayes", kind: "character" },
    ];
    const merged = mergeCharacterCards(raw as unknown as Entity[]);
    expect(merged.length).toBe(2);
    expect(merged.find((e) => e.name === "Duskmoor")).toBeDefined();
    expect(merged.find((e) => e.name === "Zayn Hayes")).toBeDefined();
    expect(merged.find((e) => e.name === "Zayn")).toBeUndefined();
  });
});
