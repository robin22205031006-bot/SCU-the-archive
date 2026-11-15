import { Zap } from "lucide-react";
import { ABILITY_RANK_META, normalizeAbilityRank } from "@/lib/ability-rank";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import type { AbilityImpactState } from "@/context/AbilityContext";

export function AbilityImpactOverlay({
  impact,
  compact = false,
}: {
  impact: AbilityImpactState | null | undefined;
  compact?: boolean;
}) {
  const { motionActive } = useAppMotion();
  const masked = useSpoilerMask("abilities");

  if (!impact?.active) return null;

  const rank = normalizeAbilityRank(impact.rank, 1);
  const meta = ABILITY_RANK_META[rank];
  const color = impact.color || meta.ringColor;

  return (
    <div
      role="status"
      aria-live="polite"
      data-ability-impact="active"
      data-impact-rank={rank}
      data-impact-reason={impact.reason}
      className={`pointer-events-none absolute inset-0 z-20 flex flex-col justify-end overflow-hidden ${
        compact ? "p-2" : "p-3 sm:p-4"
      }`}
    >
      {/* Perimeter impact shockwave frame */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 rounded-[inherit] border-2 ${motionActive ? "animate-pulse" : ""}`}
        style={{
          borderColor: color,
          boxShadow: `inset 0 0 ${16 + rank * 6}px ${color}66, 0 0 ${14 + rank * 4}px ${color}44`,
        }}
      />

      {/* Crisp HUD impact banner */}
      <div
        className="relative flex w-fit max-w-full items-center gap-2 rounded-xl border bg-background/90 px-3 py-1.5 shadow-lg backdrop-blur-md"
        style={{
          borderColor: color,
          boxShadow: `0 0 18px ${color}55`,
        }}
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-background"
          style={{ backgroundColor: color }}
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]">
            <span style={{ color }}>AbilityImpact</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground">
              Rank {meta.roman} ({meta.shortTitle})
            </span>
          </div>
          <p className="truncate text-xs font-semibold text-foreground">
            {impact.label}
            {!masked && impact.characterName ? ` · ${impact.characterName}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
