import { expect, it } from "vitest";
import {
  savedSeasonTitles,
  removeSeasonAt,
  removeSeasonFromDossier,
  removeSeriesFromDossier,
  removeSeriesFromOrder,
  removeSeriesFromStyles,
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
it("removes a middle season cleanly and keeps remaining titles aligned", () => {
  expect(
    removeSeasonAt({ season_count: 3, season_names: ["Zaan", "Khalid", "Alister"] }, 2),
  ).toEqual({
    season_count: 2,
    season_names: ["Zaan", "Alister"],
    removedTitle: "Khalid",
  });
});
it("removes unnamed default seasons and handles removing the last remaining season", () => {
  expect(removeSeasonAt({ season_count: 3, season_names: [] }, 2)).toEqual({
    season_count: 2,
    season_names: ["Season 1", "Season 3"],
    removedTitle: "Season 2",
  });
  expect(removeSeasonAt({ season_count: 1, season_names: ["Origin"] }, 1)).toEqual({
    season_count: 0,
    season_names: [],
    removedTitle: "Origin",
  });
  expect(removeSeasonAt({ season_count: 1, season_names: [] }, 2)).toBeNull();
});
it("removes a season dossier entry and shifts higher season keys down", () => {
  const s1 = "00000000-0000-4000-a000-000000000001";
  const s2 = "00000000-0000-4000-a000-000000000002";
  const stats = {
    power: 90,
    dossier: {
      [`${s1}:all`]: { role: "Lead" },
      [`${s1}:1`]: { story: "S1" },
      [`${s1}:2`]: { story: "S2" },
      [`${s1}:3`]: { story: "S3" },
      [`${s2}:2`]: { story: "Other" },
    },
  };
  const res = removeSeasonFromDossier(stats, s1, 2);
  expect(res.changed).toBe(true);
  expect(res.nextStats).toEqual({
    power: 90,
    dossier: {
      [`${s1}:all`]: { role: "Lead" },
      [`${s1}:1`]: { story: "S1" },
      [`${s1}:2`]: { story: "S3" },
      [`${s2}:2`]: { story: "Other" },
    },
  });
  expect(removeSeasonFromDossier(stats, s2, 5).changed).toBe(false);
});
it("removes all dossier, order, and style entries for a deleted series", () => {
  const s1 = "00000000-0000-4000-a000-000000000001";
  const s2 = "00000000-0000-4000-a000-000000000002";
  const dossierRes = removeSeriesFromDossier(
    {
      dossier: {
        [`${s1}:all`]: { role: "Lead" },
        [`${s1}:1`]: { story: "S1" },
        [`${s2}:1`]: { story: "Keep" },
      },
    },
    s1,
  );
  expect(dossierRes.changed).toBe(true);
  expect(dossierRes.nextStats).toEqual({ dossier: { [`${s2}:1`]: { story: "Keep" } } });

  const orderRes = removeSeriesFromOrder(
    { release: [s1, s2], story: [s2, s1], active: "story" },
    s1,
  );
  expect(orderRes).toEqual({
    changed: true,
    nextValue: { release: [s2], story: [s2], active: "story" },
  });

  const styleRes = removeSeriesFromStyles({ [s1]: { color: "#fff" }, [s2]: { color: "#000" } }, s1);
  expect(styleRes).toEqual({
    changed: true,
    nextValue: { [s2]: { color: "#000" } },
  });
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
