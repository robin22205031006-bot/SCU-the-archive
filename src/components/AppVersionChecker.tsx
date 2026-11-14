import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useOptionalThemeContext } from "@/context/ThemeContext";
import { useVisualMode } from "@/hooks/use-ui-mode";
import { getThemeMotionSpec } from "@/lib/motionVariants";
import { useSensoryFeedback } from "@/hooks/use-sensory-feedback";

export const APP_VERSION = import.meta.env["VITE_APP_VERSION"] || "1.0.0";
const DEFAULT_VERSION_URL = import.meta.env["VITE_VERSION_CHECK_URL"] || "/version.json";
const DISMISS_STORAGE_KEY = "scu-dismissed-apk-version";

export interface RemoteVersionManifest {
  version: string;
  apkUrl: string;
  notes?: string[] | undefined;
  releasedAt?: string | undefined;
}

export function compareSemver(a: string, b: string): number {
  const clean = (v: string) =>
    v
      .replace(/^v/i, "")
      .split("-")[0]!
      .split(".")
      .map((n) => {
        const parsed = Number.parseInt(n, 10);
        return Number.isFinite(parsed) ? parsed : 0;
      });
  const pa = clean(a);
  const pb = clean(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

export interface AppVersionCheckerProps {
  currentVersion?: string;
  versionUrl?: string;
  disabled?: boolean;
}

export function AppVersionChecker({
  currentVersion = APP_VERSION,
  versionUrl = DEFAULT_VERSION_URL,
  disabled = false,
}: AppVersionCheckerProps) {
  const [update, setUpdate] = useState<RemoteVersionManifest | null>(null);
  const [open, setOpen] = useState(false);

  const themeCtx = useOptionalThemeContext();
  const modeFallback = useVisualMode();
  const primary = themeCtx?.primarySystem ?? modeFallback;
  const sub = themeCtx?.mangaSubTheme ?? null;
  const motionSpec = getThemeMotionSpec(primary, sub);
  const { playTap, playCta } = useSensoryFeedback();

  useEffect(() => {
    if (disabled || typeof fetch === "undefined") return;
    let cancelled = false;

    const runCheck = async () => {
      try {
        const res = await fetch(versionUrl, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Partial<RemoteVersionManifest>;
        if (!data.version || !data.apkUrl) return;
        if (compareSemver(data.version, currentVersion) <= 0) return;
        try {
          if (localStorage.getItem(DISMISS_STORAGE_KEY) === data.version) return;
        } catch {
          /* ignore storage errors */
        }
        if (!cancelled) {
          setUpdate({
            version: data.version,
            apkUrl: data.apkUrl,
            notes: Array.isArray(data.notes) ? data.notes : [],
            releasedAt: data.releasedAt,
          });
          setOpen(true);
        }
      } catch {
        /* offline or test environment — silent no-op */
      }
    };

    void runCheck();
    return () => {
      cancelled = true;
    };
  }, [currentVersion, versionUrl, disabled]);

  const handleDismiss = () => {
    playTap();
    if (update) {
      try {
        localStorage.setItem(DISMISS_STORAGE_KEY, update.version);
      } catch {
        /* storage optional */
      }
    }
    setOpen(false);
  };

  const isFantasy = primary === "manga" && sub === "fantasy";

  return (
    <AnimatePresence>
      {open && update && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="apk-update-title"
          data-testid="app-version-checker-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            variants={motionSpec.modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={
              isFantasy
                ? "relative w-full max-w-md rounded-xl border-2 border-[#C5A869] bg-[#15221B] p-1 text-[#F5EBE6] shadow-[0_0_32px_rgba(92,225,184,0.28)]"
                : "relative w-full max-w-md rounded-2xl border-2 border-border bg-card p-5 text-card-foreground shadow-2xl"
            }
          >
            <div
              className={
                isFantasy
                  ? "parchment-dot-grid rounded-lg border border-[#C5A869]/70 bg-[#F5EBE6] p-5 text-[#15221B]"
                  : "space-y-4"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] ${
                      isFantasy ? "text-[#2E5A52]" : "text-primary"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Archive Update Available
                  </span>
                  <h2
                    id="apk-update-title"
                    className="mt-1 font-display text-2xl font-bold uppercase tracking-wide"
                  >
                    SCU Build v{update.version}
                  </h2>
                  <p
                    className={`mt-0.5 font-mono text-[11px] ${
                      isFantasy ? "text-[#2E5A52]/80" : "text-muted-foreground"
                    }`}
                  >
                    Installed: v{currentVersion}
                    {update.releasedAt ? ` · Released ${update.releasedAt}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss update notification"
                  onClick={handleDismiss}
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${
                    isFantasy
                      ? "border-[#C5A869] bg-[#15221B] text-[#F5EBE6] hover:border-[#5CE1B8]"
                      : "border-border bg-secondary text-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {update.notes && update.notes.length > 0 && (
                <div
                  className={`mt-3 rounded-lg border p-3 ${
                    isFantasy
                      ? "border-[#C5A869]/55 bg-[#E6DCC5]/65"
                      : "border-border/60 bg-background/60"
                  }`}
                >
                  <p className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-widest opacity-80">
                    Release Notes
                  </p>
                  <ul className="space-y-1 text-xs leading-relaxed">
                    {update.notes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className={isFantasy ? "text-[#2E5A52]" : "text-primary"}
                        >
                          ✦
                        </span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className={`rounded-md border px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition ${
                    isFantasy
                      ? "border-[#C5A869] bg-transparent text-[#15221B] hover:bg-[#E6DCC5]"
                      : "border-border bg-background text-foreground hover:bg-secondary"
                  }`}
                >
                  Later
                </button>
                <a
                  href={update.apkUrl}
                  download={`SCU-Archive-v${update.version}.apk`}
                  onClick={() => playCta()}
                  className={
                    isFantasy
                      ? "fantasy-discover-btn inline-flex items-center gap-2 rounded-md border border-[#C5A869] px-4 py-2 font-display text-xs font-bold uppercase tracking-widest text-[#F5EBE6]"
                      : "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground shadow hover:opacity-90"
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Download APK
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
