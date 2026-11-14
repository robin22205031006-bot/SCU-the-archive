import { lazy, Suspense, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Castle, Clock, Network, Shield } from "lucide-react";
import { ArchiveSeasons } from "@/components/archive-seasons";
import { SectionBoundary } from "@/components/section-boundary";
import { PanelSkeleton } from "@/components/route-skeleton";
import { SpoilerToggle, useSpoilerMask } from "@/lib/spoiler-mask";
import { CrimsonBloodlineTheme } from "@/components/ability-canvas";
import { NexusWorkspace } from "@/components/nexus-explorer";
import { useUiStyle } from "@/lib/ui-style";
import { useIsManga } from "@/hooks/use-ui-mode";
import { MangaChapterBanner, MangaPanel } from "@/components/manga-view";

const Orgs = lazy(() => import("./orgs").then((m) => ({ default: m.Orgs })));
const Clans = lazy(() => import("./clans").then((m) => ({ default: m.Clans })));
const Timeline = lazy(() => import("./timeline").then((m) => ({ default: m.Timeline })));
const RelationshipGraph = lazy(() =>
  import("@/components/relationship-graph").then((m) => ({ default: m.RelationshipGraph })),
);

export const Route = createFileRoute("/_authenticated/archive")({
  head: () => ({
    meta: [
      { property: "og:title", content: "Archive — Sentinels Cinematic Universe" },
      {
        property: "og:description",
        content: "Organizations, clans, bloodlines, knowledge graph and canon timeline of the SCU.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Archive — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "The SCU lore vault: organizations, clans, bloodlines, knowledge graph and timeline.",
      },
    ],
  }),
  component: Archive,
});

type Module = "series" | "orgs" | "clans" | "graph" | "timeline";

const MODULES: { id: Module; icon: typeof Shield; t: string; d: string }[] = [
  {
    id: "series",
    icon: BookOpen,
    t: "Series & Seasons",
    d: "Every series and season, each with its own roster page.",
  },
  {
    id: "orgs",
    icon: Shield,
    t: "Organization Charts",
    d: "DEW, H.A.W.K.S., Covenant and every faction structure.",
  },
  {
    id: "clans",
    icon: Castle,
    t: "Clans & Bloodlines",
    d: "Kurohana, Kazumi, Demon Clan, Al-Mansur and other lineages.",
  },
  {
    id: "graph",
    icon: Network,
    t: "Knowledge Graph",
    d: "The living web linking characters, clans, factions and powers.",
  },
  {
    id: "timeline",
    icon: Clock,
    t: "Canon Timeline",
    d: "Season 1 through Season 5 chronological history.",
  },
];

function Archive() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const [module, setModule] = useState<Module>("orgs");
  const active = MODULES.find((m) => m.id === module) ?? { t: "Archive" };
  useSpoilerMask("archive");

  return (
    <main className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-5">
      {!nexus && !isManga && (
        <CrimsonBloodlineTheme className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-25" />
      )}
      {isManga ? (
        <div className="pt-6">
          <MangaChapterBanner
            chapter="CH. 05 // VAULT ARCHIVE"
            jp="機密保管庫"
            title="Archive"
            subtitle="The deep vault of the universe — structures, bloodlines, connections and canon history."
            stamp="機密"
            actions={<SpoilerToggle scope="archive" />}
          />
        </div>
      ) : (
        <header className="mb-6 pt-28">
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Lore Vault</p>
          <h1 className="mt-2 text-5xl font-medium glow-text">Archive</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            The deep vault of the universe — structures, bloodlines, connections and history.
          </p>
          <div className="mt-3">
            <SpoilerToggle scope="archive" />
          </div>
        </header>
      )}

      {nexus ? (
        <div data-spoiler="archive">
          <NexusWorkspace
            views={MODULES.map((m) => ({
              id: m.id,
              title: m.t,
              icon: <m.icon className="h-4 w-4" />,
              content: (
                <SectionBoundary label={m.t}>
                  <Suspense fallback={<PanelSkeleton className="h-[50vh]" />}>
                    {m.id === "series" ? (
                      <ArchiveSeasons />
                    ) : m.id === "orgs" ? (
                      <Orgs />
                    ) : m.id === "clans" ? (
                      <Clans />
                    ) : m.id === "graph" ? (
                      <RelationshipGraph />
                    ) : (
                      <Timeline />
                    )}
                  </Suspense>
                </SectionBoundary>
              ),
            }))}
          />
        </div>
      ) : isManga ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map((m, idx) => {
              const selected = module === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setModule(m.id)}
                  className={`manga-panel-hover flex flex-col justify-between border-[3px] border-foreground p-4 text-left transition ${
                    selected
                      ? "bg-foreground text-background shadow-[4px_4px_0_#b91c1c]"
                      : "bg-card text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${
                        selected
                          ? "border-background bg-[#b91c1c] text-white"
                          : "border-foreground bg-foreground text-background"
                      }`}
                    >
                      FILE {String.fromCharCode(65 + idx)}
                    </span>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <div className="mt-3">
                    <h2 className="font-display text-lg uppercase tracking-wide">{m.t}</h2>
                    <p
                      className={`mt-1 text-xs ${selected ? "text-background/80" : "text-muted-foreground"}`}
                    >
                      {m.d}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <section aria-label={active.t} data-spoiler="archive">
            <MangaPanel caption={`FOLIO // ${active.t.toUpperCase()}`} badge="CANON RECORD">
              <SectionBoundary key={module} label={active.t}>
                <Suspense fallback={<PanelSkeleton className="h-[50vh]" />}>
                  {module === "series" && <ArchiveSeasons />}
                  {module === "orgs" && <Orgs />}
                  {module === "clans" && <Clans />}
                  {module === "graph" && <RelationshipGraph />}
                  {module === "timeline" && <Timeline />}
                </Suspense>
              </SectionBoundary>
            </MangaPanel>
          </section>
        </>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {MODULES.map((m) => (
              <button
                key={m.id}
                onClick={() => setModule(m.id)}
                className={`glass rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 ${module === m.id ? "glow-ring border-accent/50" : "hover:glow-ring"}`}
              >
                <m.icon
                  className={`h-6 w-6 ${module === m.id ? "text-accent" : "text-muted-foreground"}`}
                />
                <h2 className="mt-3 text-lg font-medium">{m.t}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{m.d}</p>
              </button>
            ))}
          </div>

          <section aria-label={active.t} data-spoiler="archive">
            <SectionBoundary key={module} label={active.t}>
              <Suspense fallback={<PanelSkeleton className="h-[50vh]" />}>
                {module === "series" && <ArchiveSeasons />}
                {module === "orgs" && <Orgs />}
                {module === "clans" && <Clans />}
                {module === "graph" && (
                  <div className="glass rounded-2xl p-4">
                    <RelationshipGraph />
                  </div>
                )}
                {module === "timeline" && <Timeline />}
              </Suspense>
            </SectionBoundary>
          </section>
        </>
      )}
    </main>
  );
}
