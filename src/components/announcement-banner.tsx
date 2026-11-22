import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Megaphone, X } from "lucide-react";
import { sitePublicQuery } from "@/lib/site-customize";

const DISMISS_KEY = "scu-banner-dismissed";

function readDismissed(): string {
  try {
    return localStorage.getItem(DISMISS_KEY) ?? "";
  } catch {
    return "";
  }
}

const TONE: Record<string, string> = {
  info: "border-accent/50 text-foreground",
  event: "border-amber-400/60 text-foreground",
  warning: "border-destructive/60 text-foreground",
};

/**
 * Admin announcement (Admin → Customize). Sits at the bottom so it never covers the
 * navigation; readers dismiss it per announcement, and a new message shows again.
 */
export function AnnouncementBanner() {
  const { data } = useQuery(sitePublicQuery);
  const [dismissed, setDismissed] = useState("");
  useEffect(() => setDismissed(readDismissed()), []);
  const a = data?.announcement;
  if (!a?.enabled || !a.text || dismissed === a.id) return null;
  const dismiss = () => {
    setDismissed(a.id);
    try {
      localStorage.setItem(DISMISS_KEY, a.id);
    } catch {
      /* storage optional */
    }
  };
  return (
    <div
      role="region"
      aria-label="Announcement"
      className={`glass fixed bottom-4 left-1/2 z-40 flex w-[min(92vw,640px)] -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-2.5 text-sm shadow-lg ${TONE[a.tone] ?? TONE["info"]}`}
      data-tone={a.tone}
    >
      <Megaphone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {a.text}
        {a.linkTo && (
          <>
            {" "}
            <Link
              to={a.linkTo}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {a.linkLabel || "Open"}
            </Link>
          </>
        )}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
