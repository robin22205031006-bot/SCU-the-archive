export interface LoreSpeechItem {
  id?: string | undefined;
  name?: string | undefined;
  title?: string | undefined;
  event_name?: string | undefined;
  tier?: string | undefined;
  character_tier?: string | null | undefined;
  category?: string | undefined;
  faction?: string | undefined;
  role?: string | undefined;
  era?: string | undefined;
  bio?: string | undefined;
  description?: string | undefined;
  lore?: string | undefined;
  combat_style?: string | undefined;
  year?: string | number | undefined;
}

export interface SpeechUtteranceLike {
  text: string;
  lang: string;
  rate: number;
  pitch: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string | undefined }) => void) | null;
}

export interface SpeechSynthesisLike {
  speak: (utterance: SpeechUtteranceLike) => void;
  cancel: () => void;
  speaking?: boolean | undefined;
  pending?: boolean | undefined;
}

export type SpeechUtteranceCtor = new (text?: string) => SpeechUtteranceLike;

function cleanSentence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

/**
 * Formats a lore entry into clear, natural spoken narration for the Web Speech API.
 */
export function buildLoreNarrationText(item: LoreSpeechItem): string {
  const title = (item.name || item.event_name || item.title || "Lore entry").trim();
  const tier = (item.tier ?? item.character_tier ?? "").trim();
  const classification = (item.category || item.faction || item.role || item.era || "").trim();
  const body = (item.bio || item.description || item.lore || "").trim();
  const combatStyle = (item.combat_style || "").trim();
  const year = item.year !== undefined && item.year !== null ? String(item.year).trim() : "";

  const parts: string[] = [cleanSentence(title)];

  const meta = [tier, classification].filter(Boolean).join(" ");
  if (meta) {
    parts.push(cleanSentence(meta));
  }

  if (year) {
    parts.push(cleanSentence(`Year ${year}`));
  }

  if (body) {
    parts.push(cleanSentence(body));
  }

  if (combatStyle) {
    parts.push(cleanSentence(`Combat style: ${combatStyle}`));
  }

  return parts.filter(Boolean).join(" ");
}

export interface SpeechRuntimeEnv {
  synthesis?: SpeechSynthesisLike | undefined;
  UtteranceCtor?: SpeechUtteranceCtor | undefined;
}

export function resolveSpeechRuntime(env?: SpeechRuntimeEnv): {
  supported: boolean;
  synthesis: SpeechSynthesisLike | null;
  UtteranceCtor: SpeechUtteranceCtor | null;
} {
  const synthesis =
    env?.synthesis ??
    (typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    window.speechSynthesis &&
    typeof window.speechSynthesis.speak === "function" &&
    typeof window.speechSynthesis.cancel === "function"
      ? (window.speechSynthesis as unknown as SpeechSynthesisLike)
      : null);

  const UtteranceCtor =
    env?.UtteranceCtor ??
    (typeof window !== "undefined" && typeof window.SpeechSynthesisUtterance === "function"
      ? (window.SpeechSynthesisUtterance as unknown as SpeechUtteranceCtor)
      : typeof globalThis !== "undefined" &&
          typeof (globalThis as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance ===
            "function"
        ? ((globalThis as { SpeechSynthesisUtterance: SpeechUtteranceCtor })
            .SpeechSynthesisUtterance as SpeechUtteranceCtor)
        : null);

  return {
    supported: Boolean(synthesis && UtteranceCtor),
    synthesis,
    UtteranceCtor,
  };
}

export function isSpeechSynthesisSupported(env?: SpeechRuntimeEnv): boolean {
  return resolveSpeechRuntime(env).supported;
}

export interface SpeakLoreOptions {
  text: string;
  lang?: string | undefined;
  rate?: number | undefined;
  pitch?: number | undefined;
  onStart?: (() => void) | undefined;
  onEnd?: (() => void) | undefined;
  onError?: ((reason: string) => void) | undefined;
  env?: SpeechRuntimeEnv | undefined;
}

export type SpeakLoreResult =
  | { started: true; utterance: SpeechUtteranceLike }
  | { started: false; reason: "empty" | "unsupported" | "error" };

/**
 * Cancels any queued narration and starts speaking the provided lore text.
 * Canceling/interrupting errors are ignored cleanly when switching entries or stopping.
 */
export function speakLoreNarration(options: SpeakLoreOptions): SpeakLoreResult {
  const text = options.text.replace(/\s+/g, " ").trim();
  if (!text) {
    return { started: false, reason: "empty" };
  }

  const runtime = resolveSpeechRuntime(options.env);
  if (!runtime.supported || !runtime.synthesis || !runtime.UtteranceCtor) {
    return { started: false, reason: "unsupported" };
  }

  try {
    runtime.synthesis.cancel();
    const utterance = new runtime.UtteranceCtor(text);
    utterance.text = text;
    utterance.lang = options.lang ?? "en-US";
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    utterance.onstart = () => {
      options.onStart?.();
    };
    utterance.onend = () => {
      options.onEnd?.();
    };
    utterance.onerror = (event) => {
      const code = event?.error ?? "unknown";
      if (code === "canceled" || code === "interrupted") {
        options.onEnd?.();
        return;
      }
      options.onError?.(code);
    };
    runtime.synthesis.speak(utterance);
    return { started: true, utterance };
  } catch {
    return { started: false, reason: "error" };
  }
}

export function cancelLoreNarration(env?: SpeechRuntimeEnv): void {
  const runtime = resolveSpeechRuntime(env);
  if (!runtime.synthesis) return;
  try {
    runtime.synthesis.cancel();
  } catch {
    /* ignore speechSynthesis cancel errors in restricted sandboxes */
  }
}
