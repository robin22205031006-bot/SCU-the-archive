import { createFileRoute } from "@tanstack/react-router";
import { WorldAtlasSections } from "@/components/atlas-pages";
import { useIsManga } from "@/hooks/use-ui-mode";
import { MangaChapterBanner, MangaPanel } from "@/components/manga-primitives";
import { MotionPage, MotionSection } from "@/components/app-motion";

function AtlasIndexPage() {
  const isManga = useIsManga();
  return (
    <MotionPage
      as="main"
      className={`mx-auto max-w-6xl px-4 pb-24 sm:px-5 ${isManga ? "pt-6" : "pt-28"}`}
    >
      <MotionSection as="header">
        {isManga ? (
          <MangaChapterBanner
            chapter="CH. 16 // WORLD ATLAS"
            jp="世界図鑑・異界"
            title="World Atlas"
            subtitle="Every realm in one comic survey — open scenic plates, top-down grids, or era-by-era simulations."
            stamp="世界"
          />
        ) : (
          <div className="mb-10">
            <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Cartography</p>
            <h1 className="mt-2 text-5xl font-medium glow-text">World Atlas</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Every realm in one scroll. Open any place for scenic maps, a true top view, or a
              frame-by-frame simulation across its eras.
            </p>
          </div>
        )}
      </MotionSection>
      <MotionSection delay={0.05}>
        {isManga ? (
          <MangaPanel caption="REALM PLATES // 八大領域" badge="CARTOGRAPHY">
            <WorldAtlasSections />
          </MangaPanel>
        ) : (
          <WorldAtlasSections />
        )}
      </MotionSection>
    </MotionPage>
  );
}

export const Route = createFileRoute("/_authenticated/atlas/")({
  head: () => ({
    meta: [
      { title: "World Atlas — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "Explore every SCU realm on one page: Nilanjona's Realm, Aethmos, Yasnaya, Ruin City, Pocket Dimension, Istanbul, Rome, and 15th-century Romania.",
      },
      { property: "og:title", content: "World Atlas — SCU" },
      {
        property: "og:description",
        content:
          "All eight SCU realms with fit-to-screen scenic, top-down and era-by-era animated maps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AtlasIndexPage,
});
