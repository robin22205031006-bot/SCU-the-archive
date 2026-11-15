import { describe, expect, it } from "vitest";
import {
  buildLoreNarrationText,
  cancelLoreNarration,
  isSpeechSynthesisSupported,
  speakLoreNarration,
  type SpeechSynthesisLike,
  type SpeechUtteranceLike,
} from "./lore-tts";

describe("lore-tts", () => {
  it("buildLoreNarrationText formats character, organization, and timeline lore cleanly", () => {
    const characterText = buildLoreNarrationText({
      name: "Ethan Reed",
      tier: "Mythic",
      category: "Vanguard",
      bio: "Frontline Sentinel commander balancing kinetic resonance",
      combat_style: "Redline Kinetics / Counter-Tempo",
    });
    expect(characterText).toBe(
      "Ethan Reed. Mythic Vanguard. Frontline Sentinel commander balancing kinetic resonance. Combat style: Redline Kinetics / Counter-Tempo.",
    );

    const timelineText = buildLoreNarrationText({
      event_name: "Fall of Duskmoor",
      era: "First Era",
      year: 2042,
      lore: "The northern breach opened at midnight.",
    });
    expect(timelineText).toBe(
      "Fall of Duskmoor. First Era. Year 2042. The northern breach opened at midnight.",
    );
  });

  it("speakLoreNarration cancels prior speech, configures utterance, and handles end/error callbacks", () => {
    const spoken: SpeechUtteranceLike[] = [];
    let cancelCount = 0;

    class MockUtterance implements SpeechUtteranceLike {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((event: { error?: string | undefined }) => void) | null = null;
      constructor(text = "") {
        this.text = text;
      }
    }

    const synthesis: SpeechSynthesisLike = {
      cancel: () => {
        cancelCount += 1;
      },
      speak: (u) => {
        spoken.push(u);
      },
    };

    expect(isSpeechSynthesisSupported({ synthesis, UtteranceCtor: MockUtterance })).toBe(true);

    let startedCount = 0;
    let endedCount = 0;
    let erroredCode = "";

    const res = speakLoreNarration({
      text: "Ethan Reed. Mythic Vanguard.",
      rate: 1.05,
      onStart: () => {
        startedCount += 1;
      },
      onEnd: () => {
        endedCount += 1;
      },
      onError: (code) => {
        erroredCode = code;
      },
      env: { synthesis, UtteranceCtor: MockUtterance },
    });

    expect(res.started).toBe(true);
    expect(cancelCount).toBe(1);
    expect(spoken.length).toBe(1);
    expect(spoken[0]!.text).toBe("Ethan Reed. Mythic Vanguard.");
    expect(spoken[0]!.rate).toBe(1.05);

    spoken[0]!.onstart?.();
    expect(startedCount).toBe(1);

    // Canceled errors should cleanly invoke onEnd without firing onError
    spoken[0]!.onerror?.({ error: "canceled" });
    expect(endedCount).toBe(1);
    expect(erroredCode).toBe("");

    // Real synthesis errors invoke onError
    spoken[0]!.onerror?.({ error: "synthesis-failed" });
    expect(erroredCode).toBe("synthesis-failed");

    cancelLoreNarration({ synthesis, UtteranceCtor: MockUtterance });
    expect(cancelCount).toBe(2);
  });

  it("speakLoreNarration degrades cleanly when Web Speech API is unavailable or text is empty", () => {
    const emptyRes = speakLoreNarration({ text: "   " });
    expect(emptyRes).toEqual({ started: false, reason: "empty" });

    const unsupportedRes = speakLoreNarration({
      text: "Sample lore",
      env: { synthesis: undefined, UtteranceCtor: undefined },
    });
    expect(unsupportedRes.started).toBe(false);
    if (!unsupportedRes.started) {
      expect(unsupportedRes.reason === "unsupported" || unsupportedRes.reason === "error").toBe(
        true,
      );
    }
  });
});
