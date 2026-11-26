import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const motion = vi.hoisted(() => ({ motionActive: true }));
vi.mock("@/hooks/use-app-motion", () => ({ useAppMotion: () => motion }));

describe("Style entry animation", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    motion.motionActive = true;
  });

  it("plays when switching into Nexus or Codex, not on first load or other styles", async () => {
    vi.useFakeTimers();
    const { StyleEntry } = await import("@/components/style-entry");
    const view = render(<StyleEntry mode="codex" />);
    expect(screen.queryByTestId("style-entry")).toBeNull();

    view.rerender(<StyleEntry mode="classic" />);
    expect(screen.queryByTestId("style-entry")).toBeNull();

    view.rerender(<StyleEntry mode="nexus" />);
    expect(screen.getByTestId("style-entry")).toHaveAttribute("data-style", "nexus");
    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(screen.queryByTestId("style-entry")).toBeNull();

    view.rerender(<StyleEntry mode="codex" />);
    expect(screen.getByTestId("style-entry")).toHaveAttribute("data-style", "codex");
    expect(screen.getByTestId("style-entry")).toHaveTextContent(
      "Welcome to the Sentinels Universe",
    );
  });

  it("is a short static card when motion is off", async () => {
    vi.useFakeTimers();
    motion.motionActive = false;
    const { StyleEntry } = await import("@/components/style-entry");
    const view = render(<StyleEntry mode="classic" />);
    view.rerender(<StyleEntry mode="codex" />);
    expect(screen.getByTestId("style-entry")).toHaveAttribute("data-motion", "off");
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(screen.queryByTestId("style-entry")).toBeNull();
  });
});
