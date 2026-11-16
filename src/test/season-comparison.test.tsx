import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSeasonCompareOptions,
  resolveSeasonCombatStats,
  resolveSeasonStatComparison,
} from "@/lib/nexus-season";
import { SeasonStatCharts } from "@/components/season-stat-charts";
import { SeasonStatComparison } from "@/components/season-stat-comparison";
import type { Entity } from "@/lib/entities";

const mockEntity: Pick<Entity, "id" | "name" | "stats" | "abilities"> = {
  id: "char-kaelen",
  name: "Kaelen Voss",
  abilities: ["red_lightning"],
  stats: {
    power: 50,
    agility: 55,
    tactical_iq: 60,
    clan_mastery: 45,
    weapon_proficiency: 50,
    wisdom: 52,
    vitality: 58,
    dossier: {
      "series-1:1": {
        stats: {
          power: 55,
          agility: 60,
          tactical_iq: 64,
          clan_mastery: 48,
          weapon_proficiency: 52,
          wisdom: 50,
          vitality: 60,
        },
        abilityStats: {
          red_lightning: {
            power: 62,
            agility: 68,
            tactical_iq: 50,
            clan_mastery: 40,
            weapon_proficiency: 45,
            wisdom: 42,
            vitality: 55,
          },
        },
      },
      "series-1:2": {
        stats: {
          power: 85,
          agility: 78,
          tactical_iq: 74,
          clan_mastery: 70,
          weapon_proficiency: 68,
          wisdom: 46,
          vitality: 82,
        },
        abilityStats: {
          red_lightning: {
            power: 94,
            agility: 90,
            tactical_iq: 72,
            clan_mastery: 75,
            weapon_proficiency: 70,
            wisdom: 60,
            vitality: 80,
          },
        },
      },
    },
  },
};

const mockSeries = [
  {
    id: "series-1",
    title: "The Sentinels",
    season_count: 3,
    season_names: ["Season 1", "Season 2", "Season 3"],
  },
];

const mockMemberships = [{ series_id: "series-1" }];

afterEach(() => {
  delete document.documentElement.dataset["uiMode"];
  cleanup();
});

describe("Season stat comparison helpers & component", () => {
  it("builds season options with accurate hasStats flags", () => {
    const options = buildSeasonCompareOptions({
      stats: mockEntity.stats,
      seriesList: mockSeries,
      memberships: mockMemberships,
    });

    expect(options.map((o) => o.key)).toEqual(["all", "series-1:1", "series-1:2", "series-1:3"]);
    expect(options.find((o) => o.key === "all")?.hasStats).toBe(true);
    expect(options.find((o) => o.key === "series-1:1")?.hasStats).toBe(true);
    expect(options.find((o) => o.key === "series-1:2")?.hasStats).toBe(true);
    expect(options.find((o) => o.key === "series-1:3")?.hasStats).toBe(false);
  });

  it("computes combat stats, per-stat deltas, averages, peakGain and peakDrop", () => {
    const combatS2 = resolveSeasonCombatStats(mockEntity.stats, "series-1:2");
    expect(combatS2).toEqual({
      power: 85,
      agility: 78,
      tactical_iq: 74,
      clan_mastery: 70,
      weapon_proficiency: 68,
    });

    const comparison = resolveSeasonStatComparison(mockEntity.stats, "series-1:1", "series-1:2");
    expect(comparison.deltas.find((d) => d.key === "power")?.delta).toBe(30);
    expect(comparison.deltas.find((d) => d.key === "wisdom")?.delta).toBe(-4);
    expect(comparison.summary.peakGain?.key).toBe("power");
    expect(comparison.summary.peakGain?.delta).toBe(30);
    expect(comparison.summary.peakDrop?.key).toBe("wisdom");
    expect(comparison.summary.peakDrop?.delta).toBe(-4);
    expect(comparison.summary.avgDelta).toBeGreaterThan(0);

    const abilityComparison = resolveSeasonStatComparison(
      mockEntity.stats,
      "series-1:1",
      "series-1:2",
      "red_lightning",
    );
    expect(abilityComparison.deltas.find((d) => d.key === "power")?.valueA).toBe(62);
    expect(abilityComparison.deltas.find((d) => d.key === "power")?.valueB).toBe(94);
    expect(abilityComparison.deltas.find((d) => d.key === "power")?.delta).toBe(32);
  });

  it("renders dual-season radar overlay and stat delta bars and supports selecting/swapping seasons", () => {
    render(
      <SeasonStatComparison
        entity={mockEntity}
        seriesList={mockSeries}
        memberships={mockMemberships}
        activeSeasonKey="series-1:2"
        abilities={[{ name: "red_lightning", label: "Red Lightning" }]}
        variant="nexus"
      />,
    );

    const baselineSelect = screen.getByLabelText("Compare baseline season") as HTMLSelectElement;
    const targetSelect = screen.getByLabelText("Compare target season") as HTMLSelectElement;

    // Initial selection defaults to earlier season with stats vs active season
    expect(baselineSelect.value).toBe("series-1:1");
    expect(targetSelect.value).toBe("series-1:2");

    // Radar chart renders with dual series legend
    expect(screen.getByRole("img", { name: "Combat stats radar" })).toBeInTheDocument();
    expect(screen.getByText("Sentinels · Season 1")).toBeInTheDocument();
    expect(screen.getByText("Sentinels · Season 2")).toBeInTheDocument();

    // Delta list renders all 7 stats with explicit deltas
    const list = screen.getByRole("list", { name: "Stat delta bars" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(7);
    expect(within(list).getByText("▲ +30")).toBeInTheDocument();
    expect(within(list).getByText("▼ -4")).toBeInTheDocument();

    // Swap seasons flips delta direction
    fireEvent.click(screen.getByRole("button", { name: "Swap comparison seasons" }));
    expect(baselineSelect.value).toBe("series-1:2");
    expect(targetSelect.value).toBe("series-1:1");
    expect(within(list).getByText("▼ -30")).toBeInTheDocument();
    expect(within(list).getByText("▲ +4")).toBeInTheDocument();

    // Switch back and filter by ability stats
    fireEvent.change(baselineSelect, { target: { value: "series-1:1" } });
    fireEvent.change(targetSelect, { target: { value: "series-1:2" } });
    fireEvent.change(screen.getByLabelText("Comparison stat profile"), {
      target: { value: "red_lightning" },
    });
    expect(within(list).getByText("▲ +32")).toBeInTheDocument();
  });

  it("renders Manga Mandala radar overlay when in manga UI mode", () => {
    document.documentElement.dataset["uiMode"] = "manga";
    render(
      <SeasonStatComparison
        entity={mockEntity}
        seriesList={mockSeries}
        memberships={mockMemberships}
        activeSeasonKey="series-1:2"
        variant="manga"
      />,
    );

    expect(
      screen.getByRole("img", { name: "Combat Intervention Mandala chart" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Kaelen Voss — Progression Delta")).toBeInTheDocument();
  });

  it("keeps radar SVG and stat bars mounted across season switches so Framer Motion animates smoothly", () => {
    const { rerender, container } = render(
      <SeasonStatCharts
        stats={mockEntity.stats}
        seasonKey="series-1:1"
        seasonLabel="The Sentinels · Season 1"
        characterName="Kaelen Voss"
        variant="nexus"
      />,
    );

    const radarBefore = screen.getByRole("img", { name: "Combat stats radar" });
    const powerBarBefore = container.querySelector('[data-stat-bar="power"]');
    expect(powerBarBefore).toHaveAttribute("data-value", "55");

    rerender(
      <SeasonStatCharts
        stats={mockEntity.stats}
        seasonKey="series-1:2"
        seasonLabel="The Sentinels · Season 2"
        characterName="Kaelen Voss"
        variant="nexus"
      />,
    );

    const radarAfter = screen.getByRole("img", { name: "Combat stats radar" });
    const powerBarAfter = container.querySelector('[data-stat-bar="power"]');
    expect(radarAfter).toBe(radarBefore);
    expect(powerBarAfter).toBe(powerBarBefore);
    expect(powerBarAfter).toHaveAttribute("data-value", "85");
  });
});
