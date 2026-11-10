import { describe, it, expect } from "vitest";
import { seasonJourneyRows } from "@/lib/journey";
const rows = [{ id: "r", series_id: "s", series: { id: "s", title: "The Sentinels" }, arc_role: "Protagonist", status: "Alive" }];
describe("season journey", () => {
  it("draws one point per season with that season's role", () => {
    const out = seasonJourneyRows(rows, { dossier: { "s:1": { role: "Main Protagonist" }, "s:2": { role: "Protagonist", status: "Dead" } } });
    expect(out.map(r => [r.series?.title, r.arc_role, r.status])).toEqual([["The Sentinels S1", "Main Protagonist", "Alive"], ["The Sentinels S2", "Protagonist", "Dead"]]);
  });
  it("keeps the series point when no season data exists", () => expect(seasonJourneyRows(rows, {})).toHaveLength(1));
});
