import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { syncSessionCache } from "@/lib/session-cache";

const user = (id: string) => ({ id } as User);
describe("account-safe fast session cache", () => {
  it("keeps loaded lore on same-account token refresh", () => {
    const client = new QueryClient();
    client.setQueryData(["session"], user("reader-a"));
    client.setQueryData(["entities"], [{ name: "Ethan" }]);
    syncSessionCache(client, user("reader-a"));
    expect(client.getQueryData(["entities"])).toEqual([{ name: "Ethan" }]);
  });
  it("removes private results when switching accounts", () => {
    const client = new QueryClient();
    client.setQueryData(["session"], user("reader-a"));
    client.setQueryData(["roles"], ["admin"]);
    syncSessionCache(client, user("reader-b"));
    expect(client.getQueryData(["roles"])).toBeUndefined();
    expect(client.getQueryData<User>(["session"])?.id).toBe("reader-b");
  });
  it("removes private results on sign out", () => {
    const client = new QueryClient();
    client.setQueryData(["session"], user("reader-a"));
    client.setQueryData(["private-document"], "private");
    syncSessionCache(client, null);
    expect(client.getQueryData(["private-document"])).toBeUndefined();
    expect(client.getQueryData(["session"])).toBeNull();
  });
});