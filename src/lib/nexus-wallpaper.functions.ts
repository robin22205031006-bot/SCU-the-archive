import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPinterestPinUrl, type NexusWallpaperKind } from "./nexus-wallpapers";

const inputSchema = z.object({
  url: z.string().url().max(500),
});

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export const resolvePinterestWallpaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => inputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: roleRows, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error(roleErr.message);
    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Forbidden: admin access required.");

    if (!isPinterestPinUrl(data.url)) {
      throw new Error("Only Pinterest URLs (pin.it or pinterest.com) can be resolved here.");
    }

    const res = await fetch(data.url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
    });
    if (!res.ok) {
      throw new Error(`Could not fetch Pinterest link (status ${res.status}).`);
    }

    const html = await res.text();
    const rawTitle =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1] ??
      html.match(/<title>([^<]+)/i)?.[1] ??
      "Pinterest Nexus Wallpaper";
    const label =
      decodeHtmlEntities(rawTitle.split("|")[0] ?? rawTitle).slice(0, 60) || "Pinterest Wallpaper";

    const ogImg =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] ??
      html.match(/content=["']([^"']+)["'][^>]+property=["']og:image/i)?.[1] ??
      "";
    const originals = [
      ...html.matchAll(
        /https:\/\/i\.pinimg\.com\/originals\/[a-f0-9/]+\.(?:jpg|jpeg|png|webp|gif)/gi,
      ),
    ]
      .map((m) => m[0])
      .filter((u) => !u.endsWith("d53b014d86a6b6761bf649a0ed813c2b.png"));

    const posterUrl = originals[0] || ogImg || undefined;

    const mp4Matches = [
      ...new Set(
        [...html.matchAll(/https:\/\/v1?\.pinimg\.com\/[^"'\s<>\\]+\.mp4[^"'\s<>\\]*/gi)].map(
          (m) => m[0],
        ),
      ),
    ];
    let mediaUrl =
      mp4Matches.find((u) => u.includes("/720p/") || u.includes("_720w")) ?? mp4Matches[0] ?? "";

    // Pinterest video pins often expose HLS .m3u8 or thumbnail hash when MP4 isn't directly inlined in HTML.
    if (!mediaUrl) {
      const thumbMatch = html.match(
        /https:\/\/i\.pinimg\.com\/videos\/thumbnails\/originals\/([a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+)/i,
      );
      const hash = thumbMatch?.[1];
      if (hash) {
        const candidates = [
          `https://v1.pinimg.com/videos/mc/720p/${hash}.mp4`,
          `https://v1.pinimg.com/videos/iht/expMp4/${hash}_720w.mp4`,
          `https://v1.pinimg.com/videos/mc/expMp4/${hash}_t1.mp4`,
        ];
        for (const candidate of candidates) {
          const check = await fetch(candidate, { method: "HEAD" }).catch(() => null);
          if (check?.ok) {
            mediaUrl = candidate;
            break;
          }
        }
      }
    }

    const gifMatch = html.match(/https:\/\/i\.pinimg\.com\/originals\/[^"'\s<>\\]+\.gif/i)?.[0];
    if (!mediaUrl && gifMatch) mediaUrl = gifMatch;

    const kind: NexusWallpaperKind = mediaUrl ? "live" : "static";
    const resolvedMedia = mediaUrl || posterUrl;
    if (!resolvedMedia) {
      throw new Error("Could not find an image or video wallpaper in that Pinterest pin.");
    }

    return {
      label,
      kind,
      mediaUrl: resolvedMedia,
      ...(posterUrl ? { posterUrl } : {}),
      sourceUrl: data.url,
    };
  });
