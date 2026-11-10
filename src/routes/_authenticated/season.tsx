import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery } from "@/lib/entities";
import { seriesQuery, seriesCharactersQuery } from "@/lib/series";
import { seriesSeasonNames } from "@/lib/series-seasons";
import { projectSeasonRoster } from "@/lib/nexus-roster";
import { readDossier } from "@/lib/nexus-season";
import { useIsStaff } from "@/hooks/use-admin";
import { useSpoilerMask, SpoilerToggle } from "@/lib/spoiler-mask";
import { NexusRosterEditor } from "@/components/nexus-roster-editor";
import { invalidateArchive, resolveGroupIds } from "@/lib/archive-sync";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/season")({
  validateSearch: (s: Record<string, unknown>): { series: string; n: number } => ({
    series: typeof s["series"] === "string" ? s["series"] : "",
    n: Math.max(1, Number(s["n"]) || 1),
  }),
  head: () => ({
    meta: [
      { title: "Season Dossier — Sentinels Cinematic Universe" },
      { name: "description", content: "Roster, roles, status and groups for one season of an SCU series." },
      { property: "og:title", content: "Season Dossier — SCU" },
      { property: "og:description", content: "Who appears in a season, their roles, status and groups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SeasonPage,
});

function SeasonPage() {
  const { series: seriesId, n } = Route.useSearch();
  const qc = useQueryClient();
  const isStaff = useIsStaff();
  useSpoilerMask("series");
  const [editing, setEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { data: allSeries = [] } = useQuery(seriesQuery);
  const { data: chars = [] } = useQuery(entitiesQuery(["character"]));
  const { data: groups = [] } = useQuery(entitiesQuery(["organization", "clan", "bloodline", "faction"]));
  const { data: members = [] } = useQuery(seriesCharactersQuery(seriesId));
  const series = allSeries.find((s) => s.id === seriesId);
  if (!series) return <main className="mx-auto max-w-4xl px-4 pb-24 pt-28"><p className="text-sm text-muted-foreground">Series not found.</p><Link to="/archive" className="text-accent">Back to Archive</Link></main>;
  const name = seriesSeasonNames(series)[n - 1] ?? `Season ${n}`;
  const roster = projectSeasonRoster(chars, seriesId, n, members);
  const key = `${seriesId}:${n}`;

  /** Admin manual resync: rebuild memberships and series rows for every character in this season. */
  const resync = async () => {
    setSyncing(true);
    let failed = 0;
    for (const c of roster) {
      const d = readDossier(chars.find((x) => x.id === c.id)?.stats)[key];
      if (!d) continue;
      const ids = resolveGroupIds([...(d.organizations ?? []), ...(d.bloodline ? [d.bloodline] : [])], groups);
      const { data: have } = await supabase.from("entity_memberships").select("group_id").eq("character_id", c.id);
      const add = ids.filter((g) => !(have ?? []).some((h) => h.group_id === g));
      if (add.length && (await supabase.from("entity_memberships").insert(add.map((group_id) => ({ character_id: c.id, group_id, status: "member" })))).error) failed++;
      const row = members.find((m) => m.character_id === c.id);
      const patch = { ...(d.role ? { role_in_series: d.role, arc_role: d.role } : {}), ...(d.status ? { status: d.status } : {}) };
      const res = row ? (Object.keys(patch).length ? await supabase.from("series_characters").update(patch).eq("id", row.id) : { error: null })
        : await supabase.from("series_characters").insert({ series_id: seriesId, character_id: c.id, status: d.status || "Alive", ...patch });
      if (res.error) failed++;
    }
    await invalidateArchive(qc);
    setSyncing(false);
    if (failed) toast.error(`${failed} update(s) could not be synced.`); else toast.success("Season synced to Archive, graphs and dossiers.");
  };

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-5">
      <Link to="/archive" className="text-xs text-accent">← Archive</Link>
      <p className="mt-3 text-[11px] uppercase tracking-[0.25em] text-accent">{series.title}</p>
      <h1 className="mt-1 break-words text-4xl font-medium glow-text">{name}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <SpoilerToggle scope="series" />
        {isStaff && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit season roster</Button>}
        {isStaff && <Button size="sm" variant="outline" disabled={syncing} onClick={resync}>{syncing ? "Syncing…" : "Resync everywhere"}</Button>}
      </div>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {roster.map((c) => {
          const d = readDossier(c.stats)[key] ?? {};
          return (
            <li key={c.id} className="glass min-w-0 rounded-xl p-4">
              <Link to="/character" search={{ e: c.id, series: seriesId, season: n }} className="font-medium hover:text-accent">{c.name}</Link>
              {c.alias && <p className="text-xs text-muted-foreground">{c.alias}</p>}
              <div data-spoiler="series" className="mt-2 space-y-1 text-xs">
                <p>Role: {c.category || "—"} · Status: {c.status || "—"}</p>
                {(d.bloodline || d.organizations?.length) && <p>Groups: {[d.bloodline, ...(d.organizations ?? [])].filter(Boolean).join(" · ")}</p>}
              </div>
            </li>
          );
        })}
        {!roster.length && <p className="text-sm text-muted-foreground">No characters recorded for this season yet.</p>}
      </ul>
      {isStaff && editing && chars.length > 0 && <NexusRosterEditor open onClose={() => setEditing(false)} entities={chars} seriesId={seriesId} season={n} label={`${series.title} · ${name}`} />}
    </main>
  );
}
