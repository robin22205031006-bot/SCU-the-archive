import { useCallback } from "react";
import { useVisualMode } from "@/hooks/use-ui-mode";
import { useAnimationsEnabled } from "@/lib/animations";
import { triggerMangaSfx, type MangaSfxTriggerOptions } from "@/components/manga-sfx";
import { sfx } from "@/lib/scu-audio";
import {
  INTERACTION_SFX_MAP,
  MANGA_SFX_PRESETS,
  pickInteractionSfxKeyword,
  resetInteractionSfxCounters,
  resolveMangaSfxPreset,
  type MangaInteractionType,
  type MangaSfxKeyword,
  type MangaSfxPreset,
} from "@/lib/manga-sfx-map";

export {
  INTERACTION_SFX_MAP,
  MANGA_SFX_PRESETS,
  pickInteractionSfxKeyword,
  resetInteractionSfxCounters,
  resolveMangaSfxPreset,
  type MangaInteractionType,
  type MangaSfxKeyword,
  type MangaSfxPreset,
};

export type MangaSfxTarget =
  | {
      clientX?: number;
      clientY?: number;
      currentTarget?: EventTarget | null;
      target?: EventTarget | null;
    }
  | HTMLElement
  | Partial<MangaSfxTriggerOptions>;

function extractCoordinates(target?: MangaSfxTarget): Partial<MangaSfxTriggerOptions> {
  if (!target) return {};

  if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      return { x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 24) };
    }
    return {};
  }

  if ("clientX" in target || "currentTarget" in target || "target" in target) {
    const ev = target as {
      clientX?: number;
      clientY?: number;
      currentTarget?: EventTarget | null;
      target?: EventTarget | null;
    };
    if (
      typeof ev.clientX === "number" &&
      typeof ev.clientY === "number" &&
      (ev.clientX > 0 || ev.clientY > 0)
    ) {
      return { x: ev.clientX, y: ev.clientY };
    }
    const el =
      ev.currentTarget instanceof HTMLElement
        ? ev.currentTarget
        : ev.target instanceof HTMLElement
          ? ev.target
          : null;
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        return { x: rect.left + rect.width / 2, y: rect.top + Math.min(rect.height / 2, 24) };
      }
    }
    return {};
  }

  return target as Partial<MangaSfxTriggerOptions>;
}

/**
 * Reusable hook to trigger keyword-mapped CSS Manga SFX pop-ups ("POW", "CRACK", "WHIZ", "SHING", etc.)
 * and interaction-type-mapped audio-visual feedback strictly inside Manga UI mode when animations are enabled.
 */
export function useMangaSfx() {
  const mode = useVisualMode();
  const animationsOn = useAnimationsEnabled();
  const isEnabled = mode === "manga" && animationsOn;

  const triggerSfx = useCallback(
    (
      keywordOrOptions: MangaSfxKeyword | string | MangaSfxTriggerOptions,
      target?: MangaSfxTarget,
    ) => {
      if (!isEnabled) return;

      if (typeof keywordOrOptions === "string") {
        const preset = resolveMangaSfxPreset(keywordOrOptions);
        const extra = extractCoordinates(target);
        triggerMangaSfx({
          word: preset.word,
          variant: extra.variant ?? preset.variant,
          tone: extra.tone ?? preset.tone,
          ...(extra.x !== undefined ? { x: extra.x } : {}),
          ...(extra.y !== undefined ? { y: extra.y } : {}),
        });
        return;
      }

      const preset = keywordOrOptions.word ? resolveMangaSfxPreset(keywordOrOptions.word) : null;
      const extra = extractCoordinates(target);
      const word = preset ? preset.word : keywordOrOptions.word;
      const variant = keywordOrOptions.variant ?? preset?.variant ?? extra.variant;
      const tone = keywordOrOptions.tone ?? preset?.tone ?? extra.tone;
      const x = keywordOrOptions.x ?? extra.x;
      const y = keywordOrOptions.y ?? extra.y;
      triggerMangaSfx({
        ...(word !== undefined ? { word } : {}),
        ...(variant !== undefined ? { variant } : {}),
        ...(tone !== undefined ? { tone } : {}),
        ...(x !== undefined ? { x } : {}),
        ...(y !== undefined ? { y } : {}),
      });
    },
    [isEnabled],
  );

  const triggerInteractionSfx = useCallback(
    (
      interaction: MangaInteractionType,
      target?: MangaSfxTarget,
      options?: { withAudio?: boolean; index?: number },
    ): MangaSfxKeyword | null => {
      if (!isEnabled) return null;
      const keyword = pickInteractionSfxKeyword(interaction, options?.index);
      if (options?.withAudio !== false) {
        const audioKey = INTERACTION_SFX_MAP[interaction].audio;
        sfx[audioKey]?.();
      }
      triggerSfx(keyword, target);
      return keyword;
    },
    [isEnabled, triggerSfx],
  );

  const bindSfx = useCallback(
    (
      keyword: MangaSfxKeyword | string,
      overrides?: Partial<Pick<MangaSfxPreset, "variant" | "tone">>,
    ) => {
      if (!isEnabled) return {};
      const preset = resolveMangaSfxPreset(keyword);
      return {
        "data-manga-sfx": preset.word,
        "data-manga-sfx-variant": overrides?.variant ?? preset.variant,
        "data-manga-sfx-tone": overrides?.tone ?? preset.tone,
      } as const;
    },
    [isEnabled],
  );

  const bindInteractionSfx = useCallback(
    (interaction: MangaInteractionType) => {
      if (!isEnabled) return {};
      const triggers = INTERACTION_SFX_MAP[interaction].triggers;
      const keyword = triggers[0]!;
      return {
        ...bindSfx(keyword),
        "data-manga-interaction": interaction,
      } as const;
    },
    [bindSfx, isEnabled],
  );

  return {
    isEnabled,
    triggerSfx,
    triggerInteractionSfx,
    bindSfx,
    bindInteractionSfx,
  };
}
