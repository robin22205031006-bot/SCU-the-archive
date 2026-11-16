import { abilityFxRecipe } from "@/lib/ability-fx";
import { AbilityFxCanvas } from "@/components/ability-fx-canvas";
import { AbilityFxLauncher } from "@/components/ability-fx-showcase";
import { memo, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EntityGridSkeleton } from "@/components/route-skeleton";
import { AbilityFxPanel } from "@/components/ability-fx-panel";
import { AbilityActionPanel } from "@/components/ability-action-panel";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Flame,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Swords,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import { type Entity } from "@/lib/entities";
import {
  ABILITY_GROUP_LABELS,
  ABILITY_REGISTRY,
  TIER_LABELS,
  TIER_ORDER,
  allAbilityDefs,
  baseAbilityDef,
  getCustomAbilities,
  normalizeAbilityKey,
  removeCustomAbility,
  saveCustomAbility,
  saveAbilityOverride,
  getAbilityOverrides,
  removeAbilityOverride,
  type AbilityOverride,
  type AbilityDef,
  type AbilityTier,
} from "@/lib/abilities";
import {
  hydrateAbilityRegistry,
  useAbilityHolders,
  useAbilityRegistryVersion,
  useAllHubAbilities,
} from "@/hooks/use-ability-registry";
import { AbilityBadge } from "@/components/ability-badge";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityRankEmblem, AbilityRankProgressionStrip } from "@/components/ability-rank-emblem";
import { AbilityHoldersChips } from "@/components/ability-holders-chips";
import {
  ABILITY_RANKS,
  abilityRankMeta,
  tierToIntrinsicRank,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";
import { useOptionalAbilityContext } from "@/context/AbilityContext";
// Route skeletons imported at top for lazy Suspense fallback
import { sfx } from "@/lib/scu-audio";
import { SpoilerToggle, useSpoilerMask } from "@/lib/spoiler-mask";
import { NexusExplorer, NexusSpotlight } from "@/components/nexus-explorer";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { useUiStyle } from "@/lib/ui-style";
import type { Json } from "@/integrations/supabase/types";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";
import { useActiveGenre, useIsManga } from "@/hooks/use-ui-mode";
import { useOptionalThemeContext } from "@/context/ThemeContext";
import { useAppMotion } from "@/hooks/use-app-motion";
import { MotionCard, MotionPresence, MotionSection } from "@/components/app-motion";
import { MangaChapterBanner, MangaThoughtBox } from "@/components/manga-view";
import { HankoStamp } from "@/components/manga-emblem";
import { GenreCardFrame } from "@/components/genre-decorations";
import { IvyDecoration } from "@/components/manga/fantasy/IvyDecoration";

const CUSTOM_SETTINGS_KEY = "ability_registry";
const OVERRIDES_SETTINGS_KEY = "ability_overrides";
const REGISTRY_KEYS = new Set(ABILITY_REGISTRY.map((a) => a.key));

export const Route = createFileRoute("/_authenticated/abilities")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Abilities Hub — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "Every power, beast trait and role in the SCU — cross-referenced to the characters who wield them.",
      },
      { property: "og:title", content: "Abilities Hub — SCU" },
      {
        property: "og:description",
        content:
          "The complete SCU ability registry with rarity tiers and character cross-references.",
      },
    ],
  }),
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: "fx" | "action" | undefined; ability?: string | undefined } => ({
    ...(s["tab"] === "fx" || s["tab"] === "action" ? { tab: s["tab"] } : {}),
    ...(typeof s["ability"] === "string" && s["ability"].trim()
      ? { ability: s["ability"].trim() }
      : {}),
  }),
  component: AbilitiesTabs,
});

const HUB_TABS = [
  ["catalog", "Catalog", WandSparkles],
  ["fx", "Ability FX & Lineages", Flame],
  ["action", "Ability in Action", Swords],
] as const;

const MANGA_HUB_LABELS: Record<(typeof HUB_TABS)[number][0], string> = {
  catalog: "CH. 03A // CATALOG",
  fx: "CH. 03B // FX LINEAGES",
  action: "CH. 03C // COMBAT DEMO",
};

function AbilitiesTabs() {
  const { tab = "catalog", ability } = Route.useSearch();
  const nav = Route.useNavigate();
  const isManga = useIsManga();
  return (
    <>
      <div className={`mx-auto max-w-6xl px-4 sm:px-5 ${isManga ? "pt-6" : "pt-24"}`}>
        <div
          role="tablist"
          aria-label="Abilities sections"
          className={`flex flex-wrap gap-2 ${isManga ? "border-b-[3px] border-foreground pb-3" : "gap-1.5"}`}
        >
          {HUB_TABS.map(([id, label, TabIcon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => nav({ search: id === "catalog" ? {} : { tab: id }, replace: true })}
              className={
                isManga
                  ? `scu-tactile inline-flex items-center gap-1.5 border-2 border-foreground px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition ${
                      tab === id
                        ? "bg-foreground text-background shadow-[3px_3px_0_#b91c1c]"
                        : "bg-card text-foreground hover:bg-secondary"
                    }`
                  : `scu-tactile inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${tab === id ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`
              }
            >
              <TabIcon className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              <span>{isManga ? MANGA_HUB_LABELS[id] : label}</span>
            </button>
          ))}
        </div>
      </div>
      <div key={tab}>
        {tab === "fx" ? (
          <AbilityFxPanel initialAbility={ability} />
        ) : tab === "action" ? (
          <AbilityActionPanel initialAbility={ability} />
        ) : (
          <AbilitiesHub />
        )}
      </div>
    </>
  );
}

function AbilitiesHub() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const isAdmin = useIsAdmin();
  const holdersMasked = useSpoilerMask("abilities");
  const abilityCtx = useOptionalAbilityContext();
  const qc = useQueryClient();
  const { holdersMap: holders, isLoading } = useAbilityHolders();
  const defs = useAllHubAbilities();
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<AbilityTier | "all">("all");
  const [rankFilter, setRankFilter] = useState<AbilityEmblemRank | 0>(0);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingDef, setEditingDef] = useState<AbilityDef | null>(null);
  const [deletingDef, setDeletingDef] = useState<AbilityDef | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const registryVersion = useAbilityRegistryVersion();

  // Refresh admin-defined abilities and overrides from app_settings on visit.
  useEffect(() => {
    void hydrateAbilityRegistry(true);
  }, []);

  useEffect(() => {
    if (tier !== "all" && !isLoading && !defs.some((d) => d.tier === tier)) {
      setTier("all");
    }
  }, [tier, isLoading, defs]);

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      defs.filter((d) => {
        if (tier !== "all" && d.tier !== tier) return false;
        const entryHolders = holders.get(normalizeAbilityKey(d.key)) ?? holders.get(d.key) ?? [];
        if (rankFilter !== 0) {
          const intrinsicMatches = tierToIntrinsicRank(d.tier) === rankFilter;
          const holderMatches = entryHolders.some(
            (e) => abilityCtx?.resolveCharacterRank(e.id, d.key) === rankFilter,
          );
          if (!intrinsicMatches && !holderMatches) return false;
        }
        if (!needle) return true;
        return (
          d.label.toLowerCase().includes(needle) ||
          d.tier.toLowerCase().includes(needle) ||
          ABILITY_GROUP_LABELS[d.group].toLowerCase().includes(needle) ||
          (!holdersMasked && entryHolders.some((e) => e.name.toLowerCase().includes(needle)))
        );
      }),
    [defs, tier, rankFilter, needle, holders, holdersMasked, abilityCtx],
  );

  const byTier = useMemo(() => {
    const groups = new Map<AbilityTier, AbilityDef[]>();
    for (const d of filtered) {
      const arr = groups.get(d.tier) ?? [];
      arr.push(d);
      groups.set(d.tier, arr);
    }
    for (const arr of groups.values()) arr.sort((a, b) => a.label.localeCompare(b.label));
    return groups;
  }, [filtered]);

  const presentTiers = TIER_ORDER.filter((t) => byTier.has(t));
  const customKeys = useMemo(
    () =>
      new Set(
        allAbilityDefs()
          .filter((d) => !REGISTRY_KEYS.has(d.key))
          .map((d) => d.key),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [registryVersion],
  );

  const deleteCustom = async () => {
    if (!isAdmin || !deletingDef || deletingBusy) return;
    setDeletingBusy(true);
    const def = deletingDef;
    removeCustomAbility(def.key);
    removeAbilityOverride(def.key);
    if (openKey === def.key) setOpenKey(null);
    if (editingDef?.key === def.key) setEditingDef(null);
    try {
      const list = getCustomAbilities();
      const allOverrides = getAbilityOverrides();
      const { error } = await supabase.from("app_settings").upsert([
        {
          key: CUSTOM_SETTINGS_KEY,
          value: list as unknown as Json,
          updated_at: new Date().toISOString(),
        },
        {
          key: OVERRIDES_SETTINGS_KEY,
          value: allOverrides as unknown as Json,
          updated_at: new Date().toISOString(),
        },
      ]);
      if (error) throw error;
      void qc.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success(`Removed "${def.label}" from the registry.`);
      setDeletingDef(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Removed locally; cloud sync failed.");
      setDeletingDef(null);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-5">
      <MotionSection>
        {isManga ? (
          <MangaChapterBanner
            chapter="CH. 03 // POWERS"
            jp="異能・能力目録"
            title="Abilities Hub"
            subtitle="Every innate art, beast trait, and battle classification — cross-referenced to every canon wielder."
            stamp="異能"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <SpoilerToggle scope="abilities" />
                {isAdmin && (
                  <Button
                    size="sm"
                    onClick={() => setShowAdd((v) => !v)}
                    className="manga-ink-btn border-2 border-foreground bg-foreground text-background"
                  >
                    {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} ADD ABILITY
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Archive</p>
              <h1 className="mt-2 flex items-center gap-2 text-5xl font-medium glow-text">
                <Sparkles className="h-8 w-8 text-accent" /> Abilities Hub
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Every power, beast trait and role — cross-referenced to the characters who wield
                them.
              </p>
              <div className="mt-3">
                <SpoilerToggle scope="abilities" />
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
                {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Add ability
              </Button>
            )}
          </header>
        )}
      </MotionSection>

      <MotionPresence initial={false}>
        {isAdmin && showAdd && (
          <MotionSection key="add-ability-form">
            <AddAbilityForm
              onSaved={(addedTier) => {
                setShowAdd(false);
                if (addedTier && tier !== "all" && tier !== addedTier) setTier(addedTier);
                void qc.invalidateQueries({ queryKey: ["app-settings"] });
              }}
            />
          </MotionSection>
        )}
        {isAdmin && editingDef && (
          <MotionSection key={`edit-ability-${editingDef.key}`}>
            <EditAbilityForm
              key={editingDef.key}
              def={editingDef}
              onClose={() => setEditingDef(null)}
              onSaved={(nextTier) => {
                setEditingDef(null);
                if (tier !== "all" && nextTier !== tier) setTier(nextTier);
                void qc.invalidateQueries({ queryKey: ["app-settings"] });
              }}
            />
          </MotionSection>
        )}
      </MotionPresence>

      {nexus && defs.length > 0 && <NexusAbilityHero defs={defs} />}
      {nexus ? (
        <NexusExplorer
          label="Abilities"
          loading={isLoading}
          records={defs.map((def) => ({
            id: def.key,
            title: def.label,
            group: TIER_LABELS[def.tier],
            subtitle: ABILITY_GROUP_LABELS[def.group],
            icon: (
              <NexusAbilitySymbol
                name={def.key}
                label={def.label}
                description={def.description}
                rank={tierToIntrinsicRank(def.tier)}
                className="h-10 w-10"
              />
            ),
            def,
          }))}
          renderDetail={({ def }) => (
            <div>
              <AbilityFxLauncher name={def.key} />
              <AbilityCard
                def={def}
                holders={holders.get(normalizeAbilityKey(def.key)) ?? holders.get(def.key) ?? []}
                open
                onToggle={() => {}}
                isAdmin={isAdmin}
                isCustom={customKeys.has(def.key)}
                onEdit={() => setEditingDef(def)}
                onDeleteCustom={() => setDeletingDef(def)}
              />
            </div>
          )}
        />
      ) : (
        <>
          <div
            className={`mb-6 flex flex-wrap items-center gap-2 ${
              isManga ? "manga-panel border-[3px] border-foreground bg-card p-3" : ""
            }`}
          >
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search abilities or characters…"
                className={
                  isManga
                    ? "h-9 w-64 rounded-none border-2 border-foreground bg-background pl-8 font-mono text-xs"
                    : "glass h-9 w-64 rounded-full pl-8 text-sm"
                }
              />
            </div>
            <button
              onClick={() => setTier("all")}
              className={
                isManga
                  ? `border-2 border-foreground px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                      tier === "all"
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-secondary"
                    }`
                  : `rounded-full px-3 py-1 text-xs ${tier === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`
              }
            >
              All
            </button>
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                onClick={() => setTier(tier === t ? "all" : t)}
                className={
                  isManga
                    ? `border-2 border-foreground px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        tier === t
                          ? "border-[#b91c1c] bg-[#b91c1c] text-white"
                          : "bg-background text-foreground hover:bg-secondary"
                      }`
                    : `rounded-full px-3 py-1 text-xs ${tier === t ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`
                }
              >
                {TIER_LABELS[t]}
              </button>
            ))}
            <div className="flex basis-full flex-wrap items-center gap-1.5 pt-1">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Emblem Rank:
              </span>
              <button
                type="button"
                onClick={() => setRankFilter(0)}
                className={
                  isManga
                    ? `border border-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                        rankFilter === 0
                          ? "bg-foreground text-background"
                          : "bg-background text-foreground hover:bg-secondary"
                      }`
                    : `rounded-full px-2.5 py-0.5 text-[11px] ${
                        rankFilter === 0
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`
                }
              >
                All I–V
              </button>
              {ABILITY_RANKS.map((rk) => {
                const meta = abilityRankMeta(rk);
                const active = rankFilter === rk;
                return (
                  <button
                    key={rk}
                    type="button"
                    onClick={() => setRankFilter(active ? 0 : rk)}
                    className={
                      isManga
                        ? `border border-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                            active
                              ? "border-[#b91c1c] bg-[#b91c1c] text-white"
                              : "bg-background text-foreground hover:bg-secondary"
                          }`
                        : `rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition ${
                            active
                              ? "border-accent bg-accent/15 text-foreground"
                              : "border-border/60 text-muted-foreground hover:text-foreground"
                          }`
                    }
                    style={!isManga && active ? { borderColor: meta.ringColor } : undefined}
                  >
                    {meta.roman} · {meta.shortTitle}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <EntityGridSkeleton count={6} />
          ) : filtered.length === 0 ? (
            isManga ? (
              <MangaThoughtBox label="EMPTY REGISTRY" className="py-12 text-center">
                No abilities match this tier stamp or search needle.
              </MangaThoughtBox>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">No abilities match.</p>
            )
          ) : (
            presentTiers.map((t, tIdx) => (
              <MotionSection
                key={t}
                as="section"
                delay={Math.min(tIdx * 0.04, 0.2)}
                className="mb-8"
              >
                {isManga ? (
                  <h2 className="mb-4 flex items-center justify-between gap-2 border-b-[3px] border-foreground pb-2">
                    <span className="flex items-center gap-2 font-display text-2xl uppercase tracking-wider">
                      <HankoStamp kanji={t.slice(0, 3).toUpperCase()} tilt={-2} />
                      <span>{TIER_LABELS[t]}</span>
                    </span>
                    <span className="border border-foreground bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-background">
                      {byTier.get(t)?.length ?? 0} ENTRIES
                    </span>
                  </h2>
                ) : (
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: tierColor(t) }}
                    />
                    {TIER_LABELS[t]}{" "}
                    <span className="text-muted-foreground/60">({byTier.get(t)?.length ?? 0})</span>
                  </h2>
                )}
                <div className="scu-card-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(byTier.get(t) ?? []).map((d, idx) => (
                    <AbilityCard
                      key={d.key}
                      index={idx}
                      def={d}
                      previewRank={rankFilter !== 0 ? rankFilter : undefined}
                      holders={holders.get(normalizeAbilityKey(d.key)) ?? holders.get(d.key) ?? []}
                      open={openKey === d.key}
                      onToggle={() => {
                        sfx.click();
                        const nextOpen = openKey === d.key ? null : d.key;
                        setOpenKey(nextOpen);
                        if (nextOpen) {
                          abilityCtx?.selectAbility(d.key, {
                            rank: rankFilter !== 0 ? rankFilter : tierToIntrinsicRank(d.tier),
                            triggerImpact: false,
                          });
                        }
                      }}
                      isAdmin={isAdmin}
                      isCustom={customKeys.has(d.key)}
                      onEdit={() => setEditingDef(d)}
                      onDeleteCustom={() => setDeletingDef(d)}
                    />
                  ))}
                </div>
              </MotionSection>
            ))
          )}
        </>
      )}
      <DeleteConfirmDialog
        open={!!deletingDef}
        onOpenChange={(open) => {
          if (!open) setDeletingDef(null);
        }}
        title={`Remove "${deletingDef?.label ?? "ability"}" from registry?`}
        description="This permanently removes this custom ability and any registry overrides."
        confirmLabel="Remove"
        busyLabel="Removing…"
        busy={deletingBusy}
        onConfirm={deleteCustom}
      />
    </main>
  );
}

function tierColor(t: AbilityTier): string {
  switch (t) {
    case "Mythic":
      return "#ff2d2d";
    case "Legendary":
      return "#d4af37";
    case "Rare":
      return "#38bdf8";
    case "Exceptional":
      return "#a78bfa";
    case "Unique":
      return "#f59e0b";
    case "Ancient":
      return "#78716c";
    default:
      return "#64748b";
  }
}

const AbilityCard = memo(function AbilityCard({
  index = 0,
  def,
  previewRank,
  holders,
  open,
  onToggle,
  isAdmin,
  isCustom,
  onDeleteCustom,
  onEdit,
}: {
  index?: number;
  def: AbilityDef;
  previewRank?: AbilityEmblemRank | undefined;
  holders: Entity[];
  open: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  isCustom: boolean;
  onDeleteCustom: () => void;
  onEdit: () => void;
}) {
  const abilityCtx = useOptionalAbilityContext();
  const isManga = useIsManga();
  const activeGenre = useActiveGenre();
  const themeCtx = useOptionalThemeContext();
  const { motionActive } = useAppMotion();
  const isFantasy =
    (themeCtx
      ? themeCtx.primarySystem === "manga" && themeCtx.mangaSubTheme === "fantasy"
      : false) ||
    (isManga && activeGenre === "fantasy");
  const intrinsicRank = tierToIntrinsicRank(def.tier);
  const displayRank = previewRank ?? intrinsicRank;
  const holdersMasked = useSpoilerMask("abilities");
  const effectiveCardRank = abilityCtx?.getActiveAbilityRank(def.key) ?? displayRank;
  return (
    <MotionCard
      index={index}
      className={
        isFantasy
          ? `manga-panel manga-panel-hover ${motionActive ? "card-idle-breath" : ""} fantasy-mint-aura-hover hover:mint-emerald-aura focus-within:mint-emerald-aura group relative rounded-lg border-2 border-[#c5a869] bg-[#15221b] p-3.5 text-[#f5ebe6]`
          : isManga
            ? "manga-panel manga-panel-hover manga-card-scale relative border-2 border-border bg-card transition-transform hover:-translate-y-0.5"
            : "glass rounded-2xl p-4 transition-shadow"
      }
      style={
        isFantasy && motionActive
          ? { animationDelay: `${(index % 6) * 0.45}s` }
          : isManga
            ? undefined
            : { boxShadow: `0 0 12px ${def.color}22, inset 0 0 0 1px ${def.color}33` }
      }
    >
      {isManga && <GenreCardFrame theme={activeGenre ?? "manga-ink"} compact />}
      {isFantasy && <IvyDecoration variant="card" />}
      <div className="relative flex w-full items-start gap-3">
        <AbilityRankEmblem
          ability={def.key}
          rank={effectiveCardRank}
          size="sm"
          className="shrink-0"
          onRankChange={(nextRank) =>
            abilityCtx?.setCharacterAbilityRank(def.key, nextRank, { celebrateOnApex: false })
          }
        />
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <span className="flex items-center justify-between gap-2">
            <span
              className={
                isFantasy
                  ? "truncate font-display text-lg uppercase tracking-wide text-[#f5ebe6] group-hover:text-[#5ce1b8]"
                  : isManga
                    ? "truncate font-display text-lg uppercase tracking-wide"
                    : "truncate font-medium"
              }
            >
              {def.label}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${
                isFantasy ? "text-[#c5a869]" : "text-muted-foreground"
              } ${open ? "rotate-180" : ""}`}
            />
          </span>
          <span
            className={`mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wider ${
              isFantasy ? "text-[#e6dcc5]" : "text-muted-foreground"
            }`}
          >
            <span
              style={isManga ? undefined : { color: def.color }}
              className={
                isFantasy
                  ? "font-bold text-[#5ce1b8]"
                  : isManga
                    ? "font-bold text-primary"
                    : undefined
              }
            >
              {def.tier}
            </span>
            <span>·</span>
            <span>{ABILITY_GROUP_LABELS[def.group]}</span>
            <span>·</span>
            <span>
              {holders.length} {holders.length === 1 ? "holder" : "holders"}
            </span>
            <AbilityRankPips rank={effectiveCardRank} showLabel compact className="ml-auto" />
          </span>
        </button>
      </div>
      {def.description && (
        <p
          className={
            isFantasy
              ? "parchment-dot-grid relative mt-2.5 rounded border border-[#c5a869]/70 p-2.5 text-xs text-[#15221b]"
              : "relative mt-2 text-xs text-muted-foreground"
          }
        >
          {def.description}
        </p>
      )}

      <MotionPresence initial={false}>
        {open && (
          <MotionSection key="ability-holders" className="mt-3 border-t border-border pt-3">
            {holders.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No characters carry this yet — assign it from a character's editor.
              </p>
            ) : holdersMasked ? (
              <p className="text-xs italic text-muted-foreground">
                Holder names are hidden to avoid spoilers.
              </p>
            ) : (
              <div className="space-y-2">
                <AbilityHoldersChips abilityKey={def.key} />
                <div className="flex flex-wrap gap-1.5">
                  {holders.map((e) => {
                    const holderRank = abilityCtx?.resolveCharacterRank(e.id, def.key);
                    return (
                      <Link
                        key={e.id}
                        to="/character"
                        search={{ e: e.id }}
                        className={
                          isManga
                            ? "border border-border bg-background px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase hover:bg-primary hover:text-primary-foreground"
                            : "inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs hover:border-accent hover:text-accent"
                        }
                      >
                        <span>{e.name}</span>
                        {holderRank && (
                          <span className="font-mono text-[10px] text-accent">
                            Lv.{abilityRankMeta(holderRank).roman}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-3 border-t border-border/50 pt-2.5">
              <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                Rank progression (I–V)
              </p>
              <AbilityRankProgressionStrip
                ability={def.key}
                currentRank={effectiveCardRank}
                onSelectRank={
                  abilityCtx
                    ? (nextRank) =>
                        abilityCtx.setCharacterAbilityRank(def.key, nextRank, {
                          triggerImpact: nextRank >= 4,
                        })
                    : undefined
                }
                size="xs"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                to="/abilities"
                search={{ tab: "fx", ability: def.key }}
                onClick={() =>
                  abilityCtx?.selectAbility(def.key, {
                    rank: displayRank,
                    triggerImpact: false,
                  })
                }
                className="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
              >
                <Flame className="h-3 w-3" /> Inspect in Ability FX →
              </Link>
              <Link
                to="/abilities"
                search={{ tab: "action", ability: def.key }}
                onClick={() =>
                  abilityCtx?.selectAbility(def.key, {
                    rank: displayRank,
                    triggerImpact: false,
                  })
                }
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-accent hover:underline"
              >
                <Swords className="h-3 w-3" /> Ability in Action →
              </Link>
              {isAdmin && (
                <>
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent"
                  >
                    <Pencil className="h-3 w-3" /> Edit ability
                  </button>
                  {isCustom && (
                    <button
                      onClick={onDeleteCustom}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Remove from registry
                    </button>
                  )}
                </>
              )}
            </div>
          </MotionSection>
        )}
      </MotionPresence>
    </MotionCard>
  );
});

function AddAbilityForm({ onSaved }: { onSaved: (addedTier?: AbilityTier) => void }) {
  const [label, setLabel] = useState("");
  const [tier, setTier] = useState<AbilityTier>("Rare");
  const [color, setColor] = useState("#a855f7");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = label.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const def: AbilityDef = {
        key: `custom_${normalizeAbilityKey(clean)}`,
        label: clean,
        tier,
        group: "power",
        color,
        icon: Sparkles,
        ...(description.trim() ? { description: description.trim() } : {}),
      };
      saveCustomAbility(def);
      // Mirror to app_settings so other devices pick it up.
      const { data: existing } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", CUSTOM_SETTINGS_KEY)
        .maybeSingle();
      const list = Array.isArray(existing?.value)
        ? [...(existing.value as unknown as AbilityDef[])]
        : [];
      const idx = list.findIndex((a) => normalizeAbilityKey(a.key) === def.key);
      if (idx >= 0) list[idx] = def;
      else list.push(def);
      const { error } = await supabase.from("app_settings").upsert({
        key: CUSTOM_SETTINGS_KEY,
        value: list as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success(`"${clean}" added to the registry.`);
      onSaved(tier);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save ability.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass mb-6 grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Ability name</Label>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='e.g. "Null Field"'
          className="h-9"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Rarity tier</Label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as AbilityTier)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {TIER_ORDER.filter((t) => t !== "Role").map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]}
            </option>
          ))}
          <option value="Role">Role</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Glow color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 font-mono text-xs"
          />
        </div>
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Description (optional)</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shown on the ability card and badge tooltip"
          className="h-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 sm:col-span-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Emblem Preview:
        </span>
        <AbilityBadge
          name={label.trim() || "New Ability"}
          level={tierToIntrinsicRank(tier)}
          showRank
        />
        <AbilityRankPips rank={tierToIntrinsicRank(tier)} showLabel className="ml-auto" />
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <Button size="sm" onClick={() => void submit()} disabled={busy || !label.trim()}>
          {busy ? "Saving…" : "Add to registry"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onSaved()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Admin edit form — writes an override (name/tier/color/description) for any ability. */
function EditAbilityForm({
  def,
  onClose,
  onSaved,
}: {
  def: AbilityDef;
  onClose: () => void;
  onSaved: (nextTier: AbilityTier) => void;
}) {
  const [label, setLabel] = useState(def.label);
  const [tier, setTier] = useState<AbilityTier>(def.tier);
  const [color, setColor] = useState(def.color);
  const [description, setDescription] = useState(def.description ?? "");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const submit = async (reset: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const base = baseAbilityDef(def.key);
      const trimmedLabel = label.trim();
      const trimmedDesc = description.trim();
      const override: AbilityOverride = reset
        ? {}
        : {
            ...(trimmedLabel && trimmedLabel !== base.label ? { label: trimmedLabel } : {}),
            ...(tier !== base.tier ? { tier } : {}),
            ...(color !== base.color ? { color } : {}),
            ...(trimmedDesc !== (base.description ?? "") ? { description: trimmedDesc } : {}),
          };
      if (reset || Object.keys(override).length === 0) removeAbilityOverride(def.key);
      else saveAbilityOverride(def.key, override);
      // Mirror overrides map to app_settings so other devices see the same ranks.
      const all = getAbilityOverrides();
      const { error } = await supabase.from("app_settings").upsert({
        key: OVERRIDES_SETTINGS_KEY,
        value: all as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success(
        reset ? `"${def.label}" reset to registry defaults.` : `"${label || def.label}" updated.`,
      );
      void qc.invalidateQueries({ queryKey: ["app-settings"] });
      onSaved(reset ? base.tier : tier);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save ability.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass mb-6 grid gap-3 rounded-2xl border border-accent/30 p-4 sm:grid-cols-2">
      <p className="text-xs font-medium text-accent sm:col-span-2">
        Editing: {def.label} <span className="text-muted-foreground">({def.key})</span>
      </p>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Display name</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} className="h-9" />
      </div>
      <div className="grid gap-1.5">
        <Label>Rarity tier</Label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as AbilityTier)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {TIER_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Glow color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 font-mono text-xs"
          />
        </div>
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label>Description / usage context</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="How this character wields it in battle"
          className="h-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 sm:col-span-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Emblem Preview:
        </span>
        <AbilityBadge name={label.trim() || def.label} level={tierToIntrinsicRank(tier)} showRank />
        <AbilityRankPips rank={tierToIntrinsicRank(tier)} showLabel className="ml-auto" />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button size="sm" onClick={() => void submit(false)} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void submit(true)} disabled={busy}>
          Reset to defaults
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function NexusAbilityHero({
  defs,
}: {
  defs: {
    key: string;
    label: string;
    description?: string;
    tier: keyof typeof TIER_LABELS;
    group: keyof typeof ABILITY_GROUP_LABELS;
  }[];
}) {
  const moving = useNexusMotion();
  const members = defs.map((def) => {
    const rank = tierToIntrinsicRank(def.tier);
    return {
      id: def.key,
      title: def.label,
      group: TIER_LABELS[def.tier],
      icon: (
        <span className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border border-border">
          <AbilityFxCanvas
            recipe={abilityFxRecipe(def.key, rank)}
            rank={rank}
            label={`${def.label} animation`}
          />
          <NexusAbilitySymbol
            name={def.key}
            label={def.label}
            description={def.description}
            rank={rank}
            className="relative h-10 w-10 opacity-90"
          />
        </span>
      ),
    };
  });
  return (
    <section
      aria-label="Ability showcase"
      className="nexus-cluster relative mb-6 overflow-hidden rounded-lg border border-border bg-card/40"
    >
      <div className="relative h-48 sm:h-56">
        <NexusSpotlight members={members} offset={0} moving={moving} />
      </div>
      <p className="pb-3 text-center font-mono text-[10px] tracking-[.3em] text-muted-foreground">
        ABILITY CODEX · {defs.length} RECORDED
      </p>
    </section>
  );
}
