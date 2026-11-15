import { describe, expect, it } from "vitest";
import {
  buildLoreSharePayload,
  clampContextMenuPosition,
  executeLoreShare,
  isInteractiveLongPressTarget,
  shouldCancelLongPress,
} from "./lore-card-actions";
import {
  clearLorePinEntries,
  MAX_LORE_PINS,
  readLorePins,
  removeLorePinEntry,
  syncLorePinItem,
  toggleLorePinEntry,
} from "./lore-pins";

function installMockStorage(): Storage {
  const map = new Map<string, string>();
  const storage = {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    key(i: number) {
      return [...map.keys()][i] ?? null;
    },
    removeItem(k: string) {
      map.delete(k);
    },
    setItem(k: string, v: string) {
      map.set(k, v);
    },
  } satisfies Storage;
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  return storage;
}

describe("lore-card-actions", () => {
  it("shouldCancelLongPress enforces Euclidean drift threshold", () => {
    expect(shouldCancelLongPress(100, 100, 105, 105, 8)).toBe(false); // ~7.07px <= 8px
    expect(shouldCancelLongPress(100, 100, 106, 106, 8)).toBe(true); // ~8.49px > 8px
    expect(shouldCancelLongPress(50, 200, 50, 209, 8)).toBe(true);
  });

  it("isInteractiveLongPressTarget ignores child interactive elements but allows card container", () => {
    const card = { tagName: "ARTICLE", role: null };
    expect(isInteractiveLongPressTarget({ tagName: "SELECT", role: null }, card)).toBe(true);
    expect(isInteractiveLongPressTarget({ tagName: "BUTTON", role: null }, card)).toBe(true);
    expect(
      isInteractiveLongPressTarget({ tagName: "SPAN", closest: () => ({ tagName: "BUTTON" }) }, card),
    ).toBe(true);
    expect(isInteractiveLongPressTarget({ tagName: "H3", closest: () => null }, card)).toBe(false);
  });

  it("clampContextMenuPosition keeps menu inside viewport edges on narrow mobile & desktop", () => {
    const rightEdge = clampContextMenuPosition(370, 820, 220, 168, 390, 844, 12);
    expect(rightEdge.left).toBe(390 - 220 - 12);
    expect(rightEdge.top).toBe(844 - 168 - 12);

    const topLeftEdge = clampContextMenuPosition(-10, 2, 220, 168, 390, 844, 12);
    expect(topLeftEdge.left).toBe(12);
    expect(topLeftEdge.top).toBe(12);
  });

  it("buildLoreSharePayload constructs concise summary and deep-link URL", () => {
    const payload = buildLoreSharePayload(
      {
        id: "char-ethan",
        name: "Ethan Reed",
        tier: "Mythic",
        category: "Vanguard",
        bio: "Commander of the Vanguard division guarding the northern breach.",
      },
      "char-ethan",
      "https://archive.example/explorer",
    );
    expect(payload.title).toBe("Ethan Reed");
    expect(payload.url).toBe("https://archive.example/explorer?lore=char-ethan");
    expect(payload.text).toMatch(/Ethan Reed \(Mythic · Vanguard\)/);
    expect(payload.clipboardText).toMatch(/https:\/\/archive\.example\/explorer\?lore=char-ethan/);
  });

  it("executeLoreShare prefers Web Share, handles abort, and falls back to clipboard", async () => {
    const payload = buildLoreSharePayload(
      { name: "Elizah Vale" },
      "char-elizah",
      "http://localhost:3000/",
    );

    const shared = await executeLoreShare(payload, {
      share: async () => {},
    });
    expect(shared.status).toBe("shared");

    const aborted = await executeLoreShare(payload, {
      share: async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      },
    });
    expect(aborted.status).toBe("cancelled");

    let copiedText = "";
    const copied = await executeLoreShare(payload, {
      share: async () => {
        throw new Error("NotAllowedError");
      },
      writeClipboard: async (txt) => {
        copiedText = txt;
      },
    });
    expect(copied.status).toBe("copied");
    expect(copiedText).toBe(payload.clipboardText);
  });

  it("lore-pins toggles, persists, syncs updates, removes, and caps max quick-access pins", () => {
    installMockStorage();
    clearLorePinEntries();

    const toggledOn = toggleLorePinEntry(
      "char-ethan",
      { id: "char-ethan", name: "Ethan Reed", tier: "Mythic" },
      "characters",
    );
    expect(toggledOn.pinned).toBe(true);
    expect(readLorePins().length).toBe(1);

    const synced = syncLorePinItem("char-ethan", {
      id: "char-ethan",
      name: "Ethan Reed",
      tier: "Ancient",
    });
    expect(synced?.[0]?.item.tier).toBe("Ancient");

    // Fill beyond MAX_LORE_PINS to verify cap
    for (let i = 0; i < MAX_LORE_PINS + 3; i++) {
      toggleLorePinEntry(`extra-${i}`, { id: `extra-${i}`, name: `Extra ${i}` }, "characters");
    }
    expect(readLorePins().length).toBe(MAX_LORE_PINS);

    const afterRemove = removeLorePinEntry(`extra-${MAX_LORE_PINS + 2}`);
    expect(afterRemove.length).toBe(MAX_LORE_PINS - 1);

    clearLorePinEntries();
    expect(readLorePins().length).toBe(0);
  });
});
