import { describe, expect, it } from "vitest";
import { ABILITY_REGISTRY as ABILITIES } from "@/lib/abilities";
import { abilityFxRecipe, abilityLineage, fxSignature, FX_TABLE_KEYS } from "@/lib/ability-fx";

describe("ability FX", () => {
  it("every registry ability has its own animation", () => {
    const sigs = ABILITIES.map(a => fxSignature(abilityFxRecipe(a.key)));
    expect(new Set(sigs).size).toBe(sigs.length);
  });
  it("hand-authored table has no duplicated choreography", () => {
    const sigs = FX_TABLE_KEYS.map(k => fxSignature(abilityFxRecipe(k)));
    expect(new Set(sigs).size).toBe(sigs.length);
  });
  it("lightning ascends lightning → blue → purple → red", () => {
    expect(abilityLineage("red_lightning")?.steps).toEqual(["lightning", "astrapo_electrokinesis", "purple_lightning", "red_lightning"]);
  });
  it("flame ascends flame → red flame → blue flame → draconic", () => {
    expect(abilityLineage("flame")?.steps).toEqual(["flame", "red_flame_magic", "duskmoor_blue_flame", "draconic_flame"]);
  });
  it("red lightning is stronger than base lightning", () => {
    expect(abilityFxRecipe("red_lightning").power).toBeGreaterThan(abilityFxRecipe("lightning").power);
  });
});

import { lineageFor, FX_LINEAGES, sanitizeLineages, simulateCombat } from "@/lib/ability-fx";
describe("ability chains and simulator", () => {
  it("crimson astrapo is its own branch of red lightning", () => {
    expect(lineageFor(FX_LINEAGES, "crimson_astrapo")?.steps).toEqual(["lightning", "astrapo_electrokinesis", "purple_lightning", "crimson_astrapo"]);
  });
  it("fire guardian ranks above the fire element", () => {
    expect(lineageFor(FX_LINEAGES, "fire_guardian")?.steps).toEqual(["fire", "fire_guardian"]);
  });
  it("drops admin chains with fewer than two steps", () => {
    expect(sanitizeLineages({ lineages: [{ id: "a", label: "A", steps: ["x"] }, { id: "b", label: "B", steps: ["x", "y"] }] })?.map(l => l.id)).toEqual(["b"]);
  });
  it("higher tier means more damage", () => {
    expect(simulateCombat("flame", "Mythic").damage).toBeGreaterThan(simulateCombat("flame", "Standard").damage);
  });
  it("Weston's white lightning is faster but Dorian's red lightning hits harder", () => {
    expect(simulateCombat("white_lightning_drive", "Legendary").speed).toBeGreaterThan(simulateCombat("red_lightning", "Legendary").speed);
    expect(simulateCombat("red_lightning", "Legendary").damage).toBeGreaterThan(simulateCombat("white_lightning_drive", "Legendary").damage);
  });
});
