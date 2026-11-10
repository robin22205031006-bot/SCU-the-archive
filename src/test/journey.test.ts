import { describe, it, expect } from "vitest";
import { seasonJourneyRows, timelineRank } from "@/lib/journey";
import { completeOrder } from "@/lib/series-order";
const rows = [{ id: "r", series_id: "s", series: { id: "s", title: "The Sentinels" }, arc_role: "Protagonist", status: "Alive" }];
describe("season journey", () => {
  it("draws one point per season with that season's role", () => {
    const out = seasonJourneyRows(rows, { dossier: { "s:1": { role: "Main Protagonist" }, "s:2": { role: "Protagonist", status: "Dead" } } });
    expect(out.map(r => [r.season, r.arc_role, r.status])).toEqual([[1, "Main Protagonist", "Alive"], [2, "Protagonist", "Dead"]]);
  });
  it("keeps the series point when no season data exists", () => expect(seasonJourneyRows(rows, {})).toHaveLength(1));
  it("orders the timeline by the admin series order, then season", () => {
    const r = (sid: string, n: number) => ({ id: sid + n, season: n, series: { id: sid } });
    const order = ["red", "sent"];
    expect([r("sent", 1), r("red", 2), r("red", 1)].sort((a, b) => timelineRank(a, order) - timelineRank(b, order)).map(x => x.id)).toEqual(["red1", "red2", "sent1"]);
  });
  it("defaults to release order and keeps new series", () => expect(completeOrder(["b"], [{ id: "a", title: "The Sentinels" }, { id: "b", title: "Redline" }, { id: "c", title: "Zeta" }])).toEqual(["b", "a", "c"]));
});
