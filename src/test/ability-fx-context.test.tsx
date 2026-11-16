import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sparkles } from "lucide-react";
import {
  saveCustomAbility,
  setAbilityOverridesCache,
  setCustomAbilitiesCache,
} from "@/lib/abilities";
import { entitiesQuery, withEntitySummaryDefaults } from "@/lib/entities";
import { AbilityFxPanel } from "@/components/ability-fx-panel";
import { AbilityFxShowcase } from "@/components/ability-fx-showcase";
import { AbilityActionPanel } from "@/components/ability-action-panel";
import { AbilityFxCanvas } from "@/components/ability-fx-canvas";
import {
  ABILITY_PERFORMANCE_STORAGE_KEY,
  AbilityProvider,
  resolvePerformanceFxCaps,
  useAbilityContext,
} from "@/context/AbilityContext";

vi.mock("@/integrations/supabase/client", () => {
  const emptyChain = () => {
    const res = { data: [], error: null };
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (onFulfilled: (v: typeof res) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(res).then(onFulfilled, onRejected),
    };
    return chain;
  };
  return {
    hasSupabaseConfig: () => false,
    supabase: {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      rpc: async () => ({ data: false, error: null }),
      from: () => emptyChain(),
    },
  };
});

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      children,
      to,
      className,
      onClick,
    }: {
      children: ReactNode;
      to?: string;
      className?: string;
      onClick?: () => void;
    }) => (
      <a href={typeof to === "string" ? to : "#"} className={className} onClick={onClick}>
        {children}
      </a>
    ),
  };
});

const ENTITIES_QK = entitiesQuery([
  "character",
  "organization",
  "clan",
  "bloodline",
  "faction",
]).queryKey;

function createQc(spoilerAbilities = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["nexus-symbol-settings"], {});
  qc.setQueryData(["app-settings", "spoiler_mask"], { abilities: spoilerAbilities });
  qc.setQueryData(ENTITIES_QK, [
    withEntitySummaryDefaults({
      id: "ent-khalid",
      kind: "character",
      name: "Khalid",
      category: "Sentinel",
      description: "Bearer of Athena's Judgement",
      abilities: ["Athena's Judgement"],
      stats: {},
    }),
    withEntitySummaryDefaults({
      id: "ent-vanguard",
      kind: "organization",
      name: "Vanguard-X",
      category: "Faction",
      description: "Bio-cybernetic black-ops wing",
      abilities: ["Vanguard-X Protocol"],
      stats: {},
    }),
  ]);
  return qc;
}

function renderWithQuery(ui: ReactNode, spoilerAbilities = false) {
  const qc = createQc(spoilerAbilities);
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Ability FX & Action hub context integration", () => {
  beforeEach(() => {
    localStorage.clear();
    setCustomAbilitiesCache([]);
    setAbilityOverridesCache({});
    document.documentElement.removeAttribute("data-spoil-abilities");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    setCustomAbilitiesCache([]);
    setAbilityOverridesCache({});
    document.documentElement.removeAttribute("data-spoil-abilities");
    vi.restoreAllMocks();
    cleanup();
  });

  it("renders newly added hub abilities, custom abilities, and group filters in AbilityFxPanel", () => {
    saveCustomAbility({
      key: "quantum_mirage",
      label: "Quantum Mirage",
      tier: "Mythic",
      group: "power",
      color: "#22d3ee",
      icon: Sparkles,
      description: "Custom phase-shifted illusion field from the Abilities Hub.",
      custom: true,
    });

    renderWithQuery(<AbilityFxPanel />);

    expect(screen.getByText("Athena's Judgement")).toBeInTheDocument();
    expect(screen.getByText("Hydrokinesis")).toBeInTheDocument();
    expect(screen.getByText("Vanguard-X Protocol")).toBeInTheDocument();
    expect(screen.getByText("Quantum Mirage")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by category"), { target: { value: "role" } });
    expect(screen.getByText("Vanguard-X Protocol")).toBeInTheDocument();
    expect(screen.queryByText("Hydrokinesis")).not.toBeInTheDocument();
  });

  it("displays full ability lore description, combat role, rank pips, and spoiler-guarded wielders in AbilityFxShowcase", () => {
    renderWithQuery(
      <AbilityFxShowcase
        name="athenas_judgement"
        open
        onOpenChange={() => {}}
        onSimulate={() => {}}
      />,
    );

    expect(screen.getByRole("heading", { name: /Athena's Judgement/i })).toBeInTheDocument();
    expect(document.querySelector('[data-ability-rank="5"]')).not.toBeNull();
    expect(
      screen.getByText(/Sunburst gold judgement art — apex-tier destructive authority/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Wielders \(/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Khalid" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open in Combat simulator/i })).toBeInTheDocument();
    expect(screen.getByText(/Test in Ability in Action/i)).toBeInTheDocument();

    cleanup();
    renderWithQuery(
      <AbilityFxShowcase name="athenas_judgement" open onOpenChange={() => {}} />,
      true,
    );
    expect(screen.getByText(/hidden \(spoiler mask active\)/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Khalid" })).not.toBeInTheDocument();
  });

  it("shows lore context, rank pips, and hub abilities inside AbilityActionPanel", () => {
    renderWithQuery(<AbilityActionPanel initialAbility="athenas_judgement" />);

    const select = screen.getByLabelText("Ability") as HTMLSelectElement;
    expect(select.value).toBe("athenas_judgement");
    expect(Array.from(select.options).some((opt) => opt.value === "vanguard_x_protocol")).toBe(
      true,
    );
    expect(
      screen.getByText(/Sunburst gold judgement art — apex-tier destructive authority/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Wielders \(/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Khalid" })).toBeInTheDocument();
  });

  it("manages shared ability holders, per-season rank progression, and high-tier AbilityImpact in AbilityProvider", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["nexus-symbol-settings"], {});
    qc.setQueryData(["app-settings", "spoiler_mask"], { abilities: false });
    qc.setQueryData(
      ["series"],
      [
        {
          id: "ser-sentinels",
          title: "The Sentinels",
          description: "",
          cover_image_url: null,
          genres: [],
          season_count: 5,
          season_names: ["Season 1", "Season 2", "Season 3", "Season 4", "Season 5"],
          timeline_note: null,
          updated_at: "2026-11-12T00:00:00.000Z",
        },
      ],
    );
    qc.setQueryData(ENTITIES_QK, [
      withEntitySummaryDefaults({
        id: "ent-dorian",
        kind: "character",
        name: "Dorian Cross",
        category: "Sentinel",
        abilities: ["Red Lightning"],
        stats: {},
      }),
      withEntitySummaryDefaults({
        id: "ent-zayn",
        kind: "character",
        name: "Zayn Hayes",
        category: "Sentinel",
        abilities: ["Red Lightning"],
        stats: {},
      }),
    ]);
    qc.setQueryData(
      ["character-abilities"],
      [
        {
          id: "ca-dorian",
          entity_id: "ent-dorian",
          ability_key: "red_lightning",
          series_id: null,
          season_number: null,
          level: 5,
          note: null,
        },
        {
          id: "ca-zayn-s3",
          entity_id: "ent-zayn",
          ability_key: "red_lightning",
          series_id: "ser-sentinels",
          season_number: 3,
          level: 2,
          note: null,
        },
        {
          id: "ca-zayn-s5",
          entity_id: "ent-zayn",
          ability_key: "red_lightning",
          series_id: "ser-sentinels",
          season_number: 5,
          level: 5,
          note: null,
        },
      ],
    );

    render(
      <QueryClientProvider client={qc}>
        <AbilityActionPanel initialAbility="red_lightning" />
      </QueryClientProvider>,
    );

    const dorianBtn = screen.getByRole("button", { name: /Dorian Cross/i });
    const zaynBtn = screen.getByRole("button", { name: /Zayn Hayes/i });
    expect(dorianBtn).toBeInTheDocument();
    expect(zaynBtn).toBeInTheDocument();

    // Selecting Zayn loads his season evolution & updates stage/rank
    fireEvent.click(zaynBtn);
    // Manual AbilityImpact button triggers active impact overlay & badge state
    const impactBtn = screen.getByRole("button", { name: /AbilityImpact/i });
    fireEvent.click(impactBtn);
    expect(document.querySelector('[data-ability-impact="active"]')).not.toBeNull();
  });

  it("tracks activeCharacterAbilities and drives AbilityFxCanvas reactively from AbilityContext", () => {
    const qc = createQc(false);
    qc.setQueryData(ENTITIES_QK, [
      withEntitySummaryDefaults({
        id: "ent-zayn",
        kind: "character",
        name: "Zayn Hayes",
        category: "Sentinel",
        abilities: ["Red Lightning", "Blue Flame"],
        stats: {},
      }),
    ]);
    qc.setQueryData(
      ["character-abilities"],
      [
        {
          id: "ca-1",
          entity_id: "ent-zayn",
          ability_key: "red_lightning",
          series_id: null,
          season_number: null,
          level: 2,
          note: null,
        },
        {
          id: "ca-2",
          entity_id: "ent-zayn",
          ability_key: "blue_flame",
          series_id: null,
          season_number: null,
          level: 4,
          note: null,
        },
      ],
    );

    function Harness() {
      const ctx = useAbilityContext();
      return (
        <div>
          <span data-testid="active-count">{ctx.activeCharacterAbilities.length}</span>
          <button type="button" onClick={() => ctx.selectWielder("ent-zayn")}>
            Load Zayn
          </button>
          <button type="button" onClick={() => ctx.setCharacterAbilityRank("red_lightning", 5)}>
            Upgrade Red Lightning
          </button>
          <button type="button" onClick={() => ctx.selectAbility("blue_flame")}>
            Switch Blue Flame
          </button>
          <AbilityFxCanvas />
        </div>
      );
    }

    const { container } = render(
      <QueryClientProvider client={qc}>
        <AbilityProvider initialAbility="red_lightning">
          <Harness />
        </AbilityProvider>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Load Zayn" }));
    expect(screen.getByTestId("active-count").textContent).toBe("2");

    const canvas = container.querySelector("canvas");
    expect(canvas?.getAttribute("data-ability-character")).toBe("ent-zayn");
    expect(canvas?.getAttribute("data-ability-rank")).toBe("2");

    fireEvent.click(screen.getByRole("button", { name: "Upgrade Red Lightning" }));
    expect(canvas?.getAttribute("data-ability-rank")).toBe("5");

    fireEvent.click(screen.getByRole("button", { name: "Switch Blue Flame" }));
    expect(canvas?.getAttribute("data-ability-key")).toBe("duskmoor_blue_flame");
    expect(canvas?.getAttribute("data-ability-rank")).toBe("4");
  });

  it("caps high-rank AbilityFX complexity via resolvePerformanceFxCaps while preserving core rank progression", () => {
    expect(resolvePerformanceFxCaps(2, true)).toEqual({
      visualRank: 2,
      complexityRank: 2,
      maxDpr: 1,
      maxFps: 24,
      maxPower: 5,
    });
    expect(resolvePerformanceFxCaps(5, false)).toEqual({
      visualRank: 5,
      complexityRank: 5,
      maxDpr: 2,
      maxFps: 60,
      maxPower: 8,
    });
    expect(resolvePerformanceFxCaps(5, true)).toEqual({
      visualRank: 5,
      complexityRank: 3,
      maxDpr: 1,
      maxFps: 24,
      maxPower: 5,
    });
  });

  it("persists performanceMode in AbilityContext and caps canvas complexity rank without altering progression rank", () => {
    const qc = createQc(false);

    function PerfHarness() {
      const ctx = useAbilityContext();
      return (
        <div>
          <span data-testid="perf-flag">{ctx.performanceMode ? "on" : "off"}</span>
          <button type="button" onClick={() => ctx.setPerformanceMode((p) => !p)}>
            Toggle Perf
          </button>
          <AbilityFxCanvas />
        </div>
      );
    }

    const { container } = render(
      <QueryClientProvider client={qc}>
        <AbilityProvider initialAbility="athenas_judgement">
          <PerfHarness />
        </AbilityProvider>
      </QueryClientProvider>,
    );

    const canvas = container.querySelector("canvas");
    expect(screen.getByTestId("perf-flag").textContent).toBe("off");
    expect(canvas?.getAttribute("data-ability-rank")).toBe("5");
    expect(canvas?.getAttribute("data-fx-complexity-rank")).toBe("5");
    expect(canvas?.getAttribute("data-performance-mode")).toBe("off");

    fireEvent.click(screen.getByRole("button", { name: "Toggle Perf" }));

    expect(screen.getByTestId("perf-flag").textContent).toBe("on");
    expect(canvas?.getAttribute("data-ability-rank")).toBe("5");
    expect(canvas?.getAttribute("data-fx-complexity-rank")).toBe("3");
    expect(canvas?.getAttribute("data-performance-mode")).toBe("on");
    expect(localStorage.getItem(ABILITY_PERFORMANCE_STORAGE_KEY)).toBe("1");
  });

  it("exposes working Perf Mode toggle in AbilityActionPanel and AbilityFxShowcase", () => {
    const { container } = renderWithQuery(
      <AbilityActionPanel initialAbility="athenas_judgement" />,
    );

    const canvas = container.querySelector("canvas");
    expect(canvas?.getAttribute("data-ability-rank")).toBe("5");
    expect(canvas?.getAttribute("data-fx-complexity-rank")).toBe("5");
    expect(canvas?.getAttribute("data-performance-mode")).toBe("off");

    const perfBtn = screen.getByRole("button", { name: /Perf Mode/i });
    fireEvent.click(perfBtn);

    expect(perfBtn).toHaveAttribute("aria-pressed", "true");
    expect(canvas?.getAttribute("data-ability-rank")).toBe("5");
    expect(canvas?.getAttribute("data-fx-complexity-rank")).toBe("3");
    expect(canvas?.getAttribute("data-performance-mode")).toBe("on");
  });
});
