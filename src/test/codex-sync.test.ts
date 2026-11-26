import { describe, expect, it } from "vitest";
import { planCharacterPatch, planSeasonTitles } from "@/lib/codex-sync";

describe("Codex edits -> archive", () => {
  it("changes only existing seasons and never erases archive titles", () => {
    expect(
      planSeasonTitles(
        ["Awakening", "", "Storm"],
        [
          { n: 1, name: "Awakening" },
          { n: 2, name: "Ashfall" },
          { n: 3, name: "" },
          { n: 9, name: "Beyond the list" },
        ],
      ),
    ).toEqual(["Awakening", "Ashfall", "Storm"]);
    expect(planSeasonTitles(["A"], [{ n: 1, name: "A" }])).toBeNull();
  });

  it("maps title to alias and the description, and locks what changed", () => {
    const patch = planCharacterPatch(
      { alias: "Gale Warden", description: "Old text", locked_fields: ["stats"] },
      { title: "Wind King", abil: "Old text" },
    );
    expect(patch).toEqual({ alias: "Wind King", locked_fields: ["stats", "alias"] });
    expect(
      planCharacterPatch(
        { alias: "Gale Warden", description: "Old", locked_fields: [] },
        { title: "", abil: "" },
      ),
    ).toBeNull();
  });
});
