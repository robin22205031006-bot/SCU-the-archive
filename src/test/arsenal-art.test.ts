import { describe, expect, it } from "vitest";
import { artFor, ARSENAL_ART } from "@/lib/arsenal-art";

describe("arsenal art", () => {
  it("Kara Yazgi has Valeria, Anna and Saya forms", () => {
    expect(artFor("Kara Yazgi", null, "cursed_weapon").forms.map((f) => f.wielder)).toEqual([
      "Valeria",
      "Anna",
      "Saya",
    ]);
  });
  it("Khalid's sword is black for Khalid and white for Alter David", () => {
    const f = artFor("Khalid's Cursed Sword", null, "cursed_weapon").forms;
    expect(f.map((x) => [x.label, x.wielder])).toEqual([
      ["Black blade", "Khalid"],
      ["White blade", "Alter David"],
    ]);
  });
  it("Aether Stone has normal and obsidian-infused forms", () => {
    expect(artFor("Aether Stone", null, "cosmic_object").forms.map((f) => f.label)).toEqual([
      "Normal form",
      "Obsidian-infused",
    ]);
  });
  it("items without pictures still get an emblem and effects", () => {
    const a = artFor("Dragon Eggs", null, "relic");
    expect(a.glyph).toBe("egg");
    expect(a.forms[0]!.fx.length).toBeGreaterThan(0);
  });
  it("every mapped item has at least one effect layer", () => {
    for (const v of Object.values(ARSENAL_ART))
      for (const f of v.forms) expect(f.fx.length).toBeGreaterThan(0);
  });
});
