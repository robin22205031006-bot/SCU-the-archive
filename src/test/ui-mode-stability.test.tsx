import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useEffect, useState } from "react";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider, useUiMode, type VisualUiMode } from "@/hooks/use-ui-mode";

const ALL_MODES: readonly VisualUiMode[] = ["classic", "nexus", "minimal", "manga"];

function StabilityProbe({
  onMount,
  onUnmount,
}: {
  onMount: () => void;
  onUnmount: () => void;
}) {
  const { mode, setMode } = useUiMode();
  const [count, setCount] = useState(0);

  useEffect(() => {
    onMount();
    return () => {
      onUnmount();
    };
    // Run only on mount/unmount to catch tree remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="stability-probe" data-mode={mode}>
      <span data-testid="probe-count">{count}</span>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
      {ALL_MODES.map((m) => (
        <button key={m} type="button" onClick={() => setMode(m)}>
          switch-{m}
        </button>
      ))}
    </div>
  );
}

describe("UI mode switching stability", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("updates root dataset uiMode across all four modes without unmounting the child tree", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let mounts = 0;
    let unmounts = 0;

    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider>
              <StabilityProbe
                onMount={() => {
                  mounts += 1;
                }}
                onUnmount={() => {
                  unmounts += 1;
                }}
              />
            </UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);

    fireEvent.click(screen.getByText("Increment"));
    fireEvent.click(screen.getByText("Increment"));
    expect(screen.getByTestId("probe-count").textContent).toBe("2");

    for (const target of ["nexus", "minimal", "manga", "classic"] as const) {
      act(() => {
        fireEvent.click(screen.getByText(`switch-${target}`));
      });
      expect(document.documentElement.dataset["uiMode"]).toBe(target);
      expect(screen.getByTestId("stability-probe").dataset["mode"]).toBe(target);
      expect(screen.getByTestId("probe-count").textContent).toBe("2");
      expect(mounts).toBe(1);
      expect(unmounts).toBe(0);
    }
  });
});
