import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateContent, chatsCreate, chatSendMessage, googleGenAiOptions } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  chatsCreate: vi.fn(),
  chatSendMessage: vi.fn(),
  googleGenAiOptions: [] as Array<Record<string, unknown>>,
}));
vi.mock("@google/genai/web", () => ({
  GoogleGenAI: class {
    constructor(opts: Record<string, unknown>) {
      googleGenAiOptions.push(opts);
    }
    models = { generateContent };
    chats = { create: chatsCreate };
  },
}));
import { generateGemini, generateGeminiChat } from "@/lib/gemini.server";

describe("private Gemini integration", () => {
  beforeEach(() => {
    generateContent.mockReset();
    chatsCreate.mockReset();
    chatSendMessage.mockReset();
    googleGenAiOptions.length = 0;
    chatsCreate.mockReturnValue({ sendMessage: chatSendMessage });
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
  it("uses ai.chats.create with multi-turn history and User-Agent header for AI Box chat", async () => {
    chatSendMessage.mockResolvedValue({ text: "Kara Yazgi resonates with Void energy." });
    const out = await generateGeminiChat("chat-key", {
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Welcome to the Archive." },
        { role: "user", content: "Tell me about Kara Yazgi." },
      ],
      systemInstruction: "Answer strictly from SCU canon.",
      model: "gemini-4-hydrogen",
    });
    expect(out.reply).toBe("Kara Yazgi resonates with Void energy.");
    expect(out.model).toBe("gemini-4-hydrogen");
    expect(googleGenAiOptions[0]).toMatchObject({
      apiKey: "chat-key",
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
    expect(chatsCreate).toHaveBeenCalledWith({
      model: "gemini-4-hydrogen",
      config: { systemInstruction: "Answer strictly from SCU canon." },
      history: [
        { role: "user", parts: [{ text: "Hello" }] },
        { role: "model", parts: [{ text: "Welcome to the Archive." }] },
      ],
    });
    expect(chatSendMessage).toHaveBeenCalledWith({ message: "Tell me about Kara Yazgi." });
  });
});
