import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Megaphone, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  announcementId,
  DEFAULT_SITE_PUBLIC,
  sanitizeSitePublic,
  SITE_PUBLIC_KEY,
  sitePublicQuery,
  splitTitle,
  type AnnouncementTone,
  type SitePublicSettings,
} from "@/lib/site-customize";

const TONES: Array<[AnnouncementTone, string]> = [
  ["info", "Info"],
  ["event", "Event"],
  ["warning", "Warning"],
];

/**
 * Admin → Customize: site branding and the announcement banner, with a live preview.
 * Saves one admin-only key (site_public); Reset deletes it so defaults apply.
 */
export function AdminSiteCustomize() {
  const qc = useQueryClient();
  const { data: saved, isFetched } = useQuery(sitePublicQuery);
  const [draft, setDraft] = useState<SitePublicSettings | null>(null);
  const [busy, setBusy] = useState<"save" | "reset" | null>(null);
  useEffect(() => {
    if (isFetched && saved && !draft) setDraft(saved);
  }, [isFetched, saved, draft]);
  const d = draft ?? saved ?? DEFAULT_SITE_PUBLIC;
  const set = (patch: Partial<SitePublicSettings>) => setDraft({ ...d, ...patch });
  const setA = (patch: Partial<SitePublicSettings["announcement"]>) =>
    setDraft({ ...d, announcement: { ...d.announcement, ...patch } });
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);

  const save = async () => {
    setBusy("save");
    try {
      const value = sanitizeSitePublic({
        ...d,
        announcement: { ...d.announcement, id: announcementId(d.announcement.text) },
      });
      const { error } = await supabase.from("app_settings").upsert({
        key: SITE_PUBLIC_KEY,
        value: value as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      qc.setQueryData(sitePublicQuery.queryKey, value);
      setDraft(value);
      toast.success("Site settings saved. Visitors see them within a minute.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save site settings.");
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    setBusy("reset");
    try {
      const { error } = await supabase.from("app_settings").delete().eq("key", SITE_PUBLIC_KEY);
      if (error) throw error;
      qc.setQueryData(sitePublicQuery.queryKey, DEFAULT_SITE_PUBLIC);
      setDraft(DEFAULT_SITE_PUBLIC);
      toast.success("Site settings reset to defaults.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset site settings.");
    } finally {
      setBusy(null);
    }
  };

  const [lead, rest] = splitTitle(d.siteTitle);
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs text-muted-foreground">Site title</span>
          <Input
            value={d.siteTitle}
            maxLength={60}
            onChange={(e) => set({ siteTitle: e.target.value })}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs text-muted-foreground">Kicker (small line above the title)</span>
          <Input
            value={d.kicker}
            maxLength={40}
            onChange={(e) => set({ kicker: e.target.value })}
          />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-xs text-muted-foreground">Tagline</span>
          <Textarea
            value={d.tagline}
            maxLength={200}
            rows={2}
            onChange={(e) => set({ tagline: e.target.value })}
          />
        </label>

        <fieldset className="grid gap-3 rounded-xl border border-border p-4">
          <legend className="flex items-center gap-2 px-1 text-sm">
            <Megaphone className="h-4 w-4 text-accent" aria-hidden="true" />
            Announcement banner
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={d.announcement.enabled}
              onChange={(e) => setA({ enabled: e.target.checked })}
            />
            Show to everyone
          </label>
          <Textarea
            aria-label="Announcement message"
            placeholder="e.g. Season 4 dossiers are live!"
            value={d.announcement.text}
            maxLength={240}
            rows={2}
            onChange={(e) => setA({ text: e.target.value })}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Banner tone">
            {TONES.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setA({ tone: id })}
                aria-pressed={d.announcement.tone === id}
                className={`rounded-full border px-3 py-1 text-xs ${d.announcement.tone === id ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              aria-label="Link path"
              placeholder="Link path, e.g. /series"
              value={d.announcement.linkTo}
              onChange={(e) => setA({ linkTo: e.target.value })}
            />
            <Input
              aria-label="Link label"
              placeholder="Link label, e.g. Read now"
              value={d.announcement.linkLabel}
              maxLength={30}
              onChange={(e) => setA({ linkLabel: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Links must stay inside the archive (start with “/”). Readers can dismiss the banner; a
            new message shows again.
          </p>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void save()} disabled={!dirty || busy !== null}>
            {busy === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Save
          </Button>
          <Button
            variant="secondary"
            onClick={() => setDraft(saved ?? DEFAULT_SITE_PUBLIC)}
            disabled={!dirty || busy !== null}
          >
            Discard changes
          </Button>
          <Button variant="ghost" onClick={() => void reset()} disabled={busy !== null}>
            {busy === "reset" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            )}
            Reset to defaults
          </Button>
        </div>
      </div>

      <div aria-label="Live preview" className="grid content-start gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live preview</p>
        <div className="glass rounded-2xl border border-border p-6">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent">{d.kicker}</p>
          <p className="mt-3 text-4xl font-medium leading-[0.95]">
            {lead}
            {rest && (
              <>
                <br />
                <em className="text-muted-foreground">{rest}</em>
              </>
            )}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{d.tagline}</p>
        </div>
        {d.announcement.enabled && d.announcement.text && (
          <div className="glass flex items-center gap-3 rounded-2xl border border-accent/50 px-4 py-2.5 text-sm">
            <Megaphone className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              {d.announcement.text}
              {d.announcement.linkTo && (
                <span className="font-medium text-accent">
                  {" "}
                  {d.announcement.linkLabel || "Open"}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
