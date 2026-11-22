import { createFileRoute } from "@tanstack/react-router";
import { Timeline } from "@/components/pages/timeline-page";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Timeline — Sentinels Cinematic Universe" },
      {
        name: "description",
        content: "The chronological history of the Sentinels Cinematic Universe.",
      },
      { property: "og:title", content: "Timeline — SCU" },
      { property: "og:description", content: "The chronological history of the SCU." },
    ],
  }),
  component: Timeline,
});
