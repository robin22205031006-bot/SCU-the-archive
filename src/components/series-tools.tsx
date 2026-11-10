import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Pencil, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsAdmin, useSession } from "@/hooks/use-admin";
import { useSpoilerMask } from "@/lib/spoiler-mask";
import { seriesSeasonNames } from "@/lib/series-seasons";
import { askSeriesLore, saveSeasonTitles } from "@/lib/series-lore.functions";
import type { Series } from "@/lib/series";
import { Link } from "@tanstack/react-router";

export function SeriesTools({ series }: { series: Series }) {
  const admin = useIsAdmin();
  const [editor, setEditor] = useState(false);
  const [questions, setQuestions] = useState(false);
  return <div className="flex flex-wrap gap-2">
    {admin && <Button variant="outline" onClick={() => setEditor(true)}><Pencil className="h-4 w-4" />Season titles</Button>}
    <Button variant="outline" onClick={() => setQuestions(true)}><MessageCircle className="h-4 w-4" />Ask about this series</Button>
    {editor && <SeasonTitleEditor series={series} onClose={() => setEditor(false)} />}
    {questions && <SeriesQuestions series={series} onClose={() => setQuestions(false)} />}
  </div>;
}

function SeasonTitleEditor({ series, onClose }: { series: Series; onClose: () => void }) {
  const [titles, setTitles] = useState(() => seriesSeasonNames(series));
  const [saving, setSaving] = useState(false);
  const save = useServerFn(saveSeasonTitles);
  const qc = useQueryClient();
  const submit = async () => {
    setSaving(true);
    try {
      await save({ data: { seriesId: series.id, titles } });
      await qc.invalidateQueries({ queryKey: ["series"] });
      toast.success("Season titles saved");
      onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Season titles could not be saved."); }
    finally { setSaving(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{series.title} · Season titles</DialogTitle></DialogHeader>
    <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
      {titles.map((title, i) => <div key={i} className="grid gap-2"><Label htmlFor={`season-title-${i}`}>Season {i + 1}</Label><Input id={`season-title-${i}`} maxLength={200} value={title} disabled={saving} placeholder={`Season ${i + 1}`} onChange={event => setTitles(current => current.map((value, n) => n === i ? event.target.value : value))} /></div>)}
      <Button type="submit" disabled={saving || !titles.length}><Save className="h-4 w-4" />{saving ? "Saving…" : "Save season titles"}</Button>
    </form>
  </DialogContent></Dialog>;
}

function SeriesQuestions({ series, onClose }: { series: Series; onClose: () => void }) {
  const { data: user } = useSession();
  const charactersMasked = useSpoilerMask("characters");
  const abilitiesMasked = useSpoilerMask("abilities");
  const archiveMasked = useSpoilerMask("archive");
  const blocked = charactersMasked || abilitiesMasked || archiveMasked;
  const [season, setSeason] = useState("all");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<{ answer: string; sources: string[]; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = useServerFn(askSeriesLore);
  const submit = async () => {
    if (busy || !question.trim() || blocked) return;
    setBusy(true); setResult(null);
    try { setResult(await ask({ data: { seriesId: series.id, season: season === "all" ? null : Number(season), question } })); }
    catch { setResult({ answer: "", sources: [], error: "Lore answers are unavailable right now. Your question has been kept." }); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{series.title} · Lore questions</DialogTitle></DialogHeader>
    {!user ? <Button asChild><Link to="/auth">Sign in to ask a question</Link></Button> : blocked ? <p role="status" className="text-sm text-muted-foreground">Lore answers are paused while spoilers are hidden.</p> : <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <div className="grid gap-2"><Label htmlFor="question-season">Season</Label><Select value={season} disabled={busy} onValueChange={value => { setSeason(value); setResult(null); }}><SelectTrigger id="question-season"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All seasons</SelectItem>{seriesSeasonNames(series).map((title, i) => <SelectItem key={i} value={String(i + 1)}>{title}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid gap-2"><Label htmlFor="series-question">Your question</Label><Textarea id="series-question" maxLength={2000} rows={3} value={question} disabled={busy} onChange={event => setQuestion(event.target.value)} /></div>
      <Button type="submit" disabled={busy || !question.trim()}><Send className="h-4 w-4" />{busy ? "Finding an answer…" : "Ask question"}</Button>
      {result?.error && <p role="alert" className="text-sm text-destructive">{result.error}</p>}
      {result?.answer && <div role="status" className="grid gap-3 border-t border-border pt-4"><p className="whitespace-pre-wrap text-sm leading-relaxed">{result.answer}</p>{result.sources.length > 0 && <div className="grid gap-1"><h3 className="text-sm font-medium">Sources</h3>{result.sources.map(source => <p key={source} className="break-words text-xs text-muted-foreground">{source}</p>)}</div>}</div>}
    </form>}
  </DialogContent></Dialog>;
}