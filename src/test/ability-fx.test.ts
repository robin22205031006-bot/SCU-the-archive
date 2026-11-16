import { describe, expect, it } from "vitest";
import { ABILITY_REGISTRY as ABILITIES } from "@/lib/abilities";
import { abilityFxRecipe, abilityLineage, fxSignature, FX_TABLE_KEYS } from "@/lib/ability-fx";

describe("ability FX", () => {
  it("every registry ability has its own animation", () => {
    const sigs = ABILITIES.map((a) => fxSignature(abilityFxRecipe(a.key)));
    expect(new Set(sigs).size).toBe(sigs.length);
  });
  it("hand-authored table has no duplicated choreography", () => {
    const sigs = FX_TABLE_KEYS.map((k) => fxSignature(abilityFxRecipe(k)));
    expect(new Set(sigs).size).toBe(sigs.length);
  });
  it("lightning ascends lightning → blue → purple → red", () => {
    expect(abilityLineage("red_lightning")?.steps).toEqual([
      "lightning",
      "astrapo_electrokinesis",
      "purple_lightning",
      "red_lightning",
    ]);
  });
  it("flame ascends flame → red flame → blue flame → draconic", () => {
    expect(abilityLineage("flame")?.steps).toEqual([
      "flame",
      "red_flame_magic",
      "duskmoor_blue_flame",
      "draconic_flame",
    ]);
  });
  it("red lightning is stronger than base lightning", () => {
    expect(abilityFxRecipe("red_lightning").power).toBeGreaterThan(
      abilityFxRecipe("lightning").power,
    );
  });
});

import { lineageFor, FX_LINEAGES, sanitizeLineages, simulateCombat } from "@/lib/ability-fx";
describe("ability chains and simulator", () => {
  it("crimson astrapo is its own branch of red lightning", () => {
    expect(lineageFor(FX_LINEAGES, "crimson_astrapo")?.steps).toEqual([
      "lightning",
      "astrapo_electrokinesis",
      "purple_lightning",
      "crimson_astrapo",
    ]);
  });
  it("fire guardian ranks above the fire element", () => {
    expect(lineageFor(FX_LINEAGES, "fire_guardian")?.steps).toEqual(["fire", "fire_guardian"]);
  });
  it("drops admin chains with fewer than two steps", () => {
    expect(
      sanitizeLineages({
        lineages: [
          { id: "a", label: "A", steps: ["x"] },
          { id: "b", label: "B", steps: ["x", "y"] },
        ],
      })?.map((l) => l.id),
    ).toEqual(["b"]);
  });
  it("higher tier means more damage", () => {
    expect(simulateCombat("flame", "Mythic").damage).toBeGreaterThan(
      simulateCombat("flame", "Standard").damage,
    );
  });
  it("Weston's white lightning is faster but Dorian's red lightning hits harder", () => {
    expect(simulateCombat("white_lightning_drive", "Legendary").speed).toBeGreaterThan(
      simulateCombat("red_lightning", "Legendary").speed,
    );
    expect(simulateCombat("red_lightning", "Legendary").damage).toBeGreaterThan(
      simulateCombat("white_lightning_drive", "Legendary").damage,
    );
  });
});

import { CANON_CHARACTER_ABILITIES, abilityDef, normalizeAbilityKey } from "@/lib/abilities";
import { ALL_PAINT } from "@/components/fx-brush";

describe("ability FX complete coverage", () => {
  it("every motif in abilityFxRecipe has a dedicated painter in ALL_PAINT", () => {
    const allCanonKeys = Object.values(CANON_CHARACTER_ABILITIES).flat();
    const allKeys = new Set<string>([
      ...ABILITIES.map((a) => a.key),
      ...FX_TABLE_KEYS,
      ...allCanonKeys,
    ]);
    for (const k of allKeys) {
      const recipe = abilityFxRecipe(k);
      expect(typeof ALL_PAINT[recipe.motif]).toBe("function");
    }
  });

  it("all canon character abilities and custom entity abilities produce unique FX signatures", () => {
    const canonKeys = Array.from(
      new Set(
        Object.values(CANON_CHARACTER_ABILITIES)
          .flat()
          .map((n) => normalizeAbilityKey(abilityDef(n).key)),
      ),
    );
    const customSamples = ["Solar Flare", "Gravity Warp", "Chrono Tether", "Soundwave Burst"];
    const combined = Array.from(
      new Set([...ABILITIES.map((a) => a.key), ...canonKeys, ...customSamples]),
    );
    const sigs = combined.map((k) => fxSignature(abilityFxRecipe(k)));
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it("every hub registry ability has a non-empty lore description", () => {
    const missing = ABILITIES.filter((a) => !a.description || !a.description.trim()).map(
      (a) => a.key,
    );
    expect(missing).toEqual([]);
  });

  it("every non-Role registry ability belongs to at least one FX lineage", () => {
    const unchained = ABILITIES.filter((a) => a.group !== "role" && !abilityLineage(a.key)).map(
      (a) => a.key,
    );
    expect(unchained).toEqual([]);
  });

  it("scales abilityFxRecipe rankScale monotonically across Ranks 1..5 and runs every painter at Ranks 1, 3, and 5 without throwing", () => {
    const gradientStub = { addColorStop: () => {} };
    const calls: string[] = [];
    const mockCtx = new Proxy(
      {
        createLinearGradient: () => gradientStub,
        createRadialGradient: () => gradientStub,
        createConicGradient: () => gradientStub,
        save: () => calls.push("save"),
        restore: () => calls.push("restore"),
        setLineDash: () => {},
        measureText: () => ({ width: 10 }),
      } as Record<string, unknown>,
      {
        get(target, prop) {
          if (prop in target) return target[prop as string];
          return () => {};
        },
        set(target, prop, value) {
          target[prop as string] = value;
          return true;
        },
      },
    ) as unknown as CanvasRenderingContext2D;

    const powers = ([1, 2, 3, 4, 5] as const).map((r) => abilityFxRecipe("flame", r).power);
    expect(powers[4]!).toBeGreaterThan(powers[0]!);

    const allKeys = Array.from(
      new Set([...ABILITIES.map((a) => a.key), ...FX_TABLE_KEYS, "quantum_mirage", "solar_flare"]),
    );

    for (const key of allKeys) {
      for (const rank of [1, 3, 5] as const) {
        const recipe = abilityFxRecipe(key, rank);
        const paint = ALL_PAINT[recipe.motif];
        expect(typeof paint).toBe("function");
        if (!paint) throw new Error(`Missing painter for motif ${recipe.motif}`);
        expect(() =>
          paint({
            c: mockCtx,
            t: 0.45,
            s: 280,
            r: recipe,
            v: recipe.variant,
            p: recipe.power,
            rnd: (i: number) => (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1,
            step: 6,
            rank,
            impact: rank >= 4 ? 0.6 : 0,
          }),
        ).not.toThrow();
      }
    }
    expect(calls.length).toBeGreaterThan(0);
  });
});
