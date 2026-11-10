/** Browser-safe choreography for the "Ability in Action" page: how a fighter uses each ability. */
import { abilityFxRecipe, type FxMotif } from "@/lib/ability-fx";

export type Gender = "male" | "female";
export type PoseName = "stand" | "guard" | "crouch" | "dash" | "punch" | "kick" | "cast" | "raise" | "slashUp" | "slashDown" | "knee" | "stomp" | "leap" | "flip";
export type Fx = "charge" | "trail" | "projectile" | "impact" | "wave" | "slash" | "aura" | "beam";
export interface Seg { pose: PoseName; d: number; x: number; y?: number; fx?: Fx[]; label: string }
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
export function choreography(name: string, g: Gender): Seg[] {
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
    case "spinBlade": return [...open, { pose: "crouch", d: .3, x: -.32, fx: ["charge"], label: "Wind up" }, { pose: "kick", d: .3, x: -.25, y: f ? .1 : 0, fx: ["slash"], label: "Spin kick" },
      { pose: "guard", d: .45, x: -.25, fx: ["projectile"], label: "Blades fly" }, { pose: "guard", d: .5, x: -.25, fx: ["impact"], label: "Impact" }, { pose: "stand", d: .5, x: -.32, label: "Reset" }];
    case "slashCombo": return [...open, { pose: "dash", d: .3, x: .1, fx: ["trail"], label: "Step in" }, { pose: "slashUp", d: .18, x: .14, fx: ["slash"], label: "Rising cut" },
      { pose: "slashDown", d: .16, x: .16, fx: ["slash", "impact"], label: "Falling cut" }, { pose: f ? "flip" : "slashDown", d: .45, x: f ? .05 : .16, y: f ? .12 : 0, fx: ["impact"], label: "Finish" }, ...end];
    case "beastPounce": return [...open, { pose: "crouch", d: .8, x: -.32, fx: ["charge", "aura"], label: "The beast takes over" }, { pose: "leap", d: .35, x: .05, y: .2, fx: ["trail"], label: "Pounce" },
      { pose: "crouch", d: .15, x: .16, fx: ["impact"], label: "Maul" }, { pose: hit, d: .4, x: .17, fx: ["impact"], label: "Rend" }, ...end];
    case "aura": return [...open, { pose: "raise", d: .7, x: -.25, fx: ["charge", "aura"], label: "Raise the field" }, { pose: "cast", d: .8, x: -.25, fx: ["aura", "wave"], label: "Field expands" },
      { pose: "cast", d: .5, x: -.25, fx: ["aura", "impact"], label: "Opponent caught" }, { pose: "stand", d: .5, x: -.32, label: "Reset" }];
    case "blink": return [...open, { pose: "crouch", d: .35, x: -.32, fx: ["charge"], label: "Fade" }, { pose: "dash", d: .12, x: .48, fx: ["trail"], label: "Vanish" },
      { pose: f ? "kick" : "slashDown", d: .18, x: .42, fx: ["slash"], label: "Behind you" }, { pose: "guard", d: .45, x: .42, fx: ["impact"], label: "Impact" }, { pose: "dash", d: .15, x: -.32, fx: ["trail"], label: "Withdraw" }, { pose: "stand", d: .45, x: -.32, label: "Reset" }];
  }
}
export function totalDuration(segs: Seg[]) { return segs.reduce((a, s) => a + s.d, 0); }
