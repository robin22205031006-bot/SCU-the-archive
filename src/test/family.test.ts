import { describe, it, expect } from "vitest";
import { generations, resolvePerson } from "@/lib/family";
describe("family tree", () => {
  it("places children one generation below parents and spouses together", () => {
    const g = generations(["gp", "p", "sp", "c"], [{ source_id: "gp", target_id: "p", rel: "parent" }, { source_id: "p", target_id: "sp", rel: "spouse" }, { source_id: "p", target_id: "c", rel: "parent" }]);
    expect([g.get("gp"), g.get("p"), g.get("sp"), g.get("c")]).toEqual([0, 1, 1, 2]);
  });
  it("survives cycles", () => expect(generations(["a", "b"], [{ source_id: "a", target_id: "b", rel: "parent" }, { source_id: "b", target_id: "a", rel: "parent" }]).size).toBe(2));
  it("resolves exact names and aliases only", () => {
    const p = [{ id: "1", name: "Zayn Hayes", alias: "Duskblade" }];
    expect([resolvePerson("zayn hayes", p), resolvePerson("Duskblade", p), resolvePerson("Zayn", p)]).toEqual(["1", "1", undefined]);
  });
});
