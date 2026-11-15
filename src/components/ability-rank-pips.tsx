import { ABILITY_RANKS, abilityRankMeta, parseAbilityRank } from "@/lib/ability-rank";

/**
 * Compact 1-5 pip & Roman rank indicator for Ability Emblems across Classic, Minimal, Manga & Nexus.
 */
export function AbilityRankPips({
  rank,
  accentColor,
  compact = false,
  showLabel = false,
  className = "",
}: {
  rank: number | undefined;
  accentColor?: string | undefined;
  compact?: boolean | undefined;
  showLabel?: boolean | undefined;
  className?: string | undefined;
}) {
  const parsed = parseAbilityRank(rank);
  if (!parsed) return null;
  const meta = abilityRankMeta(parsed);
  const activeColor = accentColor ?? meta.ringColor;

  return (
    <span
      data-ability-rank={parsed}
      data-rank-title={meta.shortTitle}
      title={meta.label}
      className={`inline-flex shrink-0 items-center gap-1 ${className}`}
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
    </span>
  );
}
