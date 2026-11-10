import { describe, it, expect } from "vitest";
import { resolveGroupIds, SHARED_ARCHIVE_KEYS } from "@/lib/archive-sync";
describe("archive sync", () => {
  it("resolves picked group names to ids case-insensitively", () => expect(resolveGroupIds(["Duskmoor ", "Sentinels", "Nope"], [{ id: "a", name: "duskmoor" }, { id: "b", name: "Sentinels" }])).toEqual(["a", "b"]));
  it("refreshes journey and clan graph data", () => { const k = SHARED_ARCHIVE_KEYS.map(x => x[0]); expect(k).toContain("character-series"); expect(k).toContain("clan-graph-memberships"); });
});
