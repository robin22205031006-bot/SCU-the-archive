import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery } from "@/lib/entities";
import { seriesQuery, seriesCharactersQuery } from "@/lib/series";
import { seriesSeasonNames } from "@/lib/series-seasons";
import { projectSeasonRoster } from "@/lib/nexus-roster";
import { readDossier } from "@/lib/nexus-season";
import { useIsAdmin, useIsStaff } from "@/hooks/use-admin";
import { useSpoilerMask, SpoilerToggle } from "@/lib/spoiler-mask";
import { NexusRosterEditor } from "@/components/nexus-roster-editor";
import { invalidateArchive, resolveGroupIds } from "@/lib/archive-sync";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { draftSeasonStory } from "@/lib/season-story.functions";
import { deleteSeason } from "@/lib/series-lore.functions";
import { sfx } from "@/lib/scu-audio";
import { MotionCard, MotionPage, MotionSection } from "@/components/app-motion";

export const Route = createFileRoute("/_authenticated/season")({
  validateSearch: (s: Record<string, unknown>): { series: string; n: number } => ({
    series: typeof s["series"] === "string" ? s["series"] : "",
    n: Math.max(1, Number(s["n"]) || 1),
  }),
  head: () => ({
    meta: [
      { title: "Season Dossier — Sentinels Cinematic Universe" },
      {
        name: "description",
        content: "Roster, roles, status and groups for one season of an SCU series.",
      },
      { property: "og:title", content: "Season Dossier — SCU" },
      {
        property: "og:description",
        content: "Who appears in a season, their roles, status and groups.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeasonPage,
});

function SeasonPage() {
  const { series: seriesId, n } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isStaff = useIsStaff();
  const isAdmin = useIsAdmin();
  useSpoilerMask("series");
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filling, setFilling] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const runDraft = useServerFn(draftSeasonStory);
  const runDeleteSeason = useServerFn(deleteSeason);
  const { data: allSeries = [] } = useQuery(seriesQuery);
  const { data: chars = [] } = useQuery(entitiesQuery(["character"]));
  const { data: groups = [] } = useQuery(
    entitiesQuery(["organization", "clan", "bloodline", "faction"]),
  );
  const { data: members = [] } = useQuery(seriesCharactersQuery(seriesId));
  const series = allSeries.find((s) => s.id === seriesId);
  if (!series)
    return (
      <main className="mx-auto max-w-4xl px-4 pb-24 pt-28">
        <p className="text-sm text-muted-foreground">Series not found.</p>
        <Link to="/archive" className="text-accent">
          Back to Archive
        </Link>
      </main>
    );
  const seasonNames = seriesSeasonNames(series);
  const hasSeason = n >= 1 && n <= seasonNames.length;
  const name = seasonNames[n - 1] ?? `Season ${n}`;
  const roster = projectSeasonRoster(chars, seriesId, n, members);
  const orgRoster = projectSeasonRoster(groups, seriesId, n, []);
  const key = `${seriesId}:${n}`;

  const handleDeleteSeason = async () => {
    if (!isAdmin || deleting) return;
    setDeleting(true);
    try {
      await runDeleteSeason({ data: { seriesId, season: n } });
      sfx.remove();
      toast.success(`${name} deleted`);
      await invalidateArchive(qc);
      setConfirmDelete(false);
      void navigate({ to: "/series", search: { s: seriesId } as never });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The season could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  /** Admin manual resync: rebuild memberships and series rows for every character in this season. */
  const resync = async () => {
    setSyncing(true);
    let failed = 0;
    for (const c of roster) {
      const d = readDossier(chars.find((x) => x.id === c.id)?.stats)[key];
      if (!d) continue;
      const ids = resolveGroupIds(
        [...(d.organizations ?? []), ...(d.bloodline ? [d.bloodline] : [])],
        groups,
      );
      const { data: have } = await supabase
        .from("entity_memberships")
        .select("group_id")
        .eq("character_id", c.id);
      const add = ids.filter((g) => !(have ?? []).some((h) => h.group_id === g));
      if (
        add.length &&
        (
          await supabase
            .from("entity_memberships")
            .insert(add.map((group_id) => ({ character_id: c.id, group_id, status: "member" })))
        ).error
      )
        failed++;
      const row = members.find((m) => m.character_id === c.id);
      const patch = {
        ...(d.role ? { role_in_series: d.role, arc_role: d.role } : {}),
        ...(d.status ? { status: d.status } : {}),
      };
      const res = row
        ? Object.keys(patch).length
          ? await supabase.from("series_characters").update(patch).eq("id", row.id)
          : { error: null }
        : await supabase.from("series_characters").insert({
            series_id: seriesId,
            character_id: c.id,
            status: d.status || "Alive",
            ...patch,
          });
      if (res.error) failed++;
    }
    await invalidateArchive(qc);
    setSyncing(false);
    if (failed) toast.error(`${failed} update(s) could not be synced.`);
    else toast.success("Season synced to Archive, graphs and dossiers.");
  };

  /** Staff: draft story/impact/philosophy from PDFs for every roster character, filling only empty fields. */
  const fillAll = async () => {
    let done = 0,
      skipped = 0;
    for (const [i, c] of roster.entries()) {
      setFilling(`${i + 1}/${roster.length}`);
      const cur = readDossier(chars.find((x) => x.id === c.id)?.stats)[key] ?? {};
      if (cur.story && cur.impact && cur.philosophy) continue;
      const res = await runDraft({ data: { entityId: c.id, seriesId, season: n } }).catch(
        () =>
          ({ story: "", error: "failed" }) as {
            story: string;
            impact?: string;
            philosophy?: string;
            error?: string;
          },
      );
      if (res.error) {
        skipped++;
        continue;
      }
      const { data: fresh } = await supabase
        .from("entities")
        .select("stats,locked_fields")
        .eq("id", c.id)
        .single();
      if (!fresh) {
        skipped++;
        continue;
      }
      const stats = { ...(fresh.stats as Record<string, unknown>) };
      const map = readDossier(stats);
      const d = map[key] ?? {};
      stats["dossier"] = {
        ...map,
        [key]: {
          roster: true,
          ...d,
          story: d.story || res.story,
          impact: d.impact || res.impact || d.impact,
          philosophy: d.philosophy || res.philosophy || d.philosophy,
        },
      };
      const up = await supabase
        .from("entities")
        .update({
          stats: stats as never,
          locked_fields: [...new Set([...fresh.locked_fields, "stats"])],
        })
        .eq("id", c.id);
      if (up.error) skipped++;
      else done++;
    }
    setFilling("");
    await invalidateArchive(qc);
    toast.success(
      `Filled ${done} character${done === 1 ? "" : "s"}${skipped ? ` · ${skipped} had no PDF text or failed` : ""}.`,
    );
  };

  return (
    <MotionPage as="main" className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-5">
      <MotionSection as="header">
        <Link to="/archive" className="text-xs text-accent">
          ← Archive
        </Link>
        <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-accent">{series.title}</p>
        <h1 className="mt-1 break-words text-4xl font-medium glow-text">{name}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <SpoilerToggle scope="series" />
          {isStaff && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Add / Manage Season Roster (Characters &amp; Orgs)
            </Button>
          )}
          {isStaff && (
            <Button
              size="sm"
              variant="outline"
              disabled={!!filling || !roster.length}
              onClick={fillAll}
            >
              {filling ? `Reading PDFs ${filling}…` : "Fill all stories from PDFs"}
            </Button>
          )}
          {isStaff && (
            <Button size="sm" variant="outline" disabled={syncing} onClick={resync}>
              {syncing ? "Syncing…" : "Resync everywhere"}
            </Button>
          )}
          {isAdmin && hasSeason && (
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete season
            </Button>
          )}
        </div>
      </MotionSection>
      <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
        Appearing Characters ({roster.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {roster.map((c, idx) => {
          const d = readDossier(c.stats)[key] ?? {};
          return (
            <li key={c.id}>
              <MotionCard index={idx} interactive className="glass min-w-0 rounded-xl p-4">
                <Link
                  to="/character"
                  search={{ e: c.id, series: seriesId, season: n }}
                  className="font-medium hover:text-accent"
                >
                  {c.name}
                </Link>
                {c.alias && <p className="text-xs text-muted-foreground">{c.alias}</p>}
                <div data-spoiler="series" className="mt-2 space-y-1 text-xs">
                  <p>
                    Role: {c.category || "—"} · Status: {c.status || "—"}
                  </p>
                  {d.story && <p className="line-clamp-4 text-muted-foreground">{d.story}</p>}
                  {(d.bloodline || d.organizations?.length) && (
                    <p>
                      Groups:{" "}
                      {[d.bloodline, ...(d.organizations ?? [])].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </MotionCard>
            </li>
          );
        })}
        {!roster.length && (
          <p className="text-sm text-muted-foreground">
            No characters recorded for this season yet.
          </p>
        )}
      </ul>

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-accent">
        Appearing Organizations, Clans &amp; Factions ({orgRoster.length})
      </h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {orgRoster.map((g, idx) => {
          const d = readDossier(g.stats)[key] ?? {};
          return (
            <li key={g.id}>
              <MotionCard index={idx} interactive className="glass min-w-0 rounded-xl p-4">
                <Link to="/orgs" search={{ open: g.id }} className="font-medium hover:text-accent">
                  {g.name}
                </Link>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {g.kind} {g.status ? `· ${g.status}` : ""}
                </p>
                {d.story && (
                  <p
                    data-spoiler="series"
                    className="mt-1 line-clamp-3 text-xs text-muted-foreground"
                  >
                    {d.story}
                  </p>
                )}
              </MotionCard>
            </li>
          );
        })}
        {!orgRoster.length && (
          <p className="text-sm text-muted-foreground">
            No organizations recorded for this season yet.
          </p>
        )}
      </ul>
      {isStaff && editing && chars.length > 0 && (
        <NexusRosterEditor
          open
          onClose={() => setEditing(false)}
          entities={chars}
          seriesId={seriesId}
          season={n}
          label={`${series.title} · ${name}`}
        />
      )}
      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${name} from ${series.title}?`}
        description={`This removes Season ${n} abilities and dossier entries, and shifts later seasons down.`}
        confirmLabel="Delete season"
        busy={deleting}
        onConfirm={handleDeleteSeason}
      />
    </MotionPage>
  );
}
