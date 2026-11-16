import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery } from "@/lib/entities";
import { abilityDef, allAbilityDefs } from "@/lib/abilities";
import {
  ABILITY_RANKS,
  abilityRankMeta,
  clampDbAbilityLevel,
  groupCharacterAbilityProgression,
  resolveAbilityAliasPure,
} from "@/lib/ability-rank";
import { AbilityBadge } from "@/components/ability-badge";
import { AbilityRankPips } from "@/components/ability-rank-pips";
import { AbilityRankEmblem, AbilityRankProgressionStrip } from "@/components/ability-rank-emblem";
import { useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { invalidateArchive } from "@/lib/archive-sync";
import { seriesQuery } from "@/lib/series";
import { sfx } from "@/lib/scu-audio";

/** Admin panel: assign abilities to characters scoped by series/season with emblem rank 1-5. */
export function AdminCharacterAbilities() {
  useAbilityRegistryVersion();
  const defs = allAbilityDefs();
  const qc = useQueryClient();
  const [entityId, setEntityId] = useState("");
  const [abilityKey, setAbilityKey] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [season, setSeason] = useState("");
  const [level, setLevel] = useState(1);
  const [busy, setBusy] = useState(false);

  const { data: entities } = useQuery({ ...entitiesQuery(["character"]), enabled: true });
  const { data: series } = useQuery(seriesQuery);
  const { data: rows } = useQuery({
    queryKey: ["character-abilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_abilities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) return [];
      return data;
    },
  });
  const entityName = useMemo(
    () => new Map((entities ?? []).map((e) => [e.id, e.name])),
    [entities],
  );
  const seriesTitle = useMemo(() => new Map((series ?? []).map((s) => [s.id, s.title])), [series]);
  const seasonNamesMap = useMemo(
    () => new Map((series ?? []).map((s) => [s.id, s.season_names ?? []])),
    [series],
  );

  const selectedSeries = useMemo(
    () => (series ?? []).find((s) => s.id === seriesId) ?? null,
    [series, seriesId],
  );
  const selectedSeriesSeasonCount = selectedSeries
    ? Math.max(selectedSeries.season_count ?? 0, selectedSeries.season_names?.length ?? 0, 1)
    : 0;

  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (r) =>
          (!entityId || r.entity_id === entityId) &&
          (!abilityKey.trim() ||
            resolveAbilityAliasPure(r.ability_key) === resolveAbilityAliasPure(abilityKey)),
      ),
    [rows, entityId, abilityKey],
  );

  const entityProgression = useMemo(() => {
    if (!entityId) return [];
    const charRows = (rows ?? []).filter((r) => r.entity_id === entityId);
    return groupCharacterAbilityProgression(charRows, seriesTitle, seasonNamesMap);
  }, [entityId, rows, seriesTitle, seasonNamesMap]);

  const sharedAbilityHolders = useMemo(() => {
    if (!abilityKey.trim()) return [];
    const targetCanon = resolveAbilityAliasPure(abilityKey);
    const matchingRows = (rows ?? []).filter(
      (r) => resolveAbilityAliasPure(r.ability_key) === targetCanon,
    );
    const byEntity = new Map<string, typeof matchingRows>();
    for (const r of matchingRows) {
      const list = byEntity.get(r.entity_id);
      if (list) list.push(r);
      else byEntity.set(r.entity_id, [r]);
    }
    return [...byEntity.entries()]
      .map(([eid, charRows]) => ({
        entityId: eid,
        name: entityName.get(eid) ?? "Character",
        steps:
          groupCharacterAbilityProgression(charRows, seriesTitle, seasonNamesMap)[0]?.steps ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [abilityKey, rows, entityName, seriesTitle, seasonNamesMap]);

  const add = async () => {
    if (!entityId || !abilityKey.trim() || busy) return;
    setBusy(true);
    try {
      const clamped = clampDbAbilityLevel(level);
      const { error } = await supabase.from("character_abilities").insert({
        entity_id: entityId,
        ability_key: abilityKey.trim(),
        series_id: seriesId || null,
        season_number: season.trim() ? parseInt(season, 10) : null,
        level: clamped,
      });
      if (error) throw error;
      sfx.add();
      toast.success("Ability assigned");
      void invalidateArchive(qc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not assign ability.");
    } finally {
      setBusy(false);
    }
  };

  const updateRank = async (id: string, nextRank: number) => {
    const clamped = clampDbAbilityLevel(nextRank);
    const { error } = await supabase
      .from("character_abilities")
      .update({ level: clamped })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      sfx.pop();
      toast.success(`Updated emblem rank to ${abilityRankMeta(clamped).label}`);
      void invalidateArchive(qc);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("character_abilities").delete().eq("id", id);
    if (error) toast.error(error.message);
    else void invalidateArchive(qc);
  };

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 text-2xl">Ability assignments</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Assign shared abilities per character and per series/season with independent emblem ranks
        (1–5) so characters scale across their seasonal journey.
      </p>
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
          aria-label="Select character"
          className="h-9 rounded-md border bg-background px-2 text-xs"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        >
          <option value="">All characters…</option>
          {(entities ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Select ability"
          className="h-9 rounded-md border bg-background px-2 text-xs"
          value={abilityKey}
          onChange={(e) => setAbilityKey(e.target.value)}
        >
          <option value="">All abilities…</option>
          {defs.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label} ({a.tier})
            </option>
          ))}
        </select>
        <select
          aria-label="Select series"
          className="h-9 rounded-md border bg-background px-2 text-xs"
          value={seriesId}
          onChange={(e) => {
            setSeriesId(e.target.value);
            if (!e.target.value) setSeason("");
          }}
        >
          <option value="">All series (Global)</option>
          {(series ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <Input
          className="h-9 text-xs"
          placeholder="Season #"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        />
        <div className="flex gap-1">
          <select
            aria-label="New assignment rank"
            className="h-9 flex-1 rounded-md border bg-background px-2 text-xs"
            value={level}
            onChange={(e) => setLevel(clampDbAbilityLevel(Number(e.target.value)))}
          >
            {ABILITY_RANKS.map((n) => (
              <option key={n} value={n}>
                Rank {abilityRankMeta(n).roman} ({n}) · {abilityRankMeta(n).shortTitle}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            className="h-9"
            disabled={!entityId || !abilityKey.trim() || busy}
            onClick={add}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedSeries && selectedSeriesSeasonCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {selectedSeries.title} Season:
          </span>
          <button
            type="button"
            onClick={() => setSeason("")}
            className={`rounded border px-2 py-0.5 ${!season ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Series-wide
          </button>
          {Array.from({ length: selectedSeriesSeasonCount }, (_, idx) => {
            const num = String(idx + 1);
            const label = selectedSeries.season_names?.[idx] || `S${num}`;
            return (
              <button
                key={num}
                type="button"
                onClick={() => setSeason(num)}
                className={`rounded border px-2 py-0.5 ${season === num ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:text-foreground"}`}
              >
                {label} (S{num})
              </button>
            );
          })}
        </div>
      )}

      {abilityKey.trim() && (
        <div className="mb-3 space-y-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Emblem preview
            </span>
            <AbilityRankEmblem
              ability={abilityKey.trim()}
              rank={level}
              size="sm"
              showProgressionLabel
            />
            <AbilityBadge name={abilityKey.trim()} level={level} />
          </div>
          <AbilityRankProgressionStrip
            ability={abilityKey.trim()}
            currentRank={level}
            onSelectRank={(r) => setLevel(r)}
            size="xs"
            className="pt-1"
          />
          {sharedAbilityHolders.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-1.5">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Current holders:
              </span>
              {sharedAbilityHolders.map((h) => (
                <button
                  key={h.entityId}
                  type="button"
                  onClick={() => setEntityId(h.entityId)}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] ${
                    entityId === h.entityId
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-card/60 hover:border-accent/60"
                  }`}
                >
                  <span className="font-medium">{h.name}:</span>
                  <span>
                    {h.steps
                      .map(
                        (st) =>
                          `${st.seriesId ? st.seasonLabel : "Global"} ${abilityRankMeta(st.level).roman}`,
                      )
                      .join(" → ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {entityId && entityProgression.length > 0 && (
        <div className="mb-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs">
          <p className="mb-1.5 text-[10px] uppercase tracking-widest text-accent">
            {entityName.get(entityId) ?? "Character"} · Season Mastery Journey
          </p>
          <div className="grid gap-1">
            {entityProgression.map((group) => {
              const def = abilityDef(group.displayKey);
              return (
                <div
                  key={group.canonKey}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-medium">{def.label}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {group.steps.map((step, sIdx) => (
                      <span key={step.id} className="inline-flex items-center gap-1">
                        {sIdx > 0 && <span className="text-muted-foreground">→</span>}
                        <span className="inline-flex items-center gap-1 rounded border border-border/70 bg-secondary/40 px-1.5 py-0.5 text-[10px]">
                          <span>
                            {step.seriesId
                              ? `${step.seriesTitle.replace(/^The\s+/i, "")} ${step.seasonLabel}`
                              : step.seasonLabel}
                          </span>
                          <AbilityRankPips rank={step.level} compact />
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className="grid gap-1 text-sm">
        {filtered.length === 0 && (
          <li className="text-xs text-muted-foreground">No assignments match the filter.</li>
        )}
        {filtered.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 px-3 py-1.5"
          >
            <span className="font-medium">{entityName.get(r.entity_id) ?? "—"}</span>
            <AbilityBadge name={r.ability_key} level={r.level} />
            <span className="text-xs text-muted-foreground">
              {r.series_id ? (seriesTitle.get(r.series_id) ?? "?") : "Global"}
              {r.season_number ? ` · S${r.season_number}` : ""}
            </span>
            <AbilityRankPips rank={r.level} compact />
            <select
              aria-label={`Rank for ${r.ability_key}`}
              className="ml-auto h-7 rounded border border-input bg-background px-1.5 text-[11px]"
              value={clampDbAbilityLevel(r.level)}
              onChange={(ev) => void updateRank(r.id, Number(ev.target.value))}
            >
              {ABILITY_RANKS.map((n) => (
                <option key={n} value={n}>
                  {abilityRankMeta(n).roman} · {abilityRankMeta(n).shortTitle}
                </option>
              ))}
            </select>
            <button
              aria-label="Remove"
              onClick={() => remove(r.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
