import type { LorePinItem } from "./lore-pins";

export const LONG_PRESS_DELAY_MS = 450;
export const LONG_PRESS_MOVE_THRESHOLD_PX = 8;

const INTERACTIVE_TAGS = new Set(["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA", "OPTION", "LABEL"]);
const INTERACTIVE_ROLES = new Set(["button", "link", "menuitem", "tab", "option"]);

export interface MinimalElementLike {
  tagName?: string | undefined;
  role?: string | null | undefined;
  isContentEditable?: boolean | undefined;
  getAttribute?: ((name: string) => string | null) | undefined;
  closest?: ((selector: string) => unknown) | undefined;
}

/** Returns true if a pointer movement exceeds the touch-hold drift threshold (scroll/drag). */
export function shouldCancelLongPress(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  thresholdPx: number = LONG_PRESS_MOVE_THRESHOLD_PX,
): boolean {
  const dx = currentX - startX;
  const dy = currentY - startY;
  return dx * dx + dy * dy > thresholdPx * thresholdPx;
}

/**
 * Ignores pointer holds that start inside child controls (`<select>`, `<button>`, `<a href>`, etc.)
 * so long-press gestures never fight normal card actions or dropdown selects.
 */
export function isInteractiveLongPressTarget(target: unknown, stopAt?: unknown): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as MinimalElementLike;

  if (el.isContentEditable) return true;

  if (typeof el.closest === "function") {
    const match = el.closest(
      'button, a[href], input, select, textarea, [role="button"], [role="menuitem"], [role="tab"]',
    );
    if (match && match !== stopAt) return true;
  }

  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
  if (INTERACTIVE_TAGS.has(tag)) return true;

  const role =
    (typeof el.getAttribute === "function" ? el.getAttribute("role") : el.role)?.toLowerCase() ??
    "";
  if (INTERACTIVE_ROLES.has(role)) return true;

  return false;
}

/** Clamps a floating context menu inside the viewport with safe edge padding. */
export function clampContextMenuPosition(
  anchorX: number,
  anchorY: number,
  menuWidth: number,
  menuHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 12,
): { left: number; top: number } {
  const safeW = Math.max(viewportWidth, menuWidth + padding * 2);
  const safeH = Math.max(viewportHeight, menuHeight + padding * 2);
  const maxLeft = safeW - menuWidth - padding;
  const maxTop = safeH - menuHeight - padding;

  return {
    left: Math.round(Math.max(padding, Math.min(anchorX, maxLeft))),
    top: Math.round(Math.max(padding, Math.min(anchorY, maxTop))),
  };
}

export interface LoreSharePayload {
  title: string;
  text: string;
  url: string;
  clipboardText: string;
}

export function buildLoreSharePayload(
  item: LorePinItem,
  itemKey: string,
  baseUrl?: string,
): LoreSharePayload {
  const title = (item.name || item.event_name || item.title || "SCU Lore Entry").trim();
  const tier = (item.tier ?? item.character_tier ?? "").trim();
  const category = (item.category || item.faction || item.role || item.era || "").trim();
  const summaryRaw = (item.bio || item.description || item.lore || "").trim();
  const summary = summaryRaw.length > 160 ? `${summaryRaw.slice(0, 157)}…` : summaryRaw;

  const metaParts = [tier, category].filter(Boolean);
  const headerLine = metaParts.length > 0 ? `${title} (${metaParts.join(" · ")})` : title;

  let url = "";
  const origin =
    baseUrl ?? (typeof window !== "undefined" && window.location?.href ? window.location.href : "");
  if (origin) {
    try {
      const parsed = new URL(origin);
      parsed.searchParams.set("lore", itemKey);
      url = parsed.toString();
    } catch {
      url = origin;
    }
  }

  const text = summary ? `${headerLine} — ${summary}` : headerLine;
  const clipboardText = url ? `${text}\n${url}` : text;

  return { title, text, url, clipboardText };
}

export interface ShareRuntimeDeps {
  share?: ((data: { title?: string; text?: string; url?: string }) => Promise<void>) | undefined;
  writeClipboard?: ((text: string) => Promise<void>) | undefined;
}

export interface LoreShareResult {
  status: "shared" | "copied" | "cancelled" | "unavailable";
  message: string;
}

export async function executeLoreShare(
  payload: LoreSharePayload,
  deps?: ShareRuntimeDeps,
): Promise<LoreShareResult> {
  const shareFn =
    deps?.share ??
    (typeof navigator !== "undefined" && typeof navigator.share === "function"
      ? (data: { title?: string; text?: string; url?: string }) => navigator.share(data)
      : undefined);

  if (shareFn) {
    try {
      await shareFn({
        title: payload.title,
        text: payload.text,
        ...(payload.url ? { url: payload.url } : {}),
      });
      return { status: "shared", message: `Shared ${payload.title}` };
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "name" in err &&
        (err as { name: string }).name === "AbortError"
      ) {
        return { status: "cancelled", message: "Share cancelled" };
      }
      // Fall through to clipboard fallback when Web Share is unsupported/blocked in iframes
    }
  }

  const writeClipboard =
    deps?.writeClipboard ??
    (typeof navigator !== "undefined" && navigator.clipboard?.writeText
      ? (text: string) => navigator.clipboard.writeText(text)
      : undefined);

  if (writeClipboard) {
    try {
      await writeClipboard(payload.clipboardText);
      return { status: "copied", message: `Copied share link for ${payload.title}` };
    } catch {
      /* fallback exhausted */
    }
  }

  return { status: "unavailable", message: `Ready to share: ${payload.title}` };
}
