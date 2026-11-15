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
});
