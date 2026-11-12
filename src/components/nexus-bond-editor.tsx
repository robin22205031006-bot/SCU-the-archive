import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { entitiesQuery, entityRelationsQuery } from "@/lib/entities";
import { invalidateArchive } from "@/lib/archive-sync";
import { useIsStaff } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";

export const BOND_KINDS = [
  "ally",
  "rival",
  "mentor",
  "commands",
  "kin",
  "parent",
  "sibling",
  "spouse",
  "ancestor",
] as const;

/** Staff-only editor for character star bonds (entity_relations), shared with the family tree data. */
export function NexusBondEditor() {
  const isStaff = useIsStaff();
  const qc = useQueryClient();
  const { data: chars = [] } = useQuery(entitiesQuery(["character"]));
  const { data: rels = [] } = useQuery(entityRelationsQuery);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [rel, setRel] = useState<string>("ally");
  const [label, setLabel] = useState("");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isStaff) return null;
  const name = (id: string) => chars.find((c) => c.id === id)?.name ?? "?";
  const ids = new Set(chars.map((c) => c.id));
  const list = rels.filter(
    (r) =>
      ids.has(r.source_id) &&
      ids.has(r.target_id) &&
      (!filter ||
        `${name(r.source_id)} ${name(r.target_id)}`.toLowerCase().includes(filter.toLowerCase())),
  );
  const run = async (p: PromiseLike<{ error: unknown }>, ok: string) => {
    setBusy(true);
    const { error } = await p;
    setBusy(false);
    if (error) toast.error("Couldn't save the bond.");
    else toast.success(ok);
    await invalidateArchive(qc);
    return !error;
  };
  const add = async () => {
    if (
      await run(
        supabase
          .from("entity_relations")
          .upsert(
            { source_id: a, target_id: b, rel, label: label.trim() || null },
            { onConflict: "source_id,target_id,rel" },
          ),
        "Bond saved.",
      )
    ) {
      setLabel("");
    }
  };
  const sel = "h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <details className="glass mt-4 rounded-2xl p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Edit star bonds (admins & mods)
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <select
          aria-label="From character"
          className={sel}
          value={a}
          onChange={(e) => setA(e.target.value)}
        >
          <option value="">Character…</option>
          {chars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Bond type"
          className={sel}
          value={rel}
          onChange={(e) => setRel(e.target.value)}
        >
          {BOND_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          aria-label="To character"
          className={sel}
          value={b}
          onChange={(e) => setB(e.target.value)}
        >
          <option value="">Character…</option>
          {chars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Why they're bonded (optional)"
          maxLength={240}
          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Bond description"
        />
        <Button size="sm" disabled={busy || !a || !b || a === b} onClick={add}>
          Save
        </Button>
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter bonds by name…"
        className="mt-4 h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
        aria-label="Filter bonds"
      />
      <ul className="mt-2 grid max-h-72 gap-1 overflow-auto text-sm">
        {list.map((r) => (
          <li key={r.id} className="grid gap-1 border-b border-border/40 py-1.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 break-words">
                <b>{name(r.source_id)}</b> <span className="text-accent">{r.rel}</span>{" "}
                <b>{name(r.target_id)}</b>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Remove bond"
                onClick={() => {
                  if (confirm("Remove this bond?"))
                    void run(
                      supabase.from("entity_relations").delete().eq("id", r.id),
                      "Bond removed.",
                    );
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <input
              defaultValue={r.label ?? ""}
              placeholder="Add a description…"
              maxLength={240}
              aria-label="Edit bond description"
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== (r.label ?? null))
                  void run(
                    supabase.from("entity_relations").update({ label: v }).eq("id", r.id),
                    "Description updated.",
                  );
              }}
            />
          </li>
        ))}
      </ul>
    </details>
  );
}
