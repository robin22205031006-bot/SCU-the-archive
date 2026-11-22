import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { ArchiveErrorState, ArchiveNotFound } from "./components/archive-error-state";
import { persistQueries, scheduleArchivePrefetch } from "./lib/query-persist";

const SKIP_WARMUP = new Set(["/", "/auth", "/install", "/admin", "/ingest", "/mcp"]);

type WarmableRouter = {
  routesByPath: Record<string, unknown>;
  preloadRoute: (opts: { to: never }) => Promise<unknown>;
};

// Downloads each page's code in the background, one route per idle slot, so a
// click never waits on a chunk fetch.
function warmRoutesWhenIdle(router: unknown) {
  const warmable = router as WarmableRouter;
  const paths = Object.keys(warmable.routesByPath).filter(
    (path) => !path.includes("$") && !SKIP_WARMUP.has(path),
  );
  const schedule: (cb: () => void) => void =
    "requestIdleCallback" in window
      ? (cb) => window.requestIdleCallback(cb, { timeout: 4000 })
      : (cb) => window.setTimeout(cb, 200);

  const warmNext = () => {
    const next = paths.shift();
    if (!next) return;
    warmable
      .preloadRoute({ to: next as never })
      .catch(() => {})
      .finally(() => schedule(warmNext));
  };

  window.setTimeout(() => schedule(warmNext), 2500);
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 15, // 15 minutes
        gcTime: 1000 * 60 * 60 * 24, // 24 hours
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
  if (typeof window !== "undefined") {
    persistQueries(queryClient);
    scheduleArchivePrefetch(queryClient);
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 1000 * 60 * 15,
    defaultPreload: "intent",
    defaultPendingMs: 600,
    defaultPendingMinMs: 0,
    // Page errors render inside the shell (navigation stays usable) instead of
    // reaching the app-wide boundary, which reloads the whole app.
    defaultErrorComponent: ArchiveErrorState,
    defaultNotFoundComponent: ArchiveNotFound,
  });

  if (typeof window !== "undefined") warmRoutesWhenIdle(router);

  return router;
};
