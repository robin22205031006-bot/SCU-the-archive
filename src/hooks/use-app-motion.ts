import {
  useOptionalThemeContext,
  type MangaSubTheme,
  type PrimarySystem,
} from "@/context/ThemeContext";
import { useOptionalUIState } from "@/context/UIStateContext";
import { useOptionalUiMode } from "@/hooks/use-ui-mode";
import { useAnimationsEnabled } from "@/lib/animations";
import { getThemeMotionSpec, type ThemeMotionSpec } from "@/lib/motionVariants";

export interface AppMotionState {
  primarySystem: PrimarySystem;
  mangaSubTheme: MangaSubTheme | null;
  isMinimal: boolean;
  animationsEnabled: boolean;
  motionActive: boolean;
  spec: ThemeMotionSpec;
}

/**
 * Resolves the active Framer Motion specification for the entire app.
 * Automatically disables Framer Motion when `minimal` primary system is active
 * or when global animations are paused.
 */
export function useAppMotion(): AppMotionState {
  const uiMode = useOptionalUiMode();
  const themeCtx = useOptionalThemeContext();
  const uiState = useOptionalUIState();
  const animationsEnabled = useAnimationsEnabled();

  const primarySystem: PrimarySystem =
    themeCtx?.primarySystem ??
    uiState?.mode ??
    (uiMode?.mode as PrimarySystem | undefined) ??
    "classic";
  const mangaSubTheme: MangaSubTheme | null =
    primarySystem === "manga" ? (themeCtx?.mangaSubTheme ?? null) : null;
  const isMinimal = primarySystem === "minimal";
  const motionActive = !isMinimal && animationsEnabled;
  const spec = getThemeMotionSpec(primarySystem, mangaSubTheme);

  return {
    primarySystem,
    mangaSubTheme,
    isMinimal,
    animationsEnabled,
    motionActive,
    spec,
  };
}
