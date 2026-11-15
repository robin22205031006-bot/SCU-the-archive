import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery } from "@/lib/entities";
import { allAbilityDefs } from "@/lib/abilities";
import { ABILITY_RANKS, abilityRankMeta, clampDbAbilityLevel } from "@/lib/ability-rank";
import { AbilityBadge } from "@/components/ability-badge";
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
        .limit(300);
      if (error) return [];
      return data;
    },
  });
  const entityName = useMemo(
    () => new Map((entities ?? []).map((e) => [e.id, e.name])),
    [entities],
  );
  const seriesTitle = useMemo(() => new Map((series ?? []).map((s) => [s.id, s.title])), [series]);
  const filtered = useMemo(
    () => (rows ?? []).filter((r) => !entityId || r.entity_id === entityId),
    [rows, entityId],
  );

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
        Assign abilities per character, scoped to a series/season with an emblem rank (1–5).
      </p>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
          className="h-9 rounded-md border bg-background px-2 text-xs"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        >
          <option value="">Character…</option>
          {(entities ?? []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border bg-background px-2 text-xs"
          value={abilityKey}
          onChange={(e) => setAbilityKey(e.target.value)}
        >
          <option value="">Ability…</option>
          {defs.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label} ({a.tier})
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-md border bg-background px-2 text-xs"
          value={seriesId}
          onChange={(e) => setSeriesId(e.target.value)}
        >
          <option value="">All series</option>
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
      {abilityKey.trim() && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-xs">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Emblem preview
          </span>
          <AbilityBadge name={abilityKey.trim()} level={level} />
          <span className="text-[11px] text-muted-foreground">{abilityRankMeta(level).label}</span>
        </div>
      )}
      <ul className="grid gap-1 text-sm">
        {filtered.length === 0 && (
          <li className="text-xs text-muted-foreground">No assignments yet.</li>
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
              {r.season_number ? ` S${r.season_number}` : ""}
            </span>
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
