import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Film, Image as ImageIcon, Link2, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { fileToDataUrl } from "@/lib/entities";
import {
  NEXUS_WALLPAPERS_SETTINGS_KEY,
  isPinterestPinUrl,
  isVideoMediaUrl,
  mergeNexusWallpapers,
  sanitizeWallpaperSettings,
  sanitizeWallpaperUrl,
  type NexusWallpaperItem,
  type NexusWallpaperKind,
  type NexusWallpaperSettings,
} from "@/lib/nexus-wallpapers";
import { resolvePinterestWallpaper } from "@/lib/nexus-wallpaper.functions";
import {
  nexusWallpaperSettingsQuery,
  setNexusWallpaperChoice,
  useNexusWallpaperChoice,
  useNexusWallpaperSettings,
} from "@/hooks/use-nexus-wallpaper";

const MAX_VIDEO_UPLOAD_BYTES = 4 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function makeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "wallpaper"
  );
}

/** Admin Nexus-only live/static wallpaper manager persisted to app_settings['nexus_wallpapers']. */
export function AdminNexusWallpapers() {
  const qc = useQueryClient();
  const resolvePin = useServerFn(resolvePinterestWallpaper);
  const settings = useNexusWallpaperSettings();
  const activeChoice = useNexusWallpaperChoice();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<NexusWallpaperKind>("live");
  const [label, setLabel] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);

  const allWallpapers = mergeNexusWallpapers(settings, true);
  const disabledSet = new Set(settings.disabledIds ?? []);

  const persist = async (next: NexusWallpaperSettings, successMsg: string) => {
    setSaving(true);
    try {
      const clean = sanitizeWallpaperSettings(next);
      const { error } = await supabase.from("app_settings").upsert({
        key: NEXUS_WALLPAPERS_SETTINGS_KEY,
        value: clean as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      qc.setQueryData(nexusWallpaperSettingsQuery.queryKey, clean);
      await qc.invalidateQueries({ queryKey: ["app-settings", NEXUS_WALLPAPERS_SETTINGS_KEY] });
      toast.success(successMsg);
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save Nexus wallpapers.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleResolvePin = async (rawUrl?: string) => {
    const candidate = (rawUrl ?? mediaUrl).trim();
    if (!isPinterestPinUrl(candidate)) {
      toast.error("Paste a valid pin.it or pinterest.com pin link first.");
      return null;
    }
    setResolving(true);
    try {
      const resolved = await resolvePin({ data: { url: candidate } });
      if (!label.trim()) setLabel(resolved.label);
      setKind(resolved.kind);
      setMediaUrl(resolved.mediaUrl);
      if (resolved.posterUrl) setPosterUrl(resolved.posterUrl);
      setSourceUrl(resolved.sourceUrl);
      toast.success(`Resolved Pinterest ${resolved.kind} wallpaper: ${resolved.label}`);
      return resolved;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resolve Pinterest link.");
      return null;
    } finally {
      setResolving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const isVideo = file.type.startsWith("video/");
      const isGif = file.type === "image/gif";
      if (isVideo || isGif) {
        if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
          toast.error(
            "Uploaded live files must be 4 MB or smaller. For larger videos, paste a direct MP4 URL or Pinterest pin link.",
          );
          return;
        }
        const dataUrl = await readFileAsDataUrl(file);
        setKind("live");
        setMediaUrl(dataUrl);
        if (!label.trim()) setLabel(file.name.replace(/\.[^.]+$/, ""));
        toast.success(`Loaded ${file.name} as live wallpaper.`);
      } else if (file.type.startsWith("image/")) {
        const dataUrl = await fileToDataUrl(file, 1600);
        setKind("static");
        setMediaUrl(dataUrl);
        if (!label.trim()) setLabel(file.name.replace(/\.[^.]+$/, ""));
        toast.success(`Loaded ${file.name} as static wallpaper.`);
      } else {
        toast.error("Choose an MP4/WebM video, animated GIF, or static image (JPG/PNG/WebP).");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read selected file.");
    }
  };

  const addWallpaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || resolving) return;

    let finalMedia = mediaUrl.trim();
    let finalPoster = posterUrl.trim();
    let finalLabel = label.trim();
    let finalKind = kind;
    let finalSource = sourceUrl.trim();

    if (isPinterestPinUrl(finalMedia)) {
      const resolved = await handleResolvePin(finalMedia);
      if (!resolved) return;
      finalMedia = resolved.mediaUrl;
      finalPoster = finalPoster || resolved.posterUrl || "";
      finalLabel = finalLabel || resolved.label;
      finalKind = resolved.kind;
      finalSource = resolved.sourceUrl;
    }

    const validMedia = sanitizeWallpaperUrl(finalMedia);
    if (!validMedia) {
      toast.error("Enter a valid image/video URL, Pinterest link, or upload a file.");
      return;
    }
    if (!finalLabel) {
      toast.error("Give this wallpaper a name.");
      return;
    }

    const validPoster = sanitizeWallpaperUrl(finalPoster) ?? undefined;
    const validSource = sanitizeWallpaperUrl(finalSource) ?? undefined;
    const item: NexusWallpaperItem = {
      id: `custom-${makeSlug(finalLabel)}-${Date.now().toString(36)}`,
      label: finalLabel.slice(0, 80),
      kind: finalKind,
      mediaUrl: validMedia,
      ...(validPoster ? { posterUrl: validPoster } : {}),
      ...(validSource ? { sourceUrl: validSource } : {}),
      builtin: false,
    };

    const nextSettings: NexusWallpaperSettings = {
      ...settings,
      custom: [...(settings.custom ?? []), item],
    };

    const ok = await persist(nextSettings, `Added "${item.label}" to Nexus wallpapers.`);
    if (ok) {
      setLabel("");
      setMediaUrl("");
      setPosterUrl("");
      setSourceUrl("");
    }
  };

  const toggleDefault = async (id: string) => {
    const nextDefault = settings.defaultWallpaperId === id ? null : id;
    await persist(
      { ...settings, defaultWallpaperId: nextDefault },
      nextDefault ? "Default Nexus wallpaper updated." : "Default Nexus wallpaper cleared.",
    );
  };

  const toggleBuiltinVisibility = async (id: string) => {
    const nextDisabled = new Set(settings.disabledIds ?? []);
    if (nextDisabled.has(id)) nextDisabled.delete(id);
    else nextDisabled.add(id);
    await persist(
      { ...settings, disabledIds: [...nextDisabled] },
      nextDisabled.has(id) ? "Preset hidden from Nexus theme drawer." : "Preset restored.",
    );
  };

  const removeCustomWallpaper = async (id: string) => {
    const nextCustom = (settings.custom ?? []).filter((w) => w.id !== id);
    const nextDefault = settings.defaultWallpaperId === id ? null : settings.defaultWallpaperId;
    await persist(
      { ...settings, custom: nextCustom, defaultWallpaperId: nextDefault },
      "Custom wallpaper removed.",
    );
  };

  const previewUrl = sanitizeWallpaperUrl(mediaUrl);

  return (
    <section className="glass rounded-2xl p-5" aria-label="Admin Nexus wallpapers">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-5 w-5 text-accent" />
            Nexus Wallpapers
          </h2>
          <p className="text-xs text-muted-foreground">
            Add live (MP4/WebM/GIF/Pinterest) or static image wallpapers. Applies exclusively to the
            Nexus UI style.
          </p>
        </div>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-accent">
          Nexus only
        </span>
      </div>

      <form
        onSubmit={addWallpaper}
        className="grid gap-4 rounded-xl border border-border/60 bg-background/40 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Wallpaper type</Label>
          <div className="flex gap-1.5" role="group" aria-label="Wallpaper type">
            <button
              type="button"
              onClick={() => setKind("live")}
              aria-pressed={kind === "live"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                kind === "live"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="h-3.5 w-3.5" />
              Live wallpaper
            </button>
            <button
              type="button"
              onClick={() => setKind("static")}
              aria-pressed={kind === "static"}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                kind === "static"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Static wallpaper
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-wp-label">Wallpaper title</Label>
            <Input
              id="admin-wp-label"
              placeholder={kind === "live" ? "e.g. Aether Rift Loop" : "e.g. Sentinels Citadel"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-wp-poster">
              {kind === "live"
                ? "Fallback / poster image URL (optional)"
                : "Source credit URL (optional)"}
            </Label>
            <Input
              id="admin-wp-poster"
              placeholder="https://..."
              value={kind === "live" ? posterUrl : sourceUrl}
              onChange={(e) =>
                kind === "live" ? setPosterUrl(e.target.value) : setSourceUrl(e.target.value)
              }
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="admin-wp-media">
            {kind === "live"
              ? "Video/GIF URL, Pinterest link (pin.it), or upload"
              : "Static image URL or upload"}
          </Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="admin-wp-media"
              className="min-w-0 flex-1"
              placeholder={
                kind === "live"
                  ? "https://...mp4, https://pin.it/..., or upload below"
                  : "https://...jpg / .png / .webp or upload below"
              }
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            {isPinterestPinUrl(mediaUrl) && (
              <Button
                type="button"
                variant="outline"
                disabled={resolving}
                onClick={() => void handleResolvePin()}
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                {resolving ? "Resolving…" : "Resolve Pin"}
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={
                kind === "live"
                  ? "video/mp4,video/webm,image/gif,image/*"
                  : "image/png,image/jpeg,image/webp,image/*"
              }
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Upload {kind === "live" ? "media" : "image"}
            </Button>
          </div>
        </div>

        {previewUrl && !isPinterestPinUrl(previewUrl) && (
          <div className="relative h-28 overflow-hidden rounded-lg border border-border/60 bg-background">
            {kind === "live" && isVideoMediaUrl(previewUrl) ? (
              <video
                src={previewUrl}
                poster={sanitizeWallpaperUrl(posterUrl) ?? undefined}
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover opacity-80"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Wallpaper preview"
                className="h-full w-full object-cover opacity-80"
              />
            )}
            <span className="absolute left-2 top-2 rounded bg-background/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Preview · {kind}
            </span>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || resolving}>
            <Plus className="mr-1.5 h-4 w-4" />
            {saving ? "Saving…" : `Add ${kind} wallpaper`}
          </Button>
        </div>
      </form>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allWallpapers.map((wp) => {
          const isDefault = settings.defaultWallpaperId === wp.id;
          const isDisabled = disabledSet.has(wp.id);
          const isActiveLocal = activeChoice === wp.id;
          const thumb = wp.posterUrl || wp.mediaUrl;

          return (
            <div
              key={wp.id}
              className={`flex flex-col justify-between rounded-xl border p-2.5 text-xs transition ${
                isDefault
                  ? "border-accent bg-accent/10"
                  : isDisabled
                    ? "border-border/40 opacity-60"
                    : "border-border/70 bg-card/30"
              }`}
            >
              <div>
                <div className="relative mb-2 h-24 w-full overflow-hidden rounded-lg bg-secondary/40">
                  {isVideoMediaUrl(wp.mediaUrl) && !wp.posterUrl ? (
                    <video
                      src={wp.mediaUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img src={thumb} alt={wp.label} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
                    {wp.kind}
                  </span>
                  <span className="absolute right-1.5 top-1.5 rounded bg-background/85 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                    {wp.builtin ? "Built-in" : "Custom"}
                  </span>
                </div>
                <p className="truncate font-medium text-foreground">{wp.label}</p>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={isDefault ? "default" : "secondary"}
                  disabled={saving || isDisabled}
                  onClick={() => void toggleDefault(wp.id)}
                  className="h-7 px-2 text-[11px]"
                >
                  {isDefault ? "Default ★" : "Set Default"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isActiveLocal ? "outline" : "ghost"}
                  disabled={isDisabled}
                  onClick={() => {
                    setNexusWallpaperChoice(wp.id);
                    toast.success(`Selected "${wp.label}" for Nexus mode on this device.`);
                  }}
                  className="h-7 px-2 text-[11px]"
                >
                  {isActiveLocal ? "Active" : "Use"}
                </Button>
                {wp.builtin ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={saving}
                    onClick={() => void toggleBuiltinVisibility(wp.id)}
                    className="ml-auto h-7 px-2 text-[11px] text-muted-foreground"
                  >
                    {isDisabled ? "Restore" : "Hide"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${wp.label}`}
                    disabled={saving}
                    onClick={() => void removeCustomWallpaper(wp.id)}
                    className="ml-auto h-7 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
