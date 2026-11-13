import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ATLAS,
  computeFitDimensions,
  WORLD_IMAGE_HEIGHT,
  WORLD_IMAGE_WIDTH,
} from "@/lib/nexus-atlas";
import { AtlasOverlay, NexusAtlas } from "@/components/nexus-atlas";
import { LoreLocations } from "@/components/lore-locations";
import { AppearanceProvider } from "@/hooks/use-appearance";

vi.mock("@/lib/ui-style", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ui-style")>();
  return {
    ...actual,
    useUiStyle: () => "nexus",
  };
});

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

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AppearanceProvider>{ui}</AppearanceProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true, writable: true });

  vi.stubGlobal(
    "ResizeObserver",
    class MockResizeObserver {
      cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(target: Element) {
        this.cb(
          [
            {
              target,
              contentRect: {
                width: 1200,
                height: 800,
                top: 0,
                left: 0,
                bottom: 800,
                right: 1200,
                x: 0,
                y: 0,
                toJSON: () => ({}),
              } as DOMRectReadOnly,
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            },
          ],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
      unobserve() {}
    },
  );
});

describe("Atlas fit-to-screen geometry and realm dataset", () => {
  it("computes exact non-cropping fit dimensions for both landscape and portrait maps", () => {
    const landscapeDesktop = computeFitDimensions(1280, 720, 1536, 1024);
    expect(landscapeDesktop.width).toBe(1080);
    expect(landscapeDesktop.height).toBe(720);
    expect(landscapeDesktop.width).toBeGreaterThan(landscapeDesktop.height);

    const landscapeMobile = computeFitDimensions(390, 844, 1536, 1024);
    expect(landscapeMobile.width).toBe(390);
    expect(landscapeMobile.height).toBe(260);
    expect(landscapeMobile.width).toBeLessThanOrEqual(390);
    expect(landscapeMobile.height).toBeLessThanOrEqual(844);

    const portraitDesktop = computeFitDimensions(1280, 720, WORLD_IMAGE_WIDTH, WORLD_IMAGE_HEIGHT);
    expect(portraitDesktop.height).toBe(720);
    expect(portraitDesktop.width).toBeLessThan(portraitDesktop.height);
    expect(portraitDesktop.width).toBeLessThanOrEqual(1280);
  });

  it("includes 8 realms with Pocket Dimension, Istanbul (1417 + Present), Rome (15th + Present), and 15th-century Romania", () => {
    expect(ATLAS).toHaveLength(8);

    const pocket = ATLAS.find((r) => r.id === "pocket-dimension");
    expect(pocket).toBeDefined();
    expect(pocket!.eras[0]!.width).toBe(1536);
    expect(pocket!.eras[0]!.height).toBe(1024);

    const istanbul = ATLAS.find((r) => r.id === "istanbul-1417");
    expect(istanbul).toBeDefined();
    expect(istanbul!.name).toBe("Istanbul");
    expect(istanbul!.eras.map((e) => e.id)).toEqual(["1417", "present"]);

    const rome = ATLAS.find((r) => r.id === "rome");
    expect(rome).toBeDefined();
    expect(rome!.name).toBe("Rome");
    expect(rome!.eras.map((e) => e.id)).toEqual(["15th-century", "present"]);

    const romania = ATLAS.find((r) => r.id === "romania-15th");
    expect(romania).toBeDefined();
    expect(romania!.name).toBe("Romania");
    expect(romania!.eras[0]!.id).toBe("15th-century");

    for (const loc of ATLAS) {
      for (const era of loc.eras) {
        expect(era.width).toBeGreaterThan(0);
        expect(era.height).toBeGreaterThan(0);
        for (const pin of era.landmarks) {
          expect(pin.x).toBeGreaterThanOrEqual(0);
          expect(pin.x).toBeLessThanOrEqual(100);
          expect(pin.y).toBeGreaterThanOrEqual(0);
          expect(pin.y).toBeLessThanOrEqual(100);
        }
      }
      for (const pin of loc.top.landmarks) {
        expect(pin.x).toBeGreaterThanOrEqual(0);
        expect(pin.x).toBeLessThanOrEqual(100);
        expect(pin.y).toBeGreaterThanOrEqual(0);
        expect(pin.y).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("Interactive AtlasOverlay & LoreLocations", () => {
  it("fits Pocket Dimension horizontally inside viewport with landscape proportions and supports landmark tour", () => {
    renderWithProviders(<AtlasOverlay start="pocket-dimension" onClose={() => {}} />);

    const stage = screen.getByTestId("atlas-fit-stage");
    expect(stage.getAttribute("data-map-aspect")).toBe("1536x1024");
    expect(parseFloat(stage.style.width)).toBe(1200);
    expect(parseFloat(stage.style.height)).toBe(800);

    fireEvent.click(screen.getByRole("button", { name: "Next landmark" }));
    expect(screen.getAllByText(/Citadel|Rift|Vortex|Sanctuary|Wall/i).length).toBeGreaterThan(0);
  });

  it("supports switching between 1417 Ottoman and Present eras plus split comparison in Istanbul", () => {
    renderWithProviders(<AtlasOverlay start="istanbul-1417" onClose={() => {}} />);

    expect(screen.getByRole("tab", { name: /1417/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Present/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Present/i }));
    expect(screen.getAllByRole("button", { name: /Bosphorus Bridge/i }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Compare/i }));
    const slider = screen.getByRole("slider", { name: "Compare era split" });
    expect(slider).toBeInTheDocument();
    fireEvent.change(slider, { target: { value: "35" } });
    expect((slider as HTMLInputElement).value).toBe("35");
  });

  it("supports Rome (15th Century & Present) and 15th-century Romania views", async () => {
    renderWithProviders(<AtlasOverlay start="rome" onClose={() => {}} />);
    expect(screen.getByRole("tab", { name: /15th Century/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Present/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Romania" }));
    await waitFor(
      () => {
        const romaniaStage = screen.getByTestId("atlas-fit-stage");
        expect(romaniaStage.getAttribute("data-map-aspect")).toBe("1264x848");
        expect(screen.getAllByText(/Wallachia|Transylvania/i).length).toBeGreaterThan(0);
      },
      { timeout: 2500 },
    );
  });

  it("renders all 8 realm cards in NexusAtlas gallery and exposes interactive World & Eras selector", () => {
    renderWithProviders(
      <div>
        <NexusAtlas />
        <LoreLocations />
      </div>,
    );

    expect(screen.getAllByText(/8 Realms/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Open Interactive Map/i })).toBeInTheDocument();
  });
});
