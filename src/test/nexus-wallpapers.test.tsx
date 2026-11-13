import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BUILTIN_NEXUS_WALLPAPERS,
  NEXUS_WALLPAPERS_SETTINGS_KEY,
  mergeNexusWallpapers,
  resolveActiveNexusWallpaper,
  sanitizeWallpaperSettings,
  sanitizeWallpaperUrl,
} from "@/lib/nexus-wallpapers";
import { NexusWallpaperBackdrop } from "@/components/nexus-wallpaper-backdrop";
import { NexusFxLayer } from "@/components/nexus-fx";
import { ThemeDrawer } from "@/components/theme-drawer";
import { AdminNexusWallpapers } from "@/components/admin-nexus-wallpapers";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { setNexus3dFxEnabled } from "@/hooks/use-nexus-theme";
import { setNexusWallpaperChoice } from "@/hooks/use-nexus-wallpaper";

const mockUpsert = vi.fn();
const mockMaybeSingle = vi.fn();
const mockResolvePin = vi.fn();
let mockUiStyle = "nexus";

vi.mock("@/lib/ui-style", () => ({
  useUiStyle: () => mockUiStyle,
  setUiStyle: vi.fn(),
  UI_STYLES: [
    { id: "classic", label: "Classic", desc: "Classic" },
    { id: "nexus", label: "Nexus", desc: "Nexus" },
    { id: "minimal", label: "Minimal", desc: "Minimal" },
  ],
}));

vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>();
  return {
    ...actual,
    useServerFn:
      () =>
      (...args: unknown[]) =>
        mockResolvePin(...args),
  };
});

vi.mock("@/lib/nexus-wallpaper.functions", () => ({
  resolvePinterestWallpaper: vi.fn(),
}));

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.IntersectionObserver;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        in: () => Promise.resolve({ data: [], error: null }),
      }),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  },
}));

vi.mock("@/hooks/use-admin", () => ({
  useIsAdmin: () => true,
  useRoles: () => ["admin"],
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>{ui}</AppearanceProvider>
    </QueryClientProvider>,
  );
}

describe("Nexus Wallpaper Themes", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUiStyle = "nexus";
    mockUpsert.mockReset().mockResolvedValue({ error: null });
    mockMaybeSingle.mockReset().mockResolvedValue({ data: { value: {} }, error: null });
    mockResolvePin.mockReset();
  });

  it("includes all 9 Pinterest live wallpapers with verified mp4 and poster URLs", () => {
    expect(BUILTIN_NEXUS_WALLPAPERS).toHaveLength(9);
    const sourceUrls = BUILTIN_NEXUS_WALLPAPERS.map((w) => w.sourceUrl);
    expect(sourceUrls).toEqual([
      "https://pin.it/2yGVLpn2D",
      "https://pin.it/4xbTozMmh",
      "https://pin.it/32UdiSzPg",
      "https://pin.it/6QZdObkl9",
      "https://pin.it/2zlQ3DgfM",
      "https://pin.it/7GmIkqTW1",
      "https://pin.it/Q08q0WqO5",
      "https://pin.it/7jgYrNHxm",
      "https://pin.it/kbybNMgdJ",
    ]);
    for (const wp of BUILTIN_NEXUS_WALLPAPERS) {
      expect(wp.kind).toBe("live");
      expect(wp.mediaUrl).toMatch(/^https:\/\/v1\.pinimg\.com\/.*\.mp4$/);
      expect(wp.posterUrl).toMatch(/^https:\/\/i\.pinimg\.com\/originals\/.*\.jpg$/);
    }
  });

  it("sanitizes unsafe URLs and merges admin custom wallpapers safely", () => {
    expect(sanitizeWallpaperUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeWallpaperUrl("https://cdn.example.com/bg.mp4")).toBe(
      "https://cdn.example.com/bg.mp4",
    );

    const settings = sanitizeWallpaperSettings({
      defaultWallpaperId: "custom-aurora",
      disabledIds: ["deep-space"],
      custom: [
        {
          id: "custom-aurora",
          label: "Aurora Sky",
          kind: "static",
          mediaUrl: "https://cdn.example.com/aurora.jpg",
        },
        {
          id: "bad-entry",
          label: "Bad",
          kind: "live",
          mediaUrl: "javascript:void(0)",
        },
      ],
    });

    const merged = mergeNexusWallpapers(settings);
    expect(merged.some((w) => w.id === "deep-space")).toBe(false);
    expect(merged.some((w) => w.id === "custom-aurora")).toBe(true);
    expect(merged.some((w) => w.id === "bad-entry")).toBe(false);

    expect(resolveActiveNexusWallpaper("auto", settings)?.id).toBe("custom-aurora");
    expect(resolveActiveNexusWallpaper("none", settings)).toBeNull();
    expect(resolveActiveNexusWallpaper("ae6787-galaxy", settings)?.id).toBe("ae6787-galaxy");
  });

  it("renders live video when moving and falls back to static poster image in static mode", () => {
    const wp = BUILTIN_NEXUS_WALLPAPERS[0]!;
    const { container, rerender } = render(
      <NexusWallpaperBackdrop wallpaper={wp} moving={true} playback="live" />,
    );

    expect(screen.getByTestId("nexus-wallpaper-backdrop")).toHaveAttribute(
      "data-nexus-wallpaper-mode",
      "live",
    );
    expect(container.querySelector("video")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();

    rerender(<NexusWallpaperBackdrop wallpaper={wp} moving={true} playback="static" />);
    expect(screen.getByTestId("nexus-wallpaper-backdrop")).toHaveAttribute(
      "data-nexus-wallpaper-mode",
      "static",
    );
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("src", wp.posterUrl);
  });

  it("shows Nexus Wallpaper Theme section ONLY when UI style is nexus", () => {
    mockUiStyle = "nexus";
    const view = wrap(<ThemeDrawer open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("region", { name: /nexus wallpaper themes/i })).toBeInTheDocument();
    expect(screen.getByText("AE6787 Cyber Galaxy")).toBeInTheDocument();
    expect(screen.getByText("Neon Void Galaxy")).toBeInTheDocument();
    view.unmount();

    mockUiStyle = "classic";
    wrap(<ThemeDrawer open={true} onOpenChange={() => {}} />);
    expect(screen.queryByRole("region", { name: /nexus wallpaper themes/i })).toBeNull();
  });

  it("allows admin to add a custom static or live wallpaper into app_settings", async () => {
    wrap(<AdminNexusWallpapers />);

    fireEvent.click(screen.getByRole("button", { name: /static wallpaper/i }));
    fireEvent.change(screen.getByLabelText(/wallpaper title/i), {
      target: { value: "Citadel Sunset" },
    });
    fireEvent.change(screen.getByLabelText(/static image url/i), {
      target: { value: "https://cdn.example.com/citadel.jpg" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /add static wallpaper/i }));
    });

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });

    const payload = mockUpsert.mock.calls[0]?.[0] as {
      key: string;
      value: { custom: Array<{ label: string; kind: string; mediaUrl: string }> };
    };
    expect(payload.key).toBe(NEXUS_WALLPAPERS_SETTINGS_KEY);
    expect(payload.value.custom[0]).toMatchObject({
      label: "Citadel Sunset",
      kind: "static",
      mediaUrl: "https://cdn.example.com/citadel.jpg",
    });
  });

  it("applies wallpaper CSS layer inside .nexus-fx-background behind UI content and respects 3D FX Off", () => {
    setNexusWallpaperChoice("ae6787-galaxy");
    setNexus3dFxEnabled(true);

    const { container } = wrap(
      <NexusFxLayer>
        <main data-testid="ui-content">Archive Content</main>
      </NexusFxLayer>,
    );

    const bg = container.querySelector(".nexus-fx-background") as HTMLElement | null;
    expect(bg).not.toBeNull();
    expect(bg).toHaveAttribute("data-has-wallpaper", "true");
    expect(bg).toHaveAttribute("data-fx-wallpaper", "ae6787-galaxy");
    expect(bg).toHaveAttribute("data-fx-3d", "on");
    expect(bg?.style.getPropertyValue("--nexus-wallpaper-image")).toContain(
      "afaa1c7d1ea2779c792b6fba2a6714dc.jpg",
    );
    expect(bg?.contains(screen.getByTestId("nexus-wallpaper-backdrop"))).toBe(true);
    expect(bg?.contains(screen.getByTestId("ui-content"))).toBe(false);

    act(() => {
      setNexus3dFxEnabled(false);
    });
    expect(bg).toHaveAttribute("data-fx-3d", "off");
    expect(container.querySelector(".nexus-fx-3d-canvas")).toBeNull();
  });

  it("allows turning 3D element wallpapers (Pyre, Tide, Voltage) off and back on in ThemeDrawer", () => {
    mockUiStyle = "nexus";
    wrap(<ThemeDrawer open={true} onOpenChange={() => {}} />);

    const offBtn = screen.getByRole("button", { name: /3d wallpaper off/i });
    const voltageBtn = screen.getByRole("button", { name: /voltage · lightning/i });
    const toggleSwitch = screen.getByRole("switch", { name: /3d element wallpaper/i });

    expect(toggleSwitch).toBeChecked();
    expect(offBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(offBtn);
    expect(localStorage.getItem("scu-nexus-3d-fx")).toBe("off");
    expect(offBtn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(voltageBtn);
    expect(localStorage.getItem("scu-nexus-3d-fx")).toBe("on");
    expect(localStorage.getItem("scu-nexus-theme")).toBe("storm");
    expect(voltageBtn).toHaveAttribute("aria-pressed", "true");
  });
});
