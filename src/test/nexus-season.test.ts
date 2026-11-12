import { describe, expect, it } from "vitest";
import { resolveNexusStats, highestStatRadius, nexusRole } from "@/lib/nexus-season";

const stats = {
  power: 70,
  wisdom: 50,
  vitality: 60,
  dossier: {
    all: { stats: { power: 88, wisdom: 75, vitality: 90 } },
    "redline:1": {
      stats: { power: 40, wisdom: 65, vitality: 80 },
      abilityStats: { fire: { power: 95, wisdom: 20, vitality: 30 } },
    },
    "redline:2": { stats: { power: 55 }, abilityStats: { fire: { power: 60 } } },
  },
};
describe("Nexus season rules", () => {
  it("All seasons shows overall character stats", () =>
    expect(resolveNexusStats(stats, null, null).find((s) => s.key === "power")?.value).toBe(88));
  it("selected seasons use their own stats", () =>
    expect(resolveNexusStats(stats, "redline:1", null).find((s) => s.key === "power")?.value).toBe(
      40,
    ));
  it("an ability selects its season-specific stats", () => {
    expect(resolveNexusStats(stats, "redline:1", "fire")[0]?.value).toBe(95);
    expect(resolveNexusStats(stats, "redline:2", "fire")[0]?.value).toBe(60);
  });
  it("includes Wisdom and Vitality", () => {
    const result = resolveNexusStats(stats, "redline:1", null);
    expect(result.find((s) => s.key === "wisdom")?.value).toBe(65);
    expect(result.find((s) => s.key === "vitality")?.value).toBe(80);
  });
  it("missing ability profiles show zero instead of unrelated character values", () =>
    expect(resolveNexusStats(stats, "redline:1", "ice")[0]?.value).toBe(0));
  it("outer ring scales with the highest stat rather than the average", () => {
    expect(highestStatRadius([{ value: 100 }, { value: 10 }])).toBe(98);
    expect(highestStatRadius([{ value: 50 }, { value: 10 }])).toBe(72);
  });
  it("hidden roles never reveal themselves through colors", () =>
    expect(nexusRole("Antagonist", true)).toBe("neutral"));
  it("season role selects a distinct color identity", () => {
    expect(nexusRole("Protagonist")).toBe("hero");
    expect(nexusRole("Antagonist")).toBe("villain");
  });
});
