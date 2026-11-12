import { expect, it } from "vitest";
import { nexusAbilityArt } from "@/lib/nexus-ability-art";
import { resolveSymbolStyle, symbolKey } from "@/lib/nexus-symbol-settings";
import { NEXUS_DISTINCT_ART, nexusDistinctTile } from "@/lib/nexus-distinct-art";
it.each(NEXUS_DISTINCT_ART)("%s has its own exact emblem before icon fallbacks", (name) => {
  expect(nexusAbilityArt(name, "Orbit")).toBe(name);
});
it("all corrected abilities have different artwork tiles", () => {
  const tiles = NEXUS_DISTINCT_ART.map((name) =>
    JSON.stringify(nexusDistinctTile(nexusAbilityArt(name))),
  );
  expect(new Set(tiles).size).toBe(45);
  expect(tiles).not.toContain(undefined);
});
it.each([
  ["Sanguin Shift", "sanguine-shift"],
  ["Gladokinesis", "gladiokinesis"],
  ["Domain Expension", "domain-expansion"],
  ["Chaos & Order", "chaos-order"],
  ["Chaos and Order", "chaos-order"],
  ["Swordman", "swordsman"],
  ["Dragoon", "dragon"],
  ["Architect Cube Guardian", "cube-guardian"],
  ["Hand to Hand Fight", "hand-to-hand"],
  ["Super Soldier", "supersoldier"],
  ["Psychokinetic Spatial Daggers", "dagger-portals"],
])("stored alias %s resolves to %s", (name, art) =>
  expect(nexusAbilityArt(name, "PawPrint")).toBe(art),
);
it("vampire is not a wolf emblem", () => {
  expect(nexusAbilityArt("vampire", "PawPrint")).toBe("vampire");
  expect(nexusAbilityArt("wolf")).toBe("beast");
});
it("Aether Dominion has its unique crest", () => {
  expect(nexusAbilityArt("aether_dominion")).toBe("aether-dominion");
  expect(nexusAbilityArt("aether")).toBe("aether");
});
it("Omni Ergon has its own all-element crest", () => {
  expect(nexusAbilityArt("omni_ergon")).toBe("omni-ergon");
  expect(nexusAbilityArt("omni_argon")).toBe("omni-ergon");
});
it("blood art is artwork rather than a blood or sword mismatch", () => {
  expect(nexusAbilityArt("blood_art", "Swords")).toBe("art");
});
it("red, white and purple lightning colors remain separate", () => {
  const settings = {
    symbols: {
      red_lightning: { color: "#ff0000" },
      white_lightning: { color: "#ffffff" },
      purple_lightning: { color: "#800080" },
    },
  };
  expect(resolveSymbolStyle(settings, "Red Lightning").color).toBe("#ff0000");
  expect(resolveSymbolStyle(settings, "White Lightning").color).toBe("#ffffff");
  expect(resolveSymbolStyle(settings, "Purple Lightning").color).toBe("#800080");
});
it("individual anime can override whole Nexus anime", () => {
  expect(
    resolveSymbolStyle({ anime: true, symbols: { vampire: { anime: false } } }, "vampire").anime,
  ).toBe(false);
  expect(resolveSymbolStyle({ anime: true }, "Organizations").anime).toBe(true);
});
it("names and keys resolve the same settings", () => {
  expect(symbolKey("Aether Dominion")).toBe("aether_dominion");
});
