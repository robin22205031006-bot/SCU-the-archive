import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { LoreExplorer, type LoreItem } from "@/components/LoreExplorer";

describe("LoreExplorer reactive section relocation", () => {
  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("relocates an item to the updated tier section immediately when its tier property changes", () => {
    const sampleItems: LoreItem[] = [
      {
        id: "ability-solar-flare",
        name: "Solar Flare",
        tier: "Legendary",
        category: "Sentinel",
        description: "Focused thermal discharge.",
      },
      {
        id: "ability-void-edge",
        name: "Void Edge",
        tier: "Mythic",
        category: "Antagonist",
        description: "Rift-cutting blade aura.",
      },
    ];

    const onItemUpdate = vi.fn();

    render(<LoreExplorer initialItems={sampleItems} onItemUpdate={onItemUpdate} />);

    // Initially, Solar Flare is inside the Legendary section and NOT inside Mythic
    const initialLegendary = screen.getByRole("region", { name: "Legendary section" });
    const initialMythic = screen.getByRole("region", { name: "Mythic section" });

    expect(within(initialLegendary).getByText("Solar Flare")).toBeInTheDocument();
    expect(within(initialMythic).queryByText("Solar Flare")).not.toBeInTheDocument();

    // Update Solar Flare's tier from Legendary -> Mythic
    const tierSelect = screen.getByLabelText("Tier for Solar Flare");
    fireEvent.change(tierSelect, { target: { value: "Mythic" } });

    expect(onItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ability-solar-flare", tier: "Mythic" }),
      { tier: "Mythic" },
    );

    // Legendary section becomes empty and disappears, while Mythic now contains both items
    expect(screen.queryByRole("region", { name: "Legendary section" })).not.toBeInTheDocument();
    const updatedMythic = screen.getByRole("region", { name: "Mythic section" });
    expect(within(updatedMythic).getByText("Solar Flare")).toBeInTheDocument();
    expect(within(updatedMythic).getByText("Void Edge")).toBeInTheDocument();
  });

  it("follows the relocated item when viewing a single filtered tier section and relocates by category", () => {
    const sampleItems: LoreItem[] = [
      {
        id: "char-1",
        name: "Aiden Vance",
        tier: "Legendary",
        category: "Sentinel",
        description: "Guardian of the northern line.",
      },
      {
        id: "char-2",
        name: "Kael Varn",
        tier: "Rare",
        category: "Vanguard",
        description: "Tactical commander.",
      },
    ];

    render(<LoreExplorer initialItems={sampleItems} />);

    // Filter down to Legendary tab only
    fireEvent.click(screen.getByRole("tab", { name: /Legendary \(1\)/i }));
    expect(screen.getByRole("region", { name: "Legendary section" })).toBeInTheDocument();

    // Promote Aiden Vance from Legendary -> Mythic while filtered
    fireEvent.change(screen.getByLabelText("Tier for Aiden Vance"), {
      target: { value: "Mythic" },
    });

    // Active section automatically switches to Mythic so the item stays visible in its new sector
    const mythicSection = screen.getByRole("region", { name: "Mythic section" });
    expect(within(mythicSection).getByText("Aiden Vance")).toBeInTheDocument();

    // Switch grouping mode to category and change category Sentinel -> Vanguard
    fireEvent.click(screen.getByRole("button", { name: "category" }));
    fireEvent.change(screen.getByLabelText("Category for Aiden Vance"), {
      target: { value: "Vanguard" },
    });

    const vanguardSection = screen.getByRole("region", { name: "Vanguard section" });
    expect(within(vanguardSection).getByText("Aiden Vance")).toBeInTheDocument();
    expect(within(vanguardSection).getByText("Kael Varn")).toBeInTheDocument();
  });
});
