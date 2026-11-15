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
  const title = `${def.label} — ${def.tier}${rankMeta ? ` (${rankMeta.label})` : ""}${def.group === "beast" ? " · Beast trait" : ""}${def.description ? `\n${def.description}` : ""}`;

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
          onClick={(e) => {
            e.stopPropagation();
            triggerAnimeActionCut({
              color: def.color,
              label: def.label,
              intensity: mythic ? "heavy" : "normal",
            });
            setFxOpen(true);
          }}
          aria-label={`Play ${def.label} animation`}
          className={`scu-tactile inline-flex items-center gap-1 border border-border pr-1.5 text-xs text-accent hover:border-accent ${mythic || legendary ? "studio-bloom-node " : ""}${className}`}
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
        <AbilityFxShowcase name={def.key} open={fxOpen} onOpenChange={setFxOpen} />
      </>
    );
  if (nexus)
    return (
      <span
        title={title}
        data-ability-rank={resolvedRank}
        className={`inline-flex items-center gap-1 border border-border pr-1.5 text-xs text-accent ${mythic || legendary ? "studio-bloom-node " : ""}${className}`}
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
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${mythic ? "animate-pulse " : ""}${mythic || legendary ? "studio-bloom-node " : ""}${className}`}
      style={{
        color: def.color,
        borderColor: mythic ? "#ff2d2d" : `${def.color}66`,
        background: mythic
          ? "linear-gradient(90deg, #ff2d2d33, #7c3aed33)"
          : legendary
            ? `linear-gradient(90deg, ${def.color}30, #d4af3730)`
            : rarePlus
              ? `${def.color}1f`
              : ancient
                ? `${def.color}1a`
                : `${def.color}14`,
        boxShadow: mythic
          ? `0 0 10px #ff2d2daa, 0 0 22px #ff2d2d55, inset 0 0 6px #ff2d2d33`
          : legendary
            ? `0 0 10px ${def.color}55, 0 0 20px #d4af3733`
            : rarePlus
              ? `0 0 7px ${def.color}40`
              : ancient
                ? `0 0 5px ${def.color}26`
                : undefined,
      }}
    >
      {isMinimal && customEmblem ? (
        <AbilityCustomEmblem kind={customEmblem} className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Icon className="h-3 w-3 shrink-0" style={{ color: def.color }} />
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
