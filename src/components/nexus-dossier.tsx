import { JourneyLine } from "@/components/journey-line";
import { seasonJourneyRows } from "@/lib/journey";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronDown,
  Fingerprint,
  Pencil,
  Plus,
  Sparkles,
  Swords,
  Trash2,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  characterLinksQuery,
  entitiesQuery,
  getMergedSecondaryIds,
  type Entity,
} from "@/lib/entities";
import { characterSeriesQuery, seriesQuery } from "@/lib/series";
import { abilityDef, allAbilityDefs } from "@/lib/abilities";
import { artifactsQuery } from "@/lib/artifacts";
import {
  DOSSIER_GENDERS,
  DOSSIER_ROLES,
  DOSSIER_STATUSES,
  NEXUS_STATS,
  readDossier,
  resolveCharacterSeasonAbilities,
  resolveDossierMeta,
  resolveNexusStats,
  nexusRole,
  type ResolvedSeasonAbility,
  type SeasonDossier,
} from "@/lib/nexus-season";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { useIsStaff } from "@/hooks/use-admin";
import { useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { invalidateArchive } from "@/lib/archive-sync";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NexusStatWheel } from "@/components/nexus-stat-wheel";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";
import { SeasonStatCharts } from "@/components/season-stat-charts";
import { SeasonStatComparison } from "@/components/season-stat-comparison";
import { HeaderUiModeSelect } from "@/components/header-ui-mode-select";
import { LoreBreadcrumb } from "@/components/lore-breadcrumb";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import {
  ABILITY_RANKS,
  abilityRankMeta,
  clampDbAbilityLevel,
  groupCharacterAbilityProgression,
  resolveAbilityAliasPure,
  type AbilityEmblemRank,
} from "@/lib/ability-rank";
import { useOptionalAbilityContext } from "@/context/AbilityContext";
import { Character3dFrame } from "@/components/character-3d-frame";
import { StatusTooltip } from "@/components/status-tooltip";
import { tierDef } from "@/lib/character-tier";
import { triggerAnimeActionCut } from "@/hooks/use-anime-hitstop";

const EASE = [0.16, 1, 0.3, 1] as const;

type Menu = "story" | "role" | "details";
const MENU: Array<{ key: Menu; label: string; icon: typeof BookOpen }> = [
  { key: "story", label: "Story", icon: BookOpen },
  { key: "role", label: "Role", icon: Swords },
  { key: "details", label: "Details", icon: Fingerprint },
];

type SeriesCard = { id: string; title: string; cover: string | null; seasons: string[] };

/** Maps a free-text season status to a lighting tone for the dossier. */
export function nexusStatusTone(status: string | null | undefined) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("presumed")) return "presumed";
  if (s.includes("dead") || s.includes("deceased")) return "dead";
  if (s.includes("seal")) return "sealed";
  if (s.includes("missing") || s.includes("unknown")) return "missing";
  if (s.includes("alive") || s.includes("active")) return "alive";
  return "neutral";
}

export function NexusDossier({
  e,
  initialSeason = null,
}: {
  e: Entity;
  initialSeason?: { seriesId: string; n: number } | null;
}) {
  const qc = useQueryClient();
  const isStaff = useIsStaff();
  const abilityVersion = useAbilityRegistryVersion();
  const masked = useSpoilerMask("characters");
  const [openSeries, setOpenSeries] = useState<string | null>(null);
  const [season, setSeason] = useState<{ seriesId: string; n: number } | null>(initialSeason);
  const [menu, setMenu] = useState<Menu>("story");
  const [editing, setEditing] = useState(false);
  const [comparingSeasons, setComparingSeasons] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<string | null>(null);
  const moving = useNexusMotion();
  const abilityCtx = useOptionalAbilityContext();

  const { data: memberships } = useQuery(characterSeriesQuery(e.id));
  const { data: allSeries } = useQuery(seriesQuery);
  const { data: links } = useQuery(characterLinksQuery(e.id));
  const { data: groups } = useQuery(
    entitiesQuery(["organization", "clan", "bloodline", "faction"]),
  );
  const mergedEntityIds = useMemo(() => [e.id, ...getMergedSecondaryIds(e.id)], [e.id]);
  const { data: charAbilities } = useQuery({
    queryKey: ["character-abilities", e.id, mergedEntityIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("character_abilities")
        .select("*")
        .in("entity_id", mergedEntityIds);
      return data ?? [];
    },
  });

  const alterName = ({ ethan: "Elizah", elizah: "Ethan" } as Record<string, string>)[
    e.name.toLowerCase()
  ];
  const { data: alter } = useQuery({
    queryKey: ["alter-ego", alterName],
    enabled: !!alterName,
    queryFn: async () => {
      if (!alterName) return null;
      return (
        await supabase
          .from("entities")
          .select("id")
          .eq("kind", "character")
          .ilike("name", alterName)
          .maybeSingle()
      ).data;
    },
  });

  const stats = (e.stats ?? {}) as Record<string, unknown>;
  const realName = typeof stats["real_name"] === "string" ? (stats["real_name"] as string) : null;
  const dossier = useMemo(() => readDossier(e.stats), [e.stats]);
  const dossierMap = dossier;
  const seasonKey = season ? `${season.seriesId}:${season.n}` : null;
  const membership = (memberships ?? []).find((m) => m.series_id === season?.seriesId);
  const meta = useMemo(
    () => resolveDossierMeta(e, season?.seriesId, season?.n, membership),
    [e, season?.seriesId, season?.n, membership],
  );
  const sd = meta.sd;
  const bloodline = meta.bloodline || null;
  const status = meta.status;
  const gender = meta.gender;
  const weapons = meta.weapons;

  // The row under the hero shows the series this character actually appears in.
  const seriesCards = useMemo<SeriesCard[]>(
    () =>
      (allSeries ?? [])
        .filter(
          (full) =>
            (memberships ?? []).some((m) => m.series_id === full.id) ||
            Object.keys(dossierMap).some((key) => key.startsWith(`${full.id}:`)),
        )
        .map((full) => {
          const names = full?.season_names ?? [];
          const count = Math.max(full?.season_count ?? 0, names.length, 1);
          return {
            id: full.id,
            title: full.title,
            cover: full.cover_image_url,
            seasons: Array.from({ length: count }, (_, i) => names[i] || `Season ${i + 1}`),
          };
        }),
    [memberships, allSeries, dossierMap],
  );

  // The editor can target any season of any series, so staff are not blocked by a missing link.
  const editorSeries = useMemo<SeriesCard[]>(
    () =>
      (allSeries ?? []).map((full) => {
        const names = full.season_names ?? [];
        const count = Math.max(full.season_count ?? 0, names.length, 1);
        return {
          id: full.id,
          title: full.title,
          cover: full.cover_image_url,
          seasons: Array.from({ length: count }, (_, i) => names[i] || `Season ${i + 1}`),
        };
      }),
    [allSeries],
  );

  const seasonLabel = season
    ? `${seriesCards.find((s) => s.id === season.seriesId)?.title ?? editorSeries.find((s) => s.id === season.seriesId)?.title ?? ""} · ${
        (
          seriesCards.find((s) => s.id === season.seriesId) ??
          editorSeries.find((s) => s.id === season.seriesId)
        )?.seasons[season.n - 1] ?? ""
      }`
    : "All seasons";

  const orgs = useMemo(() => {
    const byId = new Map((groups ?? []).map((g) => [g.id, g]));
    return (links ?? []).map((l) => byId.get(l.group_id)).filter(Boolean) as Entity[];
  }, [links, groups]);

  const allowedAbilityKeys = sd.abilityKeys;
  // Season-scoped abilities: carried-over from earlier seasons + newly acquired this season; future/other seasons excluded.
  const abilities = useMemo(() => {
    void abilityVersion;
    const resolved = resolveCharacterSeasonAbilities({
      entityAbilities: e.abilities,
      rows: charAbilities ?? [],
      seriesId: season?.seriesId,
      seasonNumber: season?.n,
      allowedAbilityKeys,
    });
    return resolved.active.map((a) => ({
      name: a.abilityKey,
      level: a.level,
      origin: a.origin,
      def: abilityDef(a.abilityKey),
    }));
  }, [charAbilities, season?.seriesId, season?.n, e.abilities, allowedAbilityKeys, abilityVersion]);

  const seriesTitleMap = useMemo(
    () => new Map((allSeries ?? []).map((x) => [x.id, x.title])),
    [allSeries],
  );
  const seasonNamesMap = useMemo(
    () => new Map((allSeries ?? []).map((x) => [x.id, x.season_names ?? []])),
    [allSeries],
  );
  const abilityProgression = useMemo(
    () => groupCharacterAbilityProgression(charAbilities ?? [], seriesTitleMap, seasonNamesMap),
    [charAbilities, seriesTitleMap, seasonNamesMap],
  );

  const core = abilities[0];
  const coreColor = core?.def.color ?? "var(--accent)";
  const abilitySelection = abilities.some((a) => a.name === selectedAbility)
    ? selectedAbility
    : null;
  const statVals = resolveNexusStats(e.stats, seasonKey, abilitySelection);
  const roleBadge = meta.role || "Unclassified";
  const roleTone = nexusRole(roleBadge, masked);
  const codename = meta.codename || null;
  const selectSeason = (value: { seriesId: string; n: number } | null) => {
    setSeason(value);
    setSelectedAbility(null);
    abilityCtx?.setSeasonScope(value?.seriesId ?? null, value?.n ?? null);
    triggerAnimeActionCut({ color: coreColor, label: value ? `SEASON ${value.n}` : "ALL SEASONS" });
  };

  return (
    <MotionConfig
      reducedMotion={moving ? "user" : "always"}
      transition={{ duration: moving ? 0.7 : 0, ease: EASE }}
    >
      <div
        data-role={roleTone}
        data-nx-status={nexusStatusTone(status)}
        className="nexus-dossier relative min-h-dvh overflow-x-hidden bg-background text-foreground"
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={roleTone}
            data-role={roleTone}
            aria-hidden
            className="nexus-role-field pointer-events-none fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: moving ? 2.2 : 0 }}
          />
        </AnimatePresence>
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 opacity-60"
          style={{
            background: `radial-gradient(60% 50% at 50% 20%, color-mix(in oklab, ${coreColor} 22%, transparent), transparent 70%)`,
          }}
        />

        <div aria-hidden className="nx-status-field pointer-events-none fixed inset-0" />
        {/* ═════ TOP: hero + stat wheel + series cards ═════ */}
        <section className="relative mx-auto max-w-6xl px-4 pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/characters"
              aria-label="Back to characters"
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 backdrop-blur hover:border-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span
              data-spoiler="char"
              className="rounded-sm border border-amber-400/50 bg-amber-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300"
            >
              {roleBadge}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <HeaderUiModeSelect variant="nexus" />
              {alter && (
                <Link
                  to="/character"
                  search={{ e: alter.id }}
                  className="rounded-full border border-accent px-3 py-1 text-xs text-accent hover:bg-accent/15"
                >
                  ⇄ Switch to {alterName}
                </Link>
              )}
              {isStaff && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  Edit {season ? "this season" : "dossier"}
                </Button>
              )}
            </div>
          </div>

          <LoreBreadcrumb
            className="mt-3 mb-0"
            segments={[
              { id: "chars", label: "Characters", to: "/characters" },
              ...(season
                ? [
                    {
                      id: `series-${season.seriesId}`,
                      label: seriesTitleMap.get(season.seriesId) ?? "Series",
                      to: "/characters",
                      search: { series: season.seriesId },
                    },
                    {
                      id: `season-${season.n}`,
                      label:
                        seasonNamesMap.get(season.seriesId)?.[season.n - 1] ?? `Season ${season.n}`,
                      onClick: () => selectSeason(null),
                    },
                  ]
                : []),
              { id: `char-${e.id}`, label: e.name },
            ]}
          />

          <div className="mt-4 grid items-center gap-6 md:grid-cols-[1fr_1.1fr_1fr]">
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="order-2 md:order-1"
            >
              <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
                {seasonLabel}
              </p>
              <h1 className="mt-1 [font-family:var(--font-display)] text-4xl tracking-wide md:text-5xl">
                {e.name}
              </h1>
              {codename && (
                <p data-spoiler="char" className="mt-1 text-sm italic text-accent">
                  {codename}
                </p>
              )}
              <p
                data-spoiler="char"
                aria-hidden
                className="nx-telemetry mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
              >
                STATUS // {status || "UNKNOWN"}
                {season ? ` · SERIES // S${String(season.n).padStart(2, "0")}` : ""}
              </p>
              <p
                data-spoiler="char"
                className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"
              >
                <span>Status ·</span>
                <StatusTooltip label={status}>
                  <span className="text-foreground">{status}</span>
                </StatusTooltip>
                {e.character_tier && tierDef(e.character_tier) && (
                  <StatusTooltip label={tierDef(e.character_tier)!.label}>
                    <span
                      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        color: tierDef(e.character_tier)!.color,
                        borderColor: `${tierDef(e.character_tier)!.color}66`,
                      }}
                    >
                      {tierDef(e.character_tier)!.label}
                    </span>
                  </StatusTooltip>
                )}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: EASE }}
              className="order-1 mx-auto aspect-[3/4] w-56 overflow-hidden rounded-[40%_40%_8px_8px] border border-border md:order-2 md:w-72"
              style={{ boxShadow: `0 0 80px -20px ${coreColor}` }}
            >
              <Character3dFrame
                entity={e}
                accentColor={coreColor}
                fallback={
                  e.image_url ? (
                    <img
                      src={e.image_url}
                      alt={e.name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-card [font-family:var(--font-display)] text-6xl text-muted-foreground">
                      {e.name[0]}
                    </div>
                  )
                }
              />
            </motion.div>

            <div className="order-3" data-spoiler="char">
              <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {abilitySelection ? abilityDef(abilitySelection).label : "Character stats"} ·{" "}
                {seasonLabel}
              </p>
              <NexusStatWheel
                stats={statVals}
                abilities={abilities}
                selected={abilitySelection}
                onSelect={(name) => {
                  setSelectedAbility(name);
                  if (name) {
                    const abDef = abilityDef(name);
                    const found = abilities.find((a) => a.name === name);
                    abilityCtx?.selectAbility(abDef.key, {
                      rank: found ? clampDbAbilityLevel(found.level) : undefined,
                      entityId: e.id,
                      seriesId: season?.seriesId ?? null,
                      seasonNumber: season?.n ?? null,
                      triggerImpact: true,
                    });
                    triggerAnimeActionCut({ color: abDef.color, label: abDef.label });
                  }
                }}
              />
              <div className="mt-2 flex justify-center">
                <Button
                  type="button"
                  size="sm"
                  variant={comparingSeasons ? "secondary" : "outline"}
                  aria-expanded={comparingSeasons}
                  onClick={() => setComparingSeasons((v) => !v)}
                  className="whitespace-nowrap border-cyan-400/35 text-xs uppercase tracking-wider"
                >
                  <BarChart3 className="mr-1.5 h-3.5 w-3.5 text-accent" />
                  {comparingSeasons ? "Hide comparison" : "Compare seasons"}
                </Button>
              </div>
            </div>
          </div>

          {/* Series cards with season drawers */}
          <div className="mt-8">
            <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Series
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              <button
                onClick={() => {
                  selectSeason(null);
                  setOpenSeries(null);
                }}
                className={`shrink-0 rounded-lg border px-4 py-6 text-xs uppercase tracking-widest transition ${
                  !season
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-card/50 hover:border-accent/60"
                }`}
              >
                All seasons
              </button>
              {seriesCards.map((s) => (
                <motion.button
                  key={s.id}
                  whileHover={{ y: -3 }}
                  onClick={() => setOpenSeries(openSeries === s.id ? null : s.id)}
                  className={`relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border text-left transition ${
                    openSeries === s.id || season?.seriesId === s.id
                      ? "border-accent"
                      : "border-border hover:border-accent/60"
                  }`}
                >
                  {s.cover && (
                    <img
                      src={s.cover}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-40"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <span className="absolute bottom-2 left-2 right-6 [font-family:var(--font-display)] text-sm leading-tight">
                    {s.title}
                  </span>
                  <ChevronDown
                    className={`absolute bottom-2 right-2 h-4 w-4 transition-transform ${openSeries === s.id ? "rotate-180" : ""}`}
                  />
                </motion.button>
              ))}
              {!seriesCards.length && (
                <p className="self-center text-xs text-muted-foreground">
                  Not linked to any series yet.
                  {isStaff && (
                    <Link to="/admin" className="ml-2 text-accent underline">
                      Add series
                    </Link>
                  )}
                </p>
              )}
            </div>
            <AnimatePresence initial={false}>
              {openSeries && (
                <motion.div
                  key={openSeries}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-border bg-card/60 p-3 backdrop-blur">
                    {seriesCards
                      .find((s) => s.id === openSeries)
                      ?.seasons.map((label, i) => {
                        const on = season?.seriesId === openSeries && season.n === i + 1;
                        return (
                          <button
                            key={label + i}
                            onClick={() => selectSeason({ seriesId: openSeries, n: i + 1 })}
                            className={`rounded-full border px-3 py-1 text-xs transition ${
                              on
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border hover:border-accent"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <div className="relative mx-auto mt-6 max-w-6xl px-4">
          <SeasonStatCharts
            stats={e.stats}
            seasonKey={seasonKey}
            seasonLabel={seasonLabel}
            characterName={e.name}
            selectedAbility={abilitySelection}
            abilityLabel={abilitySelection ? abilityDef(abilitySelection).label : null}
            variant="nexus"
          />
        </div>

        <AnimatePresence initial={false}>
          {comparingSeasons && (
            <motion.section
              key="season-stat-comparison"
              initial={moving ? { opacity: 0, height: 0 } : false}
              animate={{ opacity: 1, height: "auto" }}
              {...(moving ? { exit: { opacity: 0, height: 0 } } : {})}
              transition={{ duration: moving ? 0.35 : 0, ease: EASE }}
              className="relative mx-auto mt-6 max-w-6xl overflow-hidden px-4"
            >
              <SeasonStatComparison
                entity={e}
                seriesList={allSeries}
                memberships={memberships}
                activeSeasonKey={seasonKey ?? "all"}
                abilities={abilities.map((a) => ({ name: a.name, label: a.def.label }))}
                selectedAbility={abilitySelection}
                variant="nexus"
                onClose={() => setComparingSeasons(false)}
              />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ═════ MIDDLE: arc menu · content · identity ═════ */}
        <section className="relative mx-auto mt-10 max-w-6xl px-4">
          <div className="grid gap-6 rounded-2xl border border-cyan-400/35 bg-slate-950/85 p-5 shadow-[0_0_24px_rgba(56,189,248,0.12)] md:grid-cols-[180px_1fr_240px]">
            <nav className="relative flex flex-row gap-3 md:flex-col md:gap-6 md:py-6">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-1 top-2 bottom-2 hidden w-16 rounded-[50%] border-l border-cyan-400/30 md:block"
              />
              {MENU.map((m, i) => {
                const Icon = m.icon;
                const on = menu === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => {
                      setMenu(m.key);
                      triggerAnimeActionCut({ color: coreColor, label: m.label });
                    }}
                    className="relative flex items-center gap-3 text-left"
                    style={{ marginLeft: [24, 6, 24][i] }}
                  >
                    <motion.span
                      animate={{ scale: on ? 1.15 : 1 }}
                      className={`grid h-11 w-11 place-items-center rounded-full border ${
                        on
                          ? "border-accent bg-accent/20 text-accent"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                      style={{ boxShadow: on ? `0 0 24px -4px ${coreColor}` : "none" }}
                    >
                      <Icon className="h-4 w-4" />
                    </motion.span>
                    <span
                      className={`text-xs uppercase tracking-[0.3em] ${on ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="min-h-[220px]">
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={menu + (seasonKey ?? "all")}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: EASE }}
                >
                  <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-accent">
                    {MENU.find((m) => m.key === menu)?.label} · {seasonLabel}
                  </p>
                  {menu === "story" && (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                      {sd.story ||
                        (season
                          ? "No story written for this season yet."
                          : e.description || "No story yet.")}
                    </p>
                  )}
                  {menu === "role" && (
                    <div data-spoiler="char" className="space-y-3 text-sm">
                      <p>
                        <span className="text-muted-foreground">Role: </span>
                        {sd.role ||
                          membership?.role_in_series ||
                          membership?.arc_role ||
                          e.role ||
                          "—"}
                      </p>
                      <p className="whitespace-pre-line leading-relaxed text-foreground/90">
                        <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                          Impact
                        </span>
                        {sd.impact || "No impact notes for this selection yet."}
                      </p>
                      {sd.philosophy && (
                        <p className="whitespace-pre-line">
                          <span className="block text-xs text-muted-foreground">Philosophy</span>
                          {sd.philosophy}
                        </p>
                      )}
                      <JourneyLine
                        lines={[
                          {
                            name: e.name,
                            rows: seasonJourneyRows(
                              (memberships ?? []).filter((r) => r.series),
                              e.stats,
                              Object.fromEntries((allSeries ?? []).map((x) => [x.id, x.title])),
                            ),
                          },
                        ]}
                      />
                      {abilityProgression.length > 0 && (
                        <div className="space-y-1.5 rounded-lg border border-border/70 bg-background/40 p-2.5">
                          <p className="text-[10px] uppercase tracking-[0.25em] text-accent">
                            Ability mastery across seasons
                          </p>
                          {abilityProgression.map((group) => {
                            const def = abilityDef(group.displayKey);
                            return (
                              <div
                                key={group.canonKey}
                                className="flex flex-wrap items-center justify-between gap-2 text-xs"
                              >
                                <span className="font-medium">{def.label}</span>
                                <span className="flex flex-wrap items-center gap-1">
                                  {group.steps.map((step, sIdx) => (
                                    <span key={step.id} className="inline-flex items-center gap-1">
                                      {sIdx > 0 && <span className="text-muted-foreground">→</span>}
                                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px]">
                                        {step.seriesId
                                          ? `${step.seriesTitle.replace(/^The\s+/i, "")} ${step.seasonLabel}`
                                          : step.seasonLabel}{" "}
                                        {abilityRankMeta(step.level).roman}
                                      </span>
                                    </span>
                                  ))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {menu === "details" && (
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        ["Real name", realName],
                        ["Status", status],
                        ["Gender", gender],
                        ["Category", e.category],
                        ["Tier", e.character_tier],
                        ["Weapons", weapons.length ? weapons.join(", ") : null],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-md border border-border bg-background/50 p-2"
                        >
                          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {k}
                          </dt>
                          <dd data-spoiler={k === "Real name" ? undefined : "char"}>{v || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            <aside className="space-y-4 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <div>
                <p className="font-display break-words text-2xl">{e.name}</p>
                <p className="pt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Title / Codename
                </p>
                <AnimatePresence mode="sync" initial={false}>
                  <motion.p
                    key={codename || "none"}
                    data-spoiler="char"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="break-words text-xs italic text-accent"
                  >
                    {codename || "—"}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div data-spoiler="char" className="space-y-1 text-xs">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Gender
                </p>
                <p>{gender || "—"}</p>
                <p className="pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Bloodline
                </p>
                <p>{bloodline || "—"}</p>
                <p className="pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Weapons
                </p>
                <div className="flex flex-wrap gap-1">
                  {weapons.length
                    ? weapons.map((w) => (
                        <span
                          key={w}
                          className="rounded-sm border border-amber-400/35 bg-amber-500/10 px-1.5 py-0.5 text-amber-200"
                        >
                          {w}
                        </span>
                      ))
                    : "—"}
                </div>
                <p className="pt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Organizations
                </p>
                <div className="flex flex-wrap gap-1">
                  {sd.organizations !== undefined
                    ? sd.organizations.filter(Boolean).join(" · ") || "—"
                    : orgs.length
                      ? orgs.map((o) => (
                          <span
                            key={o.id}
                            className="rounded-sm border border-border px-1.5 py-0.5"
                          >
                            {o.name}
                          </span>
                        ))
                      : "—"}
                </div>
              </div>
              <div data-spoiler="char">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Abilities
                </p>
                <ul className="mt-1 space-y-1 text-xs">
                  {abilities.slice(0, 6).map((a) => (
                    <li key={a.name} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: a.def.color }}
                        />
                        <span className="truncate">{a.def.label}</span>
                      </span>
                      <AbilityRankPips rank={a.level} compact />
                    </li>
                  ))}
                  {!abilities.length && <li className="text-muted-foreground">None this season</li>}
                </ul>
              </div>
            </aside>
          </div>
        </section>

        {/* ═════ BOTTOM: ability orbit ═════ */}
        <section className="relative mx-auto mb-16 mt-10 max-w-6xl px-4" data-spoiler="char">
          <p className="mb-2 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Ability core · {seasonLabel}
          </p>
          <div className="grid gap-6 rounded-2xl border border-cyan-400/35 bg-slate-950/85 p-5 shadow-[0_0_24px_rgba(56,189,248,0.12)] md:grid-cols-[1fr_240px]">
            <AbilityOrbit
              abilities={abilities}
              masked={masked}
              seasonKey={seasonKey ?? "all"}
              selected={abilitySelection}
              onSelect={(name) => {
                setSelectedAbility(name);
                const abDef = abilityDef(name);
                const found = abilities.find((a) => a.name === name);
                abilityCtx?.selectAbility(abDef.key, {
                  rank: found ? clampDbAbilityLevel(found.level) : undefined,
                  entityId: e.id,
                  seriesId: season?.seriesId ?? null,
                  seasonNumber: season?.n ?? null,
                  triggerImpact: true,
                });
                triggerAnimeActionCut({
                  color: abDef.color,
                  label: abDef.label,
                  intensity: abDef.tier === "Mythic" || found?.level === 5 ? "heavy" : "normal",
                });
              }}
              moving={moving}
            />
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p
                  className="[font-family:var(--font-display)] text-lg"
                  style={{ color: coreColor }}
                >
                  {abilitySelection
                    ? abilityDef(abilitySelection).label
                    : core
                      ? core.def.label
                      : "No abilities"}
                </p>
                {core && (
                  <Link
                    to="/abilities"
                    onClick={() => {
                      const target = abilities.find((a) => a.name === abilitySelection) ?? core;
                      abilityCtx?.selectAbility(target.def.key, {
                        rank: clampDbAbilityLevel(target.level),
                        entityId: e.id,
                        seriesId: season?.seriesId ?? null,
                        seasonNumber: season?.n ?? null,
                        triggerImpact: true,
                      });
                    }}
                    className="text-[10px] uppercase tracking-wider text-accent hover:underline"
                  >
                    FX →
                  </Link>
                )}
              </div>
              {(abilitySelection
                ? abilityDef(abilitySelection).description
                : core?.def.description) && (
                <p className="text-muted-foreground">
                  {abilitySelection
                    ? abilityDef(abilitySelection).description
                    : core?.def.description}
                </p>
              )}
              {abilities.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => {
                    setSelectedAbility(a.name);
                    abilityCtx?.selectAbility(a.def.key, {
                      rank: clampDbAbilityLevel(a.level),
                      entityId: e.id,
                      seriesId: season?.seriesId ?? null,
                      seasonNumber: season?.n ?? null,
                      triggerImpact: true,
                    });
                    triggerAnimeActionCut({
                      color: a.def.color,
                      label: a.def.label,
                      intensity: a.def.tier === "Mythic" || a.level === 5 ? "heavy" : "normal",
                    });
                  }}
                  className={`flex w-full items-center justify-between gap-2 border-b border-border/60 py-1 text-left transition ${
                    abilitySelection === a.name ? "text-accent" : "hover:text-accent"
                  }`}
                >
                  <span className="min-w-0 truncate">{a.def.label}</span>
                  <AbilityRankPips rank={a.level} compact showLabel />
                </button>
              ))}
              {abilityProgression.some((g) => g.steps.length > 1) && (
                <div className="pt-2">
                  <p className="mb-1 text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                    Season evolution
                  </p>
                  <div className="space-y-1">
                    {abilityProgression
                      .filter((g) => g.steps.length > 1)
                      .map((g) => {
                        const def = abilityDef(g.displayKey);
                        return (
                          <div key={g.canonKey} className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground">{def.label}: </span>
                            {g.steps
                              .map(
                                (st) =>
                                  `${st.seriesId ? st.seasonLabel : "Base"} ${abilityRankMeta(st.level).roman}`,
                              )
                              .join(" → ")}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {isStaff && (
          <SeasonEditor
            open={editing}
            onClose={() => setEditing(false)}
            entity={e}
            seasonKey={seasonKey}
            seasonLabel={seasonLabel}
            seriesCards={editorSeries}
            onSeasonChange={selectSeason}
            onSaved={() => {
              void qc.invalidateQueries({ queryKey: ["entity", e.id] });
              void invalidateArchive(qc);
            }}
          />
        )}
      </div>
    </MotionConfig>
  );
}

function AbilityGlyph({
  def,
  rank,
  masked,
  className = "",
}: {
  def: ReturnType<typeof abilityDef>;
  rank?: number | undefined;
  masked: boolean;
  className?: string | undefined;
}) {
  return <NexusAbilitySymbol name={def.key} rank={rank} masked={masked} className={className} />;
}

function AbilityOrbit({
  abilities,
  masked,
  seasonKey,
  selected,
  onSelect,
  moving,
}: {
  abilities: Array<{ name: string; level: number; def: ReturnType<typeof abilityDef> }>;
  masked: boolean;
  seasonKey: string;
  selected: string | null;
  onSelect: (name: string) => void;
  moving: boolean;
}) {
  const [core, ...rest] = abilities;
  if (!core)
    return (
      <div className="grid h-72 place-items-center text-sm text-muted-foreground">
        No abilities recorded.
      </div>
    );
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {[0.95, 0.72, 0.5].map((s, i) => (
        <motion.div
          key={s}
          className="absolute rounded-full border"
          style={{
            inset: `${((1 - s) / 2) * 100}%`,
            borderColor: `color-mix(in oklab, ${core.def.color} ${40 - i * 10}%, transparent)`,
          }}
          animate={{ rotate: moving ? (i % 2 ? -360 : 360) : 0 }}
          transition={{ duration: 40 + i * 15, repeat: Infinity, ease: "linear" }}
        />
      ))}
      <AnimatePresence mode="sync" initial={false}>
        <motion.div key={seasonKey} className="absolute inset-0">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            role="button"
            tabIndex={0}
            aria-label={`Select ${core.def.label} stats`}
            aria-pressed={selected === core.name}
            onClick={() => onSelect(core.name)}
            onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(core.name)}
            className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 bg-background"
            style={{ borderColor: core.def.color, boxShadow: `0 0 60px -6px ${core.def.color}` }}
          >
            <AbilityGlyph def={core.def} rank={core.level} masked={masked} className="h-12 w-12" />
            <span className="absolute -bottom-6 whitespace-nowrap text-[10px] uppercase tracking-widest">
              {masked ? "Core" : `${core.def.label} · ${abilityRankMeta(core.level).roman}`}
            </span>
          </motion.div>
          {rest.slice(0, 8).map((a, i, arr) => {
            const ang = (i / arr.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.div
                key={a.name}
                initial={{ opacity: 0, x: "-50%", y: "-50%", left: "50%", top: "50%" }}
                animate={{
                  opacity: 1,
                  left: `${50 + Math.cos(ang) * 40}%`,
                  top: `${50 + Math.sin(ang) * 40}%`,
                }}
                exit={{ opacity: 0, left: "50%", top: "50%" }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: EASE }}
                className="absolute grid h-12 w-12 cursor-pointer place-items-center rounded-full border bg-card"
                style={{ borderColor: a.def.color, boxShadow: `0 0 20px -6px ${a.def.color}` }}
                role="button"
                tabIndex={0}
                aria-pressed={selected === a.name}
                aria-label={`Select ${a.def.label} (${abilityRankMeta(a.level).label}) stats`}
                onClick={() => onSelect(a.name)}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelect(a.name)}
                title={`${a.def.label} — ${abilityRankMeta(a.level).label}`}
              >
                <AbilityGlyph def={a.def} rank={a.level} masked={masked} className="h-6 w-6" />
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function normalizeHeaderStatus(raw: string | undefined | null): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "active" || s === "alive") return "Alive";
  if (s === "dead" || s === "deceased" || s === "killed") return "Dead";
  if (s === "missing" || s === "unknown") return "Missing";
  if (s.includes("presumed")) return "Presumed Dead";
  if (s === "sealed" || s === "imprisoned") return "Sealed";
  const exact = DOSSIER_STATUSES.find((opt) => opt.toLowerCase() === s);
  return exact ?? "Alive";
}

export function SeasonEditor({
  open,
  onClose,
  entity,
  seasonKey,
  seasonLabel,
  onSaved,
  seriesCards,
  onSeasonChange,
}: {
  open: boolean;
  onClose: () => void;
  entity: Entity;
  seasonKey: string | null;
  seasonLabel: string;
  onSaved: () => void;
  seriesCards: Array<{ id: string; title: string; seasons: string[] }>;
  onSeasonChange: (s: { seriesId: string; n: number } | null) => void;
}) {
  const qc = useQueryClient();
  useAbilityRegistryVersion();
  const key = seasonKey ?? "all";
  const seriesId = seasonKey?.split(":")[0] ?? "";
  const seasonNumber = seriesId ? Number(seasonKey?.split(":")[1] ?? 1) : null;

  const [tab, setTab] = useState<"dossier" | "abilities">("dossier");
  const [form, setForm] = useState<SeasonDossier>({});
  const [ability, setAbility] = useState("");
  const [busy, setBusy] = useState(false);

  // Abilities manager state for the active Series + Season
  const [carriedOver, setCarriedOver] = useState<ResolvedSeasonAbility[]>([]);
  const [newlyAcquired, setNewlyAcquired] = useState<ResolvedSeasonAbility[]>([]);
  const [newAbilityKey, setNewAbilityKey] = useState("");
  const [newAbilityRank, setNewAbilityRank] = useState<AbilityEmblemRank>(1);

  // Weapons picker state
  const [weaponChoice, setWeaponChoice] = useState("");
  const [customWeapon, setCustomWeapon] = useState("");

  const mergedIds = useMemo(() => [entity.id, ...getMergedSecondaryIds(entity.id)], [entity.id]);

  const { data: artifacts = [] } = useQuery(artifactsQuery);
  const { data: allCharAbilities } = useQuery({
    queryKey: ["character-abilities", entity.id, mergedIds.join(",")],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_abilities")
        .select("*")
        .in("entity_id", mergedIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const loadedForRef = useRef<string | null>(null);
  const loadedAbilitiesForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      loadedForRef.current = null;
      loadedAbilitiesForRef.current = null;
      setTab("dossier");
      return;
    }
    const targetKey = `${entity.id}:${key}`;
    if (loadedForRef.current !== targetKey) {
      loadedForRef.current = targetKey;
      const meta = resolveDossierMeta(entity, seriesId || null, seasonNumber);
      const current = readDossier(entity.stats)[key] ?? {};
      setAbility("");
      setWeaponChoice("");
      setCustomWeapon("");
      setForm({
        ...current,
        status: normalizeHeaderStatus(current.status ?? meta.status),
        role: current.role ?? meta.role ?? "",
        gender: current.gender ?? meta.gender ?? "",
        weapons: current.weapons ?? meta.weapons ?? [],
        stats: Object.fromEntries(
          resolveNexusStats(entity.stats, seasonKey, null).map((s) => [s.key, s.value]),
        ),
      });
    }
  }, [open, key, seasonKey, seriesId, seasonNumber, entity]);

  useEffect(() => {
    if (!open || !allCharAbilities) return;
    const targetKey = `${entity.id}:${key}`;
    if (loadedAbilitiesForRef.current === targetKey) return;
    loadedAbilitiesForRef.current = targetKey;

    const current = readDossier(entity.stats)[key] ?? {};
    const resolved = resolveCharacterSeasonAbilities({
      entityAbilities: entity.abilities,
      rows: allCharAbilities,
      seriesId: seriesId || null,
      seasonNumber,
      allowedAbilityKeys: current.abilityKeys,
    });
    setCarriedOver(resolved.carriedOver);
    setNewlyAcquired(resolved.newlyAcquired);
    const defs = allAbilityDefs();
    const activeCanons = new Set(resolved.active.map((a) => a.canonKey));
    const firstUnused = defs.find((d) => !activeCanons.has(resolveAbilityAliasPure(d.key)));
    setNewAbilityKey(firstUnused?.key ?? defs[0]?.key ?? "");
    setNewAbilityRank(1);
  }, [
    open,
    key,
    seriesId,
    seasonNumber,
    entity.id,
    entity.stats,
    entity.abilities,
    allCharAbilities,
  ]);

  // Active abilities ONLY for this Series + Season
  const activeAbilities = useMemo(
    () =>
      [...newlyAcquired, ...carriedOver.filter((a) => !a.excluded)].sort(
        (a, b) => b.level - a.level || a.canonKey.localeCompare(b.canonKey),
      ),
    [newlyAcquired, carriedOver],
  );

  // Keep selected stats profile valid when season abilities change
  useEffect(() => {
    if (ability && !activeAbilities.some((a) => a.abilityKey === ability)) {
      setAbility("");
    }
  }, [ability, activeAbilities]);

  const addSeasonAbility = () => {
    if (!newAbilityKey.trim()) return;
    const canon = resolveAbilityAliasPure(newAbilityKey);
    if (!canon) return;
    const existingCarried = carriedOver.find((c) => c.canonKey === canon);
    if (existingCarried) {
      setCarriedOver((prev) =>
        prev.map((c) =>
          c.canonKey === canon
            ? { ...c, excluded: false, level: newAbilityRank, hasSeasonOverride: true }
            : c,
        ),
      );
      toast.success(`${abilityDef(canon).label} restored to this season at Rank ${newAbilityRank}`);
      return;
    }
    const existingNew = newlyAcquired.find((n) => n.canonKey === canon);
    if (existingNew) {
      setNewlyAcquired((prev) =>
        prev.map((n) => (n.canonKey === canon ? { ...n, level: newAbilityRank } : n)),
      );
      return;
    }
    setNewlyAcquired((prev) => [
      {
        canonKey: canon,
        abilityKey: newAbilityKey,
        level: newAbilityRank,
        baseLevel: newAbilityRank,
        origin: "newly_acquired",
        sourceSeason: seasonNumber,
        hasSeasonOverride: true,
        excluded: false,
        note: "",
      },
      ...prev,
    ]);
  };

  const vals = ability ? (form.abilityStats?.[ability] ?? {}) : (form.stats ?? {});
  const setValue = (k: string, value: number) =>
    setForm((f) =>
      ability
        ? {
            ...f,
            abilityStats: {
              ...f.abilityStats,
              [ability]: { ...f.abilityStats?.[ability], [k]: value },
            },
          }
        : { ...f, stats: { ...f.stats, [k]: value } },
    );

  const weaponsList = form.weapons ?? [];
  const addWeapon = (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setForm((f) => {
      const current = f.weapons ?? [];
      if (current.some((w) => w.toLowerCase() === clean.toLowerCase())) return f;
      return { ...f, weapons: [...current, clean] };
    });
  };
  const removeWeapon = (name: string) => {
    setForm((f) => ({
      ...f,
      weapons: (f.weapons ?? []).filter((w) => w !== name),
    }));
  };

  const artifactOptions = useMemo(() => {
    const names = artifacts.map((a) => a.name).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [artifacts]);

  const roleOptions = useMemo(() => {
    const list: string[] = [...DOSSIER_ROLES];
    if (form.role && !list.includes(form.role)) list.push(form.role);
    return list;
  }, [form.role]);

  const save = async () => {
    setBusy(true);
    let wroteEntity = false;
    try {
      const { data: fresh, error } = await supabase
        .from("entities")
        .select("stats,locked_fields,status,role")
        .eq("id", entity.id)
        .single();
      if (error) throw error;

      const freshStats = { ...((fresh.stats as Record<string, unknown>) ?? {}) };
      const map = { ...readDossier(freshStats) };
      const activeKeys = activeAbilities.map((a) => a.abilityKey);
      const nextStatus = normalizeHeaderStatus(form.status);
      const nextWeapons = (form.weapons ?? []).map((w) => w.trim()).filter(Boolean);

      map[key] = {
        ...map[key],
        ...form,
        status: nextStatus,
        weapons: nextWeapons,
        abilityKeys: activeKeys,
        ...(seriesId ? { roster: true } : {}),
      };
      freshStats["dossier"] = map;

      if (key === "all") {
        if (form.gender) freshStats["gender"] = form.gender;
        freshStats["weapons"] = nextWeapons;
      }

      const entityPatch: Record<string, unknown> = {
        stats: freshStats as never,
        locked_fields: [...new Set([...(fresh.locked_fields ?? []), "stats"])],
      };
      if (key === "all") {
        entityPatch["status"] = nextStatus;
        if (form.role) entityPatch["role"] = form.role;
      }

      const { error: writeError } = await supabase
        .from("entities")
        .update(entityPatch as never)
        .eq("id", entity.id);
      if (writeError) throw writeError;
      wroteEntity = true;

      // Sync seasonal character_abilities rows
      if (seriesId && seasonNumber != null) {
        const { error: delErr } = await supabase
          .from("character_abilities")
          .delete()
          .in("entity_id", mergedIds)
          .eq("series_id", seriesId)
          .eq("season_number", seasonNumber);
        if (delErr) throw delErr;

        const rowsToInsert = [
          ...newlyAcquired.map((a) => ({
            entity_id: entity.id,
            series_id: seriesId,
            season_number: seasonNumber,
            ability_key: a.abilityKey,
            level: clampDbAbilityLevel(a.level),
            note: a.note || null,
          })),
          ...carriedOver
            .filter((a) => !a.excluded && (a.hasSeasonOverride || a.level !== a.baseLevel))
            .map((a) => ({
              entity_id: entity.id,
              series_id: seriesId,
              season_number: seasonNumber,
              ability_key: a.abilityKey,
              level: clampDbAbilityLevel(a.level),
              note: a.note || null,
            })),
        ];

        if (rowsToInsert.length) {
          const { error: insErr } = await supabase.from("character_abilities").insert(rowsToInsert);
          if (insErr) throw insErr;
        }

        // Sync series_characters membership so Roster / Series / Journey stay synchronized
        if (entity.kind === "character") {
          const { data: scRows, error: scErr } = await supabase
            .from("series_characters")
            .select("id")
            .eq("series_id", seriesId)
            .in("character_id", mergedIds)
            .limit(1);
          if (scErr) throw scErr;
          const scPatch = {
            status: nextStatus,
            ...(form.role ? { role_in_series: form.role, arc_role: form.role } : {}),
          };
          if (scRows?.[0]) {
            const { error: upSc } = await supabase
              .from("series_characters")
              .update(scPatch)
              .eq("id", scRows[0].id);
            if (upSc) throw upSc;
          } else {
            const { error: insSc } = await supabase.from("series_characters").insert({
              series_id: seriesId,
              character_id: entity.id,
              ...scPatch,
            });
            if (insSc) throw insSc;
          }
        }
      } else if (!seriesId) {
        // Global "All seasons" override: replace global (series_id IS NULL) rows cleanly
        const { error: delGlobalErr } = await supabase
          .from("character_abilities")
          .delete()
          .in("entity_id", mergedIds)
          .is("series_id", null);
        if (delGlobalErr) throw delGlobalErr;

        const globalRows = activeAbilities.map((a) => ({
          entity_id: entity.id,
          series_id: null,
          season_number: null,
          ability_key: a.abilityKey,
          level: clampDbAbilityLevel(a.level),
          note: a.note || null,
        }));
        if (globalRows.length) {
          const { error: insGlobalErr } = await supabase
            .from("character_abilities")
            .insert(globalRows);
          if (insGlobalErr) throw insGlobalErr;
        }
      }

      await invalidateArchive(qc);
      onSaved();
      toast.success("Dossier saved");
      onClose();
    } catch (err) {
      toast.error(
        wroteEntity
          ? `Dossier saved, but abilities/roster sync failed: ${err instanceof Error ? err.message : "Retry"}`
          : `Couldn't save the dossier: ${err instanceof Error ? err.message : "Retry"}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="pr-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left Header Control: Title + Season Abilities Manager tab */}
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-left text-base">
                {entity.name} · {seasonLabel}
              </DialogTitle>
              <div
                role="tablist"
                aria-label="Editor section"
                className="inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "dossier"}
                  onClick={() => setTab("dossier")}
                  className={`rounded px-2.5 py-1 font-medium transition ${
                    tab === "dossier"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dossier
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "abilities"}
                  onClick={() => setTab("abilities")}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-medium transition ${
                    tab === "abilities"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  Abilities ({activeAbilities.length})
                </button>
              </div>
            </div>

            {/* Right Header Control: Character Status Selector (to the left of close X) */}
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1.5 text-xs">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <select
                  aria-label="Character season status"
                  value={normalizeHeaderStatus(form.status)}
                  onChange={(ev) => setForm({ ...form, status: ev.target.value })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground"
                >
                  {DOSSIER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </DialogHeader>

        {/* Active Series & Season Picker */}
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">
            Series
            <select
              aria-label="Edit series"
              value={seriesId}
              onChange={(ev) =>
                onSeasonChange(ev.target.value ? { seriesId: ev.target.value, n: 1 } : null)
              }
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
            >
              <option value="">All seasons</option>
              {seriesCards.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Season
            <select
              aria-label="Edit season"
              disabled={!seriesId}
              value={seasonNumber ?? 1}
              onChange={(ev) => onSeasonChange({ seriesId, n: Number(ev.target.value) })}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
            >
              {(seriesCards.find((s) => s.id === seriesId)?.seasons ?? ["All seasons"]).map(
                (s, i) => (
                  <option key={i} value={i + 1}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {tab === "abilities" ? (
          <div className="space-y-5 text-sm">
            {/* Newly Acquired Abilities (This Season) */}
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Newly Acquired Abilities (This Season)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Assign abilities unlocked in {seasonLabel} with starting Rank 1–5.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="New season ability"
                  value={newAbilityKey}
                  onChange={(ev) => setNewAbilityKey(ev.target.value)}
                  className="h-9 min-w-[180px] flex-1 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {allAbilityDefs().map((def) => (
                    <option key={def.key} value={def.key}>
                      {def.label} ({def.tier})
                    </option>
                  ))}
                </select>
                <select
                  aria-label="New ability rank"
                  value={newAbilityRank}
                  onChange={(ev) => setNewAbilityRank(clampDbAbilityLevel(Number(ev.target.value)))}
                  className="h-9 w-36 rounded-md border border-input bg-background px-2 text-xs"
                >
                  {ABILITY_RANKS.map((n) => (
                    <option key={n} value={n}>
                      Rank {n} · {abilityRankMeta(n).roman} ({abilityRankMeta(n).shortTitle})
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" onClick={addSeasonAbility}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add
                </Button>
              </div>

              {newlyAcquired.length > 0 && (
                <div className="space-y-2 pt-1">
                  {newlyAcquired.map((item) => {
                    const def = abilityDef(item.abilityKey);
                    return (
                      <div
                        key={item.canonKey}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/80 px-2.5 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <NexusAbilitySymbol
                            name={def.key}
                            rank={item.level}
                            className="h-7 w-7 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{def.label}</p>
                            <p className="text-[10px] text-emerald-400">
                              Unlocked {seasonNumber ? `S${seasonNumber}` : "Here"} · Rank{" "}
                              {item.level} ({abilityRankMeta(item.level).shortTitle})
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <select
                            aria-label={`${def.label} rank`}
                            value={item.level}
                            onChange={(ev) => {
                              const nextLvl = clampDbAbilityLevel(Number(ev.target.value));
                              setNewlyAcquired((prev) =>
                                prev.map((x) =>
                                  x.canonKey === item.canonKey ? { ...x, level: nextLvl } : x,
                                ),
                              );
                            }}
                            className="h-8 rounded border border-input bg-background px-1.5 text-xs"
                          >
                            {ABILITY_RANKS.map((n) => (
                              <option key={n} value={n}>
                                Rank {n} ({abilityRankMeta(n).roman})
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={item.level >= 5}
                            onClick={() =>
                              setNewlyAcquired((prev) =>
                                prev.map((x) =>
                                  x.canonKey === item.canonKey
                                    ? { ...x, level: clampDbAbilityLevel(x.level + 1) }
                                    : x,
                                ),
                              )
                            }
                          >
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Upgrade
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${def.label}`}
                            onClick={() =>
                              setNewlyAcquired((prev) =>
                                prev.filter((x) => x.canonKey !== item.canonKey),
                              )
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Existing / Carried-Over Abilities */}
            <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Existing / Carried-Over Abilities
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Abilities carried from earlier seasons. Upgrade rank for this season, cancel an
                  upgrade, or remove from this season.
                </p>
              </div>
              {carriedOver.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No carried-over abilities from prior seasons yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {carriedOver.map((item) => {
                    const def = abilityDef(item.abilityKey);
                    const isUpgraded = !item.excluded && item.level !== item.baseLevel;
                    return (
                      <div
                        key={item.canonKey}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-2.5 py-2 ${
                          item.excluded
                            ? "border-destructive/40 bg-destructive/5 opacity-70"
                            : "border-border bg-background/80"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <NexusAbilitySymbol
                            name={def.key}
                            rank={item.level}
                            className="h-7 w-7 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{def.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.excluded
                                ? "Removed from this season"
                                : item.sourceSeason != null
                                  ? `Carried from S${item.sourceSeason} · Base Rank ${item.baseLevel}`
                                  : `Base ability · Rank ${item.baseLevel}`}
                              {isUpgraded && (
                                <span className="ml-1 text-accent">
                                  → Rank {item.level} this season
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {item.excluded ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setCarriedOver((prev) =>
                                prev.map((x) =>
                                  x.canonKey === item.canonKey ? { ...x, excluded: false } : x,
                                ),
                              )
                            }
                          >
                            <Undo2 className="mr-1 h-3 w-3" />
                            Restore
                          </Button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <select
                              aria-label={`${def.label} season rank`}
                              value={item.level}
                              onChange={(ev) => {
                                const nextLvl = clampDbAbilityLevel(Number(ev.target.value));
                                setCarriedOver((prev) =>
                                  prev.map((x) =>
                                    x.canonKey === item.canonKey
                                      ? { ...x, level: nextLvl, hasSeasonOverride: true }
                                      : x,
                                  ),
                                );
                              }}
                              className="h-8 rounded border border-input bg-background px-1.5 text-xs"
                            >
                              {ABILITY_RANKS.map((n) => (
                                <option key={n} value={n}>
                                  Rank {n} ({abilityRankMeta(n).roman})
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={item.level >= 5}
                              aria-label={`Upgrade ${def.label}`}
                              onClick={() =>
                                setCarriedOver((prev) =>
                                  prev.map((x) =>
                                    x.canonKey === item.canonKey
                                      ? {
                                          ...x,
                                          level: clampDbAbilityLevel(x.level + 1),
                                          hasSeasonOverride: true,
                                        }
                                      : x,
                                  ),
                                )
                              }
                            >
                              <TrendingUp className="mr-1 h-3 w-3" />
                              Upgrade
                            </Button>
                            {isUpgraded && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                aria-label={`Cancel ${def.label} upgrade`}
                                onClick={() =>
                                  setCarriedOver((prev) =>
                                    prev.map((x) =>
                                      x.canonKey === item.canonKey
                                        ? {
                                            ...x,
                                            level: x.baseLevel,
                                            hasSeasonOverride: false,
                                          }
                                        : x,
                                    ),
                                  )
                                }
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`Remove ${def.label} from season`}
                              onClick={() =>
                                setCarriedOver((prev) =>
                                  prev.map((x) =>
                                    x.canonKey === item.canonKey ? { ...x, excluded: true } : x,
                                  ),
                                )
                              }
                            >
                              <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTab("dossier")}
                className="flex-1"
              >
                Back to Dossier
              </Button>
              <Button onClick={save} disabled={busy} className="flex-1">
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <label className="block">
              Title / Codename
              <Input
                value={form.codename ?? ""}
                onChange={(ev) => setForm({ ...form, codename: ev.target.value })}
              />
            </label>
            <label className="block">
              Story
              <Textarea
                rows={4}
                value={form.story ?? ""}
                onChange={(ev) => setForm({ ...form, story: ev.target.value })}
              />
            </label>

            {/* Role Selector */}
            <label className="block">
              Role
              <select
                aria-label="Role"
                value={form.role ?? ""}
                onChange={(ev) => setForm({ ...form, role: ev.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
              >
                <option value="">Select role</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            {/* Gender Selector directly below Role */}
            <label className="block">
              Gender
              <select
                aria-label="Gender"
                value={form.gender ?? ""}
                onChange={(ev) => setForm({ ...form, gender: ev.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-foreground"
              >
                <option value="">Not specified</option>
                {DOSSIER_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            {/* Equipped Weapons Selector (per Series & Season) */}
            <div className="space-y-1.5">
              <span className="block text-sm">Weapons</span>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Select weapon"
                  value={weaponChoice}
                  onChange={(ev) => {
                    const picked = ev.target.value;
                    setWeaponChoice(picked);
                    if (picked) {
                      addWeapon(picked);
                      setWeaponChoice("");
                    }
                  }}
                  className="h-9 min-w-[180px] flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  <option value="">Choose weapon / artifact from archive…</option>
                  {artifactOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-1 gap-1.5">
                  <Input
                    aria-label="Custom weapon name"
                    placeholder="Or custom weapon…"
                    value={customWeapon}
                    onChange={(ev) => setCustomWeapon(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") {
                        ev.preventDefault();
                        addWeapon(customWeapon);
                        setCustomWeapon("");
                      }
                    }}
                    className="h-9 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      addWeapon(customWeapon);
                      setCustomWeapon("");
                    }}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>
              {weaponsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {weaponsList.map((w) => (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200"
                    >
                      {w}
                      <button
                        type="button"
                        aria-label={`Remove weapon ${w}`}
                        onClick={() => removeWeapon(w)}
                        className="ml-0.5 text-amber-300 hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              Impact
              <Textarea
                rows={3}
                value={form.impact ?? ""}
                onChange={(ev) => setForm({ ...form, impact: ev.target.value })}
              />
            </label>

            {/* Dynamic Stats Profile Dropdown: Character stats + active season abilities ONLY */}
            <label className="block">
              Stats profile
              <select
                aria-label="Edit stats profile"
                value={ability}
                onChange={(ev) => setAbility(ev.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2"
              >
                <option value="">Character stats</option>
                {activeAbilities.map((a) => (
                  <option key={a.canonKey} value={a.abilityKey}>
                    {abilityDef(a.abilityKey).label} (Rank {a.level} ·{" "}
                    {abilityRankMeta(a.level).roman})
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <p>Stats (0–100)</p>
              {NEXUS_STATS.map(({ key: k, label }) => (
                <label key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0">{label}</span>
                  <input
                    aria-label={label}
                    type="range"
                    min={0}
                    max={100}
                    value={vals[k] ?? 0}
                    onChange={(ev) => setValue(k, Number(ev.target.value))}
                    className="min-w-0 flex-1 accent-[var(--accent)]"
                  />
                  <span className="w-8 text-right">{vals[k] ?? 0}</span>
                </label>
              ))}
            </div>

            <Button onClick={save} disabled={busy} className="w-full">
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
