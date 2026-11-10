import { expect, it } from "vitest";
import { seriesSeasonNames } from "@/lib/series-seasons";

it("The Sentinels has five selectable seasons", () => {
  expect(seriesSeasonNames({ season_count: 5, season_names: [] })).toEqual(["Season 1", "Season 2", "Season 3", "Season 4", "Season 5"]);
});
it("Redline has two selectable seasons", () => {
  expect(seriesSeasonNames({ season_count: 2, season_names: [] })).toEqual(["Season 1", "Season 2"]);
});
it.each(["Bloodline", "Divine Beast"])("%s has one selectable season", () => {
  expect(seriesSeasonNames({ season_count: 1, season_names: [] })).toEqual(["Season 1"]);
});
it("Standalone Epics keeps the original named entries", () => {
  expect(seriesSeasonNames({ season_count: 3, season_names: ["Zaan", "Khalid", "Alister"] })).toEqual(["Zaan", "Khalid", "Alister"]);
});