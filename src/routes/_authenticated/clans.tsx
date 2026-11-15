import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NexusWorkspace } from "@/components/nexus-explorer";
import { useUiStyle } from "@/lib/ui-style";
import { Network, Castle, GitBranch } from "lucide-react";
import { useIsManga } from "@/hooks/use-ui-mode";
import { MangaChapterBanner, MangaPanel } from "@/components/manga-view";
import { MotionPage, MotionSection } from "@/components/app-motion";
import { PanelSkeleton } from "@/components/route-skeleton";

const ClanGraph = lazy(() =>
  import("@/components/clan-graph").then((m) => ({ default: m.ClanGraph })),
);
const NexusConstellation = lazy(() =>
  import("@/components/nexus-constellation").then((m) => ({ default: m.NexusConstellation })),
);
const NexusLineage = lazy(() =>
  import("@/components/nexus-lineage").then((m) => ({ default: m.NexusLineage })),
);
const FamilyTree = lazy(() =>
  import("@/components/family-tree").then((m) => ({ default: m.FamilyTree })),
);
const NexusFamilyTree = lazy(() =>
  import("@/components/nexus-family-tree").then((m) => ({ default: m.NexusFamilyTree })),
);

export const Route = createFileRoute("/_authenticated/clans")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Clan & Lineage Graph — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "Hierarchies, squad structures and rivalries across SCU clans, bloodlines and organizations.",
      },
      { property: "og:title", content: "Clan & Lineage Graph — SCU" },
      {
        property: "og:description",
        content: "The web of clans, bloodlines and squads in the Sentinels Cinematic Universe.",
      },
    ],
  }),
  component: Clans,
});

export function Clans() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  return (
    <MotionPage
      as="main"
      className={`mx-auto max-w-6xl px-4 pb-24 sm:px-5 ${isManga ? "pt-6" : "pt-28"}`}
    >
      <MotionSection as="header">
        {isManga ? (
          <MangaChapterBanner
            chapter="CH. 15 // BLOODLINES"
            jp="一族・血統図"
            title="Clan & Lineage Graph"
            subtitle="Command hierarchies, squad lineages, and ancestral bloodline trees across every clan and order."
            stamp="血統"
          />
        ) : (
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Chronicle</p>
            <h1 className="mt-2 text-5xl font-medium glow-text">Clan &amp; Lineage Graph</h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Hierarchies, squad command structures and the rivalries that bind the clans,
              bloodlines and organizations of the archive.
            </p>
          </div>
        )}
      </MotionSection>
      <MotionSection delay={0.05}>
        <Suspense fallback={<PanelSkeleton className="min-h-[60vh]" />}>
          {nexus ? (
            <NexusWorkspace
              views={[
                {
                  id: "clans",
                  title: "Clan structures",
                  icon: <Castle className="h-4 w-4" />,
                  content: <NexusLineage />,
                },
                {
                  id: "family",
                  title: "Family tree",
                  icon: <GitBranch className="h-4 w-4" />,
                  content: <NexusFamilyTree />,
                },
                {
                  id: "bonds",
                  title: "Connections",
                  icon: <Network className="h-4 w-4" />,
                  content: <NexusConstellation />,
                },
                {
                  id: "editor",
                  title: "Hierarchy editor",
                  icon: <Castle className="h-4 w-4" />,
                  content: <ClanGraph />,
                },
              ]}
            />
          ) : isManga ? (
            <div className="grid gap-8">
              <MangaPanel caption="CLAN & SQUAD HIERARCHY // 組織図" badge="COMMAND">
                <ClanGraph />
              </MangaPanel>
              <MangaPanel caption="ANCESTRAL FAMILY TREE // 家系図" badge="LINEAGE">
                <FamilyTree />
              </MangaPanel>
            </div>
          ) : (
            <div className="grid gap-10">
              <ClanGraph />
              <section aria-label="Family tree">
                <h2 className="mb-3 text-2xl font-medium">Family tree</h2>
                <FamilyTree />
              </section>
            </div>
          )}
        </Suspense>
      </MotionSection>
    </MotionPage>
  );
}
