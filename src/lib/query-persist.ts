import type { QueryClient } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSave,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import { hasSupabaseConfig } from "@/integrations/supabase/client";

/**
 * Offline-first query persistence backed by IndexedDB (`idb-keyval` +
 * `@tanstack/react-query-persist-client`) so restored lore renders at 0ms
 * across restarts without blocking the main thread or exceeding localStorage quotas.
 * Account-scoped keys are skipped to avoid leaking private data across sessions.
 */
export const IDB_CACHE_KEY = "scu-rq-idb-cache-v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours
const CACHE_BUSTER = "v1";
const SKIP = /^\[(session|session-cache|admin|roles|banned|profile)/;

function createSafeIdbPersister(key = IDB_CACHE_KEY): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        if (typeof indexedDB !== "undefined") {
          await set(key, client);
        }
      } catch {
        /* ignore IDB unavailable / private mode quota */
      }
    },
    restoreClient: async () => {
      try {
        if (typeof indexedDB === "undefined") return undefined;
        return await get<PersistedClient>(key);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        if (typeof indexedDB !== "undefined") {
          await del(key);
        }
      } catch {
        /* ignore */
      }
    },
  };
}

function shouldDehydrateQuery(query: {
  queryKey: readonly unknown[];
  state: { status: string; data: unknown };
}): boolean {
  if (query.state.status !== "success" || query.state.data === undefined) return false;
  try {
    return !SKIP.test(JSON.stringify(query.queryKey));
  } catch {
    return false;
  }
}

export function persistQueries(qc: QueryClient): () => void {
  const persister = createSafeIdbPersister();

  try {
    localStorage.removeItem("scu-rq-cache-v1");
    localStorage.removeItem("scu-rq-cache-v2");
  } catch {
    /* ignore */
  }

  void persistQueryClientRestore({
    queryClient: qc,
    persister,
    maxAge: CACHE_MAX_AGE_MS,
    buster: CACHE_BUSTER,
  }).catch(() => {});

  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;

  const flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (!dirty) return;
    dirty = false;
    void persistQueryClientSave({
      queryClient: qc,
      persister,
      buster: CACHE_BUSTER,
      dehydrateOptions: {
        shouldDehydrateQuery,
      },
    }).catch(() => {});
  };

  const unsubscribe = qc.getQueryCache().subscribe((event) => {
    // Observer mounts, fetch starts and stale notifications do not change lore.
    // Avoid serializing or writing to IndexedDB for high-frequency events.
    if (
      event.type !== "removed" &&
      !(event.type === "updated" && event.action.type === "success")
    ) {
      return;
    }
    dirty = true;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(flush, 1500);
  });

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
  }

  return () => {
    unsubscribe();
    if (timer !== undefined) clearTimeout(timer);
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", flush);
    }
  };
}

let prefetchedClient: WeakSet<QueryClient> | null = null;

/**
 * Low-priority background pre-download of core archive queries after initial render
 * so characters, groups, abilities, series, timeline, and artifacts resolve at 0ms on tab switches.
 */
export function scheduleArchivePrefetch(qc: QueryClient): void {
  if (typeof window === "undefined") return;
  if (!hasSupabaseConfig()) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  prefetchedClient ??= new WeakSet();
  if (prefetchedClient.has(qc)) return;
  prefetchedClient.add(qc);

  const runPrefetch = async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    try {
      const [
        { entitiesQuery, GROUP_LINK_KINDS, timelineQuery },
        { seriesQuery },
        { artifactsQuery },
        { hydrateAbilityRegistry },
      ] = await Promise.all([
        import("@/lib/entities"),
        import("@/lib/series"),
        import("@/lib/artifacts"),
        import("@/hooks/use-ability-registry"),
      ]);

      await Promise.allSettled([
        qc.prefetchQuery(entitiesQuery(["character"])),
        qc.prefetchQuery(entitiesQuery(GROUP_LINK_KINDS)),
        qc.prefetchQuery(seriesQuery),
        qc.prefetchQuery(timelineQuery),
        qc.prefetchQuery(artifactsQuery),
        hydrateAbilityRegistry(),
      ]);
    } catch {
      /* background prefetch failure must never disrupt navigation */
    }
  };

  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => void runPrefetch(), { timeout: 2500 });
  } else {
    setTimeout(() => void runPrefetch(), 900);
  }
}
