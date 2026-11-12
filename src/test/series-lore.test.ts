import { expect, it } from "vitest";
import {
  savedSeasonTitles,
  scopeLoreText,
  loreQuestionsBlocked,
  rankLoreEvidence,
} from "@/lib/series-lore";

it("saves custom titles at their existing season positions, including commas", () => {
  expect(savedSeasonTitles([" Dawn, Part One ", "", "Aftermath"])).toEqual([
    "Dawn, Part One",
    "Season 2",
    "Aftermath",
  ]);
});
it("season questions exclude other season facts", () => {
  expect(scopeLoreText("S1: first encounter. S2: final battle.", "The Sentinels", 1)).toBe(
    "S1: first encounter. ",
  );
});
it("does not treat another series season as Sentinels lore", () => {
  expect(scopeLoreText("Redline S1: spy mission.", "The Sentinels", 1)).toBe("");
});
it("unlabelled notes cannot supply specific season answers", () => {
  expect(scopeLoreText("Ethan is a hero.", "The Sentinels", 1)).toBe("");
});
it("separates Redline from Sentinels within the same archive note", () => {
  const text = "S1: first encounter. Redline S1: spy mission. S2: command duty.";
  expect(scopeLoreText(text, "The Sentinels", 1)).toBe("S1: first encounter. ");
  expect(scopeLoreText(text, "Redline", 1)).toBe("Redline S1: spy mission. ");
  expect(scopeLoreText(text, "Redline", 2)).toBe("S2: command duty.");
});
it.each(["characters", "abilities", "archive"])("%s spoiler masking blocks lore answers", (key) => {
  expect(loreQuestionsBlocked({ [key]: true })).toBe(true);
  expect(loreQuestionsBlocked({ [key]: false })).toBe(false);
});
it("selects relevant evidence before less relevant entries", () => {
  expect(
    rankLoreEvidence(
      [
        { label: "one", text: "A battle" },
        { label: "two", text: "Samuel leads the mission" },
      ],
      "Who is Samuel?",
    )[0]?.label,
  ).toBe("two");
});
