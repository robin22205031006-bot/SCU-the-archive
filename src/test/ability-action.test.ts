import { describe, expect, it } from "vitest";
import { STORY_FIGHTS, actionStyle, choreography, weaponFor } from "@/lib/ability-action";
import { FX_LINEAGES, FX_TABLE_KEYS, abilityFxRecipe } from "@/lib/ability-fx";
import { ALL_PAINT } from "@/components/fx-brush";
import lore from "../../public/lore-export/timeline_events.json";
import ents from "../../public/lore-export/entities.json";

describe("ability in action", () => {
  it("Weston's white lightning is used for speed, not a beam", () => { expect(actionStyle("white_lightning_drive")).toBe("speedBlitz"); });
  it("female fighters kick where male fighters punch", () => {
    expect(choreography("lightning", "female").some(s => s.pose === "kick")).toBe(true);
    expect(choreography("lightning", "male").some(s => s.pose === "punch")).toBe(true);
  });
  it("blade users carry a sword (male) or spear (female)", () => {
    expect(weaponFor("sword_master", "male")).toBe("sword");
    expect(weaponFor("sword_master", "female")).toBe("spear");
    expect(weaponFor("lightning", "male")).toBe("none");
  });
  it("every ability has its own painter, none fall back", () => {
    for (const k of FX_TABLE_KEYS) expect(ALL_PAINT[abilityFxRecipe(k).motif], k).toBeTypeOf("function");
  });
  it("remaining chains exist in order", () => {
    const steps = (id: string) => FX_LINEAGES.find(l => l.id === id)?.steps;
    expect(steps("blood")).toEqual(["blood_manipulation", "hemokinesis", "sanguine_shift", "demonic_hemokinesis"]);
    expect(steps("aether")).toEqual(["aether", "aether_dominion"]);
    for (const id of ["arcane", "chaos", "tech", "blade", "shadow", "beast"]) expect(steps(id)?.length ?? 0, id).toBeGreaterThan(1);
  });
  it("every story fight quotes the archive verbatim", () => {
    const text = JSON.stringify([lore, ents]).replace(/\\\\n/g, " ");
    for (const f of STORY_FIGHTS) expect(text.includes(JSON.stringify(f.quote).slice(1, -1)), f.id).toBe(true);
  });
});
