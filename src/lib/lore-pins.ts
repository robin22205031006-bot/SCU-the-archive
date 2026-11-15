export const LORE_PINS_KEY = "scu_lore_explorer_pins_v1";
export const MAX_LORE_PINS = 12;

export type LorePinTab = "characters" | "organizations" | "timeline";

export interface LorePinItem {
  id?: string | undefined;
  name?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  faction?: string | undefined;
  category?: string | undefined;
  tier?: string | undefined;
  character_tier?: string | null | undefined;
  role?: string | undefined;
  status?: string | undefined;
  event_name?: string | undefined;
  bio?: string | undefined;
  lore?: string | undefined;
  combat_style?: string | undefined;
  year?: string | number | undefined;
  era?: string | undefined;
  series?: string | undefined;
}

export interface LorePinEntry {
  key: string;
  tab: LorePinTab;
  item: LorePinItem;
  pinnedAt: string;
}

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("scu:lore-pins-updated"));
  }
}

export function readLorePins(): LorePinEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(LORE_PINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is LorePinEntry =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as LorePinEntry).key === "string" &&
        !!(entry as LorePinEntry).item &&
        typeof (entry as LorePinEntry).item === "object",
    );
  } catch {
    return [];
  }
}

export function writeLorePins(entries: LorePinEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LORE_PINS_KEY, JSON.stringify(entries.slice(0, MAX_LORE_PINS)));
  } catch {
    /* storage quota or private mode */
  }
  notifyListeners();
}

export function toggleLorePinEntry(
  key: string,
  item: LorePinItem,
  tab: LorePinTab,
): { pinned: boolean; entries: LorePinEntry[] } {
  const existing = readLorePins();
  const alreadyPinned = existing.some((entry) => entry.key === key);
  const next = alreadyPinned
    ? existing.filter((entry) => entry.key !== key)
    : [
        {
          key,
          tab,
          item,
          pinnedAt: new Date().toISOString(),
        },
        ...existing,
      ].slice(0, MAX_LORE_PINS);
  writeLorePins(next);
  return { pinned: !alreadyPinned, entries: next };
}

export function removeLorePinEntry(key: string): LorePinEntry[] {
  const next = readLorePins().filter((entry) => entry.key !== key);
  writeLorePins(next);
  return next;
}

export function clearLorePinEntries(): LorePinEntry[] {
  writeLorePins([]);
  return [];
}

export function syncLorePinItem(key: string, updatedItem: LorePinItem): LorePinEntry[] | null {
  const existing = readLorePins();
  const idx = existing.findIndex((entry) => entry.key === key);
  if (idx < 0) return null;
  const current = existing[idx]!;
  const next = existing.map((entry, i) => (i === idx ? { ...current, item: updatedItem } : entry));
  writeLorePins(next);
  return next;
}

export function subscribeLorePins(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LORE_PINS_KEY) listener();
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
