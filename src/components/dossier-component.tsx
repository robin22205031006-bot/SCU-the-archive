import { useEffect, useState, type ReactNode } from "react";
import { useActiveGenre } from "@/hooks/use-ui-mode";
import { getGenreThemeMeta, normalizeGenreThemeId, type GenreThemeId } from "@/lib/genre-themes";
import { MANGA_SCALE } from "@/lib/manga-scale";
import { GenreCardFrame, GenreDivider } from "@/components/genre-decorations";
import {
  AstralClockworkAstrolabe,
  type AstrolabeAbilityNode,
} from "@/components/astral-clockwork-astrolabe";
import { FantasyFullDossier } from "@/components/fantasy-full-dossier";

export type DossierTemplateId =
  | "scroll-parchment"
  | "data-terminal"
  | "astrolabe-relic"
  | "grimoire-altar"
  | "jade-cartouche"
  | "botanical-folio"
  | "kinetic-slash"
  | "tankobon-spread";

export const DOSSIER_TEMPLATE_BY_GENRE: Record<GenreThemeId, DossierTemplateId> = {
  fantasy: "scroll-parchment",
  "cyber-anime": "data-terminal",
  isekai: "astrolabe-relic",
  "dark-fantasy": "grimoire-altar",
  xianxia: "jade-cartouche",
  ghibli: "botanical-folio",
  shonen: "kinetic-slash",
  "manga-ink": "tankobon-spread",
};

export function resolveDossierTemplate(theme: GenreThemeId | null | undefined): DossierTemplateId {
  return DOSSIER_TEMPLATE_BY_GENRE[normalizeGenreThemeId(theme) ?? "manga-ink"];
}

function readHtmlGenreTheme(): GenreThemeId | null {
  if (typeof document === "undefined") return null;
  return normalizeGenreThemeId(document.documentElement.dataset["genreTheme"]);
}

/**
 * Tracks both the reactive `useActiveGenre()` store AND direct DOM mutations to
 * `html[data-genre-theme]` so toggling `data-genre-theme` via any mechanism
 * switches `DossierComponent`'s layout template immediately.
 */
export function useDocumentGenreTheme(themeOverride?: GenreThemeId | null): GenreThemeId {
  const activeFromStore = useActiveGenre();
  const [domTheme, setDomTheme] = useState<GenreThemeId | null>(() => readHtmlGenreTheme());

  useEffect(() => {
    const sync = () => {
      const next = readHtmlGenreTheme();
      setDomTheme((prev) => (prev === next ? prev : next));
    };
    sync();
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
      return;
    }
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-genre-theme"],
    });
    return () => observer.disconnect();
  }, [activeFromStore]);

  if (themeOverride) return themeOverride;
  return domTheme ?? activeFromStore ?? "manga-ink";
}

export interface DossierTabDescriptor {
  id: string;
  short: string;
  full: string;
  jp: string;
}

export interface DossierComponentProps {
  /** Optional explicit theme override; defaults to current html[data-genre-theme] / active genre */
  theme?: GenreThemeId | null;
  name: string;
  kicker?: string;
  status?: string;
  roleLabel?: string;
  seriesTitle?: string;
  tierPipCount?: number;
  tabs?: DossierTabDescriptor[];
  activeTab?: string;
  onSelectTab?: (tabId: string, ev: React.MouseEvent<HTMLElement>) => void;
  portraitSlot?: ReactNode;
  badgesSlot?: ReactNode;
  stampSlot?: ReactNode;
  profileSlot?: ReactNode;
  seasonSlot?: ReactNode;
  radarSlot?: ReactNode;
  combatMatrixSlot?: ReactNode;
  statBarsSlot?: ReactNode;
  abilityMedallionsLeftSlot?: ReactNode;
  abilityMedallionsRightSlot?: ReactNode;
  tabContentSlot?: ReactNode;
  standardTabBarSlot?: ReactNode;
  actionsSlot?: ReactNode;
  abilities?: AstrolabeAbilityNode[];
  className?: string;
}

const DEFAULT_TABS: DossierTabDescriptor[] = [
  { id: "powers", short: "ARSENAL", full: "01 // ARSENAL & ARTS", jp: "異能" },
  { id: "lore", short: "LORE", full: "02 // DIALOGUE & LORE", jp: "伝承" },
  { id: "bonds", short: "BONDS", full: "03 // BONDS & CAST", jp: "絆" },
  { id: "progress", short: "JOURNEY", full: "04 // ARC JOURNEY", jp: "年表" },
];

export function DossierComponent({
  theme,
  name,
  kicker,
  status = "Active",
  roleLabel = "CHARACTER",
  seriesTitle = "MASTER RECORD",
  tierPipCount = 3,
  tabs = DEFAULT_TABS,
  activeTab = "powers",
  onSelectTab,
  portraitSlot,
  badgesSlot,
  stampSlot,
  profileSlot,
  seasonSlot,
  radarSlot,
  combatMatrixSlot,
  statBarsSlot,
  abilityMedallionsLeftSlot,
  abilityMedallionsRightSlot,
  tabContentSlot,
  standardTabBarSlot,
  actionsSlot,
  abilities,
  className = "",
}: DossierComponentProps) {
  const activeGenre = useDocumentGenreTheme(theme);
  const template = resolveDossierTemplate(activeGenre);
  const meta = getGenreThemeMeta(activeGenre);
  const resolvedKicker = kicker ?? `${meta.jpLabel} · ${roleLabel}`;

  const fallbackPortrait = portraitSlot ?? (
    <div className="grid aspect-[4/5] place-items-center border border-border bg-background/75 p-4 text-center font-mono text-xs uppercase text-muted-foreground">
      {name}
    </div>
  );

  // 1. FANTASY — 'scroll-parchment' (Arcane Botanical Fantasy Full Dossier + Astrolabe Dial)
  if (template === "scroll-parchment") {
    return (
      <FantasyFullDossier
        activeGenre={activeGenre}
        name={name}
        resolvedKicker={resolvedKicker}
        metaJpLabel={meta.jpLabel}
        status={status}
        roleLabel={roleLabel}
        seriesTitle={seriesTitle}
        tierPipCount={tierPipCount}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        portraitSlot={portraitSlot}
        badgesSlot={badgesSlot}
        stampSlot={stampSlot}
        profileSlot={profileSlot}
        seasonSlot={seasonSlot}
        radarSlot={radarSlot}
        combatMatrixSlot={combatMatrixSlot}
        abilityMedallionsLeftSlot={abilityMedallionsLeftSlot}
        abilityMedallionsRightSlot={abilityMedallionsRightSlot}
        tabContentSlot={tabContentSlot}
        actionsSlot={actionsSlot}
        abilities={abilities}
        className={className}
      />
    );
  }

  // 2. CYBER ANIME — 'data-terminal' (Astral Telemetry Aero-Glass Console)
  if (template === "data-terminal") {
    return (
      <div
        data-dossier-template="data-terminal"
        data-genre-theme={activeGenre}
        className={`space-y-4 ${className}`}
      >
        <section
          className={`manga-panel ${MANGA_SCALE.banner} relative overflow-hidden rounded-2xl border border-primary/65`}
        >
          <GenreCardFrame theme={activeGenre} />
          <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-primary/30 pb-2 font-mono text-[10px] uppercase tracking-widest text-primary">
            <span>☾ SYS://DATA-TERMINAL // {seriesTitle}</span>
            <span>STATUS: {status}</span>
          </div>
          <div className="relative grid items-center gap-5 lg:grid-cols-[240px_1fr]">
            <div className="text-center">{fallbackPortrait}</div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-primary/50 bg-primary/15 px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                  ☾ ASTRAL TELEMETRY · {status}
                </span>
                {badgesSlot}
              </div>
              <h1 className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-1.5 uppercase`}>
                {name}
              </h1>
              {abilityMedallionsLeftSlot && <div className="mt-2">{abilityMedallionsLeftSlot}</div>}
              {profileSlot}
              {seasonSlot}
            </div>
          </div>
        </section>
        {standardTabBarSlot}
        {(tabContentSlot || combatMatrixSlot) && (
          <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
            <div className="flex flex-col gap-4">{tabContentSlot}</div>
            <div className="flex flex-col gap-4">{combatMatrixSlot}</div>
          </div>
        )}
      </div>
    );
  }

  // 3. ISEKAI — 'astrolabe-relic' (Sunburst Guild Ribbon + Astral Clockwork Astrolabe HUD)
  if (template === "astrolabe-relic") {
    return (
      <div
        data-dossier-template="astrolabe-relic"
        data-genre-theme={activeGenre}
        className={`space-y-4 ${className}`}
      >
        <div className="relative overflow-hidden rounded-md border border-[var(--genre-gold,#e09f3e)]/65 bg-card/85 px-4 py-2.5 text-center backdrop-blur-md">
          <GenreCardFrame theme={activeGenre} compact />
          <p className="relative font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--genre-gold,#e09f3e)]">
            ✦ ARCHIVE SYSTEM · {seriesTitle} ✦
          </p>
          <h1 className={`manga-display-title ${MANGA_SCALE.heroTitle} relative mt-0.5 uppercase`}>
            {name}
          </h1>
        </div>

        <section
          className={`manga-panel ${MANGA_SCALE.banner} relative rounded-md border-2 border-border`}
        >
          <GenreCardFrame theme={activeGenre} />
          <div className="relative space-y-4">
            <AstralClockworkAstrolabe
              name={name}
              subtitle={resolvedKicker}
              seriesTitle={seriesTitle}
              status={status}
              tabs={tabs}
              activeTab={activeTab}
              onSelectTab={onSelectTab}
              portraitSlot={portraitSlot}
              badgesSlot={badgesSlot}
              abilities={abilities}
              variant="isekai"
            />

            <div className="grid gap-4 lg:grid-cols-[275px_minmax(0,1fr)]">
              {abilityMedallionsLeftSlot && (
                <div className="rounded-md border border-border/50 bg-background/60 p-3">
                  <p className="mb-2 text-center font-mono text-[8px] font-bold uppercase tracking-[0.26em] text-muted-foreground">
                    ORBITAL SKILL SOCKETS
                  </p>
                  {abilityMedallionsLeftSlot}
                </div>
              )}

              <div className={`min-w-0 ${abilityMedallionsLeftSlot ? "" : "lg:col-span-2"}`}>
                {profileSlot}
                {statBarsSlot}
                {seasonSlot}
              </div>
            </div>
          </div>
        </section>

        {(tabContentSlot || radarSlot) && (
          <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
            <div className="flex flex-col gap-4">{tabContentSlot}</div>
            {radarSlot}
          </div>
        )}
      </div>
    );
  }

  // 4. DARK FANTASY — 'grimoire-altar' (Tapered Filigree Tab Pill + Double-Hairline Manuscript)
  if (template === "grimoire-altar") {
    return (
      <div
        data-dossier-template="grimoire-altar"
        data-genre-theme={activeGenre}
        className={`space-y-4 ${className}`}
      >
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Dossier tabs"
            className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-primary/50 bg-card/85 px-3 py-1 backdrop-blur-md shadow-[0_0_24px_color-mix(in_oklab,var(--primary)_22%,transparent)]"
          >
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={(ev) => onSelectTab?.(t.id, ev)}
                  className={`relative rounded-full px-3.5 py-1 font-display text-xs uppercase tracking-wider transition ${
                    active
                      ? "border border-primary/80 bg-primary/20 text-foreground shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_45%,transparent),inset_0_0_8px_rgba(255,255,255,0.2)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.short}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[310px_1fr]">
          <div className="flex flex-col gap-4">
            <div className="manga-panel relative border-2 border-border bg-card">
              <GenreCardFrame theme={activeGenre} compact />
              <div className="relative mb-2 flex items-center justify-between border-b border-border/40 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                <span>OMEN PORTRAIT // 魔導肖像</span>
                <span className="text-primary">{status}</span>
              </div>
              <div className="relative grid grid-cols-[auto_1fr] items-start gap-3">
                {abilityMedallionsLeftSlot && (
                  <div className="flex flex-col gap-2.5 pt-2">{abilityMedallionsLeftSlot}</div>
                )}
                <div>{fallbackPortrait}</div>
              </div>
            </div>
            {combatMatrixSlot}
          </div>

          <div className="flex flex-col gap-4">
            <section
              className={`manga-panel ${MANGA_SCALE.banner} relative border border-primary/60 bg-card/85`}
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[5px] border border-primary/30"
              />
              <GenreCardFrame theme={activeGenre} />
              <div className="relative text-center">
                {badgesSlot && (
                  <div className="mb-1 flex items-center justify-center gap-2">{badgesSlot}</div>
                )}
                <h1 className={`manga-display-title ${MANGA_SCALE.heroTitle} uppercase`}>{name}</h1>
                <GenreDivider theme={activeGenre} label={meta.jpLabel} />
              </div>
              {profileSlot}
              {seasonSlot}
              {actionsSlot && (
                <div className="relative mt-4 flex justify-center border-t border-primary/25 pt-3">
                  {actionsSlot}
                </div>
              )}
            </section>
            {tabContentSlot}
          </div>
        </div>
      </div>
    );
  }

  // 5. XIANXIA — 'jade-cartouche' (Symmetrical Jade Cloud-Scroll & Flanking Seal Medallions)
  if (template === "jade-cartouche") {
    return (
      <div
        data-dossier-template="jade-cartouche"
        data-genre-theme={activeGenre}
        className={`space-y-4 ${className}`}
      >
        <section
          className={`manga-panel ${MANGA_SCALE.banner} relative rounded-xl border-2 border-border`}
        >
          <GenreCardFrame theme={activeGenre} />
          <div className="relative text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--genre-gold,#d6b26a)]">
              仙侠玉簡 · {seriesTitle}
            </p>
            <h1 className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-1 uppercase`}>
              {name}
            </h1>
          </div>
          <div className="relative mt-3 grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
            <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
              {abilityMedallionsLeftSlot}
            </div>
            <div className="mx-auto w-full max-w-[230px] text-center">{fallbackPortrait}</div>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {abilityMedallionsRightSlot}
            </div>
          </div>
          <GenreDivider theme={activeGenre} label={meta.jpLabel} />
          {profileSlot}
          {seasonSlot}
        </section>
        {standardTabBarSlot}
        {(tabContentSlot || combatMatrixSlot) && (
          <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
            <div className="flex flex-col gap-4">{tabContentSlot}</div>
            <div className="flex flex-col gap-4">{combatMatrixSlot}</div>
          </div>
        )}
      </div>
    );
  }

  // 6. GHIBLI — 'botanical-folio' (Two-Page Watercolor Botanical Field Journal)
  if (template === "botanical-folio") {
    return (
      <div
        data-dossier-template="botanical-folio"
        data-genre-theme={activeGenre}
        className={`space-y-4 ${className}`}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="manga-panel relative flex flex-col gap-3 rounded-xl border border-border bg-card">
            <GenreCardFrame theme={activeGenre} />
            <div className="relative flex items-center justify-between border-b border-border/35 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
              <span>FOLIO I // FIELD SKETCH</span>
              <span className="text-primary">{roleLabel}</span>
            </div>
            <div className="relative">{fallbackPortrait}</div>
            <div className="relative">{combatMatrixSlot}</div>
          </div>
          <div className="flex flex-col gap-4">
            <section
              className={`manga-panel ${MANGA_SCALE.banner} relative rounded-xl border border-border bg-card`}
            >
              <GenreCardFrame theme={activeGenre} />
              <p className="relative font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                FOLIO II · {seriesTitle}
              </p>
              <h1
                className={`manga-display-title ${MANGA_SCALE.heroTitle} relative mt-1 uppercase`}
              >
                {name}
              </h1>
              <GenreDivider theme={activeGenre} label={meta.jpLabel} />
              {profileSlot}
              {seasonSlot}
            </section>
            {standardTabBarSlot}
            {tabContentSlot}
          </div>
        </div>
      </div>
    );
  }

  // 7. SHONEN — 'kinetic-slash' (Angled Kinetic Versus Splash with Speedline Banner)
  if (template === "kinetic-slash") {
    return (
      <div
        data-dossier-template="kinetic-slash"
        data-genre-theme={activeGenre}
        className={`space-y-4 ${className}`}
      >
        <section
          className={`manga-panel ${MANGA_SCALE.banner} relative border-2 border-border bg-card`}
        >
          <GenreCardFrame theme={activeGenre} />
          <div className="relative grid items-center gap-4 lg:grid-cols-[1fr_260px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="-skew-x-12 bg-primary px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-widest text-primary-foreground">
                  SHONEN VERSUS FILE
                </span>
                {badgesSlot}
              </div>
              <h1
                className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-1.5 uppercase italic`}
              >
                {name}
              </h1>
              {profileSlot}
              {seasonSlot}
            </div>
            <div>{fallbackPortrait}</div>
          </div>
        </section>
        {standardTabBarSlot}
        {(tabContentSlot || combatMatrixSlot) && (
          <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
            <div className="flex flex-col gap-4">{tabContentSlot}</div>
            <div className="flex flex-col gap-4">{combatMatrixSlot}</div>
          </div>
        )}
      </div>
    );
  }

  // 8. MANGA INK — 'tankobon-spread' (Classic Two-Column Tankobon Ink Plate Spread)
  return (
    <div
      data-dossier-template="tankobon-spread"
      data-genre-theme={activeGenre}
      className={`grid gap-4 lg:grid-cols-[305px_1fr] ${className}`}
    >
      <div className="flex flex-col gap-4">
        <div className="manga-panel manga-halftone-edge relative border-2 border-border bg-card">
          <GenreCardFrame theme={activeGenre} compact />
          <div className="relative mb-2 flex items-center justify-between border-b border-border/35 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
            <span>PROFILE PLATE // 人物画</span>
            <span className="text-primary">{roleLabel}</span>
          </div>
          {badgesSlot && (
            <div className="relative mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
              {badgesSlot}
            </div>
          )}
          <div className="relative">{fallbackPortrait}</div>
        </div>
        {combatMatrixSlot}
      </div>

      <div className="flex flex-col gap-4">
        <section
          className={`manga-panel ${MANGA_SCALE.banner} relative border-2 border-border bg-card`}
        >
          <GenreCardFrame theme={activeGenre} />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={`font-mono ${MANGA_SCALE.meta} font-bold uppercase tracking-[0.22em] text-primary`}
              >
                {meta.shortLabel.toUpperCase()} DOSSIER // {seriesTitle}
              </p>
              <h1 className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-1 uppercase`}>
                {name}
              </h1>
            </div>
            {stampSlot}
          </div>
          <GenreDivider theme={activeGenre} label={meta.jpLabel} />
          {profileSlot}
          {seasonSlot}
        </section>
        {standardTabBarSlot}
        {tabContentSlot}
      </div>
    </div>
  );
}
