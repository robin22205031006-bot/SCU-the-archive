import { createFileRoute } from "@tanstack/react-router";
import { SeriesPage } from "@/components/series-page";

export const Route = createFileRoute("/_authenticated/series")({
  validateSearch: (s: Record<string, unknown>): { s?: string } => ({
    ...(typeof s["s"] === "string" ? { s: s["s"] } : {}),
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Series — Sentinels Cinematic Universe" },
      {
        name: "description",
        content: "Story arcs and series of the Sentinels Cinematic Universe.",
      },
      { property: "og:title", content: "Series — SCU" },
      {
        property: "og:description",
        content: "Story arcs and series of the Sentinels Cinematic Universe.",
      },
    ],
  }),
  component: SeriesPage,
});
