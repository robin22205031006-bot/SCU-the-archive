import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock("@google/genai/web", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));
import { generateGemini } from "@/lib/gemini.server";

describe("private Gemini integration", () => {
  beforeEach(() => {
    generateContent.mockReset();
  });
  it("uses Gemini for a server-side generation request", async () => {
    generateContent.mockResolvedValue({ text: "Kael Varn joined the Order of Dusk." });
    expect(await generateGemini("test-credential", { contents: "Who is Kael?" })).toBe(
      "Kael Varn joined the Order of Dusk.",
    );
    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-3.5-flash",
      contents: "Who is Kael?",
    });
  });
  it("does not invoke Gemini without configured credentials", async () => {
    await expect(generateGemini(undefined, { contents: "Question" })).rejects.toThrow(
      "Gemini is not configured",
    );
    expect(generateContent).not.toHaveBeenCalled();
  });
  it("hides provider errors and never automatically replays generation", async () => {
    generateContent.mockRejectedValue(new Error("Provider URL contains test-credential"));
    await expect(generateGemini("test-credential", { contents: "Question" })).rejects.toMatchObject(
      {
        message:
          "Gemini could not complete this request. Your input is preserved; please try again later.",
      },
    );
    expect(generateContent).toHaveBeenCalledOnce();
  });
  it("retries overloaded model then falls back", async () => {
    vi.useFakeTimers();
    generateContent
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockRejectedValueOnce(new Error("503 UNAVAILABLE"))
      .mockResolvedValueOnce({ text: "ok" });
    const p = generateGemini("k", { contents: "Q" });
    await vi.runAllTimersAsync();
    expect(await p).toBe("ok");
    expect(generateContent).toHaveBeenLastCalledWith({ model: "gemini-3.8-flash", contents: "Q" });
    vi.useRealTimers();
  });
});
