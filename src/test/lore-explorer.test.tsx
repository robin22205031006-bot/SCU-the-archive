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

describe("LoreExplorer bookmarking and personalized collection", () => {
  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  const sampleItems: LoreItem[] = [
    {
      id: "char-ethan",
      name: "Ethan Reed",
      tier: "Mythic",
      category: "Vanguard",
      description: "Commander of the Vanguard division.",
    },
    {
      id: "char-elizah",
      name: "Elizah Vale",
      tier: "Legendary",
      category: "Sentinel",
      description: "Master strategist and archivist.",
    },
  ];

  it("saves and removes bookmarks, persists across reloads, and filters the personalized collection", () => {
    const { unmount } = render(<LoreExplorer initialItems={sampleItems} />);

    const collectionToggle = screen.getByRole("button", {
      name: /view bookmarked collection \(0\)/i,
    });
    expect(collectionToggle).toHaveAttribute("aria-pressed", "false");

    const bookmarkEthan = screen.getByRole("button", { name: "Bookmark Ethan Reed" });
    fireEvent.click(bookmarkEthan);

    expect(screen.getByRole("button", { name: "Remove bookmark for Ethan Reed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: /view bookmarked collection \(1\)/i }),
    ).toBeInTheDocument();

    // Unmount and remount to verify localStorage persistence
    unmount();
    render(<LoreExplorer initialItems={sampleItems} />);

    const persistedToggle = screen.getByRole("button", {
      name: /view bookmarked collection \(1\)/i,
    });
    fireEvent.click(persistedToggle);
    expect(persistedToggle).toHaveAttribute("aria-pressed", "true");

    expect(
      screen.getByRole("region", { name: "Personalized bookmark collection" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ethan Reed")).toBeInTheDocument();
    expect(screen.queryByText("Elizah Vale")).not.toBeInTheDocument();

    // Updating a bookmarked item's tier keeps it synced inside the collection
    fireEvent.change(screen.getByLabelText("Tier for Ethan Reed"), {
      target: { value: "Ancient" },
    });
    expect(
      within(screen.getByRole("region", { name: "Ancient section" })).getByText("Ethan Reed"),
    ).toBeInTheDocument();

    // Removing the bookmark removes it from the collection view
    fireEvent.click(screen.getByRole("button", { name: "Remove bookmark for Ethan Reed" }));
    expect(screen.queryByText("Ethan Reed")).not.toBeInTheDocument();
    expect(screen.getByText(/Your personalized collection is empty/i)).toBeInTheDocument();
  });

  it("clears all saved bookmarks when Clear all is clicked", () => {
    render(<LoreExplorer initialItems={sampleItems} />);

    fireEvent.click(screen.getByRole("button", { name: "Bookmark Ethan Reed" }));
    fireEvent.click(screen.getByRole("button", { name: "Bookmark Elizah Vale" }));
    fireEvent.click(screen.getByRole("button", { name: /view bookmarked collection \(2\)/i }));

    fireEvent.click(screen.getByRole("button", { name: "Clear all bookmarks" }));
    expect(
      screen.getByRole("button", { name: /view bookmarked collection \(0\)/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Your personalized collection is empty/i)).toBeInTheDocument();
  });
});
