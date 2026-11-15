import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuthDefaultExport, { AuthPage } from "@/routes/auth";
import { routeTree } from "@/routeTree.gen";

const mockAuthState = {
  user: null as { id: string; email: string } | null,
  backendConfigured: false,
  delayGetUserMs: 0,
};

vi.mock("@/integrations/supabase/client", () => {
  const emptyChain = () => {
    const res = { data: [], error: null };
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      ilike: () => chain,
      order: () => chain,
      limit: () => chain,
      insert: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
      then: (onFulfilled: (v: typeof res) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(res).then(onFulfilled, onRejected),
    };
    return chain;
  };
  return {
    hasSupabaseConfig: () => mockAuthState.backendConfigured,
    getSupabaseConfig: () => ({
      url: "https://csdmkmtfhgxkjmucepjo.supabase.co",
      key: "sb_publishable_test",
      projectId: "csdmkmtfhgxkjmucepjo",
    }),
    supabase: {
      auth: {
        getUser: async () => {
          if (mockAuthState.delayGetUserMs > 0) {
            await new Promise((r) => setTimeout(r, mockAuthState.delayGetUserMs));
          }
          return { data: { user: mockAuthState.user }, error: null };
        },
        getSession: async () => ({
          data: {
            session: mockAuthState.user ? { user: mockAuthState.user, access_token: "t" } : null,
          },
          error: null,
        }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: async () => ({ error: null }),
      },
      rpc: async () => ({ data: false, error: null }),
      from: () => emptyChain(),
      storage: {
        from: () => ({
          getPublicUrl: (p: string) => ({ data: { publicUrl: p } }),
        }),
      },
    },
  };
});

async function renderRoute(path: string, waitMs = 150) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient },
  });
  await act(async () => {
    await router.load();
  });
  const view = render(<RouterProvider router={router} />);
  await act(async () => {
    await new Promise((r) => setTimeout(r, waitMs));
  });
  return { router, view };
}

describe("Full UI, Auth Protection & Route Stability", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["primarySystem"];
    delete document.documentElement.dataset["mangaSubtheme"];
    delete document.documentElement.dataset["genreTheme"];
    mockAuthState.user = null;
    mockAuthState.backendConfigured = false;
    mockAuthState.delayGetUserMs = 0;
  });

  afterEach(() => {
    cleanup();
  });

  it("exports AuthPage cleanly as default and renders /auth + Sign in links in every UI mode when signed out", async () => {
    expect(AuthDefaultExport).toBe(AuthPage);

    for (const mode of ["classic", "nexus", "minimal", "manga"] as const) {
      cleanup();
      localStorage.setItem("scu-ui-mode", mode);
      localStorage.setItem("scu-primary-system", mode);
      const { view } = await renderRoute("/");
      const text = view.container.textContent?.trim() ?? "";
      const signInCount = view.container.querySelectorAll('a[href="/auth"]').length;
      expect(text.length, `${mode} / should render non-empty text`).toBeGreaterThan(50);
      expect(signInCount, `${mode} / should expose at least one Sign in link`).toBeGreaterThan(0);
    }

    for (const mode of ["classic", "nexus", "minimal", "manga"] as const) {
      cleanup();
      localStorage.setItem("scu-ui-mode", mode);
      localStorage.setItem("scu-primary-system", mode);
      const { view } = await renderRoute("/auth");
      const form = view.container.querySelector("form");
      expect(form, `${mode} /auth should render sign-in form`).not.toBeNull();
      expect(screen.getByRole("heading", { name: /Sign in/i })).toBeInTheDocument();
    }
  }, 25000);

  it("redirects unauthenticated visitors cleanly to /auth when backend is configured and shows spinner while loading", async () => {
    mockAuthState.backendConfigured = true;
    mockAuthState.user = null;
    mockAuthState.delayGetUserMs = 80;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ["/characters"] }),
      context: { queryClient },
      defaultPendingMs: 0,
    });

    const loadPromise = router.load();
    const view = render(<RouterProvider router={router} />);

    // While pendingComponent / auth verification runs, a non-blank status spinner is shown
    expect(view.container.querySelector('[role="status"]')).not.toBeNull();

    await act(async () => {
      await loadPromise;
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(router.state.location.pathname).toBe("/auth");
    expect(screen.getByRole("heading", { name: /Sign in/i })).toBeInTheDocument();
  });

  it("renders all authenticated routes non-blank with zero ErrorBoundary crashes across all UI modes", async () => {
    mockAuthState.user = { id: "u1", email: "sentinel@example.com" };
    mockAuthState.backendConfigured = true;
    const routes = [
      "/characters",
      "/abilities",
      "/arsenal",
      "/archive",
      "/story",
      "/map",
      "/fandom",
      "/ai",
      "/vault",
      "/series",
      "/orgs",
      "/timeline",
      "/clans",
      "/graph",
      "/profile",
    ];
    for (const mode of ["classic", "nexus", "minimal", "manga"] as const) {
      for (const path of routes) {
        cleanup();
        localStorage.setItem("scu-ui-mode", mode);
        localStorage.setItem("scu-primary-system", mode);
        const { view } = await renderRoute(path, 50);
        const mainText = view.container.querySelector("main")?.textContent?.trim() ?? "";
        const headings = Array.from(view.container.querySelectorAll("h1")).map(
          (h) => h.textContent,
        );
        expect(headings).not.toContain("Failed to load SCU Archives");
        expect(mainText.length, `${mode} ${path} <main> should not be blank`).toBeGreaterThan(0);
      }
    }
  }, 60000);

  it("mounts client-side tab switches visibly without stalling at opacity 0 in any UI mode", async () => {
    mockAuthState.user = { id: "u1", email: "sentinel@example.com" };
    mockAuthState.backendConfigured = true;
    for (const mode of ["classic", "nexus", "minimal", "manga"] as const) {
      cleanup();
      localStorage.setItem("scu-ui-mode", mode);
      localStorage.setItem("scu-primary-system", mode);
      const { router, view } = await renderRoute("/characters", 60);
      for (const nextPath of [
        "/abilities",
        "/abilities?tab=fx",
        "/abilities?tab=action",
        "/archive",
        "/story",
        "/profile",
      ]) {
        await act(async () => {
          await router.navigate({ to: nextPath as never });
          await new Promise((r) => setTimeout(r, 80));
        });
        const mainEl = view.container.querySelector("main");
        const textLen = mainEl?.textContent?.trim().length ?? 0;
        const pageDiv = view.container.querySelector(
          "[data-classic-page], [data-manga-page], [data-nexus-page], [data-minimal-page]",
        );
        const pageOpacity = pageDiv instanceof HTMLElement ? getComputedStyle(pageDiv).opacity : "";
        const mainOpacity = mainEl instanceof HTMLElement ? getComputedStyle(mainEl).opacity : "";
        expect(textLen, `${mode} -> ${nextPath} <main> should render content`).toBeGreaterThan(0);
        expect(pageOpacity, `${mode} -> ${nextPath} shell wrapper should not be opacity 0`).not.toBe(
          "0",
        );
        expect(mainOpacity, `${mode} -> ${nextPath} main should not be opacity 0`).not.toBe("0");
      }
    }
  }, 60000);
});
