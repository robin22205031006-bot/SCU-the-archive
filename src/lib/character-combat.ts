/** User-reference demonstrations, not invented historical PDF fights. Browser-safe. */
import type { Gender, Seg, Weapon } from "./ability-action";

export type CombatSceneId = "nilanjona" | "valeria" | "valeria-sword";
export type CombatBackdrop = "water" | "rooftop";
export interface CharacterCombat {
  id: CombatSceneId; character: string; label: string; ability: string; gender: Gender;
  weapon: Weapon; backdrop: CombatBackdrop; note: string; beats: Seg[];
}
export const CHARACTER_COMBAT: CharacterCombat[] = [
  { id: "nilanjona", character: "Nilanjona", label: "Nilanjona · Water Guardian", ability: "water_guardian", gender: "female", weapon: "none", backdrop: "water",
    note: "Water follows her whole-body sweep, coils into a rising spiral, then breaks forward as a crashing wave.",
    beats: [
      { pose: "guard", d: .25, x: -.24, label: "Rooted water stance", cam: "wide" },
      { pose: "waterDraw", d: .35, x: -.23, label: "Draw the water upward", cam: "close", fx: ["waterRibbon"] },
      { pose: "waterSweep", d: .3, x: -.2, label: "Hip-led sweeping current", cam: "track", fx: ["waterRibbon"] },
      { pose: "spinCut", d: .28, x: -.17, label: "Wrap the water around", roll: -.12, fx: ["waterRibbon"] },
      { pose: "raise", d: .4, x: -.15, y: .14, label: "Ride the rising spiral", cam: "air", fx: ["waterSpiral"] },
      { pose: "waterSweep", d: .28, x: -.1, y: .18, label: "Crest and redirect", cam: "air", fx: ["waterSpiral", "waterRibbon"] },
      { pose: "lunge", d: .22, x: .02, label: "Drive the crest forward", cam: "track", fx: ["waterCrash"] },
      { pose: "cast", d: .38, x: .06, label: "Crashing tidal wall", cam: "wide", fx: ["waterCrash", "impact"], hold: .08 },
      { pose: "waterDraw", d: .35, x: -.12, label: "Return the current", fx: ["waterRibbon"] },
      { pose: "guard", d: .4, x: -.24, label: "Settle into stance", cam: "wide" },
    ] },
  { id: "valeria", character: "Valeria", label: "Valeria · Shadow Steps & weapons", ability: "shadow_steps", gender: "female", weapon: "daggers", backdrop: "rooftop",
    note: "Low feints, rapid Shadow Steps, an aerial tuck and twist, then a spread of throwing weapons and a close-range dagger counter.",
    beats: [
      { pose: "assassinGuard", d: .24, x: -.3, label: "Read the opening", cam: "close" },
      { pose: "crouch", d: .15, x: -.34, label: "Low feint", fx: ["shadowPool"] },
      { pose: "dash", d: .12, x: .05, label: "Shadow Step across", cam: "track", fx: ["shadowPool", "trail"] },
      { pose: "leap", d: .22, x: .12, y: .25, label: "Explosive aerial launch", cam: "air", fx: ["trail"] },
      { pose: "aerialTuck", d: .24, x: .05, y: .32, roll: -Math.PI, label: "Tuck and twist", cam: "air" },
      { pose: "throw", d: .25, x: .13, y: .2, roll: -Math.PI * 2, label: "Release throwing weapons", cam: "air", fx: ["kunai"] },
      { pose: "kneelFinish", d: .18, x: .04, label: "Silent low landing", fx: ["shadowPool"] },
      { pose: "dash", d: .1, x: .43, label: "Step into the blind side", fx: ["shadowPool", "trail"], cam: "track" },
      { pose: "spinCut", d: .16, x: .4, label: "Reverse-grip dagger counter", fx: ["slash", "impact"], cam: "punch", hold: .06 },
      { pose: "dash", d: .12, x: -.25, label: "Disappear out of reach", fx: ["shadowPool", "trail"] },
      { pose: "assassinGuard", d: .35, x: -.3, label: "Guard without hesitation", cam: "wide" },
    ] },
  { id: "valeria-sword", character: "Valeria", label: "Valeria · Kara Yazgi", ability: "shadow_steps", gender: "female", weapon: "kara", backdrop: "rooftop",
    note: "Kara Yazgi is a sword, not a spear: a controlled draw, ascending cut, aerial turning slash and shadow-laced diving finish.",
    beats: [
      { pose: "swordDraw", d: .45, x: -.3, label: "Kara Yazgi · controlled draw", cam: "close", fx: ["shadowPool"] },
      { pose: "lunge", d: .2, x: .1, label: "Close under the guard", cam: "track", fx: ["trail"] },
      { pose: "slashUp", d: .2, x: .16, label: "Ascending sword cut", launch: .2, cam: "low", fx: ["shadowSlash", "impact"], hold: .08 },
      { pose: "leap", d: .32, x: .17, y: .25, label: "Shadow launch", launch: .25, cam: "air", fx: ["shadowPool", "trail"] },
      { pose: "windUp", d: .5, x: .16, y: .3, label: "Suspend and re-angle", launch: .25, cam: "air", fx: ["shadowSlash"] },
      { pose: "spinCut", d: .25, x: .24, y: .25, roll: -.5, label: "Aerial crescent", launch: .25, cam: "air", fx: ["shadowSlash"] },
      { pose: "slashDown", d: .23, x: .24, y: .1, label: "Descending execution arc", cam: "track", fx: ["shadowSlash", "trail"] },
      { pose: "kneelFinish", d: .32, x: .24, label: "Shadow-laced ground finish", cam: "punch", fx: ["shadowSlash", "shadowPool", "impact"], hold: .12 },
      { pose: "swordDraw", d: .65, x: .08, label: "Blade settles; shadows disperse", cam: "wide", fx: ["shadowPool"] },
      { pose: "assassinGuard", d: .45, x: -.3, label: "Reset the distance", cam: "wide" },
    ] },
];
export function characterCombat(id?: string | null) { return CHARACTER_COMBAT.find(scene => scene.id === id); }