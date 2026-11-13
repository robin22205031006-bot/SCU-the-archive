import { GoogleGenAI } from "@google/genai/web";
import type { GenerateContentParameters } from "@google/genai/web";

export const GEMINI_CHAT_MODELS = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"] as const;
export type GeminiChatModel = (typeof GEMINI_CHAT_MODELS)[number];

export const AI_BOX_ROLES = {
  archivist: {
    label: "Canon Archivist",
    instruction:
      "You are the SCU Canon Archivist inside SCU AI Box. Prioritize official PDF vault context first and SCU archive entries second. Cite vault files in brackets like [Source: file.pdf]. Never invent characters, events, or facts.",
  },
  tactician: {
    label: "Combat Analyst",
    instruction:
      "You are the SCU Combat & Ability Analyst inside SCU AI Box. Break down character abilities, rarity tiers, bloodline traits, weapons, and fighting styles strictly from verified SCU archive and vault evidence. Cite sources when available.",
  },
  historian: {
    label: "Timeline Chronicler",
    instruction:
      "You are the SCU Timeline Chronicler inside SCU AI Box. Trace canon events, eras, series arcs, and cause-and-effect relationships in chronological order using only verified SCU archive and vault records.",
  },
  guide: {
    label: "SCU Guide",
    instruction:
      "You are the SCU Lore Guide inside SCU AI Box. Give clear, concise, spoiler-aware explanations of characters, factions, clans, and relics grounded in the SCU archive.",
  },
} as const;

export type AiBoxRole = keyof typeof AI_BOX_ROLES;

/**
 * Key pools: admin ingestion uses keys 1-2, public chat prefers GEMINI_API_KEY
 * or keys 3-4 so visitor traffic never exhausts admin quota.
 */
export function pickGeminiKey(pool: "admin" | "chat"): string | undefined {
  const env = process.env;
  const keys = (
    pool === "admin"
      ? [env["GOOGLE_API_KEY"], env["GOOGLE_API_KEY_2"], env["GEMINI_API_KEY"]]
      : [
          env["GEMINI_API_KEY"],
          env["GOOGLE_API_KEY_3"],
          env["GOOGLE_API_KEY_4"],
          env["GOOGLE_API_KEY"],
        ]
  ).filter((k): k is string => !!k && !k.startsWith("gen-lang-client-"));
  if (!keys.length) {
    const all = [env["GEMINI_API_KEY"], env["GOOGLE_API_KEY"], env["GOOGLE_API_KEY_2"]].filter(
      (k): k is string => !!k && !k.startsWith("gen-lang-client-"),
    );
    keys.push(...all);
  }
  return keys.length ? keys[Math.floor(Math.random() * keys.length)] : undefined;
}

/** The caller reads credentials inside its authenticated server handler. */
export async function generateGemini(
  apiKey: string | undefined,
  request: Omit<GenerateContentParameters, "model">,
) {
  if (!apiKey)
    throw new Error("Gemini is not configured. Ask the administrator to add the Google API key.");
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
  // Primary model first, fallback second; retry transient overload (503/429).
  const models = ["gemini-3.5-flash", "gemini-3.8-flash"];
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({ model, ...request });
        const text = response.text;
        if (text?.trim()) return text;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const transient =
          /\b(503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand)\b/i.test(msg);
        if (!transient) {
          throw new Error(
            "Gemini could not complete this request. Your input is preserved; please try again later.",
          );
        }
        await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
      }
    }
  }
  // Never expose provider errors, which can contain credential-bearing URLs.
  throw new Error(
    "Gemini could not complete this request. Your input is preserved; please try again later.",
  );
}

/** Multi-turn server-side chat powered by @google/genai ai.chats.create. */
export async function generateGeminiChat(
  apiKey: string | undefined,
  options: {
    model?: GeminiChatModel;
    systemInstruction: string;
    messages: { role: "user" | "assistant"; content: string }[];
  },
): Promise<{ reply: string; model: GeminiChatModel }> {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured on the server (Settings > Secrets).");
  }
  const preferred: GeminiChatModel = options.model ?? "gemini-4-hydrogen";
  const candidateModels: GeminiChatModel[] =
    preferred === "gemini-4-hydrogen"
      ? ["gemini-4-hydrogen", "gemini-3.1-flash-lite"]
      : ["gemini-3.1-flash-lite", "gemini-4-hydrogen"];

  const cleaned = options.messages
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);
  if (!cleaned.length) throw new Error("Please enter a message before sending.");

  const lastMessage = cleaned[cleaned.length - 1]!;
  const history = cleaned.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const chat = ai.chats.create({
          model,
          history,
          config: {
            systemInstruction: options.systemInstruction,
          },
        });
        const response = await chat.sendMessage({
          message: lastMessage.content,
        });
        const text = response.text?.trim();
        if (text) return { reply: text, model };
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/API_KEY_INVALID|PERMISSION_DENIED|\b403\b/i.test(msg)) {
          throw new Error(
            "Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.",
          );
        }
        const transient =
          /\b(503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded|high demand)\b/i.test(msg);
        if (!transient) {
          break;
        }
        await new Promise((r) => setTimeout(r, 700 * 2 ** attempt));
      }
    }
  }

  throw new Error(
    "Gemini could not complete this request right now. Your conversation is kept — please try again.",
  );
}

/**
 * Embed texts with gemini-embedding-001 at 1536 dimensions (matches the
 * pdf_chunks.embedding vector(1536) column). Returns one vector per input.
 */
export async function embedGemini(
  apiKey: string | undefined,
  texts: string[],
): Promise<number[][]> {
  if (!apiKey)
    throw new Error("Gemini is not configured. Ask the administrator to add the Google API key.");
  if (!texts.length) return [];
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: texts,
      config: { outputDimensionality: 1536 },
    });
    const out = (response.embeddings ?? []).map((e) => e.values ?? []);
    if (out.length !== texts.length || out.some((v) => v.length !== 1536)) {
      throw new Error("Embedding dimension mismatch");
    }
    return out;
  } catch (err) {
    if (err instanceof Error && err.message === "Embedding dimension mismatch") throw err;
    throw new Error("Gemini embeddings are unavailable right now. Please try again later.");
  }
}
