import { supabase } from "@/integrations/supabase/client";
import type { Entity } from "@/lib/entities";

export const MODELS_3D_BUCKET = "models-3d";

export interface Avatar3dEntry {
  id: string;
  label: string;
  url: string;
}

function sanitizeSegment(raw: string | undefined): string {
  const cleaned = (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "model";
}

/**
 * Upload a .glb / .gltf 3D asset to the Supabase `models-3d` public storage bucket
 * inside either `characters/` or `arsenals/` and return its public URL.
 */
export async function uploadModel3d(
  file: File,
  folder: "characters" | "arsenals",
  nameHint?: string,
): Promise<string> {
  const extMatch = file.name.toLowerCase().match(/\.(glb|gltf)$/);
  if (!extMatch) {
    throw new Error("Please select a valid .glb or .gltf 3D model file.");
  }
  const ext = extMatch[1];
  const baseHint = sanitizeSegment(nameHint || file.name.replace(/\.(glb|gltf)$/i, ""));
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = `${folder}/${baseHint}-${unique}.${ext}`;

  const { error } = await supabase.storage.from(MODELS_3D_BUCKET).upload(path, file, {
    contentType: ext === "gltf" ? "model/gltf+json" : "model/gltf-binary",
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "Failed to upload 3D model to storage.");
  }

  const { data } = supabase.storage.from(MODELS_3D_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Uploaded 3D model, but could not resolve its public URL.");
  }
  return data.publicUrl;
}

/**
 * Reads all normalized 3D avatars for a character (`stats.avatars_3d` + `model_3d_url`).
 * Used only inside Nexus UI and admin edit modals.
 */
export function readCharacter3dAvatars(
  entity: Pick<Entity, "model_3d_url" | "stats"> | null | undefined,
): Avatar3dEntry[] {
  if (!entity) return [];
  const rawStats = (entity.stats ?? {}) as Record<string, unknown>;
  const rawList = rawStats["avatars_3d"];
  const list: Avatar3dEntry[] = [];
  const seenUrls = new Set<string>();

  if (Array.isArray(rawList)) {
    rawList.forEach((item, idx) => {
      if (!item || typeof item !== "object") return;
      const rec = item as Record<string, unknown>;
      const url = typeof rec["url"] === "string" ? rec["url"].trim() : "";
      if (!url || seenUrls.has(url)) return;
      seenUrls.add(url);
      const id =
        typeof rec["id"] === "string" && rec["id"].trim() ? rec["id"].trim() : `avatar-${idx + 1}`;
      const label =
        typeof rec["label"] === "string" && rec["label"].trim()
          ? rec["label"].trim()
          : `Avatar ${idx + 1}`;
      list.push({ id, label, url });
    });
  }

  const primary = typeof entity.model_3d_url === "string" ? entity.model_3d_url.trim() : "";
  if (primary && !seenUrls.has(primary)) {
    list.unshift({
      id: "primary",
      label: list.length === 0 ? "Primary 3D" : "Default 3D",
      url: primary,
    });
  }

  return list;
}

/** Derive a clean display label from an uploaded filename. */
export function labelFromModelFilename(filename: string, fallbackIndex: number): string {
  const stem = filename
    .replace(/\.(glb|gltf)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!stem) return `Avatar ${fallbackIndex}`;
  return stem.slice(0, 32);
}
