import { act, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";
import { ArchiveErrorState, ArchiveNotFound } from "@/components/archive-error-state";

vi.mock("@/lib/lovable-error-reporting", () => ({ reportLovableError: vi.fn() }));

function setup(path: string, error?: Error) {
  const root = createRootRoute({
    component: () => (
      <div>
        <nav>Site navigation</nav>
        <Outlet />
      </div>
    ),
  });
  const broken = createRoute({
    getParentRoute: () => root,
    path: "/broken",
    component: () => {
      throw error ?? new Error("boom");
    },
  });
  return createRouter({
    routeTree: root.addChildren([broken]),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultErrorComponent: ArchiveErrorState,
    defaultNotFoundComponent: ArchiveNotFound,
  });
}

describe("ArchiveErrorState", () => {
  it("renders a page error inside the shell, keeping navigation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const router = setup("/broken");
    await act(async () => {
      await router.load();
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("This page didn't load")).toBeInTheDocument();
    expect(screen.getByText("Site navigation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });

  it("offers a reload when an outdated app file fails to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const router = setup(
      "/broken",
      new TypeError("Failed to fetch dynamically imported module: /assets/x.js"),
    );
    await act(async () => {
      await router.load();
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("The archive was updated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reload app/ })).toBeInTheDocument();
  });

  it("shows a 404 with quick links back into the archive", async () => {
    const router = setup("/no-such-page");
    await act(async () => {
      await router.load();
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByText("This page isn't in the archive")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Characters" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go home/ })).toBeInTheDocument();
  });
});
