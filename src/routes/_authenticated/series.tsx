import { memo, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookMarked, FileText, Pencil, Search, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  seriesQuery,
  seriesByIdQuery,
  seriesCharactersQuery,
  seriesMembersQuery,
  seriesStatusClass,
  type Series,
  type SeriesCharacter,
} from "@/lib/series";
import { episodesQuery } from "@/lib/map";
import { useSectionStyle } from "@/hooks/use-typography";
import { NexusExplorer } from "@/components/nexus-explorer";
import { useUiStyle } from "@/lib/ui-style";
import { Button } from "@/components/ui/button";
import type { Entity } from "@/lib/entities";
import { seriesSeasonNames } from "@/lib/series-seasons";
import { deleteSeason } from "@/lib/series-lore.functions";
import { invalidateArchive } from "@/lib/archive-sync";
import { SeriesTools } from "@/components/series-tools";
import { SpoilerToggle, useSpoilerMask } from "@/lib/spoiler-mask";
import { useIsAdmin, useIsStaff } from "@/hooks/use-admin";
import { AdminSeries } from "@/components/admin-series";
import { SeriesOrderEditor } from "@/components/series-order-editor";
import { NexusRosterEditor } from "@/components/nexus-roster-editor";
import { entitiesQuery } from "@/lib/entities";
import { projectSeasonRoster } from "@/lib/nexus-roster";
import { SeriesStyleEditor, useSeriesTitleStyle } from "@/lib/series-style";
import { sfx } from "@/lib/scu-audio";
import { useIsManga } from "@/hooks/use-ui-mode";
import { MangaChapterBanner, MangaPanel, MangaThoughtBox } from "@/components/manga-view";
import { HankoStamp } from "@/components/manga-emblem";
import {
  MotionCard,
  MotionModalPanel,
  MotionPage,
  MotionPresence,
  MotionSection,
} from "@/components/app-motion";

/** Series title with the admin-chosen font, colour and effect. */
function SeriesTitle({ series, className = "" }: { series: Series; className?: string }) {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const t = useSeriesTitleStyle(series.id, nexus);
  return (
    <span
      className={`${className} ${isManga ? "" : t.className}`}
      style={isManga ? undefined : t.style}
    >
      {series.title}
    </span>
  );
}

/** Season buttons for readers plus per-season roster editor (staff) and delete action (admin). */
function SeasonList({ series }: { series: Series }) {
  const isStaff = useIsStaff();
  const isAdmin = useIsAdmin();
  const isManga = useIsManga();
  const qc = useQueryClient();
  const runDeleteSeason = useServerFn(deleteSeason);
  const [editing, setEditing] = useState<number | null>(null);
  const [deletingSeason, setDeletingSeason] = useState<{ season: number; name: string } | null>(
    null,
  );
  const [deletingBusy, setDeletingBusy] = useState(false);
  const { data: characters = [] } = useQuery({
    ...entitiesQuery(["character"]),
    enabled: isStaff && editing !== null,
  });
  const names = seriesSeasonNames(series);

  const confirmDeleteSeason = async () => {
    if (!isAdmin || !deletingSeason || deletingBusy) return;
    setDeletingBusy(true);
    try {
      await runDeleteSeason({ data: { seriesId: series.id, season: deletingSeason.season } });
      sfx.remove();
      toast.success(`${deletingSeason.name} deleted`);
      if (editing !== null && editing >= deletingSeason.season) setEditing(null);
      await invalidateArchive(qc);
      setDeletingSeason(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The season could not be deleted.");
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2" aria-label={`${series.title} seasons`}>
      {names.map((name, i) => (
        <div key={i} className="flex min-w-0 gap-2">
          <Button
            asChild
            variant="outline"
            className={`h-auto min-h-12 min-w-0 flex-1 whitespace-normal text-left ${
              isManga ? "rounded-none border-2 border-foreground font-mono text-xs uppercase" : ""
            }`}
          >
            <Link to="/characters" search={{ series: series.id, season: i + 1 }}>
              {name}
              <Users className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          {isStaff && (
            <Button
              variant="secondary"
              className="h-auto min-h-12 shrink-0"
              aria-label={`Edit ${name} roster`}
              onClick={() => setEditing(i + 1)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-auto min-h-12 w-10 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Delete ${name} from ${series.title}`}
              onClick={() => setDeletingSeason({ season: i + 1, name })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {isStaff && editing !== null && characters.length > 0 && (
        <NexusRosterEditor
          open
          onClose={() => setEditing(null)}
          entities={characters}
          seriesId={series.id}
          season={editing}
          label={`${series.title} · ${names[editing - 1] ?? ""}`}
        />
      )}
      <DeleteConfirmDialog
        open={!!deletingSeason}
        onOpenChange={(open) => !open && setDeletingSeason(null)}
        title={`Delete ${deletingSeason?.name} from ${series.title}?`}
        description={`This removes Season ${deletingSeason?.season} abilities and dossier entries, and shifts later seasons down.`}
        confirmLabel="Delete season"
        busy={deletingBusy}
        onConfirm={confirmDeleteSeason}
      />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/series")({
  validateSearch: (s: Record<string, unknown>): { s?: string } => ({
    ...(typeof s["s"] === "string" ? { s: s["s"] } : {}),
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Series — Sentinels Cinematic Universe" },
      {
        name: "description",
        content: "Story arcs and series of the Sentinels Cinematic Universe.",
      },
      { property: "og:title", content: "Series — SCU" },
      {
        property: "og:description",
        content: "Story arcs and series of the Sentinels Cinematic Universe.",
      },
    ],
  }),
  component: SeriesPage,
});

interface MemberRow {
  row: SeriesCharacter;
  entity: Entity;
}

function SeriesDetail({ seriesId, onClose }: { seriesId: string; onClose: () => void }) {
  const { data: series } = useQuery(seriesByIdQuery(seriesId));
  const { data: rows } = useQuery(seriesCharactersQuery(seriesId));
  const { data: members } = useQuery(seriesMembersQuery(rows));
  const { data: allCharacters = [] } = useQuery(entitiesQuery(["character"]));
  const { data: allGroups = [] } = useQuery(
    entitiesQuery(["organization", "clan", "bloodline", "faction"]),
  );
  const isStaff = useIsStaff();
  const isManga = useIsManga();
  const hide = useSpoilerMask("series") && !isStaff;
  const [activeSeason, setActiveSeason] = useState(1);
  const [rosterOpen, setRosterOpen] = useState(false);

  const seasonNames = useMemo(() => (series ? seriesSeasonNames(series) : []), [series]);
  const seasonCharacters = useMemo(
    () => (series ? projectSeasonRoster(allCharacters, series.id, activeSeason, rows ?? []) : []),
    [allCharacters, series, activeSeason, rows],
  );
  const seasonOrgs = useMemo(
    () => (series ? projectSeasonRoster(allGroups, series.id, activeSeason, []) : []),
    [allGroups, series, activeSeason],
  );

  const memberRows: MemberRow[] = useMemo(() => {
    const byId = new Map((members ?? []).map((e) => [e.id, e]));
    return (rows ?? [])
      .map((row) => ({ row, entity: byId.get(row.character_id) }))
      .filter((r): r is MemberRow => !!r.entity)
      .sort((a, b) => a.entity.name.localeCompare(b.entity.name));
  }, [rows, members]);

  const grouped = useMemo(() => {
    const order = ["Alive", "Missing", "Dead", "Unknown"];
    const map = new Map<string, MemberRow[]>();
    for (const r of memberRows) {
      const k = hide ? "Characters" : r.row.status || "Unknown";
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()].sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [memberRows, hide]);

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background/94" onClick={onClose}>
      <div
        className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        <MotionModalPanel
          as="section"
          className={`grid gap-6 p-5 sm:p-7 ${
            isManga ? "manga-panel border-[3px] border-foreground bg-card" : "glass rounded-2xl"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {series?.cover_image_url ? (
                <img
                  src={series.cover_image_url}
                  alt={series.title}
                  loading="lazy"
                  decoding="async"
                  className={`h-16 w-16 object-cover ${isManga ? "manga-portrait-ink border-2 border-foreground" : "rounded-xl"}`}
                />
              ) : (
                <div
                  className={`grid h-16 w-16 place-items-center bg-secondary text-muted-foreground ${isManga ? "border-2 border-foreground" : "rounded-xl"}`}
                >
                  <BookMarked className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <p
                  className={`text-[11px] uppercase tracking-[0.25em] ${isManga ? "font-mono font-bold text-[#b91c1c]" : "text-accent"}`}
                >
                  Series
                </p>
                <h2
                  className={`mt-1 break-words ${isManga ? "font-display text-4xl uppercase tracking-wide" : "text-3xl font-medium glow-text"}`}
                >
                  {series ? <SeriesTitle series={series} /> : "…"}
                </h2>
              </div>
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {series?.description && (
            <p className="whitespace-pre-line text-sm text-foreground/85">{series.description}</p>
          )}
          {series && <SeasonList series={series} />}
          {series && (
            <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/20 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold uppercase tracking-widest text-accent">
                  Season Roster · Characters &amp; Organizations
                </span>
                {isStaff && allCharacters.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setRosterOpen(true)}
                  >
                    + Add Character / Org to{" "}
                    {seasonNames[activeSeason - 1] ?? `Season ${activeSeason}`}
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {seasonNames.map((label, idx) => (
                  <button
                    key={label + idx}
                    type="button"
                    onClick={() => setActiveSeason(idx + 1)}
                    className={`rounded-full border px-2.5 py-0.5 transition ${
                      activeSeason === idx + 1
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background/60 hover:border-accent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Characters ({seasonCharacters.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {seasonCharacters.length === 0 ? (
                      <span className="text-muted-foreground">None in this season yet</span>
                    ) : (
                      seasonCharacters.map((c) => (
                        <Link
                          key={c.id}
                          to="/character"
                          search={{ e: c.id, series: series.id, season: activeSeason }}
                          className="rounded-md border border-border bg-background/70 px-2 py-0.5 hover:border-accent hover:text-accent"
                        >
                          {c.name}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Organizations &amp; Factions ({seasonOrgs.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {seasonOrgs.length === 0 ? (
                      <span className="text-muted-foreground">None in this season yet</span>
                    ) : (
                      seasonOrgs.map((o) => (
                        <Link
                          key={o.id}
                          to="/orgs"
                          search={{ open: o.id }}
                          className="rounded-md border border-border bg-background/70 px-2 py-0.5 hover:border-accent hover:text-accent"
                        >
                          {o.name}
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {isStaff && series && rosterOpen && allCharacters.length > 0 && (
            <NexusRosterEditor
              open
              onClose={() => setRosterOpen(false)}
              entities={allCharacters}
              seriesId={series.id}
              season={activeSeason}
              label={`${series.title} · ${seasonNames[activeSeason - 1] ?? `Season ${activeSeason}`}`}
            />
          )}
          {series && <SeriesStyleEditor seriesId={series.id} />}
          {series && <SeriesTools series={series} onDeleted={onClose} />}
          <div className="grid gap-4">
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">No characters assigned yet.</p>
            ) : (
              grouped.map(([status, members]) => (
                <div key={status}>
                  <p
                    className={`mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest ${seriesStatusClass[status] ?? "text-status-neutral"}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {status} · {members.length}
                  </p>
                  <div className="grid gap-2">
                    {members.map(({ row, entity }) => (
                      <Link
                        key={row.id}
                        to="/characters"
                        search={{ open: entity.id }}
                        className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 transition-colors hover:bg-secondary/70"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{entity.name}</span>
                          {!hide && row.role_in_series && (
                            <span className="block truncate text-xs text-muted-foreground">
                              {row.role_in_series}
                            </span>
                          )}
                        </span>
                        {!hide && entity.category && (
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {entity.category}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </MotionModalPanel>
      </div>
    </div>
  );
}

/** Cinematic hero carousel — full-bleed cover art, bold titles, metadata chips. */
function SeriesHero({
  series,
  counts,
  onOpen,
}: {
  series: Series[];
  counts: Map<string, number>;
  onOpen: (id: string) => void;
}) {
  const isManga = useIsManga();
  if (series.length === 0) return null;
  if (isManga) {
    return (
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between border-b-2 border-foreground pb-1.5">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#b91c1c] dark:text-[#fca5a5]">
            TANKŌBON ISSUE COVERS // 表紙一覧
          </span>
          <span className="font-mono text-[10px] uppercase text-muted-foreground">
            {series.length} VOLUMES
          </span>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {series.map((s, i) => (
            <button
              key={s.id}
              onClick={() => onOpen(s.id)}
              className="manga-panel manga-panel-hover group relative flex w-[78vw] max-w-sm shrink-0 snap-center flex-col justify-between overflow-hidden border-[3px] border-foreground bg-card text-left sm:w-[22rem]"
            >
              <div className="manga-halftone relative h-44 w-full overflow-hidden border-b-[3px] border-foreground bg-secondary">
                {s.cover_image_url ? (
                  <img
                    src={s.cover_image_url}
                    alt={s.title}
                    loading={i === 0 ? "eager" : "lazy"}
                    className="manga-portrait-ink h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center font-display text-6xl text-foreground/20">
                    VOL.{String(i + 1).padStart(2, "0")}
                  </div>
                )}
                <span className="absolute left-2 top-2 border-2 border-foreground bg-[#b91c1c] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
                  VOLUME {String(i + 1).padStart(2, "0")}
                </span>
                <span className="absolute bottom-2 right-2 border border-foreground bg-card px-2 py-0.5 font-mono text-[10px] font-bold uppercase">
                  {counts.get(s.id) ?? 0} CAST
                </span>
              </div>
              <div className="p-4">
                <h2 className="break-words font-display text-2xl uppercase tracking-wide group-hover:text-[#b91c1c] dark:group-hover:text-[#fca5a5]">
                  <SeriesTitle series={s} />
                </h2>
                {s.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="mb-8">
      <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-accent">Now streaming</p>
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {series.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onOpen(s.id)}
            className="group relative w-[85vw] max-w-md shrink-0 snap-center overflow-hidden rounded-3xl text-left sm:w-[28rem]"
            style={{ minHeight: "16rem" }}
          >
            {s.cover_image_url ? (
              <img
                src={s.cover_image_url}
                alt={s.title}
                loading={i === 0 ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-secondary via-background to-accent/20" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
            <div className="relative flex h-full min-h-[16rem] flex-col justify-end p-6">
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="rounded-full border border-white/25 bg-black/75 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-white/90">
                  SCU Canon
                </span>
                <span className="rounded-full border border-white/25 bg-black/75 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-white/90">
                  {counts.get(s.id) ?? 0} character{(counts.get(s.id) ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
              <h2 className="break-words font-display text-4xl font-bold leading-tight text-white drop-shadow-lg sm:text-5xl">
                <SeriesTitle series={s} />
              </h2>
              {s.description && (
                <p className="mt-2 line-clamp-2 max-w-md text-sm text-white/80">{s.description}</p>
              )}
              <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                ▶ Open saga
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StaffSeriesManager() {
  const isStaff = useIsStaff();
  const isAdmin = useIsAdmin();
  if (!isStaff) return null;
  return (
    <>
      {isAdmin && (
        <details className="glass mt-4 rounded-2xl p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Manage series (add, rename, delete, seasons)
          </summary>
          <div className="mt-3 min-w-0">
            <AdminSeries />
          </div>
        </details>
      )}
      <SeriesOrderEditor />
    </>
  );
}

const SeriesCard = memo(function SeriesCard({
  s,
  idx,
  isManga,
  count,
  onOpen,
}: {
  s: Series;
  idx: number;
  isManga: boolean;
  count: number;
  onOpen: (id: string) => void;
}) {
  return (
    <MotionCard
      index={idx}
      interactive
      className={
        isManga
          ? "manga-panel manga-panel-hover border-[3px] border-foreground bg-card"
          : "glass rounded-2xl"
      }
    >
      <button onClick={() => onOpen(s.id)} className="group flex w-full gap-4 p-4 text-left">
        {s.cover_image_url ? (
          <img
            src={s.cover_image_url}
            alt={s.title}
            loading="lazy"
            decoding="async"
            className={`h-16 w-16 shrink-0 object-cover ${isManga ? "manga-portrait-ink border-2 border-foreground" : "rounded-xl"}`}
          />
        ) : (
          <div
            className={`grid h-16 w-16 shrink-0 place-items-center bg-secondary text-muted-foreground ${isManga ? "border-2 border-foreground font-mono text-xs font-bold" : "rounded-xl"}`}
          >
            {isManga ? `#${String(idx + 1).padStart(2, "0")}` : <BookMarked className="h-6 w-6" />}
          </div>
        )}
        <span className="min-w-0 flex-1">
          <SeriesTitle
            series={s}
            className={
              isManga
                ? "block truncate font-display text-2xl uppercase tracking-wide group-hover:text-[#b91c1c] dark:group-hover:text-[#fca5a5]"
                : "block truncate text-xl font-medium"
            }
          />
          <span className="mt-1 flex items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {count} character{count === 1 ? "" : "s"}
          </span>
          {s.description && (
            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
              {s.description}
            </span>
          )}
        </span>
      </button>
    </MotionCard>
  );
});

export function SeriesPage() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const { s } = useSearch({ strict: false }) as { s?: string };
  const sectionStyle = useSectionStyle("series");
  const nav = useNavigate();
  const navigate = (o: { search: { s?: string } }) => nav({ to: ".", search: o.search as never });
  const [q, setQ] = useState("");
  const { data: series, isLoading } = useQuery(seriesQuery);
  const { data: episodes } = useQuery(episodesQuery);
  const { data: allRows } = useQuery({
    queryKey: ["series-characters", "all"],
    enabled: !!series?.length,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("series_characters").select("series_id");
      if (error) return [] as { series_id: string }[];
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRows ?? []) m.set(r.series_id, (m.get(r.series_id) ?? 0) + 1);
    return m;
  }, [allRows]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (series ?? []).filter(
      (x) =>
        !needle ||
        x.title.toLowerCase().includes(needle) ||
        x.description.toLowerCase().includes(needle),
    );
  }, [series, q]);

  return (
    <MotionPage
      as="main"
      className={`mx-auto w-full max-w-5xl px-4 pb-24 sm:px-5 ${isManga ? "pt-6" : "pt-28"}`}
      style={sectionStyle}
    >
      {isManga ? (
        <MotionSection className="mb-8">
          <MangaChapterBanner
            chapter="CH. 11 // SAGAS"
            jp="連載年表・外伝"
            title="Series"
            subtitle="Serialized story arcs and volume indices — track who lived, vanished, or stood at center stage."
            stamp="連載"
            actions={<SpoilerToggle scope="series" />}
          />
          <StaffSeriesManager />
        </MotionSection>
      ) : (
        <MotionSection as="header" className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Archive</p>
          <h1 className="mt-2 text-5xl font-medium glow-text">Series</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Story arcs and sagas — who lived, died, or vanished in each.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <SpoilerToggle scope="series" />
          </div>
          <StaffSeriesManager />
        </MotionSection>
      )}

      {nexus ? (
        <NexusExplorer
          label="Series"
          loading={isLoading}
          records={(series ?? []).map((s) => ({
            id: s.id,
            title: s.title,
            group: "Sagas",
            image: s.cover_image_url,
            subtitle: `${seriesSeasonNames(s).length} seasons`,
            series: s,
          }))}
          renderDetail={({ series: saga }) => (
            <div className="grid gap-5">
              <h2 className="break-words text-3xl">
                <SeriesTitle series={saga} />
              </h2>
              {saga.cover_image_url && (
                <img
                  src={saga.cover_image_url}
                  alt={saga.title}
                  className="max-h-72 w-full rounded-lg object-contain"
                />
              )}
              <p className="whitespace-pre-line text-sm leading-relaxed">{saga.description}</p>
              <SeasonList series={saga} />
              <SeriesStyleEditor seriesId={saga.id} />
              <Button variant="outline" onClick={() => navigate({ search: { s: saga.id } })}>
                <BookMarked className="h-4 w-4" /> Series dossier
              </Button>
            </div>
          )}
        />
      ) : (
        <>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search series…"
              className={
                isManga
                  ? "h-10 rounded-none border-2 border-foreground bg-background pl-10 font-mono text-xs"
                  : "glass h-11 rounded-full pl-10"
              }
            />
          </div>

          {!q.trim() && (
            <SeriesHero
              series={list.slice(0, 8)}
              counts={counts}
              onOpen={(id) => navigate({ search: { s: id } })}
            />
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : list.length === 0 ? (
            isManga ? (
              <MangaThoughtBox label="NO VOLUMES">
                {series?.length ? "No matches." : "No series defined yet."}
              </MangaThoughtBox>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                {series?.length
                  ? "No matches."
                  : "No series defined yet — an admin can add them from the Admin panel."}
              </p>
            )
          ) : (
            <div
              className={`scu-card-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isManga ? "manga-spread-grid" : ""}`}
            >
              {list.map((s, idx) => (
                <SeriesCard
                  key={s.id}
                  s={s}
                  idx={idx}
                  isManga={isManga}
                  count={counts.get(s.id) ?? 0}
                  onOpen={(id) => navigate({ search: { s: id } })}
                />
              ))}
            </div>
          )}
        </>
      )}
      {nexus && (
        <div className="mt-6 grid gap-3" aria-label="Series controls">
          {(series ?? []).map((saga) => (
            <div
              key={saga.id}
              className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3"
            >
              <h3 className="text-sm font-medium">{saga.title}</h3>
              <SeriesTools series={saga} />
            </div>
          ))}
        </div>
      )}
      {(episodes?.length ?? 0) > 0 && (
        <MotionSection as="section" className="mt-14">
          {isManga ? (
            <div className="mb-4 flex items-center justify-between border-b-[3px] border-foreground pb-2">
              <span className="flex items-center gap-2 font-display text-3xl uppercase tracking-wide">
                <HankoStamp kanji="本編" tilt={-2} />
                Published Episodes
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {episodes?.length ?? 0} CHAPTERS
              </span>
            </div>
          ) : (
            <>
              <p className="mb-1 text-[11px] uppercase tracking-[0.25em] text-accent">Chronicle</p>
              <h2 className="mb-4 text-3xl font-medium">Published episodes</h2>
            </>
          )}
          <div className="grid gap-3">
            {(episodes ?? []).map((ep, idx) => (
              <details
                key={ep.id}
                className={
                  isManga
                    ? "manga-panel group border-[3px] border-foreground bg-card p-4"
                    : "glass group rounded-2xl p-4"
                }
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
                  {isManga ? (
                    <span className="border-2 border-foreground bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold text-background">
                      EP.{String(idx + 1).padStart(2, "0")}
                    </span>
                  ) : (
                    <FileText className="h-5 w-5 shrink-0 text-accent" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate ${isManga ? "font-display text-xl uppercase tracking-wide" : "text-lg font-medium"}`}
                    >
                      {ep.title}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {[ep.series, new Date(ep.created_at).toLocaleDateString()]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </summary>
                <div className="mt-4 whitespace-pre-line border-t-2 border-foreground/20 pt-4 text-sm leading-relaxed text-foreground/85">
                  {ep.body}
                </div>
              </details>
            ))}
          </div>
        </MotionSection>
      )}

      <MotionPresence>
        {s && <SeriesDetail seriesId={s} onClose={() => navigate({ search: {} })} />}
      </MotionPresence>
    </MotionPage>
  );
}
