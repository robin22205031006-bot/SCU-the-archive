import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ATLAS } from "@/lib/nexus-atlas";
import { PlaceAtlasSections } from "@/components/atlas-pages";

export const Route = createFileRoute("/_authenticated/atlas/$place")({
  loader: ({ params }) => {
    const loc = ATLAS.find((l) => l.id === params.place);
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
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-5">
      <Link
        to="/atlas"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        World Atlas
      </Link>
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-accent">{loc.epithet}</p>
        <h1 className="mt-2 text-5xl font-medium glow-text">{loc.name}</h1>
      </header>
      <PlaceAtlasSections loc={loc} />
    </main>
  );
}
