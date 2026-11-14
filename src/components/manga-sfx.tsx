import { useEffect, useState, type CSSProperties } from "react";
import { useVisualMode } from "@/hooks/use-ui-mode";
import { useAnimationsEnabled } from "@/lib/animations";
import {
  INTERACTION_SFX_MAP,
  pickInteractionSfxKeyword,
  resolveMangaSfxPreset,
  type MangaInteractionType,
  type MangaSfxTone,
  type MangaSfxVariant,
} from "@/lib/manga-sfx-map";

export type { MangaSfxTone, MangaSfxVariant };

export interface MangaSfxTriggerOptions {
  word?: string;
  x?: number;
  y?: number;
  variant?: MangaSfxVariant;
  tone?: MangaSfxTone;
}

interface ActiveSfxItem {
  id: number;
  word: string;
  x: number;
  y: number;
  rot: number;
  scale: number;
  variant: MangaSfxVariant;
  tone: MangaSfxTone;
}

const SFX_EVENT = "scu:manga-sfx";
const SFX_TTL_MS = 720;
const MAX_ACTIVE_SFX = 6;

const WORD_BANKS = {
  navigation: ["WHOOSH!", "ZIP!", "SWISH!", "FLASH!"],
  combat: ["BOOM!", "WHAM!", "SMASH!", "SLASH!", "SHING!"],
  stamp: ["POW!", "STAMP!", "BAM!", "CLANG!"],
  toggle: ["SNAP!", "ZAP!", "CLICK!", "FLIP!"],
} as const;

const VARIANTS: readonly MangaSfxVariant[] = ["starburst", "spiky", "cloud"];
const TONES: readonly MangaSfxTone[] = ["crimson", "gold", "ink", "cyan"];

let seqCounter = 0;
let manualSfxForCurrentClick = false;

function isValidVariant(v: string | undefined): v is MangaSfxVariant {
  return v === "starburst" || v === "spiky" || v === "cloud";
}

function isValidTone(v: string | undefined): v is MangaSfxTone {
  return v === "crimson" || v === "gold" || v === "ink" || v === "cyan";
}

function isValidInteraction(v: string | undefined): v is MangaInteractionType {
  return typeof v === "string" && v in INTERACTION_SFX_MAP;
}

function pickContextualWord(el: HTMLElement | null): {
  word: string;
  tone: MangaSfxTone;
  variant: MangaSfxVariant;
} {
  const interaction = el?.dataset["mangaInteraction"];
  if (isValidInteraction(interaction)) {
    const keyword = pickInteractionSfxKeyword(interaction);
    const preset = resolveMangaSfxPreset(keyword);
    return { word: preset.word, tone: preset.tone, variant: preset.variant };
  }

  const custom = el?.dataset["mangaSfx"];
  if (custom) {
    const attrVariant = el?.dataset["mangaSfxVariant"];
    const attrTone = el?.dataset["mangaSfxTone"];
    return {
      word: custom.toUpperCase(),
      tone: isValidTone(attrTone) ? attrTone : "crimson",
      variant: isValidVariant(attrVariant) ? attrVariant : "starburst",
    };
  }

  const label = (
    el?.getAttribute("aria-label") ||
    el?.textContent ||
    el?.tagName ||
    ""
  ).toLowerCase();

  let bank: readonly string[] = WORD_BANKS.toggle;
  let tone: MangaSfxTone = TONES[seqCounter % 3]!;
  let variant: MangaSfxVariant = VARIANTS[seqCounter % VARIANTS.length]!;

  if (
    /vs|combat|power|ability|abilities|arsenal|fx|clash|open dossier|enter|new/.test(label) ||
    el?.closest("article")
  ) {
    bank = WORD_BANKS.combat;
    tone = seqCounter % 2 === 0 ? "crimson" : "gold";
    variant = seqCounter % 2 === 0 ? "starburst" : "spiky";
  } else if (/bookmark|favorite|star|export|stamp|seal|tier|canon/.test(label)) {
    bank = WORD_BANKS.stamp;
    tone = "gold";
    variant = "starburst";
  } else if (el?.tagName === "A" || /roster|chapter|toc|ch\.\s*\d+|back|home/.test(label)) {
    bank = WORD_BANKS.navigation;
    tone = seqCounter % 2 === 0 ? "cyan" : "crimson";
    variant = "cloud";
  }

  const word = bank[seqCounter % bank.length]!;
  return { word, tone, variant };
}

function clampPosition(
  rawX?: number,
  rawY?: number,
  el?: HTMLElement | null,
): { x: number; y: number } {
  const vw = typeof window !== "undefined" && window.innerWidth > 0 ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" && window.innerHeight > 0 ? window.innerHeight : 768;

  let x = typeof rawX === "number" && Number.isFinite(rawX) && rawX > 0 ? rawX : 0;
  let y = typeof rawY === "number" && Number.isFinite(rawY) && rawY > 0 ? rawY : 0;

  if ((!x || !y) && el && typeof el.getBoundingClientRect === "function") {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      x = rect.left + rect.width / 2;
      y = rect.top + Math.min(rect.height / 2, 24);
    }
  }

  if (!x) x = vw / 2;
  if (!y) y = vh / 2;

  const jitterX = ((seqCounter % 5) - 2) * 8;
  const offsetY = -22;

  return {
    x: Math.max(58, Math.min(vw - 58, x + jitterX)),
    y: Math.max(40, Math.min(vh - 40, y + offsetY)),
  };
}

/** Programmatically spawn a CSS Manga SFX pop-up over a coordinate or current interaction. */
export function triggerMangaSfx(options: MangaSfxTriggerOptions | string = {}): void {
  if (typeof window === "undefined") return;
  manualSfxForCurrentClick = true;
  const detail: MangaSfxTriggerOptions = typeof options === "string" ? { word: options } : options;
  window.dispatchEvent(new CustomEvent<MangaSfxTriggerOptions>(SFX_EVENT, { detail }));
}

const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], [role="tab"], [role="menuitem"], summary, [data-manga-sfx]';

/**
 * Delegated dynamic CSS-based "Manga SFX" pop-up overlay.
 * Renders pure CSS jagged comic starburst/spiky/cloud bubbles with heavy Bangers ink typography
 * over interacted UI controls strictly inside Manga UI mode.
 */
export function MangaSfxLayer() {
  const mode = useVisualMode();
  const animationsOn = useAnimationsEnabled();
  const active = animationsOn && mode === "manga";
  const [items, setItems] = useState<ActiveSfxItem[]>([]);

  useEffect(() => {
    if (!active) {
      setItems([]);
      return;
    }

    const pushSfx = (
      word: string,
      x: number,
      y: number,
      variant: MangaSfxVariant,
      tone: MangaSfxTone,
    ) => {
      const id = ++seqCounter;
      const rot = ((id * 7) % 25) - 12; // -12deg .. +12deg
      const scale = 0.94 + (id % 3) * 0.06;
      const nextItem: ActiveSfxItem = { id, word, x, y, rot, scale, variant, tone };

      setItems((prev) => [...prev.slice(-(MAX_ACTIVE_SFX - 1)), nextItem]);

      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, SFX_TTL_MS);
    };

    const onCustomSfx = (ev: Event) => {
      const detail = (ev as CustomEvent<MangaSfxTriggerOptions>).detail ?? {};
      const nextId = seqCounter + 1;
      const word = (
        detail.word ?? WORD_BANKS.combat[nextId % WORD_BANKS.combat.length]!
      ).toUpperCase();
      const { x, y } = clampPosition(detail.x, detail.y, null);
      pushSfx(
        word,
        x,
        y,
        detail.variant ?? VARIANTS[nextId % VARIANTS.length]!,
        detail.tone ?? "crimson",
      );
    };

    const onDocumentClickCapture = () => {
      manualSfxForCurrentClick = false;
    };

    const onDocumentClick = (ev: MouseEvent) => {
      if (manualSfxForCurrentClick) {
        manualSfxForCurrentClick = false;
        return;
      }

      const target = ev.target instanceof HTMLElement ? ev.target : null;
      const interactive = target?.closest<HTMLElement>(INTERACTIVE_SELECTOR) ?? null;
      if (!interactive) return;
      if (interactive.dataset["mangaSfxOff"] === "true") return;

      const ctx = pickContextualWord(interactive);
      const hasCoords = ev.clientX > 0 || ev.clientY > 0;
      const { x, y } = clampPosition(
        hasCoords ? ev.clientX : undefined,
        hasCoords ? ev.clientY : undefined,
        interactive,
      );
      pushSfx(ctx.word, x, y, ctx.variant, ctx.tone);
    };

    window.addEventListener(SFX_EVENT, onCustomSfx);
    document.addEventListener("click", onDocumentClickCapture, true);
    document.addEventListener("click", onDocumentClick);
    return () => {
      window.removeEventListener(SFX_EVENT, onCustomSfx);
      document.removeEventListener("click", onDocumentClickCapture, true);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [active]);

  if (!active || items.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      data-manga-sfx-layer="true"
      className="pointer-events-none fixed inset-0 z-[120] overflow-hidden select-none"
    >
      {items.map((item) => (
        <div
          key={item.id}
          data-manga-sfx="popup"
          data-sfx-variant={item.variant}
          data-sfx-tone={item.tone}
          className={`manga-sfx-popup manga-sfx-tone-${item.tone}`}
          style={
            {
              left: `${item.x}px`,
              top: `${item.y}px`,
              "--sfx-rot": `${item.rot}deg`,
              "--sfx-scale": String(item.scale),
            } as CSSProperties
          }
        >
          <span className={`manga-sfx-outer manga-sfx-${item.variant}`}>
            <span className={`manga-sfx-inner manga-sfx-${item.variant}`}>
              <span className="manga-sfx-halftone" />
              <span className="manga-sfx-text">{item.word}</span>
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
