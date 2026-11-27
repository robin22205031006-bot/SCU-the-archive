import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Codex card looks, edited by admins straight on the Codex cards (pencil) and stored in
 * app_settings under `codex_cards`. Writes are admin-only (migration 0015: any key not on
 * the moderator list). Codex-only presentation: no lore lives here.
 *
 *  - chars[name]      character banner style, colours, element motif and category frame
 *  - abilities[name]  ability bar colours, element motif and frame (list views)
 *  - tiers[tier]      frame level used for a whole category (Godly, Mythic, Guardian...)
 */
export const CODEX_CARDS_KEY = "codex_cards";

/** Banner styles. The first eight follow the reference sheet; the last four extend it. */
export const CODEX_CARD_STYLES = [
  "verdant",
  "prism",
  "ember",
  "tide",
  "bloom",
  "fae",
  "astral",
  "regal",
  "gale",
  "storm",
  "umbra",
  "steel",
] as const;
export type CodexCardStyle = (typeof CODEX_CARD_STYLES)[number];

/** Element motifs drawn at the head of ability bars. */
export const CODEX_ELEMENTS = [
  "wind",
  "fire",
  "water",
  "ice",
  "earth",
  "lightning",
  "light",
  "shadow",
  "nature",
  "beast",
  "venom",
  "blood",
  "arcane",
  "energy",
  "sound",
  "aether",
  "judgement",
  "sun",
  "moon",
  "time",
  "space",
  "mind",
  "curse",
  "chaos",
  "order",
  "blade",
  "seal",
  "tech",
  "guardian",
] as const;
export type CodexElement = (typeof CODEX_ELEMENTS)[number];

/** 0 hairline … 7 sapphire-gold, 8 guardian crest. */
export const CODEX_FRAME_MAX = 8;

export interface CodexCardLook {
  style?: CodexCardStyle;
  c1?: string;
  c2?: string;
  element?: CodexElement;
  frame?: number;
}
export interface CodexCards {
  chars: Record<string, CodexCardLook>;
  abilities: Record<string, CodexCardLook>;
  tiers: Record<string, number>;
}

export const EMPTY_CODEX_CARDS: CodexCards = { chars: {}, abilities: {}, tiers: {} };

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_ENTRIES = 600;

function cleanLook(v: unknown, withStyle: boolean): CodexCardLook | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const out: CodexCardLook = {};
  if (withStyle && CODEX_CARD_STYLES.includes(o["style"] as CodexCardStyle))
    out.style = o["style"] as CodexCardStyle;
  if (typeof o["c1"] === "string" && HEX.test(o["c1"])) out.c1 = o["c1"].toLowerCase();
  if (typeof o["c2"] === "string" && HEX.test(o["c2"])) out.c2 = o["c2"].toLowerCase();
  if (CODEX_ELEMENTS.includes(o["element"] as CodexElement))
    out.element = o["element"] as CodexElement;
  const f = o["frame"];
  if (typeof f === "number" && Number.isInteger(f) && f >= 0 && f <= CODEX_FRAME_MAX) out.frame = f;
  return Object.keys(out).length ? out : null;
}

function cleanMap(v: unknown, withStyle: boolean): Record<string, CodexCardLook> {
  const out: Record<string, CodexCardLook> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  let n = 0;
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    const key = k.trim().slice(0, 80);
    if (!key || key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const look = cleanLook(raw, withStyle);
    if (!look) continue;
    out[key] = look;
    if (++n >= MAX_ENTRIES) break;
  }
  return out;
}

/** Validates stored JSON: known styles/elements only, #rrggbb colours, frame 0..8. */
export function sanitizeCodexCards(value: unknown): CodexCards {
  const v = (value && typeof value === "object" && !Array.isArray(value) ? value : {}) as Record<
    string,
    unknown
  >;
  const tiers: Record<string, number> = {};
  const t = v["tiers"];
  if (t && typeof t === "object" && !Array.isArray(t)) {
    for (const [k, f] of Object.entries(t as Record<string, unknown>)) {
      const key = k.trim().slice(0, 40);
      if (!key || key === "__proto__" || key === "constructor" || key === "prototype") continue;
      if (typeof f === "number" && Number.isInteger(f) && f >= 0 && f <= CODEX_FRAME_MAX)
        tiers[key] = f;
    }
  }
  return {
    chars: cleanMap(v["chars"], true),
    abilities: cleanMap(v["abilities"], false),
    tiers,
  };
}

export const codexCardsQuery = queryOptions({
  queryKey: ["app-settings", CODEX_CARDS_KEY],
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<CodexCards> => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", CODEX_CARDS_KEY)
      .maybeSingle();
    if (error) return EMPTY_CODEX_CARDS;
    return sanitizeCodexCards(data?.value);
  },
});

/** Admin write (RLS refuses anyone else). Returns the sanitized value that was stored. */
export async function saveCodexCards(next: unknown): Promise<CodexCards> {
  const value = sanitizeCodexCards(next);
  const { error } = await supabase.from("app_settings").upsert({
    key: CODEX_CARDS_KEY,
    value: value as unknown as Json,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return value;
}
