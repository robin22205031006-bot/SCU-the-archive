import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Last-resort crash guard for the whole app shell. Route-level errors are
 * already handled by the router's errorComponent; this catches anything that
 * escapes it (provider/render failures) so users get a reload screen instead
 * of a frozen blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown) {
    console.error("SCU fatal render error:", error);
    // Usually a stale copy after an update: recover automatically once.
    try {
      const key = "scu-auto-recover-at";
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(key, String(Date.now()));
        void hardReload();
      }
    } catch {
      /* ignore */
    }
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-accent">Archive integrity</p>
          <h1 className="mt-3 text-3xl font-medium glow-text">Failed to load SCU Archives</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something broke while rendering the archive. Your data is safe — reload to reconnect.
          </p>
          <button
            onClick={() => void hardReload()}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition-transform hover:scale-[1.03] active:scale-95"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}

async function hardReload() {
  try {
    // Drop persisted query cache + cached files that may reference old code.
    Object.keys(localStorage)
      .filter((k) => /query|cache/i.test(k) && !k.startsWith("sb-"))
      .forEach((k) => localStorage.removeItem(k));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("r", String(Date.now()));
  window.location.replace(url.toString());
}
