import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { seriesQuery } from "@/lib/series";
import { seriesSeasonNames } from "@/lib/series-seasons";

/** Archive view of every series and season; reads the same series records the Series page edits. */
export function ArchiveSeasons() {
  const { data: series = [], isLoading } = useQuery(seriesQuery);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading series…</p>;
  if (!series.length) return <p className="text-sm text-muted-foreground">No series yet.</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {series.map((s) => (
        <article key={s.id} className="glass min-w-0 rounded-2xl p-4">
          <h3 className="break-words text-lg font-medium">{s.title}</h3>
          <ul className="mt-3 grid gap-1.5">
            {seriesSeasonNames(s).map((name, i) => (
              <li key={i}>
                <Link
                  to="/season"
                  search={{ series: s.id, n: i + 1 }}
                  className="block rounded-lg border border-border px-3 py-2 text-sm hover:border-accent"
                >
                  <span className="text-muted-foreground">#{i + 1}</span> {name}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
