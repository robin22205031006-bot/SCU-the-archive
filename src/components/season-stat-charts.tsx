import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { resolveNexusStats, resolveSeasonCombatStats } from "@/lib/nexus-season";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { StatRadar } from "@/components/stat-radar";

const BAR_EASE = [0.16, 1, 0.3, 1] as const;

export interface SeasonStatChartsProps {
  stats: unknown;
  seasonKey: string | null;
  seasonLabel: string;
  characterName: string;
  selectedAbility?: string | null;
  abilityLabel?: string | null;
  variant?: "nexus" | "classic";
  comparingSeasons?: boolean;
  onToggleCompare?: () => void;
  className?: string;
}

/**
 * Keeps both the StatRadar polygon and 7-stat Framer Motion bar chart mounted
 * across season switches so charts animate smoothly into their new data states.
 */
export function SeasonStatCharts({
  stats,
  seasonKey,
  seasonLabel,
  characterName,
  selectedAbility = null,
  abilityLabel = null,
  variant = "nexus",
  comparingSeasons = false,
  onToggleCompare,
  className = "",
}: SeasonStatChartsProps) {
  const { motionActive } = useAppMotion();
  const nexusMoving = useNexusMotion();
  const animate = variant === "nexus" ? motionActive && nexusMoving : motionActive;

  const statVals = resolveNexusStats(stats, seasonKey, selectedAbility);
  const combatVals = resolveSeasonCombatStats(stats, seasonKey, selectedAbility);
  const average = Math.round(
    statVals.reduce((sum, s) => sum + s.value, 0) / Math.max(1, statVals.length),
  );
  const peak = statVals.reduce((best, cur) => (cur.value > best.value ? cur : best), statVals[0]!);

  const barTransition = animate ? { duration: 0.45, ease: BAR_EASE } : { duration: 0 };

  const isNexus = variant === "nexus";
  const shellClass = isNexus
    ? `rounded-2xl border border-cyan-400/35 bg-slate-950/85 p-5 shadow-[0_0_24px_rgba(56,189,248,0.12)] ${className}`
    : `rounded-xl border border-white/10 bg-black/45 p-4 ${className}`;

  const barTrackClass = isNexus ? "bg-slate-800/80" : "bg-white/10";
  const barFillClass = isNexus
    ? "bg-gradient-to-r from-cyan-400 to-sky-300"
    : "bg-gradient-to-r from-[#fb4d6d] to-amber-400";

  return (
    <section
      aria-label="Season stat radar and bar chart"
      data-spoiler="char"
      className={shellClass}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-accent">
            {abilityLabel ? `${abilityLabel} · ` : ""}
            {seasonLabel}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Avg <span className="font-mono font-bold tabular-nums text-foreground">{average}</span>
            {peak && peak.value > 0 ? (
              <>
                {" "}
                · Peak {peak.label}{" "}
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {peak.value}
                </span>
              </>
            ) : null}
          </p>
        </div>

        {onToggleCompare && (
          <button
            type="button"
            onClick={onToggleCompare}
            aria-expanded={comparingSeasons}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
              comparingSeasons
                ? "border-accent bg-accent/20 text-accent"
                : "border-border bg-background/60 text-foreground hover:border-accent/70"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            {comparingSeasons ? "Hide comparison" : "Compare seasons"}
          </button>
        )}
      </div>

      <div className="grid items-center gap-6 md:grid-cols-[240px_1fr]">
        <div className="flex justify-center rounded-xl border border-border/60 bg-background/40 p-2.5">
          <StatRadar a={combatVals} nameA={`${characterName} · ${seasonLabel}`} size={212} />
        </div>

        <div className="space-y-2.5" role="list" aria-label="Season stat bars">
          {statVals.map((s) => (
            <div
              key={s.key}
              role="listitem"
              aria-label={`${s.label}: ${s.value}`}
              className="space-y-1"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-foreground/90">{s.label}</span>
                <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                  {s.value}
                </span>
              </div>
              <div className={`h-2 w-full overflow-hidden rounded-sm ${barTrackClass}`}>
                <motion.div
                  initial={false}
                  animate={{ scaleX: s.value / 100 }}
                  transition={barTransition}
                  style={{ transformOrigin: "left" }}
                  data-stat-bar={s.key}
                  data-value={s.value}
                  className={`h-full w-full ${barFillClass}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
