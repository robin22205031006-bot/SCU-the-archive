import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { abilityDef } from "@/lib/abilities";
import {
  ABILITY_RANKS,
  abilityRankMeta,
  parseAbilityRank,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";
import { resolveCustomAbilityEmblem } from "@/lib/ability-emblem-resolver";
import { AbilityCustomEmblem } from "@/components/ability-custom-emblem";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityRankTooltipCard } from "@/components/ability-rank-tooltip";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";
import { RoleEmblemGlyph } from "@/components/role-emblem";
import { emblemRoleFromAbilityKey } from "@/lib/role-emblems";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { useIsMinimal } from "@/hooks/use-ui-mode";
import { useUiStyle } from "@/lib/ui-style";
import { sfx } from "@/lib/scu-audio";
import {
  EMBLEM_FLOAT_TRANSITION_MS,
  isReducedMotionOrMinimal,
  triggerAbilityRankUpHaptic,
} from "@/lib/ability-celebration";
import { useOptionalAbilityContext } from "@/context/AbilityContext";
import { AbilityBenefitsModal } from "@/components/ability-benefits-modal";

export type EmblemRankTransitionEffect =
  "initiate-seal" | "adept-surge" | "veteran-attune" | "master-ascend" | "legendary-aura";

export interface EmblemRankCssTokens {
  saturation: number;
  brightness: number;
  glowSizePx: number;
  glowOpacity: number;
  scale: number;
  ringSpeedSec: number;
  transitionEffect: EmblemRankTransitionEffect;
  transitionDurationMs: number;
  auraSpreadPx: number;
}

export const EMBLEM_RANK_TRANSITION_EFFECTS: Record<AbilityEmblemRank, EmblemRankTransitionEffect> =
  {
    1: "initiate-seal",
    2: "adept-surge",
    3: "veteran-attune",
    4: "master-ascend",
    5: "legendary-aura",
  };

export const EMBLEM_RANK_STYLE_TOKENS: Record<AbilityEmblemRank, EmblemRankCssTokens> = {
  1: {
    saturation: 0.72,
    brightness: 0.94,
    glowSizePx: 0,
    glowOpacity: 0.25,
    scale: 1,
    ringSpeedSec: 16,
    transitionEffect: "initiate-seal",
    transitionDurationMs: 400,
    auraSpreadPx: 0,
  },
  2: {
    saturation: 0.92,
    brightness: 1.0,
    glowSizePx: 6,
    glowOpacity: 0.45,
    scale: 1.01,
    ringSpeedSec: 13,
    transitionEffect: "adept-surge",
    transitionDurationMs: 480,
    auraSpreadPx: 4,
  },
  3: {
    saturation: 1.12,
    brightness: 1.04,
    glowSizePx: 12,
    glowOpacity: 0.65,
    scale: 1.02,
    ringSpeedSec: 9.5,
    transitionEffect: "veteran-attune",
    transitionDurationMs: 580,
    auraSpreadPx: 8,
  },
  4: {
    saturation: 1.32,
    brightness: 1.08,
    glowSizePx: 18,
    glowOpacity: 0.82,
    scale: 1.04,
    ringSpeedSec: 7.2,
    transitionEffect: "master-ascend",
    transitionDurationMs: 680,
    auraSpreadPx: 14,
  },
  5: {
    saturation: 1.52,
    brightness: 1.14,
    glowSizePx: 26,
    glowOpacity: 1.0,
    scale: 1.06,
    ringSpeedSec: 5.5,
    transitionEffect: "legendary-aura",
    transitionDurationMs: 960,
    auraSpreadPx: 24,
  },
};

type CSSCustomPropStyle = CSSProperties & Record<`--${string}`, string | number>;

export type AbilityRankAssetMap = Partial<Record<AbilityEmblemRank, string>>;
export type AbilityRankOverlayMap = Partial<Record<AbilityEmblemRank, ReactNode>>;
export type AbilityRankEmblemSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AbilityRankEmblemMode = "auto" | "vector" | "atlas";

export interface ResolvedEmblemAsset {
  src: string | null;
  sourceRank: AbilityEmblemRank | null;
  strategy: "rank-asset" | "base-asset" | "atlas" | "vector";
}

const SIZE_CLASSES: Record<AbilityRankEmblemSize, string> = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const CORE_ICON_CLASSES: Record<AbilityRankEmblemSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const CORNER_BADGE_CLASSES: Record<AbilityRankEmblemSize, string> = {
  xs: "text-[7px] px-0.5 leading-tight",
  sm: "text-[8px] px-1 leading-tight",
  md: "text-[9px] px-1 leading-tight",
  lg: "text-[10px] px-1.5 py-0.5 leading-none",
  xl: "text-xs px-2 py-0.5 leading-none",
};

/**
 * Resolves the active visual asset URL for a given rank (1-5):
 * 1. Exact rank key in `assetsByRank`
 * 2. Nearest lower unlocked rank in `assetsByRank` (for sparse progression sheets)
 * 3. Nearest higher rank if only upper ranks are supplied
 * 4. `baseAssetUrl` fallback, or null to render crisp procedural vector/atlas artwork
 */
export function resolveRankEmblemAsset(
  rank: AbilityEmblemRank,
  assetsByRank?: AbilityRankAssetMap,
  baseAssetUrl?: string,
  mode: AbilityRankEmblemMode = "vector",
): ResolvedEmblemAsset {
  if (assetsByRank) {
    const exact = assetsByRank[rank];
    if (exact && exact.trim().length > 0) {
      return { src: exact, sourceRank: rank, strategy: "rank-asset" };
    }
    for (let r = rank - 1; r >= 1; r -= 1) {
      const candidate = assetsByRank[r as AbilityEmblemRank];
      if (candidate && candidate.trim().length > 0) {
        return {
          src: candidate,
          sourceRank: r as AbilityEmblemRank,
          strategy: "rank-asset",
        };
      }
    }
    for (let r = rank + 1; r <= 5; r += 1) {
      const candidate = assetsByRank[r as AbilityEmblemRank];
      if (candidate && candidate.trim().length > 0) {
        return {
          src: candidate,
          sourceRank: r as AbilityEmblemRank,
          strategy: "rank-asset",
        };
      }
    }
  }

  if (baseAssetUrl && baseAssetUrl.trim().length > 0) {
    return { src: baseAssetUrl, sourceRank: null, strategy: "base-asset" };
  }

  return {
    src: null,
    sourceRank: null,
    strategy: mode === "atlas" ? "atlas" : "vector",
  };
}

/**
 * Progressive SVG frame/filigree overlay layers for Ranks 1..5.
 * Each rank swaps in stronger geometry, rings, runes, filigree, and crown crests.
 */
function RankStageSvgOverlay({
  rank,
  accentColor,
  ringColor,
  animated,
  uid,
}: {
  rank: AbilityEmblemRank;
  accentColor: string;
  ringColor: string;
  animated: boolean;
  uid: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      data-emblem-overlay-svg={rank}
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      <defs>
        <radialGradient id={`${uid}-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor={ringColor} stopOpacity={rank >= 4 ? "0.24" : "0.12"} />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Rank 2+: Subtle harmonic inner wash */}
      {rank >= 2 && <circle cx="50" cy="50" r="44" fill={`url(#${uid}-aura)`} />}

      {/* Base outer rim: thickens and shifts color by rank */}
      <circle
        cx="50"
        cy="50"
        r="46"
        stroke={ringColor}
        strokeWidth={rank === 1 ? "1.3" : rank === 2 ? "1.8" : rank === 3 ? "2.1" : "2.4"}
        strokeOpacity={rank === 1 ? 0.52 : rank === 2 ? 0.72 : 0.92}
      />

      {/* Rank 1 (Initiate): Clean hairline inner seal + single base tick */}
      {rank === 1 && (
        <g data-overlay-tier="1">
          <circle cx="50" cy="50" r="42" stroke={ringColor} strokeWidth="0.6" strokeOpacity="0.3" />
          <line
            x1="50"
            y1="91"
            x2="50"
            y2="96"
            stroke={ringColor}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>
      )}

      {/* Rank 2 (Adept): Sky dashed harmonic orbit + twin horizon ticks */}
      {rank >= 2 && (
        <g data-overlay-tier="2">
          <circle
            cx="50"
            cy="50"
            r="41.5"
            stroke={ringColor}
            strokeWidth={rank >= 4 ? "1.2" : "1"}
            strokeOpacity={rank >= 3 ? 0.65 : 0.78}
            strokeDasharray={rank >= 3 ? "7 3.5" : "3.5 3.5"}
          />
          <line
            x1="2"
            y1="50"
            x2="8"
            y2="50"
            stroke={ringColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <line
            x1="92"
            y1="50"
            x2="98"
            y2="50"
            stroke={ringColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Rank 3 (Veteran): Arcane segmented bezel + 4 cardinal diamond rune studs */}
      {rank >= 3 && (
        <g data-overlay-tier="3">
          {[0, 90, 180, 270].map((deg) => (
            <polygon
              key={deg}
              points="50,0.5 53.2,4.8 50,9.1 46.8,4.8"
              fill={ringColor}
              stroke="#ffffff"
              strokeWidth="0.55"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
        </g>
      )}

      {/* Rank 4 (Master): Gilded octagonal filigree frame + 8 diagonal flare rays */}
      {rank >= 4 && (
        <g data-overlay-tier="4">
          <polygon
            points="50,4 82.5,17.5 96,50 82.5,82.5 50,96 17.5,82.5 4,50 17.5,17.5"
            stroke={ringColor}
            strokeWidth="1.15"
            strokeOpacity="0.82"
          />
          {[45, 135, 225, 315].map((deg) => (
            <line
              key={deg}
              x1="50"
              y1="2.5"
              x2="50"
              y2="10.5"
              stroke={ringColor}
              strokeWidth="1.7"
              strokeLinecap="round"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
        </g>
      )}

      {/* Rank 5 (Apex): Sovereign crown crest + diagonal star gems + 5-node constellation arc */}
      {rank >= 5 && (
        <g data-overlay-tier="5" className={animated ? "motion-safe:animate-pulse" : undefined}>
          <path
            d="M38 10 L43 1.5 L50 7 L57 1.5 L62 10 Z"
            fill={ringColor}
            stroke="#ffffff"
            strokeWidth="0.85"
            strokeLinejoin="round"
          />
          {[45, 135, 225, 315].map((deg) => (
            <polygon
              key={`apex-star-${deg}`}
              points="50,1.5 52.6,5.2 50,8.9 47.4,5.2"
              fill="#ffffff"
              stroke={accentColor}
              strokeWidth="0.6"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          {ABILITY_RANKS.map((n, idx) => {
            const deg = 54 + idx * 18;
            const rad = (deg * Math.PI) / 180;
            const cx = 50 + Math.cos(rad) * 46;
            const cy = 50 + Math.sin(rad) * 46;
            return (
              <circle
                key={`apex-node-${n}`}
                cx={cx}
                cy={cy}
                r="2.9"
                fill="#ffffff"
                stroke={ringColor}
                strokeWidth="1"
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}

export interface AbilityRankEmblemProps {
  /** Ability registry key or display label. */
  ability: string;
  /** Rank 1..5; if omitted, reads from AbilityContext (matching entityId/abilityKey) or intrinsic tier rank. */
  rank?: number | undefined;
  /** Optional character ID for AbilityContext per-character rank resolution. */
  entityId?: string | undefined;
  /** Visual scale preset. */
  size?: AbilityRankEmblemSize | undefined;
  /** Rendering strategy: 'auto' follows Nexus/Classic style, 'vector' forces geometric crest, 'atlas' uses Nexus artwork. */
  mode?: AbilityRankEmblemMode | undefined;
  /** Map of rank (1-5) -> image asset URL to swap emblem artwork as the character progresses. */
  assetsByRank?: AbilityRankAssetMap | undefined;
  /** Optional fallback image asset when `assetsByRank` omits a specific rank. */
  baseAssetUrl?: string | undefined;
  /** Optional custom overlay nodes per rank (1-5) rendered atop the emblem frame. */
  overlaysByRank?: AbilityRankOverlayMap | undefined;
  /** Show corner Roman numeral seal ('I'..'V'). */
  showRankCorner?: boolean | undefined;
  /** Show compact 1-5 pip readout beside/below the emblem. */
  showPips?: boolean | undefined;
  /** Show concise unboxed rank label (`Rank IV · Master`) underneath/beside emblem. */
  showProgressionLabel?: boolean | undefined;
  /** Respects app reduced-motion settings when enabled. */
  animated?: boolean | undefined;
  /** Masks spoiler-protected abilities cleanly. */
  masked?: boolean | undefined;
  /** Optional click handler (renders accessible button semantics when provided). */
  onClick?: (() => void) | undefined;
  /** Opens the expandable ability benefits & rank comparison modal when clicked (default: true when no custom onClick is supplied and not masked). */
  enableBenefitsModal?: boolean | undefined;
  /** Plays subtle rank-specific Web Audio transition cues when rank changes (default: true). */
  playRankAudio?: boolean | undefined;
  /** Show subtle context-aware hover tooltip displaying the rank level name (default: true when unmasked). */
  showTooltip?: boolean | undefined;
  /** Custom context subtitle displayed in the hover rank tooltip. */
  tooltipContext?: string | undefined;
  /** Notifies parent callers when the user upgrades or changes rank inside the benefits modal. */
  onRankChange?: ((nextRank: AbilityEmblemRank) => void) | undefined;
  className?: string | undefined;
}

/**
 * Progressive rank-driven ability emblem renderer (Ranks 1–5).
 * Swaps visual artwork assets (`assetsByRank` / Nexus illustrated atlas / custom SVG vector crests)
 * and layers rank-specific SVG or custom overlays to depict character ability progression.
 */
export function AbilityRankEmblem({
  ability,
  rank,
  entityId,
  size = "md",
  mode = "auto",
  assetsByRank,
  baseAssetUrl,
  overlaysByRank,
  showRankCorner = true,
  showPips = false,
  showProgressionLabel = false,
  animated = true,
  masked = false,
  onClick,
  enableBenefitsModal,
  playRankAudio = true,
  showTooltip = true,
  tooltipContext,
  onRankChange,
  className = "",
}: AbilityRankEmblemProps) {
  useAbilityRegistryVersion();
  const uid = useId();
  const tooltipId = useId();
  const uiStyle = useUiStyle();
  const isMinimal = useIsMinimal();
  const { motionActive } = useAppMotion();
  const ctx = useOptionalAbilityContext();
  const [failedUrls, setFailedUrls] = useState<Record<string, true>>({});
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [modalRankOverride, setModalRankOverride] = useState<AbilityEmblemRank | undefined>(
    undefined,
  );

  const def = useMemo(() => abilityDef(ability), [ability]);

  useEffect(() => {
    setModalRankOverride(undefined);
  }, [rank, def.key]);

  const resolvedRank: AbilityEmblemRank = useMemo(() => {
    if (modalRankOverride) return modalRankOverride;
    const explicit = parseAbilityRank(rank);
    if (explicit) return explicit;
    if (ctx && entityId) {
      const charRank = ctx.resolveCharacterRank(entityId, def.key);
      if (charRank) return charRank;
    }
    const ctxRank = ctx?.getActiveAbilityRank(def.key);
    if (ctxRank) return ctxRank;
    return tierToIntrinsicRank(def.tier);
  }, [modalRankOverride, rank, ctx, entityId, def.key, def.tier]);

  const rankTokens = EMBLEM_RANK_STYLE_TOKENS[resolvedRank];
  const prevRankRef = useRef<AbilityEmblemRank>(resolvedRank);
  const [rankTransition, setRankTransition] = useState<"idle" | "ascending" | "descending">("idle");

  useEffect(() => {
    const prev = prevRankRef.current;
    if (prev === resolvedRank) return;
    prevRankRef.current = resolvedRank;
    const direction = resolvedRank > prev ? "ascending" : "descending";
    setRankTransition(direction);
    if (playRankAudio && !masked && !isMinimal) {
      sfx.rankTransition(resolvedRank, direction);
    }
    if (direction === "ascending" && !masked) {
      triggerAbilityRankUpHaptic(resolvedRank, {
        previousRank: prev,
        abilityKey: def.key,
      });
    }
    const timer = window.setTimeout(() => {
      setRankTransition("idle");
    }, rankTokens.transitionDurationMs);
    return () => window.clearTimeout(timer);
  }, [resolvedRank, rankTokens.transitionDurationMs, playRankAudio, masked, isMinimal, def.key]);

  useEffect(() => {
    if (benefitsOpen || masked || !showTooltip) {
      setTooltipOpen(false);
    }
  }, [benefitsOpen, masked, showTooltip]);

  const rankMeta = abilityRankMeta(resolvedRank);
  const effectiveMode: AbilityRankEmblemMode =
    mode === "auto" ? (uiStyle === "nexus" ? "atlas" : "vector") : mode;

  const assetResolution = useMemo(() => {
    const raw = resolveRankEmblemAsset(resolvedRank, assetsByRank, baseAssetUrl, effectiveMode);
    if (raw.src && failedUrls[raw.src]) {
      return {
        src: null,
        sourceRank: null,
        strategy: effectiveMode === "atlas" ? ("atlas" as const) : ("vector" as const),
      };
    }
    return raw;
  }, [resolvedRank, assetsByRank, baseAssetUrl, effectiveMode, failedUrls]);

  const customKind = useMemo(
    () => resolveCustomAbilityEmblem(`${def.key} ${def.label}`, def.description),
    [def.key, def.label, def.description],
  );

  const Icon = def.icon;
  const shouldAnimate = animated && motionActive;
  const [inspectionMode, setInspectionMode] = useState<
    "idle" | "transitioning" | "floating" | "static"
  >("idle");

  useEffect(() => {
    if (!benefitsOpen) {
      setInspectionMode("idle");
      return;
    }
    if (!shouldAnimate || isReducedMotionOrMinimal()) {
      setInspectionMode("static");
      return;
    }
    setInspectionMode("transitioning");
    const timer = window.setTimeout(() => {
      setInspectionMode("floating");
    }, EMBLEM_FLOAT_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [benefitsOpen, shouldAnimate]);

  const impactActive = Boolean(
    ctx?.abilityImpact?.active && ctx.abilityImpact.abilityKey === def.key,
  );
  const customOverlay = overlaysByRank?.[resolvedRank];

  const coreTint = resolvedRank >= 4 ? rankMeta.ringColor : def.color;
  const labelText = masked ? "Masked ability emblem" : `${def.label} — ${rankMeta.label}`;

  const legendaryAuraActive = resolvedRank >= 5 && !masked;
  const transitionEffect = rankTransition === "idle" ? "none" : rankTokens.transitionEffect;

  const emblemStyle = useMemo<CSSCustomPropStyle>(() => {
    const glowPx = masked
      ? 0
      : impactActive
        ? Math.max(rankTokens.glowSizePx, 24)
        : rankTokens.glowSizePx;
    const auraSpreadPx = masked
      ? 0
      : impactActive
        ? Math.max(rankTokens.auraSpreadPx, 20)
        : rankTokens.auraSpreadPx;
    const saturation = masked
      ? 0.65
      : impactActive
        ? Math.max(rankTokens.saturation, 1.55)
        : rankTokens.saturation;
    return {
      "--emblem-rank": resolvedRank,
      "--emblem-saturation": saturation,
      "--emblem-brightness": masked ? 0.9 : rankTokens.brightness,
      "--emblem-glow-size": `${glowPx}px`,
      "--emblem-glow-opacity": masked ? 0.15 : impactActive ? 1 : rankTokens.glowOpacity,
      "--emblem-glow-color": resolvedRank >= 4 ? rankMeta.ringColor : def.color,
      "--emblem-accent-color": def.color,
      "--emblem-scale": shouldAnimate ? rankTokens.scale : 1,
      "--emblem-ring-speed": `${rankTokens.ringSpeedSec}s`,
      "--emblem-transition-ms": `${rankTokens.transitionDurationMs}ms`,
      "--emblem-aura-spread": `${auraSpreadPx}px`,
      background:
        resolvedRank >= 5
          ? `radial-gradient(circle at 50% 45%, ${rankMeta.ringColor}36, ${def.color}1c 68%, rgba(15,23,42,0.75) 100%)`
          : resolvedRank >= 3
            ? `radial-gradient(circle at 50% 45%, ${coreTint}26, rgba(15,23,42,0.58) 100%)`
            : `radial-gradient(circle at 50% 45%, ${coreTint}18, rgba(15,23,42,0.35) 100%)`,
    };
  }, [
    masked,
    impactActive,
    rankTokens,
    resolvedRank,
    rankMeta.ringColor,
    def.color,
    shouldAnimate,
    coreTint,
  ]);

  const modalEnabled = !onClick && !masked && enableBenefitsModal !== false;
  const tooltipEnabled = showTooltip && !masked && !benefitsOpen;
  const resolvedTooltipContext =
    tooltipContext ??
    (modalEnabled ? `${def.label} · Click to inspect` : `${def.label} · ${rankMeta.tagline}`);

  const emblemRole = emblemRoleFromAbilityKey(def.key);
  const innerContent = (
    <div
      data-ability-rank-emblem={def.key}
      data-emblem-rank={resolvedRank}
      data-emblem-tier={def.tier}
      data-emblem-asset-mode={assetResolution.strategy}
      data-emblem-asset-rank={assetResolution.sourceRank ?? resolvedRank}
      data-emblem-animated={shouldAnimate ? "on" : "off"}
      data-rank-transition={rankTransition}
      data-rank-transition-effect={transitionEffect}
      data-emblem-inspection-mode={inspectionMode}
      data-legendary-aura={legendaryAuraActive ? "active" : "inactive"}
      data-ability-impact={impactActive ? "active" : "idle"}
      title={tooltipEnabled ? undefined : labelText}
      className={`scu-rank-emblem relative inline-flex shrink-0 items-center justify-center rounded-full select-none ${SIZE_CLASSES[size]} ${
        impactActive ? "ring-2 ring-accent/80" : ""
      }`}
      style={emblemStyle}
    >
      {/* Layer 0: Unclipped rank & Legendary aura corona behind crest */}
      <span
        aria-hidden="true"
        data-emblem-aura={masked ? 0 : resolvedRank}
        className="scu-rank-emblem-aura pointer-events-none absolute -inset-1.5 rounded-full"
      />

      {/* Layer 1: Swapped rank asset OR role emblem OR illustrated atlas OR geometric vector crest */}
      <div className="scu-rank-emblem-core relative flex h-[84%] w-[84%] items-center justify-center overflow-hidden rounded-full">
        {masked ? (
          <span
            aria-hidden="true"
            className="h-3/4 w-3/4 rounded-full border border-dashed border-muted-foreground/40 bg-muted/30"
          />
        ) : emblemRole ? (
          <RoleEmblemGlyph role={emblemRole} className={CORE_ICON_CLASSES[size]} />
        ) : assetResolution.src ? (
          <img
            src={assetResolution.src}
            alt={labelText}
            referrerPolicy="no-referrer"
            decoding="async"
            data-emblem-asset-src={assetResolution.src}
            onError={() => {
              const badUrl = assetResolution.src;
              if (badUrl) {
                setFailedUrls((prev) => (prev[badUrl] ? prev : { ...prev, [badUrl]: true }));
              }
            }}
            className="h-full w-full object-contain transition-transform duration-200"
            style={{
              opacity: resolvedRank === 1 ? 0.86 : 1,
              transform: resolvedRank >= 5 ? "scale(1.04)" : undefined,
            }}
          />
        ) : assetResolution.strategy === "atlas" ? (
          <NexusAbilitySymbol
            name={def.key}
            label={def.label}
            description={def.description}
            rank={resolvedRank}
            className="h-full w-full"
          />
        ) : customKind ? (
          <span
            className="flex items-center justify-center transition-transform duration-200"
            style={{
              color: coreTint,
              opacity: resolvedRank === 1 ? 0.82 : 1,
            }}
          >
            <AbilityCustomEmblem
              kind={customKind}
              rank={resolvedRank}
              className={CORE_ICON_CLASSES[size]}
            />
          </span>
        ) : (
          <Icon
            className={CORE_ICON_CLASSES[size]}
            style={{
              color: coreTint,
              opacity: resolvedRank === 1 ? 0.84 : 1,
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Layer 2: Progressive Rank Overlay (either caller custom overlay or multi-stage SVG crest) */}
      <div
        data-emblem-overlay-rank={resolvedRank}
        className="scu-rank-emblem-overlay pointer-events-none absolute inset-0"
      >
        {!masked &&
          (customOverlay !== undefined ? (
            customOverlay
          ) : (
            <RankStageSvgOverlay
              rank={resolvedRank}
              accentColor={def.color}
              ringColor={rankMeta.ringColor}
              animated={shouldAnimate}
              uid={uid}
            />
          ))}
      </div>

      {/* Layer 3: Compact Roman corner seal */}
      {showRankCorner && !masked && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-0.5 -right-0.5 rounded bg-background/90 font-mono font-bold tracking-tight tabular-nums ring-1 ${CORNER_BADGE_CLASSES[size]}`}
          style={{
            color: rankMeta.ringColor,
            boxShadow: resolvedRank >= 4 ? `0 0 6px ${rankMeta.ringColor}66` : undefined,
            borderColor: rankMeta.ringColor,
          }}
        >
          {rankMeta.roman}
        </span>
      )}
    </div>
  );

  const wrappedBody =
    showPips || showProgressionLabel ? (
      <span className={`inline-flex items-center gap-2.5 ${className}`}>
        {innerContent}
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          {showProgressionLabel && (
            <span
              className="whitespace-nowrap text-[11px] font-semibold tracking-wide"
              style={{ color: rankMeta.ringColor }}
            >
              Rank {rankMeta.roman} · {rankMeta.shortTitle}
            </span>
          )}
          {showPips && <AbilityRankPips rank={resolvedRank} compact showTooltip={false} />}
        </span>
      </span>
    ) : (
      <span className={`inline-flex items-center ${className}`}>{innerContent}</span>
    );

  const tooltipNode =
    tooltipEnabled && tooltipOpen ? (
      <AbilityRankTooltipCard id={tooltipId} rank={resolvedRank} context={resolvedTooltipContext} />
    ) : null;

  if (onClick) {
    return (
      <span
        className="relative inline-flex items-center"
        onMouseEnter={tooltipEnabled ? () => setTooltipOpen(true) : undefined}
        onMouseLeave={tooltipEnabled ? () => setTooltipOpen(false) : undefined}
      >
        <button
          type="button"
          onClick={() => {
            setTooltipOpen(false);
            onClick();
          }}
          onFocus={tooltipEnabled ? () => setTooltipOpen(true) : undefined}
          onBlur={tooltipEnabled ? () => setTooltipOpen(false) : undefined}
          aria-label={labelText}
          aria-describedby={tooltipEnabled && tooltipOpen ? tooltipId : undefined}
          className="group inline-flex cursor-pointer items-center rounded-xl text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {wrappedBody}
        </button>
        {tooltipNode}
      </span>
    );
  }

  if (modalEnabled) {
    return (
      <span
        className="relative inline-flex items-center"
        onMouseEnter={tooltipEnabled ? () => setTooltipOpen(true) : undefined}
        onMouseLeave={tooltipEnabled ? () => setTooltipOpen(false) : undefined}
      >
        <button
          type="button"
          onClick={() => {
            setTooltipOpen(false);
            setBenefitsOpen(true);
          }}
          onFocus={tooltipEnabled ? () => setTooltipOpen(true) : undefined}
          onBlur={tooltipEnabled ? () => setTooltipOpen(false) : undefined}
          aria-label={`Inspect ${labelText} benefits`}
          aria-haspopup="dialog"
          aria-expanded={benefitsOpen}
          aria-describedby={tooltipEnabled && tooltipOpen ? tooltipId : undefined}
          className="group inline-flex cursor-pointer items-center rounded-xl text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {wrappedBody}
        </button>
        {tooltipNode}
        {benefitsOpen && (
          <AbilityBenefitsModal
            ability={def.key}
            rank={resolvedRank}
            open={benefitsOpen}
            onOpenChange={setBenefitsOpen}
            playRankAudio={false}
            onRankChange={(next) => {
              setModalRankOverride(next);
              onRankChange?.(next);
            }}
          />
        )}
      </span>
    );
  }

  if (tooltipEnabled) {
    return (
      <span
        className="relative inline-flex items-center"
        onMouseEnter={() => setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocus={() => setTooltipOpen(true)}
        onBlur={() => setTooltipOpen(false)}
        aria-describedby={tooltipOpen ? tooltipId : undefined}
      >
        {wrappedBody}
        {tooltipNode}
      </span>
    );
  }

  return wrappedBody;
}

/**
 * Renders all 5 progression ranks (I → V) side by side using `AbilityRankEmblem`
 * so characters and admins can compare or step through how assets and overlays scale.
 */
export function AbilityRankProgressionStrip({
  ability,
  currentRank,
  onSelectRank,
  assetsByRank,
  baseAssetUrl,
  overlaysByRank,
  mode = "auto",
  size = "sm",
  className = "",
}: {
  ability: string;
  currentRank: number | undefined;
  onSelectRank?: ((rank: AbilityEmblemRank) => void) | undefined;
  assetsByRank?: AbilityRankAssetMap | undefined;
  baseAssetUrl?: string | undefined;
  overlaysByRank?: AbilityRankOverlayMap | undefined;
  mode?: AbilityRankEmblemMode | undefined;
  size?: AbilityRankEmblemSize | undefined;
  className?: string | undefined;
}) {
  const active = parseAbilityRank(currentRank) ?? 1;

  return (
    <div
      data-emblem-progression="true"
      data-current-rank={active}
      role={onSelectRank ? "group" : undefined}
      aria-label="Ability rank 1 to 5 visual progression"
      className={`flex flex-wrap items-center gap-2 ${className}`}
    >
      {ABILITY_RANKS.map((stepRank, idx) => {
        const meta = abilityRankMeta(stepRank);
        const isCurrent = stepRank === active;
        const isUnlocked = stepRank <= active;
        const stepContext = isCurrent
          ? "Current active rank"
          : isUnlocked
            ? "Unlocked mastery rank"
            : onSelectRank
              ? "Locked — click to preview"
              : "Locked progression stage";
        const sharedClassName = `group flex flex-col items-center gap-1 rounded-xl border px-2 py-1.5 transition ${
          isCurrent
            ? "bg-accent/15 text-foreground"
            : isUnlocked
              ? "border-border/70 bg-card/50 text-foreground/85 hover:border-accent/60"
              : "border-border/40 bg-background/40 text-muted-foreground opacity-65 hover:opacity-100"
        } ${onSelectRank ? "cursor-pointer" : "cursor-default"}`;
        const sharedStyle = isCurrent
          ? {
              borderColor: meta.ringColor,
              boxShadow: `0 0 10px ${meta.ringColor}44`,
            }
          : undefined;
        const stepContent = (
          <>
            <AbilityRankEmblem
              ability={ability}
              rank={stepRank}
              size={size}
              mode={mode}
              assetsByRank={assetsByRank}
              baseAssetUrl={baseAssetUrl}
              overlaysByRank={overlaysByRank}
              showRankCorner={false}
              animated={isCurrent}
              enableBenefitsModal={false}
              playRankAudio={false}
              tooltipContext={stepContext}
            />
            <span
              className="whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-wider"
              style={isCurrent ? { color: meta.ringColor } : undefined}
            >
              {meta.roman} · {meta.shortTitle}
            </span>
          </>
        );
        return (
          <div key={stepRank} className="inline-flex items-center gap-1.5">
            {idx > 0 && (
              <span aria-hidden="true" className="text-[10px] text-muted-foreground/60 select-none">
                →
              </span>
            )}
            {onSelectRank ? (
              <button
                type="button"
                onClick={() => onSelectRank(stepRank)}
                aria-pressed={isCurrent}
                aria-label={meta.label}
                className={sharedClassName}
                style={sharedStyle}
              >
                {stepContent}
              </button>
            ) : (
              <div aria-label={meta.label} className={sharedClassName} style={sharedStyle}>
                {stepContent}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
