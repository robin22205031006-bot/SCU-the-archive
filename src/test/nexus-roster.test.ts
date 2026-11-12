import { describe, it, expect } from "vitest";
import { nexusDotRole, projectSeasonRoster } from "@/lib/nexus-roster";
import type { Entity } from "@/lib/entities";
const e = {
  id: "ethan",
  category: "Support",
  role: "Support",
  status: "Alive",
  stats: {
    dossier: {
      "sentinels:1": { roster: true, role: "Main Protagonist", status: "Dead" },
      "sentinels:2": { roster: true, role: "Anti-Hero", status: "Revived" },
      "sentinels:3": { roster: false },
    },
  },
} as unknown as Entity;
describe("Season rosters", () => {
  it("changes main roles for each season", () => {
    expect(projectSeasonRoster([e], "sentinels", 1, [])[0]?.category).toBe("Main Protagonist");
    expect(projectSeasonRoster([e], "sentinels", 2, [])[0]?.category).toBe("Anti-Hero");
  });
  it("keeps death and revival isolated by season", () => {
    expect(projectSeasonRoster([e], "sentinels", 1, [])[0]?.status).toBe("Dead");
    expect(projectSeasonRoster([e], "sentinels", 2, [])[0]?.status).toBe("Revived");
  });
  it("excludes characters removed from a season roster", () =>
    expect(projectSeasonRoster([e], "sentinels", 3, [])).toHaveLength(0));
  it("does not include unrelated characters in a series", () =>
    expect(projectSeasonRoster([e], "redline", 1, [])).toHaveLength(0));
  for (const [role, token] of [
    ["Main Antagonist", "main-antagonist"],
    ["Main Protagonist", "main-protagonist"],
    ["Protagonist", "protagonist"],
    ["Antagonist", "antagonist"],
    ["Support", "support"],
    ["Impactful Character", "impactful"],
    ["Anti-Hero", "anti-hero"],
    ["Anti-Villain", "anti-villain"],
  ])
    it(`maps ${role} to its distinct dot identity`, () =>
      expect(nexusDotRole(role ?? null)).toBe(token));
  it("never exposes roles through masked dots", () =>
    expect(nexusDotRole("Main Antagonist", true)).toBe("neutral"));
});
