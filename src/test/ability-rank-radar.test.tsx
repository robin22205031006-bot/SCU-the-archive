import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AbilityBenefitsModal } from "@/components/ability-benefits-modal";
import { AbilityRankRadar } from "@/components/ability-rank-radar";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { computeAbilityRankUtility, getAbilityRankRadarSeries } from "@/lib/ability-benefits";

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

let rectSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
  rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        width: 340,
        height: 206,
        top: 0,
        left: 0,
        right: 340,
        bottom: 206,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );
});

afterAll(() => {
  rectSpy?.mockRestore();
});

afterEach(() => {
  cleanup();
});

function TestShell({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["nexus-symbol-settings"], {});
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider>{children}</UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("AbilityRankRadar & 5-rank radar series", () => {
  it("computes monotonically scaling radar stats across Ranks I to V", () => {
    for (const abilityKey of ["red_lightning", "wind", "tactician", "sword_master"]) {
      const series = getAbilityRankRadarSeries(abilityKey);
      expect(series.map((p) => p.key)).toEqual([
        "damage",
        "speed",
        "utility",
        "range",
        "mobility",
        "potency",
      ]);

      for (const point of series) {
        expect(point.r1).toBeGreaterThan(0);
        expect(point.r1).toBeLessThanOrEqual(point.r2);
        expect(point.r2).toBeLessThanOrEqual(point.r3);
        expect(point.r3).toBeLessThanOrEqual(point.r4);
        expect(point.r4).toBeLessThanOrEqual(point.r5);
        expect(point.r5).toBeGreaterThan(point.r1);
        expect(point.r5).toBeLessThanOrEqual(100);
      }
    }

    const r1Util = computeAbilityRankUtility({
      cooldownReductionPct: 0,
      energyEfficiencyPct: 0,
      fxPower: 2,
    });
    const r5Util = computeAbilityRankUtility({
      cooldownReductionPct: 45,
      energyEfficiencyPct: 50,
      fxPower: 8,
    });
    expect(r5Util).toBeGreaterThan(r1Util);
    expect(r5Util).toBe(100);
  });

  it("renders a Recharts RadarChart with all 5 rank layers and supports rank selection", () => {
    const onSelectRank = vi.fn();
    render(
      <AbilityRankRadar
        abilityKey="red_lightning"
        activeRank={2}
        onSelectRank={onSelectRank}
        animate={false}
      />,
    );

    const card = screen.getByTestId("ability-rank-radar");
    expect(card).toHaveAttribute("data-active-rank", "2");
    expect(card.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(card.querySelector("svg.recharts-surface")).toBeTruthy();
    expect(card.querySelectorAll(".recharts-radar").length).toBe(5);

    for (const axis of ["Damage", "Speed", "Utility", "Range", "Mobility", "Potency"]) {
      expect(screen.getByText(axis)).toBeInTheDocument();
    }

    const rank4Btn = screen.getByRole("button", {
      name: /Focus Rank IV \(Master\) on radar chart/i,
    });
    fireEvent.click(rank4Btn);
    expect(onSelectRank).toHaveBeenCalledWith(4);
  });

  it("integrates AbilityRankRadar inside AbilityBenefitsModal and stays synced with rank changes", () => {
    render(
      <TestShell>
        <AbilityBenefitsModal
          ability="red_lightning"
          rank={2}
          open={true}
          onOpenChange={() => {}}
          playRankAudio={false}
        />
      </TestShell>,
    );

    const comparison = screen.getByTestId("rank-comparison-view");
    const radar = screen.getByTestId("ability-rank-radar");
    expect(comparison.contains(radar)).toBe(true);
    expect(radar).toHaveAttribute("data-active-rank", "2");

    fireEvent.click(
      screen.getByRole("button", {
        name: /Focus Rank IV \(Master\) on radar chart/i,
      }),
    );

    expect(radar).toHaveAttribute("data-active-rank", "4");
    expect(screen.getByText(/Rank IV Mechanical Benefits/i)).toBeInTheDocument();
  });
});
