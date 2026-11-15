import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Sparkles } from "lucide-react";
import { AbilityBadge, AbilityBadgeRow } from "@/components/ability-badge";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { GenreAbilityEmblem } from "@/components/genre-decorations";
import { AlchemicalAbilityOrb } from "@/components/botanical-foliage-canopy";
import { NexusStatWheel } from "@/components/nexus-stat-wheel";
import { abilityDef } from "@/lib/abilities";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UI_MODE_STORAGE_KEY, UiModeProvider } from "@/hooks/use-ui-mode";
import { setUiStyle } from "@/lib/ui-style";
import { setGenreTheme } from "@/lib/genre-themes";
import { ThemeProvider } from "@/context/ThemeContext";
import { ABILITY_RANK_META } from "@/lib/ability-rank";

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

describe("Ability Emblem Ranking 1-5 & Multi-Style Emblems", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["primarySystem"];
    delete document.documentElement.dataset["mangaSubtheme"];
  });

  afterEach(() => {
    cleanup();
  });

  it("renders AbilityRankPips for levels 1..5 with Roman numerals and short titles", () => {
    for (const rank of [1, 2, 3, 4, 5] as const) {
      const { container, unmount } = render(<AbilityRankPips rank={rank} showLabel />);
      const root = container.querySelector(`[data-ability-rank="${rank}"]`);
      expect(root).toBeTruthy();
      expect(root?.getAttribute("data-rank-title")).toBe(ABILITY_RANK_META[rank].shortTitle);
      expect(root?.textContent).toContain(ABILITY_RANK_META[rank].roman);
      expect(root?.textContent).toContain(ABILITY_RANK_META[rank].shortTitle);
      unmount();
    }
  });

  it("renders Classic AbilityBadge with Rank 1-5 pips while preserving Lucide icon contract", () => {
    localStorage.setItem(UI_MODE_STORAGE_KEY, "classic");
    setUiStyle("classic");

    const { container } = render(
      <TestShell>
        <AbilityBadge name="shishjutsu" level={4} />
      </TestShell>,
    );

    expect(container.querySelector("svg.lucide")).toBeTruthy();
    expect(container.querySelector("[data-custom-emblem]")).toBeNull();
    expect(container.querySelector('[data-ability-rank="4"]')).toBeTruthy();
    expect(container.textContent).toContain("IV");
  });

  it("renders Minimal AbilityBadge with AbilityCustomEmblem and Rank 1-5", () => {
    localStorage.setItem(UI_MODE_STORAGE_KEY, "minimal");
    setUiStyle("classic");

    const { container } = render(
      <TestShell>
        <AbilityBadge name="shishjutsu" level={5} />
      </TestShell>,
    );

    expect(container.querySelector('[data-custom-emblem="ofuda"]')).toBeTruthy();
    expect(container.querySelector('[data-ability-rank="5"]')).toBeTruthy();
    expect(container.textContent).toContain("V");
  });

  it("renders NexusAbilitySymbol and Nexus AbilityBadge with SVG rank constellation arc (1-5)", () => {
    localStorage.setItem(UI_MODE_STORAGE_KEY, "nexus");
    setUiStyle("nexus");

    const { container } = render(
      <TestShell>
        <AbilityBadge name="sky_guardian" level={3} />
      </TestShell>,
    );

    expect(container.querySelector("[data-custom-emblem]")).toBeNull();
    expect(container.querySelector('svg[data-ability-art="sky-guardian"]')).toBeTruthy();
    expect(container.querySelector('g[data-nexus-rank-arc="3"]')).toBeTruthy();
    // 1 base outer orbital ring + 5 rank pips
    expect(container.querySelectorAll('g[data-nexus-rank-arc="3"] circle')).toHaveLength(6);
  });

  it("renders Manga AbilityBadge & GenreAbilityEmblem with rank 1-5 across medallion and compact variants", () => {
    localStorage.setItem(UI_MODE_STORAGE_KEY, "manga");
    setUiStyle("classic");
    setGenreTheme("fantasy");

    const { container: badgeContainer, unmount: unmountBadge } = render(
      <TestShell>
        <AbilityBadge name="blue_flame" level={5} />
      </TestShell>,
    );
    expect(badgeContainer.querySelector('[data-ability-rank="5"]')).toBeTruthy();
    expect(badgeContainer.textContent).toContain("V");
    unmountBadge();

    const { container: medalContainer } = render(
      <GenreAbilityEmblem
        theme="dark-fantasy"
        label="Omens"
        tier="Mythic"
        icon={Sparkles}
        rank={4}
        customEmblem="omen-eye"
        variant="medallion"
      />,
    );
    expect(medalContainer.querySelector('[data-custom-emblem="omen-eye"]')).toBeTruthy();
    expect(medalContainer.querySelector('[data-ability-rank="4"]')).toBeTruthy();
  });

  it("renders AbilityBadgeRow resolving canonical aliases to assigned 1-5 ranks", () => {
    localStorage.setItem(UI_MODE_STORAGE_KEY, "classic");
    setUiStyle("classic");

    const { container } = render(
      <TestShell>
        <AbilityBadgeRow
          abilities={["twin_blades", "blue_flame"]}
          levels={{ blades: 5, duskmoor_blue_flame: 2 }}
        />
      </TestShell>,
    );

    expect(container.querySelector('[data-ability-rank="5"]')).toBeTruthy();
    expect(container.querySelector('[data-ability-rank="2"]')).toBeTruthy();
  });

  it("renders AlchemicalAbilityOrb and NexusStatWheel with Ability Emblem Rank 1-5 arcs", () => {
    const { container: orbContainer, unmount: unmountOrb } = render(
      <AlchemicalAbilityOrb
        label="Blue Flame"
        tier="Mythic"
        rank={5}
        icon="flame"
        selected
        onClick={() => {}}
      />,
    );
    expect(orbContainer.querySelector('[data-ability-rank="5"]')).toBeTruthy();
    unmountOrb();

    const { container: wheelContainer } = render(
      <TestShell>
        <NexusStatWheel
          stats={[{ key: "power", label: "Power", value: 90 }]}
          abilities={[
            {
              name: "sky_guardian",
              level: 4,
              def: abilityDef("sky_guardian"),
            },
          ]}
          selected="sky_guardian"
          onSelect={() => {}}
        />
      </TestShell>,
    );
    expect(wheelContainer.querySelector('[data-nexus-rank-arc="4"]')).toBeTruthy();
    expect(wheelContainer.querySelector('[data-ability-rank="4"]')).toBeTruthy();
  });
});
