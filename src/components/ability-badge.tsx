import { abilityDef, type AbilityTier } from "@/lib/abilities";
import { useUiStyle } from "@/lib/ui-style";
import { useActiveGenre, useIsManga, useIsMinimal } from "@/hooks/use-ui-mode";
import { GenreAbilityEmblem } from "@/components/genre-decorations";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";
import { AbilityCustomEmblem } from "@/components/ability-custom-emblem";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { resolveCustomAbilityEmblem } from "@/lib/ability-emblem-resolver";
import {
  abilityRankMeta,
  parseAbilityRank,
  resolveAssignedAbilityRank,
  tierToIntrinsicRank,
} from "@/lib/ability-rank";
import { useState } from "react";
import { useNexusAdvancedFx } from "@/hooks/use-nexus-advanced-fx";
import { useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { AbilityFxShowcase } from "@/components/ability-fx-showcase";
import { triggerAnimeActionCut } from "@/hooks/use-anime-hitstop";
import { useOptionalAbilityContext } from "@/context/AbilityContext";

const TIER_RANK: Record<AbilityTier, number> = {
  Mythic: 7,
  Legendary: 6,
  Rare: 5,
  Exceptional: 4,
  Unique: 3,
  Ancient: 2,
  Standard: 1,
  Role: 0,
};

/** Compact ability badge with registry/description-derived emblem, rank 1-5 indicator, and tier tooltip. */
export function AbilityBadge({
  name,
  level,
  showRank = false,
  className = "",
}: {
  name: string;
  level?: number | undefined;
  showRank?: boolean | undefined;
  className?: string | undefined;
}) {
  const uiStyle = useUiStyle();
  const nexus = uiStyle === "nexus";
  const isManga = useIsManga();
  const minimalMode = useIsMinimal();
  const isMinimal = !nexus && !isManga && minimalMode;
  const activeGenre = useActiveGenre();
  const advanced = useNexusAdvancedFx();
  const [fxOpen, setFxOpen] = useState(false);
  const abilityCtx = useOptionalAbilityContext();
  useAbilityRegistryVersion();
  const def = abilityDef(name);
  const Icon = def.icon;
  const mythic = def.tier === "Mythic";
  const legendary = def.tier === "Legendary";
  const rarePlus = def.tier === "Rare" || def.tier === "Exceptional" || def.tier === "Unique";
  const ancient = def.tier === "Ancient";
  const resolvedRank =
    parseAbilityRank(level) ?? (showRank ? tierToIntrinsicRank(def.tier) : undefined);
  const rankMeta = resolvedRank ? abilityRankMeta(resolvedRank) : null;
  const customEmblem = resolveCustomAbilityEmblem(`${def.key} ${def.label}`, def.description);
  const impactOnSelf = Boolean(
    abilityCtx?.abilityImpact?.active && abilityCtx.abilityImpact.abilityKey === def.key,
  );
  const title = `${def.label} — ${def.tier}${rankMeta ? ` (${rankMeta.label})` : ""}${def.group === "beast" ? " · Beast trait" : ""}${def.description ? `\n${def.description}` : ""}`;

  const effectiveRank = resolvedRank ?? tierToIntrinsicRank(def.tier);
  const rankGlow = rankMeta?.ringColor ?? def.color;
  const stageBorderColor = resolvedRank
    ? resolvedRank >= 5
      ? rankGlow
      : resolvedRank >= 4
        ? "#d4af37"
        : resolvedRank >= 3
          ? def.color
          : `${def.color}${resolvedRank === 2 ? "88" : "44"}`
    : mythic
      ? "#ff2d2d"
      : `${def.color}66`;
  const stageShadow = resolvedRank
    ? resolvedRank === 5
      ? `0 0 12px ${rankGlow}aa, 0 0 24px ${def.color}66, inset 0 0 8px ${rankGlow}44`
      : resolvedRank === 4
        ? `0 0 10px #d4af3777, 0 0 18px ${def.color}44, inset 0 0 4px #d4af3722`
        : resolvedRank === 3
          ? `0 0 8px ${def.color}55`
          : resolvedRank === 2
            ? `0 0 4px ${def.color}33`
            : undefined
    : mythic
      ? `0 0 10px #ff2d2daa, 0 0 22px #ff2d2d55, inset 0 0 6px #ff2d2d33`
      : legendary
        ? `0 0 10px ${def.color}55, 0 0 20px #d4af3733`
        : rarePlus
          ? `0 0 7px ${def.color}40`
          : ancient
            ? `0 0 5px ${def.color}26`
            : undefined;
  const stageCrestMark =
    resolvedRank === 5 ? "✦" : resolvedRank === 4 ? "◈" : resolvedRank === 3 ? "◆" : null;

  if (isManga)
    return (
      <GenreAbilityEmblem
        theme={activeGenre}
        label={def.label}
        tier={def.tier}
        icon={Icon}
        rank={resolvedRank}
        customEmblem={customEmblem}
        title={title}
        className={className}
      />
    );
  if (nexus && advanced)
    return (
      <>
        <button
          type="button"
          title={title}
          data-ability-rank={resolvedRank}
          data-emblem-stage={effectiveRank}
          data-ability-impact={impactOnSelf ? "active" : "idle"}
          onClick={(e) => {
            e.stopPropagation();
            abilityCtx?.selectAbility(def.key, {
              ...(resolvedRank ? { rank: resolvedRank } : {}),
            });
            triggerAnimeActionCut({
              color: def.color,
              label: def.label,
              intensity: mythic || effectiveRank === 5 ? "heavy" : "normal",
            });
            setFxOpen(true);
          }}
          aria-label={`Play ${def.label} animation`}
          style={
            resolvedRank && resolvedRank >= 3
              ? { borderColor: stageBorderColor, boxShadow: stageShadow }
              : undefined
          }
          className={`scu-tactile inline-flex items-center gap-1 border border-border pr-1.5 text-xs text-accent hover:border-accent ${mythic || legendary || effectiveRank >= 4 ? "studio-bloom-node " : ""}${impactOnSelf ? "ring-2 ring-accent/70 " : ""}${className}`}
        >
          <NexusAbilitySymbol
            name={def.key}
            label={def.label}
            description={def.description}
            rank={resolvedRank}
            className="h-6 w-6"
          />
          <span>{def.label}</span>
          {resolvedRank && <AbilityRankPips rank={resolvedRank} compact />}
        </button>
        <AbilityFxShowcase
          name={def.key}
          initialRank={resolvedRank}
          open={fxOpen}
          onOpenChange={setFxOpen}
        />
      </>
    );
  if (nexus)
    return (
      <span
        title={title}
        data-ability-rank={resolvedRank}
        data-emblem-stage={effectiveRank}
        style={
          resolvedRank && resolvedRank >= 3
            ? { borderColor: stageBorderColor, boxShadow: stageShadow }
            : undefined
        }
        className={`inline-flex items-center gap-1 border border-border pr-1.5 text-xs text-accent ${mythic || legendary || effectiveRank >= 4 ? "studio-bloom-node " : ""}${className}`}
      >
        <NexusAbilitySymbol
          name={def.key}
          label={def.label}
          description={def.description}
          rank={resolvedRank}
          className="h-6 w-6"
        />
        <span>{def.label}</span>
        {resolvedRank && <AbilityRankPips rank={resolvedRank} compact />}
      </span>
    );
  return (
    <span
      title={title}
      data-ability-rank={resolvedRank}
      data-emblem-stage={effectiveRank}
      data-ability-impact={impactOnSelf ? "active" : "idle"}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${mythic || effectiveRank === 5 ? "animate-pulse " : ""}${mythic || legendary || effectiveRank >= 4 ? "studio-bloom-node " : ""}${impactOnSelf ? "ring-2 ring-accent/70 " : ""}${className}`}
      style={{
        color: def.color,
        borderColor: stageBorderColor,
        borderWidth: resolvedRank && resolvedRank >= 4 ? "1.5px" : undefined,
        background:
          resolvedRank && resolvedRank >= 5
            ? `linear-gradient(90deg, ${def.color}38, ${rankGlow}33)`
            : resolvedRank && resolvedRank >= 4
              ? `linear-gradient(90deg, ${def.color}28, #d4af3728)`
              : mythic
                ? "linear-gradient(90deg, #ff2d2d33, #7c3aed33)"
                : legendary
                  ? `linear-gradient(90deg, ${def.color}30, #d4af3730)`
                  : rarePlus
                    ? `${def.color}1f`
                    : ancient
                      ? `${def.color}1a`
                      : `${def.color}14`,
        boxShadow: stageShadow,
      }}
    >
      {isMinimal && customEmblem ? (
        <AbilityCustomEmblem
          kind={customEmblem}
          rank={resolvedRank}
          className="h-3.5 w-3.5 shrink-0"
        />
      ) : (
        <Icon className="h-3 w-3 shrink-0" style={{ color: def.color }} />
      )}
      {stageCrestMark && (
        <span aria-hidden="true" className="text-[9px] leading-none" style={{ color: rankGlow }}>
          {stageCrestMark}
        </span>
      )}
      <span>{def.label}</span>
      {resolvedRank && <AbilityRankPips rank={resolvedRank} compact />}
    </span>
  );
}

/** Row of ability badges: top N featured + "+X more" expander. */
export function AbilityBadgeRow({
  abilities,
  max = 3,
  levels,
  showRank = false,
}: {
  abilities: string[];
  max?: number | undefined;
  levels?: Record<string, number | undefined> | undefined;
  showRank?: boolean | undefined;
}) {
  if (!abilities.length) return null;
  const shown = abilities.slice(0, max);
  const rest = abilities.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((a) => (
        <AbilityBadge
          key={a}
          name={a}
          level={resolveAssignedAbilityRank(a, levels)}
          showRank={showRank}
        />
      ))}
      {rest > 0 && (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          +{rest} more
        </span>
      )}
    </div>
  );
}

export { TIER_RANK };
