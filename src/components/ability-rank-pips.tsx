import { useId, useState } from "react";
import { ABILITY_RANKS, abilityRankMeta, parseAbilityRank } from "@/lib/ability-rank";
import { AbilityRankTooltipCard } from "@/components/ability-rank-tooltip";

/**
 * Compact 1-5 pip & Roman rank indicator for Ability Emblems across Classic, Minimal, Manga & Nexus.
 */
export function AbilityRankPips({
  rank,
  accentColor,
  compact = false,
  showLabel = false,
  showTooltip = true,
  tooltipContext,
  className = "",
}: {
  rank: number | undefined;
  accentColor?: string | undefined;
  compact?: boolean | undefined;
  showLabel?: boolean | undefined;
  showTooltip?: boolean | undefined;
  tooltipContext?: string | undefined;
  className?: string | undefined;
}) {
  const parsed = parseAbilityRank(rank);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipId = useId();

  if (!parsed) return null;
  const meta = abilityRankMeta(parsed);
  const activeColor = accentColor ?? meta.ringColor;

  return (
    <span
      data-ability-rank={parsed}
      data-rank-title={meta.shortTitle}
      title={showTooltip ? undefined : meta.label}
      onMouseEnter={showTooltip ? () => setTooltipOpen(true) : undefined}
      onMouseLeave={showTooltip ? () => setTooltipOpen(false) : undefined}
      aria-describedby={showTooltip && tooltipOpen ? tooltipId : undefined}
      className={`relative inline-flex shrink-0 items-center gap-1 ${className}`}
    >
      <span className="inline-flex items-center gap-[2px]" aria-label={meta.label}>
        {ABILITY_RANKS.map((n) => {
          const filled = n <= parsed;
          return (
            <span
              key={n}
              aria-hidden="true"
              className={`${compact ? "h-1 w-1" : "h-1.5 w-1.5"} rounded-full transition-colors`}
              style={{
                backgroundColor: filled ? activeColor : "currentColor",
                opacity: filled ? 1 : 0.22,
                boxShadow: filled && parsed >= 4 ? `0 0 4px ${activeColor}` : undefined,
              }}
            />
          );
        })}
      </span>
      <span
        className={`font-mono font-bold uppercase tracking-wider tabular-nums ${
          compact ? "text-[8px]" : "text-[9px]"
        }`}
        style={{ color: activeColor }}
      >
        {showLabel ? `${meta.roman} · ${meta.shortTitle}` : meta.roman}
      </span>
      {showTooltip && tooltipOpen && (
        <AbilityRankTooltipCard
          id={tooltipId}
          rank={parsed}
          context={tooltipContext ?? meta.tagline}
          compact
        />
      )}
    </span>
  );
}
