import type { LoreItem, LoreTab } from "@/components/LoreExplorer";

export const LORE_BOOKMARKS_KEY = "scu_lore_explorer_bookmarks_v1";

export interface LoreBookmarkEntry {
  key: string;
  tab: LoreTab;
  item: LoreItem;
  savedAt: string;
}

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scu:lore-bookmarks-updated"));
  }
}

export function readLoreBookmarks(): LoreBookmarkEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LORE_BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is LoreBookmarkEntry =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as LoreBookmarkEntry).key === "string" &&
        !!(entry as LoreBookmarkEntry).item &&
        typeof (entry as LoreBookmarkEntry).item === "object",
    );
  } catch {
    return [];
  }
}

export function writeLoreBookmarks(entries: LoreBookmarkEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LORE_BOOKMARKS_KEY, JSON.stringify(entries));
  } catch {
    /* storage quota or private mode */
  }
  notifyListeners();
}

export function toggleLoreBookmarkEntry(
  key: string,
  item: LoreItem,
  tab: LoreTab,
): { bookmarked: boolean; entries: LoreBookmarkEntry[] } {
  const existing = readLoreBookmarks();
  const alreadySaved = existing.some((entry) => entry.key === key);
  const next = alreadySaved
    ? existing.filter((entry) => entry.key !== key)
    : [
        {
          key,
          tab,
          item,
          savedAt: new Date().toISOString(),
        },
        ...existing,
      ];
  writeLoreBookmarks(next);
  return { bookmarked: !alreadySaved, entries: next };
}

export function removeLoreBookmarkEntry(key: string): LoreBookmarkEntry[] {
  const next = readLoreBookmarks().filter((entry) => entry.key !== key);
  writeLoreBookmarks(next);
  return next;
}

export function clearLoreBookmarkEntries(): LoreBookmarkEntry[] {
  writeLoreBookmarks([]);
  return [];
}

export function syncLoreBookmarkItem(
  key: string,
  updatedItem: LoreItem,
): LoreBookmarkEntry[] | null {
  const existing = readLoreBookmarks();
  const idx = existing.findIndex((entry) => entry.key === key);
  if (idx < 0) return null;
  const current = existing[idx]!;
  const next = existing.map((entry, i) => (i === idx ? { ...current, item: updatedItem } : entry));
  writeLoreBookmarks(next);
  return next;
}

export function subscribeLoreBookmarks(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LORE_BOOKMARKS_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
