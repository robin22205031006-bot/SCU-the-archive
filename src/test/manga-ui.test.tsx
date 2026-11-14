import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider } from "@/hooks/use-ui-mode";
import { AbilityBadge } from "@/components/ability-badge";
import { StatRadar } from "@/components/stat-radar";
import { JourneyLine } from "@/components/journey-line";
import { HankoStamp, MangaCategorySeal, MangaWoodblockCrest } from "@/components/manga-emblem";
import { MangaShell } from "@/components/manga-shell";
import { MangaCharacterSpread, MangaPowerMeter } from "@/components/manga-view";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => {
    const { preload: _preload, ...anchorProps } = rest;
    return (
      <a href={to} {...anchorProps}>
        {children}
      </a>
    );
  },
  useLocation: () => ({ pathname: "/characters" }),
  useNavigate: () => mockNavigate,
}));

const MOCK_ENTITY = {
  id: "char-1",
  name: "Kaelen Voss",
  kind: "character",
  alias: "Crimson Fang",
  role: "Vanguard",
  category: "Dark Fantasy",
  status: "Active",
  character_tier: "S",
  description: "Sworn blade of the Seventh Bastion.",
  image_url: null,
  abilities: ["Pyrokinesis", "Shadow Step"],
  beast_traits: [],
  sketches: [],
  stats: {
    affiliation: "Seventh Bastion",
    power: 92,
    agility: 85,
    tactical_iq: 88,
    clan_mastery: 78,
    weapon_proficiency: 80,
  },
};

function makeChain(table: string) {
  const result = (() => {
    if (table === "app_settings") return { data: null, error: null };
    if (table === "entities") return { data: [MOCK_ENTITY], error: null };
    if (table === "notes" || table === "character_series" || table === "character_abilities") {
      return { data: [], error: null };
    }
    if (table === "series") return { data: [], error: null };
    return { data: [], error: null };
  })();

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => (table === "entities" ? { data: MOCK_ENTITY, error: null } : result),
    single: async () => (table === "entities" ? { data: MOCK_ENTITY, error: null } : result),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => makeChain(table),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
  },
}));

vi.mock("@/hooks/use-admin", () => ({
  useIsAdmin: () => false,
  useIsStaff: () => false,
}));

vi.mock("@/components/compare-sentinel", () => ({
  CompareSentinel: () => null,
}));

vi.mock("@/components/lineage-panel", () => ({
  CharacterRelationships: () => <div data-testid="mock-relationships" />,
  OrgHierarchy: () => <div data-testid="mock-org-hierarchy" />,
}));

vi.mock("@/components/entity-links", () => ({
  EntityLinks: () => <div data-testid="mock-entity-links" />,
}));

vi.mock("@/components/series-appearances", () => ({
  SeriesAppearances: () => <div data-testid="mock-series-appearances" />,
}));

function renderManga(ui: ReactNode, mode: "manga" | "classic" = "manga") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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

describe("Manga UI overhaul components & visual tokens", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["uiSwitching"];
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("applies Manga CSS tokens and sharp framing to <html>", () => {
    renderManga(<div>probe</div>, "manga");

    const root = document.documentElement;
    expect(root.dataset["ui"]).toBe("manga");
    expect(root.dataset["uiMode"]).toBe("manga");
    expect(root.style.getPropertyValue("--ui-card-border-width")).toBe("2px");
    expect(root.style.getPropertyValue("--glass-blur")).toBe("0px");
    expect(root.style.getPropertyValue("--glow-strength")).toBe("0");
    expect(root.style.getPropertyValue("--radius")).toBe("0px");
    expect(root.style.getPropertyValue("--font-display")).toContain("Bangers");
    expect(root.style.getPropertyValue("--font-sans")).toContain("Comic Neue");
  });

  it("renders MangaShell serialized TOC masthead, active chapter marker, and expandable directory", () => {
    renderManga(
      <MangaShell>
        <div>Spread body</div>
      </MangaShell>,
    );

    expect(screen.getByText("WEEKLY SCU // ISSUE INDEX")).toBeInTheDocument();
    expect(screen.getByText("CH. 01 //")).toBeInTheDocument();

    const activeLink = screen.getByRole("link", { name: /CH\. 02 \/\/\s*DOSSIERS/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");

    const tocButton = screen.getByRole("button", { name: /Open full chapter index/i });
    expect(tocButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(tocButton);
    expect(
      screen.getByRole("region", { name: /Complete anthology directory/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("CH. 11")).toBeInTheDocument();
  });

  it("switches AbilityBadge to monochrome stamp badge in Manga mode vs pill in Classic", () => {
    const { unmount } = renderManga(<AbilityBadge name="Pyrokinesis" />, "manga");
    expect(document.querySelector('[data-manga-badge="stamp"]')).toBeInTheDocument();
    unmount();

    renderManga(<AbilityBadge name="Pyrokinesis" />, "classic");
    expect(document.querySelector('[data-manga-badge="stamp"]')).not.toBeInTheDocument();
  });

  it("renders StatRadar Intervention Mandala SVG in Manga mode", () => {
    renderManga(
      <StatRadar
        a={{
          power: 90,
          agility: 80,
          tactical_iq: 85,
          clan_mastery: 70,
          weapon_proficiency: 75,
        }}
        nameA="Kaelen Voss"
      />,
    );

    const mandala = document.querySelector('[data-manga-chart="mandala"]');
    expect(mandala).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Combat Intervention Mandala chart/i }),
    ).toBeInTheDocument();
  });

  it("renders JourneyLine stepped trajectory SVG in Manga mode", () => {
    renderManga(
      <JourneyLine
        title="Arc Trajectory"
        lines={[
          {
            name: "Kaelen Voss",
            rows: [
              {
                id: "cs-1",
                season: 1,
                status: "Main",
                arc_role: "Protagonist",
                series: { id: "s-1", title: "Book I" },
              },
              {
                id: "cs-2",
                season: 2,
                status: "Active",
                arc_role: "Lead",
                series: { id: "s-1", title: "Book I" },
              },
            ],
          },
        ]}
      />,
    );

    expect(document.querySelector('[data-manga-chart="journey-stepped"]')).toBeInTheDocument();
    expect(screen.getByText("Arc Trajectory")).toBeInTheDocument();
  });

  it("renders monochrome HankoStamp, MangaCategorySeal, MangaWoodblockCrest, and 10-cell MangaPowerMeter", () => {
    const { container } = renderManga(
      <div>
        <HankoStamp kanji="正典" label="CANON" />
        <MangaCategorySeal label="Dark Fantasy" />
        <MangaWoodblockCrest code="SCU" />
        <MangaPowerMeter label="Strike" value={84} />
      </div>,
    );

    expect(screen.getByText("正典")).toBeInTheDocument();
    expect(screen.getByText("CANON")).toBeInTheDocument();
    expect(screen.getByText("Dark Fantasy")).toBeInTheDocument();
    expect(screen.getByText("SCU")).toBeInTheDocument();
    expect(screen.getByText("Strike")).toBeInTheDocument();
    expect(screen.getByText("84")).toBeInTheDocument();

    const meterGrid = container.querySelector(".grid-cols-10");
    expect(meterGrid?.children).toHaveLength(10);
  });

  it("renders MangaCharacterSpread profile spread and switches between speech/lore tabs", async () => {
    renderManga(<MangaCharacterSpread id="char-1" />);

    expect(await screen.findByRole("heading", { name: "Kaelen Voss" })).toBeInTheDocument();
    expect(screen.getAllByText("Crimson Fang").length).toBeGreaterThan(0);
    expect(screen.getByText("Seventh Bastion")).toBeInTheDocument();

    const loreTab = screen.getByRole("tab", { name: /02 \/\/ DIALOGUE & LORE/i });
    fireEvent.click(loreTab);
    expect(loreTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Sworn blade of the Seventh Bastion.")).toBeInTheDocument();
  });
});
