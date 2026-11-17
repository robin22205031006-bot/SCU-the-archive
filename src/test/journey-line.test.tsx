import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JourneyLine } from "@/components/journey-line";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import type { JourneyRow } from "@/lib/journey";

function renderWithQuery(ui: React.ReactElement, mode: "nexus" | "manga" = "nexus") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["series"], [{ id: "s-1", title: "The Sentinels" }]);
  qc.setQueryData(["app_settings", "series_order"], { series_order: ["s-1"] });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider initialMode={mode}>{ui}</UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("JourneyLine progression trend visual indicators", () => {
  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("renders upward/downward SVG arrows, color-shifted segments, and header badges for stats and status shifts", () => {
    const rows: JourneyRow[] = [
      {
        id: "s-1:1",
        series_id: "s-1",
        season: 1,
        series: { id: "s-1", title: "The Sentinels" },
        arc_role: "Support",
        status: "Alive",
        statAverage: 35,
        abilityCount: 1,
      },
      {
        id: "s-1:2",
        series_id: "s-1",
        season: 2,
        series: { id: "s-1", title: "The Sentinels" },
        arc_role: "Support",
        status: "Alive",
        statAverage: 82,
        abilityCount: 3,
        gainedAbilities: 2,
      },
      {
        id: "s-1:3",
        series_id: "s-1",
        season: 3,
        series: { id: "s-1", title: "The Sentinels" },
        arc_role: "Support",
        status: "Retired",
        statAverage: 45,
        abilityCount: 3,
      },
    ];

    renderWithQuery(<JourneyLine lines={[{ name: "Nilanjona", rows }]} />);

    // Overall header summary reflects latest point (S3 Retired + lower stats vs history)
    expect(screen.getByTestId("journey-trend-badge")).toHaveAttribute("data-trend", "down");
    expect(screen.getByTestId("journey-stats-trend")).toHaveAttribute("data-trend", "down");
    expect(screen.getByTestId("journey-status-trend")).toHaveAttribute("data-trend", "down");
    expect(screen.getByTestId("journey-status-trend")).toHaveTextContent("Status Retired");

    // Segments color-shift between upward progression (S1->S2) and downward drop (S2->S3)
    const seg1 = screen.getByTestId("journey-segment-1");
    const seg2 = screen.getByTestId("journey-segment-2");
    expect(seg1).toHaveAttribute("data-trend", "up");
    expect(seg1).toHaveAttribute("stroke", "#10b981");
    expect(seg2).toHaveAttribute("data-trend", "down");
    expect(seg2).toHaveAttribute("stroke", "#f43f5e");

    // SVG arrow glyphs appear for both upward and downward points
    expect(screen.getByTestId("journey-point-arrow-1")).toHaveAttribute("data-trend", "up");
    expect(screen.getByTestId("journey-point-arrow-2")).toHaveAttribute("data-trend", "down");
  });

  it("shows upward overall, stats, and recovery status badges when recovering and gaining power in Manga mode", () => {
    const rows: JourneyRow[] = [
      {
        id: "s-1:1",
        series_id: "s-1",
        season: 1,
        series: { id: "s-1", title: "The Sentinels" },
        arc_role: "Support",
        status: "Missing",
        statAverage: 40,
        abilityCount: 1,
      },
      {
        id: "s-1:2",
        series_id: "s-1",
        season: 2,
        series: { id: "s-1", title: "The Sentinels" },
        arc_role: "Protagonist",
        status: "Alive",
        statAverage: 88,
        abilityCount: 3,
        gainedAbilities: 2,
      },
    ];

    renderWithQuery(
      <JourneyLine title="Arc Trajectory" lines={[{ name: "Grace", rows }]} />,
      "manga",
    );

    expect(document.querySelector('[data-manga-chart="journey-stepped"]')).toBeInTheDocument();
    expect(screen.getByTestId("journey-trend-badge")).toHaveAttribute("data-trend", "up");
    expect(screen.getByTestId("journey-stats-trend")).toHaveAttribute("data-trend", "up");
    expect(screen.getByTestId("journey-status-trend")).toHaveAttribute("data-trend", "up");
    expect(screen.getByTestId("journey-segment-1")).toHaveAttribute("data-trend", "up");
    expect(screen.getByTestId("journey-point-arrow-1")).toHaveAttribute("data-trend", "up");
  });
});
