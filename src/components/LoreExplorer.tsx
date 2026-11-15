import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, MoreVertical, Pin, Share2, Square, Trash2, Volume2, X } from "lucide-react";
import { scuCache } from "../services/scuCache";
import { StatusTooltip } from "@/components/status-tooltip";
import { MotionCard, MotionPage, MotionPresence, MotionSection } from "@/components/app-motion";
import { LoreCardContextMenu } from "@/components/lore-card-context-menu";
import { useLongPress } from "@/hooks/use-long-press";
import { useLoreTts } from "@/hooks/use-lore-tts";
import { buildLoreSharePayload, executeLoreShare } from "@/lib/lore-card-actions";
import {
  clearLoreBookmarkEntries,
  readLoreBookmarks,
  subscribeLoreBookmarks,
  syncLoreBookmarkItem,
  toggleLoreBookmarkEntry,
  type LoreBookmarkEntry,
} from "@/lib/lore-bookmarks";
import {
  clearLorePinEntries,
  readLorePins,
  removeLorePinEntry,
  subscribeLorePins,
  syncLorePinItem,
  toggleLorePinEntry,
  type LorePinEntry,
} from "@/lib/lore-pins";

export interface LoreItem {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  faction?: string;
  category?: string;
  tier?: string;
  character_tier?: string | null;
  role?: string;
  status?: string;
  event_name?: string;
  bio?: string;
  lore?: string;
  combat_style?: string;
  year?: string | number;
  era?: string;
  series?: string;
}

export type LoreTab = "characters" | "organizations" | "timeline";
export type LoreGroupBy = "tier" | "category";

export const LORE_TIER_OPTIONS = [
  "Mythic",
  "Legendary",
  "Exceptional",
  "Rare",
  "Unique",
  "Ancient",
  "Common",
  "Unranked",
] as const;

export const LORE_CATEGORY_OPTIONS = [
  "Sentinel",
  "Sovereign",
  "Vanguard",
  "Clan",
  "Organization",
  "Antagonist",
  "Relic",
  "Chronicle",
  "Unclassified",
] as const;

const TIER_RANK: Record<string, number> = Object.fromEntries(
  LORE_TIER_OPTIONS.map((t, i) => [t.toLowerCase(), i]),
);

const OVERRIDES_KEY = "scu_lore_explorer_overrides_v1";

export function getLoreItemKey(item: LoreItem, fallbackIndex?: number): string {
  if (item.id && item.id.trim()) return item.id.trim();
  const label = item.name || item.event_name || item.title;
  if (label && label.trim()) return `name:${label.trim().toLowerCase()}`;
  return `item:${fallbackIndex ?? 0}`;
}

export function resolveItemTier(item: LoreItem): string {
  const raw = item.tier ?? item.character_tier;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Unranked";
}

export function resolveItemCategory(item: LoreItem): string {
  const raw = item.category || item.faction || item.role || item.era;
  return typeof raw === "string" && raw.trim() ? raw.trim() : "Unclassified";
}

export function resolveItemSection(item: LoreItem, groupBy: LoreGroupBy): string {
  return groupBy === "tier" ? resolveItemTier(item) : resolveItemCategory(item);
}

function readLocalOverrides(): Record<string, Partial<LoreItem>> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<LoreItem>>) : {};
  } catch {
    return {};
  }
}

function writeLocalOverrides(overrides: Record<string, Partial<LoreItem>>) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    /* storage optional */
  }
}

function applyOverrides(
  list: LoreItem[],
  overrides: Record<string, Partial<LoreItem>>,
): LoreItem[] {
  return list.map((item, idx) => {
    const key = getLoreItemKey(item, idx);
    const patch = overrides[key];
    return patch ? { ...item, ...patch } : item;
  });
}

interface ActiveContextMenuState {
  itemKey: string;
  item: LoreItem;
  displayName: string;
  x: number;
  y: number;
}

interface LoreExplorerCardProps {
  item: LoreItem;
  itemKey: string;
  idx: number;
  isBookmarked: boolean;
  isPinned: boolean;
  isHighlighted: boolean;
  isSpeaking: boolean;
  onToggleBookmark: (itemKey: string, item: LoreItem) => void;
  onToggleSpeak: (itemKey: string, item: LoreItem) => void;
  onUpdateProperty: (itemKey: string, patch: Partial<LoreItem>) => void;
  onOpenContextMenu: (state: ActiveContextMenuState) => void;
}

const LoreExplorerCard = memo(function LoreExplorerCard({
  item,
  itemKey,
  idx,
  isBookmarked,
  isPinned,
  isHighlighted,
  isSpeaking,
  onToggleBookmark,
  onToggleSpeak,
  onUpdateProperty,
  onOpenContextMenu,
}: LoreExplorerCardProps) {
  const displayName = item.name || item.event_name || item.title || "Unnamed";
  const currentTier = resolveItemTier(item);
  const currentCategory = resolveItemCategory(item);
  const tierChoices = useMemo(
    () => Array.from(new Set([...LORE_TIER_OPTIONS, currentTier])),
    [currentTier],
  );
  const categoryChoices = useMemo(
    () => Array.from(new Set([...LORE_CATEGORY_OPTIONS, currentCategory])),
    [currentCategory],
  );

  const openMenuAt = useCallback(
    (x: number, y: number) => {
      onOpenContextMenu({
        itemKey,
        item,
        displayName,
        x,
        y,
      });
    },
    [onOpenContextMenu, itemKey, item, displayName],
  );

  const { pressing, handlers } = useLongPress({
    onTrigger: ({ x, y }) => openMenuAt(x, y),
  });

  return (
    <MotionCard
      as="article"
      index={idx}
      scrollReveal
      data-item-key={itemKey}
      data-pinned={isPinned ? "true" : "false"}
      data-highlighted={isHighlighted ? "true" : "false"}
      data-speaking={isSpeaking ? "true" : "false"}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 250px" }}
      className={`scroll-mt-28 bg-gray-800 border rounded-lg p-5 shadow-lg flex flex-col justify-between gap-3 touch-pan-y transition-[transform,border-color,box-shadow] duration-150 ${
        pressing
          ? "scale-[0.985] border-red-400 ring-2 ring-red-500/40 select-none"
          : isSpeaking
            ? "border-sky-400 ring-2 ring-sky-400/50"
            : isHighlighted
              ? "border-emerald-400 ring-2 ring-emerald-400/50"
              : isPinned
                ? "border-emerald-500/70"
                : "border-gray-700"
      }`}
    >
      <div
        {...handlers}
        data-lore-card-surface="true"
        className="flex flex-1 flex-col justify-between gap-3"
      >
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-red-400">{displayName}</h3>
              {isPinned && (
                <span className="mt-1 inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  <Pin className="h-2.5 w-2.5" aria-hidden="true" />
                  Pinned
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusTooltip label={currentTier}>
                <span className="bg-red-900/50 text-red-200 text-[11px] font-semibold uppercase px-2 py-0.5 rounded">
                  {currentTier}
                </span>
              </StatusTooltip>
              <button
                type="button"
                onClick={() => onToggleBookmark(itemKey, item)}
                aria-pressed={isBookmarked}
                aria-label={
                  isBookmarked ? `Remove bookmark for ${displayName}` : `Bookmark ${displayName}`
                }
                title={
                  isBookmarked
                    ? "Remove from personalized collection"
                    : "Save to personalized collection"
                }
                className={`inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded border p-1 transition-colors ${
                  isBookmarked
                    ? "border-amber-400/60 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                    : "border-gray-700 bg-gray-900/80 text-gray-400 hover:border-amber-400/50 hover:text-amber-200"
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${isBookmarked ? "fill-amber-300" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                aria-label={`More actions for ${displayName}`}
                aria-haspopup="menu"
                title="Long-press card or click for quick actions (Bookmark, Share, Pin)"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  openMenuAt(rect.right - 220, rect.bottom + 6);
                }}
                className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded border border-gray-700 bg-gray-900/80 p-1 text-gray-400 transition-colors hover:border-gray-500 hover:text-white"
              >
                <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            {item.faction || item.category ? (
              <span className="inline-block bg-gray-900/70 border border-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded">
                {item.category ? `Category: ${item.category}` : `Faction: ${item.faction}`}
              </span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => onToggleSpeak(itemKey, item)}
              aria-pressed={isSpeaking}
              aria-label={isSpeaking ? `Stop narrating ${displayName}` : `Listen to ${displayName}`}
              title={isSpeaking ? "Stop lore narration" : "Listen to lore narration"}
              className={`inline-flex min-h-[32px] items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
                isSpeaking
                  ? "border-sky-400 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30"
                  : "border-gray-700 bg-gray-900/80 text-gray-200 hover:border-sky-400/60 hover:text-sky-200"
              }`}
            >
              {isSpeaking ? (
                <Square className="h-3 w-3 fill-sky-300 text-sky-300" aria-hidden="true" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
              )}
              <span>{isSpeaking ? "Stop" : "Listen"}</span>
            </button>
          </div>

          <p className="text-gray-300 text-sm mb-3">{item.bio || item.description || item.lore}</p>

          {item.combat_style && (
            <p className="text-xs text-gray-400">
              <strong>Combat Style:</strong> {item.combat_style}
            </p>
          )}
          {item.year && (
            <p className="text-xs text-gray-400">
              <strong>Year:</strong> {item.year}
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-gray-700/80 grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-1 text-gray-400">
            <span>Tier</span>
            <select
              aria-label={`Tier for ${displayName}`}
              value={currentTier}
              onChange={(e) => onUpdateProperty(itemKey, { tier: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
            >
              {tierChoices.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-gray-400">
            <span>Category</span>
            <select
              aria-label={`Category for ${displayName}`}
              value={currentCategory}
              onChange={(e) => onUpdateProperty(itemKey, { category: e.target.value })}
              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white"
            >
              {categoryChoices.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </MotionCard>
  );
});

export interface LoreExplorerProps {
  initialTab?: LoreTab;
  initialGroupBy?: LoreGroupBy;
  initialItems?: LoreItem[];
  fallbackItems?: LoreItem[];
  onItemUpdate?: (updatedItem: LoreItem, patch: Partial<LoreItem>) => void | Promise<void>;
}

export function LoreExplorer({
  initialTab = "characters",
  initialGroupBy = "tier",
  initialItems,
  fallbackItems,
  onItemUpdate,
}: LoreExplorerProps = {}) {
  const [tab, setTab] = useState<LoreTab>(initialTab);
  const [groupBy, setGroupBy] = useState<LoreGroupBy>(initialGroupBy);
  const [items, setItems] = useState<LoreItem[]>(() =>
    initialItems ? applyOverrides(initialItems, readLocalOverrides()) : [],
  );
  const [loading, setLoading] = useState(!initialItems);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [bookmarks, setBookmarks] = useState<LoreBookmarkEntry[]>(() => readLoreBookmarks());
  const [pins, setPins] = useState<LorePinEntry[]>(() => readLorePins());
  const [viewBookmarksOnly, setViewBookmarksOnly] = useState(false);
  const [contextMenu, setContextMenu] = useState<ActiveContextMenuState | null>(null);
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  const announceStatus = useCallback((message: string) => {
    setStatusMessage(message);
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage(null);
      statusTimerRef.current = null;
    }, 3200);
  }, []);

  const { speakingKey, toggleSpeak, stopSpeaking } = useLoreTts({
    onStatus: announceStatus,
  });

  const focusCardByKey = useCallback((key: string) => {
    setHighlightedKey(key);
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedKey(null);
      highlightTimerRef.current = null;
    }, 2200);
    if (typeof document !== "undefined") {
      window.requestAnimationFrame(() => {
        const cards = document.querySelectorAll<HTMLElement>("[data-item-key]");
        for (const el of cards) {
          if (el.dataset["itemKey"] === key) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            break;
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    setBookmarks(readLoreBookmarks());
    setPins(readLorePins());
    const unsubBookmarks = subscribeLoreBookmarks(() => {
      setBookmarks(readLoreBookmarks());
    });
    const unsubPins = subscribeLorePins(() => {
      setPins(readLorePins());
    });
    return () => {
      unsubBookmarks();
      unsubPins();
      if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
      if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialItems) {
      setItems(applyOverrides(initialItems, readLocalOverrides()));
      setLoading(false);
    }
  }, [initialItems]);

  useEffect(() => {
    if (initialItems) return;
    let cancelled = false;
    const hasFallback = Boolean(fallbackItems && fallbackItems.length > 0 && tab === "characters");
    if (hasFallback && fallbackItems) {
      setItems(applyOverrides(fallbackItems, readLocalOverrides()));
      setActiveSection("all");
      setLoading(false);
    } else {
      setLoading(true);
    }
    async function loadData() {
      let raw: LoreItem[] = [];
      try {
        if (tab === "characters") raw = (await scuCache.getCharacters()) as LoreItem[];
        else if (tab === "organizations") raw = (await scuCache.getOrganizations()) as LoreItem[];
        else if (tab === "timeline") raw = (await scuCache.getTimeline()) as LoreItem[];
      } catch {
        raw = [];
      }
      if (cancelled) return;
      if (raw.length === 0 && hasFallback) {
        return;
      }
      if (raw.length === 0 && fallbackItems && fallbackItems.length > 0 && tab === "characters") {
        raw = fallbackItems;
      }
      setItems(applyOverrides(raw, readLocalOverrides()));
      setActiveSection("all");
      setLoading(false);
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [tab, initialItems, fallbackItems]);

  const bookmarkedKeySet = useMemo(() => new Set(bookmarks.map((b) => b.key)), [bookmarks]);
  const pinnedKeySet = useMemo(() => new Set(pins.map((p) => p.key)), [pins]);

  const liveItemByKey = useMemo(() => {
    const map = new Map<string, LoreItem>();
    items.forEach((item, idx) => {
      map.set(getLoreItemKey(item, idx), item);
    });
    return map;
  }, [items]);

  const handleToggleBookmark = useCallback(
    (itemKey: string, item: LoreItem) => {
      const result = toggleLoreBookmarkEntry(itemKey, item, tab);
      setBookmarks(result.entries);
    },
    [tab],
  );

  const handleClearBookmarks = useCallback(() => {
    setBookmarks(clearLoreBookmarkEntries());
  }, []);

  const handleTogglePin = useCallback(
    (itemKey: string, item: LoreItem, entryTab: LoreTab = tab) => {
      const result = toggleLorePinEntry(itemKey, item, entryTab);
      setPins(result.entries);
      const name = item.name || item.event_name || item.title || "Entry";
      announceStatus(result.pinned ? `Pinned ${name} to Quick Access` : `Unpinned ${name}`);
    },
    [tab, announceStatus],
  );

  const handleUnpin = useCallback((itemKey: string) => {
    setPins(removeLorePinEntry(itemKey));
  }, []);

  const handleClearPins = useCallback(() => {
    setPins(clearLorePinEntries());
    announceStatus("Cleared pinned quick access entries");
  }, [announceStatus]);

  const handleShareItem = useCallback(
    async (itemKey: string, item: LoreItem) => {
      const payload = buildLoreSharePayload(item, itemKey);
      const result = await executeLoreShare(payload);
      if (result.status !== "cancelled") {
        announceStatus(result.message);
      }
    },
    [announceStatus],
  );

  const handleJumpToPinned = useCallback(
    (entry: LorePinEntry) => {
      setViewBookmarksOnly(false);
      setSearch("");
      setActiveSection("all");
      if (!initialItems && entry.tab !== tab) {
        setTab(entry.tab);
      }
      focusCardByKey(entry.key);
    },
    [initialItems, tab, focusCardByKey],
  );

  // Immutable property updater: updating tier/category replaces the item object
  // in the single-source-of-truth array so derived sections immediately re-render
  // and relocate the item to its new section.
  const handleUpdateItemProperty = useCallback(
    (itemKey: string, patch: Partial<LoreItem>) => {
      const normalizedPatch: Partial<LoreItem> = {
        ...patch,
        ...(patch.tier !== undefined ? { character_tier: patch.tier } : {}),
      };

      const targetIndex = items.findIndex((item, idx) => getLoreItemKey(item, idx) === itemKey);
      const existingItem =
        (targetIndex >= 0 ? items[targetIndex] : undefined) ??
        bookmarks.find((b) => b.key === itemKey)?.item;
      const updatedSnapshot: LoreItem | undefined = existingItem
        ? { ...existingItem, ...normalizedPatch }
        : undefined;

      setItems((prev) =>
        prev.map((item, idx) =>
          getLoreItemKey(item, idx) === itemKey ? { ...item, ...normalizedPatch } : item,
        ),
      );

      const overrides = readLocalOverrides();
      overrides[itemKey] = {
        ...overrides[itemKey],
        ...normalizedPatch,
      };
      writeLocalOverrides(overrides);

      if (updatedSnapshot) {
        const synced = syncLoreBookmarkItem(itemKey, updatedSnapshot);
        if (synced) setBookmarks(synced);
        const syncedPins = syncLorePinItem(itemKey, updatedSnapshot);
        if (syncedPins) setPins(syncedPins);
        if (activeSection !== "all") {
          const targetSection = resolveItemSection(updatedSnapshot, groupBy);
          if (targetSection !== activeSection) {
            setActiveSection(targetSection);
          }
        }
        void onItemUpdate?.(updatedSnapshot, patch);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("scu:lore-updated", { detail: { itemKey, patch } }));
        }
      }
    },
    [items, bookmarks, activeSection, groupBy, onItemUpdate],
  );

  // Choose base dataset: full active tab items or the user's personalized bookmarked collection.
  const sourceItems = useMemo(() => {
    if (!viewBookmarksOnly) return items;
    const overrides = readLocalOverrides();
    return bookmarks.map((entry) => {
      const live = liveItemByKey.get(entry.key);
      if (live) return live;
      const patch = overrides[entry.key];
      return patch ? { ...entry.item, ...patch } : entry.item;
    });
  }, [viewBookmarksOnly, items, bookmarks, liveItemByKey]);

  // Derived section ordering and counts from the active `sourceItems` array.
  const query = search.trim().toLowerCase();
  const filteredBySearch = useMemo(() => {
    if (!query) return sourceItems;
    return sourceItems.filter((item) => {
      const haystack = [
        item.name,
        item.event_name,
        item.title,
        item.faction,
        item.category,
        item.role,
        resolveItemTier(item),
        item.bio,
        item.description,
        item.lore,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [sourceItems, query]);

  const sectionsMap = useMemo(() => {
    const map = new Map<string, LoreItem[]>();
    for (const item of filteredBySearch) {
      const section = resolveItemSection(item, groupBy);
      const bucket = map.get(section) ?? [];
      bucket.push(item);
      map.set(section, bucket);
    }
    return map;
  }, [filteredBySearch, groupBy]);

  const orderedSectionNames = useMemo(() => {
    return [...sectionsMap.keys()].sort((a, b) => {
      if (groupBy === "tier") {
        const ra = TIER_RANK[a.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
        const rb = TIER_RANK[b.toLowerCase()] ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
      }
      return a.localeCompare(b);
    });
  }, [sectionsMap, groupBy]);

  // Keep activeSection valid if external data changes make it empty.
  useEffect(() => {
    if (activeSection !== "all" && !loading && !sectionsMap.has(activeSection)) {
      setActiveSection("all");
    }
  }, [activeSection, loading, sectionsMap]);

  const visibleSectionNames = useMemo(
    () =>
      activeSection === "all"
        ? orderedSectionNames
        : orderedSectionNames.filter((name) => name === activeSection),
    [activeSection, orderedSectionNames],
  );

  return (
    <MotionPage className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-wider text-red-500">
            Sentinels Cinematic Universe
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            Tip: Long-press or right-click any lore card to bookmark, share, or pin it for quick
            access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => {
              setViewBookmarksOnly((v) => !v);
              setActiveSection("all");
            }}
            aria-pressed={viewBookmarksOnly}
            aria-label={`View bookmarked collection (${bookmarks.length})`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold uppercase transition-colors border ${
              viewBookmarksOnly
                ? "border-amber-400 bg-amber-500/20 text-amber-200"
                : "border-gray-700 bg-gray-800 text-gray-200 hover:border-amber-400/60 hover:text-white"
            }`}
          >
            <Bookmark
              className={`h-3.5 w-3.5 ${viewBookmarksOnly ? "fill-amber-400 text-amber-300" : ""}`}
              aria-hidden="true"
            />
            <span>Bookmarks ({bookmarks.length})</span>
          </button>

          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-gray-400 uppercase tracking-wider">Group by:</span>
            {(["tier", "category"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setGroupBy(mode);
                  setActiveSection("all");
                }}
                aria-pressed={groupBy === mode}
                className={`px-3 py-1.5 rounded uppercase font-semibold transition-colors ${
                  groupBy === mode
                    ? "bg-red-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-sky-500/40 bg-sky-950/50 px-4 py-2 text-xs text-sky-100"
        >
          <span className="flex items-center gap-2">
            {/(Narrating|Stopped narrating|narrate|Text-to-speech)/i.test(statusMessage) ? (
              <Volume2 className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
            ) : (
              <Share2 className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
            )}
            {statusMessage}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss notification"
            className="rounded p-0.5 text-sky-200/80 hover:bg-sky-900/50 hover:text-white"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {pins.length > 0 && (
        <section
          aria-label="Pinned quick access"
          className="mb-5 rounded-lg border border-emerald-500/35 bg-emerald-950/20 px-4 py-3"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Quick Access ({pins.length})</span>
            </div>
            <button
              type="button"
              onClick={handleClearPins}
              aria-label="Clear all pinned entries"
              className="rounded border border-emerald-500/30 bg-gray-900/70 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-900/40"
            >
              Clear pins
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {pins.map((pinEntry) => {
              const name =
                pinEntry.item.name || pinEntry.item.event_name || pinEntry.item.title || "Unnamed";
              return (
                <div
                  key={pinEntry.key}
                  className="inline-flex items-center overflow-hidden rounded-full border border-emerald-500/45 bg-gray-900/90 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleJumpToPinned(pinEntry)}
                    aria-label={`Jump to pinned entry ${name}`}
                    className="inline-flex min-h-[32px] items-center gap-1.5 px-3 py-1 font-medium text-emerald-100 hover:bg-emerald-900/40"
                  >
                    <Pin className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                    <span>{name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnpin(pinEntry.key)}
                    aria-label={`Unpin ${name}`}
                    className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center border-l border-emerald-500/30 px-1.5 text-gray-400 hover:bg-red-950/60 hover:text-red-200"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!initialItems && (
        <div className="flex flex-wrap gap-3 mb-5">
          {(["characters", "organizations", "timeline"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                stopSpeaking();
                setViewBookmarksOnly(false);
                setTab(t);
              }}
              className={`px-4 py-2 rounded uppercase font-semibold text-sm transition-colors ${
                !viewBookmarksOnly && tab === t
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <MotionPresence initial={false}>
        {viewBookmarksOnly && (
          <MotionSection
            key="bookmark-collection-banner"
            as="section"
            aria-label="Personalized bookmark collection"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 fill-amber-400 text-amber-300" aria-hidden="true" />
              <span className="font-semibold text-amber-200">Personalized Lore Collection</span>
              <span className="text-xs text-amber-300/80">
                ({bookmarks.length} {bookmarks.length === 1 ? "saved entry" : "saved entries"})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {bookmarks.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBookmarks}
                  aria-label="Clear all bookmarks"
                  className="inline-flex items-center gap-1 rounded border border-red-500/40 bg-red-950/40 px-2.5 py-1 text-red-200 hover:bg-red-900/50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewBookmarksOnly(false)}
                className="rounded border border-gray-700 bg-gray-800 px-2.5 py-1 text-gray-200 hover:bg-gray-700"
              >
                Browse all
              </button>
            </div>
          </MotionSection>
        )}
      </MotionPresence>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="search"
          aria-label="Search lore entries"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            viewBookmarksOnly
              ? "Filter your bookmarked entries…"
              : "Filter entries by name, faction, tier…"
          }
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 w-full sm:w-64"
        />

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Section filter">
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === "all"}
            onClick={() => setActiveSection("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeSection === "all"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All ({filteredBySearch.length})
          </button>
          {orderedSectionNames.map((sec) => (
            <button
              key={sec}
              type="button"
              role="tab"
              aria-selected={activeSection === sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeSection === sec
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {sec} ({sectionsMap.get(sec)?.length ?? 0})
            </button>
          ))}
        </div>
      </div>

      {loading && !viewBookmarksOnly ? (
        <div className="text-gray-400 animate-pulse">Decrypting SCU Archives...</div>
      ) : visibleSectionNames.length === 0 ? (
        viewBookmarksOnly ? (
          <div className="rounded-lg border border-dashed border-gray-700 bg-gray-800/50 p-8 text-center">
            <p className="text-sm text-gray-300">
              {bookmarks.length === 0
                ? "Your personalized collection is empty. Bookmark any lore card to save it here."
                : "No bookmarked entries match your current search filter."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setViewBookmarksOnly(false);
              }}
              className="mt-3 rounded bg-red-600 px-4 py-1.5 text-xs font-semibold uppercase text-white hover:bg-red-700"
            >
              Browse lore entries
            </button>
          </div>
        ) : (
          <p className="text-gray-500">No records found in cache or database.</p>
        )
      ) : (
        <div className="space-y-8">
          {visibleSectionNames.map((sectionName, sIdx) => {
            const sectionItems = sectionsMap.get(sectionName) ?? [];
            return (
              <section
                key={sectionName}
                aria-label={`${sectionName} section`}
                data-section={sectionName}
                className="space-y-4"
              >
                <MotionSection delay={Math.min(sIdx * 0.04, 0.2)}>
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <h2 className="text-lg font-semibold uppercase tracking-wider text-red-400">
                      {sectionName}{" "}
                      <span className="text-sm font-normal text-gray-400">
                        ({sectionItems.length})
                      </span>
                    </h2>
                  </div>
                </MotionSection>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sectionItems.map((item, idx) => {
                    const fallbackIdx = items.indexOf(item);
                    const itemKey = getLoreItemKey(item, fallbackIdx >= 0 ? fallbackIdx : idx);
                    return (
                      <LoreExplorerCard
                        key={itemKey}
                        item={item}
                        itemKey={itemKey}
                        idx={idx}
                        isBookmarked={bookmarkedKeySet.has(itemKey)}
                        isPinned={pinnedKeySet.has(itemKey)}
                        isHighlighted={highlightedKey === itemKey}
                        isSpeaking={speakingKey === itemKey}
                        onToggleBookmark={handleToggleBookmark}
                        onToggleSpeak={toggleSpeak}
                        onUpdateProperty={handleUpdateItemProperty}
                        onOpenContextMenu={setContextMenu}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <LoreCardContextMenu
        open={contextMenu !== null}
        displayName={contextMenu?.displayName ?? ""}
        anchorX={contextMenu?.x ?? 0}
        anchorY={contextMenu?.y ?? 0}
        isBookmarked={contextMenu ? bookmarkedKeySet.has(contextMenu.itemKey) : false}
        isPinned={contextMenu ? pinnedKeySet.has(contextMenu.itemKey) : false}
        onBookmark={() => {
          if (!contextMenu) return;
          handleToggleBookmark(contextMenu.itemKey, contextMenu.item);
        }}
        onShare={() => {
          if (!contextMenu) return;
          void handleShareItem(contextMenu.itemKey, contextMenu.item);
        }}
        onPin={() => {
          if (!contextMenu) return;
          handleTogglePin(contextMenu.itemKey, contextMenu.item);
        }}
        onClose={() => setContextMenu(null)}
      />
    </MotionPage>
  );
}
