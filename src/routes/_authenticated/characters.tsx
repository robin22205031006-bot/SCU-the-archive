import { createFileRoute } from "@tanstack/react-router";
import { EntitySection } from "@/components/entity-section";
import { CyanNeuralPlexusTheme } from "@/components/ability-canvas";
import { CHARACTER_CATEGORIES } from "@/lib/entities";
import { useIsManga } from "@/hooks/use-ui-mode";

export const Route = createFileRoute("/_authenticated/characters")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string; open?: string; series?: string | undefined; season?: number | undefined } => ({
    ...(typeof s["q"] === "string" ? { q: s["q"] } : {}),
    ...(typeof s["open"] === "string" ? { open: s["open"] } : {}),
    ...(typeof s["series"] === "string" ? { series: s["series"] } : {}),
    ...(Number.isInteger(Number(s["season"])) && Number(s["season"]) > 0
      ? { season: Number(s["season"]) }
      : {}),
  }),
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Characters — Sentinels Cinematic Universe" },
      {
        name: "description",
        content: "Dossiers for every character in the Sentinels Cinematic Universe.",
      },
      { property: "og:title", content: "Characters — SCU" },
      {
        property: "og:description",
        content: "Dossiers for every character in the Sentinels Cinematic Universe.",
      },
    ],
  }),
  component: Characters,
});

function Characters() {
  const { q, open } = Route.useSearch();
  const isManga = useIsManga();
  return (
    <div className="relative">
      {!isManga && (
        <CyanNeuralPlexusTheme className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-20" />
      )}
      <EntitySection
        kinds={["character"]}
        categories={CHARACTER_CATEGORIES}
        initialQuery={q ?? ""}
        openId={open}
        view="characters"
        title="Characters"
        subtitle="Protagonists, antagonists, anti-heroes, anti-villains and support."
      />
    </div>
  );
}
