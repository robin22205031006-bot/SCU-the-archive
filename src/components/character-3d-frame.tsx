import { useEffect, useState, type ReactNode } from "react";
import { Box, Image as ImageIcon } from "lucide-react";
import type { Entity } from "@/lib/entities";
import { readCharacter3dAvatars } from "@/lib/models-3d";
import { useUiStyle } from "@/lib/ui-style";
import { useUiToggles } from "@/lib/ui-toggles";
import { useOptionalUIState } from "@/context/UIStateContext";
import { GlbModelViewer } from "@/components/lazy-three";

export interface Character3dFrameProps {
  entity: Entity;
  fallback: ReactNode;
  accentColor?: string | undefined;
  className?: string;
  compact?: boolean;
}

/**
 * Displays a character's 2D artwork or interactive Three.js 3D avatars.
 * Strictly gated so 3D avatars and the 2D/3D toggle ONLY appear when:
 *   1. Active UI mode is "nexus", AND
 *   2. Admin toggle `showNexus3dCharacters` is enabled.
 * In any other UI mode (Classic, Minimal, Manga) or when turned off by admin,
 * it unconditionally renders the 2D fallback with no 3D controls.
 */
export function Character3dFrame({
  entity,
  fallback,
  accentColor,
  className = "",
  compact = false,
}: Character3dFrameProps) {
  const uiStyle = useUiStyle();
  const uiState = useOptionalUIState();
  const toggles = useUiToggles();
  const isNexus = uiState ? uiState.isNexus : uiStyle === "nexus";
  const allowNexus3d = isNexus && toggles.showNexus3dCharacters;

  const avatars = readCharacter3dAvatars(entity);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [avatarIdx, setAvatarIdx] = useState(0);

  // Reset to first avatar / 2D when character changes or Nexus 3D is turned off.
  useEffect(() => {
    setAvatarIdx(0);
    setViewMode("2d");
  }, [entity.id]);

  useEffect(() => {
    if (!allowNexus3d && viewMode !== "2d") {
      setViewMode("2d");
    }
  }, [allowNexus3d, viewMode]);

  if (!allowNexus3d) {
    return <>{fallback}</>;
  }

  const safeIdx = Math.min(avatarIdx, Math.max(0, avatars.length - 1));
  const activeAvatar = avatars[safeIdx] ?? null;
  const showing3d = viewMode === "3d" && !!activeAvatar;

  return (
    <div className={`relative h-full w-full ${className}`} data-testid="character-3d-frame">
      {showing3d && activeAvatar ? (
        <GlbModelViewer
          url={activeAvatar.url}
          alt={`${entity.name} — ${activeAvatar.label}`}
          name={entity.name}
          description={[entity.description, entity.alias, entity.role, entity.category]
            .filter(Boolean)
            .join(" ")}
          tags={[
            ...(entity.abilities ?? []),
            ...(entity.beast_traits ?? []),
            entity.category,
            entity.role,
            entity.character_tier,
            activeAvatar.label,
          ]}
          fallbackImageUrl={entity.image_url}
          accentColor={accentColor ?? entity.theme_color ?? "#38bdf8"}
          compact={compact}
          onFallbackTo2d={() => setViewMode("2d")}
        />
      ) : (
        fallback
      )}

      {/* 2D / 3D Toggle Pill (Nexus UI + Admin Enabled Only) */}
      <div
        role="group"
        aria-label="Character view mode"
        className="absolute left-2 top-2 z-20 inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-[#060a14]/90 p-0.5 text-[10px] font-semibold"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setViewMode("2d")}
          aria-pressed={viewMode === "2d"}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
            viewMode === "2d"
              ? "bg-accent text-accent-foreground"
              : "text-zinc-300 hover:text-white"
          }`}
        >
          <ImageIcon className="size-3" />
          2D
        </button>
        <button
          type="button"
          onClick={() => setViewMode("3d")}
          aria-pressed={viewMode === "3d"}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
            viewMode === "3d"
              ? "bg-accent text-accent-foreground"
              : "text-zinc-300 hover:text-white"
          }`}
        >
          <Box className="size-3" />
          3D
        </button>
      </div>

      {/* Multi-Avatar Selector Pills (Nexus UI + Admin Enabled + >1 Avatar) */}
      {avatars.length > 1 && (
        <div
          role="group"
          aria-label="3D character avatars"
          className="absolute right-2 top-2 z-20 flex max-w-[60%] flex-wrap justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {avatars.map((av, idx) => (
            <button
              key={av.id}
              type="button"
              onClick={() => {
                setAvatarIdx(idx);
                setViewMode("3d");
              }}
              aria-pressed={showing3d && safeIdx === idx}
              className={`truncate rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                showing3d && safeIdx === idx
                  ? "border-accent bg-accent/25 text-white"
                  : "border-white/20 bg-[#060a14]/88 text-zinc-300 hover:border-accent/60 hover:text-white"
              }`}
            >
              {av.label}
            </button>
          ))}
        </div>
      )}

      {/* Subtle hint if user toggled 3D on a character with no uploaded .glb */}
      {viewMode === "3d" && !activeAvatar && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 rounded-md border border-white/15 bg-[#060a14]/92 px-2 py-1 text-center text-[10px] text-zinc-200">
          No 3D avatar uploaded — showing 2D portrait
        </div>
      )}
    </div>
  );
}
