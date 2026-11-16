import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeftRight, BarChart3, TrendingDown, TrendingUp, X } from "lucide-react";
import {
  buildSeasonCompareOptions,
  resolveSeasonStatComparison,
  type SeasonCompareOption,
} from "@/lib/nexus-season";
import type { Entity } from "@/lib/entities";
import type { Series } from "@/lib/series";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { StatRadar } from "@/components/stat-radar";

const BAR_EASE = [0.16, 1, 0.3, 1] as const;

export interface SeasonStatComparisonProps {
  entity: Pick<Entity, "id" | "name" | "stats" | "abilities">;
  seriesList?:
    | ReadonlyArray<Pick<Series, "id" | "title" | "season_count" | "season_names">>
    | null
    | undefined;
  memberships?: ReadonlyArray<{ series_id?: string | null }> | null | undefined;
  activeSeasonKey?: string | null | undefined;
  abilities?: ReadonlyArray<{ name: string; label: string }> | undefined;
  selectedAbility?: string | null | undefined;
  variant?: "nexus" | "manga" | undefined;
  onClose?: (() => void) | undefined;
  className?: string | undefined;
}

function pickInitialPair(
  options: SeasonCompareOption[],
  activeSeasonKey?: string | null,
): { a: string; b: string } {
  if (options.length === 0) return { a: "all", b: "all" };
  if (options.length === 1) return { a: options[0]!.key, b: options[0]!.key };

  const activeKey =
    activeSeasonKey && options.some((o) => o.key === activeSeasonKey) ? activeSeasonKey : null;
  const withStats = options.filter((o) => o.hasStats);

  if (activeKey && activeKey !== "all") {
    const activeIdx = options.findIndex((o) => o.key === activeKey);
    const earlierWithStats = options
      .slice(0, activeIdx)
      .reverse()
      .find((o) => o.hasStats && o.key !== activeKey);
    const fallbackOther =
      earlierWithStats ??
      withStats.find((o) => o.key !== activeKey) ??
      options.find((o) => o.key !== activeKey) ??
      options[0]!;
    return { a: fallbackOther.key, b: activeKey };
  }

  if (withStats.length >= 2) {
    return { a: withStats[0]!.key, b: withStats[1]!.key };
  }
  return { a: options[0]!.key, b: options[1]!.key };
}

function formatSignedDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return `${delta}`;
  return "±0";
}

export function SeasonStatComparison({
  entity,
  seriesList,
  memberships,
  activeSeasonKey = null,
  abilities = [],
  selectedAbility = null,
  variant = "nexus",
  onClose,
  className = "",
}: SeasonStatComparisonProps) {
  const { motionActive } = useAppMotion();
  const nexusMoving = useNexusMotion();
  const animate = variant === "nexus" ? motionActive && nexusMoving : motionActive;

  const options = useMemo(
    () =>
      buildSeasonCompareOptions({
        stats: entity.stats,
        seriesList: seriesList ?? null,
        memberships: memberships ?? null,
      }),
    [entity.stats, seriesList, memberships],
  );

  const initialPair = useMemo(
    () => pickInitialPair(options, activeSeasonKey),
    [options, activeSeasonKey],
  );

  const [seasonA, setSeasonA] = useState<string>(initialPair.a);
  const [seasonB, setSeasonB] = useState<string>(initialPair.b);
  const [abilityKey, setAbilityKey] = useState<string>(selectedAbility ?? "");

  // Keep selections valid when options or active character change
  useEffect(() => {
    setSeasonA((prev) => (options.some((o) => o.key === prev) ? prev : initialPair.a));
    setSeasonB((prev) => (options.some((o) => o.key === prev) ? prev : initialPair.b));
  }, [options, initialPair.a, initialPair.b]);

  useEffect(() => {
    setAbilityKey(selectedAbility ?? "");
  }, [selectedAbility, entity.id]);

  const optionA = options.find((o) => o.key === seasonA) ?? options[0];
  const optionB = options.find((o) => o.key === seasonB) ?? options[1] ?? options[0];

  const comparison = useMemo(
    () =>
      resolveSeasonStatComparison(
        entity.stats,
        optionA?.key ?? "all",
        optionB?.key ?? "all",
        abilityKey || null,
      ),
    [entity.stats, optionA?.key, optionB?.key, abilityKey],
  );

  const hasAnyValues = comparison.deltas.some((d) => d.valueA > 0 || d.valueB > 0);
  const isNexus = variant === "nexus";

  const containerClass = isNexus
    ? `rounded-2xl border border-cyan-400/35 bg-slate-950/88 p-5 shadow-[0_0_28px_rgba(56,189,248,0.14)] ${className}`
    : `border-2 border-border bg-card p-4 shadow-[4px_4px_0_var(--border)] ${className}`;

  const selectClass = isNexus
    ? "h-9 w-full min-w-0 rounded-md border border-border bg-background/85 px-2.5 text-xs text-foreground focus:border-accent focus:outline-none"
    : "h-9 w-full min-w-0 border border-border bg-background px-2.5 font-mono text-xs font-bold focus:border-primary focus:outline-none";

  const seriesAColorClass = isNexus ? "bg-[#fb4d6d]" : "bg-foreground";
  const seriesBColorClass = isNexus ? "bg-[#f5b942]" : "bg-primary";
  const barTransition = animate ? { duration: 0.4, ease: BAR_EASE } : { duration: 0 };

  return (
    <section aria-label="Season stat comparison" data-spoiler="char" className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className={`h-4 w-4 shrink-0 ${isNexus ? "text-accent" : "text-primary"}`} />
          <div>
            <p
              className={
                isNexus
                  ? "text-[10px] uppercase tracking-[0.35em] text-accent"
                  : "font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-primary"
              }
            >
              Season Stat Comparison
            </p>
            <h2
              className={
                isNexus
                  ? "[font-family:var(--font-display)] text-lg tracking-wide text-foreground"
                  : "font-display text-lg uppercase tracking-wider text-foreground"
              }
            >
              {entity.name} — Progression Delta
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {abilities.length > 0 && (
            <select
              aria-label="Comparison stat profile"
              value={abilityKey}
              onChange={(ev) => setAbilityKey(ev.target.value)}
              className={`${selectClass} sm:w-44`}
            >
              <option value="">Character stats</option>
              {abilities.map((ab) => (
                <option key={ab.name} value={ab.name}>
                  {ab.label}
                </option>
              ))}
            </select>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close season comparison"
              className={
                isNexus
                  ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition hover:border-accent hover:text-foreground"
                  : "inline-flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background text-foreground transition hover:bg-foreground hover:text-background"
              }
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Season A / B Selector Bar */}
      <div className="mt-3 grid grid-cols-1 items-end gap-2.5 sm:grid-cols-[1fr_auto_1fr]">
        <label className="grid gap-1">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span
              className={`inline-block h-2 w-2 ${isNexus ? "rounded-full" : ""} ${seriesAColorClass}`}
            />
            Baseline (Season A)
          </span>
          <select
            aria-label="Compare baseline season"
            value={optionA?.key ?? "all"}
            onChange={(ev) => setSeasonA(ev.target.value)}
            className={selectClass}
          >
            {options.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
                {opt.hasStats ? "" : " (no stats)"}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          aria-label="Swap comparison seasons"
          onClick={() => {
            setSeasonA(optionB?.key ?? "all");
            setSeasonB(optionA?.key ?? "all");
          }}
          className={
            isNexus
              ? "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-background/70 px-3 text-xs font-medium text-foreground transition hover:border-accent hover:text-accent"
              : "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border border-border bg-background px-3 font-mono text-xs font-bold uppercase text-foreground transition hover:bg-foreground hover:text-background"
          }
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span className="sm:hidden">Swap</span>
        </button>

        <label className="grid gap-1">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            <span
              className={`inline-block h-2 w-2 ${isNexus ? "rounded-full" : ""} ${seriesBColorClass}`}
            />
            Target (Season B)
          </span>
          <select
            aria-label="Compare target season"
            value={optionB?.key ?? "all"}
            onChange={(ev) => setSeasonB(ev.target.value)}
            className={selectClass}
          >
            {options.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
                {opt.hasStats ? "" : " (no stats)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Summary KPI Strip */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          className={
            isNexus
              ? "rounded-lg border border-border/70 bg-background/50 px-3 py-2"
              : "border border-border bg-background px-3 py-2"
          }
        >
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {optionA?.shortLabel ?? "Season A"} Avg
          </p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
            {comparison.summary.avgA}
          </p>
        </div>

        <div
          className={
            isNexus
              ? "rounded-lg border border-border/70 bg-background/50 px-3 py-2"
              : "border border-border bg-background px-3 py-2"
          }
        >
          <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            {optionB?.shortLabel ?? "Season B"} Avg
          </p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
            {comparison.summary.avgB}
          </p>
        </div>

        <div
          className={
            isNexus
              ? "rounded-lg border border-border/70 bg-background/50 px-3 py-2"
              : "border border-border bg-background px-3 py-2"
          }
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Net Avg Δ</p>
          <p
            className={`mt-0.5 flex items-center gap-1 font-mono text-lg font-bold tabular-nums ${
              comparison.summary.avgDelta > 0
                ? "text-emerald-400"
                : comparison.summary.avgDelta < 0
                  ? "text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {comparison.summary.avgDelta > 0 && <TrendingUp className="h-4 w-4 shrink-0" />}
            {comparison.summary.avgDelta < 0 && <TrendingDown className="h-4 w-4 shrink-0" />}
            <span>{formatSignedDelta(comparison.summary.avgDelta)}</span>
          </p>
        </div>

        <div
          className={
            isNexus
              ? "rounded-lg border border-border/70 bg-background/50 px-3 py-2"
              : "border border-border bg-background px-3 py-2"
          }
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {comparison.summary.peakGain ? "Biggest Gain" : "Biggest Drop"}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs font-bold tabular-nums text-foreground">
            {comparison.summary.peakGain
              ? `${comparison.summary.peakGain.label} (${formatSignedDelta(comparison.summary.peakGain.delta)})`
              : comparison.summary.peakDrop
                ? `${comparison.summary.peakDrop.label} (${formatSignedDelta(comparison.summary.peakDrop.delta)})`
                : "No change"}
          </p>
        </div>
      </div>

      {/* Radar Overlay + 7-Stat Grouped Bar Comparison */}
      <div className="mt-4 grid items-center gap-6 lg:grid-cols-[250px_1fr]">
        <div
          className={
            isNexus
              ? "flex justify-center rounded-xl border border-border/70 bg-background/45 p-3"
              : "flex justify-center border border-border bg-background p-3"
          }
        >
          <StatRadar
            a={comparison.combatA}
            b={comparison.combatB}
            nameA={optionA?.shortLabel ?? "Season A"}
            nameB={optionB?.shortLabel ?? "Season B"}
            size={218}
          />
        </div>

        <div className="space-y-2.5" role="list" aria-label="Stat delta bars">
          {comparison.deltas.map((row) => {
            const deltaTone =
              row.delta > 0
                ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
                : row.delta < 0
                  ? "text-rose-400 border-rose-500/40 bg-rose-500/10"
                  : "text-muted-foreground border-border/60 bg-background/50";
            const deltaPrefix = row.delta > 0 ? "▲ " : row.delta < 0 ? "▼ " : "= ";
            return (
              <div
                key={row.key}
                role="listitem"
                aria-label={`${row.label}: ${row.valueA} to ${row.valueB} (${formatSignedDelta(row.delta)})`}
                className={
                  isNexus
                    ? "rounded-lg border border-border/60 bg-background/45 px-3 py-2"
                    : "border border-border bg-background px-3 py-2"
                }
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-muted-foreground">
                      {row.valueA} → <strong className="text-foreground">{row.valueB}</strong>
                    </span>
                    <span className={`border px-1.5 py-0.5 text-[10px] font-bold ${deltaTone}`}>
                      {deltaPrefix}
                      {formatSignedDelta(row.delta)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="h-1.5 w-full overflow-hidden bg-muted/40">
                    <motion.div
                      initial={false}
                      animate={{ scaleX: row.valueA / 100 }}
                      transition={barTransition}
                      style={{ transformOrigin: "left" }}
                      data-series="a"
                      data-value={row.valueA}
                      className={`h-full w-full ${seriesAColorClass}`}
                    />
                  </div>
                  <div className="h-1.5 w-full overflow-hidden bg-muted/40">
                    <motion.div
                      initial={false}
                      animate={{ scaleX: row.valueB / 100 }}
                      transition={barTransition}
                      style={{ transformOrigin: "left" }}
                      data-series="b"
                      data-value={row.valueB}
                      className={`h-full w-full ${seriesBColorClass}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!hasAnyValues && (
        <p className="mt-3 border border-border/60 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
          No numerical stats recorded for this season pair yet. Switch either season selector or
          record stats in the Season Editor to visualize changes.
        </p>
      )}
    </section>
  );
}
