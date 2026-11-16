import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ABILITY_GROUP_LABELS, abilityDef, normalizeAbilityKey } from "@/lib/abilities";
import { abilityFxRecipe, lineageFor, simulateCombat } from "@/lib/ability-fx";
import {
  ABILITY_RANKS,
  ABILITY_RANK_META,
  clampDbAbilityLevel,
  parseAbilityRank,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";
import { useAbilityLineages } from "@/hooks/use-ability-lineages";
import { Link } from "@tanstack/react-router";
import { AbilityFxCanvas } from "@/components/ability-fx-canvas";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityRankEmblem, AbilityRankProgressionStrip } from "@/components/ability-rank-emblem";
import { AbilityHoldersChips } from "@/components/ability-holders-chips";
import { AbilityImpactOverlay } from "@/components/ability-impact-overlay";
import { useNexusAdvancedFx } from "@/hooks/use-nexus-advanced-fx";
import { useAbilityHolders, useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import {
  isHighTierAbility,
  useOptionalAbilityContext,
  type AbilityImpactState,
} from "@/context/AbilityContext";

/** Expanded Nexus ability showcase: cel FX, rank 1-5 scaling, season wielders, AbilityImpact, and upgrade lineage playback. */
export function AbilityFxShowcase({
  name,
  initialRank,
  open,
  onOpenChange,
  onSimulate,
}: {
  name: string;
  initialRank?: number | undefined;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSimulate?: ((key: string) => void) | undefined;
}) {
  const { motionActive } = useAppMotion();
  const holdersMasked = useSpoilerMask("abilities");
  const { holdersMap } = useAbilityHolders();
  const ctx = useOptionalAbilityContext();

  const resolvedInitialRank = useMemo<AbilityEmblemRank>(
    () => parseAbilityRank(initialRank) ?? tierToIntrinsicRank(abilityDef(name).tier),
    [initialRank, name],
  );

  const [current, setCurrent] = useState(name);
  const [localRank, setLocalRank] = useState<AbilityEmblemRank>(resolvedInitialRank);
  const [localWielderId, setLocalWielderId] = useState<string | null>(null);
  const [localImpact, setLocalImpact] = useState<AbilityImpactState | null>(null);
  const [ascending, setAscending] = useState(false);
  const [localBoosted, setLocalBoosted] = useState(false);
  const [localFps, setLocalFps] = useState<24 | 30 | 60>(30);
  const [localPerformanceMode, setLocalPerformanceMode] = useState(false);

  const impactTimerRef = useRef<number | null>(null);
  const impactSeqRef = useRef(0);

  const triggerLocalOrCtxImpact = useCallback(
    (
      key: string,
      rank: AbilityEmblemRank,
      opts?: { force?: boolean | undefined; characterName?: string | undefined },
    ) => {
      const targetDef = abilityDef(key);
      const shouldFire = opts?.force || isHighTierAbility(targetDef.tier, rank);
      if (!shouldFire) return;
      if (ctx) {
        ctx.triggerAbilityImpact({
          abilityKey: targetDef.key,
          rank,
          characterName: opts?.characterName,
          force: opts?.force,
          reason: opts?.force ? "manual" : "high-tier",
        });
        return;
      }
      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
      }
      impactSeqRef.current += 1;
      setLocalImpact({
        id: impactSeqRef.current,
        active: true,
        abilityKey: targetDef.key,
        label: targetDef.label,
        color: targetDef.color,
        tier: targetDef.tier,
        rank,
        characterName: opts?.characterName,
        reason: opts?.force ? "manual" : "high-tier",
        startedAt: Date.now(),
      });
      impactTimerRef.current = window.setTimeout(() => {
        setLocalImpact(null);
        impactTimerRef.current = null;
      }, 1400);
    },
    [ctx],
  );

  useEffect(
    () => () => {
      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const defInit = abilityDef(name);
    const nextRank = parseAbilityRank(initialRank) ?? tierToIntrinsicRank(defInit.tier);
    setCurrent(defInit.key);
    setLocalRank(nextRank);
    setLocalWielderId(null);
    setAscending(false);
    setLocalBoosted(false);
    if (ctx) {
      ctx.selectAbility(defInit.key, {
        rank: nextRank,
        entityId: null,
        triggerImpact: isHighTierAbility(defInit.tier, nextRank),
      });
    } else if (isHighTierAbility(defInit.tier, nextRank)) {
      triggerLocalOrCtxImpact(defInit.key, nextRank);
    }
    // Intentionally sync on modal open or target prop change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, name, initialRank]);

  const activeKey = ctx ? ctx.abilityKey : current;
  const activeRank: AbilityEmblemRank = ctx ? ctx.rank : localRank;
  const boosted = ctx ? ctx.boosted : localBoosted;
  const fps = ctx ? ctx.fps : localFps;
  const performanceMode = ctx ? ctx.performanceMode : localPerformanceMode;
  const selectedEntityId = ctx ? ctx.selectedEntityId : localWielderId;
  const activeImpact = ctx ? ctx.abilityImpact : localImpact;

  const abilityVersion = useAbilityRegistryVersion();
  const lineages = useAbilityLineages();
  const lineage = useMemo(() => lineageFor(lineages, activeKey), [lineages, activeKey]);
  const def = abilityDef(activeKey);
  const combat = useMemo(
    () => simulateCombat(def.key, def.tier, activeRank),
    [def.key, def.tier, activeRank],
  );
  const recipe = useMemo(() => {
    void abilityVersion;
    return abilityFxRecipe(activeKey, activeRank);
  }, [activeKey, activeRank, abilityVersion]);

  const wielders = useMemo(
    () => holdersMap.get(normalizeAbilityKey(def.key)) ?? [],
    [holdersMap, def.key],
  );
  const selectedProgression = useMemo(
    () =>
      ctx && selectedEntityId ? ctx.getCharacterSeasonProgression(selectedEntityId, def.key) : [],
    [ctx, selectedEntityId, def.key],
  );

  const selectStep = useCallback(
    (k: string, nextRank?: AbilityEmblemRank) => {
      const stepDef = abilityDef(k);
      const r = nextRank ?? tierToIntrinsicRank(stepDef.tier);
      setCurrent(stepDef.key);
      setLocalRank(r);
      if (ctx) {
        ctx.selectAbility(stepDef.key, {
          rank: r,
          triggerImpact: isHighTierAbility(stepDef.tier, r),
        });
      } else {
        triggerLocalOrCtxImpact(stepDef.key, r);
      }
    },
    [ctx, triggerLocalOrCtxImpact],
  );

  useEffect(() => {
    if (!ascending || !lineage) return;
    const i = lineage.steps.indexOf(def.key);
    if (i >= lineage.steps.length - 1) {
      setAscending(false);
      return;
    }
    const id = window.setTimeout(() => {
      const nextStep = lineage.steps[i + 1]!;
      selectStep(nextStep);
    }, 2600);
    return () => window.clearTimeout(id);
  }, [ascending, lineage, def.key, selectStep]);

  const handleRankSelect = (nextRank: AbilityEmblemRank) => {
    setLocalRank(nextRank);
    if (ctx) {
      ctx.setRank(nextRank, { triggerImpact: nextRank >= 4 });
    } else if (nextRank >= 4 || isHighTierAbility(def.tier, nextRank)) {
      triggerLocalOrCtxImpact(def.key, nextRank);
    }
  };

  const impactOnThisCanvas = Boolean(activeImpact?.active && activeImpact.abilityKey === def.key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[min(96vw,44rem)] max-w-none overflow-y-auto border-accent/40 bg-background/95 p-4 sm:p-6">
        <DialogTitle className="flex flex-wrap items-center gap-2.5 text-xl">
          <AbilityRankEmblem ability={def.key} rank={activeRank} size="sm" showRankCorner />
          <span>{def.label}</span>
          <AbilityRankPips rank={activeRank} showLabel className="ml-auto" />
        </DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            {def.tier} tier · {ABILITY_GROUP_LABELS[def.group]} · power {recipe.power}/8
          </span>
          <span>·</span>
          <span>
            {combat.role} (reach ≈ {combat.meters} m)
          </span>
        </DialogDescription>
        <div className="grid gap-2 text-sm">
          {def.description && <p className="text-foreground">{def.description}</p>}
          {recipe.note && recipe.note !== def.description && (
            <p className="text-xs text-muted-foreground">FX signature: {recipe.note}</p>
          )}
          <div className="pt-0.5">
            <AbilityHoldersChips abilityKey={def.key} />
          </div>

          {/* Interactive Mastery Rank 1-5 morph selector */}
          <div className="grid gap-2 rounded-xl border border-border/80 bg-card/50 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Mastery Rank ({ABILITY_RANK_META[activeRank].shortTitle})
              </span>
              <div
                className="flex items-center gap-1"
                role="group"
                aria-label="Mastery rank 1 to 5"
              >
                {ABILITY_RANKS.map((r) => {
                  const meta = ABILITY_RANK_META[r];
                  const selected = activeRank === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRankSelect(r)}
                      aria-pressed={selected}
                      title={meta.label}
                      className={`rounded-lg border px-2 py-0.5 font-mono text-xs font-bold transition ${
                        selected
                          ? "bg-accent/20 text-foreground"
                          : "border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                      style={
                        selected
                          ? {
                              borderColor: meta.ringColor,
                              boxShadow: `0 0 10px ${meta.ringColor}66`,
                            }
                          : undefined
                      }
                    >
                      {meta.roman}
                    </button>
                  );
                })}
              </div>
            </div>
            <AbilityRankProgressionStrip
              ability={def.key}
              currentRank={activeRank}
              onSelectRank={handleRankSelect}
              size="xs"
            />
          </div>

          {/* Spoiler-guarded wielder & season progression selector */}
          {!holdersMasked && wielders.length > 0 && (
            <div className="grid gap-1.5 rounded-xl border border-border/80 bg-card/40 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Inspect wielder rank:
                </span>
                {wielders.map((w) => {
                  const assigned = ctx?.resolveCharacterRank(w.id, def.key);
                  const isSel = selectedEntityId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        setLocalWielderId(w.id);
                        if (ctx) {
                          ctx.selectWielder(isSel ? null : w.id);
                        }
                      }}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition ${
                        isSel
                          ? "border-accent bg-accent/20 font-medium text-foreground"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {w.name}
                      {assigned ? ` · Lv.${ABILITY_RANK_META[assigned].roman}` : ""}
                    </button>
                  );
                })}
              </div>
              {selectedEntityId && selectedProgression.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Season journey:
                  </span>
                  {selectedProgression.map((step, idx) => {
                    const isActiveStep =
                      ctx?.selectedSeriesId === step.seriesId &&
                      ctx?.selectedSeasonNumber === step.seasonNumber &&
                      activeRank === step.level;
                    return (
                      <span key={step.id} className="inline-flex items-center gap-1">
                        {idx > 0 && <span className="text-muted-foreground">→</span>}
                        <button
                          type="button"
                          onClick={() => {
                            ctx?.setSeasonScope(step.seriesId, step.seasonNumber);
                            ctx?.setRank(step.level, { triggerImpact: step.level >= 4 });
                          }}
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
                            isActiveStep
                              ? "border-accent bg-accent/20 text-foreground"
                              : "border-border/80 bg-background/60 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {step.seriesId ? step.seriesTitle : "Base"}
                          {step.seasonNumber != null ? ` S${step.seasonNumber}` : ""} · Lv.
                          {ABILITY_RANK_META[clampDbAbilityLevel(step.level)].roman}
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card/40">
          {motionActive ? (
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={`${def.key}-${activeRank}`}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <AbilityFxCanvas
                  recipe={recipe}
                  rank={activeRank}
                  impactActive={impactOnThisCanvas}
                  label={`${def.label} animation`}
                  boosted={boosted}
                  fps={fps}
                  performanceMode={performanceMode}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0" data-motion-state="minimal-off">
              <AbilityFxCanvas
                recipe={recipe}
                rank={activeRank}
                impactActive={impactOnThisCanvas}
                label={`${def.label} animation`}
                boosted={boosted}
                fps={fps}
                performanceMode={performanceMode}
              />
            </div>
          )}

          {impactOnThisCanvas && <AbilityImpactOverlay impact={activeImpact} />}

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span
              className="rounded-full border border-border bg-background/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest backdrop-blur"
              style={{ color: recipe.palette[0] }}
            >
              Rank {ABILITY_RANK_META[activeRank].roman} · Power {recipe.power}/8
              {performanceMode && activeRank > 3 ? " · Perf Cap III" : ""}
            </span>
          </div>

          {/* AbilityImpact, Overdrive, Performance Mode and FPS overlay controls */}
          <div className="absolute right-3 top-3 flex flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() =>
                triggerLocalOrCtxImpact(def.key, activeRank, {
                  force: true,
                  characterName: !holdersMasked ? ctx?.selectedEntity?.name : undefined,
                })
              }
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition ${
                impactOnThisCanvas
                  ? "border-accent bg-accent/30 text-foreground shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                  : "border-border/80 bg-background/70 text-muted-foreground hover:border-accent hover:text-foreground"
              }`}
              title="Trigger AbilityImpact burst state"
            >
              <Zap className="h-3 w-3 text-accent" aria-hidden="true" />
              <span>AbilityImpact</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (ctx) {
                  ctx.setBoosted((b) => !b);
                } else {
                  setLocalBoosted((b) => !b);
                }
              }}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition ${
                boosted
                  ? "border-amber-400 bg-amber-500/25 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  : "border-border/80 bg-background/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${boosted ? "animate-ping bg-amber-400" : "bg-zinc-500"}`}
              />
              <span>{boosted ? "BOOST: OVERDRIVE" : "Boost"}</span>
            </button>

            <button
              type="button"
              aria-pressed={performanceMode}
              onClick={() => {
                if (ctx) {
                  ctx.setPerformanceMode((p) => !p);
                } else {
                  setLocalPerformanceMode((p) => !p);
                }
              }}
              title="Cap high-rank FX complexity and frame rate for smoother low-end rendering"
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition ${
                performanceMode
                  ? "border-emerald-400 bg-emerald-500/25 text-emerald-200"
                  : "border-border/80 bg-background/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Gauge className="h-3 w-3" aria-hidden="true" />
              <span>{performanceMode ? "Perf Mode: On" : "Perf Mode"}</span>
            </button>

            <div className="flex items-center rounded-full border border-border/80 bg-background/70 p-0.5 font-mono text-[10px] backdrop-blur-sm">
              {([24, 30, 60] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    if (ctx) ctx.setFps(f);
                    else setLocalFps(f);
                  }}
                  className={`rounded-full px-1.5 py-0.5 ${fps === f ? "bg-accent font-bold text-accent-foreground" : "text-muted-foreground"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        {lineage && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {lineage.label}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  selectStep(lineage.steps[0]!);
                  setAscending(true);
                }}
                disabled={ascending}
              >
                {ascending ? "Ascending…" : "Play ascension"}
              </Button>
            </div>
            <ol className="flex flex-wrap items-center gap-1.5">
              {lineage.steps.map((k, i) => {
                const d = abilityDef(k);
                const active = d.key === def.key;
                return (
                  <li key={k} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span aria-hidden className="text-muted-foreground">
                        →
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAscending(false);
                        selectStep(k);
                      }}
                      aria-current={active ? "step" : undefined}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${active ? "border-accent text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
                      style={
                        active
                          ? { boxShadow: `0 0 12px ${abilityFxRecipe(k, activeRank).palette[0]}` }
                          : undefined
                      }
                    >
                      {d.label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {onSimulate ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onSimulate(def.key);
                onOpenChange(false);
              }}
            >
              Open in Combat simulator →
            </Button>
          ) : (
            <Link
              to="/abilities"
              search={{ tab: "fx", ability: def.key }}
              onClick={() => onOpenChange(false)}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Open the Ability FX library and combat simulator →
            </Link>
          )}
          <Link
            to="/abilities"
            search={{ tab: "action", ability: def.key }}
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-accent underline-offset-4 hover:underline"
          >
            Test in Ability in Action →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Nexus detail-panel launcher; hidden unless Advanced ability FX is on. */
export function AbilityFxLauncher({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const on = useNexusAdvancedFx();
  if (!on) return null;
  return (
    <>
      <Button variant="outline" className="mb-3 w-full" onClick={() => setOpen(true)}>
        Play ability animation
      </Button>
      <AbilityFxShowcase name={name} open={open} onOpenChange={setOpen} />
    </>
  );
}
