import { describe, expect, it } from "vitest";
import { executeSyncPlan } from "@/lib/lore-sync-exec";
import type { SyncPlan } from "@/lib/adminLoreSync";

type Call = { table: string; op: string; rows?: unknown[]; ids?: string[]; patch?: unknown };

/** Minimal chainable stand-in for the Supabase client, recording every request. */
function fakeDb(
  opts: { existingNotes?: Array<{ entity_id: string; text: string }>; failOn?: string } = {},
) {
  const calls: Call[] = [];
  let seq = 0;
  const from = (table: string) => {
    const call: Call = { table, op: "" };
    const result = () => {
      calls.push(call);
      if (opts.failOn && `${table}.${call.op}` === opts.failOn)
        return { data: null, error: { message: "boom" } };
      if (call.op === "insert" && table === "entities")
        return {
          data: (call.rows as Array<{ name: string }>).map((r) => ({
            id: `id${++seq}`,
            name: r.name,
          })),
          error: null,
        };
      if (call.op === "select" && table === "lore_notes")
        return {
          data: (opts.existingNotes ?? []).filter((n) => call.ids?.includes(n.entity_id)),
          error: null,
        };
      if (call.op === "select" && table === "entities") return { data: [], error: null };
      return { data: null, error: null };
    };
    const chain: Record<string, unknown> = {
      insert(rows: unknown) {
        call.op = "insert";
        call.rows = Array.isArray(rows) ? rows : [rows];
        return chain;
      },
      update(patch: unknown) {
        call.op = "update";
        call.patch = patch;
        return chain;
      },
      select() {
        if (!call.op) call.op = "select";
        return chain;
      },
      in(_col: string, ids: string[]) {
        call.ids = ids;
        return chain;
      },
      eq() {
        return chain;
      },
      then(res: (v: unknown) => unknown, rej: (e: unknown) => unknown) {
        return Promise.resolve(result()).then(res, rej);
      },
    };
    return chain;
  };
  return { db: { from } as never, calls };
}

function bigPlan(n: number): SyncPlan {
  return {
    entityInserts: Array.from({ length: n }, (_, i) => ({
      kind: "character" as const,
      name: `New ${i}`,
      alias: null,
      role: null,
      status: null,
      category: null,
      description: "",
      image_url: null,
      source: "cast",
      notes: i % 10 === 0 ? ["conflict"] : [],
    })),
    loreNoteInserts: Array.from({ length: n * 2 }, (_, i) => ({
      entity_id: `e${i % n}`,
      text: `note ${i}`,
      source: "cast",
    })),
    entityUpdates: Array.from({ length: n }, (_, i) => ({
      id: `e${i}`,
      patch: { status: i % 2 ? "Alive" : "Dead" },
    })),
    timelineInserts: Array.from({ length: n }, (_, i) => ({
      title: `Event ${i}`,
      era: null,
      description: "",
      source: "x",
      sort_order: i,
    })),
    warnings: [],
  };
}

describe("executeSyncPlan (batched)", () => {
  it("writes a full-size sync in a few dozen requests, not thousands", async () => {
    const { db, calls } = fakeDb();
    const sum = await executeSyncPlan(db, bigPlan(300), "test");
    // one-row-at-a-time used ~1,500 requests for this plan
    expect(calls.length).toBeLessThan(40);
    expect(sum).toMatchObject({ created: 300, notes: 600, events: 300 });
    const entityRows = calls
      .filter((c) => c.table === "entities" && c.op === "insert")
      .reduce((a, c) => a + (c.rows?.length ?? 0), 0);
    expect(entityRows).toBe(300);
    // conflict notes land on the ids the database returned
    const conflict = calls.find(
      (c) =>
        c.table === "lore_notes" &&
        c.op === "insert" &&
        (c.rows as Array<{ text: string }>)[0]?.text === "conflict",
    );
    expect((conflict?.rows as Array<{ entity_id: string }>)[0]?.entity_id).toMatch(/^id\d+$/);
    // identical patches share one update
    const ups = calls.filter((c) => c.table === "entities" && c.op === "update");
    expect(ups.length).toBeLessThanOrEqual(12);
    expect(ups.reduce((a, c) => a + (c.ids?.length ?? 0), 0)).toBe(300);
  });

  it("skips notes a card already has and never re-sends them", async () => {
    const { db, calls } = fakeDb({ existingNotes: [{ entity_id: "e0", text: "note 0" }] });
    const sum = await executeSyncPlan(db, { ...bigPlan(3), entityInserts: [] }, "t");
    expect(sum.notes).toBe(5);
    const sent = calls
      .filter((c) => c.table === "lore_notes" && c.op === "insert")
      .flatMap((c) => c.rows as Array<{ text: string }>);
    expect(sent.map((r) => r.text)).not.toContain("note 0");
  });

  it("surfaces a failed write instead of reporting success", async () => {
    const { db } = fakeDb({ failOn: "timeline_events.insert" });
    await expect(executeSyncPlan(db, bigPlan(5), "t")).rejects.toThrow(/could not finish/);
  });
});
