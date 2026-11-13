import { useEffect, useState } from "react";
import {
  isVideoMediaUrl,
  type NexusWallpaperItem,
  type NexusWallpaperKind,
} from "@/lib/nexus-wallpapers";

export function NexusWallpaperBackdrop({
  wallpaper,
  moving,
  playback = "live",
}: {
  wallpaper: NexusWallpaperItem | null;
  moving: boolean;
  playback?: NexusWallpaperKind | undefined;
}) {
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
  }, [wallpaper?.id, wallpaper?.mediaUrl]);

  if (!wallpaper) return null;

  const isVideo = isVideoMediaUrl(wallpaper.mediaUrl);
  const shouldPlayLive =
    wallpaper.kind === "live" && playback === "live" && moving && isVideo && !videoFailed;
  const staticSrc = isVideo && wallpaper.posterUrl ? wallpaper.posterUrl : wallpaper.mediaUrl;

  return (
    <div
      aria-hidden="true"
      data-testid="nexus-wallpaper-backdrop"
      data-nexus-wallpaper={wallpaper.id}
      data-nexus-wallpaper-mode={shouldPlayLive ? "live" : "static"}
      className="nexus-wallpaper-media pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
    >
      {shouldPlayLive ? (
        <video
          key={wallpaper.mediaUrl}
          src={wallpaper.mediaUrl}
          poster={wallpaper.posterUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
          className="h-full w-full object-cover opacity-55 transition-opacity duration-500"
        />
      ) : (
        <img
          key={staticSrc}
          src={staticSrc}
          alt=""
          loading="eager"
          decoding="async"
          className="h-full w-full object-cover opacity-48 transition-opacity duration-500"
        />
      )}
    </div>
  );
}
