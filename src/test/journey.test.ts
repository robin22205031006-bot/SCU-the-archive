import { describe, it, expect } from "vitest";
import {
  evaluateJourneyPointTrends,
  journeyScore,
  seasonJourneyRows,
  summarizeJourneyLineTrend,
  timelineRank,
} from "@/lib/journey";
import { completeOrder } from "@/lib/series-order";
const rows = [
  {
    id: "r",
    series_id: "s",
    series: { id: "s", title: "The Sentinels" },
    arc_role: "Protagonist",
    status: "Alive",
  },
];
describe("season journey", () => {
  it("draws one point per season with that season's role", () => {
    const out = seasonJourneyRows(rows, {
      dossier: {
        "s:1": { role: "Main Protagonist" },
        "s:2": { role: "Protagonist", status: "Dead" },
      },
    });
    expect(out.map((r) => [r.season, r.arc_role, r.status])).toEqual([
      [1, "Main Protagonist", "Alive"],
      [2, "Protagonist", "Dead"],
    ]);
  });
  it("keeps the series point when no season data exists", () =>
    expect(seasonJourneyRows(rows, {})).toHaveLength(1));
  it("orders the timeline by the admin series order, then season", () => {
    const r = (sid: string, n: number) => ({ id: sid + n, season: n, series: { id: sid } });
    const order = ["red", "sent"];
    expect(
      [r("sent", 1), r("red", 2), r("red", 1)]
        .sort((a, b) => timelineRank(a, order) - timelineRank(b, order))
        .map((x) => x.id),
    ).toEqual(["red1", "red2", "sent1"]);
  });
  it("defaults to release order and keeps new series", () =>
    expect(
      completeOrder(
        ["b"],
        [
          { id: "a", title: "The Sentinels" },
          { id: "b", title: "Redline" },
          { id: "c", title: "Zeta" },
        ],
      ),
    ).toEqual(["b", "a", "c"]));

  it("reflects Alive, Retired, Missing, Presumed Dead, and Dead statuses even with a role set", () => {
    const base = {
      arc_role: "Support",
      role_in_series: "Support",
      statAverage: 50,
      abilityCount: 1,
    };
    const alive = journeyScore({ ...base, status: "Alive" });
    const retired = journeyScore({ ...base, status: "Retired" });
    const missing = journeyScore({ ...base, status: "Missing" });
    const presumed = journeyScore({ ...base, status: "Presumed Dead" });
    const dead = journeyScore({ ...base, status: "Dead" });

    expect(alive).toBeGreaterThan(retired);
    expect(retired).toBeGreaterThan(missing);
    expect(missing).toBeGreaterThan(presumed);
    expect(presumed).toBeGreaterThan(dead);
  });

  it("increases journey score when gaining abilities and raising seasonal stats", () => {
    const out = seasonJourneyRows(rows, {
      dossier: {
        "s:1": {
          role: "Support",
          status: "Alive",
          abilityKeys: ["hydrokinesis"],
          stats: { power: 30, agility: 30, tactical_iq: 30 },
        },
        "s:2": {
          role: "Support",
          status: "Alive",
          abilityKeys: ["hydrokinesis", "ice_veil", "storm_surge"],
          stats: { power: 80, agility: 75, tactical_iq: 70 },
        },
        "s:3": {
          role: "Support",
          status: "Missing",
          abilityKeys: ["hydrokinesis", "ice_veil", "storm_surge"],
          stats: { power: 80, agility: 75, tactical_iq: 70 },
        },
      },
    });

    expect(out).toHaveLength(3);
    expect(out[0]?.abilityCount).toBe(1);
    expect(out[0]?.gainedAbilities).toBeUndefined();
    expect(out[1]?.abilityCount).toBe(3);
    expect(out[1]?.gainedAbilities).toBe(2);
    expect(out[1]?.statAverage).toBeGreaterThan(out[0]?.statAverage ?? 0);

    const s1Score = journeyScore(out[0]!);
    const s2Score = journeyScore(out[1]!);
    const s3Score = journeyScore(out[2]!);

    expect(s2Score).toBeGreaterThan(s1Score);
    expect(s3Score).toBeLessThan(s2Score);
  });

  it("evaluates upward and downward point and summary trends vs overall progression history", () => {
    const out = seasonJourneyRows(rows, {
      dossier: {
        "s:1": {
          role: "Support",
          status: "Alive",
          abilityKeys: ["hydrokinesis"],
          stats: { power: 30, agility: 30, tactical_iq: 30 },
        },
        "s:2": {
          role: "Support",
          status: "Alive",
          abilityKeys: ["hydrokinesis", "ice_veil"],
          stats: { power: 80, agility: 80, tactical_iq: 80 },
        },
        "s:3": {
          role: "Support",
          status: "Retired",
          abilityKeys: ["hydrokinesis", "ice_veil"],
          stats: { power: 75, agility: 75, tactical_iq: 75 },
        },
      },
    });

    const trends = evaluateJourneyPointTrends(out, ["s"]);
    expect(trends[0]?.overallTrend).toBe("steady");
    expect(trends[1]?.overallTrend).toBe("up");
    expect(trends[1]?.statsTrend).toBe("up");
    expect(trends[2]?.overallTrend).toBe("down");
    expect(trends[2]?.statusTrend).toBe("down");
    expect(trends[2]?.statusChanged).toBe(true);
    expect(trends[2]?.previousStatus).toBe("Alive");

    const summary = summarizeJourneyLineTrend(out, ["s"]);
    expect(summary.overallTrend).toBe("down");
    expect(summary.statusTrend).toBe("down");
    expect(summary.latestStatus).toBe("Retired");
    expect(summary.pointCount).toBe(3);
  });
});
