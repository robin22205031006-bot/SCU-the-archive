import { sfx } from "@/lib/scu-audio";

export type MangaSfxVariant = "starburst" | "spiky" | "cloud";
export type MangaSfxTone = "crimson" | "gold" | "ink" | "cyan";

export type MangaSfxKeyword =
  | "POW"
  | "CRACK"
  | "WHIZ"
  | "BOOM"
  | "WHAM"
  | "WHOOSH"
  | "SLASH"
  | "SHING"
  | "FLASH"
  | "SNAP"
  | "ZAP"
  | "CLANG"
  | "CRITICAL"
  | "LEVEL_UP"
  | "STAMP"
  | "SPELL"
  | "OMEN"
  | "QI"
  | "SCAN";

export type MangaInteractionType = "click" | "success" | "error" | "switch-mode";

export interface MangaSfxPreset {
  word: string;
  variant: MangaSfxVariant;
  tone: MangaSfxTone;
}

export const MANGA_SFX_PRESETS: Record<MangaSfxKeyword, MangaSfxPreset> = {
  POW: { word: "POW!", variant: "starburst", tone: "crimson" },
  CRACK: { word: "CRACK!", variant: "spiky", tone: "crimson" },
  WHIZ: { word: "WHIZ!", variant: "cloud", tone: "cyan" },
  BOOM: { word: "BOOM!", variant: "starburst", tone: "crimson" },
  WHAM: { word: "WHAM!", variant: "spiky", tone: "gold" },
  WHOOSH: { word: "WHOOSH!", variant: "cloud", tone: "cyan" },
  SLASH: { word: "SLASH!", variant: "spiky", tone: "crimson" },
  SHING: { word: "SHING!", variant: "starburst", tone: "cyan" },
  FLASH: { word: "FLASH!", variant: "starburst", tone: "gold" },
  SNAP: { word: "SNAP!", variant: "spiky", tone: "ink" },
  ZAP: { word: "ZAP!", variant: "spiky", tone: "cyan" },
  CLANG: { word: "CLANG!", variant: "starburst", tone: "gold" },
  CRITICAL: { word: "CRITICAL!", variant: "starburst", tone: "crimson" },
  LEVEL_UP: { word: "LEVEL UP!", variant: "starburst", tone: "gold" },
  STAMP: { word: "STAMP!", variant: "starburst", tone: "gold" },
  SPELL: { word: "CAST!", variant: "starburst", tone: "gold" },
  OMEN: { word: "DOOM!", variant: "spiky", tone: "crimson" },
  QI: { word: "SWISH!", variant: "cloud", tone: "gold" },
  SCAN: { word: "PING!", variant: "cloud", tone: "cyan" },
};

/**
 * Maps specific UI interaction types (click, success, error, switch-mode)
 * to diverse Manga SFX triggers ('POW', 'WHAM', 'WHOOSH', 'SHING', etc.)
 * and paired Web Audio cues for rich audio-visual feedback in Manga mode.
 */
export const INTERACTION_SFX_MAP: Record<
  MangaInteractionType,
  {
    triggers: readonly MangaSfxKeyword[];
    audio: keyof Pick<typeof sfx, "click" | "pop" | "add" | "remove" | "whoosh" | "comic" | "hud">;
  }
> = {
  click: {
    triggers: ["POW", "WHAM", "SNAP", "ZAP"],
    audio: "pop",
  },
  success: {
    triggers: ["SHING", "FLASH", "LEVEL_UP", "STAMP"],
    audio: "add",
  },
  error: {
    triggers: ["CRACK", "BOOM", "CLANG"],
    audio: "remove",
  },
  "switch-mode": {
    triggers: ["WHOOSH", "WHIZ", "SHING", "FLASH"],
    audio: "whoosh",
  },
} as const;

const interactionCounters: Record<MangaInteractionType, number> = {
  click: 0,
  success: 0,
  error: 0,
  "switch-mode": 0,
};

export function pickInteractionSfxKeyword(
  interaction: MangaInteractionType,
  index?: number,
): MangaSfxKeyword {
  const entry = INTERACTION_SFX_MAP[interaction];
  const cursor =
    typeof index === "number" && Number.isFinite(index)
      ? Math.abs(Math.floor(index))
      : interactionCounters[interaction]++;
  return entry.triggers[cursor % entry.triggers.length]!;
}

export function resetInteractionSfxCounters(): void {
  interactionCounters.click = 0;
  interactionCounters.success = 0;
  interactionCounters.error = 0;
  interactionCounters["switch-mode"] = 0;
}

function normalizeKeyword(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[!?.]+$/g, "")
    .replace(/[\s-]+/g, "_");
}

export function resolveMangaSfxPreset(keyword: MangaSfxKeyword | string): MangaSfxPreset {
  const key = normalizeKeyword(keyword) as MangaSfxKeyword;
  if (key in MANGA_SFX_PRESETS) {
    return MANGA_SFX_PRESETS[key];
  }
  const clean = keyword.trim().toUpperCase();
  return {
    word: clean.endsWith("!") ? clean : `${clean}!`,
    variant: "starburst",
    tone: "crimson",
  };
}
