import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Series } from "@/lib/series";

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  deleteSeries: vi.fn(),
  deleteSeason: vi.fn(),
  saveSeasonTitles: vi.fn(),
  askSeriesLore: vi.fn(),
  seriesList: [] as Series[],
}));

vi.mock("@/hooks/use-admin", () => ({
  useIsAdmin: () => mocks.isAdmin,
  useIsStaff: () => mocks.isAdmin,
  useSession: () => ({ data: { id: "admin-1" } }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@tanstack/react-start", () => ({
  useServerFn: (fn: unknown) => fn,
  createServerFn: () => {
    const chain = {
      middleware: () => chain,
      inputValidator: () => chain,
      handler: (h: unknown) => h,
    };
    return chain;
  },
}));

vi.mock("@/lib/series-lore.functions", () => ({
  deleteSeries: mocks.deleteSeries,
  deleteSeason: mocks.deleteSeason,
  saveSeasonTitles: mocks.saveSeasonTitles,
  askSeriesLore: mocks.askSeriesLore,
}));

vi.mock("@/lib/spoiler-mask", () => ({
  useSpoilerMask: () => false,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        order: async () => ({
          data: table === "series" ? mocks.seriesList : [],
          error: null,
        }),
        eq: () => ({
          order: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  },
}));

import { AdminSeries } from "@/components/admin-series";
import { SeriesTools } from "@/components/series-tools";

const SAMPLE_SERIES: Series = {
  id: "11111111-1111-4111-a111-111111111111",
  title: "Redline",
  description: "Black-ops saga",
  cover_image_url: null,
  genres: ["Action"],
  season_count: 2,
  season_names: ["Dawn", "Aftermath"],
  timeline_note: null,
  updated_at: "2026-11-12T00:00:00.000Z",
};

function renderWithQuery(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("Admin series & season deletion UI", () => {
  beforeEach(() => {
    mocks.isAdmin = true;
    mocks.seriesList = [SAMPLE_SERIES];
    mocks.deleteSeries.mockReset().mockResolvedValue({
      ok: true,
      id: SAMPLE_SERIES.id,
      title: SAMPLE_SERIES.title,
    });
    mocks.deleteSeason.mockReset().mockResolvedValue({
      ok: true,
      id: SAMPLE_SERIES.id,
      season_count: 1,
      season_names: ["Aftermath"],
      removedTitle: "Dawn",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("lets admins delete a series and individual seasons from SeriesTools", async () => {
    const onDeleted = vi.fn();
    renderWithQuery(<SeriesTools series={SAMPLE_SERIES} onDeleted={onDeleted} />);

    fireEvent.click(screen.getByRole("button", { name: /Delete series/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete series$/i }));

    await waitFor(() => {
      expect(mocks.deleteSeries).toHaveBeenCalledWith({
        data: { seriesId: SAMPLE_SERIES.id },
      });
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /Season titles/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Dawn" }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete season$/i }));

    await waitFor(() => {
      expect(mocks.deleteSeason).toHaveBeenCalledWith({
        data: { seriesId: SAMPLE_SERIES.id, season: 1 },
      });
    });
  });

  it("lets admins expand a series in AdminSeries and delete any season or the series", async () => {
    renderWithQuery(<AdminSeries />);

    await screen.findByText("Redline");
    fireEvent.click(screen.getByText("Redline"));

    fireEvent.click(screen.getByRole("button", { name: "Delete Dawn from Redline" }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete season$/i }));

    await waitFor(() => {
      expect(mocks.deleteSeason).toHaveBeenCalledWith({
        data: { seriesId: SAMPLE_SERIES.id, season: 1 },
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete Redline" }));
    fireEvent.click(screen.getByRole("button", { name: /^Delete series$/i }));

    await waitFor(() => {
      expect(mocks.deleteSeries).toHaveBeenCalledWith({
        data: { seriesId: SAMPLE_SERIES.id },
      });
    });
  });

  it("hides series and season deletion controls from non-admins", async () => {
    mocks.isAdmin = false;
    renderWithQuery(
      <>
        <SeriesTools series={SAMPLE_SERIES} />
        <AdminSeries />
      </>,
    );

    await screen.findByText("Redline");
    expect(screen.queryByRole("button", { name: /Delete series/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete Redline" })).toBeNull();

    fireEvent.click(screen.getByText("Redline"));
    expect(screen.queryByRole("button", { name: "Delete Dawn from Redline" })).toBeNull();
  });
});
