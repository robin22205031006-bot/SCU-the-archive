import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SeriesSummaryChart } from "@/components/series-summary-chart";
import { SeriesPage } from "@/components/series-page";
import type { Entity } from "@/lib/entities";
import type { Series } from "@/lib/series";
import { sortSeriesList, summarizeSeriesSagas } from "@/lib/series-summary";
import { routeTree } from "@/routeTree.gen";

const MOCK_SERIES: Series[] = [
  {
    id: "s-redline",
    title: "Redline",
    description: "Underground racing and shadow ops.",
    cover_image_url: null,
    genres: ["Action"],
    season_count: 2,
    season_names: ["Season 1", "Season 2"],
    timeline_note: null,
    updated_at: "2026-11-12T00:00:00.000Z",
  },
  {
    id: "s-bloodline",
    title: "Bloodline",
    description: "Ancient Nine Clans chronicles.",
    cover_image_url: null,
    genres: ["Mythical"],
    season_count: 1,
    season_names: ["Season 1"],
    timeline_note: null,
    updated_at: "2026-11-12T00:00:00.000Z",
  },
  {
    id: "s-sentinels",
    title: "The Sentinels",
    description: "Flagship saga of the SCU.",
    cover_image_url: null,
    genres: ["Superhero"],
    season_count: 5,
    season_names: ["Season 1", "Season 2", "Season 3", "Season 4", "Season 5"],
    timeline_note: null,
    updated_at: "2026-11-12T00:00:00.000Z",
  },
];

const MOCK_SERIES_CHARACTERS = [
  { series_id: "s-sentinels", character_id: "c1" },
  { series_id: "s-sentinels", character_id: "c2" },
  { series_id: "s-sentinels", character_id: "c3" },
  { series_id: "s-redline", character_id: "c1" },
  { series_id: "s-redline", character_id: "c4" },
  { series_id: "s-bloodline", character_id: "c5" },
];

const makeEntity = (partial: Partial<Entity> & Pick<Entity, "id" | "kind" | "name">): Entity =>
  ({
    alias: null,
    role: null,
    status: "Alive",
    category: null,
    description: "",
    image_url: null,
    abilities: [],
    beast_traits: [],
    character_tier: null,
    animation_style: null,
    theme_color: null,
    accent_glow: null,
    card_theme: null,
    stats: {},
    parent_id: null,
    locked_fields: [],
    sketches: null,
    theme_song_url: null,
    created_at: "2026-11-12T00:00:00.000Z",
    updated_at: "2026-11-12T00:00:00.000Z",
    ...partial,
  }) as Entity;

const MOCK_CHARACTERS: Entity[] = [
  makeEntity({ id: "c1", kind: "character", name: "Ethan" }),
  makeEntity({ id: "c2", kind: "character", name: "Zayn Hayes" }),
  makeEntity({ id: "c3", kind: "character", name: "Xinea" }),
  makeEntity({
    id: "c4",
    kind: "character",
    name: "Marcello Corvani",
    stats: {
      dossier: {
        "s-redline:1": { organizations: ["Corvani's Redline Team"] },
      },
    },
  }),
  makeEntity({ id: "c5", kind: "character", name: "Mashiho Kurohana" }),
];

const MOCK_GROUPS: Entity[] = [
  makeEntity({ id: "g1", kind: "organization", name: "E.C.A.P." }),
  makeEntity({ id: "g2", kind: "organization", name: "Corvani's Redline Team" }),
  makeEntity({
    id: "g3",
    kind: "clan",
    name: "Kurohana",
    stats: { dossier: { "s-bloodline:1": { roster: true } } },
  }),
  makeEntity({ id: "g4", kind: "faction", name: "D.E.W." }),
];

const MOCK_MEMBERSHIPS = [
  { character_id: "c1", group_id: "g1" }, // Ethan -> E.C.A.P. (in Sentinels & Redline)
  { character_id: "c2", group_id: "g4" }, // Zayn -> D.E.W. (Sentinels)
];

vi.mock("@/integrations/supabase/client", () => {
  const tableData = (table: string) => {
    if (table === "series") return MOCK_SERIES;
    if (table === "series_characters") return MOCK_SERIES_CHARACTERS;
    if (table === "entity_memberships") return MOCK_MEMBERSHIPS;
    return [];
  };

  const makeChain = (table: string) => {
    let kindFilter: string[] | null = null;
    const resolveData = () => {
      if (table === "entities") {
        const all = [...MOCK_CHARACTERS, ...MOCK_GROUPS];
        return kindFilter ? all.filter((e) => kindFilter!.includes(e.kind)) : all;
      }
      return tableData(table);
    };
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: (col: string, vals: string[]) => {
        if (col === "kind") kindFilter = vals;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (
        onFulfilled: (v: { data: unknown[]; error: null }) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => Promise.resolve({ data: resolveData(), error: null }).then(onFulfilled, onRejected),
    };
    return chain;
  };

  return {
    hasSupabaseConfig: () => false,
    getSupabaseConfig: () => ({
      url: "https://csdmkmtfhgxkjmucepjo.supabase.co",
      key: "sb_publishable_test",
      projectId: "csdmkmtfhgxkjmucepjo",
    }),
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      rpc: async () => ({ data: false, error: null }),
      from: (table: string) => makeChain(table),
      storage: {
        from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: p } }) }),
      },
    },
  };
});

let rectSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeAll(() => {
  rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        width: 640,
        height: 224,
        top: 0,
        left: 0,
        right: 640,
        bottom: 224,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect,
  );
});

afterAll(() => {
  rectSpy?.mockRestore();
});

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("series-summary helpers", () => {
  it("sorts series by title A-Z and by character count descending/ascending", () => {
    const counts = new Map<string, number>([
      ["s-sentinels", 3],
      ["s-redline", 2],
      ["s-bloodline", 1],
    ]);

    expect(sortSeriesList(MOCK_SERIES, counts, "title-asc").map((s) => s.title)).toEqual([
      "Bloodline",
      "Redline",
      "The Sentinels",
    ]);

    expect(sortSeriesList(MOCK_SERIES, counts, "chars-desc").map((s) => s.title)).toEqual([
      "The Sentinels",
      "Redline",
      "Bloodline",
    ]);

    expect(sortSeriesList(MOCK_SERIES, counts, "chars-asc").map((s) => s.title)).toEqual([
      "Bloodline",
      "Redline",
      "The Sentinels",
    ]);
  });

  it("summarizes characters and organizations across all series sagas without double counting", () => {
    const summary = summarizeSeriesSagas({
      series: MOCK_SERIES,
      seriesCharacterRows: MOCK_SERIES_CHARACTERS,
      characters: MOCK_CHARACTERS,
      groups: MOCK_GROUPS,
      memberships: MOCK_MEMBERSHIPS,
    });

    const sentinels = summary.sagas.find((s) => s.seriesId === "s-sentinels");
    const redline = summary.sagas.find((s) => s.seriesId === "s-redline");
    const bloodline = summary.sagas.find((s) => s.seriesId === "s-bloodline");

    expect(sentinels).toMatchObject({ characters: 3, organizations: 2 }); // E.C.A.P. + D.E.W.
    expect(redline).toMatchObject({ characters: 2, organizations: 2 }); // E.C.A.P. + Corvani's Redline Team
    expect(bloodline).toMatchObject({ characters: 1, organizations: 1 }); // Kurohana
    expect(summary.totalSagas).toBe(3);
    expect(summary.totalCharacters).toBe(5); // c1..c5 unique across sagas
    expect(summary.totalOrganizations).toBe(4); // g1..g4 unique across sagas
  });
});

describe("SeriesSummaryChart & SeriesPage sort/chart UI", () => {
  it("renders a Recharts BarChart with totals for characters and organizations", () => {
    const summary = summarizeSeriesSagas({
      series: MOCK_SERIES,
      seriesCharacterRows: MOCK_SERIES_CHARACTERS,
      characters: MOCK_CHARACTERS,
      groups: MOCK_GROUPS,
      memberships: MOCK_MEMBERSHIPS,
    });

    render(<SeriesSummaryChart summary={summary} isManga={false} />);

    const chart = screen.getByTestId("series-summary-chart");
    expect(chart.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(chart.querySelector("svg.recharts-surface")).toBeTruthy();
    expect(chart.querySelectorAll(".recharts-bar").length).toBe(2);
    expect(screen.getByTestId("total-sagas-count")).toHaveTextContent("3");
    expect(screen.getByTestId("total-characters-count")).toHaveTextContent("5");
    expect(screen.getByTestId("total-organizations-count")).toHaveTextContent("4");
    const legendLabels = Array.from(chart.querySelectorAll(".recharts-legend-item-text")).map(
      (el) => el.textContent,
    );
    expect(legendLabels).toEqual(["Characters", "Organizations"]);
  });

  it("renders sort dropdown and summary chart on SeriesPage and reorders series cards", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/series"] }),
      context: { queryClient },
    });
    await act(async () => {
      await router.load();
    });

    const view = render(<RouterProvider router={router} />);

    await waitFor(
      () => {
        expect(screen.getByTestId("total-characters-count")).toHaveTextContent("5");
        expect(screen.getByTestId("total-organizations-count")).toHaveTextContent("4");
      },
      { timeout: 4000 },
    );

    const chart = screen.getByTestId("series-summary-chart");
    expect(chart.querySelector("svg.recharts-surface")).toBeTruthy();

    // Sort dropdown exists inside search toolbar
    const sortSelect = screen.getByLabelText("Sort series") as HTMLSelectElement;
    expect(sortSelect.value).toBe("title-asc");

    const getCardTitles = () =>
      Array.from(view.container.querySelectorAll(".scu-card-grid button")).map((btn) =>
        btn.textContent?.trim(),
      );

    // Default Title (A-Z): Bloodline -> Redline -> The Sentinels
    const initialCards = getCardTitles();
    expect(initialCards[0]).toContain("Bloodline");
    expect(initialCards[1]).toContain("Redline");
    expect(initialCards[2]).toContain("The Sentinels");

    // Sort by character count descending: The Sentinels (3) -> Redline (2) -> Bloodline (1)
    fireEvent.change(sortSelect, { target: { value: "chars-desc" } });
    expect(sortSelect.value).toBe("chars-desc");
    const descCards = getCardTitles();
    expect(descCards[0]).toContain("The Sentinels");
    expect(descCards[1]).toContain("Redline");
    expect(descCards[2]).toContain("Bloodline");

    // Sort by character count ascending: Bloodline (1) -> Redline (2) -> The Sentinels (3)
    fireEvent.change(sortSelect, { target: { value: "chars-asc" } });
    expect(sortSelect.value).toBe("chars-asc");
    const ascCards = getCardTitles();
    expect(ascCards[0]).toContain("Bloodline");
    expect(ascCards[1]).toContain("Redline");
    expect(ascCards[2]).toContain("The Sentinels");

    // Verify search filter works alongside sort and remounts grid to replay staggered entrance
    const initialGridEl = screen.getByTestId("series-card-grid");
    expect(initialGridEl).toHaveAttribute("data-motion-state", "active");
    const initialCardNodes = screen.getAllByTestId("series-card");
    expect(initialCardNodes.map((n) => n.getAttribute("data-stagger-index"))).toEqual([
      "0",
      "1",
      "2",
    ]);
    for (const node of initialCardNodes) {
      expect(node).toHaveAttribute("data-motion-state", "active");
    }

    const searchInput = screen.getByLabelText("Search series");
    fireEvent.change(searchInput, { target: { value: "Red" } });
    const filteredGridEl = screen.getByTestId("series-card-grid");
    expect(filteredGridEl).not.toBe(initialGridEl);
    const filteredCards = getCardTitles();
    expect(filteredCards).toHaveLength(1);
    expect(filteredCards[0]).toContain("Redline");

    // Verify SeriesPage is actually exported cleanly
    expect(SeriesPage).toBeDefined();
  });

  it("renders SeriesCard grid statically when minimal mode disables motion", async () => {
    localStorage.setItem("scu-ui-mode", "minimal");
    localStorage.setItem("scu-primary-system", "minimal");

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/series"] }),
      context: { queryClient },
    });
    await act(async () => {
      await router.load();
    });

    render(<RouterProvider router={router} />);

    await waitFor(
      () => {
        expect(screen.getByTestId("series-card-grid")).toHaveAttribute(
          "data-motion-state",
          "minimal-off",
        );
      },
      { timeout: 4000 },
    );

    const cards = screen.getAllByTestId("series-card");
    expect(cards.length).toBe(3);
    for (const card of cards) {
      expect(card).toHaveAttribute("data-motion-state", "minimal-off");
    }
  });
});
