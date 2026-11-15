import { useEffect, useRef } from "react";
import { Bookmark, Check, Pin, PinOff, Share2, X } from "lucide-react";
import { clampContextMenuPosition } from "@/lib/lore-card-actions";

export interface LoreCardContextMenuProps {
  open: boolean;
  displayName: string;
  anchorX: number;
  anchorY: number;
  isBookmarked: boolean;
  isPinned: boolean;
  onBookmark: () => void;
  onShare: () => void;
  onPin: () => void;
  onClose: () => void;
}

const MENU_ESTIMATED_WIDTH = 236;
const MENU_ESTIMATED_HEIGHT = 204;

export function LoreCardContextMenu({
  open,
  displayName,
  anchorX,
  anchorY,
  isBookmarked,
  isPinned,
  onBookmark,
  onShare,
  onPin,
  onClose,
}: LoreCardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const firstButton = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstButton?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
        );
        if (items.length === 0) return;
        e.preventDefault();
        const activeIdx = items.indexOf(document.activeElement as HTMLButtonElement);
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx = activeIdx < 0 ? 0 : (activeIdx + dir + items.length) % items.length;
        items[nextIdx]?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const vw = typeof window !== "undefined" && window.innerWidth > 0 ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" && window.innerHeight > 0 ? window.innerHeight : 768;
  const { left, top } = clampContextMenuPosition(
    anchorX,
    anchorY,
    MENU_ESTIMATED_WIDTH,
    MENU_ESTIMATED_HEIGHT,
    vw,
    vh,
    12,
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Quick actions for ${displayName}`}
      data-lore-context-menu="true"
      style={{ left: `${left}px`, top: `${top}px`, width: `${MENU_ESTIMATED_WIDTH}px` }}
      className="fixed z-[110] rounded-xl border border-gray-600/90 bg-gray-950/95 p-1.5 text-white shadow-2xl ring-1 ring-black/60 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 px-2.5 py-1.5 mb-1">
        <span className="truncate text-xs font-semibold tracking-wide text-red-300">
          {displayName}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close actions menu"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onBookmark();
          onClose();
        }}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-100 transition-colors hover:bg-gray-800/90 focus:bg-gray-800 focus:outline-none"
      >
        <span className="flex items-center gap-2.5">
          <Bookmark
            className={`h-4 w-4 ${isBookmarked ? "fill-amber-400 text-amber-300" : "text-amber-300"}`}
            aria-hidden="true"
          />
          <span>{isBookmarked ? "Remove bookmark" : "Bookmark"}</span>
        </span>
        {isBookmarked && <Check className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />}
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onShare();
          onClose();
        }}
        className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-100 transition-colors hover:bg-gray-800/90 focus:bg-gray-800 focus:outline-none"
      >
        <Share2 className="h-4 w-4 text-sky-400" aria-hidden="true" />
        <span>Share</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onPin();
          onClose();
        }}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-100 transition-colors hover:bg-gray-800/90 focus:bg-gray-800 focus:outline-none"
      >
        <span className="flex items-center gap-2.5">
          {isPinned ? (
            <PinOff className="h-4 w-4 text-red-400" aria-hidden="true" />
          ) : (
            <Pin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          )}
          <span>{isPinned ? "Unpin entry" : "Pin for quick access"}</span>
        </span>
        {isPinned && <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />}
      </button>
    </div>
  );
}
