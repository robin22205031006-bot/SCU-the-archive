import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pencil, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsAdmin, useSession } from "@/hooks/use-admin";
import { invalidateArchive } from "@/lib/archive-sync";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { seriesSeasonNames } from "@/lib/series-seasons";
import {
  askSeriesLore,
  deleteSeason,
  deleteSeries,
  saveSeasonTitles,
} from "@/lib/series-lore.functions";
import { SERIES_ORDER_KEY } from "@/lib/series-order";
import type { Series } from "@/lib/series";
import { sfx } from "@/lib/scu-audio";
import { Link } from "@tanstack/react-router";

export function SeriesTools({ series, onDeleted }: { series: Series; onDeleted?: () => void }) {
  const admin = useIsAdmin();
  const qc = useQueryClient();
  const runDeleteSeries = useServerFn(deleteSeries);
  const [editor, setEditor] = useState(false);
  const [questions, setQuestions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSeries = async () => {
    if (!admin || deleting) return;
    setDeleting(true);
    try {
      await runDeleteSeries({ data: { seriesId: series.id } });
      sfx.remove();
      toast.success(`${series.title} deleted`);
      await Promise.all([
        invalidateArchive(qc),
        qc.invalidateQueries({ queryKey: ["character-series"] }),
        qc.invalidateQueries({ queryKey: ["app-settings", SERIES_ORDER_KEY] }),
        qc.invalidateQueries({ queryKey: ["app-settings", "series_styles"] }),
      ]);
      setConfirmDelete(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The series could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {admin && (
        <Button variant="outline" onClick={() => setEditor(true)}>
          <Pencil className="h-4 w-4" />
          Season titles
        </Button>
      )}
      {admin && (
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4" />
          Delete series
        </Button>
      )}
      <Button variant="outline" onClick={() => setQuestions(true)}>
        <MessageCircle className="h-4 w-4" />
        Ask about this series
      </Button>
      {editor && <SeasonTitleEditor series={series} onClose={() => setEditor(false)} />}
      {questions && <SeriesQuestions series={series} onClose={() => setQuestions(false)} />}
      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${series.title}?`}
        description="This removes the series, its seasons, character assignments, season dossiers, and series-scoped abilities."
        confirmLabel="Delete series"
        busy={deleting}
        onConfirm={handleDeleteSeries}
      />
    </div>
  );
}

function SeasonTitleEditor({ series, onClose }: { series: Series; onClose: () => void }) {
  const admin = useIsAdmin();
  const [titles, setTitles] = useState(() => seriesSeasonNames(series));
  const [saving, setSaving] = useState(false);
  const [confirmSeason, setConfirmSeason] = useState<{ index: number; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const save = useServerFn(saveSeasonTitles);
  const removeSeason = useServerFn(deleteSeason);
  const qc = useQueryClient();
  const busy = saving || deleting;

  const submit = async () => {
    setSaving(true);
    try {
      await save({ data: { seriesId: series.id, titles } });
      await qc.invalidateQueries({ queryKey: ["series"] });
      toast.success("Season titles saved");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Season titles could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteSeason = async () => {
    if (!admin || !confirmSeason || deleting) return;
    setDeleting(true);
    try {
      const res = await removeSeason({
        data: { seriesId: series.id, season: confirmSeason.index + 1 },
      });
      sfx.remove();
      setTitles(res.season_names);
      await invalidateArchive(qc);
      toast.success(`${res.removedTitle} deleted`);
      setConfirmSeason(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The season could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
      >
        <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{series.title} · Season titles</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {titles.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">No seasons left in this series.</p>
            ) : (
              titles.map((title, i) => (
                <div key={i} className="grid gap-2">
                  <Label htmlFor={`season-title-${i}`}>Season {i + 1}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id={`season-title-${i}`}
                      maxLength={200}
                      value={title}
                      disabled={busy}
                      placeholder={`Season ${i + 1}`}
                      onChange={(event) =>
                        setTitles((current) =>
                          current.map((value, n) => (n === i ? event.target.value : value)),
                        )
                      }
                    />
                    {admin && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${title || `Season ${i + 1}`}`}
                        onClick={() =>
                          setConfirmSeason({ index: i, title: title || `Season ${i + 1}` })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            <Button type="submit" disabled={busy || !titles.length}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save season titles"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog
        open={!!confirmSeason}
        onOpenChange={(open) => !open && setConfirmSeason(null)}
        title={`Delete ${confirmSeason?.title} from ${series.title}?`}
        description={`This removes Season ${(confirmSeason?.index ?? 0) + 1} abilities and dossier entries, and shifts later seasons down.`}
        confirmLabel="Delete season"
        busy={deleting}
        onConfirm={confirmDeleteSeason}
      />
    </>
  );
}

function SeriesQuestions({ series, onClose }: { series: Series; onClose: () => void }) {
  const { data: user } = useSession();
  const charactersMasked = useSpoilerMask("characters");
  const abilitiesMasked = useSpoilerMask("abilities");
  const archiveMasked = useSpoilerMask("archive");
  const blocked = charactersMasked || abilitiesMasked || archiveMasked;
  const [season, setSeason] = useState("all");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<{
    answer: string;
    sources: string[];
    error?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askSeriesLore);
  const submit = async () => {
    if (busy || !question.trim() || blocked) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(
        await ask({
          data: { seriesId: series.id, season: season === "all" ? null : Number(season), question },
        }),
      );
    } catch {
      setResult({
        answer: "",
        sources: [],
        error: "Lore answers are unavailable right now. Your question has been kept.",
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{series.title} · Lore questions</DialogTitle>
        </DialogHeader>
        {!user ? (
          <Button asChild>
            <Link to="/auth">Sign in to ask a question</Link>
          </Button>
        ) : blocked ? (
          <p role="status" className="text-sm text-muted-foreground">
            Lore answers are paused while spoilers are hidden.
          </p>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="question-season">Season</Label>
              <Select
                value={season}
                disabled={busy}
                onValueChange={(value) => {
                  setSeason(value);
                  setResult(null);
                }}
              >
                <SelectTrigger id="question-season">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All seasons</SelectItem>
                  {seriesSeasonNames(series).map((title, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="series-question">Your question</Label>
              <Textarea
                id="series-question"
                maxLength={2000}
                rows={3}
                value={question}
                disabled={busy}
                onChange={(event) => setQuestion(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy || !question.trim()}>
              <Send className="h-4 w-4" />
              {busy ? "Finding an answer…" : "Ask question"}
            </Button>
            {result?.error && (
              <p role="alert" className="text-sm text-destructive">
                {result.error}
              </p>
            )}
            {result?.answer && (
              <div role="status" className="grid gap-3 border-t border-border pt-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</p>
                {result.sources.length > 0 && (
                  <div className="grid gap-1">
                    <h3 className="text-sm font-medium">Sources</h3>
                    {result.sources.map((source) => (
                      <p key={source} className="break-words text-xs text-muted-foreground">
                        {source}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
