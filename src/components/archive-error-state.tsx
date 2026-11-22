import { useEffect, useState } from "react";
import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, Compass, Home, RefreshCw } from "lucide-react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

const STALE_CHUNK =
  /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch dynamically/i;

/**
 * Route-level error screen. Registered as the router's defaultErrorComponent so a
 * failing page renders inside the shell (navigation stays usable) instead of
 * bubbling to the app-wide boundary, which reloads everything. Colours come from
 * theme tokens, so it matches every UI style and Light/Dark mode.
 */
export function ArchiveErrorState({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const message = error instanceof Error ? error.message : String(error ?? "");
  const staleBuild = STALE_CHUNK.test(message);

  useEffect(() => {
    reportLovableError(error, { boundary: "route_error_component" });
  }, [error]);

  return (
    <main
      role="alert"
      className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col items-center justify-center px-5 py-16 text-center"
    >
      <div className="glass w-full rounded-2xl border border-border p-7">
        <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Archive error</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">
          {staleBuild ? "The archive was updated" : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {staleBuild
            ? "A newer version is available. Reload to continue where you were."
            : "Something went wrong on this page. The rest of the archive still works."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {staleBuild ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reload app
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void router.invalidate();
                reset();
              }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Link>
        </div>
        {message && (
          <div className="mt-5 text-left">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              aria-expanded={showDetails}
            >
              {showDetails ? "Hide technical details" : "Show technical details"}
            </button>
            {showDetails && (
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 text-[11px] text-muted-foreground">
                {message}
              </pre>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

const QUICK_LINKS = [
  { to: "/characters", label: "Characters" },
  { to: "/abilities", label: "Abilities" },
  { to: "/series", label: "Series" },
  { to: "/archive", label: "Archive" },
] as const;

/** Style-aware 404: transparent so each style's backdrop shows, with ways back in. */
export function ArchiveNotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] w-full max-w-lg flex-col items-center justify-center px-5 py-16 text-center">
      <div className="glass w-full rounded-2xl border border-border p-7">
        <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent">
          <Compass className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">404 · Lost page</p>
        <h1 className="mt-2 text-2xl font-medium text-foreground">
          This page isn't in the archive
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may be old or mistyped. Try one of these instead.
        </p>
        <nav aria-label="Quick links" className="mt-5 flex flex-wrap justify-center gap-2">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-accent hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Go home
        </Link>
      </div>
    </main>
  );
}
