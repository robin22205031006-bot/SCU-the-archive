import { expect, it } from "vitest";
import { savedSeasonTitles, scopeLoreText, loreQuestionsBlocked, rankLoreEvidence } from "@/lib/series-lore";

it("saves custom titles at their existing season positions, including commas", () => {
  expect(savedSeasonTitles([" Dawn, Part One ", "", "Aftermath"])).toEqual(["Dawn, Part One", "Season 2", "Aftermath"]);
});
it("season questions exclude other season facts", () => {
  expect(scopeLoreText("S1: first encounter. S2: final battle.", "The Sentinels", 1)).toBe("S1: first encounter. ");
});
it("does not treat another series season as Sentinels lore", () => {
  expect(scopeLoreText("Redline S1: spy mission.", "The Sentinels", 1)).toBe("");
});
it("unlabelled notes cannot supply specific season answers", () => {
  expect(scopeLoreText("Ethan is a hero.", "The Sentinels", 1)).toBe("");
});
it.each(["characters", "abilities", "archive"])("%s spoiler masking blocks lore answers", key => {
  expect(loreQuestionsBlocked({ [key]: true })).toBe(true);
  expect(loreQuestionsBlocked({ [key]: false })).toBe(false);
});
it("selects relevant evidence before less relevant entries", () => {
  expect(rankLoreEvidence([{ label: "one", text: "A battle" }, { label: "two", text: "Samuel leads the mission" }], "Who is Samuel?")[0]?.label).toBe("two");
});