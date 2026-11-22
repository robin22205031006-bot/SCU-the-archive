import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin-editable public site settings, stored in app_settings under `site_public`.
 * Readable by anyone (migration 0016: the home page is public), writable by admins
 * only (migration 0015). Keep it small and non-sensitive.
 */
export const SITE_PUBLIC_KEY = "site_public";

export type AnnouncementTone = "info" | "event" | "warning";

export interface SitePublicSettings {
  siteTitle: string;
  kicker: string;
  tagline: string;
  announcement: {
    enabled: boolean;
    /** Changes whenever the message changes, so a new announcement shows again. */
    id: string;
    text: string;
    tone: AnnouncementTone;
    linkTo: string;
    linkLabel: string;
  };
}

/** Today's strings, so nothing changes until an admin edits the settings. */
export const DEFAULT_SITE_PUBLIC: SitePublicSettings = {
  siteTitle: "Sentinels Cinematic Universe",
  kicker: "The Archive",
  tagline:
    "Serialized Index — characters, bloodlines, cursed weapons, and five eras of canon chronology.",
  announcement: { enabled: false, id: "", text: "", tone: "info", linkTo: "", linkLabel: "" },
};

const clip = (v: unknown, max: number, fallback: string) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

/** Validates stored JSON: clips lengths, enforces enums and app-internal links only. */
export function sanitizeSitePublic(value: unknown): SitePublicSettings {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const a = (
    v["announcement"] && typeof v["announcement"] === "object" ? v["announcement"] : {}
  ) as Record<string, unknown>;
  const tone = a["tone"] === "event" || a["tone"] === "warning" ? a["tone"] : "info";
  const link = typeof a["linkTo"] === "string" ? a["linkTo"].trim() : "";
  const text = clip(a["text"], 240, "");
  return {
    siteTitle: clip(v["siteTitle"], 60, DEFAULT_SITE_PUBLIC.siteTitle),
    kicker: clip(v["kicker"], 40, DEFAULT_SITE_PUBLIC.kicker),
    tagline: clip(v["tagline"], 200, DEFAULT_SITE_PUBLIC.tagline),
    announcement: {
      enabled: a["enabled"] === true && text.length > 0,
      id: clip(a["id"], 40, text ? announcementId(text) : ""),
      text,
      tone,
      // Only in-app paths: a public banner must never point readers off-site.
      linkTo: /^\/[\w\-/?=&#.]*$/.test(link) ? link.slice(0, 80) : "",
      linkLabel: clip(a["linkLabel"], 30, ""),
    },
  };
}

/** Stable short id for a message, so dismissals reset when the text changes. */
export function announcementId(text: string): string {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `a${(h >>> 0).toString(36)}`;
}

/** "Sentinels Cinematic Universe" -> ["Sentinels", "Cinematic Universe"] for the Classic hero. */
export function splitTitle(title: string): [string, string] {
  const [first, ...rest] = title.trim().split(/\s+/);
  return [first ?? title, rest.join(" ")];
}

export const sitePublicQuery = queryOptions({
  queryKey: ["app-settings", SITE_PUBLIC_KEY],
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  queryFn: async (): Promise<SitePublicSettings> => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", SITE_PUBLIC_KEY)
      .maybeSingle();
    if (error) return DEFAULT_SITE_PUBLIC;
    return sanitizeSitePublic(data?.value);
  },
});
