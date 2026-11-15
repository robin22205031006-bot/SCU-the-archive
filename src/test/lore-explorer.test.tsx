import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

describe("LoreExplorer long-press context menu (bookmark, share, pin)", () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    cleanup();
    vi.restoreAllMocks();
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

  it("opens on pointer long-press, cancels on pointer move beyond threshold, and toggles Bookmark & Pin across reloads", () => {
    vi.useFakeTimers();
    const { unmount } = render(<LoreExplorer initialItems={sampleItems} />);

    const ethanHeading = screen.getByRole("heading", { name: "Ethan Reed" });
    const cardSurface = ethanHeading.closest('[data-lore-card-surface="true"]') as HTMLElement;
    expect(cardSurface).toBeTruthy();

    // Pointer move > 8px cancels long-press before timer fires
    fireEvent.pointerDown(cardSurface, { pointerType: "touch", clientX: 100, clientY: 100 });
    fireEvent.pointerMove(cardSurface, { pointerType: "touch", clientX: 120, clientY: 100 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Clean long-press >= 450ms opens context menu
    fireEvent.pointerDown(cardSurface, { pointerType: "touch", clientX: 100, clientY: 100 });
    act(() => {
      vi.advanceTimersByTime(460);
    });

    const menu = screen.getByRole("menu", { name: "Quick actions for Ethan Reed" });
    expect(menu).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Bookmark/i })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: /Share/i })).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: /Pin for quick access/i }),
    ).toBeInTheDocument();

    // Pin Ethan Reed via menu
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Pin for quick access/i }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    const quickAccess = screen.getByRole("region", { name: "Pinned quick access" });
    expect(
      within(quickAccess).getByRole("button", { name: "Jump to pinned entry Ethan Reed" }),
    ).toBeInTheDocument();

    // Open again via right-click contextmenu and Bookmark Ethan Reed
    fireEvent.contextMenu(cardSurface, { clientX: 140, clientY: 160 });
    const menuAgain = screen.getByRole("menu", { name: "Quick actions for Ethan Reed" });
    fireEvent.click(within(menuAgain).getByRole("menuitem", { name: /^Bookmark$/i }));

    expect(
      screen.getByRole("button", { name: /view bookmarked collection \(1\)/i }),
    ).toBeInTheDocument();

    // Unmount and remount to confirm Pin persistence
    unmount();
    render(<LoreExplorer initialItems={sampleItems} />);
    const persistedQuickAccess = screen.getByRole("region", { name: "Pinned quick access" });
    expect(
      within(persistedQuickAccess).getByRole("button", { name: "Jump to pinned entry Ethan Reed" }),
    ).toBeInTheDocument();
  });

  it("shares via clipboard fallback and closes on Escape key", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<LoreExplorer initialItems={sampleItems} />);

    // Open menu via accessible More actions button
    fireEvent.click(screen.getByRole("button", { name: "More actions for Elizah Vale" }));
    const menu = screen.getByRole("menu", { name: "Quick actions for Elizah Vale" });

    // Escape closes menu
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Re-open and click Share
    fireEvent.click(screen.getByRole("button", { name: "More actions for Elizah Vale" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Share/i }));

    await vi.waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText.mock.calls[0]?.[0]).toContain("Elizah Vale");
    expect(await screen.findByRole("status")).toHaveTextContent(/Elizah Vale/i);
  });
});

describe("LoreExplorer text-to-speech narration and scroll-reveal cards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    cleanup();
    vi.restoreAllMocks();
  });

  const sampleItems: LoreItem[] = [
    {
      id: "char-ethan",
      name: "Ethan Reed",
      tier: "Mythic",
      category: "Vanguard",
      description: "Commander of the Vanguard division.",
      combat_style: "Kinetic blade arts",
    },
    {
      id: "char-elizah",
      name: "Elizah Vale",
      tier: "Legendary",
      category: "Sentinel",
      description: "Master strategist and archivist.",
    },
  ];

  it("narrates lore content on Listen click, switches between cards, stops on Stop click, and sets scroll-reveal attributes", () => {
    const utterances: Array<{
      text: string;
      onstart: (() => void) | null;
      onend: (() => void) | null;
    }> = [];
    const speak = vi.fn(
      (u: { text: string; onstart: (() => void) | null; onend: (() => void) | null }) => {
        utterances.push(u);
        u.onstart?.();
      },
    );
    const cancel = vi.fn();

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = "";
      rate = 1;
      pitch = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: { error?: string }) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    vi.stubGlobal("speechSynthesis", { speak, cancel });
    vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance);

    render(<LoreExplorer initialItems={sampleItems} />);

    // Cards enable Framer Motion scroll-reveal on the MotionCard <article> root
    const ethanCard = screen
      .getByRole("heading", { name: "Ethan Reed" })
      .closest("article") as HTMLElement;
    expect(ethanCard).toHaveAttribute("data-scroll-reveal", "true");
    expect(ethanCard).toHaveAttribute("data-speaking", "false");

    const listenEthan = screen.getByRole("button", { name: "Listen to Ethan Reed" });
    expect(listenEthan).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(listenEthan);

    expect(speak).toHaveBeenCalledTimes(1);
    expect(utterances[0]?.text).toContain("Ethan Reed");
    expect(utterances[0]?.text).toContain("Commander of the Vanguard division.");
    expect(utterances[0]?.text).toContain("Combat style: Kinetic blade arts.");
    expect(ethanCard).toHaveAttribute("data-speaking", "true");
    expect(screen.getByRole("button", { name: "Stop narrating Ethan Reed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/Narrating Ethan Reed/i);

    // Clicking Listen on a second card cancels the previous utterance and switches narration
    fireEvent.click(screen.getByRole("button", { name: "Listen to Elizah Vale" }));
    expect(speak).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Listen to Ethan Reed" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Stop narrating Elizah Vale" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Clicking Stop cancels narration and resets button state
    fireEvent.click(screen.getByRole("button", { name: "Stop narrating Elizah Vale" }));
    expect(screen.getByRole("button", { name: "Listen to Elizah Vale" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/Stopped narrating Elizah Vale/i);
  });

  it("shows an accessible status message if Web Speech API is unavailable", () => {
    vi.stubGlobal("speechSynthesis", undefined);
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);

    render(<LoreExplorer initialItems={sampleItems} />);
    fireEvent.click(screen.getByRole("button", { name: "Listen to Ethan Reed" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      /Text-to-speech is not supported in this browser/i,
    );
    expect(screen.getByRole("button", { name: "Listen to Ethan Reed" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
