import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ABILITY_GROUP_LABELS, abilityDef } from "@/lib/abilities";
import {
  ABILITY_RANKS,
  ABILITY_RANK_META,
  clampDbAbilityLevel,
  parseAbilityRank,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";
import {
  ABILITY_USAGE_EVENT,
  compareAbilityRanks,
  getAbilityRankBenefits,
  getAllAbilityUsageCounts,
  getTopUsedAbilities,
  getTotalAbilityUsageCount,
  recordAbilityUsage,
} from "@/lib/ability-benefits";
import {
  EMBLEM_FLOAT_TRANSITION_MS,
  isReducedMotionOrMinimal,
  triggerAbilityRankUpHaptic,
  triggerLegendaryRankUpConfetti,
} from "@/lib/ability-celebration";
import {
  ABILITY_SET_EVENT,
  buildAbilitySynergySummary,
  getPinnedAbilitySet,
} from "@/lib/ability-synergy";
import { AbilitySynergyGraph } from "@/components/ability-synergy-graph";
import { AbilityRankRadar } from "@/components/ability-rank-radar";
import { sfx } from "@/lib/scu-audio";
import { useOptionalAbilityContext } from "@/context/AbilityContext";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityRankTooltipCard } from "@/components/ability-rank-tooltip";
import { AbilityCustomEmblem } from "@/components/ability-custom-emblem";
import { resolveCustomAbilityEmblem } from "@/lib/ability-emblem-resolver";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useIsMinimal } from "@/hooks/use-ui-mode";

export interface AbilityBenefitsModalProps {
  ability: string;
  rank?: number | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRankChange?: ((nextRank: AbilityEmblemRank) => void) | undefined;
  playRankAudio?: boolean | undefined;
  currentSetAbilities?: Array<{ abilityKey: string; rank?: AbilityEmblemRank }> | undefined;
}

export function AbilityBenefitsModal({
  ability,
  rank,
  open,
  onOpenChange,
  onRankChange,
  playRankAudio = true,
  currentSetAbilities,
}: AbilityBenefitsModalProps) {
  const ctx = useOptionalAbilityContext();
  const isMinimal = useIsMinimal();
  const { motionActive } = useAppMotion();
  const canAnimateEmblemFloat = motionActive && !isMinimal && !isReducedMotionOrMinimal();
  const [inspectedKey, setInspectedKey] = useState<string>(() => abilityDef(ability).key);
  const [inspectedRankOverride, setInspectedRankOverride] = useState<AbilityEmblemRank | undefined>(
    undefined,
  );
  const rootAbilityKey = useMemo(() => abilityDef(ability).key, [ability]);
  const def = useMemo(() => abilityDef(inspectedKey), [inspectedKey]);

  const initialResolvedRank = useMemo<AbilityEmblemRank>(() => {
    if (inspectedRankOverride) return inspectedRankOverride;
    if (inspectedKey === rootAbilityKey) {
      const explicit = parseAbilityRank(rank);
      if (explicit) return explicit;
    }
    const ctxRank = ctx?.getActiveAbilityRank(def.key);
    if (ctxRank) return ctxRank;
    return tierToIntrinsicRank(def.tier);
  }, [inspectedRankOverride, inspectedKey, rootAbilityKey, rank, ctx, def.key, def.tier]);

  const [activeRank, setActiveRank] = useState<AbilityEmblemRank>(initialResolvedRank);
  const [expanded, setExpanded] = useState(false);
  const [benefitsExpanded, setBenefitsExpanded] = useState(true);
  const [compareTargetRank, setCompareTargetRank] = useState<AbilityEmblemRank>(() =>
    initialResolvedRank < 5 ? ((initialResolvedRank + 1) as AbilityEmblemRank) : 5,
  );
  const [justAscendedLegendary, setJustAscendedLegendary] = useState(false);
  const [emblemInspectionMode, setEmblemInspectionMode] = useState<
    "idle" | "transitioning" | "floating" | "static"
  >(() => (open ? (canAnimateEmblemFloat ? "transitioning" : "static") : "idle"));
  const [modalEmblemTooltipOpen, setModalEmblemTooltipOpen] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(() =>
    getAllAbilityUsageCounts(),
  );
  const [pinnedSetKeys, setPinnedSetKeys] = useState<string[]>(() => getPinnedAbilitySet());

  const upgradeBtnRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);
  const modalEmblemTooltipId = useMemo(() => `modal-rank-tip-${def.key}`, [def.key]);

  useEffect(() => {
    if (!open) {
      setEmblemInspectionMode("idle");
      return;
    }
    if (!canAnimateEmblemFloat) {
      setEmblemInspectionMode("static");
      return;
    }
    setEmblemInspectionMode("transitioning");
    const timer = window.setTimeout(() => {
      setEmblemInspectionMode("floating");
    }, EMBLEM_FLOAT_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [open, inspectedKey, canAnimateEmblemFloat]);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open || (!justOpened && inspectedKey !== rootAbilityKey)) return;
    setInspectedKey(rootAbilityKey);
    setInspectedRankOverride(undefined);
    const resolved =
      parseAbilityRank(rank) ??
      ctx?.getActiveAbilityRank(rootAbilityKey) ??
      tierToIntrinsicRank(abilityDef(rootAbilityKey).tier);
    setActiveRank(resolved);
    setCompareTargetRank(resolved < 5 ? ((resolved + 1) as AbilityEmblemRank) : 5);
    setJustAscendedLegendary(false);
    setUsageCounts(getAllAbilityUsageCounts());
    setPinnedSetKeys(getPinnedAbilitySet());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rootAbilityKey, rank]);

  useEffect(() => {
    setActiveRank(initialResolvedRank);
    setCompareTargetRank(
      initialResolvedRank < 5 ? ((initialResolvedRank + 1) as AbilityEmblemRank) : 5,
    );
  }, [inspectedKey, initialResolvedRank]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncCounts = () => setUsageCounts(getAllAbilityUsageCounts());
    const syncSet = () => setPinnedSetKeys(getPinnedAbilitySet());
    window.addEventListener(ABILITY_USAGE_EVENT, syncCounts);
    window.addEventListener(ABILITY_SET_EVENT, syncSet);
    window.addEventListener("storage", syncCounts);
    window.addEventListener("storage", syncSet);
    return () => {
      window.removeEventListener(ABILITY_USAGE_EVENT, syncCounts);
      window.removeEventListener(ABILITY_SET_EVENT, syncSet);
      window.removeEventListener("storage", syncCounts);
      window.removeEventListener("storage", syncSet);
    };
  }, []);

  const currentRank = activeRank;
  const effectiveComparisonLeft: AbilityEmblemRank = currentRank === 5 ? 4 : currentRank;
  const effectiveComparisonRight: AbilityEmblemRank =
    currentRank === 5
      ? 5
      : compareTargetRank > currentRank
        ? compareTargetRank
        : ((currentRank + 1) as AbilityEmblemRank);

  const currentProfile = useMemo(
    () => getAbilityRankBenefits(def.key, currentRank),
    [def.key, currentRank],
  );
  const comparison = useMemo(
    () => compareAbilityRanks(def.key, effectiveComparisonLeft, effectiveComparisonRight),
    [def.key, effectiveComparisonLeft, effectiveComparisonRight],
  );

  const usageCount = ctx ? ctx.getUsageCount(def.key) : (usageCounts[def.key] ?? 0);
  const effectiveCountsMap = ctx ? ctx.usageCounts : usageCounts;
  const totalUsage = useMemo(
    () => getTotalAbilityUsageCount(effectiveCountsMap),
    [effectiveCountsMap],
  );
  const topUsed = useMemo(() => getTopUsedAbilities(4, effectiveCountsMap), [effectiveCountsMap]);
  const sharePct = totalUsage > 0 ? Math.round((usageCount / totalUsage) * 100) : 0;

  const combinedCharacterSet = useMemo(() => {
    const base = ctx?.activeCharacterAbilities ?? [];
    const overrides = (currentSetAbilities ?? []).map((item) => {
      const itemDef = abilityDef(item.abilityKey);
      return {
        abilityKey: itemDef.key,
        rank: clampDbAbilityLevel(item.rank ?? tierToIntrinsicRank(itemDef.tier)),
      };
    });
    return [...base, ...overrides];
  }, [ctx?.activeCharacterAbilities, currentSetAbilities]);

  const synergySummary = useMemo(
    () =>
      buildAbilitySynergySummary({
        focalKey: def.key,
        focalRank: currentRank,
        characterAbilities: combinedCharacterSet,
        usageCounts: effectiveCountsMap,
        pinnedKeys: pinnedSetKeys,
        getRankForAbility: ctx?.getActiveAbilityRank,
      }),
    [def.key, currentRank, combinedCharacterSet, effectiveCountsMap, pinnedSetKeys, ctx],
  );

  const customKind = useMemo(
    () => resolveCustomAbilityEmblem(`${def.key} ${def.label}`, def.description),
    [def.key, def.label, def.description],
  );
  const Icon = def.icon;
  const rankMeta = ABILITY_RANK_META[currentRank];
  const nextRank = currentRank < 5 ? ((currentRank + 1) as AbilityEmblemRank) : null;
  const nextRankMeta = nextRank ? ABILITY_RANK_META[nextRank] : null;

  const applyRankChange = (target: AbilityEmblemRank, originEl?: HTMLElement | null) => {
    const clamped = clampDbAbilityLevel(target);
    const prev = currentRank;
    if (clamped === prev) return;

    setActiveRank(clamped);
    setCompareTargetRank(clamped < 5 ? ((clamped + 1) as AbilityEmblemRank) : 5);

    if (playRankAudio && !isMinimal) {
      sfx.rankTransition(clamped, clamped > prev ? "ascending" : "descending");
    }

    if (clamped > prev) {
      triggerAbilityRankUpHaptic(clamped, {
        previousRank: prev,
        abilityKey: def.key,
      });
      if (ctx) {
        ctx.recordAbilityUse(def.key, 1);
      } else {
        recordAbilityUsage(def.key, 1);
        setUsageCounts(getAllAbilityUsageCounts());
      }
    }

    if (ctx) {
      if (ctx.abilityKey === def.key) {
        ctx.setRank(clamped, {
          triggerImpact: clamped >= 4,
          celebrateOnApex: false,
        });
      } else {
        ctx.setCharacterAbilityRank(def.key, clamped, {
          triggerImpact: clamped >= 4,
          celebrateOnApex: false,
        });
      }
    }

    if (prev < 5 && clamped === 5) {
      setJustAscendedLegendary(true);
      triggerLegendaryRankUpConfetti({
        originElement: originEl ?? upgradeBtnRef.current,
        accentColor: def.color,
      });
    } else {
      setJustAscendedLegendary(false);
    }

    if (inspectedKey === rootAbilityKey) {
      onRankChange?.(clamped);
    }
  };

  const handleActivateAbility = () => {
    if (ctx) {
      ctx.recordAbilityUse(def.key, 1);
      ctx.triggerAbilityImpact({
        abilityKey: def.key,
        rank: currentRank,
        force: true,
        reason: "manual",
      });
    } else {
      recordAbilityUsage(def.key, 1);
      setUsageCounts(getAllAbilityUsageCounts());
    }
    if (!isMinimal) {
      sfx.pop();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ability-benefits-modal={def.key}
        data-modal-layout={expanded ? "expanded" : "panel"}
        className={
          expanded
            ? "max-h-[92dvh] w-[min(96vw,58rem)] max-w-none overflow-y-auto border-accent/40 bg-background/95 p-5 shadow-2xl sm:p-6"
            : "fixed bottom-0 right-0 left-auto top-0 flex h-[100dvh] max-h-[100dvh] w-[min(96vw,34rem)] max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-l border-accent/40 bg-background/95 p-5 shadow-2xl sm:rounded-l-2xl sm:p-6"
        }
      >
        <div className="flex items-start justify-between gap-3 pr-8">
          <div className="flex items-center gap-3">
            <div
              className="relative flex shrink-0 flex-col items-center"
              onMouseEnter={() => setModalEmblemTooltipOpen(true)}
              onMouseLeave={() => setModalEmblemTooltipOpen(false)}
              aria-describedby={modalEmblemTooltipOpen ? modalEmblemTooltipId : undefined}
            >
              <div
                data-modal-inspection-emblem={def.key}
                data-emblem-inspection-mode={emblemInspectionMode}
                className="scu-emblem-inspect relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
                style={{
                  borderColor: rankMeta.ringColor,
                  background: `radial-gradient(circle at 50% 45%, ${rankMeta.ringColor}28, ${def.color}16 70%, rgba(15,23,42,0.75))`,
                  boxShadow:
                    currentRank >= 4
                      ? `0 0 18px ${rankMeta.ringColor}66`
                      : `0 0 8px ${def.color}33`,
                }}
              >
                {customKind ? (
                  <span style={{ color: currentRank >= 4 ? rankMeta.ringColor : def.color }}>
                    <AbilityCustomEmblem kind={customKind} rank={currentRank} className="h-6 w-6" />
                  </span>
                ) : (
                  <Icon
                    className="h-6 w-6"
                    style={{ color: currentRank >= 4 ? rankMeta.ringColor : def.color }}
                    aria-hidden="true"
                  />
                )}
                <span
                  data-modal-rank-badge={currentRank}
                  className="absolute -bottom-1 -right-1 rounded bg-background/95 px-1 font-mono text-[9px] font-bold tabular-nums ring-1"
                  style={{ color: rankMeta.ringColor, borderColor: rankMeta.ringColor }}
                >
                  {rankMeta.roman}
                </span>
              </div>
              {modalEmblemTooltipOpen && (
                <AbilityRankTooltipCard
                  id={modalEmblemTooltipId}
                  rank={currentRank}
                  context={`${def.label} · ${rankMeta.tagline}`}
                />
              )}
              <span
                aria-hidden="true"
                data-emblem-inspection-shadow={emblemInspectionMode}
                className="scu-emblem-inspect-shadow pointer-events-none mt-0.5 h-1.5 w-9 rounded-full blur-[2px]"
                style={{
                  backgroundColor: rankMeta.ringColor,
                  opacity: emblemInspectionMode === "floating" ? 0.55 : 0.25,
                }}
              />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight text-foreground sm:text-xl">
                {def.label}
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span style={{ color: def.color }} className="font-medium">
                  {def.tier} tier
                </span>
                <span>·</span>
                <span>{ABILITY_GROUP_LABELS[def.group]}</span>
                <span>·</span>
                <span style={{ color: rankMeta.ringColor }} className="font-semibold">
                  {rankMeta.label}
                </span>
              </DialogDescription>
              {inspectedKey !== rootAbilityKey && (
                <button
                  type="button"
                  onClick={() => {
                    setInspectedKey(rootAbilityKey);
                    setInspectedRankOverride(undefined);
                  }}
                  className="mt-1 text-xs font-medium text-accent hover:underline"
                >
                  ← Back to {abilityDef(rootAbilityKey).label}
                </button>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse to side panel" : "Expand comparison modal"}
            onClick={() => setExpanded((prev) => !prev)}
            className="h-9 shrink-0 gap-1.5 text-xs"
          >
            {expanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Side panel</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Expand view</span>
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 grid gap-4">
          {def.description && (
            <p className="text-sm leading-relaxed text-foreground/90">{def.description}</p>
          )}

          {/* Rank progression controls & upgrade action */}
          <section
            aria-label="Rank progression and upgrade"
            className="grid gap-3 rounded-xl border border-border/80 bg-card/50 p-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Active Mastery
                </span>
                <AbilityRankPips rank={currentRank} showLabel compact />
              </div>
              <div className="flex items-center gap-1" role="group" aria-label="Select rank 1 to 5">
                {ABILITY_RANKS.map((stepRank) => {
                  const m = ABILITY_RANK_META[stepRank];
                  const selected = currentRank === stepRank;
                  return (
                    <button
                      key={stepRank}
                      type="button"
                      onClick={(ev) => applyRankChange(stepRank, ev.currentTarget)}
                      aria-pressed={selected}
                      aria-label={`Set ${def.label} to ${m.label}`}
                      className={`min-h-[34px] min-w-[34px] rounded-lg border px-2 font-mono text-xs font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                        selected
                          ? "bg-accent/20 text-foreground"
                          : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                      style={
                        selected
                          ? { borderColor: m.ringColor, boxShadow: `0 0 10px ${m.ringColor}44` }
                          : undefined
                      }
                    >
                      {m.roman}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
              {nextRank && nextRankMeta ? (
                <Button
                  ref={upgradeBtnRef}
                  type="button"
                  data-testid="upgrade-ability-rank-btn"
                  onClick={(ev) => applyRankChange(nextRank, ev.currentTarget)}
                  className="min-h-[40px] gap-1.5 font-medium"
                  style={{
                    backgroundColor: nextRank === 5 ? "#b45309" : undefined,
                    color: nextRank === 5 ? "#fffbeb" : undefined,
                  }}
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Upgrade to {nextRankMeta.label}
                    {nextRank === 5 ? " (Legendary)" : ""}
                  </span>
                </Button>
              ) : (
                <div
                  data-testid="legendary-rank-achieved"
                  className="flex items-center gap-2 text-xs font-semibold text-amber-300"
                >
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {justAscendedLegendary
                      ? "Legendary Rank V Ascended — Apex Corona Unlocked!"
                      : "Peak Rank V · Legendary Mastery Unlocked"}
                  </span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="activate-ability-usage-btn"
                onClick={handleActivateAbility}
                className="min-h-[40px] gap-1.5 text-xs"
              >
                <Zap className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                <span>Activate Power (+1 use)</span>
              </Button>
            </div>
          </section>

          <div className={expanded ? "grid gap-4 lg:grid-cols-12" : "grid gap-4"}>
            {/* Left column (or full width in panel): Mechanical Benefits + Usage Insight */}
            <div className={expanded ? "grid content-start gap-4 lg:col-span-5" : "grid gap-4"}>
              {/* Usage Tracking & Utilization Insight */}
              <section
                aria-label="Ability usage analytics"
                className="grid gap-2.5 rounded-xl border border-border/80 bg-card/45 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-accent" aria-hidden="true" />
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Power Utilization
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {totalUsage > 0 ? `${sharePct}% of total` : "No history yet"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 rounded-lg bg-background/55 px-3 py-2">
                  <div>
                    <span
                      data-testid="ability-usage-count"
                      className="font-mono text-2xl font-bold tabular-nums text-foreground"
                    >
                      {usageCount}
                    </span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {usageCount === 1 ? "use recorded" : "uses recorded"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Archive total: {totalUsage}
                  </span>
                </div>

                {topUsed.length > 0 && (
                  <div className="grid gap-1.5 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Most Utilized Powers
                    </p>
                    <ul className="grid gap-1.5">
                      {topUsed.map((entry) => {
                        const isSelf = entry.key === def.key;
                        return (
                          <li key={entry.key} className="grid gap-0.5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`truncate ${
                                  isSelf ? "font-semibold text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                {entry.label}
                              </span>
                              <span className="font-mono text-[11px] tabular-nums text-foreground/90">
                                {entry.count} · {entry.sharePct}%
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${Math.max(8, entry.sharePct)}%`,
                                  backgroundColor: entry.color,
                                  opacity: isSelf ? 1 : 0.72,
                                }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>

              {/* Current Rank Mechanical Benefits */}
              <section
                aria-label="Current rank mechanical benefits"
                className="grid gap-2.5 rounded-xl border border-border/80 bg-card/45 p-3.5"
              >
                <button
                  type="button"
                  onClick={() => setBenefitsExpanded((v) => !v)}
                  aria-expanded={benefitsExpanded}
                  className="flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Rank {currentProfile.roman} Mechanical Benefits
                    </h3>
                    <p className="mt-0.5 text-xs text-foreground/85">{currentProfile.summary}</p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      benefitsExpanded ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {benefitsExpanded && (
                  <div className="grid gap-2 pt-1">
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-background/55 p-2 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Potency
                        </p>
                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                          +{currentProfile.potencyBonusPct}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Cooldown
                        </p>
                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                          -{currentProfile.cooldownReductionPct}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Efficiency
                        </p>
                        <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                          +{currentProfile.energyEfficiencyPct}%
                        </p>
                      </div>
                    </div>

                    <ul className="grid gap-2">
                      {currentProfile.benefits.map((benefit) => (
                        <li
                          key={benefit.id}
                          className="rounded-lg border border-border/60 bg-background/45 px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">{benefit.title}</span>
                            <span
                              className="font-mono text-[11px] font-semibold tabular-nums"
                              style={{ color: rankMeta.ringColor }}
                            >
                              {benefit.metric}
                            </span>
                          </div>
                          <p className="mt-0.5 text-muted-foreground">{benefit.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            {/* Right column: Side-by-Side Rank Comparison View */}
            <section
              aria-label="Side-by-side rank comparison"
              data-testid="rank-comparison-view"
              className={
                expanded
                  ? "grid content-start gap-3 rounded-xl border border-border/80 bg-card/45 p-3.5 lg:col-span-7"
                  : "grid gap-3 rounded-xl border border-border/80 bg-card/45 p-3.5"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Side-by-Side Rank Comparison
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {currentRank === 5
                      ? "Comparing Rank IV (Master) progression vs Rank V (Apex)"
                      : `Comparing current Rank ${comparison.current.roman} against Rank ${comparison.next.roman}`}
                  </p>
                </div>
                {currentRank < 5 && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-muted-foreground">Target:</span>
                    {ABILITY_RANKS.filter((r) => r > currentRank).map((targetR) => (
                      <button
                        key={targetR}
                        type="button"
                        onClick={() => setCompareTargetRank(targetR)}
                        aria-pressed={comparison.targetRank === targetR}
                        className={`rounded border px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums transition ${
                          comparison.targetRank === targetR
                            ? "border-accent bg-accent/20 text-foreground"
                            : "border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {ABILITY_RANK_META[targetR].roman}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Side-by-Side Header Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  className="rounded-lg border border-border/70 bg-background/55 p-2.5"
                  style={{ borderColor: `${comparison.current.ringColor}66` }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {currentRank === 5 ? "Previous Tier" : "Current Rank"}
                  </p>
                  <p
                    className="mt-0.5 text-sm font-bold"
                    style={{ color: comparison.current.ringColor }}
                  >
                    {comparison.current.rankLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {comparison.current.combat.role}
                  </p>
                </div>

                <div
                  className="rounded-lg border border-accent/60 bg-background/70 p-2.5"
                  style={{ borderColor: comparison.next.ringColor }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {currentRank === 5 ? "Current Peak" : "Next Rank"}
                  </p>
                  <p
                    className="mt-0.5 text-sm font-bold"
                    style={{ color: comparison.next.ringColor }}
                  >
                    {comparison.next.rankLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {comparison.next.combat.role}
                  </p>
                </div>
              </div>

              <AbilityRankRadar
                abilityKey={def.key}
                activeRank={currentRank}
                onSelectRank={(r) => applyRankChange(r)}
                animate={motionActive && !isMinimal}
              />

              {/* Dual Stat Comparison Rows */}
              <div className="grid gap-2">
                {comparison.stats.map((row) => {
                  const leftPct = Math.min(100, Math.round((row.current / row.maxScale) * 100));
                  const rightPct = Math.min(100, Math.round((row.next / row.maxScale) * 100));
                  return (
                    <div
                      key={row.id}
                      data-stat-comparison={row.id}
                      className="grid gap-1 rounded-lg bg-background/45 px-2.5 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{row.label}</span>
                        <div className="flex items-center gap-2 font-mono tabular-nums">
                          <span className="text-muted-foreground">
                            {row.current}
                            {row.unit}
                          </span>
                          <ArrowRight
                            className="h-3 w-3 text-muted-foreground/70"
                            aria-hidden="true"
                          />
                          <span className="font-semibold text-foreground">
                            {row.next}
                            {row.unit}
                          </span>
                          <span
                            data-stat-delta={row.id}
                            className={`min-w-[3.2rem] text-right font-semibold ${
                              row.delta > 0 ? "text-emerald-400" : "text-muted-foreground"
                            }`}
                          >
                            {row.delta > 0 ? `+${row.delta}${row.unit}` : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${leftPct}%`,
                              backgroundColor: comparison.current.ringColor,
                              opacity: 0.72,
                            }}
                          />
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${rightPct}%`,
                              backgroundColor: comparison.next.ringColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {comparison.newlyUnlockedBenefits.length > 0 && (
                <div className="grid gap-1.5 border-t border-border/50 pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {currentRank === 5
                      ? "Apex Rank V Exclusive Benefits"
                      : `Unlocked at Rank ${comparison.next.roman}`}
                  </p>
                  <ul className="grid gap-1.5">
                    {comparison.newlyUnlockedBenefits.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-background/50 px-2.5 py-1.5 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{item.title}</span>
                          <p className="text-[11px] text-muted-foreground">{item.detail}</p>
                        </div>
                        <span
                          className="shrink-0 font-mono text-[11px] font-semibold tabular-nums"
                          style={{ color: comparison.next.ringColor }}
                        >
                          {item.metric}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <AbilitySynergyGraph
            focalKey={def.key}
            focalRank={currentRank}
            summary={synergySummary}
            onSetChanged={() => setPinnedSetKeys(getPinnedAbilitySet())}
            onInspectPartner={(partnerKey, partnerRank) => {
              setInspectedKey(partnerKey);
              setInspectedRankOverride(partnerRank);
              setJustAscendedLegendary(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
