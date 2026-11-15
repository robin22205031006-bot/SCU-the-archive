import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLoreNarrationText,
  cancelLoreNarration,
  isSpeechSynthesisSupported,
  speakLoreNarration,
  type SpeechSynthesisLike,
  type SpeechUtteranceLike,
} from "./lore-tts";

test("buildLoreNarrationText formats character, organization, and timeline lore cleanly", () => {
  const characterText = buildLoreNarrationText({
    name: "Ethan Reed",
    tier: "Mythic",
    category: "Vanguard",
    bio: "Frontline Sentinel commander balancing kinetic resonance",
    combat_style: "Redline Kinetics / Counter-Tempo",
  });
  assert.equal(
    characterText,
    "Ethan Reed. Mythic Vanguard. Frontline Sentinel commander balancing kinetic resonance. Combat style: Redline Kinetics / Counter-Tempo.",
  );

  const timelineText = buildLoreNarrationText({
    event_name: "Fall of Duskmoor",
    era: "First Era",
    year: 2042,
    lore: "The northern breach opened at midnight.",
  });
  assert.equal(
    timelineText,
    "Fall of Duskmoor. First Era. Year 2042. The northern breach opened at midnight.",
  );
});

test("speakLoreNarration cancels prior speech, configures utterance, and handles end/error callbacks", () => {
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

  assert.equal(isSpeechSynthesisSupported({ synthesis, UtteranceCtor: MockUtterance }), true);

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

  assert.equal(res.started, true);
  assert.equal(cancelCount, 1);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0]!.text, "Ethan Reed. Mythic Vanguard.");
  assert.equal(spoken[0]!.rate, 1.05);

  spoken[0]!.onstart?.();
  assert.equal(startedCount, 1);

  // Canceled errors should cleanly invoke onEnd without firing onError
  spoken[0]!.onerror?.({ error: "canceled" });
  assert.equal(endedCount, 1);
  assert.equal(erroredCode, "");

  // Real synthesis errors invoke onError
  spoken[0]!.onerror?.({ error: "synthesis-failed" });
  assert.equal(erroredCode, "synthesis-failed");

  cancelLoreNarration({ synthesis, UtteranceCtor: MockUtterance });
  assert.equal(cancelCount, 2);
});

test("speakLoreNarration degrades cleanly when Web Speech API is unavailable or text is empty", () => {
  const emptyRes = speakLoreNarration({ text: "   " });
  assert.deepEqual(emptyRes, { started: false, reason: "empty" });

  const unsupportedRes = speakLoreNarration({
    text: "Sample lore",
    env: { synthesis: undefined, UtteranceCtor: undefined },
  });
  assert.equal(unsupportedRes.started, false);
  if (!unsupportedRes.started) {
    assert.ok(unsupportedRes.reason === "unsupported" || unsupportedRes.reason === "error");
  }
});
