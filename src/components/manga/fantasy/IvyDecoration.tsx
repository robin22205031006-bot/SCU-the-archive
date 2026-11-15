import { useOptionalThemeContext } from "@/context/ThemeContext";
import { useActiveGenre, useIsManga } from "@/hooks/use-ui-mode";
import { useAnimationsEnabled } from "@/lib/animations";

export interface IvyDecorationProps {
  /** Visual density variant tailored for compact cards vs larger panels */
  variant?: "card" | "compact";
  /** Optional className for container positioning adjustments */
  className?: string;
}

/**
 * Renders hanging, swaying botanical ivy vines anchored around card containers
 * using GPU-composited CSS `ivySway` keyframes whenever `manga` + `fantasy` mode is active.
 */
export function IvyDecoration({ variant = "card", className = "" }: IvyDecorationProps) {
  const themeCtx = useOptionalThemeContext();
  const isMangaMode = useIsManga();
  const activeGenre = useActiveGenre();
  const animationsEnabled = useAnimationsEnabled();

  const isMangaFantasy = themeCtx
    ? themeCtx.primarySystem === "manga" && themeCtx.mangaSubTheme === "fantasy"
    : isMangaMode && activeGenre === "fantasy";

  if (!isMangaFantasy) {
    return null;
  }

  const motionActive = animationsEnabled && !(themeCtx?.isMinimal ?? false);
  const isCompact = variant === "compact";

  return (
    <div
      aria-hidden="true"
      data-ivy-decoration="true"
      data-ivy-animated={motionActive ? "true" : "false"}
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
    >
      {/* Top-Left Draped Ivy Vine Cluster */}
      <svg
        viewBox="0 0 110 92"
        className={`absolute -left-1 -top-1 ${isCompact ? "h-14 w-16" : "h-20 w-24"} ${
          motionActive ? "ivy-sway" : ""
        }`}
        style={{
          transformOrigin: "top left",
          animation: motionActive ? "ivySway 6.8s ease-in-out infinite alternate" : "none",
        }}
        fill="none"
      >
        <path
          d="M-2 10 C18 6, 36 14, 58 24 C74 30, 88 26, 102 18"
          stroke="#7c653a"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M20 12 C16 32, 22 48, 15 68 C13 76, 16 82, 12 88"
          stroke="#c5a869"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        <path
          d="M44 19 C42 35, 48 48, 42 62"
          stroke="#2e5a52"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <path
          d="M19 28 C11 26, 8 33, 14 38 C19 36, 20 32, 19 28 Z"
          fill="#2e5a52"
          stroke="#c5a869"
          strokeWidth="0.8"
        />
        <path
          d="M17 48 C25 46, 28 53, 21 58 C17 56, 16 51, 17 48 Z"
          fill="#5ce1b8"
          fillOpacity="0.48"
          stroke="#c5a869"
          strokeWidth="0.8"
        />
        <path
          d="M14 70 C7 69, 6 76, 12 81 C16 78, 16 73, 14 70 Z"
          fill="#376e5f"
          stroke="#5ce1b8"
          strokeWidth="0.7"
        />
        <path
          d="M44 36 C51 35, 54 41, 48 45 C44 43, 43 39, 44 36 Z"
          fill="#5ce1b8"
          fillOpacity="0.42"
          stroke="#c5a869"
          strokeWidth="0.75"
        />
        <circle cx="12" cy="88" r="1.6" fill="#5ce1b8" fillOpacity="0.8" />
      </svg>

      {/* Top-Right Hanging Tendril Vine */}
      <svg
        viewBox="0 0 110 92"
        className={`absolute -right-1 -top-1 ${isCompact ? "h-14 w-16" : "h-20 w-24"} ${
          motionActive ? "ivy-pendulum-fast" : ""
        }`}
        style={{
          transformOrigin: "top right",
          animation: motionActive ? "ivySway 4.6s ease-in-out infinite alternate-reverse" : "none",
        }}
        fill="none"
      >
        <path
          d="M112 12 C90 8, 72 16, 48 24 C34 28, 22 24, 10 16"
          stroke="#7c653a"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <path
          d="M86 14 C91 34, 83 52, 90 72 C92 78, 90 84, 93 89"
          stroke="#c5a869"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        <path
          d="M64 20 C67 34, 60 47, 66 59"
          stroke="#2e5a52"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M88 31 C96 29, 98 36, 91 41 C87 38, 87 34, 88 31 Z"
          fill="#2e5a52"
          stroke="#c5a869"
          strokeWidth="0.8"
        />
        <path
          d="M87 54 C79 52, 77 59, 84 64 C88 61, 88 57, 87 54 Z"
          fill="#5ce1b8"
          fillOpacity="0.46"
          stroke="#c5a869"
          strokeWidth="0.8"
        />
        <path
          d="M64 38 C57 37, 55 43, 61 47 C65 45, 65 41, 64 38 Z"
          fill="#376e5f"
          stroke="#5ce1b8"
          strokeWidth="0.7"
        />
        <circle cx="93" cy="89" r="1.6" fill="#5ce1b8" fillOpacity="0.8" />
      </svg>

      {/* Bottom-Right Trailing Corner Sprout */}
      {!isCompact && (
        <svg
          viewBox="0 0 64 64"
          className={`absolute -bottom-0.5 -right-0.5 h-12 w-12 ${
            motionActive ? "ivy-sway-alt" : ""
          }`}
          style={{
            transformOrigin: "bottom right",
            animation: motionActive
              ? "ivySway 7.4s ease-in-out infinite alternate-reverse"
              : "none",
          }}
          fill="none"
        >
          <path
            d="M58 10 C55 30, 44 46, 16 58"
            stroke="#c5a869"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M48 39 C52 46, 48 52, 40 50 C42 44, 45 41, 48 39 Z"
            fill="#5ce1b8"
            fillOpacity="0.4"
            stroke="#c5a869"
            strokeWidth="0.85"
          />
          <path
            d="M34 50 C36 56, 30 59, 24 56 C27 52, 31 50, 34 50 Z"
            fill="#2e5a52"
            stroke="#5ce1b8"
            strokeWidth="0.75"
          />
        </svg>
      )}
    </div>
  );
}
