import { describe, expect, it } from "vitest";
import {
  codexAbilitiesFor,
  codexCanon,
  codexCastName,
  isCodexRelation,
  mergeAbilitiesWithCodex,
  mergeRelationsWithCodex,
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

  it("replaces archive ties with the Codex's for pairs it covers, keeps the rest", () => {
    const people = [
      { id: "z", name: "Zayn Hayes" },
      { id: "a", name: "Agnus El-Mansur" },
      { id: "x", name: "Archive Only Person" },
    ];
    const row = (id: string, s: string, t: string, rel: string) => ({
      id,
      source_id: s,
      target_id: t,
      rel,
      label: null,
      created_at: "2026-01-01T00:00:00Z",
    });
    const out = mergeRelationsWithCodex(
      [row("db1", "z", "a", "ally"), row("db2", "z", "x", "ally")],
      people,
    );
    expect(out.find((r) => r.id === "db1")).toBeUndefined();
    expect(out.find((r) => r.id === "db2")).toBeTruthy();
    const za = out.filter(
      (r) => isCodexRelation(r) && [r.source_id, r.target_id].sort().join() === "a,z",
    );
    expect(za.map((r) => `${r.source_id} ${r.rel} ${r.target_id}: ${r.label}`).sort()).toEqual([
      "a parent z: Father",
      "z rival a: Defeated his father",
    ]);
  });
});
