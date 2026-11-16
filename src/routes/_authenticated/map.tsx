import { Suspense, lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSectionStyle } from "@/hooks/use-typography";
import { NexusWorkspace } from "@/components/nexus-explorer";
import { useUiStyle } from "@/lib/ui-style";
import { Map, Radio, Globe2 } from "lucide-react";
import { useIsManga, useActiveGenre } from "@/hooks/use-ui-mode";
import { MangaChapterBanner, MangaPanel } from "@/components/manga-primitives";
import { GenreDiamondMediaFrame } from "@/components/genre-decorations";
import { MotionPage, MotionSection } from "@/components/app-motion";
import { PanelSkeleton } from "@/components/route-skeleton";

const LoreLocations = lazy(() =>
  import("@/components/lore-locations").then((m) => ({ default: m.LoreLocations })),
);
const TacticalMap = lazy(() =>
  import("@/components/tactical-map").then((m) => ({ default: m.TacticalMap })),
);
const NexusAtlas = lazy(() =>
  import("@/components/nexus-atlas").then((m) => ({ default: m.NexusAtlas })),
);
const FantasyMapSpread = lazy(() =>
  import("@/components/fantasy-map-spread").then((m) => ({ default: m.FantasyMapSpread })),
);

export const Route = createFileRoute("/_authenticated/map")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Tactical Map — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "Interactive tactical map of SCU locations, factions, battles, and stationed Sentinels.",
      },
      { property: "og:title", content: "Tactical Map — SCU" },
      {
        property: "og:description",
        content: "Field reports and strategic positions across the SCU theater.",
      },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const isManga = useIsManga();
  const activeGenre = useActiveGenre();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const isFantasy = isManga && activeGenre === "fantasy";
  const sectionStyle = useSectionStyle("timeline");
  return (
    <MotionPage
      as="main"
      className={`mx-auto max-w-6xl px-4 pb-24 sm:px-5 ${isManga ? "pt-6" : "pt-28"}`}
      style={sectionStyle}
    >
      <MotionSection as="header">
        {isManga ? (
          <MangaChapterBanner
            chapter="CH. 07 // TACTICAL ATLAS"
            jp="戦術地図・拠点"
            title="Tactical Map"
            subtitle="Known locations, controlling factions, historic battles, and Sentinel deployments across the SCU theater."
            stamp="地図"
          />
        ) : (
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent">
              Strategic overview
            </p>
            <h1 className="mt-2 text-5xl font-medium glow-text">Tactical Map</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Known locations, controlling factions, historic battles, and Sentinel deployments
              across the SCU theater.
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
                  id: "atlas",
                  title: "Atlas",
                  icon: <Globe2 className="h-4 w-4" />,
                  content: <NexusAtlas />,
                },
                {
                  id: "world",
                  title: "World & Eras",
                  icon: <Map className="h-4 w-4" />,
                  content: <LoreLocations />,
                },
                {
                  id: "deployments",
                  title: "Deployments",
                  icon: <Radio className="h-4 w-4" />,
                  content: <TacticalMap />,
                },
              ]}
            />
          ) : isFantasy ? (
            <FantasyMapSpread />
          ) : isManga ? (
            <div className="grid gap-8">
              <GenreDiamondMediaFrame
                theme={activeGenre}
                variant="diamond"
                leftEmblemLabel="ATLAS"
                rightEmblemLabel="ERA"
              >
                <MangaPanel caption="THEATER ATLAS & ERAS // 勢力圏" badge="LOCATIONS">
                  <LoreLocations />
                </MangaPanel>
              </GenreDiamondMediaFrame>
              <MangaPanel caption="DEPLOYMENT BOARD // 配備一覧" badge="FIELD LOGS">
                <TacticalMap />
              </MangaPanel>
            </div>
          ) : (
            <>
              <LoreLocations />
              <TacticalMap />
            </>
          )}
        </Suspense>
      </MotionSection>
    </MotionPage>
  );
}
