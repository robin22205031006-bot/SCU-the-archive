import { useId } from "react";
import {
  resolveGroupEmblem,
  type GroupEmblemGenre,
  type GroupEmblemInput,
} from "@/lib/group-emblem-resolver";
import { useUiStyle } from "@/lib/ui-style";
import { useActiveGenre, useIsManga, useIsMinimal } from "@/hooks/use-ui-mode";
import { useNexusMotion } from "@/hooks/use-nexus-motion";

/**
 * Pure crisp SVG vector crests for every SCU group genre:
 * Satanic Cult, Dark Cult, Cult, Dark Organization, Black Ops Team,
 * Organization, Clan, Bloodline, and Faction.
 */
export function GroupEmblemVector({
  genre,
  className = "h-4 w-4",
}: {
  genre: GroupEmblemGenre;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-group-emblem-vector={genre}
      className={className}
    >
      {genre === "satanism-cult" && (
        <>
          <circle cx="16" cy="17" r="10.5" fill="currentColor" fillOpacity="0.1" />
          {/* Inverted Pentagram */}
          <polygon points="16,27 9.8,8.5 25.5,19.8 6.5,19.8 22.2,8.5" strokeLinejoin="miter" />
          {/* Baphomet Horns */}
          <path d="M9 8C6 5 6 3 7 2M23 8c3-3 3-5 2-6" />
          <circle cx="16" cy="17" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {genre === "dark-cult" && (
        <>
          {/* Eclipsed Crescent & Ritual Chalice */}
          <path
            d="M21 6.5A10 10 0 1 0 25 22a8 8 0 0 1-4-15.5Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path d="M13 12h8l-1.5 6h-5Z" fill="currentColor" fillOpacity="0.22" />
          <path d="M17 18v7M13.5 25h7" />
          <circle cx="17" cy="9" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {genre === "cult" && (
        <>
          {/* Radiant Covenant Pyramid & All-Seeing Eye */}
          <polygon points="16,5 28,26 4,26" fill="currentColor" fillOpacity="0.14" />
          <path d="M10.5 18.5c1.8-2.5 3.6-3.5 5.5-3.5s3.7 1 5.5 3.5c-1.8 2.5-3.6 3.5-5.5 3.5s-3.7-1-5.5-3.5Z" />
          <circle cx="16" cy="18.5" r="1.6" fill="currentColor" stroke="none" />
          <path d="M16 2v2M6 6l2 2M26 6l-2 2" opacity="0.7" />
        </>
      )}
      {genre === "black-ops" && (
        <>
          {/* Stealth Delta Wing & Tactical Reticle */}
          <polygon points="16,4 28,23 16,18 4,23" fill="currentColor" fillOpacity="0.2" />
          <circle cx="16" cy="18" r="5" opacity="0.8" />
          <path d="M16 10v16M9 18h14" />
        </>
      )}
      {genre === "dark-org" && (
        <>
          {/* Fractured Obsidian Syndicate Hexagon & Twin Fangs */}
          <polygon
            points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M10 11l6 7 6-7M11 22l5-4 5 4" />
          <circle cx="16" cy="14" r="1.6" fill="currentColor" stroke="none" />
        </>
      )}
      {genre === "organization" && (
        <>
          {/* Institute Shield & Twin Pillars */}
          <path
            d="M16 4 26 8v8c0 6-4.2 10-10 12-5.8-2-10-6-10-12V8Z"
            fill="currentColor"
            fillOpacity="0.14"
          />
          <path d="M11 12v8M16 10v12M21 12v8M9.5 22h13" />
        </>
      )}
      {genre === "clan" && (
        <>
          {/* Ancestral Kamon Ring & Crossed Blades */}
          <circle cx="16" cy="16" r="11" fill="currentColor" fillOpacity="0.12" />
          <polygon points="16,8 22,16 16,24 10,16" opacity="0.8" />
          <path d="M8 24 24 8M8 8l16 16" />
          <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
        </>
      )}
      {genre === "bloodline" && (
        <>
          {/* Crowned Blood Drop & Twin Helix Tendrils */}
          <path d="M10 8l3-3 3 3 3-3 3 3" />
          <path
            d="M16 10c4 5 6.5 8.5 6.5 12a6.5 6.5 0 1 1-13 0c0-3.5 2.5-7 6.5-12Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
          <path d="M13 21c1.5-2 4.5-2 6 0" opacity="0.75" />
        </>
      )}
      {genre === "faction" && (
        <>
          {/* Banner Standard & Split Realm Crest */}
          <path d="M8 5v23M8 6h17l-3 5.5L25 17H8Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M14 9l4 5-4 1" />
        </>
      )}
    </svg>
  );
}

/**
 * UI-aware Org, Cult & Bloodline Emblem rendered natively for each UI mode:
 * - Minimal: flat monochrome architectural plate (no blur, shadow, glow, or motion)
 * - Nexus: holographic constellation reticle seal with orbital ticks & glowing crest
 * - Manga (8 genre sub-themes): authentic sub-theme stamp/plaque/seal geometry
 * - Classic: glassmorphic tinted medallion with crisp accent glow
 */
export function GroupGenreEmblem({
  entity,
  variant = "badge",
  size = "sm",
  showLabel = true,
  className = "",
}: {
  entity: GroupEmblemInput;
  variant?: "badge" | "seal" | "crest";
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const spec = resolveGroupEmblem(entity);
  const uiStyle = useUiStyle();
  const isManga = useIsManga();
  const isMinimal = useIsMinimal();
  const activeGenre = useActiveGenre() ?? "manga-ink";
  const nexusMoving = useNexusMotion();

  const iconDim =
    variant === "crest"
      ? size === "lg"
        ? "h-10 w-10"
        : "h-7 w-7"
      : variant === "seal"
        ? size === "lg"
          ? "h-7 w-7"
          : size === "md"
            ? "h-5 w-5"
            : "h-4 w-4"
        : size === "xs"
          ? "h-3 w-3"
          : size === "md"
            ? "h-4 w-4"
            : "h-3.5 w-3.5";

  // 1. Minimal Mode — strictly flat, zero shadow, zero glow, zero blur
  if (isMinimal) {
    if (variant === "badge") {
      return (
        <span
          data-group-genre={spec.genre}
          data-ui-emblem="minimal"
          title={`${spec.label}${entity.category ? ` · ${entity.category}` : ""}`}
          className={`inline-flex items-center gap-1.5 rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground ${className}`}
        >
          <GroupEmblemVector genre={spec.genre} className={iconDim} />
          {showLabel && <span>{entity.category || spec.label}</span>}
        </span>
      );
    }
    return (
      <span
        data-group-genre={spec.genre}
        data-ui-emblem="minimal"
        title={spec.label}
        className={`grid place-items-center rounded-lg border border-border bg-background text-foreground ${
          size === "lg" ? "h-16 w-16" : size === "md" ? "h-10 w-10" : "h-8 w-8"
        } ${className}`}
      >
        <GroupEmblemVector genre={spec.genre} className={iconDim} />
      </span>
    );
  }

  // 2. Nexus Mode — holographic orbital reticle seal
  if (!isManga && uiStyle === "nexus") {
    if (variant === "badge") {
      return (
        <span
          data-group-genre={spec.genre}
          data-ui-emblem="nexus"
          title={`${spec.label}${entity.category ? ` · ${entity.category}` : ""}`}
          className={`inline-flex items-center gap-1.5 rounded-full border bg-slate-950/80 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${className}`}
          style={{
            borderColor: `${spec.accentColor}75`,
            color: spec.accentColor,
            boxShadow: `0 0 10px ${spec.accentColor}30`,
          }}
        >
          <GroupEmblemVector genre={spec.genre} className={iconDim} />
          {showLabel && <span>{entity.category || spec.label}</span>}
        </span>
      );
    }

    const boxSize =
      variant === "crest"
        ? size === "lg"
          ? "h-24 w-24"
          : "h-16 w-16"
        : size === "lg"
          ? "h-14 w-14"
          : size === "md"
            ? "h-10 w-10"
            : "h-8 w-8";

    return (
      <span
        data-group-genre={spec.genre}
        data-ui-emblem="nexus"
        title={spec.label}
        className={`relative grid shrink-0 place-items-center rounded-full bg-slate-950/80 ${boxSize} ${className}`}
        style={{
          color: spec.accentColor,
          boxShadow: `0 0 18px ${spec.accentColor}35, inset 0 0 12px ${spec.accentColor}22`,
        }}
      >
        <svg
          viewBox="0 0 64 64"
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 h-full w-full ${nexusMoving ? "animate-[spin_26s_linear_infinite]" : ""}`}
        >
          <circle
            cx="32"
            cy="32"
            r="29"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.45"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <circle
            cx="32"
            cy="32"
            r="24"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.7"
            strokeWidth="1"
          />
          <line x1="32" y1="1" x2="32" y2="6" stroke="currentColor" strokeWidth="1.5" />
          <line x1="32" y1="58" x2="32" y2="63" stroke="currentColor" strokeWidth="1.5" />
          <line x1="1" y1="32" x2="6" y2="32" stroke="currentColor" strokeWidth="1.5" />
          <line x1="58" y1="32" x2="63" y2="32" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <GroupEmblemVector genre={spec.genre} className={`relative ${iconDim}`} />
      </span>
    );
  }

  // 3. Manga Mode (adapts across all 8 sub-themes: fantasy, isekai, dark-fantasy, xianxia, cyber-anime, ghibli, shonen, manga-ink)
  if (isManga) {
    const labelText = entity.category || spec.label;
    if (variant === "badge") {
      if (activeGenre === "fantasy") {
        return (
          <span
            data-group-genre={spec.genre}
            data-ui-emblem="manga-fantasy"
            className={`inline-flex items-center gap-1.5 rounded border border-[#c5a869] bg-[#15221b] px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-[#5ce1b8] ${className}`}
          >
            <GroupEmblemVector genre={spec.genre} className={iconDim} />
            {showLabel && <span className="text-[#f5ebe6]">{labelText}</span>}
          </span>
        );
      }
      if (activeGenre === "isekai") {
        return (
          <span
            data-group-genre={spec.genre}
            data-ui-emblem="manga-isekai"
            className={`inline-flex items-center gap-1.5 rounded-sm border border-[var(--genre-gold,#e09f3e)] bg-background/90 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--genre-gold,#e09f3e)] ${className}`}
          >
            <GroupEmblemVector genre={spec.genre} className={iconDim} />
            {showLabel && <span className="text-foreground">{labelText}</span>}
          </span>
        );
      }
      if (activeGenre === "dark-fantasy") {
        return (
          <span
            data-group-genre={spec.genre}
            data-ui-emblem="manga-dark-fantasy"
            className={`inline-flex items-center gap-1.5 border border-primary/70 bg-background/90 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_30%,transparent)] ${className}`}
          >
            <GroupEmblemVector genre={spec.genre} className={iconDim} />
            {showLabel && <span className="text-foreground">{labelText}</span>}
          </span>
        );
      }
      if (activeGenre === "xianxia") {
        return (
          <span
            data-group-genre={spec.genre}
            data-ui-emblem="manga-xianxia"
            className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--genre-gold,#d6b26a)]/80 bg-card px-2.5 py-0.5 font-serif text-[10px] font-bold tracking-wide text-[var(--genre-gold,#d6b26a)] ${className}`}
          >
            <GroupEmblemVector genre={spec.genre} className={iconDim} />
            {showLabel && <span className="text-foreground">{labelText}</span>}
          </span>
        );
      }
      if (activeGenre === "cyber-anime") {
        return (
          <span
            data-group-genre={spec.genre}
            data-ui-emblem="manga-cyber-anime"
            className={`inline-flex items-center gap-1.5 rounded-full border border-primary/65 bg-background/80 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm ${className}`}
          >
            <GroupEmblemVector genre={spec.genre} className={iconDim} />
            {showLabel && <span className="text-foreground">{labelText}</span>}
          </span>
        );
      }
      if (activeGenre === "ghibli") {
        return (
          <span
            data-group-genre={spec.genre}
            data-ui-emblem="manga-ghibli"
            className={`inline-flex items-center gap-1.5 rounded-xl border border-primary/50 bg-card/90 px-2.5 py-0.5 font-sans text-[10px] font-bold text-primary ${className}`}
          >
            <GroupEmblemVector genre={spec.genre} className={iconDim} />
            {showLabel && <span className="text-foreground">{labelText}</span>}
          </span>
        );
      }
      if (activeGenre === "shonen") {
        return (
          <span
            data-group-genre={spec.genre}
            data-ui-emblem="manga-shonen"
            className={`inline-flex -skew-x-6 items-center gap-1.5 border-2 border-[#1e293b] bg-[#fffdf8]/95 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-[#e86a33] shadow-[2px_2px_0_#0f172a] ${className}`}
          >
            <GroupEmblemVector genre={spec.genre} className={`${iconDim} skew-x-6`} />
            {showLabel && <span className="skew-x-6 text-[#1e293b]">{labelText}</span>}
          </span>
        );
      }

      // Default Manga Ink halftone issue seal
      return (
        <span
          data-group-genre={spec.genre}
          data-ui-emblem="manga-ink"
          className={`inline-flex items-center gap-1.5 border-2 border-foreground bg-card px-2 py-0.5 font-mono font-bold uppercase tracking-wider text-foreground select-none ${
            size === "xs" ? "text-[9px]" : size === "md" ? "text-xs" : "text-[10px]"
          } ${className}`}
          style={{ boxShadow: "2px 2px 0 currentColor" }}
        >
          <GroupEmblemVector genre={spec.genre} className={iconDim} />
          {showLabel && <span className="truncate">{labelText}</span>}
        </span>
      );
    }

    // Manga Seal / Crest fallback for cards/dossiers without portrait photo
    const isCrimson = spec.genre === "satanism-cult" || spec.genre === "dark-org";
    const sealSize =
      variant === "crest"
        ? size === "lg"
          ? "h-20 w-20"
          : "h-14 w-14"
        : size === "lg"
          ? "h-14 w-14"
          : size === "md"
            ? "h-10 w-10"
            : "h-8 w-8";
    return (
      <span
        data-group-genre={spec.genre}
        data-ui-emblem={`manga-${activeGenre}`}
        title={spec.label}
        className={`relative grid shrink-0 place-items-center border-2 ${
          activeGenre === "fantasy"
            ? "rounded-lg border-[#c5a869] bg-[#15221b] text-[#5ce1b8]"
            : activeGenre === "shonen"
              ? "border-[#1e293b] bg-[#fffdf8] text-[#e86a33] shadow-[3px_3px_0_#0f172a]"
              : isCrimson
                ? "border-[#b91c1c] bg-card text-[#b91c1c]"
                : "border-foreground bg-card text-foreground"
        } ${sealSize} ${className}`}
      >
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
          <defs>
            <pattern id={`grp-ht-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="0.7" fill="currentColor" fillOpacity="0.16" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grp-ht-${uid})`} />
        </svg>
        <GroupEmblemVector genre={spec.genre} className={`relative ${iconDim}`} />
      </span>
    );
  }

  // 4. Classic Mode — glassmorphic tinted badge or radiant medallion
  if (variant === "badge") {
    return (
      <span
        data-group-genre={spec.genre}
        data-ui-emblem="classic"
        title={`${spec.label}${entity.category ? ` · ${entity.category}` : ""}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${className}`}
        style={{
          color: spec.accentColor,
          borderColor: `${spec.accentColor}66`,
          background: `${spec.accentColor}1a`,
          boxShadow: `0 0 10px ${spec.accentColor}2e`,
        }}
      >
        <GroupEmblemVector genre={spec.genre} className={iconDim} />
        {showLabel && <span>{entity.category || spec.label}</span>}
      </span>
    );
  }

  const classicBox =
    variant === "crest"
      ? size === "lg"
        ? "h-24 w-24 rounded-2xl"
        : "h-16 w-16 rounded-xl"
      : size === "lg"
        ? "h-14 w-14 rounded-xl"
        : size === "md"
          ? "h-10 w-10 rounded-xl"
          : "h-8 w-8 rounded-lg";

  return (
    <span
      data-group-genre={spec.genre}
      data-ui-emblem="classic"
      title={spec.label}
      className={`grid shrink-0 place-items-center border ${classicBox} ${className}`}
      style={{
        color: spec.accentColor,
        borderColor: `${spec.accentColor}66`,
        background: `radial-gradient(circle at 50% 35%, ${spec.accentColor}26, rgba(15,23,42,0.55))`,
        boxShadow: `0 0 16px ${spec.accentColor}33`,
      }}
    >
      <GroupEmblemVector genre={spec.genre} className={iconDim} />
    </span>
  );
}
