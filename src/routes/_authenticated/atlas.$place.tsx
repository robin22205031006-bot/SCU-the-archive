import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ATLAS } from "@/lib/nexus-atlas";
import { PlaceAtlasSections } from "@/components/atlas-pages";
import { MotionPage, MotionSection } from "@/components/app-motion";
import { LoreBreadcrumb } from "@/components/lore-breadcrumb";

export const Route = createFileRoute("/_authenticated/atlas/$place")({
  // The atlas dataset is large: the loader imports it on demand (the page component's
  // static import is code-split with the component), keeping it out of startup.
  loader: async ({ params }) => {
    const { ATLAS: atlas } = await import("@/lib/nexus-atlas");
    const target = params.place === "istanbul" ? "istanbul-1417" : params.place;
    const loc = atlas.find((l) => l.id === target);
    if (!loc) throw notFound();
    return { id: loc.id, name: loc.name, epithet: loc.epithet };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} Map — SCU Atlas` : "Map unavailable — SCU Atlas" },
      {
        name: "description",
        content: loaderData
          ? `${loaderData.name}: ${loaderData.epithet}. Scenic maps, top view and era simulation.`
          : "This map could not be found.",
      },
      {
        property: "og:title",
        content: loaderData ? `${loaderData.name} — SCU Atlas` : "SCU Atlas",
      },
      {
        property: "og:description",
        content: loaderData
          ? `${loaderData.epithet} — eras, landmarks and animated maps.`
          : "SCU realm maps.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
    ],
  }),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 pt-32 text-center">
      <p>That place isn't on the map.</p>
      <Link to="/atlas" className="text-primary">
        Back to the World Atlas
      </Link>
    </main>
  ),
  component: PlacePage,
});

function PlacePage() {
  const { id } = Route.useLoaderData();
  const loc = ATLAS.find((l) => l.id === id)!;
  return (
    <MotionPage as="main" className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-5">
      <LoreBreadcrumb
        className="mb-6"
        segments={[
          { id: "atlas-root", label: "World Atlas", to: "/atlas" },
          { id: `atlas-${loc.id}`, label: loc.name },
        ]}
      />
      <MotionSection as="header" className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">{loc.epithet}</p>
        <h1 className="mt-2 text-5xl font-medium glow-text">{loc.name}</h1>
      </MotionSection>
      <MotionSection delay={0.05}>
        <PlaceAtlasSections loc={loc} />
      </MotionSection>
    </MotionPage>
  );
}
