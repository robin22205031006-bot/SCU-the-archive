import { useId, type ComponentType, type ReactNode } from "react";
import type { GenreThemeId } from "@/lib/genre-themes";
import { MANGA_SCALE } from "@/lib/manga-scale";
import { COMBAT_STATS, type CombatStats } from "@/lib/combat-stats";
import { useAnimationsEnabled } from "@/lib/animations";

/* ───────────────────────────────────────────────────────────────────────────
   1. Card Corner Filigree & Border Decorations (Inspired by Fantasy / Xianxia / Anime UI)
   ─────────────────────────────────────────────────────────────────────────── */

export function GenreFrameVfx({
  theme,
  compact = false,
}: {
  theme: GenreThemeId | null;
  compact?: boolean;
}) {
  const animationsOn = useAnimationsEnabled();
  const active = theme ?? "manga-ink";
  if (!animationsOn) return null;

  if (active === "shonen") {
    return (
      <div
        aria-hidden="true"
        data-frame-vfx="shonen"
        data-vfx-type="sword-slash"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <svg
          viewBox="0 0 120 56"
          className={`frame-vfx-slash absolute right-1 top-0 ${
            compact ? "h-8 w-20" : "h-12 w-32"
          } text-primary drop-shadow-[0_0_8px_var(--primary)]`}
          fill="none"
        >
          <path
            d="M4 44 C36 28, 72 16, 114 6 C86 22, 48 35, 10 48 Z"
            fill="currentColor"
            fillOpacity="0.45"
          />
          <path d="M12 42 Q64 20 112 8" stroke="var(--accent)" strokeWidth="1.6" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          className="frame-vfx-spark absolute bottom-2 right-2 h-4 w-4 text-[var(--genre-gold,#eab308)]"
          fill="currentColor"
        >
          <polygon points="12,1 14,9 22,12 14,15 12,23 10,15 2,12 10,9" />
        </svg>
      </div>
    );
  }

  if (active === "fantasy") {
    return (
      <div
        aria-hidden="true"
        data-frame-vfx="fantasy"
        data-vfx-type="butterfly-magic"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {/* Fluttering golden butterfly silhouette (Pic 7 & Pic 8 inspo) */}
        <svg
          viewBox="0 0 28 24"
          className={`frame-vfx-butterfly absolute right-3 top-2 ${
            compact ? "h-4 w-4" : "h-5 w-6"
          } text-[var(--genre-gold,#d4af37)] drop-shadow-[0_0_6px_rgba(212,175,55,0.65)]`}
          fill="currentColor"
        >
          <path d="M14 12 C9 4, 2 5, 4 12 C2 17, 9 19, 14 14 C19 19, 26 17, 24 12 C26 5, 19 4, 14 12 Z" />
        </svg>
        <svg
          viewBox="0 0 18 18"
          className="frame-vfx-magic-pulse absolute bottom-2 left-3 h-3 w-3 text-[var(--genre-gold,#d4af37)]"
          fill="currentColor"
        >
          <polygon points="9,1 11,7 17,9 11,11 9,17 7,11 1,9 7,7" />
        </svg>
      </div>
    );
  }

  if (active === "isekai") {
    return (
      <div
        aria-hidden="true"
        data-frame-vfx="isekai"
        data-vfx-type="astrolabe-runes"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {/* Rotating astrolabe dial + pulsing rune glyph (Pic 1 & Pic 2 inspo) */}
        <svg
          viewBox="0 0 36 36"
          className={`frame-vfx-rune-tick absolute right-1.5 top-1.5 ${
            compact ? "h-5 w-5" : "h-8 w-8"
          } text-[var(--genre-gold,#e09f3e)] opacity-80`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <circle cx="18" cy="18" r="14" strokeDasharray="4 3" />
          <polygon points="18,6 28,24 8,24" strokeOpacity="0.65" />
          <circle cx="18" cy="18" r="3" fill="var(--accent)" stroke="none" />
        </svg>
        <svg
          viewBox="0 0 20 20"
          className="frame-vfx-magic-pulse absolute bottom-2 left-2.5 h-3.5 w-3.5 text-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M10 2 L16 8 L10 18 L4 8 Z" />
          <circle cx="10" cy="9" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }

  if (active === "dark-fantasy") {
    return (
      <div
        aria-hidden="true"
        data-frame-vfx="dark-fantasy"
        data-vfx-type="arcane-slash"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {/* Stepped shadow-blade rift slash + glowing rune glyph (Pic 2 & Pic 8 inspo) */}
        <svg
          viewBox="0 0 110 48"
          className={`frame-vfx-slash absolute left-1 top-1 ${
            compact ? "h-7 w-16" : "h-10 w-28"
          } text-accent drop-shadow-[0_0_8px_var(--primary)]`}
          fill="none"
        >
          <path
            d="M6 38 Q56 14 104 6 L88 18 Q48 28 12 42 Z"
            fill="var(--primary)"
            fillOpacity="0.35"
          />
          <path d="M8 38 L100 8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <svg
          viewBox="0 0 22 22"
          className="frame-vfx-spark absolute bottom-2 right-2.5 h-4 w-4 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M11 2 L16 11 L11 20 L6 11 Z" />
          <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
          <circle cx="17" cy="17" r="1" fill="currentColor" stroke="none" />
        </svg>
      </div>
    );
  }

  if (active === "ghibli") {
    return (
      <div
        aria-hidden="true"
        data-frame-vfx="ghibli"
        data-vfx-type="flying-birds"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {/* Frame-by-frame flying swallow birds + gentle meadow sparkle (Pic 6 inspo) */}
        <svg
          viewBox="0 0 32 20"
          className={`frame-vfx-bird absolute left-2 top-2 ${
            compact ? "h-3.5 w-6" : "h-5 w-8"
          } text-primary/85`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M3 13 C8 6, 13 6, 16 11 C19 6, 24 6, 29 13" />
          <path d="M16 11 L13 16" strokeWidth="1.2" />
        </svg>
        {!compact && (
          <svg
            viewBox="0 0 24 16"
            className="frame-vfx-bird absolute left-10 top-5 h-4 w-6 text-accent/70"
            style={{ animationDelay: "1.3s" }}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          >
            <path d="M2 10 C6 5, 10 5, 12 9 C14 5, 18 5, 22 10" />
          </svg>
        )}
      </div>
    );
  }

  if (active === "xianxia") {
    return (
      <div
        aria-hidden="true"
        data-frame-vfx="xianxia"
        data-vfx-type="crane-qi-sweep"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {/* Flying crane silhouette & jade qi spark along scroll corners (Pic 5 & Pic 6 inspo) */}
        <svg
          viewBox="0 0 34 22"
          className={`frame-vfx-bird absolute left-2 top-1.5 ${
            compact ? "h-4 w-6" : "h-5 w-8"
          } text-[var(--genre-gold,#d6b26a)]`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M3 14 Q11 5 17 11 Q23 5 31 12" />
          <path d="M17 11 L24 15" />
        </svg>
        <svg
          viewBox="0 0 18 18"
          className="frame-vfx-magic-pulse absolute bottom-2 right-3 h-3.5 w-3.5 text-accent"
          fill="currentColor"
        >
          <circle cx="9" cy="9" r="2.2" />
          <circle cx="4" cy="6" r="1" opacity="0.65" />
          <circle cx="14" cy="13" r="1" opacity="0.65" />
        </svg>
      </div>
    );
  }

  if (active === "cyber-anime") {
    return (
      <div
        aria-hidden="true"
        data-frame-vfx="cyber-anime"
        data-vfx-type="meteor-scan"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        {/* Stepped shooting constellation meteor streak & lunar ping (Pic 7 inspo) */}
        <div
          className={`frame-vfx-meteor-scan absolute left-0 top-2 ${
            compact ? "h-[1.5px] w-16" : "h-[2px] w-28"
          } rounded-full bg-gradient-to-r from-transparent via-primary to-accent shadow-[0_0_8px_var(--primary)]`}
        />
        <svg
          viewBox="0 0 18 18"
          className="frame-vfx-magic-pulse absolute bottom-2 right-2.5 h-3.5 w-3.5 text-primary"
          fill="currentColor"
        >
          <polygon points="9,1 11,7 17,9 11,11 9,17 7,11 1,9 7,7" />
        </svg>
      </div>
    );
  }

  // Manga Ink: crisp sumi slash + crimson impact glint
  return (
    <div
      aria-hidden="true"
      data-frame-vfx="manga-ink"
      data-vfx-type="ink-slash"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <svg
        viewBox="0 0 90 36"
        className={`frame-vfx-slash absolute right-1 top-1 ${
          compact ? "h-5 w-12" : "h-8 w-20"
        } text-primary/70`}
        fill="currentColor"
      >
        <path d="M6 28 L82 4 L66 16 L10 32 Z" />
      </svg>
    </div>
  );
}

export function GenreCardFrame({
  theme,
  compact = false,
  className = "",
}: {
  theme: GenreThemeId | null;
  compact?: boolean;
  className?: string;
}) {
  if (!theme) return null;

  const size = compact ? "h-5 w-5" : "h-7 w-7";

  if (theme === "manga-ink") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="manga-ink"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <span className="absolute left-1 top-1 h-2 w-2 border-l-2 border-t-2 border-foreground/70" />
        <span className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-primary/80" />
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  if (theme === "xianxia") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="xianxia"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <div className="absolute inset-[3px] rounded-[inherit] border border-[var(--genre-gold,#d6b26a)]/45" />
        {/* Sculpted Jade Cloud-scroll corners & lotus gem crest (Pic 5 & Pic 6 inspo) */}
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <svg
            key={corner}
            viewBox="0 0 36 36"
            className={`absolute ${size} text-[var(--genre-gold,#d6b26a)] opacity-90 ${
              corner === "tl"
                ? "left-1 top-1"
                : corner === "tr"
                  ? "right-1 top-1 -scale-x-100"
                  : corner === "bl"
                    ? "bottom-1 left-1 -scale-y-100"
                    : "bottom-1 right-1 scale-x-[-1] scale-y-[-1]"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M2 20V8Q2 2 8 2H20" />
            <path d="M5 13C5 7.5 9.5 5.5 13.5 6C16 6.2 17 8.4 15.2 10C13.8 11.4 11.4 10.4 11.4 8.6" />
            <polygon points="5,3 7,5 5,7 3,5" fill="var(--accent)" stroke="none" />
          </svg>
        ))}
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  if (theme === "fantasy") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="fantasy"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-[#5ce1b8]/10 via-[#c5a869]/10 to-transparent" />
        {/* Double-lined antique brass borders */}
        <div className="absolute inset-[3px] rounded-[inherit] border border-[#c5a869]/75" />
        <div className="absolute inset-[7px] rounded-[inherit] border border-[#c5a869]/30" />
        {/* Animated swaying ivy vines & pressed leaves (top-left & bottom-right) */}
        <svg
          viewBox="0 0 64 64"
          className="ivy-sway absolute -left-0.5 -top-0.5 h-12 w-12 origin-top-left text-[#2e5a52] drop-shadow-[0_0_6px_rgba(92,225,184,0.35)]"
          fill="none"
        >
          <path
            d="M4 54 C6 34, 16 18, 46 6 C26 14, 14 26, 8 44"
            stroke="#c5a869"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M14 24 C10 16, 14 10, 22 12 C20 18, 17 22, 14 24 Z"
            fill="#5ce1b8"
            fillOpacity="0.45"
            stroke="#c5a869"
            strokeWidth="0.9"
          />
          <path
            d="M27 14 C25 8, 31 4, 37 7 C34 12, 30 14, 27 14 Z"
            fill="#2e5a52"
            fillOpacity="0.85"
            stroke="#5ce1b8"
            strokeWidth="0.8"
          />
          <path
            d="M8 38 C3 34, 4 27, 11 28 C11 33, 10 36, 8 38 Z"
            fill="#2e5a52"
            fillOpacity="0.8"
            stroke="#c5a869"
            strokeWidth="0.8"
          />
          <circle cx="19" cy="18" r="1.4" fill="#5ce1b8" />
        </svg>
        <svg
          viewBox="0 0 64 64"
          className="ivy-sway-alt absolute -bottom-0.5 -right-0.5 h-12 w-12 origin-bottom-right rotate-180 text-[#2e5a52] drop-shadow-[0_0_6px_rgba(92,225,184,0.35)]"
          fill="none"
        >
          <path
            d="M4 54 C6 34, 16 18, 46 6"
            stroke="#c5a869"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M14 24 C10 16, 14 10, 22 12 C20 18, 17 22, 14 24 Z"
            fill="#5ce1b8"
            fillOpacity="0.42"
            stroke="#c5a869"
            strokeWidth="0.9"
          />
          <path
            d="M28 13 C26 7, 32 4, 38 7 C35 11, 31 13, 28 13 Z"
            fill="#2e5a52"
            fillOpacity="0.85"
            stroke="#5ce1b8"
            strokeWidth="0.8"
          />
        </svg>
        {(["tr", "bl"] as const).map((corner) => (
          <svg
            key={corner}
            viewBox="0 0 32 32"
            className={`absolute ${size} text-[#c5a869] drop-shadow-[0_0_6px_rgba(197,168,105,0.45)] ${
              corner === "tr" ? "right-1 top-1 -scale-x-100" : "bottom-1 left-1 -scale-y-100"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <path d="M3 17C3 8 8 3 17 3" />
            <path d="M6 13C7 8 9 6 13 6" />
            <polygon points="7,4 9,7 7,10 5,7" fill="#5ce1b8" stroke="none" />
          </svg>
        ))}
        {!compact && (
          <svg
            viewBox="0 0 40 16"
            className="absolute left-1/2 top-0.5 h-4 w-10 -translate-x-1/2 text-[#c5a869] drop-shadow-[0_0_8px_rgba(92,225,184,0.5)]"
          >
            <path d="M8 12 L13 4 L20 9 L27 4 L32 12 Z" fill="currentColor" fillOpacity="0.85" />
            <polygon points="20,1 23,5 20,10 17,5" fill="#5ce1b8" />
          </svg>
        )}
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  if (theme === "isekai") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="isekai"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <div className="absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-amber-100/20 via-teal-200/5 to-transparent" />
        <div className="absolute inset-[3px] rounded-[inherit] border border-[var(--genre-gold,#e09f3e)]/50" />
        {/* Brass rivets & notched guild clockwork bevels (Pic 1 & Pic 8 inspo) */}
        {(["left-2 top-2", "right-2 top-2", "left-2 bottom-2", "right-2 bottom-2"] as const).map(
          (pos, idx) => (
            <span
              key={pos}
              className={`absolute ${pos} h-2 w-2 rotate-45 border ${
                idx % 2 === 0
                  ? "border-[var(--genre-gold,#e09f3e)] bg-[var(--genre-gold,#e09f3e)]/80 shadow-[0_0_8px_var(--genre-gold,#e09f3e)]"
                  : "border-accent bg-accent/75 shadow-[0_0_8px_var(--accent)]"
              }`}
            />
          ),
        )}
        <span className="absolute inset-x-8 top-[2px] h-[2px] bg-gradient-to-r from-transparent via-[var(--genre-gold,#e09f3e)] to-transparent opacity-80" />
        <span className="absolute inset-x-12 bottom-[2px] h-[1px] bg-gradient-to-r from-transparent via-accent/65 to-transparent" />
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  if (theme === "dark-fantasy") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="dark-fantasy"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <div className="absolute inset-x-0 top-0 h-[36%] bg-gradient-to-b from-purple-400/14 to-transparent" />
        <div className="absolute inset-[3px] rounded-[inherit] border border-primary/50 shadow-[inset_0_0_16px_rgba(168,85,247,0.14)]" />
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <svg
            key={corner}
            viewBox="0 0 32 32"
            className={`absolute ${size} text-primary drop-shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_55%,transparent)] ${
              corner === "tl"
                ? "left-1 top-1"
                : corner === "tr"
                  ? "right-1 top-1 -scale-x-100"
                  : corner === "bl"
                    ? "bottom-1 left-1 -scale-y-100"
                    : "bottom-1 right-1 scale-x-[-1] scale-y-[-1]"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            {/* Angular glowing carved rune strokes + thorny gothic bevel (Pic 2 & Pic 8 inspo) */}
            <path d="M2 20L6 6L20 2" />
            <path d="M6 14 L11 8 L14 11 L9 17" />
            <circle cx="8" cy="8" r="1.2" fill="var(--accent)" stroke="none" />
          </svg>
        ))}
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  if (theme === "ghibli") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="ghibli"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-amber-200/18 blur-xl" />
        <div className="absolute inset-[4px] rounded-[inherit] border border-primary/35" />
        {/* Ivy-entwined botanical sprig corners (Pic 3 & Pic 6 inspo) */}
        <svg
          viewBox="0 0 40 40"
          className={`absolute left-1 top-1 ${size} text-primary/80`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M4 28C6 16 14 8 28 5" />
          <path
            d="M11 17C8 12 11 7 16 9C15 14 13 16 11 17Z"
            fill="currentColor"
            fillOpacity="0.3"
          />
          <path d="M19 10C18 6 22 3 26 6C24 9 21 10 19 10Z" fill="currentColor" fillOpacity="0.3" />
        </svg>
        <svg
          viewBox="0 0 40 40"
          className={`absolute bottom-1 right-1 ${size} rotate-180 text-primary/80`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M4 28C6 16 14 8 28 5" />
          <path
            d="M11 17C8 12 11 7 16 9C15 14 13 16 11 17Z"
            fill="currentColor"
            fillOpacity="0.3"
          />
        </svg>
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  if (theme === "cyber-anime") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="cyber-anime"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-sky-200/20 via-indigo-300/6 to-transparent" />
        <div className="absolute inset-[3px] rounded-[inherit] border border-primary/55" />
        {/* Chamfered crescent & constellation node corners (Pic 7 inspo) */}
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <svg
            key={corner}
            viewBox="0 0 28 28"
            className={`absolute ${compact ? "h-4 w-4" : "h-5 w-5"} text-primary drop-shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_60%,transparent)] ${
              corner === "tl"
                ? "left-1 top-1"
                : corner === "tr"
                  ? "right-1 top-1 -scale-x-100"
                  : corner === "bl"
                    ? "bottom-1 left-1 -scale-y-100"
                    : "bottom-1 right-1 scale-x-[-1] scale-y-[-1]"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 14L6 6L14 2" />
            <circle cx="8" cy="8" r="2.2" fill="currentColor" fillOpacity="0.7" stroke="none" />
          </svg>
        ))}
        {!compact && (
          <svg
            viewBox="0 0 24 24"
            className="absolute left-1/2 top-0.5 h-3.5 w-3.5 -translate-x-1/2 text-primary drop-shadow-[0_0_8px_var(--primary)]"
          >
            <path
              d="M14 4A8 8 0 1 0 20 16A6.2 6.2 0 1 1 14 4Z"
              fill="currentColor"
              fillOpacity="0.9"
            />
          </svg>
        )}
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  if (theme === "shonen") {
    return (
      <div
        aria-hidden="true"
        data-genre-decoration="shonen"
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        <span className="absolute left-0 top-0 h-3 w-3 border-l-[3px] border-t-[3px] border-primary" />
        <span className="absolute right-0 top-0 h-3 w-3 border-r-[3px] border-t-[3px] border-[var(--genre-accent-2,#38bdf8)]" />
        <span className="absolute bottom-0 left-0 h-3 w-3 border-b-[3px] border-l-[3px] border-[var(--genre-accent-2,#38bdf8)]" />
        <span className="absolute bottom-0 right-0 h-3 w-3 border-b-[3px] border-r-[3px] border-primary" />
        <span
          className="pointer-events-none absolute right-0 top-0 h-8 w-8 bg-primary/20"
          style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
        />
        <GenreFrameVfx theme={theme} compact={compact} />
      </div>
    );
  }

  return null;
}

/* ───────────────────────────────────────────────────────────────────────────
   2. Ornate SVG Dividers per Theme
   ─────────────────────────────────────────────────────────────────────────── */

export function GenreDivider({
  theme,
  label,
  className = "",
}: {
  theme: GenreThemeId | null;
  label?: string;
  className?: string;
}) {
  if (!theme || theme === "manga-ink") {
    return (
      <div className={`my-2 flex items-center gap-2 ${className}`} aria-hidden="true">
        <span className="h-[2px] flex-1 bg-foreground/75" />
        {label && (
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest">{label}</span>
        )}
        <span className="h-[2px] flex-1 bg-foreground/75" />
      </div>
    );
  }

  return (
    <div className={`my-2 flex items-center gap-2.5 ${className}`} aria-hidden="true">
      <span
        className="h-[1px] flex-1"
        style={{
          background: "linear-gradient(to right, transparent, var(--genre-gold, var(--primary)))",
        }}
      />
      {theme === "cyber-anime" ? (
        <span className="flex items-center gap-1.5 text-primary">
          <span className="h-1 w-1 rounded-full bg-current" />
          <svg viewBox="0 0 16 16" className="h-3 w-3">
            <path d="M10 2A6 6 0 1 0 14 11A4.5 4.5 0 1 1 10 2Z" fill="currentColor" />
          </svg>
          {label && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              {label}
            </span>
          )}
          <span className="h-1 w-1 rounded-full bg-current" />
        </span>
      ) : theme === "xianxia" ? (
        <span className="flex items-center gap-1.5 text-[var(--genre-gold,#d6b26a)]">
          <svg
            viewBox="0 0 36 12"
            className="h-3 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          >
            <path d="M2 6C6 6 7 2 11 3C13 3.5 13 7 10 7" />
            <polygon points="18,2 22,6 18,10 14,6" fill="currentColor" stroke="none" />
            <path d="M34 6C30 6 29 2 25 3C23 3.5 23 7 26 7" />
          </svg>
          {label && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              {label}
            </span>
          )}
        </span>
      ) : theme === "ghibli" ? (
        <span className="flex items-center gap-1.5 text-primary">
          <svg
            viewBox="0 0 24 12"
            className="h-3 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <path d="M2 6Q12 1 22 6" />
            <circle cx="12" cy="5.5" r="2" fill="currentColor" />
          </svg>
          {label && (
            <span className="font-mono text-[9px] font-semibold uppercase tracking-widest">
              {label}
            </span>
          )}
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-[var(--genre-gold,var(--primary))]">
          <span className="h-1.5 w-1.5 rotate-45 bg-current" />
          {label && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              {label}
            </span>
          )}
          <span className="h-1.5 w-1.5 rotate-45 bg-current" />
        </span>
      )}
      <span
        className="h-[1px] flex-1"
        style={{
          background: "linear-gradient(to left, transparent, var(--genre-gold, var(--primary)))",
        }}
      />
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   3. Theme-Specific Portrait Frame / Bezel (Diamond, Quatrefoil, Lunar, Orbital)
   ─────────────────────────────────────────────────────────────────────────── */

export function GenrePortraitFrame({
  theme,
  src,
  alt,
  fallback,
  size = "card",
}: {
  theme: GenreThemeId | null;
  src?: string | null;
  alt: string;
  fallback: string;
  size?: "card" | "dossier";
}) {
  const uid = useId().replace(/:/g, "");
  const isDossier = size === "dossier";

  const imgContent = src ? (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
    />
  ) : (
    <div
      className={`grid h-full w-full place-items-center font-display ${
        isDossier ? "text-5xl" : "text-2xl"
      }`}
    >
      {fallback}
    </div>
  );

  // Xianxia: Quatrefoil scalloped bezel + radiating sun rays
  if (theme === "xianxia") {
    const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
    return (
      <div className={`relative shrink-0 ${dim}`} data-portrait-frame="quatrefoil-sun">
        <svg
          viewBox="0 0 120 120"
          className="pointer-events-none absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] text-[var(--genre-gold,#d6b26a)]"
          aria-hidden="true"
        >
          {Array.from({ length: 16 }, (_, i) => {
            const ang = (i * Math.PI) / 8;
            const x1 = 60 + Math.cos(ang) * 48;
            const y1 = 60 + Math.sin(ang) * 48;
            const x2 = 60 + Math.cos(ang) * (i % 2 === 0 ? 58 : 53);
            const y2 = 60 + Math.sin(ang) * (i % 2 === 0 ? 58 : 53);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity={i % 2 === 0 ? "0.75" : "0.4"}
              />
            );
          })}
          <path
            d="M60 6 C72 18 98 16 104 34 C112 52 112 68 104 86 C98 104 72 102 60 114 C48 102 22 104 16 86 C8 68 8 52 16 34 C22 16 48 18 60 6 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <div
          className="relative h-full w-full overflow-hidden border border-[var(--genre-gold,#d6b26a)]/60 bg-secondary"
          style={{
            clipPath:
              "polygon(50% 2%, 78% 12%, 95% 28%, 98% 50%, 95% 72%, 78% 88%, 50% 98%, 22% 88%, 5% 72%, 2% 50%, 5% 28%, 22% 12%)",
          }}
        >
          {imgContent}
        </div>
      </div>
    );
  }

  // Cyber Anime: Lunar circular frame + orbiting crescent moon ring
  if (theme === "cyber-anime") {
    const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
    return (
      <div className={`relative shrink-0 ${dim}`} data-portrait-frame="lunar-circle">
        <div className="pointer-events-none absolute -inset-1.5 rounded-full border border-primary/50" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 top-1 grid h-4 w-4 place-items-center rounded-full border border-primary bg-card text-primary shadow-sm"
        >
          <span className="h-2 w-2 rounded-full bg-primary" />
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-0.5 bottom-2 h-2 w-2 rounded-full bg-accent"
        />
        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-primary/80 bg-secondary shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
          {imgContent}
        </div>
      </div>
    );
  }

  // Fantasy: Diamond chamfer bezel with star vertices
  if (theme === "fantasy") {
    const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
    return (
      <div className={`relative shrink-0 ${dim}`} data-portrait-frame="diamond-bezel">
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute -inset-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] text-[var(--genre-gold,#d4af37)]"
          aria-hidden="true"
        >
          <polygon
            points="50,3 97,50 50,97 3,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="50" cy="3" r="2.2" fill="currentColor" />
          <circle cx="97" cy="50" r="2.2" fill="currentColor" />
          <circle cx="50" cy="97" r="2.2" fill="currentColor" />
          <circle cx="3" cy="50" r="2.2" fill="currentColor" />
        </svg>
        <div
          className="relative h-full w-full overflow-hidden bg-secondary"
          style={{
            clipPath: isDossier
              ? "polygon(50% 2%, 98% 28%, 98% 72%, 50% 98%, 2% 72%, 2% 28%)"
              : "polygon(50% 2%, 98% 50%, 50% 98%, 2% 50%)",
          }}
        >
          {imgContent}
        </div>
      </div>
    );
  }

  // Isekai: Circular portrait with tilted brass astrolabe orbital rings
  if (theme === "isekai") {
    const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
    return (
      <div className={`relative shrink-0 ${dim}`} data-portrait-frame="mana-orbit">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-full border border-[var(--genre-gold,#e09f3e)]/65 [transform:rotate(-16deg)_scaleY(0.82)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full border border-accent/60 [transform:rotate(18deg)_scaleY(0.86)]"
        />
        <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-[var(--genre-gold,#e09f3e)] bg-secondary">
          {imgContent}
        </div>
      </div>
    );
  }

  // Dark Fantasy: Occult misty circular vignette with amethyst/crimson rune ring
  if (theme === "dark-fantasy") {
    const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
    return (
      <div className={`relative shrink-0 ${dim}`} data-portrait-frame="occult-ring">
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] text-primary"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeDasharray="6 3 2 3"
          />
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1"
          />
        </svg>
        <div
          className="relative h-full w-full overflow-hidden rounded-full border-2 border-primary bg-secondary"
          style={{
            boxShadow:
              "inset 0 0 18px rgba(0,0,0,0.65), 0 0 14px color-mix(in oklab, var(--primary) 35%, transparent)",
          }}
        >
          {imgContent}
        </div>
      </div>
    );
  }

  // Ghibli: Soft botanical oval arch with warm vignette
  if (theme === "ghibli") {
    const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
    return (
      <div className={`relative shrink-0 ${dim}`} data-portrait-frame="botanical-oval">
        <div className="relative h-full w-full overflow-hidden rounded-[999px] border-2 border-primary/50 bg-secondary shadow-sm">
          {imgContent}
        </div>
      </div>
    );
  }

  // Shonen: Slanted kinetic portrait frame with energy trim
  if (theme === "shonen") {
    const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
    return (
      <div className={`relative shrink-0 ${dim}`} data-portrait-frame="slash-cut">
        <div
          className="relative h-full w-full overflow-hidden border-2 border-primary bg-secondary shadow-[3px_3px_0_var(--foreground)]"
          style={{
            clipPath: `url(#${uid})`,
          }}
        >
          <svg width="0" height="0" className="absolute" aria-hidden="true">
            <defs>
              <clipPath id={uid} clipPathUnits="objectBoundingBox">
                <polygon points="0,0 1,0 0.92,1 0,1" />
              </clipPath>
            </defs>
          </svg>
          {imgContent}
        </div>
      </div>
    );
  }

  // Default / Manga Ink crisp ink plate
  const dim = isDossier ? MANGA_SCALE.portraitDossier : MANGA_SCALE.portraitCard;
  return (
    <div
      className={`manga-halftone relative shrink-0 overflow-hidden border-2 border-foreground bg-secondary ${dim}`}
      data-portrait-frame="ink-plate"
    >
      {imgContent}
    </div>
  );
}

/**
 * Sharp Diamond or Gothic Stone-Arch media frame wrapped in silver-teal & brass filigree,
 * flanked by vertical glowing status emblems (signature Fantasy viewer).
 */
export function GenreDiamondMediaFrame({
  theme,
  variant = "diamond",
  leftEmblemLabel = "✦",
  rightEmblemLabel = "✦",
  children,
  className = "",
}: {
  theme: GenreThemeId | null;
  variant?: "diamond" | "arch";
  leftEmblemLabel?: string;
  rightEmblemLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  if (theme !== "fantasy") {
    return <div className={`relative ${className}`}>{children}</div>;
  }

  return (
    <div
      data-media-frame={`fantasy-${variant}`}
      className={`relative flex items-center justify-center gap-2.5 sm:gap-4 ${className}`}
    >
      {/* Left Vertical Glowing Status Emblem */}
      <div aria-hidden="true" className="hidden shrink-0 flex-col items-center gap-1.5 sm:flex">
        <span className="h-8 w-[1.5px] bg-gradient-to-b from-transparent via-[#c5a869] to-[#5ce1b8]" />
        <div className="grid h-8 w-8 rotate-45 place-items-center border border-[#c5a869] bg-[#15221b] shadow-[0_0_14px_rgba(92,225,184,0.45)]">
          <span className="-rotate-45 font-mono text-[10px] font-bold text-[#5ce1b8]">
            {leftEmblemLabel}
          </span>
        </div>
        <span className="h-8 w-[1.5px] bg-gradient-to-t from-transparent via-[#2e5a52] to-[#5ce1b8]" />
      </div>

      {/* Central Silver-Teal & Brass Filigree Viewport */}
      <div
        className={`relative w-full overflow-hidden border-2 border-[#c5a869]/80 bg-[#111915] shadow-[0_14px_34px_rgba(0,0,0,0.45),0_0_24px_rgba(92,225,184,0.18)] ${
          variant === "arch" ? "fantasy-arch-viewport p-1.5" : "fantasy-diamond-viewport p-2"
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
        >
          {variant === "diamond" ? (
            <>
              <polygon
                points="50,2 98,50 50,98 2,50"
                fill="none"
                stroke="#5ce1b8"
                strokeOpacity="0.65"
                strokeWidth="0.9"
              />
              <polygon
                points="50,6 94,50 50,94 6,50"
                fill="none"
                stroke="#c5a869"
                strokeOpacity="0.85"
                strokeWidth="0.65"
              />
            </>
          ) : (
            <path
              d="M6,96 L6,42 C6,18 28,6 50,4 C72,6 94,18 94,42 L94,96 Z"
              fill="none"
              stroke="#5ce1b8"
              strokeOpacity="0.7"
              strokeWidth="0.9"
            />
          )}
        </svg>
        <div className="relative z-0 h-full w-full overflow-hidden">{children}</div>
      </div>

      {/* Right Vertical Glowing Status Emblem */}
      <div aria-hidden="true" className="hidden shrink-0 flex-col items-center gap-1.5 sm:flex">
        <span className="h-8 w-[1.5px] bg-gradient-to-b from-transparent via-[#c5a869] to-[#5ce1b8]" />
        <div className="grid h-8 w-8 rotate-45 place-items-center border border-[#c5a869] bg-[#15221b] shadow-[0_0_14px_rgba(92,225,184,0.45)]">
          <span className="-rotate-45 font-mono text-[10px] font-bold text-[#5ce1b8]">
            {rightEmblemLabel}
          </span>
        </div>
        <span className="h-8 w-[1.5px] bg-gradient-to-t from-transparent via-[#2e5a52] to-[#5ce1b8]" />
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   4. Theme-Specific Dossier Stat & Info Arrangement (Inspired by Images 5, 7, 8, 9, 14, 16)
   ─────────────────────────────────────────────────────────────────────────── */

export function GenreDossierProfilePanels({
  theme,
  affiliation,
  designation,
  alias,
  tierLabel,
  status,
  combatStats,
  abilities,
  captionBox,
}: {
  theme: GenreThemeId | null;
  affiliation: string;
  designation: string;
  alias: string;
  tierLabel?: string | null;
  status: string;
  combatStats: CombatStats | null;
  abilities: string[];
  captionBox?: (kicker: string, value: string, inverted?: boolean) => ReactNode;
}) {
  // Xianxia: 2x2 rounded cultivation plaques + Combat Style ribbon (Image 8)
  if (theme === "xianxia") {
    const plaques = [
      { title: "SECT / LINEAGE", value: affiliation || "Wandering Cultivator", symbol: "宗" },
      { title: "REALM / ROLE", value: designation || "Sentinel", symbol: "道" },
      { title: "TITLE / EPITHET", value: alias || "Unnamed", symbol: "号" },
      {
        title: "TIER & STATUS",
        value: [tierLabel, status].filter(Boolean).join(" · "),
        symbol: "印",
      },
    ];
    return (
      <div data-dossier-arrangement="xianxia-plaque" className="mt-3 space-y-3">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {plaques.map((p) => (
            <div
              key={p.title}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--genre-gold,#d6b26a)]/55 bg-background/70 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {p.title}
                </p>
                <p className="truncate text-xs font-semibold text-foreground">{p.value}</p>
              </div>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--genre-gold,#d6b26a)] bg-card font-serif text-xs font-bold text-[var(--genre-gold,#d6b26a)]">
                {p.symbol}
              </span>
            </div>
          ))}
        </div>
        {combatStats && (
          <div className="rounded-lg border border-[var(--genre-gold,#d6b26a)]/45 bg-secondary/45 px-3 py-2">
            <p className="mb-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--genre-gold,#d6b26a)]">
              ◆ RESONANCE STYLE // 戦闘流儀 ◆
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-[11px]">
              {COMBAT_STATS.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rotate-45 bg-primary" />
                  <span className="text-muted-foreground">{s.label}:</span>
                  <strong className="text-foreground">{combatStats[s.key]}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Cyber Anime: Stacked horizontal pill-labeled trait rows with crescent dividers (Image 9)
  if (theme === "cyber-anime") {
    const rows = [
      { pill: "FACTION", value: affiliation || "Unaffiliated Node" },
      { pill: "DESIGNATION", value: designation || "Astral Operative" },
      { pill: "CODENAME", value: alias || "Classified" },
      { pill: "STATUS", value: [tierLabel, status].filter(Boolean).join(" // ") },
    ];
    return (
      <div
        data-dossier-arrangement="lunar-dossier"
        className="mt-3 divide-y divide-primary/25 rounded-lg border border-primary/40 bg-background/60 px-3 py-1.5"
      >
        {rows.map((row) => (
          <div key={row.pill} className="flex items-center gap-3 py-2">
            <span className="inline-flex min-w-[96px] items-center justify-center rounded-full border border-primary/60 bg-primary/15 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
              ·· {row.pill} ··
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Dark Fantasy: Occult Omen header + 3x4 diamond sigil matrix (Image 7 & 12)
  if (theme === "dark-fantasy") {
    const slotCount = 8;
    const unlockedCount = Math.min(slotCount, Math.max(2, abilities.length));
    return (
      <div
        data-dossier-arrangement="occult-omen"
        className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"
      >
        <div className="grid gap-1.5 border border-primary/35 bg-background/70 p-3">
          <div className="flex items-center justify-between border-b border-primary/25 pb-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            <span>OMEN RECORD // {status}</span>
            {tierLabel && <span className="text-accent">RANK {tierLabel}</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="block font-mono text-[9px] uppercase text-muted-foreground">
                Covenant
              </span>
              <span className="font-medium">{affiliation || "Unbound"}</span>
            </div>
            <div>
              <span className="block font-mono text-[9px] uppercase text-muted-foreground">
                True Epithet
              </span>
              <span className="font-medium">{alias || "Unknown"}</span>
            </div>
            <div className="col-span-2 pt-0.5">
              <span className="block font-mono text-[9px] uppercase text-muted-foreground">
                Designation
              </span>
              <span className="font-medium">{designation || "Harbinger"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center border border-primary/35 bg-background/70 px-3 py-2">
          <span className="mb-1.5 font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
            SIGIL NODES
          </span>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: slotCount }, (_, i) => {
              const lit = i < unlockedCount;
              return (
                <span
                  key={i}
                  title={abilities[i] ?? "Dormant Node"}
                  className={`h-3.5 w-3.5 rotate-45 border ${
                    lit
                      ? "border-primary bg-primary/70 shadow-[0_0_8px_var(--primary)]"
                      : "border-muted-foreground/35 bg-muted/30"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Isekai: RPG Guild Status Window (Image 1 & 16)
  if (theme === "isekai") {
    return (
      <div
        data-dossier-arrangement="isekai-status"
        className="mt-3 rounded-md border border-[var(--genre-gold,#e09f3e)]/55 bg-background/75 p-3"
      >
        <div className="mb-2 flex items-center justify-between border-b border-[var(--genre-gold,#e09f3e)]/30 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest">
          <span className="text-primary">GUILD STATUS WINDOW</span>
          <span className="text-accent">{tierLabel ? `CLASS ${tierLabel}` : "ADVENTURER"}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 text-xs">
          <div className="rounded border border-border/50 bg-card/80 px-2.5 py-1.5">
            <span className="block font-mono text-[9px] text-muted-foreground">GUILD / CLAN</span>
            <span className="font-semibold">{affiliation || "Freelance"}</span>
          </div>
          <div className="rounded border border-border/50 bg-card/80 px-2.5 py-1.5">
            <span className="block font-mono text-[9px] text-muted-foreground">CLASS ROLE</span>
            <span className="font-semibold">{designation || "Vanguard"}</span>
          </div>
          <div className="rounded border border-border/50 bg-card/80 px-2.5 py-1.5">
            <span className="block font-mono text-[9px] text-muted-foreground">EPITHET</span>
            <span className="font-semibold">{alias || "—"}</span>
          </div>
        </div>
      </div>
    );
  }

  // Fantasy: Symmetric Royal Stat Plaque Table
  if (theme === "fantasy") {
    return (
      <div
        data-dossier-arrangement="astrolabe-royal"
        className="mt-3 grid grid-cols-1 gap-2 rounded border border-[var(--genre-gold,#d4af37)]/50 bg-background/65 p-3 sm:grid-cols-3"
      >
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--genre-gold,#d4af37)]">
            ✧ Order / House
          </span>
          <p className="mt-0.5 text-xs font-medium">{affiliation || "Unaffiliated"}</p>
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--genre-gold,#d4af37)]">
            ✧ Calling
          </span>
          <p className="mt-0.5 text-xs font-medium">{designation || "Sentinel"}</p>
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--genre-gold,#d4af37)]">
            ✧ Royal Epithet
          </span>
          <p className="mt-0.5 text-xs font-medium">{alias || "None recorded"}</p>
        </div>
      </div>
    );
  }

  // Ghibli: Soft Field Journal Entry Row (Image 14)
  if (theme === "ghibli") {
    return (
      <div
        data-dossier-arrangement="ghibli-journal"
        className="mt-3 grid gap-2 rounded-xl border border-primary/30 bg-background/70 p-3 sm:grid-cols-3"
      >
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-primary">
            Home &amp; Kin
          </span>
          <p className="text-xs font-semibold">{affiliation || "Wandering"}</p>
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-primary">
            Vocation
          </span>
          <p className="text-xs font-semibold">{designation || "Keeper"}</p>
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wider text-primary">
            Known As
          </span>
          <p className="text-xs font-semibold">{alias || "—"}</p>
        </div>
      </div>
    );
  }

  // Default Comic Spread / Shonen Clash
  if (captionBox) {
    return (
      <div
        data-dossier-arrangement={theme === "shonen" ? "shonen-clash" : "comic-spread"}
        className="mt-3 grid gap-2 sm:grid-cols-3"
      >
        {captionBox("AFFILIATION / LINEAGE", affiliation || "Unaffiliated")}
        {captionBox("DESIGNATION", designation)}
        {captionBox("KNOWN ALIAS", alias || "None on file", true)}
      </div>
    );
  }

  return null;
}

/* ───────────────────────────────────────────────────────────────────────────
   5. Genre-Styled Ability Emblems (Picture-Inspired Heraldry, Runes, Seals & Badges)
   ─────────────────────────────────────────────────────────────────────────── */

export function GenreAbilityEmblem({
  theme,
  label,
  tier,
  icon: Icon,
  title,
  variant = "compact",
  className = "",
}: {
  theme: GenreThemeId | null;
  label: string;
  tier: string;
  icon: ComponentType<{ className?: string }>;
  title?: string;
  variant?: "compact" | "medallion";
  className?: string;
}) {
  const active = theme ?? "manga-ink";
  const isMythic = tier === "Mythic";
  const isLegendary = tier === "Legendary";

  if (variant === "medallion") {
    // Isekai (Pic 1): Intersecting tilted orbital rings + brass clockwork cog + luminous teal core
    if (active === "isekai") {
      return (
        <div
          title={title ?? `${label} — ${tier}`}
          data-ability-emblem="isekai"
          data-emblem-style="astrolabe-gear"
          data-ability-tier={tier}
          className={`group relative flex flex-col items-center gap-1 ${className}`}
        >
          <div className="relative grid h-12 w-12 place-items-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 48 48"
              className="pointer-events-none absolute inset-0 h-full w-full text-[var(--genre-gold,#e09f3e)]"
              fill="none"
            >
              <circle
                cx="24"
                cy="24"
                r="21"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3 2"
              />
              <ellipse
                cx="24"
                cy="24"
                rx="22"
                ry="10"
                transform="rotate(-24 24 24)"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeOpacity="0.65"
              />
              <circle cx="40" cy="14" r="1.8" fill="var(--accent)" />
            </svg>
            <span className="relative grid h-7 w-7 place-items-center rounded-full border border-[var(--genre-gold,#e09f3e)] bg-background/90 text-primary shadow-[0_0_10px_color-mix(in_oklab,var(--accent)_35%,transparent)]">
              <Icon className="h-3.5 w-3.5" />
            </span>
          </div>
          <span className="max-w-[78px] truncate font-mono text-[9px] font-bold uppercase tracking-wider text-foreground">
            {label}
          </span>
        </div>
      );
    }

    // Dark Fantasy (Pic 2 & Pic 8): Black-gold veined diamond marble + glowing cyan-amethyst carved rune sparks
    if (active === "dark-fantasy") {
      return (
        <div
          title={title ?? `${label} — ${tier}`}
          data-ability-emblem="dark-fantasy"
          data-emblem-style="carved-rune-diamond"
          data-ability-tier={tier}
          className={`group relative flex items-center gap-2 ${className}`}
        >
          <div className="relative grid h-11 w-11 shrink-0 place-items-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 44 44"
              className="pointer-events-none absolute inset-0 h-full w-full"
              fill="none"
            >
              <polygon
                points="22,3 41,22 22,41 3,22"
                stroke="var(--primary)"
                strokeWidth="1.4"
                fill="color-mix(in_oklab,var(--background)_88%,black)"
              />
              <polygon
                points="22,8 36,22 22,36 8,22"
                stroke="var(--accent)"
                strokeWidth="0.9"
                strokeOpacity="0.7"
              />
              {/* Subtle veined marble fracture + floating rune sparks */}
              <path
                d="M12 16 L19 20 L16 27"
                stroke="var(--genre-gold,#f43f5e)"
                strokeWidth="0.7"
                strokeOpacity="0.45"
              />
              <circle cx="8" cy="10" r="1" fill="var(--primary)" />
              <circle cx="36" cy="34" r="1" fill="var(--accent)" />
            </svg>
            <Icon
              className={`relative h-4 w-4 ${
                isMythic ? "text-accent drop-shadow-[0_0_6px_var(--accent)]" : "text-primary"
              }`}
            />
          </div>
          <div className="min-w-0">
            <span className="block truncate font-display text-[11px] font-bold uppercase tracking-wider text-foreground">
              {label}
            </span>
            <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
              {tier}
            </span>
          </div>
        </div>
      );
    }

    // Fantasy: Arcane Botanical Alchemical Seal & Crowned Heraldic Shield
    if (active === "fantasy") {
      return (
        <div
          title={title ?? `${label} — ${tier}`}
          data-ability-emblem="fantasy"
          data-emblem-style="crowned-heraldic-shield"
          data-ability-tier={tier}
          className={`flex items-center gap-2 rounded border border-[#c5a869]/80 bg-[#15221b] px-2.5 py-1.5 text-[#f5ebe6] shadow-[0_0_14px_rgba(92,225,184,0.22),inset_0_0_10px_rgba(92,225,184,0.12)] ${className}`}
        >
          <span className="relative grid h-8 w-8 shrink-0 place-items-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 36 36"
              className="pointer-events-none absolute inset-0 h-full w-full text-[#c5a869]"
              fill="none"
            >
              <circle
                cx="18"
                cy="18"
                r="15.5"
                stroke="#5ce1b8"
                strokeOpacity="0.4"
                strokeWidth="0.9"
                strokeDasharray="3 2"
              />
              <path d="M11 7 L14 3 L18 6 L22 3 L25 7 Z" fill="currentColor" fillOpacity="0.9" />
              <path
                d="M7 9 H29 V21 C29 27 18 33 18 33 C18 33 7 27 7 21 Z"
                fill="#111915"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
            <Icon className="relative mt-1 h-3.5 w-3.5 text-[#5ce1b8] drop-shadow-[0_0_6px_rgba(92,225,184,0.7)]" />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-display text-[11px] font-bold uppercase tracking-wider text-[#f5ebe6]">
              {label}
            </span>
            <span className="block font-mono text-[8px] uppercase tracking-widest text-[#5ce1b8]">
              {tier}
            </span>
          </div>
        </div>
      );
    }

    // Xianxia (Pic 5): Celadon Jade & Gold Cloud-Scroll Cartouche Medallion
    if (active === "xianxia") {
      return (
        <div
          title={title ?? `${label} — ${tier}`}
          data-ability-emblem="xianxia"
          data-emblem-style="jade-cloud-seal"
          data-ability-tier={tier}
          className={`flex items-center gap-2 rounded-full border border-[var(--genre-gold,#d6b26a)]/65 bg-background/85 px-2.5 py-1 ${className}`}
        >
          <span className="relative grid h-8 w-8 shrink-0 place-items-center text-primary">
            <svg
              aria-hidden="true"
              viewBox="0 0 36 36"
              className="pointer-events-none absolute inset-0 h-full w-full text-[var(--genre-gold,#d6b26a)]"
              fill="none"
            >
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M5 18 C3 14 7 10 10 12 M31 18 C33 22 29 26 26 24"
                stroke="var(--accent)"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <polygon points="18,1 20,4 18,7 16,4" fill="var(--accent)" />
            </svg>
            <Icon className="relative h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-serif text-[11px] font-bold text-foreground">
              {label}
            </span>
            <span className="block font-mono text-[8px] uppercase tracking-widest text-[var(--genre-gold,#d6b26a)]">
              {tier}
            </span>
          </div>
        </div>
      );
    }

    // Ghibli (Pic 3): Pressed Botanical Hexagon / Ivy Seal Medallion
    if (active === "ghibli") {
      return (
        <div
          title={title ?? `${label} — ${tier}`}
          data-ability-emblem="ghibli"
          data-emblem-style="botanical-hex-seal"
          data-ability-tier={tier}
          className={`flex items-center gap-2 rounded-xl border border-primary/45 bg-background/85 px-2.5 py-1 ${className}`}
        >
          <span className="relative grid h-8 w-8 shrink-0 place-items-center text-primary">
            <svg
              aria-hidden="true"
              viewBox="0 0 36 36"
              className="pointer-events-none absolute inset-0 h-full w-full text-primary"
              fill="none"
            >
              <polygon
                points="18,3 31,10.5 31,25.5 18,33 5,25.5 5,10.5"
                stroke="currentColor"
                strokeWidth="1.4"
                fill="color-mix(in_oklab,var(--primary)_14%,transparent)"
              />
              <path
                d="M9 9 Q6 14 10 17"
                stroke="var(--accent)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <Icon className="relative h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-sans text-[11px] font-bold text-foreground">
              {label}
            </span>
            <span className="block font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
              {tier}
            </span>
          </div>
        </div>
      );
    }

    // Cyber Anime (Pic 7): Crescent Constellation Telemetry Node
    if (active === "cyber-anime") {
      return (
        <div
          title={title ?? `${label} — ${tier}`}
          data-ability-emblem="cyber-anime"
          data-emblem-style="crescent-holo-node"
          data-ability-tier={tier}
          className={`flex items-center gap-2 rounded-full border border-primary/55 bg-background/80 px-2.5 py-1 backdrop-blur-sm ${className}`}
        >
          <span className="relative grid h-8 w-8 shrink-0 place-items-center text-primary">
            <svg
              aria-hidden="true"
              viewBox="0 0 36 36"
              className="pointer-events-none absolute inset-0 h-full w-full text-primary"
              fill="none"
            >
              <path
                d="M27 8 A13 13 0 1 0 27 28"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="29" cy="18" r="1.5" fill="var(--accent)" />
              <polygon points="8,6 9,8 11,9 9,10 8,12 7,10 5,9 7,8" fill="currentColor" />
            </svg>
            <Icon className="relative h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-mono text-[10px] font-bold uppercase tracking-wider text-foreground">
              {label}
            </span>
            <span className="block font-mono text-[8px] uppercase tracking-widest text-primary">
              {tier}
            </span>
          </div>
        </div>
      );
    }

    // Shonen / Manga Ink Medallion Fallback
    return (
      <div
        title={title ?? `${label} — ${tier}`}
        data-ability-emblem={active}
        data-emblem-style={active === "shonen" ? "kinetic-spark-crest" : "hanko-plate"}
        data-ability-tier={tier}
        className={`flex items-center gap-2 border-2 border-border bg-card px-2.5 py-1 shadow-[2px_2px_0_var(--primary)] ${
          active === "shonen" ? "-skew-x-6" : ""
        } ${className}`}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center border border-border bg-foreground text-background">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <span className="block truncate font-display text-[11px] font-bold uppercase tracking-wider text-foreground">
            {label}
          </span>
          <span className="block font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
            {tier}
          </span>
        </div>
      </div>
    );
  }

  // Compact inline emblem used by <AbilityBadge /> across cards & dossiers in Manga UI
  if (active === "fantasy") {
    return (
      <span
        title={title}
        data-manga-badge="stamp"
        data-ability-emblem="fantasy"
        data-emblem-style="crowned-heraldic-shield"
        data-ability-tier={tier}
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${
          isMythic
            ? "border-[#5ce1b8] bg-[#2e5a52] text-[#f5ebe6] shadow-[0_0_12px_rgba(92,225,184,0.45)]"
            : isLegendary
              ? "border-[#c5a869] bg-[#15221b] text-[#f5ebe6] shadow-[inset_0_0_8px_rgba(92,225,184,0.22)]"
              : "border-[#c5a869]/70 bg-[#15221b]/90 text-[#e6dcc5]"
        } ${className}`}
      >
        <span className="relative grid h-3.5 w-3.5 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rotate-45 border border-[#c5a869] bg-[#5ce1b8]/20"
          />
          <Icon className="relative h-2.5 w-2.5 shrink-0 text-[#5ce1b8]" />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  if (active === "isekai") {
    return (
      <span
        title={title}
        data-manga-badge="stamp"
        data-ability-emblem="isekai"
        data-emblem-style="astrolabe-gear"
        data-ability-tier={tier}
        className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
          isMythic
            ? "border-[var(--genre-gold,#e09f3e)] bg-primary text-primary-foreground shadow-[0_0_10px_color-mix(in_oklab,var(--accent)_40%,transparent)]"
            : isLegendary
              ? "border-accent bg-card text-foreground shadow-[0_0_8px_color-mix(in_oklab,var(--accent)_28%,transparent)]"
              : "border-[var(--genre-gold,#e09f3e)]/65 bg-background/85 text-foreground"
        } ${className}`}
      >
        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full border border-dashed border-current/80 bg-accent/15">
          <Icon className="h-2.5 w-2.5 shrink-0" />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  if (active === "dark-fantasy") {
    return (
      <span
        title={title}
        data-manga-badge="stamp"
        data-ability-emblem="dark-fantasy"
        data-emblem-style="carved-rune-diamond"
        data-ability-tier={tier}
        className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
          isMythic
            ? "border-accent bg-accent/20 text-foreground shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_45%,transparent)]"
            : isLegendary
              ? "border-primary bg-primary/20 text-foreground shadow-[0_0_10px_color-mix(in_oklab,var(--primary)_40%,transparent)]"
              : "border-primary/55 bg-background/85 text-foreground"
        } ${className}`}
      >
        <span className="relative grid h-3.5 w-3.5 shrink-0 place-items-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rotate-45 border border-primary/80"
          />
          <Icon className="relative h-2.5 w-2.5 shrink-0 text-primary" />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  if (active === "xianxia") {
    return (
      <span
        title={title}
        data-manga-badge="stamp"
        data-ability-emblem="xianxia"
        data-emblem-style="jade-cloud-seal"
        data-ability-tier={tier}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-serif text-[10px] font-bold tracking-wide ${
          isMythic
            ? "border-[var(--genre-gold,#d6b26a)] bg-primary text-primary-foreground shadow-[0_0_10px_color-mix(in_oklab,var(--genre-gold,#d6b26a)_35%,transparent)]"
            : isLegendary
              ? "border-[var(--genre-gold,#d6b26a)] bg-card text-foreground"
              : "border-[var(--genre-gold,#d6b26a)]/55 bg-background/85 text-foreground"
        } ${className}`}
      >
        <Icon className="h-3 w-3 shrink-0 text-[var(--genre-gold,#d6b26a)]" />
        <span>{label}</span>
      </span>
    );
  }

  if (active === "cyber-anime") {
    return (
      <span
        title={title}
        data-manga-badge="stamp"
        data-ability-emblem="cyber-anime"
        data-emblem-style="crescent-holo-node"
        data-ability-tier={tier}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${
          isMythic
            ? "border-primary bg-primary/25 text-foreground shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
            : "border-primary/55 bg-background/75 text-foreground"
        } ${className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
        <Icon className="h-3 w-3 shrink-0 text-primary" />
        <span>{label}</span>
      </span>
    );
  }

  if (active === "ghibli") {
    return (
      <span
        title={title}
        data-manga-badge="stamp"
        data-ability-emblem="ghibli"
        data-emblem-style="botanical-hex-seal"
        data-ability-tier={tier}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-0.5 font-sans text-[10px] font-bold ${
          isMythic
            ? "border-primary bg-primary text-primary-foreground"
            : "border-primary/45 bg-card/90 text-foreground"
        } ${className}`}
      >
        <Icon className="h-3 w-3 shrink-0 text-primary" />
        <span>{label}</span>
      </span>
    );
  }

  if (active === "shonen") {
    return (
      <span
        title={title}
        data-manga-badge="stamp"
        data-ability-emblem="shonen"
        data-emblem-style="kinetic-spark-crest"
        data-ability-tier={tier}
        className={`inline-flex -skew-x-6 items-center gap-1.5 border-2 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider ${
          isMythic
            ? "border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)]"
            : isLegendary
              ? "border-accent bg-card text-foreground shadow-[2px_2px_0_var(--accent)]"
              : "border-border bg-card text-foreground shadow-[2px_2px_0_var(--primary)]"
        } ${className}`}
      >
        <Icon className="h-3 w-3 shrink-0 skew-x-6" />
        <span className="skew-x-6">{label}</span>
      </span>
    );
  }

  // Manga Ink stamp
  return (
    <span
      title={title}
      data-manga-badge="stamp"
      data-ability-emblem="manga-ink"
      data-emblem-style="hanko-plate"
      data-ability-tier={tier}
      className={`inline-flex items-center gap-1.5 border border-border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
        isMythic
          ? "bg-foreground text-background shadow-[2px_2px_0_var(--primary)]"
          : isLegendary
            ? "border-primary bg-card text-foreground shadow-[2px_2px_0_var(--primary)]"
            : "bg-card text-foreground shadow-[2px_2px_0_currentColor]"
      } ${className}`}
    >
      <Icon className={`h-3 w-3 shrink-0 ${isMythic ? "text-primary" : "text-current"}`} />
      <span>{label}</span>
    </span>
  );
}
