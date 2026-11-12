import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { revisionDiff } from "@/lib/revision-diff";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";

export function AdminAuditLog() {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState("");
  const [compare, setCompare] = useState("");
  const [page, setPage] = useState(0);
  const {
    data: rows = [],
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-audit", page, filter],
    queryFn: async () => {
      let query = supabase
        .from("archive_revisions")
        .select("*")
        .order("recorded_at", { ascending: false })
        .order("id")
        .range(page * 50, page * 50 + 49);
      if (filter.trim()) query = query.ilike("entity_name", `%${filter.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  const active = rows.find((r) => r.id === selected);
  const { data: history = [] } = useQuery({
    queryKey: ["admin-audit-history", active?.source_table, active?.record_id],
    enabled: !!active,
    queryFn: async () => {
      if (!active) return [];
      const { data, error } = await supabase
        .from("archive_revisions")
        .select("*")
        .eq("source_table", active.source_table)
        .eq("record_id", active.record_id)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const other = history.find((r) => r.id === compare);
  const differences = active
    ? revisionDiff(other ? other.after_data : active.before_data, active.after_data)
    : [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          aria-label="Audit character search"
          placeholder="Search character or organization"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
            setSelected("");
          }}
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh audit log"
          onClick={() => void refetch()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Audit history could not be loaded.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="p-2">Timestamp</th>
              <th className="p-2">Editor</th>
              <th className="p-2">Entry</th>
              <th className="p-2">Change</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="whitespace-nowrap p-2">
                  {new Date(r.recorded_at).toLocaleString()}
                </td>
                <td className="p-2">{r.editor_name}</td>
                <td className="p-2">{r.entity_name}</td>
                <td className="p-2">
                  {r.source_table.replaceAll("_", " ")} · {r.operation.toLowerCase()}
                </td>
                <td className="p-2">
                  <Button
                    size="sm"
                    variant={selected === r.id ? "secondary" : "ghost"}
                    aria-label={`Compare revision ${r.id}`}
                    onClick={() => {
                      setSelected(r.id);
                      setCompare("");
                    }}
                  >
                    Compare
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && !error && (
        <p className="text-sm text-muted-foreground">No recorded revisions.</p>
      )}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => {
            setPage((p) => p - 1);
            setSelected("");
          }}
        >
          Previous
        </Button>
        <span className="text-xs">Page {page + 1}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={rows.length < 50}
          onClick={() => {
            setPage((p) => p + 1);
            setSelected("");
          }}
        >
          Next
        </Button>
      </div>
      {active && (
        <section className="space-y-3 border-t border-border pt-4">
          <h3 className="text-base">Revision comparison · {active.entity_name}</h3>
          <label className="grid gap-1 text-xs">
            Compare against
            <select
              aria-label="Compare against revision"
              className="h-10 w-full rounded-md border border-input bg-background px-2"
              value={compare}
              onChange={(e) => setCompare(e.target.value)}
            >
              <option value="">Before this change</option>
              {history
                .filter((r) => r.id !== active.id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.recorded_at).toLocaleString()} · {r.editor_name} · {r.operation}
                  </option>
                ))}
            </select>
          </label>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs">
              <thead>
                <tr>
                  <th className="w-1/4 p-2">Field</th>
                  <th className="p-2">{other ? "Compared revision" : "Before"}</th>
                  <th className="p-2">Selected revision</th>
                </tr>
              </thead>
              <tbody>
                {differences.map((d) => (
                  <tr key={d.field} className="border-t border-border align-top">
                    <td className="break-words p-2">{d.field}</td>
                    <td className="whitespace-pre-wrap break-words p-2 text-muted-foreground">
                      {d.before}
                    </td>
                    <td className="whitespace-pre-wrap break-words p-2">{d.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!differences.length && <p className="text-xs text-muted-foreground">No differences.</p>}
        </section>
      )}
    </div>
  );
}
