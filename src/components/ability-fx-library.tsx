import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useIsAdmin } from "@/hooks/use-admin";
import { useAbilityHolders, useAllHubAbilities } from "@/hooks/use-ability-registry";
import { abilityLineagesQuery, useAbilityLineages } from "@/hooks/use-ability-lineages";
import {
  ABILITY_GROUP_LABELS,
  TIER_ORDER,
  abilityDef,
  normalizeAbilityKey,
  type AbilityGroup,
  type AbilityTier,
} from "@/lib/abilities";
import {
  ABILITY_RANKS,
  ABILITY_RANK_META,
  clampDbAbilityLevel,
  parseAbilityRank,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import {
  ABILITY_FX_LINEAGES_KEY,
  TIER_POWER,
  abilityFxRecipe,
  lineageFor,
  simulateCombat,
  type FxLineage,
} from "@/lib/ability-fx";
import { AbilityFxCanvas } from "@/components/ability-fx-canvas";
import { AbilityFxShowcase } from "@/components/ability-fx-showcase";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityHoldersChips, useAbilityHolderSummary } from "@/components/ability-holders-chips";
import { AbilityImpactOverlay } from "@/components/ability-impact-overlay";
import {
  isHighTierAbility,
  useOptionalAbilityContext,
  type AbilityImpactState,
} from "@/context/AbilityContext";

const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

const FxCard = memo(function FxCard({
  k,
  previewRank,
  onOpen,
}: {
  k: string;
  previewRank?: AbilityEmblemRank | undefined;
  onOpen: (k: string) => void;
}) {
  const [hot, setHot] = useState(false);
  const d = abilityDef(k);
  const recipe = useMemo(() => abilityFxRecipe(k, previewRank), [k, previewRank]);
  const displayRank = previewRank ?? tierToIntrinsicRank(d.tier);
  const { totalCount } = useAbilityHolderSummary(k);
  const summary = d.description ?? recipe.note;
  const Icon = d.icon;
  return (
    <button
      onClick={() => onOpen(k)}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      className="scu-tactile group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/50 text-left transition hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square w-full bg-background/60">
        <AbilityFxCanvas
          recipe={recipe}
          rank={displayRank}
          playing={hot}
          label={`${d.label} animation`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg border border-border/70 bg-background/80"
          style={{ color: d.color }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="pointer-events-none absolute bottom-2 left-2 rounded-full border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
          {ABILITY_GROUP_LABELS[d.group]}
        </span>
      </div>
      <div className="grid flex-1 content-start gap-1 p-2.5">
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{d.label}</span>
          <AbilityRankPips rank={displayRank} compact />
        </div>
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: recipe.palette[0] }}
        >
          {d.tier} · power {recipe.power}/8
          {totalCount > 0 ? ` · ${totalCount} ${totalCount === 1 ? "holder" : "holders"}` : ""}
        </span>
        {summary && (
          <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{summary}</p>
        )}
      </div>
    </button>
  );
});

export function FxLibrary({
  initialAbility,
  onSimulate,
}: {
  initialAbility?: string | undefined;
  onSimulate?: ((key: string) => void) | undefined;
}) {
  const ctx = useOptionalAbilityContext();
  const allDefs = useAllHubAbilities();
  const { holdersMap, canonNamesMap } = useAbilityHolders();
  const holdersMasked = useSpoilerMask("abilities");
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<"all" | AbilityTier>("all");
  const [group, setGroup] = useState<"all" | AbilityGroup>("all");
  const [previewRank, setPreviewRank] = useState<AbilityEmblemRank | undefined>(undefined);
  const [open, setOpen] = useState<string | null>(() =>
    initialAbility ? abilityDef(initialAbility).key : null,
  );

  useEffect(() => {
    if (initialAbility) {
      setOpen(abilityDef(initialAbility).key);
    }
  }, [initialAbility]);

  const handleOpen = useCallback(
    (k: string) => {
      setOpen(k);
      ctx?.selectAbility(k, { rank: previewRank });
    },
    [ctx, previewRank],
  );

  const defs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allDefs
      .filter((d) => {
        if (tier !== "all" && d.tier !== tier) return false;
        if (group !== "all" && d.group !== group) return false;
        if (!needle) return true;
        if (
          d.label.toLowerCase().includes(needle) ||
          d.tier.toLowerCase().includes(needle) ||
          ABILITY_GROUP_LABELS[d.group].toLowerCase().includes(needle) ||
          (d.description ?? "").toLowerCase().includes(needle) ||
          abilityFxRecipe(d.key).note.toLowerCase().includes(needle)
        ) {
          return true;
        }
        if (!holdersMasked) {
          const nk = normalizeAbilityKey(d.key);
          const dbMatch = (holdersMap.get(nk) ?? []).some((e) =>
            e.name.toLowerCase().includes(needle),
          );
          const canonMatch = (canonNamesMap.get(nk) ?? []).some((n) =>
            n.toLowerCase().includes(needle),
          );
          if (dbMatch || canonMatch) return true;
        }
        return false;
      })
      .sort(
        (a, b) =>
          TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.label.localeCompare(b.label),
      );
  }, [allDefs, tier, group, q, holdersMasked, holdersMap, canonNamesMap]);

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search abilities, lore or wielders…"
          className="max-w-xs"
          aria-label="Search abilities"
        />
        <select
          className={sel}
          value={tier}
          onChange={(e) => setTier(e.target.value as typeof tier)}
          aria-label="Filter by tier"
        >
          <option value="all">All tiers</option>
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value={group}
          onChange={(e) => setGroup(e.target.value as typeof group)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {(Object.entries(ABILITY_GROUP_LABELS) as [AbilityGroup, string][]).map(([g, label]) => (
            <option key={g} value={g}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={sel}
          value={previewRank ?? "auto"}
          onChange={(e) =>
            setPreviewRank(e.target.value === "auto" ? undefined : parseAbilityRank(e.target.value))
          }
          aria-label="Preview rank"
        >
          <option value="auto">Rank: Auto (by tier)</option>
          {ABILITY_RANKS.map((r) => (
            <option key={r} value={r}>
              {ABILITY_RANK_META[r].label}
            </option>
          ))}
        </select>
        <span className="self-center text-xs text-muted-foreground">
          {defs.length} abilities · hover to play, tap to inspect FX &amp; context
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {defs.map((d) => (
          <FxCard key={d.key} k={d.key} previewRank={previewRank} onOpen={handleOpen} />
        ))}
      </div>
      <AbilityFxShowcase
        name={open ?? "lightning"}
        initialRank={previewRank}
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        onSimulate={onSimulate}
      />
    </section>
  );
}

export function FxChains({ onSimulate }: { onSimulate?: ((key: string) => void) | undefined }) {
  const ctx = useOptionalAbilityContext();
  const defs = useAllHubAbilities();
  const lineages = useAbilityLineages();
  const admin = useIsAdmin();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<FxLineage[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const list = draft ?? lineages;
  const chained = new Set(list.flatMap((l) => l.steps));
  const unchained = defs.filter((d) => !chained.has(d.key) && d.tier !== "Role");
  const edit = (fn: (l: FxLineage[]) => FxLineage[]) => setDraft(fn(structuredClone(list)));
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({
      key: ABILITY_FX_LINEAGES_KEY,
      value: { lineages: list } as unknown as Json,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(`Could not save chains: ${error.message}`);
      return;
    }
    await qc.invalidateQueries({ queryKey: abilityLineagesQuery.queryKey });
    setDraft(null);
    toast.success("Upgrade chains saved");
  };
  return (
    <section className="grid gap-4">
      {admin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              edit((l) => [...l, { id: `chain-${Date.now()}`, label: "New chain", steps: [] }])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            New chain
          </Button>
          {draft && (
            <>
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Saving…" : "Save chains"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Discard
              </Button>
            </>
          )}
          <span className="text-xs text-muted-foreground">
            Chains need at least two steps to be saved. Tap any step to preview its FX &amp; lore.
          </span>
        </div>
      )}
      {list.map((l, li) => (
        <div key={l.id} className="grid gap-2 rounded-2xl border border-border bg-card/50 p-3">
          <div className="flex items-center gap-2">
            {admin ? (
              <Input
                value={l.label}
                onChange={(e) =>
                  edit((x) => {
                    x[li]!.label = e.target.value;
                    return x;
                  })
                }
                className="h-8 max-w-sm"
                aria-label="Chain name"
              />
            ) : (
              <h3 className="text-sm font-semibold text-foreground">{l.label}</h3>
            )}
            {admin && (
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto h-8 w-8"
                aria-label="Delete chain"
                onClick={() => edit((x) => x.filter((_, i) => i !== li))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <ol className="flex flex-wrap items-center gap-1.5">
            {l.steps.map((k, si) => {
              const stepDef = abilityDef(k);
              return (
                <li key={`${k}-${si}`} className="flex items-center gap-1">
                  {si > 0 && (
                    <span aria-hidden className="text-muted-foreground">
                      →
                    </span>
                  )}
                  <span
                    className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-foreground"
                    style={{ boxShadow: `0 0 10px ${abilityFxRecipe(k).palette[0]}55` }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewKey(k);
                        ctx?.selectAbility(k);
                      }}
                      title={stepDef.description ?? abilityFxRecipe(k).note}
                      className="text-left hover:text-accent"
                    >
                      {stepDef.label}{" "}
                      <span className="text-[10px] text-muted-foreground">({stepDef.tier})</span>
                    </button>
                    {admin && (
                      <>
                        <button
                          aria-label="Move earlier"
                          disabled={si === 0}
                          onClick={() =>
                            edit((x) => {
                              const s = x[li]!.steps;
                              [s[si - 1], s[si]] = [s[si]!, s[si - 1]!];
                              return x;
                            })
                          }
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3 -rotate-90" />
                        </button>
                        <button
                          aria-label="Move later"
                          disabled={si === l.steps.length - 1}
                          onClick={() =>
                            edit((x) => {
                              const s = x[li]!.steps;
                              [s[si + 1], s[si]] = [s[si]!, s[si + 1]!];
                              return x;
                            })
                          }
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3 -rotate-90" />
                        </button>
                        <button
                          aria-label="Remove step"
                          onClick={() =>
                            edit((x) => {
                              x[li]!.steps.splice(si, 1);
                              return x;
                            })
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })}
            {admin && (
              <li>
                <select
                  className={`${sel} h-8 text-xs`}
                  value=""
                  aria-label="Add step"
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v)
                      edit((x) => {
                        x[li]!.steps.push(v);
                        return x;
                      });
                  }}
                >
                  <option value="">+ add step</option>
                  {defs.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </li>
            )}
          </ol>
        </div>
      ))}
      <div className="rounded-2xl border border-dashed border-border p-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Not in any chain ({unchained.length})
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {unchained.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Every non-Role hub ability is linked in an ascension or affinity chain.
            </span>
          ) : (
            unchained.map((d) => (
              <button
                type="button"
                key={d.key}
                onClick={() => {
                  setPreviewKey(d.key);
                  ctx?.selectAbility(d.key);
                }}
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-accent hover:text-foreground"
              >
                {d.label}
              </button>
            ))
          )}
        </div>
      </div>
      <AbilityFxShowcase
        name={previewKey ?? "lightning"}
        open={!!previewKey}
        onOpenChange={(o) => !o && setPreviewKey(null)}
        onSimulate={onSimulate}
      />
    </section>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

export function FxSimulator({ initialKey }: { initialKey?: string | undefined }) {
  const ctx = useOptionalAbilityContext();
  const holdersMasked = useSpoilerMask("abilities");
  const { holdersMap } = useAbilityHolders();
  const hubAbilities = useAllHubAbilities();
  const defs = useMemo(
    () => [...hubAbilities].sort((a, b) => a.label.localeCompare(b.label)),
    [hubAbilities],
  );
  const initialResolved = initialKey
    ? abilityDef(initialKey).key
    : (ctx?.abilityKey ?? "red_lightning");

  const [localK, setLocalK] = useState(initialResolved);
  const [localTier, setLocalTier] = useState<AbilityTier>(() => {
    const t0 = abilityDef(initialResolved).tier;
    return t0 === "Role" ? "Standard" : t0;
  });
  const [localRank, setLocalRank] = useState<AbilityEmblemRank>(() =>
    ctx && ctx.abilityKey === initialResolved
      ? ctx.rank
      : tierToIntrinsicRank(abilityDef(initialResolved).tier),
  );
  const [localImpact, setLocalImpact] = useState<AbilityImpactState | null>(null);
  const impactTimerRef = useRef<number | null>(null);
  const impactSeqRef = useRef(0);

  const fireImpact = useCallback(
    (key: string, rank: AbilityEmblemRank, force = false) => {
      const def = abilityDef(key);
      if (!force && !isHighTierAbility(def.tier, rank)) return;
      if (ctx) {
        ctx.triggerAbilityImpact({
          abilityKey: def.key,
          rank,
          force,
          reason: force ? "manual" : "high-tier",
        });
        return;
      }
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
      impactSeqRef.current += 1;
      setLocalImpact({
        id: impactSeqRef.current,
        active: true,
        abilityKey: def.key,
        label: def.label,
        color: def.color,
        tier: def.tier,
        rank,
        reason: force ? "manual" : "high-tier",
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
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!initialKey) return;
    const d = abilityDef(initialKey);
    const nextRank =
      ctx && ctx.abilityKey === d.key ? ctx.rank : tierToIntrinsicRank(d.tier);
    setLocalK(d.key);
    setLocalTier(d.tier === "Role" ? "Standard" : d.tier);
    setLocalRank(nextRank);
  }, [initialKey, ctx]);

  const k = ctx ? ctx.abilityKey : localK;
  const activeRank: AbilityEmblemRank = ctx ? ctx.rank : localRank;
  const activeImpact = ctx ? ctx.abilityImpact : localImpact;
  const [tier, setTier] = useState<AbilityTier>(() => {
    const t0 = abilityDef(k).tier;
    return t0 === "Role" ? "Standard" : t0;
  });

  useEffect(() => {
    const t0 = abilityDef(k).tier;
    setTier(t0 === "Role" ? "Standard" : t0);
  }, [k]);

  const lineages = useAbilityLineages();
  const activeDef = abilityDef(k);
  const base = useMemo(() => abilityFxRecipe(k, activeRank), [k, activeRank]);
  const tierOffset = TIER_POWER[tier] - (TIER_POWER[activeDef.tier] ?? 2);
  const recipe = useMemo(
    () => ({ ...base, power: Math.max(1, Math.min(8, base.power + tierOffset)) }),
    [base, tierOffset],
  );
  const st = simulateCombat(k, tier, activeRank);
  const col = recipe.palette[0];
  const lineage = lineageFor(lineages, k);
  const wielders = useMemo(
    () => holdersMap.get(normalizeAbilityKey(activeDef.key)) ?? [],
    [holdersMap, activeDef.key],
  );
  const selectedProgression = useMemo(
    () =>
      ctx?.selectedEntityId
        ? ctx.getCharacterSeasonProgression(ctx.selectedEntityId, activeDef.key)
        : [],
    [ctx, activeDef.key],
  );
  const impactOnCanvas = Boolean(
    activeImpact?.active && activeImpact.abilityKey === activeDef.key,
  );
  const reach = 12 + st.range * 0.34,
    dash = st.mobility * 0.3;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            className={sel}
            value={k}
            onChange={(e) => {
              const nextDef = abilityDef(e.target.value);
              const nextRank = tierToIntrinsicRank(nextDef.tier);
              setLocalK(nextDef.key);
              setLocalTier(nextDef.tier === "Role" ? "Standard" : nextDef.tier);
              setLocalRank(nextRank);
              if (ctx) {
                ctx.selectAbility(nextDef.key, { rank: nextRank });
              } else {
                fireImpact(nextDef.key, nextRank);
              }
            }}
            aria-label="Ability"
          >
            {defs.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            className={sel}
            value={tier}
            onChange={(e) => setTier(e.target.value as AbilityTier)}
            aria-label="Tier"
          >
            {TIER_ORDER.filter((t) => t !== "Role").map((t) => (
              <option key={t} value={t}>
                {t} (power {TIER_POWER[t]})
              </option>
            ))}
          </select>
          <select
            className={sel}
            value={activeRank}
            onChange={(e) => {
              const nextRank = clampDbAbilityLevel(Number(e.target.value));
              setLocalRank(nextRank);
              if (ctx) {
                ctx.setRank(nextRank, { triggerImpact: nextRank >= 4 });
              } else {
                fireImpact(k, nextRank);
              }
            }}
            aria-label="Mastery rank"
          >
            {ABILITY_RANKS.map((r) => (
              <option key={r} value={r}>
                {ABILITY_RANK_META[r].label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant={impactOnCanvas ? "default" : "outline"}
            onClick={() => fireImpact(k, activeRank, true)}
          >
            <Zap className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            AbilityImpact
          </Button>
        </div>

        {!holdersMasked && wielders.length > 0 && ctx && (
          <div className="grid gap-1.5 rounded-xl border border-border/80 bg-card/40 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Wielder profile:
              </span>
              {wielders.map((w) => {
                const assigned = ctx.resolveCharacterRank(w.id, activeDef.key);
                const isSel = ctx.selectedEntityId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => ctx.selectWielder(isSel ? null : w.id)}
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
            {ctx.selectedEntityId && selectedProgression.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Season progression:
                </span>
                {selectedProgression.map((step, idx) => (
                  <span key={step.id} className="inline-flex items-center gap-1">
                    {idx > 0 && <span className="text-muted-foreground">→</span>}
                    <button
                      type="button"
                      onClick={() => {
                        ctx.setSeasonScope(step.seriesId, step.seasonNumber);
                        ctx.setRank(step.level, { triggerImpact: step.level >= 4 });
                      }}
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
                        ctx.selectedSeriesId === step.seriesId &&
                        ctx.selectedSeasonNumber === step.seasonNumber
                          ? "border-accent bg-accent/20 text-foreground"
                          : "border-border/80 bg-background/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {step.seriesId ? step.seriesTitle : "Base"}
                      {step.seasonNumber != null ? ` S${step.seasonNumber}` : ""} · Lv.
                      {ABILITY_RANK_META[step.level].roman}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-card/40">
          <AbilityFxCanvas
            key={`${k}-${tier}-${activeRank}`}
            recipe={recipe}
            rank={activeRank}
            impactActive={impactOnCanvas}
            label={`${activeDef.label} at ${tier} tier`}
          />
          {impactOnCanvas && <AbilityImpactOverlay impact={activeImpact} />}
        </div>
        <div className="grid gap-1.5 rounded-2xl border border-border bg-card/40 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {ABILITY_GROUP_LABELS[activeDef.group]}
              {lineage ? ` · ${lineage.label}` : ""}
            </span>
            <AbilityRankPips rank={activeRank} showLabel compact />
          </div>
          {activeDef.description && <p className="text-foreground">{activeDef.description}</p>}
          {base.note && base.note !== activeDef.description && (
            <p className="text-xs text-muted-foreground">FX signature: {base.note}</p>
          )}
          <AbilityHoldersChips abilityKey={activeDef.key} />
          <div className="pt-1">
            <Link
              to="/abilities"
              search={{ tab: "action", ability: activeDef.key }}
              className="text-xs font-medium text-accent underline-offset-4 hover:underline"
            >
              Choreograph {activeDef.label} in Ability in Action →
            </Link>
          </div>
        </div>
      </div>
      <div className="grid content-start gap-4 rounded-2xl border border-border bg-card/50 p-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Combat role · Rank {ABILITY_RANK_META[activeRank].roman} ({ABILITY_RANK_META[activeRank].shortTitle})
          </p>
          <p className="text-lg font-semibold text-foreground">{st.role}</p>
        </div>
        <Bar label="Damage" value={st.damage} color={col} />
        <Bar label="Speed" value={st.speed} color={col} />
        <Bar label="Range" value={st.range} color={col} />
        <Bar label="Mobility" value={st.mobility} color={col} />
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            Positioning · effective reach ≈ {st.meters} m
          </p>
          <svg
            viewBox="0 0 100 60"
            className="w-full rounded-xl border border-border bg-background/60"
            role="img"
            aria-label={`Positioning: reach ${st.meters} metres`}
          >
            <line
              x1="5"
              y1="30"
              x2="95"
              y2="30"
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 2"
            />
            <motion.circle
              cx="14"
              cy="30"
              initial={false}
              animate={{ r: reach }}
              fill={col}
              fillOpacity=".12"
              stroke={col}
              strokeOpacity=".6"
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            />
            <motion.circle
              cy="30"
              r="3"
              fill={col}
              initial={false}
              animate={{ cx: [14, 14 + dash, 14] }}
              transition={{
                duration: Math.max(0.6, 2.4 - st.speed / 50),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <circle cx="80" cy="30" r="3" className="fill-muted-foreground" />
            <text x="80" y="42" textAnchor="middle" className="fill-muted-foreground" fontSize="5">
              Opponent
            </text>
            <text x="14" y="42" textAnchor="middle" fill={col} fontSize="5">
              You
            </text>
          </svg>
          <p className="mt-2 text-xs text-muted-foreground">
            {14 + reach >= 80
              ? "Can hit the opponent from the starting position."
              : `Must close ${Math.round(((80 - 14 - reach) / 66) * 30)} m before landing a hit.`}
          </p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          These are reader estimates from the ability type, tier, and mastery rank (I–V), not
          official story stats.
        </p>
      </div>
    </section>
  );
}
