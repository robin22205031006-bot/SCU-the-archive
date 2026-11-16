import { describe, expect, it } from "vitest";
import {
  CLASH_PALETTES,
  clashBalance,
  clashPower,
  clashVerdict,
  resolveClashSystem,
} from "@/lib/versus-clash";

describe("versus clash presentation", () => {
  it("resolves a palette for every UI system and falls back to classic", () => {
    for (const s of ["classic", "nexus", "minimal", "manga"] as const) {
      expect(resolveClashSystem(s)).toBe(s);
      expect(CLASH_PALETTES[s].particles).toBeGreaterThan(0);
    }
    expect(resolveClashSystem("unknown")).toBe("classic");
    expect(resolveClashSystem(null)).toBe("classic");
  });

  it("keeps Minimal free of shake and aberration", () => {
    expect(CLASH_PALETTES.minimal.shake).toBe(0);
    expect(CLASH_PALETTES.minimal.aberration).toBe(0);
  });

  it("weights power and pushes the collision toward the weaker side", () => {
    const strong = {
      power: 90,
      agility: 50,
      tactical_iq: 50,
      clan_mastery: 80,
      weapon_proficiency: 70,
    };
    const weak = {
      power: 30,
      agility: 50,
      tactical_iq: 50,
      clan_mastery: 20,
      weapon_proficiency: 30,
    };
    const a = clashPower(strong);
    const b = clashPower(weak);
    expect(a).toBeGreaterThan(b);
    expect(clashBalance(a, b)).toBeGreaterThan(0);
    expect(clashBalance(b, a)).toBeLessThan(0);
    expect(clashBalance(0, 0)).toBe(0);
    expect(clashPower(null)).toBe(50);
  });

  it("describes the outcome", () => {
    expect(clashVerdict("A", "B", 0)).toMatch(/dead heat/);
    expect(clashVerdict("A", "B", 0.5)).toBe("A overwhelms B");
    expect(clashVerdict("A", "B", -0.2)).toBe("B drives A back");
  });
});
