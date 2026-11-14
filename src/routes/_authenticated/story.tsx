import { NexusExplorer } from "@/components/nexus-explorer";
import { useUiStyle } from "@/lib/ui-style";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Minus, Plus, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ambientPlaying, ambientStart, ambientStop } from "@/lib/scu-audio";
import { useAppearance } from "@/hooks/use-appearance";
import { sfx } from "@/lib/scu-audio";
import { useIsManga } from "@/hooks/use-ui-mode";
import { MangaChapterBanner, MangaThoughtBox } from "@/components/manga-view";

export const Route = createFileRoute("/_authenticated/story")({
  validateSearch: (s: Record<string, unknown>): { ep?: string } =>
    typeof s["ep"] === "string" ? { ep: s["ep"] } : {},
  head: () => ({
    meta: [
      { title: "Story — SCU" },
      {
        name: "description",
        content: "Read published episodes and stories from the Sentinels Cinematic Universe.",
      },
      { property: "og:title", content: "Story — SCU" },
      {
        property: "og:description",
        content: "Read published episodes and stories from the Sentinels Cinematic Universe.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Story,
});

function Story() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const { ep } = Route.useSearch();
  const { zoom } = useAppearance();
  const [eyeCare, setEyeCare] = useState(() => localStorage.getItem("scu-story-eyecare") === "1");
  const [ambient, setAmbient] = useState(false);

  const { data: episodes } = useQuery({
    queryKey: ["episodes-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("episodes")
        .select("id,title,series,status")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: story } = useQuery({
    queryKey: ["episode", ep],
    enabled: !!ep,
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("*").eq("id", ep!).maybeSingle();
      return data;
    },
  });

  // Content protection: block copy/cut/context menu while reading.
  useEffect(() => {
    if (!ep) return;
    const block = (e: Event) => e.preventDefault();
    const ctx = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", ctx);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", ctx);
    };
  }, [ep]);

  const toggleAmbient = () => {
    if (ambientPlaying() || ambient) {
      ambientStop();
      setAmbient(false);
    } else {
      ambientStart();
      setAmbient(true);
    }
  };

  const toggleEyeCare = () => {
    setEyeCare((v) => {
      localStorage.setItem("scu-story-eyecare", v ? "0" : "1");
      return !v;
    });
  };

  // Render markdown-ish body: paragraphs + ## headings.
  const blocks = useMemo(() => {
    if (!story?.body) return [];
    return story.body
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
  }, [story?.body]);

  if (ep && story) {
    return (
      <div
        className={`min-h-screen select-none ${
          isManga
            ? eyeCare
              ? "bg-[#f3ead8] text-[#141414]"
              : "bg-background text-foreground"
            : eyeCare
              ? "bg-[#141210] text-[#e8ddc8]"
              : "bg-black text-foreground"
        }`}
        style={{ fontSize: `${zoom}%` }}
        onCopy={(e) => e.preventDefault()}
      >
        <div
          className={
            isManga
              ? "sticky top-0 z-10 flex items-center justify-between border-b-[3px] border-foreground bg-card px-4 py-2"
              : "sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-2 backdrop-blur"
          }
        >
          <Link
            to="/story"
            className={`flex items-center gap-1 text-xs ${
              isManga
                ? "border-2 border-foreground bg-background px-2.5 py-1 font-mono font-bold uppercase hover:bg-foreground hover:text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Library
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                zoom(-1);
              }}
              className={`border p-1.5 ${isManga ? "border-2 border-foreground bg-background" : "rounded-full"}`}
              aria-label="Smaller text"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                zoom(1);
              }}
              className={`border p-1.5 ${isManga ? "border-2 border-foreground bg-background" : "rounded-full"}`}
              aria-label="Larger text"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={toggleEyeCare}
              className={
                isManga
                  ? `border-2 border-foreground px-2.5 py-1 font-mono text-xs font-bold uppercase ${
                      eyeCare ? "bg-[#b91c1c] text-white" : "bg-background text-foreground"
                    }`
                  : `rounded-full border px-2.5 py-1 text-xs ${eyeCare ? "border-accent text-accent" : "text-muted-foreground"}`
              }
            >
              Eye care
            </button>
            <button
              onClick={toggleAmbient}
              className={`border p-1.5 ${isManga ? "border-2 border-foreground bg-background" : "rounded-full"}`}
              aria-label="Ambient sound"
            >
              {ambient ? (
                <Volume2 className="h-3.5 w-3.5 text-accent" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
        <article
          className={
            isManga
              ? "manga-panel mx-auto my-8 max-w-2xl border-[3px] border-foreground bg-card px-6 py-10 sm:px-10"
              : "mx-auto max-w-2xl px-6 py-10"
          }
        >
          {story.series && (
            <p
              className={`mb-2 text-xs uppercase tracking-[0.3em] ${
                isManga ? "font-mono font-bold text-[#b91c1c]" : "text-accent"
              }`}
            >
              {story.series}
            </p>
          )}
          <h1
            className={`font-display text-4xl font-bold ${isManga ? "uppercase tracking-wide" : ""}`}
          >
            {story.title}
          </h1>
          <div className="mt-8 space-y-5 leading-relaxed">
            {blocks.map((b, i) =>
              b.startsWith("## ") ? (
                <h2
                  key={i}
                  className={`pt-4 font-display text-2xl ${isManga ? "border-b-2 border-foreground pb-1 uppercase" : ""}`}
                >
                  {b.slice(3)}
                </h2>
              ) : b.startsWith("# ") ? (
                <h2
                  key={i}
                  className={`pt-4 font-display text-3xl ${isManga ? "border-b-2 border-foreground pb-1 uppercase" : ""}`}
                >
                  {b.slice(2)}
                </h2>
              ) : (
                <p key={i} className="whitespace-pre-line">
                  {b}
                </p>
              ),
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-3xl px-4 pb-24 ${isManga ? "pt-6" : "pt-28"}`}>
      {isManga ? (
        <MangaChapterBanner
          chapter="CH. 09 // STORY READER"
          jp="公式物語・連載"
          title="Story"
          subtitle="Official SCU serialized epics and published manuscript chapters."
          stamp="物語"
        />
      ) : (
        <>
          <h1 className="flex items-center gap-2 font-display text-4xl">
            <BookOpen className="h-7 w-7 text-accent" /> Story
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Official SCU epics and published stories.
          </p>
        </>
      )}
      {nexus ? (
        <div className="mt-6">
          <NexusExplorer
            label="Stories"
            records={(episodes ?? []).map((e) => ({
              id: e.id,
              title: e.title,
              group: e.series || "Standalone",
              subtitle: e.status,
              episode: e,
            }))}
            renderDetail={({ episode: e }) => (
              <div className="grid gap-4">
                <BookOpen className="h-8 w-8 text-accent" />
                <h2 className="break-words text-2xl">{e.title}</h2>
                <p className="text-sm text-muted-foreground">{e.series}</p>
                <Button asChild>
                  <Link to="/story" search={{ ep: e.id }} onClick={() => sfx.whoosh()}>
                    <BookOpen className="h-4 w-4" /> Read story
                  </Link>
                </Button>
              </div>
            )}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {(episodes ?? []).map((e, idx) => (
            <li key={e.id}>
              <Link
                to="/story"
                search={{ ep: e.id }}
                onClick={() => sfx.whoosh()}
                className={
                  isManga
                    ? "manga-panel manga-panel-hover flex items-center justify-between gap-3 border-[3px] border-foreground bg-card px-4 py-3 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
                    : "glass flex items-center justify-between rounded-2xl px-4 py-3 transition hover:border-accent/50"
                }
              >
                <span className="flex items-center gap-3">
                  {isManga && (
                    <span className="border-2 border-foreground bg-foreground px-2 py-0.5 font-mono text-[10px] font-bold text-background">
                      CH.{String(idx + 1).padStart(2, "0")}
                    </span>
                  )}
                  <span>
                    <span
                      className={`block ${
                        isManga ? "font-display text-xl uppercase tracking-wide" : "font-medium"
                      }`}
                    >
                      {e.title}
                    </span>
                    {e.series && (
                      <span className="font-mono text-[11px] uppercase text-muted-foreground">
                        {e.series}
                      </span>
                    )}
                  </span>
                </span>
                <span className="border border-foreground/40 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {e.status}
                </span>
              </Link>
            </li>
          ))}
          {(episodes ?? []).length === 0 &&
            (isManga ? (
              <MangaThoughtBox label="NO CHAPTERS">No published stories yet.</MangaThoughtBox>
            ) : (
              <li className="text-sm text-muted-foreground">No published stories yet.</li>
            ))}
        </ul>
      )}
    </div>
  );
}
