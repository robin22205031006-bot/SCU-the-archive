import { describe, expect, it } from "vitest";
import {
  ABILITY_RANKS,
  ABILITY_RANK_META,
  abilityRankMeta,
  buildAbilityRankMap,
  clampDbAbilityLevel,
  mergeCharacterAbilityList,
  normalizeAbilityRank,
  parseAbilityRank,
  resolveAbilityAliasPure,
  resolveAssignedAbilityRank,
  tierToIntrinsicRank,
} from "./ability-rank";

describe("Ability Emblem Ranking (1-5)", () => {
  it("exposes metadata for every rank 1 through 5", () => {
    expect([...ABILITY_RANKS]).toEqual([1, 2, 3, 4, 5]);
    expect(ABILITY_RANK_META[1].roman).toBe("I");
    expect(ABILITY_RANK_META[1].shortTitle).toBe("Initiate");
    expect(ABILITY_RANK_META[3].roman).toBe("III");
    expect(ABILITY_RANK_META[5].roman).toBe("V");
    expect(ABILITY_RANK_META[5].shortTitle).toBe("Apex");
    expect(ABILITY_RANK_META[5].glowRadiusPx).toBeGreaterThan(ABILITY_RANK_META[2].glowRadiusPx);
  });

  it("parses and clamps rank values safely to 1..5", () => {
    expect(parseAbilityRank(undefined)).toBeUndefined();
    expect(parseAbilityRank(null)).toBeUndefined();
    expect(parseAbilityRank("")).toBeUndefined();
    expect(parseAbilityRank(0)).toBeUndefined();
    expect(parseAbilityRank(-2)).toBeUndefined();
    expect(parseAbilityRank(1)).toBe(1);
    expect(parseAbilityRank("3")).toBe(3);
    expect(parseAbilityRank(4.6)).toBe(5);
    expect(parseAbilityRank(99)).toBe(5);

    expect(normalizeAbilityRank(undefined, 2)).toBe(2);
    expect(clampDbAbilityLevel(100)).toBe(5);
    expect(clampDbAbilityLevel(0)).toBe(1);
    expect(clampDbAbilityLevel("4")).toBe(4);
    expect(abilityRankMeta(4).shortTitle).toBe("Master");
  });

  it("maps ability rarity tiers to intrinsic 1..5 emblem ranks", () => {
    expect(tierToIntrinsicRank("Mythic")).toBe(5);
    expect(tierToIntrinsicRank("Legendary")).toBe(4);
    expect(tierToIntrinsicRank("Rare")).toBe(3);
    expect(tierToIntrinsicRank("Exceptional")).toBe(3);
    expect(tierToIntrinsicRank("Unique")).toBe(3);
    expect(tierToIntrinsicRank("Ancient")).toBe(2);
    expect(tierToIntrinsicRank("Standard")).toBe(2);
    expect(tierToIntrinsicRank("Role")).toBe(1);
  });

  it("resolves canonical aliases when matching assigned ranks", () => {
    expect(resolveAbilityAliasPure("Twin Blades")).toBe("blades");
    expect(resolveAbilityAliasPure("Energy Manipulation")).toBe("energy");
    expect(resolveAbilityAliasPure("Athena's Judgment")).toBe("athenas_judgement");

    const map = buildAbilityRankMap([
      { ability_key: "blades", level: 4 },
      { ability_key: "aerokinesis", level: 5 },
    ]);
    expect(resolveAssignedAbilityRank("Twin Blades", map)).toBe(4);
    expect(resolveAssignedAbilityRank("aerokinesis", map)).toBe(5);
    expect(resolveAssignedAbilityRank("unknown_power", map)).toBeUndefined();
  });

  it("prefers exact series/season assignment specificity over global fallback", () => {
    const rows = [
      { ability_key: "aerokinesis", level: 2, series_id: null, season_number: null },
      { ability_key: "aerokinesis", level: 3, series_id: "s1", season_number: null },
      { ability_key: "aerokinesis", level: 5, series_id: "s1", season_number: 2 },
      { ability_key: "wind_surge", level: 4, series_id: "s2", season_number: 1 },
    ];
    const mapS1S2 = buildAbilityRankMap(rows, { seriesId: "s1", seasonNumber: 2 });
    expect(mapS1S2["aerokinesis"]).toBe(5);
    expect(mapS1S2["wind_surge"]).toBeUndefined();

    const mapS1Global = buildAbilityRankMap(rows, { seriesId: "s1", seasonNumber: null });
    expect(mapS1Global["aerokinesis"]).toBe(5);
  });

  it("merges and deduplicates character_abilities with entity.abilities", () => {
    const merged = mergeCharacterAbilityList(
      [
        { ability_key: "blades", level: 4, note: "Dual style" },
        { ability_key: "aerokinesis", level: 5 },
      ],
      ["Twin Blades", "Aerokinesis", "Shadow Steps"],
    );
    expect(merged).toHaveLength(3);
    expect(merged.map((m) => ({ key: m.key, level: m.level, isAssigned: m.isAssigned }))).toEqual([
      { key: "aerokinesis", level: 5, isAssigned: true },
      { key: "blades", level: 4, isAssigned: true },
      { key: "Shadow Steps", level: 1, isAssigned: false },
    ]);
    expect(merged[1]?.note).toBe("Dual style");
  });
});
