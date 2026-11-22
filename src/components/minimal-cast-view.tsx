import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import type { Entity } from "@/lib/entities";
import { CAST_GROUPS, castGroupMeta, castMemberFor, type CastGroup } from "@/lib/scu-cast";

function initials(name: string) {
  return name
    .replace(/[()’'#]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Wraps search hits in <mark>, like the SCU Cast chart. */
function Highlight({ text, term }: { text: string; term: string }) {
  const t = term.trim();
  if (!t) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = t.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let hit = lower.indexOf(needle);
  while (hit !== -1) {
    if (hit > i) parts.push(text.slice(i, hit));
    parts.push(<mark key={hit}>{text.slice(hit, hit + t.length)}</mark>);
    i = hit + t.length;
    hit = lower.indexOf(needle, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return <>{parts}</>;
}

/**
 * Minimal style's cast layout, modelled on the SCU Cast chart: a serif hero, a
 * sticky search bar with group chips, a live count and calm cards with a group
 * colour, initials or portrait, title, real name, bloodline and abilities.
 * Presentation only: the list, search and group state come from EntitySection,
 * and opening a card uses the same dossier as every other style.
 */
export function MinimalCastView({
  list,
  total,
  query,
  onQuery,
  group,
  onGroup,
  onOpen,
  loading,
  toolbar,
}: {
  list: Entity[];
  total: number;
  query: string;
  onQuery: (q: string) => void;
  group: CastGroup | "all";
  onGroup: (g: CastGroup | "all") => void;
  onOpen: (e: Entity) => void;
  loading: boolean;
  toolbar?: ReactNode;
}) {
  const open = (e: Entity) => (ev: KeyboardEvent) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      onOpen(e);
    }
  };
  return (
    <section className="mcast" aria-label="The SCU Cast">
      <header className="mcast-hero">
        <h1>The SCU Cast</h1>
        <p>
          Every character across Sentinels, Redline, the Bloodlines and Divine Beasts, with their
          real names, titles and powers.
        </p>
        {toolbar && <div className="mcast-toolbar">{toolbar}</div>}
      </header>

      <div className="mcast-bar">
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search names, titles, bloodlines or powers"
          aria-label="Search characters"
          autoComplete="off"
        />
        <div className="mcast-chips" role="group" aria-label="Filter by group">
          <button
            type="button"
            className="mcast-chip"
            aria-pressed={group === "all"}
            onClick={() => onGroup("all")}
          >
            Everyone
          </button>
          {CAST_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              className="mcast-chip"
              aria-pressed={group === g.id}
              onClick={() => onGroup(g.id)}
              style={{ "--g": `var(--mc-${g.id})` } as CSSProperties}
            >
              <span className="mcast-dot" aria-hidden="true" />
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mcast-count" aria-live="polite">
        {loading ? "Loading the cast…" : `${list.length} of ${total} characters`}
      </p>

      {!loading && list.length === 0 ? (
        <p className="mcast-empty">No one matches that yet.</p>
      ) : (
        <div className="mcast-grid">
          {list.map((e) => {
            const cast = castMemberFor(e.name);
            const g = castGroupMeta(cast?.group)?.id ?? "others";
            const title = cast?.title || e.alias || "";
            const bloodline = cast?.bloodline || e.category || "";
            const abilities = cast?.abilities || e.description || "Not recorded in the files.";
            return (
              <article
                key={e.id}
                className="mcast-card"
                style={{ "--g": `var(--mc-${g})` } as CSSProperties}
                role="button"
                tabIndex={0}
                aria-label={`Open ${e.name}`}
                onClick={() => onOpen(e)}
                onKeyDown={open(e)}
                data-cast-group={g}
              >
                <div className="mcast-top">
                  <div className="mcast-av" aria-hidden="true" data-spoiler="char">
                    {e.image_url ? (
                      <img src={e.image_url} alt="" loading="lazy" />
                    ) : (
                      initials(e.name)
                    )}
                  </div>
                  <div data-spoiler="char">
                    <h2>
                      <Highlight text={e.name} term={query} />
                    </h2>
                    {title && (
                      <p className="mcast-title">
                        <Highlight text={title} term={query} />
                      </p>
                    )}
                  </div>
                </div>
                <div className="mcast-meta" data-spoiler="char">
                  {cast?.realName ? (
                    <span className="mcast-tag mcast-real">
                      Real name: <Highlight text={cast.realName} term={query} />
                    </span>
                  ) : (
                    <span className="mcast-tag">No real name yet</span>
                  )}
                  {bloodline && (
                    <span className="mcast-tag">
                      <Highlight text={bloodline} term={query} />
                    </span>
                  )}
                </div>
                <p className="mcast-lbl">Abilities</p>
                <p data-spoiler="char">
                  <Highlight text={abilities} term={query} />
                </p>
              </article>
            );
          })}
        </div>
      )}
      <footer className="mcast-foot">
        Real names come from the character chart; characters added later don’t have one yet. Where
        the files don’t describe a power, the card says so instead of guessing.
      </footer>
    </section>
  );
}
