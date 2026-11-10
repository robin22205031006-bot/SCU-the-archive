import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { seriesQuery } from "@/lib/series";

export const SERIES_ORDER_KEY = "series_order";
/** Default when admins haven't customised it: release order. */
export const RELEASE_ORDER = ["The Sentinels", "Redline", "Bloodline", "Divine Beast", "Standalone Epics"];
export type SeriesOrders = { release?: string[]; story?: string[]; active?: "release" | "story" };

export function defaultOrder(series: { id: string; title: string }[]) {
  const rank = (t: string) => { const i = RELEASE_ORDER.indexOf(t); return i < 0 ? 99 : i; };
  return [...series].sort((a, b) => rank(a.title) - rank(b.title) || a.title.localeCompare(b.title)).map((s) => s.id);
}

/** Complete an admin order with any series it doesn't list yet. */
export function completeOrder(saved: string[] | undefined, series: { id: string; title: string }[]) {
  const known = (saved ?? []).filter((id) => series.some((s) => s.id === id));
  return [...known, ...defaultOrder(series).filter((id) => !known.includes(id))];
}

export function useSeriesOrders() {
  return useQuery({
    queryKey: ["app-settings", SERIES_ORDER_KEY],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", SERIES_ORDER_KEY).maybeSingle();
      return (data?.value ?? {}) as SeriesOrders;
    },
  });
}

/** The ordered series ids for the active timeline (release or story). */
export function useTimelineOrder(): string[] {
  const { data: orders } = useSeriesOrders();
  const { data: series = [] } = useQuery(seriesQuery);
  const active = orders?.active ?? "release";
  return completeOrder(orders?.[active], series);
}
