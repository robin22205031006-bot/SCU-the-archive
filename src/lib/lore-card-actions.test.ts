import test from "node:test";
import assert from "node:assert/strict";
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

test("shouldCancelLongPress enforces Euclidean drift threshold", () => {
  assert.equal(shouldCancelLongPress(100, 100, 105, 105, 8), false); // ~7.07px <= 8px
  assert.equal(shouldCancelLongPress(100, 100, 106, 106, 8), true); // ~8.49px > 8px
  assert.equal(shouldCancelLongPress(50, 200, 50, 209, 8), true);
});

test("isInteractiveLongPressTarget ignores child interactive elements but allows card container", () => {
  const card = { tagName: "ARTICLE", role: null };
  assert.equal(isInteractiveLongPressTarget({ tagName: "SELECT", role: null }, card), true);
  assert.equal(isInteractiveLongPressTarget({ tagName: "BUTTON", role: null }, card), true);
  assert.equal(
    isInteractiveLongPressTarget({ tagName: "SPAN", closest: () => ({ tagName: "BUTTON" }) }, card),
    true,
  );
  assert.equal(isInteractiveLongPressTarget({ tagName: "H3", closest: () => null }, card), false);
});

test("clampContextMenuPosition keeps menu inside viewport edges on narrow mobile & desktop", () => {
  const rightEdge = clampContextMenuPosition(370, 820, 220, 168, 390, 844, 12);
  assert.equal(rightEdge.left, 390 - 220 - 12);
  assert.equal(rightEdge.top, 844 - 168 - 12);

  const topLeftEdge = clampContextMenuPosition(-10, 2, 220, 168, 390, 844, 12);
  assert.equal(topLeftEdge.left, 12);
  assert.equal(topLeftEdge.top, 12);
});

test("buildLoreSharePayload constructs concise summary and deep-link URL", () => {
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
  assert.equal(payload.title, "Ethan Reed");
  assert.equal(payload.url, "https://archive.example/explorer?lore=char-ethan");
  assert.match(payload.text, /Ethan Reed \(Mythic · Vanguard\)/);
  assert.match(payload.clipboardText, /https:\/\/archive\.example\/explorer\?lore=char-ethan/);
});

test("executeLoreShare prefers Web Share, handles abort, and falls back to clipboard", async () => {
  const payload = buildLoreSharePayload(
    { name: "Elizah Vale" },
    "char-elizah",
    "http://localhost:3000/",
  );

  const shared = await executeLoreShare(payload, {
    share: async () => {},
  });
  assert.equal(shared.status, "shared");

  const aborted = await executeLoreShare(payload, {
    share: async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    },
  });
  assert.equal(aborted.status, "cancelled");

  let copiedText = "";
  const copied = await executeLoreShare(payload, {
    share: async () => {
      throw new Error("NotAllowedError");
    },
    writeClipboard: async (txt) => {
      copiedText = txt;
    },
  });
  assert.equal(copied.status, "copied");
  assert.equal(copiedText, payload.clipboardText);
});

test("lore-pins toggles, persists, syncs updates, removes, and caps max quick-access pins", () => {
  installMockStorage();
  clearLorePinEntries();

  const toggledOn = toggleLorePinEntry(
    "char-ethan",
    { id: "char-ethan", name: "Ethan Reed", tier: "Mythic" },
    "characters",
  );
  assert.equal(toggledOn.pinned, true);
  assert.equal(readLorePins().length, 1);

  const synced = syncLorePinItem("char-ethan", {
    id: "char-ethan",
    name: "Ethan Reed",
    tier: "Ancient",
  });
  assert.equal(synced?.[0]?.item.tier, "Ancient");

  // Fill beyond MAX_LORE_PINS to verify cap
  for (let i = 0; i < MAX_LORE_PINS + 3; i++) {
    toggleLorePinEntry(`extra-${i}`, { id: `extra-${i}`, name: `Extra ${i}` }, "characters");
  }
  assert.equal(readLorePins().length, MAX_LORE_PINS);

  const afterRemove = removeLorePinEntry(`extra-${MAX_LORE_PINS + 2}`);
  assert.equal(afterRemove.length, MAX_LORE_PINS - 1);

  clearLorePinEntries();
  assert.equal(readLorePins().length, 0);
});
