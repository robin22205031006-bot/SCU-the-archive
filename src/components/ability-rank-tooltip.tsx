import { abilityRankMeta, parseAbilityRank } from "@/lib/ability-rank";

export interface AbilityRankTooltipCardProps {
  id: string;
  rank: number;
  context?: string | undefined;
  compact?: boolean | undefined;
}

/**
 * Subtle floating rank badge tooltip rendered on hover/focus over ability emblem
 * rank icons so users can see the rank level name (e.g. 'Initiate', 'Master')
 * immediately without opening the benefits modal.
 */
export function AbilityRankTooltipCard({
  id,
  rank,
  context,
  compact = false,
}: AbilityRankTooltipCardProps) {
  const parsed = parseAbilityRank(rank);
  if (!parsed) return null;
  const meta = abilityRankMeta(parsed);
  const subtitle = context?.trim() || meta.tagline;

  return (
    <span
      id={id}
      role="tooltip"
      data-ability-rank-tooltip={parsed}
      data-rank-level-name={meta.shortTitle}
      className={`pointer-events-none absolute bottom-full left-1/2 z-[120] mb-2 -translate-x-1/2 rounded-lg border border-border/85 bg-popover/95 text-left font-normal normal-case tracking-normal text-popover-foreground shadow-lg backdrop-blur-md transition-opacity duration-150 ${
        compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]"
      }`}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap leading-tight">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            backgroundColor: meta.ringColor,
            boxShadow: parsed >= 4 ? `0 0 6px ${meta.ringColor}` : undefined,
          }}
        />
        <span className="font-semibold" style={{ color: meta.ringColor }}>
          {meta.shortTitle}
        </span>
        <span className="font-mono text-[9px] text-muted-foreground">Rank {meta.roman}</span>
      </span>
      {subtitle && (
        <span className="mt-0.5 block whitespace-nowrap text-[10px] leading-tight text-muted-foreground">
          {subtitle}
        </span>
      )}
    </span>
  );
}
