import { describe, it } from "node:test";
import assert from "node:assert/strict";
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

describe("Ability Emblem Ranking (1-5) — node:test", () => {
  it("exposes metadata for every rank 1 through 5", () => {
    assert.deepEqual([...ABILITY_RANKS], [1, 2, 3, 4, 5]);
    assert.equal(ABILITY_RANK_META[1].roman, "I");
    assert.equal(ABILITY_RANK_META[1].shortTitle, "Initiate");
    assert.equal(ABILITY_RANK_META[3].roman, "III");
    assert.equal(ABILITY_RANK_META[5].roman, "V");
    assert.equal(ABILITY_RANK_META[5].shortTitle, "Apex");
    assert.ok(ABILITY_RANK_META[5].glowRadiusPx > ABILITY_RANK_META[2].glowRadiusPx);
  });

  it("parses and clamps rank values safely to 1..5", () => {
    assert.equal(parseAbilityRank(undefined), undefined);
    assert.equal(parseAbilityRank(null), undefined);
    assert.equal(parseAbilityRank(""), undefined);
    assert.equal(parseAbilityRank(0), undefined);
    assert.equal(parseAbilityRank(-2), undefined);
    assert.equal(parseAbilityRank(1), 1);
    assert.equal(parseAbilityRank("3"), 3);
    assert.equal(parseAbilityRank(4.6), 5);
    assert.equal(parseAbilityRank(99), 5);

    assert.equal(normalizeAbilityRank(undefined, 2), 2);
    assert.equal(clampDbAbilityLevel(100), 5);
    assert.equal(clampDbAbilityLevel(0), 1);
    assert.equal(clampDbAbilityLevel("4"), 4);
    assert.equal(abilityRankMeta(4).shortTitle, "Master");
  });

  it("maps ability rarity tiers to intrinsic 1..5 emblem ranks", () => {
    assert.equal(tierToIntrinsicRank("Mythic"), 5);
    assert.equal(tierToIntrinsicRank("Legendary"), 4);
    assert.equal(tierToIntrinsicRank("Rare"), 3);
    assert.equal(tierToIntrinsicRank("Exceptional"), 3);
    assert.equal(tierToIntrinsicRank("Unique"), 3);
    assert.equal(tierToIntrinsicRank("Ancient"), 2);
    assert.equal(tierToIntrinsicRank("Standard"), 2);
    assert.equal(tierToIntrinsicRank("Role"), 1);
  });

  it("resolves canonical aliases when matching assigned ranks", () => {
    assert.equal(resolveAbilityAliasPure("Twin Blades"), "blades");
    assert.equal(resolveAbilityAliasPure("Energy Manipulation"), "energy");
    assert.equal(resolveAbilityAliasPure("Athena's Judgment"), "athenas_judgement");

    const map = buildAbilityRankMap([
      { ability_key: "blades", level: 4 },
      { ability_key: "aerokinesis", level: 5 },
    ]);
    assert.equal(resolveAssignedAbilityRank("Twin Blades", map), 4);
    assert.equal(resolveAssignedAbilityRank("aerokinesis", map), 5);
    assert.equal(resolveAssignedAbilityRank("unknown_power", map), undefined);
  });

  it("prefers exact series/season assignment specificity over global fallback", () => {
    const rows = [
      { ability_key: "aerokinesis", level: 2, series_id: null, season_number: null },
      { ability_key: "aerokinesis", level: 3, series_id: "s1", season_number: null },
      { ability_key: "aerokinesis", level: 5, series_id: "s1", season_number: 2 },
      { ability_key: "wind_surge", level: 4, series_id: "s2", season_number: 1 },
    ];
    const mapS1S2 = buildAbilityRankMap(rows, { seriesId: "s1", seasonNumber: 2 });
    assert.equal(mapS1S2["aerokinesis"], 5);
    assert.equal(mapS1S2["wind_surge"], undefined);

    const mapS1Global = buildAbilityRankMap(rows, { seriesId: "s1", seasonNumber: null });
    assert.equal(mapS1Global["aerokinesis"], 5);
  });

  it("merges and deduplicates character_abilities with entity.abilities", () => {
    const merged = mergeCharacterAbilityList(
      [
        { ability_key: "blades", level: 4, note: "Dual style" },
        { ability_key: "aerokinesis", level: 5 },
      ],
      ["Twin Blades", "Aerokinesis", "Shadow Steps"],
    );
    assert.equal(merged.length, 3);
    assert.deepEqual(
      merged.map((m) => ({ key: m.key, level: m.level, isAssigned: m.isAssigned })),
      [
        { key: "aerokinesis", level: 5, isAssigned: true },
        { key: "blades", level: 4, isAssigned: true },
        { key: "Shadow Steps", level: 1, isAssigned: false },
      ],
    );
    assert.equal(merged[1]?.note, "Dual style");
  });
});
