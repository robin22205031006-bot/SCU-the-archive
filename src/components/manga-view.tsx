import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  FileDown,
  GitCompareArrows,
  GitMerge,
  Heart,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-admin";
import {
  entitiesQuery,
  entityByIdQuery,
  getMergedSecondaryIds,
  mergeCharacterCards,
  notesQuery,
  resolveEntityId,
  type Entity,
} from "@/lib/entities";
import { characterSeriesQuery, seriesQuery } from "@/lib/series";
import { seasonJourneyRows } from "@/lib/journey";
import { getCombatStats, COMBAT_STATS } from "@/lib/combat-stats";
import { stripMerged } from "@/lib/sanitize-lore";
import { tierDef } from "@/lib/character-tier";
import { abilityDef } from "@/lib/abilities";
import { readCharacter3dAvatars } from "@/lib/models-3d";
import { AbilityBadge } from "@/components/ability-badge";
import { StatRadar } from "@/components/stat-radar";
import { JourneyLine } from "@/components/journey-line";
import { EntityLinks } from "@/components/entity-links";
import { CharacterRelationships, OrgHierarchy } from "@/components/lineage-panel";
import { SeriesAppearances } from "@/components/series-appearances";
import { SketchGallery } from "@/components/sketch-gallery";
import { GlbModelViewer } from "@/components/glb-model-viewer";
import { CompareSentinel } from "@/components/compare-sentinel";
import { exportDossierPdf, type DossierGroup } from "@/lib/export-dossier";
import { isFavorite, toggleFavorite, onFavoritesChange } from "@/lib/favorites";
import { SpoilerToggle, useSpoilerMask } from "@/lib/spoiler-mask";
import { sfx } from "@/lib/scu-audio";
import { toast } from "sonner";
import { HankoStamp, MangaCategorySeal } from "@/components/manga-emblem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusTooltip } from "@/components/status-tooltip";

/* ───────────────────────────────────────────────────────────────────────────
   Shared Manga Layout Primitives (Panels, Speech Bubbles, Thought Boxes, Power Meters)
   ─────────────────────────────────────────────────────────────────────────── */

export function MangaChapterBanner({
  chapter,
  jp,
  title,
  subtitle,
  stamp = "正典",
  actions,
}: {
  chapter: string;
  jp?: string;
  title: string;
  subtitle?: string;
  stamp?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="manga-panel manga-halftone-edge relative mb-6 border-[3px] border-foreground bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-2 border-foreground bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-background">
              {chapter}
            </span>
            {jp && (
              <span className="font-serif text-xs font-bold tracking-[0.2em] text-muted-foreground">
                {jp}
              </span>
            )}
            <HankoStamp kanji={stamp} tilt={-4} />
          </div>
          <h1 className="manga-display-title mt-3 break-words text-4xl uppercase leading-[0.95] sm:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-2xl border-l-[3px] border-[#b91c1c] pl-3 text-sm font-medium text-muted-foreground dark:border-[#dc2626]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function MangaPanel({
  children,
  caption,
  badge,
  halftone = false,
  diagonal = false,
  className = "",
}: {
  children: ReactNode;
  caption?: string;
  badge?: string;
  halftone?: boolean;
  diagonal?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`manga-panel relative border-[3px] border-foreground bg-card p-4 ${
        halftone ? "manga-halftone" : ""
      } ${diagonal ? "manga-panel-slant" : ""} ${className}`}
    >
      {(caption || badge) && (
        <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-foreground pb-2">
          {caption && (
            <span className="font-display text-lg uppercase tracking-wider text-foreground">
              {caption}
            </span>
          )}
          {badge && (
            <span className="border border-foreground bg-foreground px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-background">
              {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function MangaSpeechBubble({
  speaker,
  children,
  tail = "left",
  className = "",
}: {
  speaker?: string;
  children: ReactNode;
  tail?: "left" | "right" | "none";
  className?: string;
}) {
  return (
    <div
      className={`manga-speech-bubble relative border-[2.5px] border-foreground bg-card p-4 text-card-foreground ${
        tail === "left" ? "manga-tail-left" : tail === "right" ? "manga-tail-right" : ""
      } ${className}`}
    >
      {speaker && (
        <span className="mb-1.5 inline-block border border-foreground bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-background">
          {speaker}
        </span>
      )}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function MangaThoughtBox({
  label = "INTERNAL LOG",
  children,
  className = "",
}: {
  label?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`manga-thought-box relative border-2 border-dashed border-foreground bg-secondary/75 p-4 text-foreground ${className}`}
    >
      <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#b91c1c] dark:text-[#fca5a5]">
        <span>◎</span>
        <span>{label}</span>
      </div>
      <div className="text-sm italic leading-relaxed">{children}</div>
    </div>
  );
}

export function MangaCaptionBox({
  kicker,
  children,
  inverted = false,
  className = "",
}: {
  kicker?: string;
  children: ReactNode;
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`border-2 border-foreground p-3 ${
        inverted ? "bg-foreground text-background" : "bg-background text-foreground"
      } ${className}`}
      style={{ boxShadow: "3px 3px 0 currentColor" }}
    >
      {kicker && (
        <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.25em] opacity-75">
          {kicker}
        </p>
      )}
      <div className="text-xs leading-relaxed sm:text-sm">{children}</div>
    </div>
  );
}

/** Ink-filled segmented power-level grid meter (10 notched blocks). */
export function MangaPowerMeter({
  label,
  value,
  max = 100,
  crimson = false,
}: {
  label: string;
  value: number;
  max?: number;
  crimson?: boolean;
}) {
  const clamped = Math.max(0, Math.min(max, value));
  const filledCells = Math.round((clamped / max) * 10);
  return (
    <div className="grid grid-cols-[minmax(88px,auto)_1fr_34px] items-center gap-2 text-xs">
      <span className="truncate font-mono text-[11px] font-bold uppercase tracking-wider">
        {label}
      </span>
      <div className="grid grid-cols-10 gap-[3px] border border-foreground bg-background p-[2px]">
        {Array.from({ length: 10 }, (_, i) => {
          const active = i < filledCells;
          return (
            <span
              key={i}
              className={`h-2.5 transition-colors ${
                active
                  ? crimson || i >= 8
                    ? "bg-[#b91c1c] dark:bg-[#dc2626]"
                    : "bg-foreground"
                  : "bg-muted/40"
              }`}
            />
          );
        })}
      </div>
      <span className="text-right font-mono text-[11px] font-bold tabular-nums">{clamped}</span>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Manga Entity Spread — Replaces standard cards for Characters & Organizations
   ─────────────────────────────────────────────────────────────────────────── */

export function MangaEntitySpread({
  entities,
  kind,
  chapter,
  title,
  subtitle,
  loading,
  isAdmin,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  onMerge,
  compareIds,
  onToggleCompare,
  onOpenCompare,
  search,
  onSearchChange,
  extraControls,
  spotlightBanner,
  spoilerScope,
}: {
  entities: Entity[];
  kind: "character" | "organization" | "clan" | "bloodline" | "faction";
  chapter: string;
  title: string;
  subtitle: string;
  loading?: boolean | undefined;
  isAdmin?: boolean | undefined;
  onSelect: (e: Entity) => void;
  onAdd?: (() => void) | undefined;
  onEdit?: ((e: Entity) => void) | undefined;
  onDelete?: ((e: Entity) => void) | undefined;
  onMerge?: ((e: Entity) => void) | undefined;
  compareIds?: string[] | undefined;
  onToggleCompare?: ((id: string) => void) | undefined;
  onOpenCompare?: (() => void) | undefined;
  search: string;
  onSearchChange: (q: string) => void;
  extraControls?: ReactNode | undefined;
  spotlightBanner?: ReactNode | undefined;
  spoilerScope: "characters" | "archive";
}) {
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const isChar = kind === "character";
  const spoilerMasked = useSpoilerMask(spoilerScope);

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entities) {
      const cat = (e.category || e.kind || "General").trim();
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entities]);

  const visible = useMemo(() => {
    if (groupFilter === "ALL") return entities;
    return entities.filter(
      (e) => (e.category || e.kind || "General").trim().toLowerCase() === groupFilter.toLowerCase(),
    );
  }, [entities, groupFilter]);

  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-6">
      <MangaChapterBanner
        chapter={chapter}
        jp={isChar ? "登場人物名鑑" : "組織・勢力図"}
        title={title}
        subtitle={subtitle}
        stamp={isChar ? "人物" : "組織"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SpoilerToggle scope={spoilerScope} />
            {compareIds && compareIds.length >= 2 && onOpenCompare && (
              <Button
                size="sm"
                onClick={onOpenCompare}
                className="manga-ink-btn border-2 border-foreground bg-[#b91c1c] text-white"
              >
                <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />
                VS ({compareIds.length})
              </Button>
            )}
            {isAdmin && onAdd && (
              <Button
                size="sm"
                onClick={onAdd}
                className="manga-ink-btn border-2 border-foreground bg-foreground text-background"
              >
                <Plus className="mr-1 h-4 w-4" />
                NEW PLATE
              </Button>
            )}
          </div>
        }
      />

      {spotlightBanner && <div className="mb-6">{spotlightBanner}</div>}

      {/* Filter / Search Manga Strip */}
      <div className="manga-panel mb-6 grid gap-3 border-[3px] border-foreground bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
            <Input
              value={search}
              onChange={(ev) => onSearchChange(ev.target.value)}
              placeholder={`Search ${title.toLowerCase()} by name, power, alias…`}
              className="h-10 rounded-none border-2 border-foreground bg-background pl-9 font-mono text-xs uppercase placeholder:normal-case"
            />
          </div>
          {extraControls}
        </div>

        {/* Category / Faction Ink Filter Stamps */}
        {!spoilerMasked && groups.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-foreground/20 pt-2.5">
            <span className="mr-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              INDEX STAMP:
            </span>
            <button
              type="button"
              onClick={() => setGroupFilter("ALL")}
              className={`border-2 border-foreground px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                groupFilter === "ALL"
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground hover:bg-secondary"
              }`}
            >
              ALL ({entities.length})
            </button>
            {groups.slice(0, 8).map(([g, count]) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroupFilter((cur) => (cur === g ? "ALL" : g))}
                className={`border-2 border-foreground px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                  groupFilter === g
                    ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                    : "bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {g} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Asymmetrical Manga Panel Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse border-[3px] border-foreground bg-card/70" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <MangaThoughtBox label="EMPTY RECORD" className="py-12 text-center">
          No entries match the active comic index filter.
        </MangaThoughtBox>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {visible.map((e, idx) => {
            const tier = tierDef(e.character_tier);
            const isHeroPanel = idx % 7 === 0;
            const colSpan = isHeroPanel ? "md:col-span-8" : "md:col-span-4";
            const cs = isChar ? getCombatStats(e.stats) : null;
            const compared = compareIds?.includes(e.id) ?? false;

            return (
              <article
                key={e.id}
                onClick={() => {
                  sfx.pop();
                  onSelect(e);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onSelect(e);
                  }
                }}
                className={`manga-panel manga-panel-hover group relative flex cursor-pointer flex-col justify-between border-[3px] border-foreground bg-card p-3.5 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 ${colSpan}`}
              >
                {/* Top Frame: Plate Index + Badges + Actions */}
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b-2 border-foreground pb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-bold text-background">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <span
                      data-spoiler="char"
                      className="border border-foreground px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                    >
                      {e.status}
                    </span>
                    {tier && <HankoStamp kanji={tier.label.slice(0, 4).toUpperCase()} tilt={-2} />}
                  </div>

                  <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
                    {onToggleCompare && (
                      <button
                        type="button"
                        onClick={() => onToggleCompare(e.id)}
                        aria-pressed={compared}
                        title="Select for VS comparison"
                        className={`border border-foreground px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                          compared
                            ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                            : "bg-background text-foreground hover:bg-secondary"
                        }`}
                      >
                        {compared ? "VS✓" : "VS"}
                      </button>
                    )}
                    {isAdmin && onEdit && (
                      <button
                        type="button"
                        aria-label={`Edit ${e.name}`}
                        onClick={() => onEdit(e)}
                        className="border border-foreground bg-background p-1 hover:bg-foreground hover:text-background"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {isAdmin && onMerge && (
                      <button
                        type="button"
                        aria-label={`Merge ${e.name}`}
                        onClick={() => onMerge(e)}
                        className="border border-foreground bg-background p-1 hover:bg-foreground hover:text-background"
                      >
                        <GitMerge className="h-3 w-3" />
                      </button>
                    )}
                    {isAdmin && onDelete && (
                      <button
                        type="button"
                        aria-label={`Delete ${e.name}`}
                        onClick={() => onDelete(e)}
                        className="border border-foreground bg-background p-1 hover:bg-[#b91c1c] hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Middle Split: Inked Portrait Plate + Profile Block */}
                <div
                  className={`grid gap-3 ${
                    isHeroPanel ? "sm:grid-cols-[150px_1fr]" : "grid-cols-[84px_1fr]"
                  }`}
                >
                  <div className="manga-halftone relative overflow-hidden border-2 border-foreground bg-secondary">
                    {e.image_url ? (
                      <img
                        src={e.image_url}
                        alt={e.name}
                        loading="lazy"
                        decoding="async"
                        className="manga-portrait-ink h-full min-h-[96px] w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-24 w-full place-items-center font-display text-4xl">
                        {e.name[0]}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {!spoilerMasked && e.category && (
                        <MangaCategorySeal label={e.category} size="xs" />
                      )}
                    </div>
                    <h2 className="mt-1 truncate font-display text-2xl uppercase tracking-wide group-hover:text-[#b91c1c] dark:group-hover:text-[#f87171]">
                      {e.name}
                    </h2>
                    {e.alias && (
                      <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        AKA // {e.alias}
                      </p>
                    )}
                    {e.description && (
                      <p className="mt-1.5 line-clamp-3 border-l-2 border-foreground/40 pl-2 text-xs leading-relaxed text-muted-foreground">
                        {stripMerged(e.description)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Strip: Power-level meter summary (hero panels) + Ability Stamps */}
                <div className="mt-3 flex flex-col gap-2 border-t-2 border-foreground/25 pt-2.5">
                  {isHeroPanel && cs && (
                    <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-4">
                      {COMBAT_STATS.slice(0, 4).map((s) => (
                        <MangaPowerMeter key={s.key} label={s.label} value={cs[s.key]} />
                      ))}
                    </div>
                  )}
                  {(e.abilities ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1" onClick={(ev) => ev.stopPropagation()}>
                      {e.abilities.slice(0, isHeroPanel ? 5 : 3).map((ab) => (
                        <AbilityBadge key={ab} name={ab} />
                      ))}
                      {e.abilities.length > (isHeroPanel ? 5 : 3) && (
                        <span className="border border-foreground px-1.5 py-0.5 font-mono text-[9px] font-bold">
                          +{e.abilities.length - (isHeroPanel ? 5 : 3)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>
                      {(e.stats as Record<string, string> | null)?.["affiliation"] ||
                        e.role ||
                        e.kind}
                    </span>
                    <span className="inline-flex items-center gap-1 text-foreground group-hover:translate-x-0.5 transition-transform">
                      OPEN DOSSIER <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Full Manga Character Profile Spread (Replaces Classic/Nexus on /character in Manga Mode)
   ─────────────────────────────────────────────────────────────────────────── */

export function MangaCharacterSpread({
  id,
  initialSeries,
  initialSeason,
}: {
  id: string;
  initialSeries?: string | undefined;
  initialSeason?: number | undefined;
}) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const isAdmin = useIsAdmin();
  const [tab, setTab] = useState<"powers" | "lore" | "bonds" | "progress">("powers");
  const [seasonIdx, setSeasonIdx] = useState(-1);
  const [view3d, setView3d] = useState(false);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [, setFavTick] = useState(0);
  useEffect(() => onFavoritesChange(() => setFavTick((t) => t + 1)), []);
  useEffect(() => {
    setAvatarIdx(0);
    setView3d(false);
  }, [id]);

  const { data: e } = useQuery({ ...entityByIdQuery(id), enabled: !!id });
  const { data: notes } = useQuery({ ...notesQuery(id), enabled: !!id });
  const { data: memberships } = useQuery({
    ...characterSeriesQuery(id),
    enabled: !!id && e?.kind === "character",
  });
  const { data: allSeries } = useQuery({ ...seriesQuery, enabled: e?.kind === "character" });
  const { data: allChars } = useQuery({
    queryKey: ["all-characters-short"],
    enabled: !!id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("entities")
        .select("id, name, kind")
        .eq("kind", "character")
        .order("name");
      return mergeCharacterCards((data ?? []) as Entity[]);
    },
  });
  const { data: charAbilities } = useQuery({
    queryKey: ["character-abilities", id],
    enabled: !!id,
    queryFn: async () => {
      const allIds = [id, ...getMergedSecondaryIds(id)];
      const { data } = await supabase
        .from("character_abilities")
        .select("*")
        .in("entity_id", allIds);
      return data ?? [];
    },
  });

  const seasons = useMemo(() => (memberships ?? []).filter((r) => r.series), [memberships]);
  useEffect(() => {
    if (initialSeries && seasons.length > 0 && seasonIdx === -1) {
      const match = seasons.findIndex((s) => s.series_id === initialSeries);
      if (match >= 0) setSeasonIdx(match);
    } else if (initialSeason && seasons.length > 0 && seasonIdx === -1) {
      const idx = Math.min(seasons.length - 1, initialSeason - 1);
      if (idx >= 0) setSeasonIdx(idx);
    }
  }, [initialSeries, initialSeason, seasons, seasonIdx]);

  const activeSeason = seasonIdx >= 0 ? seasons[seasonIdx] : null;
  const journeyRows = useMemo(
    () =>
      seasonJourneyRows(
        seasons,
        e?.stats,
        Object.fromEntries((allSeries ?? []).map((x) => [x.id, x.title])),
      ),
    [seasons, e?.stats, allSeries],
  );

  if (!e) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center">
        <MangaThoughtBox label="LOADING">Opening serialized character spread…</MangaThoughtBox>
      </main>
    );
  }

  const statsRec = (e.stats ?? {}) as Record<string, string | undefined>;
  const affiliation = statsRec["affiliation"] || statsRec["bloodline"] || "";
  const avatars3d = readCharacter3dAvatars(e);
  const activeAvatar = avatars3d[Math.min(avatarIdx, Math.max(0, avatars3d.length - 1))] ?? null;
  const cs = getCombatStats(e.stats);
  const tier = tierDef(e.character_tier);
  const cleanNotes = (notes ?? []).filter(
    (n) => !/^\[(conflict|merge|Auto-Merged|Auto-Stub|scope|resolved|Merged Info)/i.test(n.text),
  );
  const mergedAbilities = [
    ...new Set([...(charAbilities ?? []).map((ca) => ca.ability_key), ...(e.abilities ?? [])]),
  ];

  const handleExportPdf = async () => {
    const groups: DossierGroup[] = seasons.map((s) => ({
      name: s.series?.title ?? "Arc",
      kind: "Series",
      status: s.status ?? null,
    }));
    await exportDossierPdf(e, groups);
    toast.success("Printed comic dossier PDF");
  };

  return (
    <main className="mx-auto max-w-7xl px-3 pb-24 pt-6 sm:px-6">
      {/* Top Anthology Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-foreground pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/characters"
            className="manga-ink-btn inline-flex items-center gap-1.5 border-2 border-foreground bg-card px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider hover:bg-foreground hover:text-background"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            ROSTER
          </Link>
          <select
            aria-label="Jump to character"
            value={id}
            onChange={(ev) => void nav({ to: "/character", search: { e: ev.target.value } })}
            className="h-9 border-2 border-foreground bg-card px-2 font-mono text-xs font-bold uppercase"
          >
            {(allChars ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {e.kind === "character" && (
            <button
              type="button"
              onClick={() => setComparing((v) => !v)}
              aria-pressed={comparing}
              className={`manga-ink-btn inline-flex items-center gap-1.5 border-2 border-foreground px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase ${
                comparing
                  ? "bg-foreground text-background"
                  : "bg-card hover:bg-foreground hover:text-background"
              }`}
            >
              <GitCompareArrows className="h-3.5 w-3.5" />
              VS MATCHUP
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleExportPdf()}
            className="manga-ink-btn inline-flex items-center gap-1.5 border-2 border-foreground bg-card px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase hover:bg-foreground hover:text-background"
          >
            <FileDown className="h-3.5 w-3.5" />
            EXPORT PLATE
          </button>
          <button
            type="button"
            aria-label="Favorite character"
            onClick={() => {
              toggleFavorite({ id: e.id, name: e.name, kind: e.kind });
              sfx.pop();
              qc.invalidateQueries({ queryKey: ["favorites"] });
            }}
            className={`manga-ink-btn inline-flex items-center gap-1 border-2 border-foreground px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase ${
              isFavorite(e.id) ? "bg-[#b91c1c] text-white border-[#b91c1c]" : "bg-card"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite(e.id) ? "fill-current" : ""}`} />
            {isFavorite(e.id) ? "BOOKMARKED" : "BOOKMARK"}
          </button>
        </div>
      </div>

      {/* Magazine-Style Asymmetric 2-Page Spread */}
      <div className="grid gap-5 lg:grid-cols-[400px_1fr]">
        {/* LEFT SPREAD PAGE — Character Portrait Panel + Crimson Hanko + Combat Wheel */}
        <div className="flex flex-col gap-5">
          <MangaPanel
            caption="PROFILE PLATE // 人物画"
            badge={e.kind.toUpperCase()}
            halftone
            className="overflow-hidden"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {e.category && <MangaCategorySeal label={e.category} size="sm" inverted />}
                {tier && <HankoStamp kanji={tier.label} label="TIER" tilt={-3} />}
              </div>
              <StatusTooltip label={e.status}>
                <span
                  data-spoiler="char"
                  className="border-2 border-foreground bg-background px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
                >
                  {e.status}
                </span>
              </StatusTooltip>
            </div>

            {view3d && activeAvatar ? (
              <div className="h-80 border-2 border-foreground bg-background">
                <GlbModelViewer
                  url={activeAvatar.url}
                  alt={`${e.name} — ${activeAvatar.label}`}
                  name={e.name}
                  description={[e.description, e.alias, e.role, e.category]
                    .filter(Boolean)
                    .join(" ")}
                  tags={[
                    ...(e.abilities ?? []),
                    ...(e.beast_traits ?? []),
                    e.category,
                    e.role,
                    e.character_tier,
                    activeAvatar.label,
                  ]}
                  fallbackImageUrl={e.image_url}
                  accentColor="#b91c1c"
                  compact
                  onFallbackTo2d={() => setView3d(false)}
                />
              </div>
            ) : (
              <div className="manga-halftone relative aspect-[3/4] w-full overflow-hidden border-[3px] border-foreground bg-secondary">
                {e.image_url ? (
                  <img
                    src={e.image_url}
                    alt={e.name}
                    className="manga-portrait-ink h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center font-display text-8xl">
                    {e.name[0]}
                  </div>
                )}
                {/* Floating Comic Issue Corner Stamp */}
                <div className="absolute bottom-2 left-2 border-2 border-foreground bg-card px-2 py-1 font-mono text-[10px] font-bold uppercase shadow-[3px_3px_0_currentColor]">
                  {e.alias || e.role || "SENTINEL FILE"}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {avatars3d.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setView3d((v) => !v)}
                    className="border-2 border-foreground bg-foreground px-3 py-1 font-mono text-[10px] font-bold uppercase text-background hover:bg-[#b91c1c]"
                  >
                    {view3d ? "VIEW 2D INK PLATE" : "VIEW 3D SCULPT"}
                  </button>
                  {avatars3d.length > 1 &&
                    avatars3d.map((av, idx) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          setAvatarIdx(idx);
                          setView3d(true);
                        }}
                        className={`border border-foreground px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                          view3d && avatarIdx === idx
                            ? "bg-[#b91c1c] text-white"
                            : "bg-background hover:bg-secondary"
                        }`}
                      >
                        {av.label}
                      </button>
                    ))}
                </div>
              )}
              <Link
                to="/graph"
                className="font-mono text-[10px] font-bold uppercase underline underline-offset-4 hover:text-[#b91c1c]"
              >
                WEB OF BONDS →
              </Link>
            </div>
          </MangaPanel>

          {/* Intervention Mandala + Inked Power Meters */}
          {cs && (
            <MangaPanel caption="INTERVENTION MATRIX // 能力値" badge="POWER GRID">
              <div className="mb-4 flex justify-center">
                <StatRadar a={cs} nameA={e.name} size={235} />
              </div>
              <div className="grid gap-2 border-t-2 border-foreground/25 pt-3">
                {COMBAT_STATS.map((s) => (
                  <MangaPowerMeter key={s.key} label={s.label} value={cs[s.key]} />
                ))}
              </div>
            </MangaPanel>
          )}
        </div>

        {/* RIGHT SPREAD PAGE — Inked Title Block, Speech/Thought Lore, Season Tabs */}
        <div className="flex flex-col gap-5">
          {/* Masthead Nameplate */}
          <section className="manga-panel border-[3px] border-foreground bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#b91c1c] dark:text-[#fca5a5]">
                  SCU SERIALIZED CHARACTER DOSSIER //{" "}
                  {activeSeason?.series?.title ?? "MASTER RECORD"}
                </p>
                <h1 className="manga-display-title mt-1 text-5xl uppercase leading-[0.9] sm:text-7xl">
                  {e.name}
                </h1>
              </div>
              <HankoStamp
                kanji="覚醒"
                label={(affiliation || e.kind).slice(0, 6).toUpperCase()}
                tilt={3}
              />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <MangaCaptionBox kicker="AFFILIATION / LINEAGE">
                {affiliation || "Unaffiliated"}
              </MangaCaptionBox>
              <MangaCaptionBox kicker="DESIGNATION">
                {e.role || e.category || e.kind}
              </MangaCaptionBox>
              <MangaCaptionBox kicker="KNOWN ALIAS" inverted>
                {e.alias || "None on file"}
              </MangaCaptionBox>
            </div>

            {/* Season Focus Switcher */}
            {seasons.length > 0 && (
              <div className="mt-4 border-t-2 border-foreground/25 pt-3">
                <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  SEASON ARC PLATES:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSeasonIdx(-1)}
                    className={`border-2 border-foreground px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
                      seasonIdx === -1
                        ? "bg-foreground text-background"
                        : "bg-background hover:bg-secondary"
                    }`}
                  >
                    ALL CHAPTERS
                  </button>
                  {seasons.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSeasonIdx(i)}
                      className={`border-2 border-foreground px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
                        seasonIdx === i
                          ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                          : "bg-background hover:bg-secondary"
                      }`}
                    >
                      {r.series?.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Chapter Sub-Tabs */}
          <div
            role="tablist"
            aria-label="Dossier tabs"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {(
              [
                ["powers", "01 // ARSENAL & ARTS"],
                ["lore", "02 // DIALOGUE & LORE"],
                ["bonds", "03 // BONDS & CAST"],
                ["progress", "04 // ARC JOURNEY"],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => {
                  sfx.pop();
                  setTab(k);
                }}
                className={`border-[2.5px] border-foreground px-3 py-2 font-display text-sm uppercase tracking-wider transition ${
                  tab === k
                    ? "bg-foreground text-background shadow-[3px_3px_0_#b91c1c]"
                    : "bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          {activeSeason && (
            <MangaSpeechBubble speaker={activeSeason.series?.title ?? "ARC NOTE"}>
              <p className="font-mono text-xs font-bold uppercase text-[#b91c1c] dark:text-[#fca5a5]">
                {activeSeason.arc_role || "Feature Arc"} · {activeSeason.status || "Active"}
              </p>
              <p className="mt-1">
                {activeSeason.role_in_series || "Recorded seasonal appearance."}
              </p>
            </MangaSpeechBubble>
          )}

          {/* Active Tab Spread Content */}
          {tab === "powers" && (
            <MangaPanel
              caption="INNATE ABILITIES & COMBAT ARTS // 異能一覧"
              badge={`${mergedAbilities.length} REGISTERED`}
            >
              {mergedAbilities.length === 0 ? (
                <MangaThoughtBox>No combat arts recorded yet.</MangaThoughtBox>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {mergedAbilities.map((ab) => {
                    const def = abilityDef(ab);
                    return (
                      <div
                        key={ab}
                        className="border-2 border-foreground bg-background p-3"
                        style={{ boxShadow: "3px 3px 0 currentColor" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <AbilityBadge name={ab} />
                          <span className="font-mono text-[9px] font-bold uppercase text-muted-foreground">
                            {def.tier}
                          </span>
                        </div>
                        {def.description && (
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {def.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {(e.sketches ?? []).length > 0 && (
                <div className="mt-5 border-t-2 border-foreground/20 pt-4">
                  <SketchGallery images={e.sketches ?? []} name={e.name} />
                </div>
              )}
            </MangaPanel>
          )}

          {tab === "lore" && (
            <div className="grid gap-4">
              {e.description && (
                <MangaSpeechBubble speaker={`${e.name} // CANON DOSSIER`}>
                  <p className="whitespace-pre-line">{stripMerged(e.description)}</p>
                </MangaSpeechBubble>
              )}
              {cleanNotes.map((n, i) =>
                i % 2 === 0 ? (
                  <MangaThoughtBox
                    key={n.id}
                    label={n.source ? `FIELD NOTE // ${n.source}` : "FIELD NOTE"}
                  >
                    {stripMerged(n.text)}
                  </MangaThoughtBox>
                ) : (
                  <MangaSpeechBubble key={n.id} speaker={n.source || "ARCHIVE VOICE"} tail="right">
                    {stripMerged(n.text)}
                  </MangaSpeechBubble>
                ),
              )}
              {!e.description && cleanNotes.length === 0 && (
                <MangaThoughtBox>No biographical records sealed yet.</MangaThoughtBox>
              )}
            </div>
          )}

          {tab === "bonds" && (
            <MangaPanel caption="RELATIONSHIPS & ORGANIZATIONS // 人物相関" badge="NETWORK">
              <div className="grid gap-4">
                {e.kind === "character" ? (
                  <CharacterRelationships
                    entity={e}
                    isAdmin={isAdmin}
                    onOpen={(target) =>
                      void nav({
                        to: target.kind === "character" ? "/character" : "/orgs",
                        search:
                          target.kind === "character" ? { e: target.id } : { open: target.id },
                      })
                    }
                  />
                ) : (
                  <OrgHierarchy
                    entity={e}
                    onOpen={(target) =>
                      void nav({
                        to: target.kind === "character" ? "/character" : "/orgs",
                        search:
                          target.kind === "character" ? { e: target.id } : { open: target.id },
                      })
                    }
                  />
                )}
                <EntityLinks
                  entity={e}
                  isAdmin={isAdmin}
                  onOpen={(target) =>
                    void nav({
                      to: target.kind === "character" ? "/character" : "/orgs",
                      search: target.kind === "character" ? { e: target.id } : { open: target.id },
                    })
                  }
                />
                <SeriesAppearances entity={e} />
              </div>
            </MangaPanel>
          )}

          {tab === "progress" && (
            <MangaPanel caption="STORYLINE TRAJECTORY // 連載年表" badge="ARC GRAPH">
              <JourneyLine
                title={`${e.name} — Canon Arc`}
                lines={[{ name: e.name, rows: journeyRows }]}
              />
              {seasons.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {seasons.map((r, i) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border-2 border-foreground bg-background px-3 py-2 text-xs"
                    >
                      <span className="font-mono font-bold uppercase">
                        {String(i + 1).padStart(2, "0")}. {r.series?.title}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-[#b91c1c] dark:text-[#fca5a5]">
                        {r.status || r.arc_role || "Appears"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </MangaPanel>
          )}
        </div>
      </div>
      {e.kind === "character" && (
        <CompareSentinel open={comparing} onOpenChange={setComparing} entity={e} />
      )}
    </main>
  );
}
