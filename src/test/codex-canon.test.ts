import { describe, expect, it } from "vitest";
import {
  codexAbilitiesFor,
  codexCanon,
  codexCastName,
  mergeAbilitiesWithCodex,
} from "@/lib/codex-canon";

describe("Codex canon shared by every UI style", () => {
  it("is exported from the Codex page (cast, ability holders, bonds)", () => {
    expect(codexCanon.cast).toHaveLength(131);
    expect(codexCanon.groups.length).toBeGreaterThan(50);
    expect(codexCanon.bonds.length).toBeGreaterThan(50);
  });

  it("matches archive cards to the Codex cast by name or alias", () => {
    expect(codexCastName("Ethan Thorne")).toBe("Ethan Thorne");
    expect(codexCastName("Nobody Real", "Gale Warden")).toBe("Ethan Thorne");
    expect(codexCastName("Totally Unknown Person")).toBeNull();
  });

  it("puts the Codex's abilities first and drops ones the Codex gives to others", () => {
    const canon = codexAbilitiesFor("Ethan Thorne");
    expect(canon).toEqual(["Aerokinesis", "Wind Guardian Mode", "Wind and Blood Hybrids"]);
    const merged = mergeAbilitiesWithCodex("Ethan Thorne", null, [
      "Aether Dominion", // Xinea's in the Codex
      "Wind Guardian", // same power as Wind Guardian Mode
      "Archive Only Power", // unknown to the Codex: kept
    ]);
    expect(merged).toEqual([...canon, "Archive Only Power"]);
  });

  it("leaves characters the Codex does not cover unchanged", () => {
    expect(mergeAbilitiesWithCodex("Totally Unknown Person", null, ["X", "Y"])).toEqual(["X", "Y"]);
  });
});
