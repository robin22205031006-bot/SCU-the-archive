import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Image as ImageIcon, Pencil, Trash2, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import type { UiStyle } from "@/lib/ui-style";
import { artFor, artUrl, type ArsenalForm, type ArsenalArt } from "@/lib/arsenal-art";
import { ArsenalFx } from "@/components/arsenal-fx";
import { ArsenalEmblem } from "@/components/arsenal-emblem";
import { GlbModelViewer } from "@/components/glb-model-viewer";
import { useIsManga } from "@/hooks/use-ui-mode";

type Artifact = Tables<"artifacts">;
const CAT: Record<string, string> = {
  weapon: "Weapon",
  cursed_weapon: "Cursed weapon",
  cosmic_object: "Cosmic object",
  relic: "Relic",
  serum_tech: "Tech, suits & serum",
  other: "Other",
};

/** Reference art with its FX overlay; items without art get a dark render with a large emblem. */
function ArtFrame({
  art,
  form,
  style,
  motion,
  big = false,
}: {
  art: ArsenalArt;
  form: ArsenalForm;
  style: UiStyle;
  motion: boolean;
  big?: boolean;
}) {
  const isManga = useIsManga();
  const url = artUrl(form.art);
  const nexus = !isManga && style === "nexus";
  const pos = form.crop === "left" ? "22% 50%" : form.crop === "right" ? "78% 50%" : "50% 40%";
  return (
    <div
      className={`relative overflow-hidden ${big ? "h-full" : "aspect-[4/5]"} ${
        isManga
          ? "manga-halftone rounded-none border-2 border-foreground bg-secondary"
          : `${nexus ? "rounded-xl" : "rounded-lg"} bg-background`
      }`}
    >
      <div
        key={form.label}
        className={`absolute inset-0 ${nexus && motion ? "arsenal-morph" : ""}`}
      >
        {url ? (
          <img
            src={url}
            alt={form.label}
            loading="lazy"
            decoding="async"
            className={`h-full w-full ${big ? "object-contain" : "object-cover"} ${
              isManga ? "manga-portrait-ink" : ""
            } ${motion && style !== "minimal" && !isManga ? "arsenal-drift" : ""}`}
            style={{
              height: "100%",
              width: "100%",
              objectPosition: big && !form.crop ? undefined : pos,
              transform:
                form.crop && big
                  ? `scale(1.6) translateX(${form.crop === "left" ? "18%" : "-18%"})`
                  : undefined,
            }}
          />
        ) : (
          <div
            className={`grid h-full w-full place-items-center ${isManga ? "manga-halftone bg-secondary" : ""}`}
            style={
              isManga
                ? undefined
                : {
                    background: `radial-gradient(circle at 50% 45%, hsl(${art.hue} 70% 22%), hsl(${art.hue} 40% 6%) 70%)`,
                  }
            }
          >
            <ArsenalEmblem
              glyph={art.glyph}
              hue={art.hue}
              nexus={nexus}
              animate={motion && !isManga}
              className="size-2/5"
            />
          </div>
        )}
      </div>
      {style !== "minimal" && !isManga && (
        <ArsenalFx
          layers={form.fx}
          animate={motion}
          density={nexus ? (big ? 1.4 : 1) : 0.55}
          fps={nexus ? 24 : 18}
        />
      )}
      {nexus && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: `inset 0 0 60px hsl(${art.hue} 80% 50% / .35)` }}
        />
      )}
    </div>
  );
}

function FormTabs({ art, i, set }: { art: ArsenalArt; i: number; set: (n: number) => void }) {
  const isManga = useIsManga();
  if (art.forms.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {art.forms.map((f, n) => (
        <button
          key={f.label}
          onClick={(e) => {
            e.stopPropagation();
            set(n);
          }}
          className={
            isManga
              ? `border-2 border-foreground px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                  n === i
                    ? "bg-[#b91c1c] text-white border-[#b91c1c]"
                    : "bg-background text-foreground hover:bg-secondary"
                }`
              : `rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                  n === i
                    ? "border-accent bg-accent/20 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`
          }
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function Details({ a, form }: { a: Artifact; form: ArsenalForm }) {
  return (
    <>
      {a.curse_level > 0 && (
        <p className="text-xs text-destructive">Curse level {a.curse_level}/5</p>
      )}
      {form.note && (
        <p className="text-xs italic text-accent">
          {form.wielder ? `${form.wielder}: ` : ""}
          {form.note}
        </p>
      )}
      {a.how_it_works && <p className="text-sm text-foreground/90">{a.how_it_works}</p>}
      {a.lore && <p className="text-sm text-muted-foreground">{a.lore}</p>}
      <dl className="grid gap-0.5 text-xs text-muted-foreground">
        {a.wielders.length > 0 && (
          <div>
            <dt className="inline font-medium text-foreground">Wielders: </dt>
            <dd className="inline">{a.wielders.join(", ")}</dd>
          </div>
        )}
        {a.materials && (
          <div>
            <dt className="inline font-medium text-foreground">Materials: </dt>
            <dd className="inline">{a.materials}</dd>
          </div>
        )}
        {a.colors && (
          <div>
            <dt className="inline font-medium text-foreground">Colors: </dt>
            <dd className="inline">{a.colors}</dd>
          </div>
        )}
      </dl>
    </>
  );
}

export function ArtifactCard({
  a,
  style,
  motion,
  staff,
  onEdit,
  onDelete,
  onOpen,
}: {
  a: Artifact;
  style: UiStyle;
  motion: boolean;
  staff: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const isManga = useIsManga();
  const art = artFor(a.name, a.weapon_type, a.category);
  const [i, setI] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const form = art.forms[Math.min(i, art.forms.length - 1)] ?? art.forms[0]!;
  const nexus = !isManga && style === "nexus";
  const modelUrl = a.model_3d_url?.trim() || null;
  const showing3d = viewMode === "3d" && !!modelUrl;
  const fallbackImg = artUrl(form.art) ?? null;

  return (
    <article
      className={
        isManga
          ? "manga-panel manga-panel-hover grid content-start gap-2.5 border-[3px] border-foreground bg-card p-3.5"
          : `grid content-start gap-2 border p-3 ${nexus ? "rounded-2xl border-accent/30 bg-card/60 backdrop-blur" : style === "minimal" ? "rounded-lg border-border bg-card" : "rounded-2xl border-border bg-card/70"}`
      }
      style={nexus ? { boxShadow: `0 0 24px hsl(${art.hue} 80% 50% / .18)` } : undefined}
    >
      <div className="relative">
        {showing3d && modelUrl ? (
          <div
            className={`relative aspect-[4/5] overflow-hidden ${isManga ? "rounded-none border-2 border-foreground bg-background" : `${nexus ? "rounded-xl" : "rounded-lg"} bg-background`}`}
          >
            <GlbModelViewer
              url={modelUrl}
              alt={a.name}
              name={a.name}
              description={[a.how_it_works, a.lore, a.materials, a.colors, form.note]
                .filter(Boolean)
                .join(" ")}
              tags={[
                a.category,
                a.weapon_type,
                ...(a.wielders ?? []),
                a.curse_level > 0 ? "cursed" : null,
              ]}
              fallbackImageUrl={fallbackImg}
              accentColor={isManga ? "#b91c1c" : `hsl(${art.hue}, 85%, 60%)`}
              compact
              onFallbackTo2d={() => setViewMode("2d")}
            />
            {nexus && (
              <button
                type="button"
                onClick={onOpen}
                aria-label={`Open ${a.name}`}
                className="absolute right-2 top-2 z-20 rounded-full bg-black/60 p-1 text-foreground/80 hover:text-white"
              >
                <Maximize2 className="size-3.5" />
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={nexus ? onOpen : undefined}
            className={`relative block w-full text-left ${nexus ? "cursor-zoom-in" : "cursor-default"}`}
            aria-label={nexus ? `Open ${a.name}` : undefined}
          >
            <ArtFrame art={art} form={form} style={style} motion={motion} />
            {nexus && <Maximize2 className="absolute right-2 top-2 size-4 text-foreground/70" />}
            {viewMode === "3d" && !modelUrl && (
              <span
                className={`pointer-events-none absolute inset-x-2 bottom-2 z-20 px-2 py-1 text-center text-[10px] ${
                  isManga
                    ? "border-2 border-foreground bg-card font-mono font-bold uppercase text-foreground"
                    : "rounded-md border border-white/15 bg-[#060a14]/92 text-zinc-200"
                }`}
              >
                No 3D model uploaded — showing 2D
              </span>
            )}
          </button>
        )}

        <div
          role="group"
          aria-label={`View mode for ${a.name}`}
          className={
            isManga
              ? "absolute left-2 top-2 z-20 inline-flex items-center border-2 border-foreground bg-card p-0.5 font-mono text-[10px] font-bold"
              : "absolute left-2 top-2 z-20 inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-[#060a14]/90 p-0.5 text-[10px] font-semibold"
          }
        >
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            aria-pressed={viewMode === "2d"}
            className={
              isManga
                ? `inline-flex items-center gap-1 px-2 py-0.5 transition ${
                    viewMode === "2d"
                      ? "bg-foreground text-background"
                      : "text-foreground hover:bg-secondary"
                  }`
                : `inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
                    viewMode === "2d"
                      ? "bg-accent text-accent-foreground"
                      : "text-zinc-300 hover:text-white"
                  }`
            }
          >
            <ImageIcon className="size-3" />
            2D
          </button>
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            aria-pressed={viewMode === "3d"}
            className={
              isManga
                ? `inline-flex items-center gap-1 px-2 py-0.5 transition ${
                    viewMode === "3d"
                      ? "bg-[#b91c1c] text-white"
                      : "text-foreground hover:bg-secondary"
                  }`
                : `inline-flex items-center gap-1 rounded-full px-2 py-0.5 transition ${
                    viewMode === "3d"
                      ? "bg-accent text-accent-foreground"
                      : "text-zinc-300 hover:text-white"
                  }`
            }
          >
            <Box className="size-3" />
            3D
          </button>
        </div>
      </div>
      <div
        className={`flex items-start gap-2 ${isManga ? "border-b-2 border-foreground/20 pb-2" : ""}`}
      >
        <ArsenalEmblem
          glyph={art.glyph}
          hue={art.hue}
          nexus={nexus}
          animate={motion && !isManga}
          className={nexus ? "size-11 shrink-0" : "size-9 shrink-0"}
        />
        <div className="min-w-0 flex-1">
          <p
            className={
              isManga
                ? "font-mono text-[10px] font-bold uppercase tracking-widest text-[#b91c1c] dark:text-[#fca5a5]"
                : "text-[11px] uppercase tracking-widest text-accent"
            }
          >
            {CAT[a.category] ?? a.category}
            {a.weapon_type ? ` · ${a.weapon_type}` : ""}
          </p>
          <p
            className={
              isManga
                ? "font-display text-xl uppercase tracking-wide text-foreground"
                : "text-base font-semibold leading-tight text-foreground"
            }
          >
            {a.name}
          </p>
        </div>
        {staff && (
          <div className="flex shrink-0">
            <Button size="icon" variant="ghost" aria-label="Edit" onClick={onEdit}>
              <Pencil className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={onDelete}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>
      <FormTabs art={art} i={i} set={setI} />
      {(isManga || style !== "nexus") && <Details a={a} form={form} />}
      {nexus && <p className="line-clamp-2 text-sm text-muted-foreground">{a.how_it_works}</p>}
    </article>
  );
}

/** Full-screen Nexus inspector: big art, 3D model toggle, dense FX and animated form transformations. */
export function NexusArtifactViewer({
  a,
  motion,
  onClose,
}: {
  a: Artifact;
  motion: boolean;
  onClose: () => void;
}) {
  const art = artFor(a.name, a.weapon_type, a.category);
  const [i, setI] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const form = art.forms[i] ?? art.forms[0]!;
  const modelUrl = a.model_3d_url?.trim() || null;
  const showing3d = viewMode === "3d" && !!modelUrl;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return createPortal(
    <div
      role="dialog"
      aria-modal
      aria-label={a.name}
      className="fixed inset-0 z-[300] grid bg-background/95 backdrop-blur-md md:grid-cols-[1.4fr_1fr]"
      onClick={onClose}
    >
      <div className="relative h-[55vh] p-3 md:h-screen" onClick={(e) => e.stopPropagation()}>
        {showing3d && modelUrl ? (
          <div className="h-full overflow-hidden rounded-xl border border-white/10">
            <GlbModelViewer
              url={modelUrl}
              alt={a.name}
              name={a.name}
              description={[a.how_it_works, a.lore, a.materials, a.colors, form.note]
                .filter(Boolean)
                .join(" ")}
              tags={[
                a.category,
                a.weapon_type,
                ...(a.wielders ?? []),
                a.curse_level > 0 ? "cursed" : null,
              ]}
              fallbackImageUrl={artUrl(form.art) ?? null}
              accentColor={`hsl(${art.hue}, 85%, 60%)`}
              onFallbackTo2d={() => setViewMode("2d")}
            />
          </div>
        ) : (
          <ArtFrame art={art} form={form} style="nexus" motion={motion} big />
        )}
        <div
          role="group"
          aria-label={`View mode for ${a.name}`}
          className="absolute left-6 top-6 z-20 inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-[#060a14]/90 p-0.5 text-xs font-semibold"
        >
          <button
            type="button"
            onClick={() => setViewMode("2d")}
            aria-pressed={viewMode === "2d"}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
              viewMode === "2d"
                ? "bg-accent text-accent-foreground"
                : "text-zinc-300 hover:text-white"
            }`}
          >
            <ImageIcon className="size-3.5" />
            2D
          </button>
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            aria-pressed={viewMode === "3d"}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition ${
              viewMode === "3d"
                ? "bg-accent text-accent-foreground"
                : "text-zinc-300 hover:text-white"
            }`}
          >
            <Box className="size-3.5" />
            3D
          </button>
        </div>
      </div>
      <div
        className="grid content-start gap-3 overflow-y-auto p-5 pb-16"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <ArsenalEmblem
            glyph={art.glyph}
            hue={art.hue}
            nexus
            animate={motion}
            className="size-14 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-widest text-accent">
              {CAT[a.category] ?? a.category}
              {a.weapon_type ? ` · ${a.weapon_type}` : ""}
            </p>
            <p className="text-2xl font-bold leading-tight text-foreground">{a.name}</p>
          </div>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <FormTabs art={art} i={i} set={setI} />
        <Details a={a} form={form} />
      </div>
    </div>,
    document.body,
  );
}
