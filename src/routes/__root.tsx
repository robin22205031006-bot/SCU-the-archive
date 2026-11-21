import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { SiteNav } from "@/components/site-nav";
import { FloatingNav } from "@/components/floating-nav";
import { AmbientField } from "@/components/ambient-field";
import { ScrollProgress } from "@/components/scroll-progress";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UiModeProvider, useUiMode } from "@/hooks/use-ui-mode";
import { AuthProvider } from "@/context/AuthContext";
import { AbilityProvider } from "@/context/AbilityContext";
import { UIStateProvider } from "@/context/UIStateContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useScuAudioGlobal } from "@/hooks/use-scu-audio";
import { usePreloadUIFeedback } from "@/hooks/use-ui-feedback";
import { useAmbientAtmosphereSync } from "@/lib/ambient-atmosphere";
import { ErrorBoundary } from "@/components/error-boundary";
import { MotionConfig } from "framer-motion";
import { useAppMotion } from "@/hooks/use-app-motion";
import { useCardSpotlight } from "@/hooks/use-card-spotlight";
import { useRef } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

// Mode-specific chrome and decorative FX are not needed for first paint, so they
// load in their own chunks instead of blocking the initial bundle.
const NexusChrome = lazy(() =>
  import("@/components/nexus-shell").then((m) => ({ default: m.NexusChrome })),
);
const MangaChrome = lazy(() =>
  import("@/components/manga-shell").then((m) => ({ default: m.MangaChrome })),
);
const CinematicChrome = lazy(() =>
  import("@/components/cinematic-shell").then((m) => ({ default: m.CinematicChrome })),
);
const NexusSectionRailAside = lazy(() =>
  import("@/components/nexus-section-rail").then((m) => ({ default: m.NexusSectionRailAside })),
);
const PlexusWallpaper = lazy(() =>
  import("@/components/plexus-wallpaper").then((m) => ({ default: m.PlexusWallpaper })),
);
const WelcomeVfx = lazy(() =>
  import("@/components/welcome-vfx").then((m) => ({ default: m.WelcomeVfx })),
);
const AmbientStudioParticles = lazy(() =>
  import("@/components/ambient-studio-particles").then((m) => ({
    default: m.AmbientStudioParticles,
  })),
);
const AnimeActionOverlay = lazy(() =>
  import("@/components/anime-action-overlay").then((m) => ({ default: m.AnimeActionOverlay })),
);
const AppVersionChecker = lazy(() =>
  import("@/components/AppVersionChecker").then((m) => ({ default: m.AppVersionChecker })),
);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // SPA mode: the app is fully client-rendered. SSR 500s on TanStack Start
  // are eliminated because no route renders on the server; server functions
  // (auth-gated ingest/AI/roles) still work over fetch.
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "SCU - The Archive" },
      {
        name: "description",
        content:
          "The interactive archive and lore explorer for the Sentinels Cinematic Universe (SCU).",
      },
      { property: "og:title", content: "SCU - The Archive" },
      {
        property: "og:description",
        content:
          "The interactive archive and lore explorer for the Sentinels Cinematic Universe (SCU).",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#0a0d14" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Sentinels" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        media: "print",
        "data-async-font": "",
        href: "https://fonts.googleapis.com/css2?family=Google+Sans:wght@500&display=swap",
      },
      {
        rel: "stylesheet",
        media: "print",
        "data-async-font": "",
        href: "https://fonts.googleapis.com/css2?family=Bangers&family=Cinzel:wght@600;700;800&family=Comic+Neue:ital,wght@0,400;0,700;1,700&family=Cormorant+Garamond:wght@400;500;600&family=Manrope:wght@400;500;600&family=Montserrat:wght@700;800;900&family=Nunito:wght@400;600;700&family=Oswald:wght@500;700&family=Rajdhani:wght@400;500;600;700&family=Shippori+Mincho:wght@600;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Recovers from a white screen caused by an outdated cached copy after an update:
// if app files fail to load, clear caches and reload once (at most every 60s).
const STALE_RECOVERY = `(function(){var K="scu-stale-reload";function go(){try{var t=+sessionStorage.getItem(K)||0;if(Date.now()-t<60000)return;sessionStorage.setItem(K,String(Date.now()));}catch(e){}var done=function(){var u=new URL(location.href);u.searchParams.set("r",String(Date.now()));location.replace(u.toString());};try{var p=[];if(window.caches)p.push(caches.keys().then(function(k){return Promise.all(k.map(function(x){return caches.delete(x)}))}));if(navigator.serviceWorker)p.push(navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}));Promise.all(p).then(done,done);}catch(e){done();}}window.addEventListener("vite:preloadError",function(e){e.preventDefault();go();});window.addEventListener("error",function(e){var t=e.target;if(t&&(t.tagName==="SCRIPT"||t.tagName==="LINK")&&/\\/assets\\//.test(t.src||t.href||""))go();},true);window.addEventListener("unhandledrejection",function(e){var m=String(e.reason&&e.reason.message||e.reason||"");if(/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(m))go();});setTimeout(function(){var b=document.body;if(b&&!b.innerText.trim()&&!document.querySelector("canvas,img,svg"))go();},12000);})();`;

// Google Fonts stylesheets are render-blocking by default. They ship with media="print"
// so the page paints immediately, then switch to "all" once downloaded (display=swap).
const ASYNC_FONTS = `(function(){document.querySelectorAll("link[data-async-font]").forEach(function(l){function s(){l.media="all"}if(l.sheet)s();else l.addEventListener("load",s,{once:true})})})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ backgroundColor: "#020408", colorScheme: "dark" }}>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: STALE_RECOVERY }} />
        <script dangerouslySetInnerHTML={{ __html: ASYNC_FONTS }} />
      </head>
      <body style={{ backgroundColor: "#020408" }}>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootContent({ offline }: { offline: boolean }) {
  const { mode } = useUiMode();
  const { pathname } = useLocation();
  const isInitialRoutePending = useRouterState({
    select: (s) =>
      s.status === "pending" &&
      !s.matches.some((m) => m.routeId !== "__root__" && m.status === "success"),
  });
  const { isMinimal, motionActive, spec } = useAppMotion();
  const pageContainerRef = useRef<HTMLDivElement>(null);
  useCardSpotlight((mode === "classic" || mode === "cinematic") && motionActive);
  const outletContainerRef = useRef<HTMLDivElement>(null);
  const pageSlug = pathname.slice(1) || "home";
  const showNexusRail =
    mode === "nexus" && ["/admin", "/profile", "/reader", "/ingest", "/ai"].includes(pathname);

  return (
    <MotionConfig
      reducedMotion={isMinimal || !motionActive ? "always" : "user"}
      transition={motionActive ? spec.transition : { duration: 0 }}
    >
      <div
        data-ui-mode={mode}
        data-motion={motionActive ? "on" : "off"}
        className={`relative min-h-screen ${
          mode === "minimal"
            ? "minimal-shell"
            : mode === "nexus"
              ? "nexus-shell min-h-dvh"
              : mode === "manga"
                ? "manga-root manga-shell min-h-dvh text-foreground selection:bg-foreground selection:text-background"
                : mode === "cinematic"
                  ? "cinematic-shell min-h-dvh"
                  : "ambient-bg"
        }`}
      >
        {mode === "classic" && <AmbientField />}
        <Suspense fallback={null}>
          {mode === "classic" && <PlexusWallpaper />}
          {mode === "nexus" && <NexusChrome />}
          {mode === "manga" && <MangaChrome pageRef={pageContainerRef} />}
          {mode === "cinematic" && <CinematicChrome />}
          {mode !== "minimal" && <AmbientStudioParticles />}
          {mode !== "minimal" && <AnimeActionOverlay />}
        </Suspense>
        <ScrollProgress />
        {mode !== "nexus" && mode !== "manga" && <SiteNav />}
        <FloatingNav />
        <Suspense fallback={null}>{mode === "classic" && <WelcomeVfx />}</Suspense>
        {offline && (
          <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-500/40 bg-zinc-950/95 px-4 py-2 text-xs font-medium text-amber-200 shadow-lg">
            <WifiOff className="h-3.5 w-3.5" />
            Offline — showing cached archive data
          </div>
        )}
        <div
          ref={pageContainerRef}
          data-classic-page={mode === "classic" ? pageSlug : undefined}
          data-minimal-page={isMinimal ? pageSlug : undefined}
          data-nexus-page={mode === "nexus" ? pageSlug : undefined}
          data-manga-page={mode === "manga" ? pageSlug : undefined}
          data-cinematic-page={mode === "cinematic" ? pageSlug : undefined}
          className={
            mode === "nexus"
              ? `nexus-page relative z-[1] ${showNexusRail ? "nexus-tool-layout mx-auto max-w-7xl lg:grid lg:grid-cols-[180px_minmax(0,1fr)]" : ""}`
              : mode === "manga"
                ? "manga-page relative z-[1]"
                : mode === "cinematic"
                  ? "cinematic-page relative z-[1]"
                  : "relative"
          }
        >
          {showNexusRail ? (
            <Suspense fallback={<aside aria-hidden="true" />}>
              <NexusSectionRailAside containerRef={outletContainerRef} />
            </Suspense>
          ) : null}
          <div ref={outletContainerRef} className={showNexusRail ? "min-w-0" : undefined}>
            {isInitialRoutePending ? (
              <main
                role="status"
                aria-live="polite"
                className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col items-center justify-center gap-3 px-5 py-16 text-center"
              >
                <Loader2 className="h-7 w-7 animate-spin text-accent" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">Loading archive…</p>
              </main>
            ) : (
              <Outlet />
            )}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [offline, setOffline] = useState(false);
  useScuAudioGlobal();
  usePreloadUIFeedback();
  useAmbientAtmosphereSync();
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => void r.unregister()))
        .catch(() => {});
    }
  }, []);
  useEffect(() => {
    const onOnline = () => {
      void queryClient.invalidateQueries();
      void router.invalidate();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [queryClient, router]);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <AppearanceProvider>
            <TypographyProvider>
              <UiModeProvider>
                <ThemeProvider>
                  <UIStateProvider applyAttributesToHtml={false}>
                    <AbilityProvider>
                      <ErrorBoundary>
                        <RootContent offline={offline} />
                        <Suspense fallback={null}>
                          <AppVersionChecker />
                        </Suspense>
                      </ErrorBoundary>
                      <Toaster />
                      <Analytics />
                      <SpeedInsights />
                    </AbilityProvider>
                  </UIStateProvider>
                </ThemeProvider>
              </UiModeProvider>
            </TypographyProvider>
          </AppearanceProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
