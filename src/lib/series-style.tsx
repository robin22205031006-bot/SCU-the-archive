import { useEffect, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Paintbrush } from "lucide-react";

/** Per-series title styling (font, colour, effect) shared by every UI style. */
export interface SeriesStyle { font?: string | undefined; color?: string | undefined; effect?: string | undefined }
type StyleMap = Record<string, SeriesStyle>;
const KEY = "series_styles";
const QK = ["app-settings", KEY];

export const SERIES_FONTS = ["Cormorant Garamond", "Space Grotesk", "Rajdhani", "Manrope", "Cinzel", "Orbitron", "Bebas Neue", "Playfair Display", "Audiowide", "Uncial Antiqua"];
export const SERIES_EFFECTS = [
  { key: "", label: "None" },
  { key: "glow", label: "Glow" },
  { key: "outline", label: "Outline" },
  { key: "shadow", label: "Deep shadow" },
];
/** Animated effects offered only in Nexus; other styles show them as a static glow. */
export const NEXUS_SERIES_EFFECTS = [
  { key: "nx-shimmer", label: "Nexus · Shimmer sweep" },
  { key: "nx-flicker", label: "Nexus · Neon flicker" },
  { key: "nx-ember", label: "Nexus · Ember pulse" },
  { key: "nx-glitch", label: "Nexus · Glitch" },
];

export function useSeriesStyles() {
  return useQuery({
    queryKey: QK,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", KEY).maybeSingle();
      return ((data?.value ?? {}) as StyleMap) || {};
    },
  });
}

const loaded = new Set(["Cormorant Garamond", "Space Grotesk", "Rajdhani", "Manrope"]);
function ensureFont(font?: string) {
  if (!font || loaded.has(font) || typeof document === "undefined") return;
  loaded.add(font);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, "+")}&display=swap`;
  document.head.appendChild(l);
}

/** Returns class + inline style for a series title. Non-Nexus styles get a calm fallback for Nexus FX. */
export function useSeriesTitleStyle(seriesId: string | undefined, nexus: boolean): { className: string; style: CSSProperties } {
  const { data } = useSeriesStyles();
  const s = (seriesId && data?.[seriesId]) || {};
  useEffect(() => ensureFont(s.font), [s.font]);
  const effect = s.effect ?? "";
  const cls = effect.startsWith("nx-") ? (nexus ? `series-fx-${effect}` : "series-fx-glow") : effect ? `series-fx-${effect}` : "";
  const style: CSSProperties = {};
  if (s.font) style.fontFamily = `"${s.font}", var(--font-display, serif)`;
  if (s.color) (style as Record<string, string>)["--series-color"] = s.color;
  if (s.color) style.color = "var(--series-color)";
  return { className: cls, style };
}

export function SeriesStyleEditor({ seriesId }: { seriesId: string }) {
  const isStaff = useIsStaff();
  const qc = useQueryClient();
  const { data } = useSeriesStyles();
  const current = data?.[seriesId] ?? {};
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SeriesStyle>(current);
  useEffect(() => setForm(current), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!isStaff) return null;
  const save = async () => {
    const fresh = await supabase.from("app_settings").select("value").eq("key", KEY).maybeSingle();
    const next = { ...((fresh.data?.value ?? {}) as StyleMap), [seriesId]: form };
    const { error } = await supabase.from("app_settings").upsert({ key: KEY, value: next as never, updated_at: new Date().toISOString() });
    if (error) { toast.error("Couldn't save the series style"); return; }
    qc.setQueryData(QK, next);
    toast.success("Series style saved");
    setOpen(false);
  };
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Paintbrush className="h-4 w-4" />Title style</Button>;
  const sel = "h-9 w-full rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="grid w-full gap-2 rounded-xl border border-border p-3 sm:grid-cols-3">
      <label className="grid gap-1 text-xs">Font<select className={sel} value={form.font ?? ""} onChange={(e) => { ensureFont(e.target.value); setForm({ ...form, font: e.target.value || undefined }); }}><option value="">Default</option>{SERIES_FONTS.map((f) => <option key={f}>{f}</option>)}</select></label>
      <label className="grid gap-1 text-xs">Colour<input type="color" aria-label="Title colour" className="h-9 w-full rounded-md border border-input bg-background" value={form.color ?? "#ffffff"} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
      <label className="grid gap-1 text-xs">Font effect<select className={sel} value={form.effect ?? ""} onChange={(e) => setForm({ ...form, effect: e.target.value })}>{SERIES_EFFECTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}{NEXUS_SERIES_EFFECTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
      <div className="flex flex-wrap gap-2 sm:col-span-3">
        <Button size="sm" onClick={save}>Save style</Button>
        <Button size="sm" variant="ghost" onClick={() => setForm({})}>Reset</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}
