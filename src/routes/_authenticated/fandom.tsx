import { NexusExplorer } from "@/components/nexus-explorer";
import { useUiStyle } from "@/lib/ui-style";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowBigUp, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useIsStaff, useSession } from "@/hooks/use-admin";
import { useIsManga } from "@/hooks/use-ui-mode";
import { MangaChapterBanner, MangaPanel, MangaThoughtBox } from "@/components/manga-view";

export const Route = createFileRoute("/_authenticated/fandom")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Fandom — Sentinels Cinematic Universe" },
      {
        name: "description",
        content: "Discuss the Sentinels Cinematic Universe with the community.",
      },
      { property: "og:title", content: "Fandom — SCU" },
      { property: "og:description", content: "Discuss the SCU with the community." },
    ],
  }),
  component: Fandom,
});

const displayName = (email?: string | null) => (email ? email.split("@")[0] : "Sentinel");

function Fandom() {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const qc = useQueryClient();
  const { data: user } = useSession();
  const isStaff = useIsStaff();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [openPost, setOpenPost] = useState<string | null>(null);

  const { data: posts } = useQuery({
    queryKey: ["posts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const p = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (p.error) throw p.error;
      const ids = (p.data ?? []).map((post) => post.id);
      if (!ids.length) return [];
      const [v, c] = await Promise.all([
        supabase.from("post_votes").select("post_id, user_id").in("post_id", ids),
        supabase.from("comments").select("post_id").in("post_id", ids),
      ]);
      if (v.error || c.error) throw v.error ?? c.error;
      const votes = new Map<string, number>();
      const mine = new Set<string>();
      const counts = new Map<string, number>();
      for (const vote of v.data ?? []) {
        votes.set(vote.post_id, (votes.get(vote.post_id) ?? 0) + 1);
        if (vote.user_id === user?.id) mine.add(vote.post_id);
      }
      for (const comment of c.data ?? [])
        counts.set(comment.post_id, (counts.get(comment.post_id) ?? 0) + 1);
      return (p.data ?? []).map((post) => ({
        ...post,
        votes: votes.get(post.id) ?? 0,
        mine: mine.has(post.id),
        comments: counts.get(post.id) ?? 0,
      }));
    },
  });

  const create = async () => {
    if (!title.trim() || !body.trim()) return;
    const { error } = await supabase
      .from("posts")
      .insert({ title, body, author_name: displayName(user?.email) ?? null });
    if (error) {
      toast.error("Couldn't post — you may be blocked from the community.");
      return;
    }
    setTitle("");
    setBody("");
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const vote = async (id: string, mine: boolean) => {
    if (!user) return;
    const { error } = mine
      ? await supabase.from("post_votes").delete().eq("post_id", id).eq("user_id", user.id)
      : await supabase.from("post_votes").insert({ post_id: id });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  const sorted = [...(posts ?? [])].sort(
    (a, b) => b.votes - a.votes || +new Date(b.created_at) - +new Date(a.created_at),
  );

  return (
    <main className={`mx-auto max-w-3xl px-4 pb-24 sm:px-5 ${isManga ? "pt-6" : "pt-28"}`}>
      {isManga ? (
        <MangaChapterBanner
          chapter="CH. 08 // FANDOM"
          jp="読者投稿欄・考察"
          title="Fandom"
          subtitle="Reader mailbag, canon theories, and serialized debate boards."
          stamp="投書"
        />
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Community</p>
          <h1 className="mt-2 text-5xl font-medium glow-text">Fandom</h1>
        </>
      )}

      <div
        className={
          isManga
            ? "manga-panel mt-6 grid gap-3 border-[3px] border-foreground bg-card p-4"
            : "glass mt-8 grid gap-3 rounded-2xl p-4"
        }
      >
        <Input
          placeholder="Topic title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          className={
            isManga ? "rounded-none border-2 border-foreground font-mono text-xs" : undefined
          }
        />
        <Textarea
          placeholder="Share a theory, question or moment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          className={isManga ? "rounded-none border-2 border-foreground text-sm" : undefined}
        />
        <Button
          onClick={create}
          disabled={!title.trim() || !body.trim()}
          className={`justify-self-end ${
            isManga
              ? "manga-ink-btn rounded-none border-2 border-foreground bg-foreground text-background"
              : ""
          }`}
        >
          {isManga ? "PUBLISH DISPATCH" : "Post"}
        </Button>
      </div>

      {nexus ? (
        <div className="mt-8">
          <NexusExplorer
            label="Discussions"
            records={sorted.map((p) => ({
              id: p.id,
              title: p.title,
              group: p.votes > 0 ? "Trending" : "Recent",
              subtitle: `${p.author_name} · ${p.comments} comments`,
              post: p,
            }))}
            renderDetail={({ post: p }) => (
              <article className="glass rounded-2xl p-4">
                <div className="flex gap-3">
                  <button
                    onClick={() => vote(p.id, p.mine)}
                    aria-label="Upvote"
                    className={`flex flex-col items-center text-xs ${p.mine ? "text-accent" : "text-muted-foreground"}`}
                  >
                    <ArrowBigUp className="h-6 w-6" />
                    {p.votes}
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-medium">{p.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {p.author_name} · {new Date(p.created_at).toLocaleDateString()}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm">{p.body}</p>
                    <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                      <button
                        onClick={() => setOpenPost(openPost === p.id ? null : p.id)}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {p.comments} comments
                      </button>
                      {(isStaff || p.author_id === user?.id) && (
                        <button
                          onClick={() => remove(p.id)}
                          className="flex items-center gap-1 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                    {openPost === p.id && <Comments postId={p.id} />}
                  </div>
                </div>
              </article>
            )}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {sorted.map((p, idx) => (
            <article
              key={p.id}
              className={
                isManga
                  ? "manga-panel border-[3px] border-foreground bg-card p-4"
                  : "glass rounded-2xl p-4"
              }
            >
              <div className="flex gap-3">
                <button
                  onClick={() => vote(p.id, p.mine)}
                  aria-label="Upvote"
                  className={
                    isManga
                      ? `flex h-fit flex-col items-center border-2 border-foreground px-2 py-1 font-mono text-xs font-bold ${
                          p.mine
                            ? "border-[#b91c1c] bg-[#b91c1c] text-white"
                            : "bg-background text-foreground hover:bg-secondary"
                        }`
                      : `flex flex-col items-center text-xs ${p.mine ? "text-accent" : "text-muted-foreground"}`
                  }
                >
                  <ArrowBigUp className="h-5 w-5" />
                  {p.votes}
                </button>
                <div className="min-w-0 flex-1">
                  {isManga && (
                    <span className="mb-1 inline-block bg-foreground px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-background">
                      THREAD #{String(idx + 1).padStart(2, "0")}
                    </span>
                  )}
                  <h2
                    className={
                      isManga
                        ? "font-display text-2xl uppercase tracking-wide"
                        : "text-xl font-medium"
                    }
                  >
                    {p.title}
                  </h2>
                  <p className="font-mono text-[11px] uppercase text-muted-foreground">
                    {p.author_name} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm">{p.body}</p>
                  <div className="mt-3 flex gap-3 font-mono text-[11px] uppercase text-muted-foreground">
                    <button
                      onClick={() => setOpenPost(openPost === p.id ? null : p.id)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {p.comments} comments
                    </button>
                    {(isStaff || p.author_id === user?.id) && (
                      <button
                        onClick={() => remove(p.id)}
                        className="flex items-center gap-1 hover:text-[#b91c1c]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                  {openPost === p.id && <Comments postId={p.id} />}
                </div>
              </div>
            </article>
          ))}
          {posts &&
            !posts.length &&
            (isManga ? (
              <MangaThoughtBox label="MAILBAG EMPTY">
                No discussions yet — start the first debate.
              </MangaThoughtBox>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No discussions yet — start one.
              </p>
            ))}
        </div>
      )}
    </main>
  );
}

function Comments({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const { data: user } = useSession();
  const isStaff = useIsStaff();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const send = async () => {
    if (!text.trim()) return;
    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      parent_id: replyTo,
      body: text,
      author_name: displayName(user?.email) ?? null,
    });
    if (error) {
      toast.error("Couldn't comment — you may be blocked.");
      return;
    }
    setText("");
    setReplyTo(null);
    qc.invalidateQueries({ queryKey: ["comments", postId] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["comments", postId] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };
  const roots = (data ?? []).filter((c) => !c.parent_id);
  const replies = (id: string) => (data ?? []).filter((c) => c.parent_id === id);
  const Row = ({ c, nested }: { c: NonNullable<typeof data>[number]; nested?: boolean }) => (
    <div className={nested ? "ml-5 border-l pl-3" : ""}>
      <p className="text-sm">
        <span className="font-medium">{c.author_name}</span>{" "}
        <span className="text-foreground/85">{c.body}</span>
      </p>
      <div className="flex gap-3 text-[11px] text-muted-foreground">
        {!nested && <button onClick={() => setReplyTo(c.id)}>Reply</button>}
        {(isStaff || c.author_id === user?.id) && <button onClick={() => del(c.id)}>Delete</button>}
      </div>
    </div>
  );
  return (
    <div className="mt-4 grid gap-3 border-t pt-3">
      {roots.map((c) => (
        <div key={c.id} className="grid gap-2">
          <Row c={c} />
          {replies(c.id).map((r) => (
            <Row key={r.id} c={r} nested />
          ))}
        </div>
      ))}
      {replyTo && (
        <p className="text-xs text-accent">
          Replying…{" "}
          <button className="underline" onClick={() => setReplyTo(null)}>
            cancel
          </button>
        </p>
      )}
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment"
          maxLength={2000}
        />
        <Button size="sm" onClick={send}>
          Send
        </Button>
      </div>
    </div>
  );
}
