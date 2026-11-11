import { characterCombat as ccScene } from "@/lib/character-combat";
import { describe, expect, it } from "vitest";
import { STORY_FIGHTS, actionStyle, choreography, styleFor, totalDuration, weaponFor } from "@/lib/ability-action";
import { FX_LINEAGES, FX_TABLE_KEYS, abilityFxRecipe } from "@/lib/ability-fx";
import { ALL_PAINT } from "@/components/fx-brush";
import lore from "../../public/lore-export/timeline_events.json";
import ents from "../../public/lore-export/entities.json";
import { CHARACTER_COMBAT, characterCombat } from "@/lib/character-combat";

describe("ability in action", () => {
  it("Nilanjona uses water ribbons then a rising spiral and crashing wave", () => {
    const scene = characterCombat("nilanjona"); expect(scene?.ability).toBe("water_guardian");
    const beats = scene?.beats ?? [];
    const ribbon = beats.findIndex(b => b.fx?.includes("waterRibbon"));
    const spiral = beats.findIndex(b => b.fx?.includes("waterSpiral"));
    const crash = beats.findIndex(b => b.fx?.includes("waterCrash"));
    expect(ribbon).toBeGreaterThanOrEqual(0); expect(spiral).toBeGreaterThan(ribbon); expect(crash).toBeGreaterThan(spiral);
  });
  it("Valeria uses Shadow Steps, aerial rotation and throwing weapons", () => {
    const scene = characterCombat("valeria"); expect(scene?.gender).toBe("female"); expect(scene?.ability).toBe("shadow_steps"); expect(scene?.weapon).toBe("daggers");
    expect(scene?.beats.some(b => b.fx?.includes("shadowPool"))).toBe(true);
    expect(scene?.beats.some(b => Math.abs(b.roll ?? 0) >= Math.PI)).toBe(true);
    expect(scene?.beats.some(b => b.fx?.includes("kunai"))).toBe(true);
  });
  it("Valeria carries Kara Yazgi as a sword with rising and diving cuts", () => {
    const scene = characterCombat("valeria-sword"); expect(scene?.weapon).toBe("kara");
    expect(scene?.beats.some(b => b.pose === "slashUp")).toBe(true);
    expect(scene?.beats.some(b => b.pose === "slashDown")).toBe(true);
    expect(scene?.beats.some(b => b.fx?.includes("shadowSlash"))).toBe(true);
  });
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
  it("story characters fight in their own styles", () => {
    expect(styleFor("Weston")).toBe("speedster"); expect(styleFor("Zayn")).toBe("aerial"); expect(styleFor("Khalid")).toBe("juggernaut");
    const labels = (w: string) => choreography("red_lightning", "male", styleFor(w)).map(s => s.label).join();
    expect(new Set(["Weston", "Zayn", "Dorian", "Khalid", "Aariz", "Liam", "Norman"].map(labels)).size).toBe(7);
    expect(choreography("red_lightning", "male", "aerial").some(s => (s.launch ?? 0) > 0)).toBe(true);
    expect(totalDuration(choreography("lightning", "male", "juggernaut"))).toBeGreaterThan(totalDuration(choreography("lightning", "male", "speedster")));
  });
  it("every character scene has its own choreography", () => {
    const seqs = CHARACTER_COMBAT.map(c => c.beats.map(b => b.label).join("|"));
    expect(new Set(seqs).size).toBe(CHARACTER_COMBAT.length);
    expect(new Set(CHARACTER_COMBAT.map(c => c.id)).size).toBe(CHARACTER_COMBAT.length);
  });
  it("reference characters use their own powers", () => {
    const fx = (id: string) => characterCombat(id)?.beats.flatMap(b => b.fx ?? []) ?? [];
    expect(fx("zayn")).toContain("lightning"); expect(fx("dorian")).toContain("lightning");
    expect(fx("ethan")).toContain("orb"); expect(fx("grace")).toContain("orb");
    expect(fx("elizah")).toContain("bloodSpike"); expect(fx("nyxia")).toContain("chaosRift");
    expect(fx("rowan")).toContain("fireCleave"); expect(fx("silas")).toContain("earthShatter");
    expect(characterCombat("weston")?.beats.filter(b => b.fx?.includes("trail")).length).toBeGreaterThanOrEqual(3);
    expect(characterCombat("pristine")?.weapon).toBe("scythe"); expect(characterCombat("arzuna")?.weapon).toBe("scythe");
    expect(characterCombat("valeria-duel")?.weapon).toBe("kara");
  });
  it("Silas winds up slower than Rowan", () => {
    const wind = (id: string) => characterCombat(id)?.beats.find(b => b.pose === "windUp")?.d ?? 0;
    expect(wind("silas")).toBeGreaterThan(wind("rowan"));
  });
});

describe("user-confirmed combat styles", () => {
  it("Rowan uses Blue Flame", () => { expect(ccScene("rowan")!.tint![0]).toBe("#1f6bff"); expect(ccScene("rowan")!.label).toContain("Blue Flame"); });
  it("Arthur hits with shockwaves", () => { expect(ccScene("arthur")!.beats.flatMap(b => b.fx ?? [])).toContain("shockwave"); });
  it("Samuel's scene is Ghost Mode", () => { expect(ccScene("samuel")!.label).toContain("Ghost Mode"); });
  it("Corvani uses no ability effects", () => { const fx = ccScene("corvani")!.beats.flatMap(b => b.fx ?? []); for (const f of ["lightning","fireCleave","orb","aura","chaosRift","waterCrash","shockwave"]) expect(fx).not.toContain(f); });
});
