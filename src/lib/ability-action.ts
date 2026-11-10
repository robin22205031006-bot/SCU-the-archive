/** Browser-safe choreography for the "Ability in Action" page: how a fighter uses each ability. */
import { abilityFxRecipe, type FxMotif } from "@/lib/ability-fx";

export type Gender = "male" | "female";
export type PoseName = "stand" | "guard" | "crouch" | "dash" | "punch" | "kick" | "cast" | "raise" | "slashUp" | "slashDown" | "knee" | "stomp" | "leap" | "flip" | "windUp" | "lunge" | "spinCut" | "throw" | "kneelFinish" | "waterDraw" | "waterSweep" | "assassinGuard" | "aerialTuck" | "swordDraw";
export type Fx = "charge" | "trail" | "projectile" | "impact" | "wave" | "slash" | "aura" | "beam" | "waterRibbon" | "waterSpiral" | "waterCrash" | "shadowPool" | "shadowSlash" | "kunai";
export type Cam = "wide" | "close" | "punch" | "track" | "low" | "air";
export interface Seg { pose: PoseName; d: number; x: number; y?: number; roll?: number; fx?: Fx[]; label: string; /** Camera framing for this beat (auto from fx when omitted). */ cam?: Cam; /** Opponent launch height (fraction of stage). */ launch?: number; /** Seconds to freeze on the key pose before the next move (anime hold). */ hold?: number }
export type ActionStyle = "dashStrike" | "speedBlitz" | "projectile" | "groundWave" | "spinBlade" | "slashCombo" | "beastPounce" | "aura" | "beam" | "blink";

const MOTIF_STYLE: Record<FxMotif, ActionStyle> = {
  lightning: "dashStrike", flame: "projectile", water: "projectile", frost: "projectile", blood: "projectile", void: "beam", arcane: "projectile",
  chaos: "projectile", mind: "beam", prism: "beam", judgement: "aura", portal: "blink", wind: "spinBlade", earth: "groundWave", impact: "groundWave",
  nature: "groundWave", blade: "slashCombo", beast: "beastPounce", heal: "aura", chrono: "aura", shadow: "blink", ghost: "blink", tech: "beam", beam: "beam",
};
const KEY_STYLE: Record<string, ActionStyle> = {
  white_lightning_drive: "speedBlitz", super_speed: "speedBlitz", speed: "speedBlitz", hyperkinesis: "speedBlitz",
  red_lightning: "beam", purple_lightning: "projectile", crimson_astrapo: "dashStrike", combat_specialist: "dashStrike", super_soldier: "dashStrike",
  psychokinetic_daggers: "projectile", assassin: "blink", long_range_overwatch: "beam", long_range: "beam", domain_expansion: "aura",
  fire_guardian: "aura", water_guardian: "aura", wind_guardian: "aura", earth_guardian: "aura", nature_guardian: "aura", sky_guardian: "aura",
};
export function actionStyle(name: string): ActionStyle { const r = abilityFxRecipe(name); return KEY_STYLE[r.key] ?? MOTIF_STYLE[r.motif]; }

const STYLE_NOTE: Record<ActionStyle, string> = {
  dashStrike: "Charges the power into the body, closes the distance in one burst and lands it point-blank.",
  speedBlitz: "Uses the power for speed rather than damage: hits from several angles before the opponent can react.",
  projectile: "Gathers the power in the hands and throws it across the field.",
  groundWave: "Drives the power into the ground so it erupts under the opponent.",
  spinBlade: "Spins to wind up the current and releases it as cutting blades.",
  slashCombo: "A close-range weapon combo: step in, rising cut, falling cut.",
  beastPounce: "Lets the beast take over, then pounces and mauls.",
  aura: "Raises a field around the body; the opponent is hit by the field itself.",
  beam: "Plants the feet, focuses, and fires a sustained beam.",
  blink: "Vanishes, reappears behind the opponent, and strikes from the blind side.",
};
export function actionNote(name: string) { return STYLE_NOTE[actionStyle(name)]; }

/** Timeline in seconds; x is a fraction of stage width from centre (-0.5..0.5). Target stands at TARGET_X. */
export const TARGET_X = .3;
export function choreography(name: string, g: Gender, style: FightStyleId = "auto"): Seg[] { return stylize(baseChoreo(name, g), style, g); }
function baseChoreo(name: string, g: Gender): Seg[] {
  const f = g === "female"; const hit: PoseName = f ? "kick" : "punch"; const st = actionStyle(name);
  const open: Seg[] = [{ pose: "stand", d: .5, x: -.32, label: "Ready" }, { pose: "guard", d: .35, x: -.32, label: "Guard up" }];
  const end: Seg[] = [{ pose: "guard", d: .45, x: -.05, label: "Recover" }, { pose: "stand", d: .6, x: -.32, label: "Reset" }];
  switch (st) {
    case "dashStrike": return [...open, { pose: "crouch", d: .6, x: -.32, fx: ["charge"], label: "Charge" },
      ...(f ? [{ pose: "flip" as PoseName, d: .35, x: -.05, y: .18, fx: ["trail" as Fx], label: "Aerial approach" }] : [{ pose: "dash" as PoseName, d: .3, x: .05, fx: ["trail" as Fx], label: "Burst dash" }]),
      { pose: hit, d: .18, x: .17, fx: ["trail"], label: f ? "Spinning kick" : "Point-blank strike" }, { pose: hit, d: .5, x: .17, fx: ["impact"], label: "Impact" }, ...end];
    case "speedBlitz": return [...open, { pose: "crouch", d: .35, x: -.32, fx: ["charge"], label: "Lean in" },
      { pose: "dash", d: .14, x: .18, fx: ["trail"], label: "Blitz" }, { pose: hit, d: .12, x: .2, fx: ["impact"], label: "Hit 1" },
      { pose: "dash", d: .14, x: .45, y: .1, fx: ["trail"], label: "Reposition" }, { pose: f ? "flip" : "knee", d: .14, x: .4, y: .08, fx: ["impact"], label: "Hit 2 (blind side)" },
      { pose: "dash", d: .16, x: .1, fx: ["trail"], label: "Cross back" }, { pose: hit, d: .4, x: .17, fx: ["impact"], label: "Finisher" }, ...end];
    case "projectile": return [...open, { pose: "raise", d: .55, x: -.32, fx: ["charge"], label: "Gather" }, { pose: "cast", d: .2, x: -.29, label: "Throw" },
      { pose: "cast", d: .45, x: -.29, fx: ["projectile"], label: "In flight" }, { pose: "guard", d: .55, x: -.3, fx: ["impact"], label: "Impact" }, { pose: "stand", d: .5, x: -.32, label: "Reset" }];
    case "beam": return [...open, { pose: "crouch", d: .4, x: -.32, fx: ["charge"], label: "Focus" }, { pose: "cast", d: .2, x: -.32, label: "Aim" },
      { pose: "cast", d: .9, x: -.34, fx: ["beam", "impact"], label: "Sustained beam" }, { pose: "stand", d: .6, x: -.32, label: "Reset" }];
    case "groundWave": return [...open, f ? { pose: "leap", d: .35, x: -.22, y: .2, fx: ["trail"], label: "Leap" } : { pose: "knee", d: .4, x: -.32, fx: ["charge"], label: "Knee up" },
      { pose: "stomp", d: .15, x: f ? -.15 : -.3, label: f ? "Ground slam" : "Stomp" }, { pose: "stomp", d: .5, x: f ? -.15 : -.3, fx: ["wave"], label: "Eruption travels" },
      { pose: "guard", d: .5, x: f ? -.15 : -.3, fx: ["impact"], label: "Impact" }, { pose: "stand", d: .5, x: -.32, label: "Reset" }];
    case "spinBlade": return [...open, { pose: "crouch", d: .3, x: -.32, fx: ["charge"], label: "Wind up" }, f ? { pose: "spinCut", d: .32, x: -.25, y: .08, fx: ["slash"], label: "Spinning scarf cut", hold: .12 } : { pose: "kick", d: .3, x: -.25, fx: ["slash"], label: "Spin kick", hold: .1 },
      { pose: "guard", d: .45, x: -.25, fx: ["projectile"], label: "Blades fly" }, { pose: "guard", d: .5, x: -.25, fx: ["impact"], label: "Impact" }, { pose: "stand", d: .5, x: -.32, label: "Reset" }];
    case "slashCombo": return f
      ? [...open, { pose: "windUp", d: .35, x: -.3, fx: ["charge"], label: "Raise the blade", hold: .15 }, { pose: "lunge", d: .22, x: .08, fx: ["trail"], label: "Lunge" },
        { pose: "spinCut", d: .2, x: .12, fx: ["slash"], label: "Spinning cut", hold: .08 }, { pose: "leap", d: .3, x: .02, y: .18, label: "Leap back" },
        { pose: "throw", d: .4, x: -.05, y: .1, fx: ["projectile"], label: "Thrown arc" }, { pose: "kneelFinish", d: .45, x: .12, fx: ["slash", "impact"], label: "Ground finish", hold: .2 }, ...end]
      : [...open, { pose: "windUp", d: .4, x: -.3, fx: ["charge"], label: "Overhead wind-up", hold: .18 }, { pose: "dash", d: .25, x: .08, fx: ["trail"], label: "Step in" },
        { pose: "slashDown", d: .18, x: .14, fx: ["slash", "impact"], label: "Attack 01 · crushing cut", hold: .15 }, { pose: "windUp", d: .25, x: .12, label: "Re-chamber" },
        { pose: "spinCut", d: .2, x: .15, fx: ["slash"], label: "Attack 02 · sweeping crescent", hold: .12 }, { pose: "kneelFinish", d: .45, x: .15, fx: ["impact"], label: "Finish" }, ...end];
    case "beastPounce": return [...open, { pose: "crouch", d: .8, x: -.32, fx: ["charge", "aura"], label: "The beast takes over" }, { pose: "leap", d: .35, x: .05, y: .2, fx: ["trail"], label: "Pounce" },
      { pose: "crouch", d: .15, x: .16, fx: ["impact"], label: "Maul" }, { pose: hit, d: .4, x: .17, fx: ["impact"], label: "Rend" }, ...end];
    case "aura": return [...open, { pose: "raise", d: .7, x: -.25, fx: ["charge", "aura"], label: "Raise the field" }, { pose: "cast", d: .8, x: -.25, fx: ["aura", "wave"], label: "Field expands" },
      { pose: "cast", d: .5, x: -.25, fx: ["aura", "impact"], label: "Opponent caught" }, { pose: "stand", d: .5, x: -.32, label: "Reset" }];
    case "blink": return [...open, { pose: "crouch", d: .35, x: -.32, fx: ["charge"], label: "Fade" }, { pose: "dash", d: .12, x: .48, fx: ["trail"], label: "Vanish" },
      { pose: f ? "kick" : "slashDown", d: .18, x: .42, fx: ["slash"], label: "Behind you" }, { pose: "guard", d: .45, x: .42, fx: ["impact"], label: "Impact" }, { pose: "dash", d: .15, x: -.32, fx: ["trail"], label: "Withdraw" }, { pose: "stand", d: .45, x: -.32, label: "Reset" }];
  }
}
/** Each fighter moves differently: tempo, footwork, combos and finishers are layered over the ability's base move. */
export type FightStyleId = "auto" | "speedster" | "aerial" | "brawler" | "duelist" | "juggernaut" | "tactician" | "feral" | "caster";
export const FIGHT_STYLES: Record<Exclude<FightStyleId, "auto">, { label: string; note: string }> = {
  speedster: { label: "Speedster", note: "Zig-zag footwork, hits from several angles, never stands still." },
  aerial: { label: "Aerial striker", note: "Launches the opponent and finishes in the air with a diving strike." },
  brawler: { label: "Brawler", note: "Walks straight in and chains punches and kicks before the power lands." },
  duelist: { label: "Duelist", note: "Reads the attack, parries, then counters in one clean lunge." },
  juggernaut: { label: "Juggernaut", note: "Slow, heavy, unstoppable: long wind-ups and ground-cracking hits." },
  tactician: { label: "Tactician", note: "Side-steps out of range, waits for the opening, strikes once." },
  feral: { label: "Feral", note: "Low, crouched, relentless lunges and pounces like an animal." },
  caster: { label: "Caster", note: "Keeps distance, builds the power, releases it with full force." },
};
/** Story characters' fighting styles, from how the archive describes them. */
const WHO_STYLE: Record<string, FightStyleId> = { weston: "speedster", zayn: "aerial", dorian: "tactician", john: "duelist", lucas: "speedster", khalid: "juggernaut", liam: "caster", aariz: "feral", elizah: "duelist", norman: "brawler", agnus: "juggernaut", enemy: "juggernaut" };
export function styleFor(who: string): FightStyleId { return WHO_STYLE[who.toLowerCase().split(/\s/)[0] ?? ""] ?? "auto"; }
function stylize(segs: Seg[], st: FightStyleId, g: Gender): Seg[] {
  if (st === "auto") return segs;
  const tempo = { speedster: .7, aerial: .85, brawler: .9, duelist: .95, juggernaut: 1.35, tactician: 1, feral: .8, caster: 1.1 }[st];
  let out: Seg[] = segs.map(s => s.hold === undefined ? { ...s, d: s.d * tempo } : { ...s, d: s.d * tempo, hold: s.hold * (st === "juggernaut" ? 1.6 : 1) });
  const hitAt = out.findIndex(s => s.fx?.includes("impact")); const at = hitAt < 0 ? out.length - 2 : hitAt;
  const ins = (i: number, add: Seg[]) => { out = [...out.slice(0, i), ...add, ...out.slice(i)]; };
  const hit = g === "female" ? "kick" : "punch";
  switch (st) {
    case "speedster": ins(2, [{ pose: "dash", d: .1, x: -.1, y: .04, fx: ["trail"], label: "Zig", cam: "track" }, { pose: "dash", d: .1, x: -.22, fx: ["trail"], label: "Zag", cam: "track" }, { pose: "dash", d: .1, x: .1, y: .06, fx: ["trail"], label: "Feint", cam: "track" }]); break;
    case "aerial": out.splice(out.length - 2, 0, { pose: "kick", d: .16, x: .2, fx: ["impact"], label: "Launcher", launch: .32, cam: "low" }, { pose: "leap", d: .22, x: .24, y: .34, fx: ["trail"], label: "Chase into the air", launch: .36, cam: "air" },
      { pose: "spinCut", d: .14, x: .27, y: .38, fx: ["slash"], label: "Air combo", launch: .38, cam: "air", hold: .06 }, { pose: "slashDown", d: .16, x: .28, y: .2, fx: ["slash", "impact"], label: "Diving spike", launch: 0, cam: "punch", hold: .14 }); break;
    case "brawler": ins(at, [{ pose: "dash", d: .18, x: .12, fx: ["trail"], label: "Step in", cam: "track" }, { pose: "punch", d: .1, x: .16, fx: ["impact"], label: "Jab", cam: "close" }, { pose: "kick", d: .12, x: .16, fx: ["impact"], label: "Body kick", cam: "close" }, { pose: "knee", d: .12, x: .17, fx: ["impact"], label: "Knee", cam: "punch" }]); break;
    case "duelist": ins(2, [{ pose: "guard", d: .3, x: -.05, label: "Read the attack", cam: "close", hold: .15 }, { pose: "crouch", d: .12, x: -.08, fx: ["slash"], label: "Parry", cam: "punch" }, { pose: "lunge", d: .16, x: .16, fx: ["trail", "impact"], label: "Counter", cam: "punch", hold: .1 }]); break;
    case "juggernaut": ins(2, [{ pose: "stomp", d: .35, x: -.2, fx: ["wave"], label: "Heavy step", cam: "low" }, { pose: "stomp", d: .35, x: -.08, fx: ["wave"], label: "Heavy step", cam: "low" }]);
      out.splice(out.length - 2, 0, { pose: "windUp", d: .45, x: .1, fx: ["charge"], label: "Hammer wind-up", cam: "close", hold: .2 }, { pose: "stomp", d: .2, x: .14, fx: ["impact", "wave"], label: "Crushing blow", cam: "punch", hold: .2 }); break;
    case "tactician": ins(2, [{ pose: "dash", d: .2, x: -.4, y: .02, fx: ["trail"], label: "Side-step out", cam: "wide" }, { pose: "guard", d: .4, x: -.38, label: "Wait for the opening", cam: "close", hold: .2 }]); break;
    case "feral": out = out.map(s => s.pose === "stand" || s.pose === "guard" ? { ...s, pose: "crouch" as PoseName } : s);
      ins(at, [{ pose: "leap", d: .2, x: .05, y: .15, fx: ["trail"], label: "Pounce", cam: "track" }, { pose: "crouch", d: .1, x: .15, fx: ["impact"], label: "Claw", cam: "punch" }, { pose: "leap", d: .16, x: -.05, y: .1, fx: ["trail"], label: "Bound back", cam: "track" }, { pose: "lunge", d: .14, x: .16, fx: ["impact"], label: "Lunge again", cam: "punch" }]); break;
    case "caster": ins(2, [{ pose: "dash", d: .22, x: -.42, fx: ["trail"], label: "Back off", cam: "wide" }, { pose: "raise", d: .55, x: -.42, fx: ["charge", "aura"], label: "Build the power", cam: "close", hold: .15 }]); break;
  }
  void hit; return out;
}
export function totalDuration(segs: Seg[]) { return segs.reduce((a, s) => a + s.d + (s.hold ?? 0), 0); }

export type Weapon = "none" | "sword" | "spear" | "daggers" | "kara";
/** Bladed styles carry a weapon: men a heavy sword, women a spear/glaive (as in the fire-sword sheets). */
export function weaponFor(name: string, g: Gender): Weapon {
  const st = actionStyle(name); const r = abilityFxRecipe(name);
  if (st === "slashCombo" || r.motif === "blade") return g === "female" ? "spear" : "sword";
  if (st === "spinBlade" && g === "female") return "spear";
  return "none";
}

/** A fight from the archive, replayed beat by beat. Quotes are verbatim from the imported lore. */
export interface FightBeat { who: string; ability: string; gender: Gender; label: string }
export interface StoryFight { id: string; title: string; when: string; quote: string; beats: FightBeat[]; note?: string }
export const STORY_FIGHTS: StoryFight[] = [
  { id: "lucas", title: "Zayn & Weston vs Lucas", when: "The Sentinels", quote: "when zayn and weston was fighting against lucas . who was a hybrid from dew from experiment...the fight was to intense for even these two..",
    beats: [{ who: "Weston", ability: "white_lightning_drive", gender: "male", label: "Weston blitzes Lucas from every angle" }, { who: "Zayn", ability: "red_lightning", gender: "male", label: "Zayn fires Dorian's red lightning" }, { who: "Lucas", ability: "super_speed", gender: "male", label: "Lucas answers at the same speed" }] },
  { id: "catastrophe", title: "The city-bomb catastrophe", when: "Season 5", quote: "Weston and Zayn fight a superstrong and very fast enemy who attempts to destroy the city with a bomb, but an injured Weston intercepts the blast with his own body while Zayn launches a final aerial attack.",
    beats: [{ who: "Enemy", ability: "destructive", gender: "male", label: "The enemy charges the city-level blast" }, { who: "Weston", ability: "white_lightning_drive", gender: "male", label: "Injured Weston intercepts the blast" }, { who: "Zayn", ability: "crimson_astrapo", gender: "male", label: "Zayn's final aerial attack" }] },
  { id: "diablo", title: "Dorian, Eldrich & Norman vs Diablo", when: "Dorian's youth", quote: "Dorian was not in his prime because he was only a kid back then.but his battle iq and potential he alongside eldrich and norman faught diablo and his army.",
    beats: [{ who: "Dorian", ability: "red_lightning", gender: "male", label: "Young Dorian's red lightning" }, { who: "Norman", ability: "combat_specialist", gender: "male", label: "Norman's bravery up close" }], note: "Eldrich's ability isn't described in the story yet." },
  { id: "cube", title: "John & Liam vs Khalid", when: "The Architect's Cube", quote: "John fights Khalid, unleashes a red lightning spark, and falls, prompting Liam to awaken his ancient magic and blast Khalid away.",
    beats: [{ who: "John", ability: "red_lightning", gender: "male", label: "John's red lightning spark" }, { who: "Khalid", ability: "demonic_hemokinesis", gender: "male", label: "Khalid overpowers him" }, { who: "Liam", ability: "ancient_art", gender: "male", label: "Liam awakens his ancient magic" }] },
  { id: "aariz", title: "Aariz vs Elizah", when: "Season 3", quote: "in season 3 mid,aariz fights elizah ,as he wants to fight the strongest and always hyped up for fighting strongest",
    beats: [{ who: "Aariz", ability: "beast_transformation", gender: "male", label: "Aariz lets his beast instinct loose" }, { who: "Elizah", ability: "combat_specialist", gender: "male", label: "Elizah answers" }], note: "Which power Elizah uses here isn't written in the story; shown as close combat." },
  { id: "agnus", title: "Zayn vs Agnus", when: "The Sentinels", quote: "after agnus and zayn fight where zayn ends agnus.his father.who is a greater in power.",
    beats: [{ who: "Agnus", ability: "destructive_legendary", gender: "male", label: "Agnus, greater in power" }, { who: "Zayn", ability: "red_lightning", gender: "male", label: "Zayn ends it" }], note: "Agnus's exact power isn't described; shown as raw destruction." },
];
