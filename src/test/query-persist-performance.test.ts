import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { persistQueries } from "@/lib/query-persist";

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("archive persistence work", () => {
  it("does not serialize the archive for observer notifications", () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    client.setQueryData(["entities"], [{ name: "Ethan" }]);
    persistQueries(client);
    const observer = new QueryObserver(client, { queryKey: ["entities"], enabled: false });
    const unsubscribe = observer.subscribe(() => {});
    vi.advanceTimersByTime(2500);
    expect(localStorage.getItem("scu-rq-cache-v2")).toBeNull();
    unsubscribe();
    client.clear();
  });

  it("persists changed lore and removes deleted queries from the snapshot", () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    persistQueries(client);
    client.setQueryData(["entities"], [{ name: "Ethan" }]);
    vi.advanceTimersByTime(2500);
    expect(JSON.parse(localStorage.getItem("scu-rq-cache-v2") ?? "{}")).toEqual({
      '["entities"]': [{ name: "Ethan" }],
    });
    client.removeQueries({ queryKey: ["entities"] });
    vi.advanceTimersByTime(2500);
    expect(localStorage.getItem("scu-rq-cache-v2")).toBe("{}");
    client.clear();
  });
});