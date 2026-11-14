import type { ComponentType, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AMBIENT_ATMOSPHERE_STORAGE_KEY,
  LORE_LOCATION_STORAGE_KEY,
  readAmbientAtmosphere,
  resolveLocationAtmosphere,
  setAmbientAtmosphere,
  setCurrentLoreLocation,
  syncAmbientAtmosphereHtml,
  useAmbientAtmosphereSync,
} from "@/lib/ambient-atmosphere";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { UIStateProvider } from "@/context/UIStateContext";
import { ThemeDrawer } from "@/components/theme-drawer";
import { LoreLocations } from "@/components/lore-locations";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children: ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => (
      <a href={typeof to === "string" ? to : "#"} {...props}>
        {children}
      </a>
    ),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      updateUser: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock("@/hooks/use-admin", () => ({
  useSession: () => ({ data: { id: "user-1", email: "archivist@scu.test" } }),
}));

function AtmosphereSyncHost({ children }: { children: ReactNode }) {
  useAmbientAtmosphereSync();
  return <>{children}</>;
}

describe("Ambient Atmosphere & Lore Weather Glass Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-ambient-atmosphere");
    document.documentElement.removeAttribute("data-lore-location");
    document.documentElement.removeAttribute("data-lore-era");
    document.documentElement.removeAttribute("data-lore-weather");
    syncAmbientAtmosphereHtml();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("maps lore locations and eras accurately to glass weather presets", () => {
    expect(resolveLocationAtmosphere("nilanjona", "nila-present").weather).toBe("snow");
    expect(resolveLocationAtmosphere("nilanjona", "pre-asetra").weather).toBe("mist");
    expect(resolveLocationAtmosphere("istanbul-1417", "istanbul-present").weather).toBe("rain");
    expect(resolveLocationAtmosphere("istanbul-1417", "1417").weather).toBe("mist");
    expect(resolveLocationAtmosphere("aethmos", "enclave").weather).toBe("rain");
    expect(resolveLocationAtmosphere("aethmos", "exile").weather).toBe("fireflies");
    expect(resolveLocationAtmosphere("romania-15th", "romania-15th").weather).toBe("rain");
    expect(resolveLocationAtmosphere("yasnaya", "golden").weather).toBe("fireflies");
    expect(resolveLocationAtmosphere("yasnaya", "redline-s2").weather).toBe("embers");
    expect(resolveLocationAtmosphere("yasnaya", "ancient").weather).toBe("mist");
    expect(resolveLocationAtmosphere("rome", "rome-15th").weather).toBe("embers");
    expect(resolveLocationAtmosphere("rome", "rome-present").weather).toBe("mist");
    expect(resolveLocationAtmosphere("ruincity", "post").weather).toBe("ash");
    expect(resolveLocationAtmosphere("ruincity", "pre").weather).toBe("rain");
    expect(resolveLocationAtmosphere("pocket-dimension", "timeless").weather).toBe("rift");
  });

  it("toggles Ambient Atmosphere in ThemeDrawer settings, persists state, and updates HTML attributes", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <UIStateProvider initialMode="classic">
            <AtmosphereSyncHost>
              <ThemeDrawer open={true} onOpenChange={() => {}} />
            </AtmosphereSyncHost>
          </UIStateProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    expect(readAmbientAtmosphere()).toBe(false);
    expect(document.documentElement.dataset["ambientAtmosphere"]).toBe("off");

    const toggle = screen.getByRole("switch", { name: "Ambient Atmosphere" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem(AMBIENT_ATMOSPHERE_STORAGE_KEY)).toBe("on");
    expect(document.documentElement.dataset["ambientAtmosphere"]).toBe("on");
    expect(document.documentElement.dataset["loreWeather"]).toBe("snow");

    // Switching location preset from Settings drawer updates active glass weather immediately
    fireEvent.click(screen.getByRole("button", { name: "Istanbul" }));
    expect(document.documentElement.dataset["loreLocation"]).toBe("istanbul-1417");
    expect(document.documentElement.dataset["loreWeather"]).toBe("rain");
    const savedLoc = JSON.parse(localStorage.getItem(LORE_LOCATION_STORAGE_KEY) || "{}");
    expect(savedLoc.locationId).toBe("istanbul-1417");
  });

  it("renders Ambient Atmosphere toggle in Profile settings section and stays synced", async () => {
    const { Route } = await import("@/routes/_authenticated/profile");
    const ProfileComponent = Route.options.component as ComponentType;

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <UIStateProvider initialMode="classic">
            <AtmosphereSyncHost>
              <ProfileComponent />
            </AtmosphereSyncHost>
          </UIStateProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    const toggle = screen.getByRole("switch", { name: "Ambient Atmosphere" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset["ambientAtmosphere"]).toBe("on");

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(document.documentElement.dataset["ambientAtmosphere"]).toBe("off");
  });

  it("updates lore location and era weather attributes dynamically inside LoreLocations", () => {
    setAmbientAtmosphere(true);
    setCurrentLoreLocation("istanbul-1417", "istanbul-present");

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <UIStateProvider initialMode="classic">
            <AtmosphereSyncHost>
              <LoreLocations />
            </AtmosphereSyncHost>
          </UIStateProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    const region = within(screen.getByRole("region", { name: "Key lore locations" }));

    // Selecting Nilanjona's Realm in LoreLocations switches weather to snow (Present) or mist (Before Asetra)
    fireEvent.click(region.getByRole("button", { name: /Nilanjona's Realm/i }));
    expect(document.documentElement.dataset["loreLocation"]).toBe("nilanjona");
    expect(document.documentElement.dataset["loreEra"]).toBe("pre-asetra");
    expect(document.documentElement.dataset["loreWeather"]).toBe("mist");

    fireEvent.click(region.getByRole("tab", { name: /Present/i }));
    expect(document.documentElement.dataset["loreEra"]).toBe("nila-present");
    expect(document.documentElement.dataset["loreWeather"]).toBe("snow");

    // Selecting Aethmos sets weather to rain
    fireEvent.click(region.getByRole("button", { name: /Aethmos/i }));
    expect(document.documentElement.dataset["loreLocation"]).toBe("aethmos");
    expect(document.documentElement.dataset["loreWeather"]).toBe("rain");

    // Inline location weather pill toggles ambient atmosphere on/off
    const inlineToggle = region.getByRole("button", { name: /Rainfall: ON/i });
    fireEvent.click(inlineToggle);
    expect(document.documentElement.dataset["ambientAtmosphere"]).toBe("off");
  });
});
