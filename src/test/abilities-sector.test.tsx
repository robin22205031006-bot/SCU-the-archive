import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import {
  ABILITY_REGISTRY,
  abilityDef,
  allAbilityDefs,
  baseAbilityDef,
  getCustomAbilities,
  removeAbilityOverride,
  removeCustomAbility,
  saveAbilityOverride,
  saveCustomAbility,
  setAbilityOverridesCache,
  setCustomAbilitiesCache,
} from "@/lib/abilities";
import { NexusExplorer } from "@/components/nexus-explorer";

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
}

function createTestQueryClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["nexus-symbol-settings"], {});
  return qc;
}

describe("ability registry overrides and sector grouping", () => {
  afterEach(() => {
    setAbilityOverridesCache({});
    setCustomAbilitiesCache([]);
    cleanup();
  });

  it("applies tier overrides to both allAbilityDefs() and abilityDef() while preserving baseAbilityDef()", () => {
    const legendary = ABILITY_REGISTRY.find((a) => a.tier === "Legendary")!;
    expect(legendary).toBeDefined();

    saveAbilityOverride(legendary.key, { tier: "Mythic", description: "Ascended" });

    const fromList = allAbilityDefs().find((a) => a.key === legendary.key);
    const fromLookup = abilityDef(legendary.label);
    const fromBase = baseAbilityDef(legendary.key);

    expect(fromList?.tier).toBe("Mythic");
    expect(fromList?.description).toBe("Ascended");
    expect(fromLookup.tier).toBe("Mythic");
    expect(fromBase.tier).toBe("Legendary");

    removeAbilityOverride(legendary.key);
    expect(allAbilityDefs().find((a) => a.key === legendary.key)?.tier).toBe("Legendary");
  });

  it("applies overrides to ad-hoc/generic abilities and restores icon after JSON serialization of custom abilities", () => {
    saveAbilityOverride("Chrono Rift", { tier: "Mythic", color: "#ff0055" });
    const adHoc = abilityDef("Chrono Rift");
    expect(adHoc.tier).toBe("Mythic");
    expect(adHoc.color).toBe("#ff0055");

    saveCustomAbility({
      key: "void_pulse",
      label: "Void Pulse",
      tier: "Legendary",
      group: "power",
      color: "#a855f7",
      icon: Sparkles,
      description: "Custom",
      custom: true,
    });

    const customs = getCustomAbilities();
    expect(customs).toHaveLength(1);
    expect(typeof customs[0]?.icon === "function" || typeof customs[0]?.icon === "object").toBe(
      true,
    );

    saveAbilityOverride("void_pulse", { tier: "Mythic" });
    expect(allAbilityDefs().find((a) => a.key === "void_pulse")?.tier).toBe("Mythic");

    removeCustomAbility("void_pulse");
    expect(getCustomAbilities()).toHaveLength(0);
  });

  it("moves NexusExplorer active sector when the selected record changes group (e.g. Legendary -> Mythic)", async () => {
    const qc = createTestQueryClient();
    const initialRecords = [
      { id: "ab-1", title: "Solar Flare", group: "Legendary", subtitle: "power" },
      { id: "ab-2", title: "Aether Storm", group: "Mythic", subtitle: "power" },
    ];

    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <NexusExplorer
          label="Abilities"
          records={initialRecords}
          renderDetail={(r) => (
            <div>
              <h2>{r.title}</h2>
              <p>Tier: {r.group}</p>
            </div>
          )}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Legendary, 1/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Solar Flare/i }));

    expect(await screen.findByText("Tier: Legendary")).toBeInTheDocument();

    const updatedRecords = [
      { id: "ab-1", title: "Solar Flare", group: "Mythic", subtitle: "power" },
      { id: "ab-2", title: "Aether Storm", group: "Mythic", subtitle: "power" },
    ];

    rerender(
      <QueryClientProvider client={qc}>
        <NexusExplorer
          label="Abilities"
          records={updatedRecords}
          renderDetail={(r) => (
            <div>
              <h2>{r.title}</h2>
              <p>Tier: {r.group}</p>
            </div>
          )}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Tier: Mythic")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Solar Flare/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aether Storm/i })).toBeInTheDocument();
  });
});
