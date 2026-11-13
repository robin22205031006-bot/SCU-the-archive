import { Component, useMemo, useState, type ReactNode } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/integrations/supabase/types";
import { useUiStyle } from "@/lib/ui-style";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { ArtifactCard, NexusArtifactViewer } from "@/components/arsenal-card";
import { ArsenalIsolatedView } from "@/components/arsenal-isolated";
import { DEFAULT_ARTIFACTS } from "@/lib/arsenal-art";
import { uploadModel3d } from "@/lib/models-3d";
import { Sparkles, Layers } from "lucide-react";

type Artifact = Tables<"artifacts">;
export const ARTIFACT_CATEGORIES = {
  weapon: "Weapon",
  cursed_weapon: "Cursed weapon",
  cosmic_object: "Cosmic object",
  relic: "Relic",
  serum_tech: "Tech, suits & serum",
  other: "Other",
} as const;
type Cat = keyof typeof ARTIFACT_CATEGORIES;

const isMissingTable = (error: { message?: string; code?: string } | null, table: string) =>
  !!error &&
  (error.code === "PGRST205" ||
    new RegExp(`${table}|schema cache|does not exist`, "i").test(error.message ?? ""));

const artifactsQuery = queryOptions({
  queryKey: ["artifacts"],
  queryFn: async () => {
    const { data, error } = await supabase.from("artifacts").select("*").order("name");
    if (error) {
      if (isMissingTable(error, "artifacts")) return DEFAULT_ARTIFACTS;
      throw error;
    }
    return data && data.length > 0 ? data : DEFAULT_ARTIFACTS;
  },
});

export const Route = createFileRoute("/_authenticated/arsenal")({
  head: () => ({
    meta: [
      { title: "Arsenal & Relics — Sentinels Cinematic Universe" },
      {
        name: "description",
        content:
          "Weapons, cursed blades and cosmic objects of the SCU, like Kara Yazgi, the Architect Cube and the Aether Stone.",
      },
      { property: "og:title", content: "Arsenal & Relics — SCU" },
      {
        property: "og:description",
        content:
          "Every SCU weapon, cursed blade and sacred object with wielders, materials and lore.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artifactsQuery),
  component: ArsenalPage,
  errorComponent: ArsenalError,
});

function ArsenalError({ error }: { error: unknown }) {
  const router = useRouter();
  return (
    <main className="mx-auto grid max-w-md gap-3 px-4 pt-28 text-center">
      <h1 className="text-xl font-semibold text-foreground">The Arsenal couldn't load</h1>
      <p className="break-words text-xs text-muted-foreground">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <Button onClick={() => router.invalidate()}>Try again</Button>
    </main>
  );
}

/** Keeps one broken card (art/animation) from taking down the whole app. */
class CardGuard extends Component<{ name: string; children: ReactNode }, { err: string | null }> {
  override state = { err: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) };
  }
  override componentDidCatch(e: unknown) {
    console.error("Arsenal card failed:", this.props.name, e);
  }
  override render() {
    if (this.state.err)
      return (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold text-foreground">{this.props.name}</p>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            Couldn't show this item: {this.state.err}
          </p>
        </div>
      );
    return this.props.children;
  }
}

const EMPTY = {
  name: "",
  category: "weapon" as Cat,
  weapon_type: "",
  wielders: "",
  materials: "",
  colors: "",
  curse_level: 0,
  how_it_works: "",
  lore: "",
  model_3d_url: "",
};

function ArsenalPage() {
  const { data } = useSuspenseQuery(artifactsQuery);
  const staff = useIsStaff();
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<"catalog" | "isolated">("isolated");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Cat | "all">("all");
  const style = useUiStyle();
  const motion = useNexusMotion();
  const [focusId, setFocusId] = useState<string | null>(null);
  const focus = useMemo(
    () => (focusId ? ((data ?? []).find((a) => a.id === focusId) ?? null) : null),
    [data, focusId],
  );
  const [edit, setEdit] = useState<{ id?: string; v: typeof EMPTY } | null>(null);
  const [uploading3d, setUploading3d] = useState(false);
  const list = useMemo(
    () =>
      (data ?? []).filter(
        (a) =>
          (cat === "all" || a.category === cat) &&
          `${a.name} ${(a.wielders ?? []).join(" ")} ${a.lore ?? ""}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [data, q, cat],
  );

  const save = async () => {
    if (!edit || !edit.v.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const v = edit.v;
    const row = {
      name: v.name.trim(),
      category: v.category,
      weapon_type: v.weapon_type || null,
      wielders: v.wielders
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      materials: v.materials || null,
      colors: v.colors || null,
      curse_level: Number(v.curse_level) || 0,
      how_it_works: v.how_it_works,
      lore: v.lore,
      model_3d_url: v.model_3d_url.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = edit.id
      ? await supabase.from("artifacts").update(row).eq("id", edit.id)
      : await supabase.from("artifacts").insert(row);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    if (cat !== "all" && v.category !== cat) setCat(v.category);
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["artifacts"] });
  };
  const remove = async (a: Artifact) => {
    if (!confirm(`Delete ${a.name}?`)) return undefined;
    const { error } = await supabase.from("artifacts").delete().eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (focusId === a.id) setFocusId(null);
    qc.invalidateQueries({ queryKey: ["artifacts"] });
  };
  const open = (a?: Artifact) => {
    setSubTab("catalog");
    setEdit(
      a
        ? {
            id: a.id,
            v: {
              name: a.name,
              category: (a.category in ARTIFACT_CATEGORIES ? a.category : "other") as Cat,
              weapon_type: a.weapon_type ?? "",
              wielders: (a.wielders ?? []).join(", "),
              materials: a.materials ?? "",
              colors: a.colors ?? "",
              curse_level: a.curse_level,
              how_it_works: a.how_it_works,
              lore: a.lore ?? "",
              model_3d_url: a.model_3d_url ?? "",
            },
          }
        : { v: { ...EMPTY } },
    );
  };
  const f = (k: keyof typeof EMPTY) => ({
    value: String(edit?.v[k] ?? ""),
    onChange: (e: { target: { value: string } }) =>
      setEdit((s) => s && { ...s, v: { ...s.v, [k]: e.target.value } }),
  });

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-5 px-4 pb-24 pt-24 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Arsenal & Relics</h1>
          <p className="text-sm text-muted-foreground">
            Weapons, cursed blades and sacred objects of the SCU.
          </p>
        </div>
        {staff && (
          <Button size="sm" onClick={() => open()}>
            <Plus className="mr-1 size-4" />
            Add item
          </Button>
        )}
      </header>

      {/* Sub-tab Switcher: Isolated Objects vs Catalog */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setSubTab("isolated")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            subTab === "isolated"
              ? "border border-nexus-glow/80 bg-nexus-glow/20 text-white shadow-[0_0_18px_rgba(56,189,248,0.35)]"
              : "border border-transparent bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <Sparkles className="size-4 text-nexus-glow" />
          <span>Isolated Relics & Elemental Boosters</span>
          <span className="rounded-full bg-nexus-glow/25 px-2 py-0.5 text-[10px] text-nexus-fg font-mono uppercase">
            3D Void Mode
          </span>
        </button>

        <button
          onClick={() => setSubTab("catalog")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            subTab === "catalog"
              ? "border border-accent/80 bg-accent/20 text-white shadow-sm"
              : "border border-transparent bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <Layers className="size-4" />
          <span>Archive Catalog (Dossier Cards)</span>
        </button>
      </div>

      {subTab === "isolated" ? (
        <ArsenalIsolatedView artifacts={data ?? []} onSelectArtifact={(a) => setFocusId(a.id)} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search name, wielder or lore"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...Object.keys(ARTIFACT_CATEGORIES)] as (Cat | "all")[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${cat === c ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted-foreground"}`}
                >
                  {c === "all" ? "All" : ARTIFACT_CATEGORIES[c]}
                </button>
              ))}
            </div>
          </div>
          {edit && (
            <section className="grid gap-2 rounded-2xl border border-accent/40 bg-card p-4 sm:grid-cols-2">
              <div className="flex items-center justify-between sm:col-span-2">
                <h2 className="font-semibold">{edit.id ? "Edit item" : "New item"}</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Close"
                  onClick={() => setEdit(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <Input placeholder="Name" {...f("name")} />
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                {...f("category")}
              >
                {Object.entries(ARTIFACT_CATEGORIES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <Input placeholder="Type (sword, katana, relic...)" {...f("weapon_type")} />
              <Input placeholder="Wielders (comma separated)" {...f("wielders")} />
              <Input placeholder="Materials" {...f("materials")} />
              <Input placeholder="Colors" {...f("colors")} />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Curse level (0–5)
                <Input type="number" min={0} max={5} className="w-20" {...f("curse_level")} />
              </label>
              <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25">
                  <Upload className="size-3.5" />
                  <span>{uploading3d ? "Uploading…" : "Upload 3D Model (.glb)"}</span>
                  <input
                    type="file"
                    accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                    className="sr-only"
                    disabled={uploading3d}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file || !edit) return;
                      setUploading3d(true);
                      try {
                        const url = await uploadModel3d(file, "arsenals", edit.v.name || edit.id);
                        setEdit((s) => s && { ...s, v: { ...s.v, model_3d_url: url } });
                        toast.success(`Uploaded 3D model "${file.name}".`);
                      } catch (err) {
                        toast.error(
                          err instanceof Error ? err.message : "Could not upload 3D model.",
                        );
                      } finally {
                        setUploading3d(false);
                      }
                    }}
                  />
                </label>
                <Input
                  className="min-w-0 flex-1 text-xs"
                  placeholder="3D model .glb URL (models-3d/arsenals/…)"
                  {...f("model_3d_url")}
                />
                {edit.v.model_3d_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEdit((s) => s && { ...s, v: { ...s.v, model_3d_url: "" } })}
                  >
                    Clear 3D
                  </Button>
                )}
              </div>
              <Textarea
                className="sm:col-span-2"
                placeholder="How it works"
                {...f("how_it_works")}
              />
              <Textarea className="sm:col-span-2" placeholder="Lore" {...f("lore")} />
              <div className="sm:col-span-2">
                <Button onClick={save}>Save</Button>
              </div>
            </section>
          )}
          <div
            className={`grid gap-4 sm:grid-cols-2 ${style === "minimal" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
          >
            {list.map((a) => (
              <CardGuard key={a.id} name={a.name}>
                <ArtifactCard
                  a={a}
                  style={style}
                  motion={motion}
                  staff={staff}
                  onEdit={() => open(a)}
                  onDelete={() => remove(a)}
                  onOpen={() => setFocusId(a.id)}
                />
              </CardGuard>
            ))}
            {list.length === 0 && <p className="text-sm text-muted-foreground">Nothing found.</p>}
          </div>
        </>
      )}
      {focus && style === "nexus" && (
        <CardGuard key={"v" + focus.id} name={focus.name}>
          <NexusArtifactViewer a={focus} motion={motion} onClose={() => setFocusId(null)} />
        </CardGuard>
      )}
    </main>
  );
}
