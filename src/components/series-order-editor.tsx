import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { seriesQuery } from "@/lib/series";
import {
  completeOrder,
  SERIES_ORDER_KEY,
  useSeriesOrders,
  type SeriesOrders,
} from "@/lib/series-order";
import { useIsStaff } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";

/** Staff: set release and story-chronology order; the active one drives every Journey timeline. */
export function SeriesOrderEditor() {
  const isStaff = useIsStaff();
  const qc = useQueryClient();
  const { data: series = [] } = useQuery(seriesQuery);
  const { data: saved } = useSeriesOrders();
  const [draft, setDraft] = useState<Required<SeriesOrders>>({
    release: [],
    story: [],
    active: "release",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setDraft({
      release: completeOrder(saved?.release, series),
      story: completeOrder(saved?.story ?? saved?.release, series),
      active: saved?.active ?? "release",
    });
  }, [saved, series]);
  if (!isStaff || !series.length) return null;
  const title = (id: string) => series.find((s) => s.id === id)?.title ?? "?";
  const move = (k: "release" | "story", i: number, d: -1 | 1) =>
    setDraft((o) => {
      const list = [...o[k]];
      const j = i + d;
      if (j < 0 || j >= list.length) return o;
      [list[i], list[j]] = [list[j]!, list[i]!];
      return { ...o, [k]: list };
    });
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("app_settings").upsert({
      key: SERIES_ORDER_KEY,
      value: draft as never,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't save the timeline order.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["app-settings", SERIES_ORDER_KEY] });
    toast.success("Timeline order saved — Journey charts updated.");
  };
  return (
    <details className="glass mt-4 rounded-2xl p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Timeline order (Journey charts)
      </summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        {(["release", "story"] as const).map((k) => (
          <fieldset key={k} className="min-w-0">
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="timeline-active"
                checked={draft.active === k}
                onChange={() => setDraft({ ...draft, active: k })}
              />
              {k === "release" ? "Release order" : "Story chronology"}
            </label>
            <ol className="grid gap-1">
              {draft[k].map((id, i) => (
                <li
                  key={id}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm"
                >
                  <span className="w-5 text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{title(id)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Move ${title(id)} up`}
                    onClick={() => move(k, i, -1)}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label={`Move ${title(id)} down`}
                    onClick={() => move(k, i, 1)}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ol>
          </fieldset>
        ))}
      </div>
      <Button className="mt-3" size="sm" disabled={busy} onClick={save}>
        {busy ? "Saving…" : "Save timeline order"}
      </Button>
    </details>
  );
}
