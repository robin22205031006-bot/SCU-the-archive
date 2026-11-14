import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppearanceProvider, useAppearance } from "@/hooks/use-appearance";
import { TypographyProvider, useTypography } from "@/hooks/use-typography";
import { UIModeProvider, UiModeProvider, useUIMode, useUiMode } from "@/hooks/use-ui-mode";
import { UIStateProvider, useUIState } from "@/context/UIStateContext";

function RootProviderProbe() {
  const uiMode = useUiMode();
  const uiModeAlias = useUIMode();
  const uiState = useUIState();
  const appearance = useAppearance();
  const typography = useTypography();

  return (
    <div>
      <span data-testid="ui-mode">{uiMode.mode}</span>
      <span data-testid="ui-mode-alias">{uiModeAlias.mode}</span>
      <span data-testid="ui-state-mode">{uiState.mode}</span>
      <span data-testid="theme">{appearance.theme}</span>
      <span data-testid="body-font">{typography.settings.bodyFont}</span>
    </div>
  );
}

describe("Root provider tree resolution", () => {
  afterEach(() => {
    cleanup();
  });

  it("resolves useUiMode, useUIMode, useUIState, useAppearance, and useTypography without duplicate context or circular errors", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    expect(UIModeProvider).toBe(UiModeProvider);
    expect(useUIMode).toBe(useUiMode);

    render(
      <QueryClientProvider client={qc}>
        <AppearanceProvider>
          <TypographyProvider>
            <UiModeProvider>
              <UIStateProvider applyAttributesToHtml={false}>
                <RootProviderProbe />
              </UIStateProvider>
            </UiModeProvider>
          </TypographyProvider>
        </AppearanceProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByTestId("ui-mode").textContent).toBe("classic");
    expect(screen.getByTestId("ui-mode-alias").textContent).toBe("classic");
    expect(screen.getByTestId("ui-state-mode").textContent).toBe("classic");
    expect(screen.getByTestId("theme").textContent).toBeTruthy();
    expect(screen.getByTestId("body-font").textContent).toBeTruthy();
  });
});
