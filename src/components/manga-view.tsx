import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
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
  type Entity,
} from "@/lib/entities";
import { characterSeriesQuery, seriesQuery } from "@/lib/series";
import { seasonJourneyRows } from "@/lib/journey";
import { getCombatStats, COMBAT_STATS } from "@/lib/combat-stats";
import { stripMerged } from "@/lib/sanitize-lore";
import { tierDef } from "@/lib/character-tier";
import { abilityDef } from "@/lib/abilities";
import {
  abilityRankMeta,
  buildAbilityRankMap,
  groupCharacterAbilityProgression,
  resolveAssignedAbilityRank,
  tierToIntrinsicRank,
} from "@/lib/ability-rank";
import { resolveCharacterSeasonAbilities, resolveDossierMeta } from "@/lib/nexus-season";
import { seriesSeasonNames } from "@/lib/series-seasons";
import { invalidateArchive } from "@/lib/archive-sync";
import { SeasonEditor } from "@/components/nexus-dossier";
import { resolveCustomAbilityEmblem } from "@/lib/ability-emblem-resolver";
import { readCharacter3dAvatars } from "@/lib/models-3d";
import { AbilityBadge } from "@/components/ability-badge";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { useOptionalAbilityContext } from "@/context/AbilityContext";
import { StatRadar } from "@/components/stat-radar";
import { JourneyLine } from "@/components/journey-line";
import { EntityLinks } from "@/components/entity-links";
import { CharacterRelationships, OrgHierarchy } from "@/components/lineage-panel";
import { SeriesAppearances } from "@/components/series-appearances";
import { SketchGallery } from "@/components/sketch-gallery";
import { GlbModelViewer } from "@/components/lazy-three";
import { CompareSentinel } from "@/components/compare-sentinel";
import { exportDossierPdf, type DossierGroup } from "@/lib/export-dossier";
import { isFavorite, toggleFavorite, onFavoritesChange } from "@/lib/favorites";
import { SpoilerToggle, useSpoilerMask } from "@/lib/spoiler-mask";
import { HeaderUiModeSelect } from "@/components/header-ui-mode-select";
import { LoreBreadcrumb } from "@/components/lore-breadcrumb";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { HankoStamp, MangaCategorySeal } from "@/components/manga-emblem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusTooltip } from "@/components/status-tooltip";
import { useActiveGenre, useIsManga } from "@/hooks/use-ui-mode";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useOptionalThemeContext } from "@/context/ThemeContext";
import { useAnimationsEnabled } from "@/lib/animations";
import { useSensoryFeedback } from "@/hooks/use-sensory-feedback";
import { SeasonStatComparison } from "@/components/season-stat-comparison";
import { type GenreThemeId } from "@/lib/genre-themes";
import {
  GenreAbilityEmblem,
  GenreCardFrame,
  GenreDiamondMediaFrame,
  GenreDossierProfilePanels,
  GenrePortraitFrame,
} from "@/components/genre-decorations";
import { DossierComponent } from "@/components/dossier-component";
import { IvyDecoration } from "@/components/manga/fantasy/IvyDecoration";
import { useMangaSfx } from "@/hooks/use-manga-sfx";
import { MANGA_SCALE } from "@/lib/manga-scale";
import { animateMangaStagger, animateSvgRuneDraw } from "@/lib/anime-animations";
import { triggerAnimeActionCut } from "@/hooks/use-anime-hitstop";
import { GroupGenreEmblem } from "@/components/group-emblem";
import { shouldAnimateGridCardIdle } from "@/lib/manga-perf";

export type DossierLayoutMode =
  | "royal-class-showcase"
  | "astrolabe-relic-hud"
  | "obsidian-filigree"
  | "jade-scroll-plaque"
  | "astral-lunar-dossier"
  | "watercolor-field-journal"
  | "shonen-versus-splash"
  | "comic-spread";

const DOSSIER_LAYOUT_BY_GENRE: Record<GenreThemeId, DossierLayoutMode> = {
  fantasy: "royal-class-showcase",
  isekai: "astrolabe-relic-hud",
  "dark-fantasy": "obsidian-filigree",
  xianxia: "jade-scroll-plaque",
  "cyber-anime": "astral-lunar-dossier",
  ghibli: "watercolor-field-journal",
  shonen: "shonen-versus-splash",
  "manga-ink": "comic-spread",
};

export function resolveDossierLayout(theme: GenreThemeId | null): DossierLayoutMode {
  return DOSSIER_LAYOUT_BY_GENRE[theme ?? "manga-ink"];
}

/* ───────────────────────────────────────────────────────────────────────────
   Shared Anthology Layout Primitives (Normalized Sizing + Multi-Genre Decorations)
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
  const activeGenre = useActiveGenre() ?? "manga-ink";
  return (
    <header
      className={`manga-panel manga-halftone-edge ${MANGA_SCALE.banner} relative mb-5 border-2 border-border bg-card`}
    >
      <GenreCardFrame theme={activeGenre} />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`border border-border bg-foreground px-2 py-0.5 font-mono ${MANGA_SCALE.meta} font-bold uppercase tracking-[0.2em] text-background`}
            >
              {chapter}
            </span>
            {jp && (
              <span className="font-serif text-xs font-bold tracking-[0.18em] text-muted-foreground">
                {jp}
              </span>
            )}
            <HankoStamp kanji={stamp} tilt={-4} />
          </div>
          <h1 className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-2 break-words uppercase`}>
            {title}
          </h1>
          {subtitle && (
            <p
              className={`mt-1.5 max-w-2xl border-l-2 border-primary pl-2.5 ${MANGA_SCALE.body} font-medium text-muted-foreground`}
            >
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
  const activeGenre = useActiveGenre() ?? "manga-ink";
  return (
    <section
      className={`manga-panel ${MANGA_SCALE.card} relative border-2 border-border bg-card ${
        halftone ? "manga-halftone" : ""
      } ${diagonal ? "manga-panel-slant" : ""} ${className}`}
    >
      <GenreCardFrame theme={activeGenre} compact />
      {(caption || badge) && (
        <div className="relative mb-2.5 flex items-center justify-between gap-2 border-b border-border/60 pb-1.5">
          {caption && (
            <span
              className={`font-display ${MANGA_SCALE.sectionTitle} uppercase tracking-wider text-foreground`}
            >
              {caption}
            </span>
          )}
          {badge && (
            <span
              className={`border border-border bg-foreground px-1.5 py-0.5 font-mono ${MANGA_SCALE.meta} font-bold uppercase tracking-widest text-background`}
            >
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="relative">{children}</div>
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
      className={`manga-speech-bubble relative border-2 border-border bg-card p-3.5 text-card-foreground ${
        tail === "left" ? "manga-tail-left" : tail === "right" ? "manga-tail-right" : ""
      } ${className}`}
    >
      {speaker && (
        <span className="mb-1.5 inline-block border border-border bg-foreground px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-background">
          {speaker}
        </span>
      )}
      <div className="text-xs leading-relaxed sm:text-sm">{children}</div>
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
      className={`manga-thought-box relative border-2 border-dashed border-border/80 bg-secondary/75 p-3.5 text-foreground ${className}`}
    >
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        <span>◎</span>
        <span>{label}</span>
      </div>
      <div className="text-xs italic leading-relaxed sm:text-sm">{children}</div>
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
      className={`border border-border p-2.5 ${
        inverted ? "bg-foreground text-background" : "bg-background text-foreground"
      } ${className}`}
      style={{ boxShadow: "2px 2px 0 currentColor" }}
    >
      {kicker && (
        <p className="mb-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] opacity-75">
          {kicker}
        </p>
      )}
      <div className="text-xs leading-snug">{children}</div>
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
  const { motionActive } = useAppMotion();
  const clamped = Math.max(0, Math.min(max, value));
  const filledCells = Math.round((clamped / max) * 10);
  const ratio = max > 0 ? clamped / max : 0;
  return (
    <div className="grid grid-cols-[minmax(80px,auto)_1fr_30px] items-center gap-2 text-xs">
      <span className="truncate font-mono text-[10px] font-bold uppercase tracking-wider">
        {label}
      </span>
      <div className="space-y-[2px]">
        <div className="grid grid-cols-10 gap-[2px] border border-border bg-background p-[2px]">
          {Array.from({ length: 10 }, (_, i) => {
            const active = i < filledCells;
            return (
              <motion.span
                key={i}
                initial={false}
                animate={{
                  scaleY: active ? 1 : 0.72,
                  opacity: active ? 1 : 0.45,
                }}
                transition={{
                  duration: motionActive ? 0.28 : 0,
                  delay: motionActive ? i * 0.018 : 0,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ transformOrigin: "bottom" }}
                className={`h-2 ${
                  active ? (crimson || i >= 8 ? "bg-primary" : "bg-foreground") : "bg-muted/40"
                }`}
              />
            );
          })}
        </div>
        <div className="h-[3px] w-full overflow-hidden bg-muted/40">
          <motion.div
            initial={false}
            animate={{ scaleX: ratio }}
            transition={{
              duration: motionActive ? 0.42 : 0,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ transformOrigin: "left" }}
            className={`h-full w-full ${crimson ? "bg-primary" : "bg-foreground"}`}
          />
        </div>
      </div>
      <span className="text-right font-mono text-[10px] font-bold tabular-nums transition-colors duration-200">
        {clamped}
      </span>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Entity Spread — Compact Proportional Cards with Multi-Genre Frames
   ─────────────────────────────────────────────────────────────────────────── */

const MangaEntityCard = memo(function MangaEntityCard({
  e,
  idx,
  activeGenre,
  isFantasy,
  allowIdleBreath,
  spoilerMasked,
  compared,
  isAdmin,
  onSelect,
  onToggleCompare,
  onEdit,
  onMerge,
  onDelete,
  playTap,
  playSwitch,
  triggerSfx,
  triggerInteractionSfx,
}: {
  e: Entity;
  idx: number;
  activeGenre: GenreThemeId;
  isFantasy: boolean;
  allowIdleBreath: boolean;
  spoilerMasked: boolean;
  compared: boolean;
  isAdmin?: boolean | undefined;
  onSelect: (e: Entity) => void;
  onToggleCompare?: ((id: string) => void) | undefined;
  onEdit?: ((e: Entity) => void) | undefined;
  onMerge?: ((e: Entity) => void) | undefined;
  onDelete?: ((e: Entity) => void) | undefined;
  playTap: () => void;
  playSwitch: () => void;
  triggerSfx: (word: "CRACK", ev?: React.MouseEvent<HTMLElement>) => void;
  triggerInteractionSfx: (kind: "click", ev?: React.MouseEvent<HTMLElement>) => void;
}) {
  const tier = tierDef(e.character_tier);
  const actionCutColor = isFantasy ? "#5ce1b8" : activeGenre === "shonen" ? "#e86a33" : "#38bdf8";

  return (
    <article
      {...(allowIdleBreath ? { style: { animationDelay: `${(idx % 6) * 0.48}s` } } : {})}
      onClick={(ev) => {
        playTap();
        triggerInteractionSfx("click", ev);
        triggerAnimeActionCut({
          color: actionCutColor,
          label: e.name,
        });
        onSelect(e);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          playTap();
          triggerAnimeActionCut({
            color: actionCutColor,
            label: e.name,
          });
          onSelect(e);
        }
      }}
      className={`manga-panel manga-panel-hover ${MANGA_SCALE.card} group relative flex cursor-pointer flex-col justify-between transition-transform active:scale-[0.99] ${
        isFantasy
          ? `rounded-lg border-2 border-[#c5a869] bg-[#15221b] text-[#f5ebe6] fantasy-mint-aura-hover hover:mint-emerald-aura focus-within:mint-emerald-aura ${
              allowIdleBreath ? "card-idle-breath" : ""
            }`
          : "border-2 border-border bg-card transition-shadow"
      }`}
    >
      <GenreCardFrame theme={activeGenre} compact />
      {isFantasy && <IvyDecoration variant="card" />}

      {/* Top Frame: Index + Status + Actions */}
      <div
        className={`relative mb-2 flex flex-wrap items-center justify-between gap-1.5 pb-1.5 ${
          isFantasy ? "border-b border-[#c5a869]/35" : "border-b border-border/35"
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`px-1.5 py-0.5 font-mono text-[9px] font-bold ${
              isFantasy
                ? "border border-[#c5a869] bg-[#2e5a52] text-[#f5ebe6]"
                : "bg-foreground text-background"
            }`}
          >
            #{String(idx + 1).padStart(2, "0")}
          </span>
          <span
            data-spoiler="char"
            className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
              isFantasy ? "border-[#c5a869]/55 text-[#e6dcc5]" : "border-border/60"
            }`}
          >
            {e.status}
          </span>
          {tier && (
            <span
              className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                isFantasy
                  ? "border-[#5ce1b8]/60 bg-[#5ce1b8]/15 text-[#5ce1b8]"
                  : "border-primary/60 bg-primary/10 text-primary"
              }`}
            >
              {tier.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
          {onToggleCompare && (
            <button
              type="button"
              onClick={(ev) => {
                playSwitch();
                triggerSfx("CRACK", ev);
                onToggleCompare(e.id);
              }}
              aria-pressed={compared}
              title="Select for VS comparison"
              className={`border border-border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                compared
                  ? "border-primary bg-primary text-primary-foreground"
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
              className="border border-border bg-background p-1 text-foreground hover:bg-foreground hover:text-background"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {isAdmin && onMerge && (
            <button
              type="button"
              aria-label={`Merge ${e.name}`}
              onClick={() => onMerge(e)}
              className="border border-border bg-background p-1 text-foreground hover:bg-foreground hover:text-background"
            >
              <GitMerge className="h-3 w-3" />
            </button>
          )}
          {isAdmin && onDelete && (
            <button
              type="button"
              aria-label={`Delete ${e.name}`}
              onClick={() => onDelete(e)}
              className="border border-border bg-background p-1 text-foreground hover:bg-primary hover:text-primary-foreground"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Inner Parchment Surface (for Fantasy) + Framed Portrait */}
      <div
        className={`relative flex items-start gap-3 ${
          isFantasy
            ? "parchment-dot-grid rounded border border-[#c5a869]/75 p-2.5 shadow-inner"
            : ""
        }`}
      >
        <GenrePortraitFrame
          theme={activeGenre}
          src={e.image_url}
          alt={e.name}
          fallback={e.name[0] ?? "?"}
          fallbackNode={
            e.kind !== "character" ? (
              <GroupGenreEmblem entity={e} variant="seal" size="md" />
            ) : undefined
          }
          size="card"
        />

        <div className="min-w-0 flex-1">
          {!spoilerMasked && e.kind !== "character" ? (
            <GroupGenreEmblem entity={e} variant="badge" size="xs" />
          ) : !spoilerMasked && e.category ? (
            <MangaCategorySeal label={e.category} size="xs" />
          ) : null}
          <h2
            className={`mt-1 truncate font-display ${MANGA_SCALE.cardTitle} uppercase ${
              isFantasy ? "text-[#15221b] group-hover:text-[#2e5a52]" : "group-hover:text-primary"
            }`}
          >
            {e.name}
          </h2>
          {e.alias && (
            <p
              className={`truncate font-mono ${MANGA_SCALE.meta} uppercase tracking-wider ${
                isFantasy ? "text-[#2e5a52]" : "text-muted-foreground"
              }`}
            >
              {e.alias}
            </p>
          )}
          {e.description && (
            <p
              className={`mt-1 line-clamp-2 ${MANGA_SCALE.body} ${
                isFantasy ? "text-[#1a241e]/90" : "text-muted-foreground"
              }`}
            >
              {stripMerged(e.description)}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Strip: Ability Badges / Alchemical Seals + Action */}
      <div
        className={`relative mt-2.5 flex flex-col gap-1.5 pt-2 ${
          isFantasy ? "border-t border-[#c5a869]/35" : "border-t border-border/25"
        }`}
      >
        {(e.abilities ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1" onClick={(ev) => ev.stopPropagation()}>
            {e.abilities.slice(0, 3).map((ab) => (
              <AbilityBadge key={ab} name={ab} />
            ))}
            {e.abilities.length > 3 && (
              <span
                className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                  isFantasy ? "border-[#c5a869]/60 bg-[#1a241e] text-[#c5a869]" : "border-border"
                }`}
              >
                +{e.abilities.length - 3}
              </span>
            )}
          </div>
        )}
        <div
          className={`flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-widest ${
            isFantasy ? "text-[#e6dcc5]" : "text-muted-foreground"
          }`}
        >
          <span className="truncate">
            {(e.stats as Record<string, string> | null)?.["affiliation"] || e.role || e.kind}
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 transition-transform group-hover:translate-x-0.5 ${
              isFantasy ? "fantasy-discover-btn rounded px-2 py-0.5 text-[9px]" : "text-foreground"
            }`}
          >
            {isFantasy ? "DISCOVER" : "DOSSIER"} <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </article>
  );
});

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
  breadcrumbSlot,
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
  breadcrumbSlot?: ReactNode | undefined;
  spotlightBanner?: ReactNode | undefined;
  spoilerScope: "characters" | "archive";
}) {
  const [groupFilter, setGroupFilter] = useState<string>("ALL");
  const activeGenre = useActiveGenre() ?? "manga-ink";
  const themeCtx = useOptionalThemeContext();
  const animEnabled = useAnimationsEnabled();
  const motionActive = animEnabled && !themeCtx?.isMinimal;
  const isManga = useIsManga();
  const isFantasy = themeCtx
    ? themeCtx.primarySystem === "manga" && themeCtx.mangaSubTheme === "fantasy"
    : isManga && activeGenre === "fantasy";
  const { triggerSfx, triggerInteractionSfx, bindInteractionSfx } = useMangaSfx();
  const { playTap, playSwitch } = useSensoryFeedback();
  const isChar = kind === "character";
  const spoilerMasked = useSpoilerMask(spoilerScope);
  const spreadRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!motionActive) return;
    const node = spreadRef.current;
    if (!node) return;
    let hStagger: ReturnType<typeof animateMangaStagger> | null = null;
    const rafId = requestAnimationFrame(() => {
      hStagger = animateMangaStagger(node);
    });
    return () => {
      cancelAnimationFrame(rafId);
      hStagger?.cancel();
    };
  }, [activeGenre, motionActive]);

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
    <main ref={spreadRef} className="mx-auto max-w-6xl px-3 pb-24 pt-5 sm:px-5">
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
                {...bindInteractionSfx("click")}
                onClick={onOpenCompare}
                className="manga-ink-btn border border-border bg-primary text-primary-foreground"
              >
                <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />
                VS ({compareIds.length})
              </Button>
            )}
            {isAdmin && onAdd && (
              <Button
                size="sm"
                onClick={onAdd}
                className="manga-ink-btn border border-border bg-foreground text-background"
              >
                <Plus className="mr-1 h-4 w-4" />
                NEW PLATE
              </Button>
            )}
          </div>
        }
      />

      {breadcrumbSlot}

      {spotlightBanner && <div className="mb-4">{spotlightBanner}</div>}

      {/* Filter / Search Strip */}
      <div className="manga-panel relative mb-5 grid gap-2.5 border-2 border-border bg-card p-3">
        <GenreCardFrame theme={activeGenre} compact />
        <div className="relative flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground" />
            <Input
              value={search}
              onChange={(ev) => onSearchChange(ev.target.value)}
              placeholder={`Search ${title.toLowerCase()} by name, power, alias…`}
              className="h-9 border border-border bg-background pl-8 font-mono text-xs uppercase placeholder:normal-case"
            />
          </div>
          {extraControls}
        </div>

        {/* Category / Faction Filter Stamps */}
        {!spoilerMasked && groups.length > 1 && (
          <div className="relative flex flex-wrap items-center gap-1.5 border-t border-border/25 pt-2">
            <span className="mr-1 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              INDEX:
            </span>
            <button
              type="button"
              onClick={() => setGroupFilter("ALL")}
              className={`border border-border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
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
                className={`border border-border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                  groupFilter === g
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-secondary"
                }`}
              >
                {g} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Balanced 3-Column Card Grid Matching Classic / Nexus Proportions */}
      {loading ? (
        <div className={`grid ${MANGA_SCALE.grid} sm:grid-cols-2 lg:grid-cols-3`}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-44 animate-pulse border-2 border-border bg-card/70" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <MangaThoughtBox label="EMPTY RECORD" className="py-10 text-center">
          No entries match the active index filter.
        </MangaThoughtBox>
      ) : (
        <div
          className={`manga-spread-grid grid grid-cols-1 ${MANGA_SCALE.grid} sm:grid-cols-2 lg:grid-cols-3`}
        >
          {visible.map((e, idx) => (
            <MangaEntityCard
              key={e.id}
              e={e}
              idx={idx}
              activeGenre={activeGenre}
              isFantasy={isFantasy}
              allowIdleBreath={
                isFantasy && motionActive && shouldAnimateGridCardIdle(visible.length)
              }
              spoilerMasked={spoilerMasked}
              compared={compareIds?.includes(e.id) ?? false}
              isAdmin={isAdmin}
              onSelect={onSelect}
              onToggleCompare={onToggleCompare}
              onEdit={onEdit}
              onMerge={onMerge}
              onDelete={onDelete}
              playTap={playTap}
              playSwitch={playSwitch}
              triggerSfx={triggerSfx}
              triggerInteractionSfx={triggerInteractionSfx}
            />
          ))}
        </div>
      )}
    </main>
  );
}

/* ───────────────────────────────────────────────────────────────────────────
   Full Character Dossier Spread (Normalized Scale + Theme Arrangements)
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
  const isManga = useIsManga();
  const activeGenre = useActiveGenre() ?? "manga-ink";
  const themeCtx = useOptionalThemeContext();
  const animEnabled = useAnimationsEnabled();
  const motionActive = animEnabled && !themeCtx?.isMinimal;
  const dossierLayout = resolveDossierLayout(activeGenre);
  const { triggerInteractionSfx } = useMangaSfx();
  const dossierRef = useRef<HTMLElement>(null);

  const [tab, setTab] = useState<"powers" | "lore" | "bonds" | "progress">("powers");
  const [seasonIdx, setSeasonIdx] = useState(-1);
  const [seasonNumber, setSeasonNumber] = useState<number | null>(initialSeason ?? null);
  const [view3d, setView3d] = useState(false);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [comparing, setComparing] = useState(false);
  const [comparingSeasons, setComparingSeasons] = useState(false);
  const [editingSeason, setEditingSeason] = useState(false);
  const [, setFavTick] = useState(0);
  const abilityCtx = useOptionalAbilityContext();
  useEffect(() => onFavoritesChange(() => setFavTick((t) => t + 1)), []);
  useEffect(() => {
    setAvatarIdx(0);
    setView3d(false);
    setComparingSeasons(false);
  }, [id]);
  useEffect(() => {
    if (!motionActive) return;
    const node = dossierRef.current;
    if (!node) return;
    const hStagger = animateMangaStagger(node);
    const hRune = animateSvgRuneDraw(node);
    return () => {
      hStagger.cancel();
      hRune.cancel();
    };
  }, [id, tab, activeGenre, motionActive]);

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
  const journeyRows = useMemo(
    () =>
      seasonJourneyRows(
        seasons,
        e?.stats,
        Object.fromEntries((allSeries ?? []).map((x) => [x.id, x.title])),
      ),
    [seasons, e?.stats, allSeries],
  );
  const seriesCards = useMemo(
    () =>
      (allSeries ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        cover: s.cover_image_url,
        seasons: seriesSeasonNames(s),
      })),
    [allSeries],
  );

  if (!e) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <MangaThoughtBox label="LOADING">Opening character dossier spread…</MangaThoughtBox>
      </main>
    );
  }

  const statsRec = (e.stats ?? {}) as Record<string, string | undefined>;
  const resolvedMeta = resolveDossierMeta(
    e,
    activeSeason?.series_id ?? null,
    seasonNumber,
    activeSeason ?? null,
  );
  const activeStatus = resolvedMeta.status || e.status || "Alive";
  const activeRole = resolvedMeta.role || e.role || e.category || e.kind;
  const activeCodename = resolvedMeta.codename || e.alias || "";
  const activeGender = resolvedMeta.gender || "";
  const activeWeapons = resolvedMeta.weapons ?? [];
  const affiliation =
    resolvedMeta.bloodline || statsRec["affiliation"] || statsRec["bloodline"] || "";

  const seasonKey = activeSeason?.series_id
    ? `${activeSeason.series_id}:${seasonNumber ?? "all"}`
    : null;
  const seasonLabel = activeSeason?.series_id
    ? `${activeSeason.series?.title ?? "Series"} · ${
        seasonNumber
          ? (seriesCards.find((x) => x.id === activeSeason.series_id)?.seasons[seasonNumber - 1] ??
            `Season ${seasonNumber}`)
          : "All seasons"
      }`
    : "Overview";

  const avatars3d = readCharacter3dAvatars(e);
  const activeAvatar = avatars3d[Math.min(avatarIdx, Math.max(0, avatars3d.length - 1))] ?? null;
  const baseCs = getCombatStats(e.stats);
  const sdStats = resolvedMeta.sd.stats;
  const cs = !sdStats
    ? baseCs
    : !baseCs
      ? {
          power: Number(sdStats["power"] ?? 0),
          agility: Number(sdStats["agility"] ?? 0),
          tactical_iq: Number(sdStats["tactical_iq"] ?? 0),
          clan_mastery: Number(sdStats["clan_mastery"] ?? 0),
          weapon_proficiency: Number(sdStats["weapon_proficiency"] ?? 0),
        }
      : {
          power: Number(sdStats["power"] ?? baseCs.power),
          agility: Number(sdStats["agility"] ?? baseCs.agility),
          tactical_iq: Number(sdStats["tactical_iq"] ?? baseCs.tactical_iq),
          clan_mastery: Number(sdStats["clan_mastery"] ?? baseCs.clan_mastery),
          weapon_proficiency: Number(sdStats["weapon_proficiency"] ?? baseCs.weapon_proficiency),
        };
  const tier = tierDef(e.character_tier);
  const cleanNotes = (notes ?? []).filter(
    (n) => !/^\[(conflict|merge|Auto-Merged|Auto-Stub|scope|resolved|Merged Info)/i.test(n.text),
  );
  const seasonAbilityResolution = resolveCharacterSeasonAbilities({
    entityAbilities: e.abilities,
    rows: charAbilities ?? [],
    seriesId: activeSeason?.series_id ?? null,
    seasonNumber,
    allowedAbilityKeys: resolvedMeta.sd.abilityKeys,
  });
  const abilityRankMap = buildAbilityRankMap(charAbilities ?? [], {
    seriesId: activeSeason?.series_id ?? null,
    seasonNumber,
    includePriorSeasons: true,
  });
  const mergedAbilities = seasonAbilityResolution.active.map((item) => item.abilityKey);

  const handleExportPdf = async (ev?: React.MouseEvent<HTMLElement>) => {
    try {
      const groups: DossierGroup[] = seasons.map((s) => ({
        name: s.series?.title ?? "Arc",
        kind: "Series",
        status: s.status ?? null,
      }));
      await exportDossierPdf(e, groups);
      triggerInteractionSfx("success", ev);
      toast.success("Printed comic dossier PDF");
    } catch {
      triggerInteractionSfx("error", ev);
      toast.error("Could not export dossier PDF");
    }
  };

  const DOSSIER_TABS = [
    { id: "powers" as const, short: "ARSENAL", full: "01 // ARSENAL & ARTS", jp: "異能" },
    { id: "lore" as const, short: "LORE", full: "02 // DIALOGUE & LORE", jp: "伝承" },
    { id: "bonds" as const, short: "BONDS", full: "03 // BONDS & CAST", jp: "絆" },
    { id: "progress" as const, short: "JOURNEY", full: "04 // ARC JOURNEY", jp: "年表" },
  ];

  const onSwitchTab = (
    nextTab: "powers" | "lore" | "bonds" | "progress",
    ev: React.MouseEvent<HTMLElement>,
  ) => {
    setTab(nextTab);
    triggerInteractionSfx("switch-mode", ev);
  };

  const onToggleCompare = (ev: React.MouseEvent<HTMLElement>) => {
    triggerInteractionSfx("click", ev);
    setComparing((v) => !v);
  };

  const onToggleFavorite = (ev: React.MouseEvent<HTMLElement>) => {
    toggleFavorite({ id: e.id, name: e.name, kind: e.kind });
    triggerInteractionSfx("success", ev);
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };

  const renderPortraitVisual = (compactControls = false) => (
    <>
      {view3d && activeAvatar ? (
        <GenreDiamondMediaFrame
          theme={activeGenre}
          variant="arch"
          leftEmblemLabel="3D"
          rightEmblemLabel="✦"
        >
          <div className="h-64 border border-border bg-background">
            <GlbModelViewer
              url={activeAvatar.url}
              alt={`${e.name} — ${activeAvatar.label}`}
              name={e.name}
              description={[e.description, e.alias, e.role, e.category].filter(Boolean).join(" ")}
              tags={[
                ...(e.abilities ?? []),
                ...(e.beast_traits ?? []),
                e.category,
                e.role,
                e.character_tier,
                activeAvatar.label,
              ]}
              fallbackImageUrl={e.image_url}
              accentColor="var(--primary)"
              compact
              onFallbackTo2d={() => setView3d(false)}
            />
          </div>
        </GenreDiamondMediaFrame>
      ) : (
        <GenreDiamondMediaFrame
          theme={activeGenre}
          variant="diamond"
          leftEmblemLabel="✦"
          rightEmblemLabel={tier?.label?.slice(0, 2) ?? "SCU"}
          className="py-2"
        >
          <div className="flex justify-center py-2">
            <GenrePortraitFrame
              theme={activeGenre}
              src={e.image_url}
              alt={e.name}
              fallback={e.name[0] ?? "?"}
              size="dossier"
            />
          </div>
        </GenreDiamondMediaFrame>
      )}

      <div
        className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/25 pt-2 ${
          compactControls ? "text-[9px]" : ""
        }`}
      >
        {avatars3d.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={(ev) => {
                triggerInteractionSfx("switch-mode", ev);
                triggerAnimeActionCut({
                  color: activeGenre === "shonen" ? "#e86a33" : "#38bdf8",
                  label: view3d ? "2D PLATE" : "3D SCULPT",
                });
                setView3d((v) => !v);
              }}
              className="border border-border bg-foreground px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-background hover:bg-primary"
            >
              {view3d ? "2D PLATE" : "3D SCULPT"}
            </button>
            {avatars3d.length > 1 &&
              avatars3d.map((av, idx) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={(ev) => {
                    triggerInteractionSfx("click", ev);
                    triggerAnimeActionCut({ color: "#e86a33", label: av.label });
                    setAvatarIdx(idx);
                    setView3d(true);
                  }}
                  className={`border border-border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                    view3d && avatarIdx === idx
                      ? "bg-primary text-primary-foreground"
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
          className="font-mono text-[10px] font-bold uppercase underline underline-offset-4 hover:text-primary"
        >
          WEB OF BONDS →
        </Link>
      </div>
    </>
  );

  const renderProfileArrangement = () => (
    <div className="space-y-2.5">
      <GenreDossierProfilePanels
        theme={activeGenre}
        affiliation={affiliation}
        designation={activeRole}
        alias={activeCodename}
        tierLabel={tier?.label ?? null}
        status={activeStatus}
        combatStats={cs}
        abilities={mergedAbilities}
        captionBox={(kicker, value, inverted) => (
          <MangaCaptionBox key={kicker} kicker={kicker} inverted={!!inverted}>
            {value}
          </MangaCaptionBox>
        )}
      />
      {(activeGender || activeWeapons.length > 0) && (
        <div
          data-spoiler="char"
          className="flex flex-wrap items-center gap-1.5 border border-border/40 bg-background/60 px-2.5 py-2 text-[10px]"
        >
          {activeGender && (
            <span className="border border-border bg-card px-2 py-0.5 font-mono font-bold uppercase">
              GENDER: {activeGender}
            </span>
          )}
          {activeWeapons.map((w) => (
            <span
              key={w}
              className="border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono font-bold uppercase text-amber-300"
            >
              ⚔ {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const activeSeriesMeta = activeSeason
    ? (allSeries ?? []).find((s) => s.id === activeSeason.series_id)
    : null;
  const activeSeriesSeasonCount = activeSeriesMeta
    ? Math.max(activeSeriesMeta.season_count ?? 0, activeSeriesMeta.season_names?.length ?? 0, 1)
    : 0;

  const renderSeasonSwitcher = () =>
    seasons.length > 0 ? (
      <div className="relative mt-3 border-t border-border/25 pt-2.5">
        <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          SEASON ARC PLATES:
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={(ev) => {
              triggerInteractionSfx("switch-mode", ev);
              setSeasonIdx(-1);
              setSeasonNumber(null);
              abilityCtx?.setSeasonScope(null, null);
            }}
            className={`border border-border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
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
              onClick={(ev) => {
                triggerInteractionSfx("switch-mode", ev);
                setSeasonIdx(i);
                setSeasonNumber(null);
                abilityCtx?.setSeasonScope(r.series_id ?? null, null);
              }}
              className={`border border-border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                seasonIdx === i
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-secondary"
              }`}
            >
              {r.series?.title}
            </button>
          ))}
        </div>
        {activeSeason && activeSeriesSeasonCount > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              SEASON:
            </span>
            <button
              type="button"
              onClick={(ev) => {
                triggerInteractionSfx("click", ev);
                setSeasonNumber(null);
                abilityCtx?.setSeasonScope(activeSeason.series_id ?? null, null);
              }}
              className={`border border-border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                seasonNumber === null
                  ? "bg-foreground text-background"
                  : "bg-background hover:bg-secondary"
              }`}
            >
              ALL
            </button>
            {Array.from({ length: activeSeriesSeasonCount }, (_, idx) => {
              const num = idx + 1;
              const sLabel = activeSeriesMeta?.season_names?.[idx] || `S${num}`;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={(ev) => {
                    triggerInteractionSfx("click", ev);
                    setSeasonNumber(num);
                    abilityCtx?.setSeasonScope(activeSeason.series_id ?? null, num);
                  }}
                  className={`border border-border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                    seasonNumber === num
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-secondary"
                  }`}
                >
                  {sLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    ) : null;

  const renderTabSpreadContent = () => (
    <>
      {activeSeason && (
        <MangaSpeechBubble speaker={activeSeason.series?.title ?? "ARC NOTE"}>
          <p className="font-mono text-xs font-bold uppercase text-primary">
            {activeSeason.arc_role || "Feature Arc"} · {activeSeason.status || "Active"}
          </p>
          <p className="mt-1">{activeSeason.role_in_series || "Recorded seasonal appearance."}</p>
        </MangaSpeechBubble>
      )}

      {tab === "powers" && (
        <MangaPanel
          caption="INNATE ABILITIES & COMBAT ARTS // 異能一覧"
          badge={`${mergedAbilities.length} REGISTERED`}
        >
          {mergedAbilities.length === 0 ? (
            <MangaThoughtBox>No combat arts recorded yet.</MangaThoughtBox>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {mergedAbilities.map((ab, idx) => {
                const def = abilityDef(ab);
                const isFantasyGenre = themeCtx
                  ? themeCtx.primarySystem === "manga" && themeCtx.mangaSubTheme === "fantasy"
                  : isManga && activeGenre === "fantasy";
                return (
                  <motion.div
                    key={ab}
                    {...(isFantasyGenre && motionActive
                      ? { whileHover: { y: -3, scale: 1.01 } }
                      : {})}
                    transition={{ type: "spring", stiffness: 280, damping: 22 }}
                    {...(isFantasyGenre && motionActive
                      ? { style: { animationDelay: `${(idx % 4) * 0.55}s` } }
                      : {})}
                    onClick={() => {
                      const assigned = resolveAssignedAbilityRank(ab, abilityRankMap);
                      const effRank = assigned ?? tierToIntrinsicRank(def.tier);
                      abilityCtx?.selectAbility(def.key, {
                        rank: effRank,
                        entityId: e.id,
                        seriesId: activeSeason?.series_id ?? null,
                        seasonNumber,
                        triggerImpact: true,
                      });
                      triggerAnimeActionCut({
                        color: def.color,
                        label: def.label,
                        intensity: def.tier === "Mythic" || effRank === 5 ? "heavy" : "normal",
                      });
                    }}
                    className={`relative cursor-pointer overflow-hidden p-3 ${
                      !themeCtx?.isMinimal ? "studio-bloom-border " : ""
                    }${
                      isFantasyGenre
                        ? `${motionActive ? "card-idle-breath" : ""} rounded-lg border-2 border-[#c5a869]/85 bg-[#15221b] text-[#f5ebe6] shadow-[0_8px_22px_rgba(0,0,0,0.45),0_0_14px_rgba(92,225,184,0.16)] fantasy-mint-aura-hover hover:mint-emerald-aura focus-within:mint-emerald-aura`
                        : "border border-border bg-background/80"
                    }`}
                  >
                    <GenreCardFrame theme={activeGenre} compact />
                    {isFantasyGenre && <IvyDecoration variant="compact" />}
                    <div className="relative flex items-center justify-between gap-2">
                      <AbilityBadge
                        name={ab}
                        level={resolveAssignedAbilityRank(ab, abilityRankMap)}
                      />
                      <span
                        className={`font-mono text-[9px] font-bold uppercase ${
                          isFantasyGenre ? "text-[#5ce1b8]" : "text-muted-foreground"
                        }`}
                      >
                        {def.tier}
                      </span>
                    </div>
                    {def.description && (
                      <p
                        className={`relative mt-2 rounded p-2 text-xs leading-relaxed ${
                          isFantasyGenre
                            ? "parchment-dot-grid border border-[#c5a869]/60 text-[#15221b]"
                            : "text-muted-foreground"
                        }`}
                      >
                        {def.description}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
          {(e.sketches ?? []).length > 0 && (
            <div className="mt-4 border-t border-border/25 pt-3">
              <SketchGallery images={e.sketches ?? []} name={e.name} />
            </div>
          )}
        </MangaPanel>
      )}

      {tab === "lore" && (
        <div className="grid gap-3">
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
          <div className="grid gap-3.5">
            {e.kind === "character" ? (
              <CharacterRelationships
                entity={e}
                isAdmin={isAdmin}
                onOpen={(target) =>
                  void nav({
                    to: target.kind === "character" ? "/character" : "/orgs",
                    search: target.kind === "character" ? { e: target.id } : { open: target.id },
                  })
                }
              />
            ) : (
              <OrgHierarchy
                entity={e}
                onOpen={(target) =>
                  void nav({
                    to: target.kind === "character" ? "/character" : "/orgs",
                    search: target.kind === "character" ? { e: target.id } : { open: target.id },
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
          {abilityProgression.length > 0 && (
            <div className="mt-3 border-t border-border/40 pt-3">
              <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                ABILITY MASTERY JOURNEY // 技量成長
              </p>
              <div className="grid gap-2">
                {abilityProgression.map((group) => {
                  const def = abilityDef(group.displayKey);
                  return (
                    <div
                      key={group.canonKey}
                      className="flex flex-wrap items-center justify-between gap-2 border border-border bg-background/80 px-2.5 py-2 text-xs"
                    >
                      <span className="font-mono font-bold uppercase">{def.label}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {group.steps.map((step, sIdx) => (
                          <span key={step.id} className="inline-flex items-center gap-1">
                            {sIdx > 0 && (
                              <span className="font-mono text-[10px] text-muted-foreground">→</span>
                            )}
                            <button
                              type="button"
                              onClick={(ev) => {
                                triggerInteractionSfx("click", ev);
                                const idx = seasons.findIndex((s) => s.series_id === step.seriesId);
                                setSeasonIdx(idx);
                                setSeasonNumber(step.seasonNumber);
                                abilityCtx?.selectAbility(def.key, {
                                  rank: step.level,
                                  entityId: e.id,
                                  seriesId: step.seriesId,
                                  seasonNumber: step.seasonNumber,
                                  triggerImpact: true,
                                });
                              }}
                              title={`${def.label} — ${step.seriesTitle} ${step.seasonLabel} (${abilityRankMeta(step.level).label})`}
                              className="inline-flex items-center gap-1 border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] hover:border-primary"
                            >
                              <span>
                                {step.seriesId
                                  ? `${step.seriesTitle.replace(/^The\s+/i, "")} ${step.seasonLabel}`
                                  : step.seasonLabel}
                              </span>
                              <AbilityRankPips rank={step.level} compact />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {seasons.length > 0 && (
            <div className="mt-3 grid gap-2">
              {seasons.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border border-border bg-background px-3 py-1.5 text-xs"
                >
                  <span className="font-mono font-bold uppercase">
                    {String(i + 1).padStart(2, "0")}. {r.series?.title}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-primary">
                    {r.status || r.arc_role || "Appears"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </MangaPanel>
      )}
    </>
  );

  const renderCombatMatrixPanel = () =>
    cs ? (
      <MangaPanel
        caption="COMBAT MATRIX // 能力値"
        badge={seasonNumber ? `S${seasonNumber} METRICS` : "METRICS"}
      >
        <div className="mb-3 flex justify-center">
          <StatRadar a={cs} nameA={`${e.name} · ${seasonLabel}`} size={198} />
        </div>
        <div className="grid gap-1.5 border-t border-border/25 pt-2.5">
          {COMBAT_STATS.map((s) => (
            <MangaPowerMeter key={s.key} label={s.label} value={cs[s.key]} />
          ))}
        </div>
      </MangaPanel>
    ) : null;

  const renderAbilityMedallionSockets = (maxCount = 4) =>
    mergedAbilities.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2">
        {mergedAbilities.slice(0, maxCount).map((ab) => {
          const def = abilityDef(ab);
          return (
            <GenreAbilityEmblem
              key={ab}
              theme={activeGenre}
              label={def.label}
              tier={def.tier}
              icon={def.icon}
              rank={resolveAssignedAbilityRank(ab, abilityRankMap)}
              customEmblem={resolveCustomAbilityEmblem(`${def.key} ${def.label}`, def.description)}
              title={`${def.label} — ${def.tier}`}
              variant="medallion"
            />
          );
        })}
      </div>
    ) : null;

  const renderActionButtons = (variantClass = "manga-ink-btn") => (
    <div className="flex flex-wrap items-center gap-1.5">
      {isAdmin && e.kind === "character" && (
        <button
          type="button"
          onClick={() => setEditingSeason(true)}
          className={`${variantClass} inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase hover:bg-foreground hover:text-background`}
        >
          <Pencil className="h-3.5 w-3.5" />
          EDIT SEASON
        </button>
      )}
      {e.kind === "character" && (
        <button
          type="button"
          onClick={(ev) => {
            triggerInteractionSfx("click", ev);
            setComparingSeasons((v) => !v);
          }}
          aria-expanded={comparingSeasons}
          className={`${variantClass} inline-flex items-center gap-1 whitespace-nowrap border border-border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
            comparingSeasons
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card hover:bg-foreground hover:text-background"
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          COMPARE SEASONS
        </button>
      )}
      {e.kind === "character" && (
        <button
          type="button"
          onClick={onToggleCompare}
          aria-pressed={comparing}
          className={`${variantClass} inline-flex items-center gap-1 border border-border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
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
        onClick={(ev) => void handleExportPdf(ev)}
        className={`${variantClass} inline-flex items-center gap-1 border border-border bg-card px-2.5 py-1 font-mono text-[10px] font-bold uppercase hover:bg-foreground hover:text-background`}
      >
        <FileDown className="h-3.5 w-3.5" />
        EXPORT
      </button>
      <button
        type="button"
        aria-label="Favorite character"
        onClick={onToggleFavorite}
        className={`${variantClass} inline-flex items-center gap-1 border border-border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
          isFavorite(e.id) ? "border-primary bg-primary text-primary-foreground" : "bg-card"
        }`}
      >
        <Heart className={`h-3.5 w-3.5 ${isFavorite(e.id) ? "fill-current" : ""}`} />
        {isFavorite(e.id) ? "SAVED" : "SAVE"}
      </button>
    </div>
  );

  const renderStandardTabBar = () => (
    <div role="tablist" aria-label="Dossier tabs" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {DOSSIER_TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          onClick={(ev) => onSwitchTab(t.id, ev)}
          className={`border-2 border-border px-2.5 py-1.5 font-display text-xs uppercase tracking-wider transition ${
            tab === t.id
              ? "bg-foreground text-background shadow-[2px_2px_0_var(--primary)]"
              : "bg-card text-foreground hover:bg-secondary"
          }`}
        >
          {t.full}
        </button>
      ))}
    </div>
  );

  return (
    <main
      ref={dossierRef}
      className="mx-auto max-w-6xl px-3 pb-24 pt-5 sm:px-5"
      data-dossier-layout={dossierLayout}
    >
      {/* Top Anthology Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-border pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/characters"
            className="manga-ink-btn inline-flex items-center gap-1.5 border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider hover:bg-foreground hover:text-background"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            ROSTER
          </Link>
          <select
            aria-label="Jump to character"
            value={id}
            onChange={(ev) => {
              const target = (allChars ?? []).find((c) => c.id === ev.target.value);
              triggerAnimeActionCut({
                color: activeGenre === "shonen" ? "#e86a33" : "#38bdf8",
                label: target?.name ?? "DOSSIER CUT",
              });
              void nav({ to: "/character", search: { e: ev.target.value } });
            }}
            className="h-8 border border-border bg-card px-2 font-mono text-xs font-bold uppercase"
          >
            {(allChars ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HeaderUiModeSelect variant="manga" />
          {renderActionButtons()}
        </div>
      </div>

      <LoreBreadcrumb
        segments={[
          { id: "chars", label: "Characters", to: "/characters" },
          ...(activeSeason?.series?.title
            ? [
                {
                  id: `series-${activeSeason.series_id}`,
                  label: activeSeason.series.title,
                  to: "/characters",
                  search: { series: activeSeason.series_id },
                },
              ]
            : []),
          ...(seasonNumber
            ? [
                {
                  id: `season-${seasonNumber}`,
                  label: seasonLabel,
                  onClick: () => setSeasonNumber(null),
                },
              ]
            : []),
          { id: `char-${e.id}`, label: e.name },
        ]}
      />

      <AnimatePresence initial={false}>
        {comparingSeasons && e.kind === "character" && (
          <motion.div
            key="manga-season-stat-comparison"
            initial={motionActive ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: "auto" }}
            exit={motionActive ? { opacity: 0, height: 0 } : undefined}
            transition={{ duration: motionActive ? 0.32 : 0, ease: [0.16, 1, 0.3, 1] }}
            className="mb-5 overflow-hidden"
          >
            <SeasonStatComparison
              entity={e}
              seriesList={allSeries}
              memberships={memberships}
              activeSeasonKey={seasonKey ?? "all"}
              abilities={mergedAbilities.map((ab) => ({
                name: ab,
                label: abilityDef(ab).label,
              }))}
              variant="manga"
              onClose={() => setComparingSeasons(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <DossierComponent
        theme={activeGenre}
        name={e.name}
        status={activeStatus}
        roleLabel={activeRole.toUpperCase()}
        seriesTitle={activeSeason?.series?.title ?? "MASTER RECORD"}
        tierPipCount={tier ? 4 : 2}
        tabs={DOSSIER_TABS}
        activeTab={tab}
        onSelectTab={(tabId, ev) =>
          onSwitchTab(tabId as "powers" | "lore" | "bonds" | "progress", ev)
        }
        portraitSlot={renderPortraitVisual(activeGenre !== "ghibli" && activeGenre !== "manga-ink")}
        badgesSlot={
          <>
            {e.category && <MangaCategorySeal label={e.category} size="xs" inverted />}
            {tier && (
              <HankoStamp
                kanji={tier.label}
                label={
                  activeGenre === "isekai"
                    ? "CLASS"
                    : activeGenre === "dark-fantasy"
                      ? "OMEN"
                      : activeGenre === "shonen"
                        ? "POWER"
                        : activeGenre === "fantasy"
                          ? "RANK"
                          : "TIER"
                }
                tilt={activeGenre === "shonen" ? -4 : -2}
              />
            )}
            <StatusTooltip label={activeStatus}>
              <span
                data-spoiler="char"
                className="rounded border border-border bg-background/85 px-2 py-0.5 font-mono text-[9px] font-bold uppercase"
              >
                {activeStatus}
              </span>
            </StatusTooltip>
            {activeGender && (
              <span
                data-spoiler="char"
                className="rounded border border-border bg-background/85 px-2 py-0.5 font-mono text-[9px] font-bold uppercase"
              >
                {activeGender}
              </span>
            )}
          </>
        }
        stampSlot={
          <HankoStamp
            kanji="覚醒"
            label={(affiliation || e.kind).slice(0, 6).toUpperCase()}
            tilt={3}
          />
        }
        profileSlot={renderProfileArrangement()}
        seasonSlot={renderSeasonSwitcher()}
        combatMatrixSlot={renderCombatMatrixPanel()}
        radarSlot={
          cs ? (
            activeGenre === "isekai" ? (
              <MangaPanel caption="AETHER RADAR // 魔力図" badge="RADAR">
                <div className="flex justify-center py-2">
                  <StatRadar a={cs} nameA={e.name} size={205} />
                </div>
              </MangaPanel>
            ) : (
              <div className="flex justify-center rounded border border-border/40 bg-background/55 p-2">
                <StatRadar a={cs} nameA={e.name} size={172} />
              </div>
            )
          ) : null
        }
        statBarsSlot={
          cs ? (
            <div className="mt-3 grid grid-cols-1 gap-1.5 rounded border border-border/40 bg-background/60 p-2.5 sm:grid-cols-2">
              {COMBAT_STATS.map((s) => (
                <MangaPowerMeter key={s.key} label={s.label} value={cs[s.key]} />
              ))}
            </div>
          ) : null
        }
        abilityMedallionsLeftSlot={
          activeGenre === "dark-fantasy" ? (
            <>
              {mergedAbilities.slice(0, 3).map((ab) => {
                const def = abilityDef(ab);
                return (
                  <GenreAbilityEmblem
                    key={ab}
                    theme={activeGenre}
                    label={def.label}
                    tier={def.tier}
                    icon={def.icon}
                    rank={resolveAssignedAbilityRank(ab, abilityRankMap)}
                    customEmblem={resolveCustomAbilityEmblem(
                      `${def.key} ${def.label}`,
                      def.description,
                    )}
                    title={`${def.label} — ${def.tier}`}
                    variant="medallion"
                    className="[&>div:last-child]:hidden"
                  />
                );
              })}
            </>
          ) : activeGenre === "xianxia" ? (
            <>
              {mergedAbilities.slice(0, 2).map((ab) => {
                const def = abilityDef(ab);
                return (
                  <GenreAbilityEmblem
                    key={ab}
                    theme={activeGenre}
                    label={def.label}
                    tier={def.tier}
                    icon={def.icon}
                    rank={resolveAssignedAbilityRank(ab, abilityRankMap)}
                    customEmblem={resolveCustomAbilityEmblem(
                      `${def.key} ${def.label}`,
                      def.description,
                    )}
                    variant="medallion"
                  />
                );
              })}
            </>
          ) : (
            renderAbilityMedallionSockets(activeGenre === "fantasy" ? 3 : 4)
          )
        }
        abilityMedallionsRightSlot={
          <>
            {mergedAbilities.slice(2, 4).map((ab) => {
              const def = abilityDef(ab);
              return (
                <GenreAbilityEmblem
                  key={ab}
                  theme={activeGenre}
                  label={def.label}
                  tier={def.tier}
                  icon={def.icon}
                  rank={resolveAssignedAbilityRank(ab, abilityRankMap)}
                  customEmblem={resolveCustomAbilityEmblem(
                    `${def.key} ${def.label}`,
                    def.description,
                  )}
                  variant="medallion"
                />
              );
            })}
          </>
        }
        standardTabBarSlot={renderStandardTabBar()}
        tabContentSlot={renderTabSpreadContent()}
        actionsSlot={renderActionButtons("manga-ink-btn rounded-sm")}
        abilities={mergedAbilities.map((ab) => {
          const def = abilityDef(ab);
          return {
            name: ab,
            label: def.label,
            tier: def.tier,
            rank: resolveAssignedAbilityRank(ab, abilityRankMap),
          };
        })}
      />

      {e.kind === "character" && (
        <CompareSentinel open={comparing} onOpenChange={setComparing} entity={e} />
      )}
      {isAdmin && editingSeason && (
        <SeasonEditor
          open={editingSeason}
          onClose={() => setEditingSeason(false)}
          entity={e}
          seasonKey={seasonKey}
          seasonLabel={seasonLabel}
          seriesCards={seriesCards}
          onSeasonChange={(next) => {
            if (!next) {
              setSeasonIdx(-1);
              setSeasonNumber(null);
              return;
            }
            const idx = seasons.findIndex((s) => s.series_id === next.seriesId);
            if (idx >= 0) setSeasonIdx(idx);
            setSeasonNumber(next.n);
          }}
          onSaved={() => {
            setEditingSeason(false);
            invalidateArchive(qc);
          }}
        />
      )}
    </main>
  );
}
