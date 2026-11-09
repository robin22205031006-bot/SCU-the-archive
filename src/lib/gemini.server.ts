import { GoogleGenAI } from "@google/genai/web";
import type { GenerateContentParameters } from "@google/genai/web";

/**
 * Key pools: admin ingestion uses keys 1-2, public chat uses keys 3-4, so
 * visitor traffic never exhausts the admin quota. Call inside handlers only.
 */
export function pickGeminiKey(pool: "admin" | "chat"): string | undefined {
  const env = process.env;
  const keys = (
    pool === "admin"
      ? [env["GOOGLE_API_KEY"], env["GOOGLE_API_KEY_2"]]
      : [env["GOOGLE_API_KEY_3"], env["GOOGLE_API_KEY_4"], env["GOOGLE_API_KEY"]]
  ).filter((k): k is string => !!k);
  return keys.length ? keys[Math.floor(Math.random() * keys.length)] : undefined;
}

/** The caller reads credentials inside its authenticated server handler. */
export async function generateGemini(
  apiKey: string | undefined,
  request: Omit<GenerateContentParameters, "model">,
) {
  if (!apiKey)
    throw new Error("Gemini is not configured. Ask the administrator to add the Google API key.");
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({ model: "gemini-3.8-flash", ...request });
    const text = response.text;
    if (!text?.trim()) throw new Error("Empty response");
    return text;
  } catch {
    // Never expose provider errors, which can contain credential-bearing URLs.
    throw new Error(
      "Gemini could not complete this request. Your input is preserved; please try again later.",
    );
  }
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
  const ai = new GoogleGenAI({ apiKey });
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
