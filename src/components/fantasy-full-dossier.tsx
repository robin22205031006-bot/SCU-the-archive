import { useEffect, useState, type ReactNode } from "react";
import { BookOpen, Compass, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { GenreThemeId } from "@/lib/genre-themes";
import { MANGA_SCALE } from "@/lib/manga-scale";
import { abilityDef } from "@/lib/abilities";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useOptionalThemeContext } from "@/context/ThemeContext";
import { useIsManga } from "@/hooks/use-ui-mode";
import type { DossierTabDescriptor } from "@/components/dossier-component";
import { GenreCardFrame, GenreDivider } from "@/components/genre-decorations";
import {
  AstralClockworkAstrolabe,
  PortraitSvgFallback,
  type AstrolabeAbilityNode,
} from "@/components/astral-clockwork-astrolabe";
import {
  AlchemicalAbilityOrb,
  BotanicalCanopyOverlay,
  JadeScrollCartouche,
} from "@/components/botanical-foliage-canopy";
import { IvyDecoration } from "@/components/manga/fantasy/IvyDecoration";

export type FantasyDossierViewMode = "grimoire" | "astrolabe";

export interface FantasyFullDossierProps {
  activeGenre: GenreThemeId;
  name: string;
  resolvedKicker: string;
  metaJpLabel: string;
  status?: string | undefined;
  roleLabel?: string | undefined;
  seriesTitle?: string | undefined;
  tierPipCount?: number | undefined;
  tabs: DossierTabDescriptor[];
  activeTab: string;
  onSelectTab?: ((tabId: string, ev: React.MouseEvent<HTMLElement>) => void) | undefined;
  portraitSlot?: ReactNode | undefined;
  badgesSlot?: ReactNode | undefined;
  stampSlot?: ReactNode | undefined;
  profileSlot?: ReactNode | undefined;
  seasonSlot?: ReactNode | undefined;
  radarSlot?: ReactNode | undefined;
  combatMatrixSlot?: ReactNode | undefined;
  abilityMedallionsLeftSlot?: ReactNode | undefined;
  abilityMedallionsRightSlot?: ReactNode | undefined;
  tabContentSlot?: ReactNode | undefined;
  actionsSlot?: ReactNode | undefined;
  abilities?: AstrolabeAbilityNode[] | undefined;
  initialViewMode?: FantasyDossierViewMode | undefined;
  className?: string | undefined;
}

const SECTOR_DEGREES = ["306°", "342°", "018°", "054°"] as const;

export function FantasyFullDossier({
  activeGenre,
  name,
  resolvedKicker,
  metaJpLabel,
  status = "Active",
  roleLabel = "CHARACTER",
  seriesTitle = "MASTER RECORD",
  tierPipCount = 3,
  tabs,
  activeTab,
  onSelectTab,
  portraitSlot,
  badgesSlot,
  stampSlot,
  profileSlot,
  seasonSlot,
  radarSlot,
  combatMatrixSlot,
  abilityMedallionsLeftSlot,
  abilityMedallionsRightSlot,
  tabContentSlot,
  actionsSlot,
  abilities = [],
  initialViewMode = "grimoire",
  className = "",
}: FantasyFullDossierProps) {
  const [viewMode, setViewMode] = useState<FantasyDossierViewMode>(initialViewMode);
  const [selectedAbilityKey, setSelectedAbilityKey] = useState<string>(
    () => abilities[0]?.name ?? "",
  );
  const { motionActive: animOn, spec } = useAppMotion();
  const themeCtx = useOptionalThemeContext();
  const isMangaMode = useIsManga();
  const isMangaFantasy = themeCtx
    ? themeCtx.primarySystem === "manga" && themeCtx.mangaSubTheme === "fantasy"
    : isMangaMode && activeGenre === "fantasy";

  useEffect(() => {
    setSelectedAbilityKey((prev) => {
      if (prev && abilities.some((a) => a.name === prev)) return prev;
      return abilities[0]?.name ?? "";
    });
  }, [abilities]);

  const activeIdx = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeTab),
  );
  const currentAzimuth = SECTOR_DEGREES[activeIdx % SECTOR_DEGREES.length] ?? "306°";

  const activeAbilityNode =
    abilities.find((a) => a.name === selectedAbilityKey) ?? abilities[0] ?? null;
  const activeAbilityMeta = activeAbilityNode ? abilityDef(activeAbilityNode.name) : null;
  const ActiveAbilityIcon = activeAbilityMeta?.icon ?? Sparkles;

  const resolvedPortrait = portraitSlot ?? (
    <div className="aspect-[4/5] w-full overflow-hidden rounded border border-[#c5a869]/75 shadow-inner">
      <PortraitSvgFallback name={name} variant="fantasy" />
    </div>
  );

  const resolvedProfile = profileSlot ?? (
    <div
      data-dossier-arrangement="astrolabe-royal"
      className="grid grid-cols-1 gap-2 rounded border border-[#c5a869]/50 bg-background/65 p-3 sm:grid-cols-3"
    >
      <div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#2e5a52]">
          ✧ Order / Chronicle
        </span>
        <p className="mt-0.5 text-xs font-medium text-[#15221b]">{seriesTitle}</p>
      </div>
      <div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#2e5a52]">
          ✧ Calling
        </span>
        <p className="mt-0.5 text-xs font-medium text-[#15221b]">{roleLabel}</p>
      </div>
      <div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[#2e5a52]">
          ✧ Archive Status
        </span>
        <p className="mt-0.5 text-xs font-medium text-[#15221b]">{status}</p>
      </div>
    </div>
  );

  const renderAbilityShowcase = () =>
    abilities.length > 0 ? (
      <div
        data-dossier-abilities-showcase="true"
        className="relative overflow-hidden rounded-lg border border-[#c5a869]/65 bg-[#111915]/95 p-3 text-[#f5ebe6] shadow-[inset_0_0_20px_rgba(92,225,184,0.14)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#c5a869]/30 pb-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] text-[#5ce1b8]">
            ✦ ALCHEMICAL ABILITIES
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider tabular-nums text-[#c5a869]">
            {abilities.length} ATTUNED
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-center gap-3">
          {abilities.slice(0, 6).map((ab) => {
            const def = abilityDef(ab.name);
            return (
              <AlchemicalAbilityOrb
                key={ab.name}
                label={ab.label || def.label}
                tier={ab.tier || def.tier}
                icon={ab.name}
                selected={activeAbilityNode?.name === ab.name}
                onClick={() => setSelectedAbilityKey(ab.name)}
              />
            );
          })}
        </div>

        {activeAbilityNode && activeAbilityMeta && (
          <motion.div
            key={activeAbilityNode.name}
            initial={animOn ? { opacity: 0, y: 6 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className={`parchment-dot-grid relative mt-3 overflow-hidden rounded border border-[#c5a869]/85 p-2.5 text-[#15221b] ${
              isMangaFantasy ? "fantasy-mint-aura-hover hover:mint-emerald-aura focus-within:mint-emerald-aura" : ""
            } ${animOn && isMangaFantasy ? "card-idle-breath" : ""}`}
          >
            <IvyDecoration variant="compact" />
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#c5a869] bg-[#15221b] text-[#5ce1b8]">
                  <ActiveAbilityIcon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-wider text-[#15221b]">
                    {activeAbilityNode.label || activeAbilityMeta.label}
                  </p>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-widest text-[#2e5a52]">
                    {activeAbilityMeta.group} · {activeAbilityNode.tier || activeAbilityMeta.tier}
                  </p>
                </div>
              </div>
              <span className="rounded border border-[#2e5a52]/50 bg-[#2e5a52] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-[#f5ebe6]">
                ACTIVE SEAL
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#1a241e]/90">
              {activeAbilityMeta.description ||
                `${activeAbilityNode.label || activeAbilityMeta.label} registered within ${name}'s celestial grimoire matrix.`}
            </p>
          </motion.div>
        )}
      </div>
    ) : null;

  return (
    <div
      data-dossier-template="scroll-parchment"
      data-genre-theme={activeGenre}
      data-fantasy-dossier-view={viewMode}
      className={`space-y-4 ${className}`}
    >
      {/* Jade Cloud-Scroll Header + Layout Switcher */}
      <JadeScrollCartouche
        kicker="ARCANE BOTANICAL GRIMOIRE"
        title={`${seriesTitle} · AZIMUTH ${currentAzimuth}`}
        badge={status}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Fantasy dossier presentation layout"
              className="inline-flex rounded-md border border-[#c5a869]/75 bg-[#111915] p-0.5"
            >
              <button
                type="button"
                data-fantasy-layout-toggle="grimoire"
                aria-pressed={viewMode === "grimoire"}
                onClick={() => setViewMode("grimoire")}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ce1b8] ${
                  viewMode === "grimoire"
                    ? "bg-[#2e5a52] text-[#f5ebe6] shadow-[inset_0_0_10px_rgba(92,225,184,0.35)]"
                    : "text-[#e6dcc5]/75 hover:text-[#f5ebe6]"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5 text-[#5ce1b8]" aria-hidden="true" />
                <span>Grimoire Folio</span>
              </button>
              <button
                type="button"
                data-fantasy-layout-toggle="astrolabe"
                aria-pressed={viewMode === "astrolabe"}
                onClick={() => setViewMode("astrolabe")}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ce1b8] ${
                  viewMode === "astrolabe"
                    ? "bg-[#2e5a52] text-[#f5ebe6] shadow-[inset_0_0_10px_rgba(92,225,184,0.35)]"
                    : "text-[#e6dcc5]/75 hover:text-[#f5ebe6]"
                }`}
              >
                <Compass className="h-3.5 w-3.5 text-[#c5a869]" aria-hidden="true" />
                <span>Astral Astrolabe</span>
              </button>
            </div>
            {stampSlot}
          </div>
        }
      />

      {/* Main Fantasy Dossier Stage */}
      <AnimatePresence mode="wait" initial={false}>
        {viewMode === "astrolabe" ? (
          <motion.section
            key="astrolabe"
            initial={animOn ? { opacity: 0, scale: 0.98 } : false}
            animate={{ opacity: 1, scale: 1 }}
            {...(animOn ? { exit: { opacity: 0, scale: 0.98 } } : {})}
            transition={animOn ? spec.transition : { duration: 0 }}
            className={`manga-panel ${MANGA_SCALE.banner} relative overflow-hidden rounded-lg border-2 border-[#c5a869] bg-[#15221b] text-[#f5ebe6] shadow-[0_18px_42px_rgba(0,0,0,0.55)]`}
          >
            <GenreCardFrame theme={activeGenre} />
            <BotanicalCanopyOverlay variant="dossier" />
            <IvyDecoration variant="card" />
          <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#c5a869]/35 pb-3 pt-2">
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] text-[#5ce1b8]">
                {resolvedKicker}
              </p>
              <h1
                className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-0.5 uppercase text-[#f5ebe6]`}
              >
                {name}
              </h1>
            </div>
            {actionsSlot && <div className="flex flex-wrap items-center gap-2">{actionsSlot}</div>}
          </div>

          <AstralClockworkAstrolabe
            name={name}
            subtitle={resolvedKicker}
            seriesTitle={seriesTitle}
            status={status}
            tabs={tabs}
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            portraitSlot={resolvedPortrait}
            badgesSlot={badgesSlot}
            abilities={abilities}
            variant="fantasy"
          />

          {(abilities.length > 0 ||
            abilityMedallionsLeftSlot ||
            abilityMedallionsRightSlot ||
            radarSlot ||
            seasonSlot) && (
            <div className="relative mt-4 grid gap-4 lg:grid-cols-[1fr_295px]">
              <div className="flex flex-col gap-3">
                {renderAbilityShowcase()}
                {(abilityMedallionsLeftSlot || abilityMedallionsRightSlot || seasonSlot) && (
                  <div className="flex flex-col gap-3 rounded border border-[#c5a869]/45 bg-[#111915]/75 p-3">
                    {(abilityMedallionsLeftSlot || abilityMedallionsRightSlot) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {abilityMedallionsLeftSlot}
                        {abilityMedallionsRightSlot}
                      </div>
                    )}
                    {seasonSlot}
                  </div>
                )}
              </div>
              {radarSlot && (
                <div className="parchment-dot-grid h-fit rounded border border-[#c5a869]/80 p-2.5 text-[#15221b]">
                  {radarSlot}
                </div>
              )}
            </div>
          )}

          <GenreDivider theme={activeGenre} label={metaJpLabel} />
          <div className="parchment-dot-grid relative rounded border border-[#c5a869]/70 p-2 text-[#15221b]">
            {resolvedProfile}
          </div>
          </motion.section>
        ) : (
          <motion.section
            key="grimoire"
            initial={animOn ? { opacity: 0, scale: 0.98 } : false}
            animate={{ opacity: 1, scale: 1 }}
            {...(animOn ? { exit: { opacity: 0, scale: 0.98 } } : {})}
            transition={animOn ? spec.transition : { duration: 0 }}
            className={`manga-panel ${MANGA_SCALE.banner} relative overflow-hidden rounded-lg border-2 border-[#c5a869] bg-[#15221b] text-[#f5ebe6] shadow-[0_18px_42px_rgba(0,0,0,0.55)]`}
          >
            <GenreCardFrame theme={activeGenre} />
            <BotanicalCanopyOverlay variant="dossier" />
            <IvyDecoration variant="card" />
          <div className="relative grid items-center gap-5 pt-2 lg:grid-cols-[220px_minmax(0,1fr)_305px]">
            {/* Left Folio Chapter Tabs + Mini Astrolabe Calibrator */}
            <div
              role="tablist"
              aria-label="Dossier tabs"
              className="flex flex-col gap-2 border-[#c5a869]/35 lg:border-r lg:pr-4"
            >
              {tabs.map((t, idx) => {
                const active = activeTab === t.id;
                const deg = SECTOR_DEGREES[idx % SECTOR_DEGREES.length] ?? "306°";
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={(ev) => onSelectTab?.(t.id, ev)}
                    className={`group flex min-h-[44px] items-center justify-between gap-2 rounded border px-2.5 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ce1b8] ${
                      active
                        ? "fantasy-discover-btn border-[#5ce1b8] text-[#f5ebe6]"
                        : "border-[#c5a869]/35 bg-[#111915]/80 text-[#e6dcc5]/85 hover:border-[#c5a869] hover:text-[#f5ebe6]"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`grid h-7 w-7 shrink-0 rotate-45 place-items-center border text-[10px] font-bold transition ${
                          active
                            ? "border-[#5ce1b8] bg-[#15221b] text-[#5ce1b8]"
                            : "border-[#c5a869]/60 bg-[#1a241e] text-[#c5a869]"
                        }`}
                      >
                        <span className="-rotate-45 font-mono tabular-nums">0{idx + 1}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-xs font-bold uppercase tracking-wider">
                          {t.short}
                        </span>
                        <span className="block font-mono text-[9px] opacity-80">{t.jp}</span>
                      </span>
                    </span>
                    <span className="font-mono text-[9px] tabular-nums text-[#c5a869]/80">
                      {deg}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setViewMode("astrolabe")}
                className="mt-1 inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded border border-[#c5a869]/55 bg-[#111915]/90 px-2.5 py-1.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#5ce1b8] transition hover:border-[#5ce1b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ce1b8]"
              >
                <Compass className="h-3.5 w-3.5 text-[#c5a869]" aria-hidden="true" />
                <span>Open Astrolabe Dial</span>
              </button>

              {seasonSlot}
            </div>

            {/* Center Sovereign Portrait with Celestial Astrolabe Reticle */}
            <div className="relative flex flex-col items-center justify-center py-2 text-center">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 rounded-full bg-[radial-gradient(circle,rgba(92,225,184,0.22)_0%,transparent_68%)]"
              />
              <svg
                viewBox="0 0 240 240"
                aria-hidden="true"
                className={`pointer-events-none absolute h-[290px] w-[290px] opacity-40 ${
                  animOn ? "astrolabe-ring-cw" : ""
                }`}
                fill="none"
              >
                <circle
                  cx="120"
                  cy="120"
                  r="112"
                  stroke="#c5a869"
                  strokeWidth="0.9"
                  strokeDasharray="4 4"
                />
                <circle cx="120" cy="120" r="98" stroke="#5ce1b8" strokeWidth="0.7" />
                <polygon
                  points="120,10 230,120 120,230 10,120"
                  stroke="#c5a869"
                  strokeOpacity="0.65"
                  strokeWidth="0.8"
                />
              </svg>
              {badgesSlot && (
                <div className="relative mb-2 flex flex-wrap items-center justify-center gap-1.5">
                  {badgesSlot}
                </div>
              )}
              <div className="relative w-full max-w-[280px]">{resolvedPortrait}</div>
            </div>

            {/* Right Illuminated Parchment & Alchemical Ability Ledger */}
            <div className="flex flex-col gap-3">
              <div className="parchment-dot-grid flex flex-col gap-3 rounded border border-[#c5a869]/85 p-3.5 text-[#15221b] shadow-inner">
                <div className="text-center lg:text-left">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-[#2e5a52]">
                    {resolvedKicker}
                  </p>
                  <h1
                    className={`manga-display-title ${MANGA_SCALE.heroTitle} mt-0.5 uppercase text-[#15221b]`}
                  >
                    {name}
                  </h1>
                  <div className="mt-1.5 flex items-center justify-center gap-1.5 lg:justify-start">
                    <span className="font-mono text-[9px] font-bold uppercase text-[#2e5a52]">
                      RANK:
                    </span>
                    {[1, 2, 3, 4].map((pip) => (
                      <span
                        key={pip}
                        className={`h-2 w-2 rotate-45 border ${
                          pip <= tierPipCount
                            ? "border-[#2e5a52] bg-[#5ce1b8] shadow-[0_0_6px_rgba(92,225,184,0.65)]"
                            : "border-[#2e5a52]/40 bg-transparent"
                        }`}
                      />
                    ))}
                    <span className="ml-auto font-mono text-[9px] font-bold uppercase tabular-nums text-[#2e5a52]">
                      {tierPipCount}/4
                    </span>
                  </div>
                </div>
                {abilityMedallionsLeftSlot}
                {abilityMedallionsRightSlot}
                {radarSlot}
                {actionsSlot && (
                  <div className="border-t border-[#c5a869]/50 pt-2">{actionsSlot}</div>
                )}
              </div>

              {renderAbilityShowcase()}
            </div>
          </div>
          <GenreDivider theme={activeGenre} label={metaJpLabel} />
          <div className="parchment-dot-grid relative rounded border border-[#c5a869]/70 p-2 text-[#15221b]">
            {resolvedProfile}
          </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Lower Chronicle Content & Combat Matrix */}
      {(tabContentSlot || combatMatrixSlot) && (
        <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
          <div className="flex flex-col gap-4">{tabContentSlot}</div>
          <div className="flex flex-col gap-4">{combatMatrixSlot}</div>
        </div>
      )}
    </div>
  );
}
