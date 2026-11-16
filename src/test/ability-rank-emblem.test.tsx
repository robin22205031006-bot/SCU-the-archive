import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AbilityRankEmblem,
  AbilityRankProgressionStrip,
  EMBLEM_RANK_STYLE_TOKENS,
  EMBLEM_RANK_TRANSITION_EFFECTS,
  resolveRankEmblemAsset,
} from "@/components/ability-rank-emblem";
import { AbilityProvider, CHARACTER_ABILITIES_ALL_QK } from "@/context/AbilityContext";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UI_MODE_STORAGE_KEY, UiModeProvider } from "@/hooks/use-ui-mode";
import { ThemeProvider } from "@/context/ThemeContext";
import { setUiStyle } from "@/lib/ui-style";

function TestShell({
  children,
  assignments,
}: {
  children: React.ReactNode;
  assignments?: Array<{
    id: string;
    entity_id: string;
    ability_key: string;
    series_id: string | null;
    season_number: number | null;
    level: number;
  }>;
}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["nexus-symbol-settings"], {});
  if (assignments) {
    qc.setQueryData(CHARACTER_ABILITIES_ALL_QK, assignments);
  }
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

describe("AbilityRankEmblem & AbilityRankProgressionStrip", () => {
  beforeEach(() => {
    localStorage.clear();
    setUiStyle("classic");
    localStorage.setItem(UI_MODE_STORAGE_KEY, "classic");
  });

  afterEach(() => {
    cleanup();
  });

  it("resolves sparse rank asset maps with nearest-lower progression fallback", () => {
    const map = {
      1: "/assets/rank-1.png",
      3: "/assets/rank-3.png",
      5: "/assets/rank-5.png",
    };

    expect(resolveRankEmblemAsset(1, map)).toEqual({
      src: "/assets/rank-1.png",
      sourceRank: 1,
      strategy: "rank-asset",
    });
    expect(resolveRankEmblemAsset(2, map)).toEqual({
      src: "/assets/rank-1.png",
      sourceRank: 1,
      strategy: "rank-asset",
    });
    expect(resolveRankEmblemAsset(3, map)).toEqual({
      src: "/assets/rank-3.png",
      sourceRank: 3,
      strategy: "rank-asset",
    });
    expect(resolveRankEmblemAsset(4, map)).toEqual({
      src: "/assets/rank-3.png",
      sourceRank: 3,
      strategy: "rank-asset",
    });
    expect(resolveRankEmblemAsset(5, map)).toEqual({
      src: "/assets/rank-5.png",
      sourceRank: 5,
      strategy: "rank-asset",
    });
    expect(resolveRankEmblemAsset(2, undefined, "/assets/base.png")).toEqual({
      src: "/assets/base.png",
      sourceRank: null,
      strategy: "base-asset",
    });
    expect(resolveRankEmblemAsset(2, undefined, undefined, "atlas")).toEqual({
      src: null,
      sourceRank: null,
      strategy: "atlas",
    });
  });

  it("swaps rendered asset <img> sources and progressive overlay tiers across Ranks 1..5", () => {
    const assetsByRank = {
      1: "/img/red-lightning-1.webp",
      3: "/img/red-lightning-3.webp",
      5: "/img/red-lightning-5.webp",
    } as const;

    const { container, rerender } = render(
      <TestShell>
        <AbilityRankEmblem
          ability="red_lightning"
          rank={1}
          assetsByRank={assetsByRank}
          showProgressionLabel
        />
      </TestShell>,
    );

    const img1 = container.querySelector("img");
    expect(img1?.getAttribute("src")).toBe("/img/red-lightning-1.webp");
    expect(img1?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(container.querySelector('[data-emblem-overlay-rank="1"]')).toBeTruthy();
    expect(container.querySelector('[data-overlay-tier="1"]')).toBeTruthy();
    expect(container.textContent).toContain("Rank I · Initiate");

    rerender(
      <TestShell>
        <AbilityRankEmblem
          ability="red_lightning"
          rank={3}
          assetsByRank={assetsByRank}
          showProgressionLabel
        />
      </TestShell>,
    );
    const img3 = container.querySelector("img");
    expect(img3?.getAttribute("src")).toBe("/img/red-lightning-3.webp");
    expect(container.querySelector('[data-emblem-overlay-rank="3"]')).toBeTruthy();
    expect(container.querySelector('[data-overlay-tier="3"]')).toBeTruthy();
    expect(container.textContent).toContain("Rank III · Veteran");

    rerender(
      <TestShell>
        <AbilityRankEmblem
          ability="red_lightning"
          rank={5}
          assetsByRank={assetsByRank}
          showProgressionLabel
        />
      </TestShell>,
    );
    const img5 = container.querySelector("img");
    expect(img5?.getAttribute("src")).toBe("/img/red-lightning-5.webp");
    expect(container.querySelector('[data-emblem-overlay-rank="5"]')).toBeTruthy();
    expect(container.querySelector('[data-overlay-tier="5"]')).toBeTruthy();
    expect(container.textContent).toContain("Rank V · Apex");
  });

  it("scales CSS custom properties for glow & saturation and emits ascending/descending transitions on rank change", () => {
    const { container, rerender } = render(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={1} />
      </TestShell>,
    );

    const root1 = container.querySelector(
      '[data-ability-rank-emblem="red_lightning"]',
    ) as HTMLElement | null;
    expect(root1).toBeTruthy();
    expect(root1?.getAttribute("data-rank-transition")).toBe("idle");
    expect(root1?.style.getPropertyValue("--emblem-saturation")).toBe(
      String(EMBLEM_RANK_STYLE_TOKENS[1].saturation),
    );
    expect(root1?.style.getPropertyValue("--emblem-glow-size")).toBe(
      `${EMBLEM_RANK_STYLE_TOKENS[1].glowSizePx}px`,
    );

    rerender(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={4} />
      </TestShell>,
    );
    const root4 = container.querySelector(
      '[data-ability-rank-emblem="red_lightning"]',
    ) as HTMLElement | null;
    expect(root4?.getAttribute("data-rank-transition")).toBe("ascending");
    expect(root4?.style.getPropertyValue("--emblem-saturation")).toBe(
      String(EMBLEM_RANK_STYLE_TOKENS[4].saturation),
    );
    expect(root4?.style.getPropertyValue("--emblem-glow-size")).toBe(
      `${EMBLEM_RANK_STYLE_TOKENS[4].glowSizePx}px`,
    );

    rerender(
      <TestShell>
        <AbilityRankEmblem ability="red_lightning" rank={2} />
      </TestShell>,
    );
    const root2 = container.querySelector(
      '[data-ability-rank-emblem="red_lightning"]',
    ) as HTMLElement | null;
    expect(root2?.getAttribute("data-rank-transition")).toBe("descending");
    expect(root2?.style.getPropertyValue("--emblem-saturation")).toBe(
      String(EMBLEM_RANK_STYLE_TOKENS[2].saturation),
    );
  });

  it("falls back to procedural vector emblem cleanly when a rank asset fails to load", () => {
    const { container } = render(
      <TestShell>
        <AbilityRankEmblem
          ability="blue_flame"
          rank={4}
          assetsByRank={{ 4: "/broken/404.png" }}
          mode="vector"
        />
      </TestShell>,
    );

    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    fireEvent.error(img!);

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-emblem-asset-mode="vector"]')).toBeTruthy();
    expect(container.querySelector('[data-overlay-tier="4"]')).toBeTruthy();
  });

  it("supports custom per-rank overlays and Nexus atlas artwork mode", () => {
    setUiStyle("nexus");
    localStorage.setItem(UI_MODE_STORAGE_KEY, "nexus");

    const { container, rerender } = render(
      <TestShell>
        <AbilityRankEmblem
          ability="sky_guardian"
          rank={2}
          overlaysByRank={{
            2: <span data-testid="custom-overlay-2">Phase II</span>,
            5: <span data-testid="custom-overlay-5">Crown V</span>,
          }}
        />
      </TestShell>,
    );

    expect(container.querySelector('[data-emblem-asset-mode="atlas"]')).toBeTruthy();
    expect(container.querySelector('svg[data-ability-art="sky-guardian"]')).toBeTruthy();
    expect(screen.getByTestId("custom-overlay-2")).toBeInTheDocument();

    rerender(
      <TestShell>
        <AbilityRankEmblem
          ability="sky_guardian"
          rank={5}
          overlaysByRank={{
            2: <span data-testid="custom-overlay-2">Phase II</span>,
            5: <span data-testid="custom-overlay-5">Crown V</span>,
          }}
        />
      </TestShell>,
    );

    expect(screen.getByTestId("custom-overlay-5")).toBeInTheDocument();
    expect(container.querySelector('[data-emblem-overlay-rank="5"]')).toBeTruthy();
  });

  it("resolves per-character AbilityContext rank when explicit rank prop is omitted", () => {
    const { container } = render(
      <TestShell
        assignments={[
          {
            id: "a1",
            entity_id: "char-zayn",
            ability_key: "red_lightning",
            series_id: "ser-sentinels",
            season_number: 5,
            level: 5,
          },
          {
            id: "a2",
            entity_id: "char-zayn",
            ability_key: "red_lightning",
            series_id: "ser-sentinels",
            season_number: 3,
            level: 2,
          },
        ]}
      >
        <AbilityProvider initialAbility="red_lightning">
          <AbilityRankEmblem ability="red_lightning" entityId="char-zayn" showProgressionLabel />
        </AbilityProvider>
      </TestShell>,
    );

    expect(container.querySelector('[data-emblem-rank="5"]')).toBeTruthy();
    expect(container.textContent).toContain("Rank V · Apex");
  });

  it("renders AbilityRankProgressionStrip across Ranks 1..5 and triggers onSelectRank", () => {
    const onSelectRank = vi.fn();
    const { container } = render(
      <TestShell>
        <AbilityRankProgressionStrip
          ability="black_hole"
          currentRank={3}
          onSelectRank={onSelectRank}
        />
      </TestShell>,
    );

    const strip = container.querySelector('[data-emblem-progression="true"]');
    expect(strip?.getAttribute("data-current-rank")).toBe("3");
    const emblems = container.querySelectorAll('[data-ability-rank-emblem="black_hole"]');
    expect(emblems).toHaveLength(5);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    fireEvent.click(buttons[4]!);
    expect(onSelectRank).toHaveBeenCalledWith(5);
  });

  it("applies distinct CSS transition effects per rank change (1-5) and pronounced Rank 5 Legendary aura", () => {
    vi.useFakeTimers();
    try {
      const { container, rerender } = render(
        <TestShell>
          <AbilityRankEmblem ability="red_lightning" rank={1} />
        </TestShell>,
      );

      const getRoot = () =>
        container.querySelector('[data-ability-rank-emblem="red_lightning"]') as HTMLElement;

      expect(getRoot().getAttribute("data-rank-transition")).toBe("idle");
      expect(getRoot().getAttribute("data-rank-transition-effect")).toBe("none");
      expect(getRoot().getAttribute("data-legendary-aura")).toBe("inactive");
      expect(container.querySelector(".scu-rank-emblem-aura")).toBeTruthy();

      const steps = [2, 3, 4, 5] as const;
      for (const nextRank of steps) {
        rerender(
          <TestShell>
            <AbilityRankEmblem ability="red_lightning" rank={nextRank} />
          </TestShell>,
        );
        const root = getRoot();
        expect(root.getAttribute("data-rank-transition")).toBe("ascending");
        expect(root.getAttribute("data-rank-transition-effect")).toBe(
          EMBLEM_RANK_TRANSITION_EFFECTS[nextRank],
        );
        expect(root.style.getPropertyValue("--emblem-transition-ms")).toBe(
          `${EMBLEM_RANK_STYLE_TOKENS[nextRank].transitionDurationMs}ms`,
        );
        expect(root.style.getPropertyValue("--emblem-aura-spread")).toBe(
          `${EMBLEM_RANK_STYLE_TOKENS[nextRank].auraSpreadPx}px`,
        );
        expect(root.getAttribute("data-legendary-aura")).toBe(
          nextRank === 5 ? "active" : "inactive",
        );
      }

      // Rank 5 aura spread & glow strictly surpass lower ranks
      expect(EMBLEM_RANK_STYLE_TOKENS[5].auraSpreadPx).toBeGreaterThan(
        EMBLEM_RANK_STYLE_TOKENS[4].auraSpreadPx,
      );
      expect(EMBLEM_RANK_STYLE_TOKENS[5].glowSizePx).toBeGreaterThan(
        EMBLEM_RANK_STYLE_TOKENS[4].glowSizePx,
      );
      expect(EMBLEM_RANK_STYLE_TOKENS[5].transitionDurationMs).toBeGreaterThan(
        EMBLEM_RANK_STYLE_TOKENS[4].transitionDurationMs,
      );

      // Transition settles to idle after Rank 5's Legendary aura window, while Legendary aura stays active
      act(() => {
        vi.advanceTimersByTime(EMBLEM_RANK_STYLE_TOKENS[5].transitionDurationMs);
      });
      expect(getRoot().getAttribute("data-rank-transition")).toBe("idle");
      expect(getRoot().getAttribute("data-rank-transition-effect")).toBe("none");
      expect(getRoot().getAttribute("data-legendary-aura")).toBe("active");

      // Descending back to Rank 1 applies the Rank 1 transition effect and clears Legendary aura
      rerender(
        <TestShell>
          <AbilityRankEmblem ability="red_lightning" rank={1} />
        </TestShell>,
      );
      expect(getRoot().getAttribute("data-rank-transition")).toBe("descending");
      expect(getRoot().getAttribute("data-rank-transition-effect")).toBe("initiate-seal");
      expect(getRoot().getAttribute("data-legendary-aura")).toBe("inactive");
    } finally {
      vi.useRealTimers();
    }
  });
});
