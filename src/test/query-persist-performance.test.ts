import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { IDB_CACHE_KEY, persistQueries } from "@/lib/query-persist";

const idbStore = new Map<string, unknown>();

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key: string) => idbStore.get(key)),
  set: vi.fn(async (key: string, val: unknown) => {
    idbStore.set(key, val);
  }),
  del: vi.fn(async (key: string) => {
    idbStore.delete(key);
  }),
}));

beforeEach(() => {
  idbStore.clear();
  vi.stubGlobal("indexedDB", {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("archive IndexedDB persistence", () => {
  it("does not serialize the archive for observer notifications", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    client.setQueryData(["entities"], [{ name: "Ethan" }]);
    const stop = persistQueries(client);
    const observer = new QueryObserver(client, { queryKey: ["entities"], enabled: false });
    const unsubscribe = observer.subscribe(() => {});
    vi.advanceTimersByTime(2500);
    await flushMicrotasks();
    expect(idbStore.get(IDB_CACHE_KEY)).toBeUndefined();
    unsubscribe();
    stop();
    client.clear();
  });

  it("persists changed lore to IndexedDB, skips auth/admin keys, and updates deleted queries", async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const stop = persistQueries(client);
    client.setQueryData(["entities"], [{ name: "Ethan" }]);
    client.setQueryData(["session"], { id: "u1" });
    vi.advanceTimersByTime(2500);
    await flushMicrotasks();

    const saved = idbStore.get(IDB_CACHE_KEY) as {
      clientState?: { queries?: { queryKey: unknown[]; state: { data: unknown } }[] };
    };
    expect(saved?.clientState?.queries?.map((q) => q.queryKey)).toEqual([["entities"]]);

    client.removeQueries({ queryKey: ["entities"] });
    vi.advanceTimersByTime(2500);
    await flushMicrotasks();
    const updated = idbStore.get(IDB_CACHE_KEY) as {
      clientState?: { queries?: unknown[] };
    };
    expect(updated?.clientState?.queries).toEqual([]);
    stop();
    client.clear();
  });
});