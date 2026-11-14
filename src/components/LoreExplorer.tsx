import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { scuCache } from "../services/scuCache";
import { StatusTooltip } from "@/components/status-tooltip";
import {
  clearLoreBookmarkEntries,
  readLoreBookmarks,
  subscribeLoreBookmarks,
  syncLoreBookmarkItem,
  toggleLoreBookmarkEntry,
  type LoreBookmarkEntry,
} from "@/lib/lore-bookmarks";

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

export interface LoreExplorerProps {
  initialTab?: LoreTab;
  initialGroupBy?: LoreGroupBy;
  initialItems?: LoreItem[];
  onItemUpdate?: (updatedItem: LoreItem, patch: Partial<LoreItem>) => void | Promise<void>;
}

export function LoreExplorer({
  initialTab = "characters",
  initialGroupBy = "tier",
  initialItems,
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
  const [viewBookmarksOnly, setViewBookmarksOnly] = useState(false);

  useEffect(() => {
    setBookmarks(readLoreBookmarks());
    return subscribeLoreBookmarks(() => {
      setBookmarks(readLoreBookmarks());
    });
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
    async function loadData() {
      setLoading(true);
      let raw: LoreItem[] = [];
      if (tab === "characters") raw = (await scuCache.getCharacters()) as LoreItem[];
      else if (tab === "organizations") raw = (await scuCache.getOrganizations()) as LoreItem[];
      else if (tab === "timeline") raw = (await scuCache.getTimeline()) as LoreItem[];
      if (!cancelled) {
        setItems(applyOverrides(raw, readLocalOverrides()));
        setActiveSection("all");
        setLoading(false);
      }
    }
    void loadData();
    return () => {
      cancelled = true;
    };
  }, [tab, initialItems]);

  const bookmarkedKeySet = useMemo(() => new Set(bookmarks.map((b) => b.key)), [bookmarks]);

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
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold tracking-wider text-red-500">
          Sentinels Cinematic Universe
        </h1>

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

      {!initialItems && (
        <div className="flex flex-wrap gap-3 mb-5">
          {(["characters", "organizations", "timeline"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
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

      {viewBookmarksOnly && (
        <section
          aria-label="Personalized bookmark collection"
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 fill-amber-400 text-amber-300" aria-hidden="true" />
            <span className="font-semibold text-amber-200">
              Personalized Lore Collection
            </span>
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
        </section>
      )}

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
          {visibleSectionNames.map((sectionName) => {
            const sectionItems = sectionsMap.get(sectionName) ?? [];
            return (
              <section
                key={sectionName}
                aria-label={`${sectionName} section`}
                data-section={sectionName}
                className="space-y-4"
              >
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h2 className="text-lg font-semibold uppercase tracking-wider text-red-400">
                    {sectionName}{" "}
                    <span className="text-sm font-normal text-gray-400">
                      ({sectionItems.length})
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sectionItems.map((item, idx) => {
                    const fallbackIdx = items.indexOf(item);
                    const itemKey = getLoreItemKey(item, fallbackIdx >= 0 ? fallbackIdx : idx);
                    const displayName = item.name || item.event_name || item.title || "Unnamed";
                    const currentTier = resolveItemTier(item);
                    const currentCategory = resolveItemCategory(item);
                    const tierChoices = Array.from(new Set([...LORE_TIER_OPTIONS, currentTier]));
                    const categoryChoices = Array.from(
                      new Set([...LORE_CATEGORY_OPTIONS, currentCategory]),
                    );
                    const isBookmarked = bookmarkedKeySet.has(itemKey);

                    return (
                      <article
                        key={itemKey}
                        data-item-key={itemKey}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-5 shadow-lg flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="text-xl font-bold text-red-400">{displayName}</h3>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <StatusTooltip label={currentTier}>
                                <span className="bg-red-900/50 text-red-200 text-[11px] font-semibold uppercase px-2 py-0.5 rounded">
                                  {currentTier}
                                </span>
                              </StatusTooltip>
                              <button
                                type="button"
                                onClick={() => handleToggleBookmark(itemKey, item)}
                                aria-pressed={isBookmarked}
                                aria-label={
                                  isBookmarked
                                    ? `Remove bookmark for ${displayName}`
                                    : `Bookmark ${displayName}`
                                }
                                title={
                                  isBookmarked
                                    ? "Remove from personalized collection"
                                    : "Save to personalized collection"
                                }
                                className={`inline-flex items-center justify-center rounded border p-1 transition-colors ${
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
                            </div>
                          </div>

                          {(item.faction || item.category) && (
                            <span className="inline-block bg-gray-900/70 border border-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded mb-2">
                              {item.category
                                ? `Category: ${item.category}`
                                : `Faction: ${item.faction}`}
                            </span>
                          )}

                          <p className="text-gray-300 text-sm mb-3">
                            {item.bio || item.description || item.lore}
                          </p>

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
                              onChange={(e) =>
                                handleUpdateItemProperty(itemKey, { tier: e.target.value })
                              }
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
                              onChange={(e) =>
                                handleUpdateItemProperty(itemKey, { category: e.target.value })
                              }
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
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
