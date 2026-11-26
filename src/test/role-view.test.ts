import { afterEach, describe, expect, it } from "vitest";
import { effectiveRoles, READER_VIEW_KEY, setReaderView } from "@/lib/role-view";

describe("View as reader", () => {
  afterEach(() => localStorage.removeItem(READER_VIEW_KEY));

  it("hides staff roles from the UI only while reader view is on", () => {
    expect(effectiveRoles(["admin"], true)).toEqual([]);
    expect(effectiveRoles(["moderator"], true)).toEqual([]);
    expect(effectiveRoles(["admin", "superadmin"], false)).toEqual(["admin", "superadmin"]);
    // readers are unaffected either way
    expect(effectiveRoles([], true)).toEqual([]);
  });

  it("is a device-local switch that can always be turned back off", () => {
    setReaderView(true);
    expect(localStorage.getItem(READER_VIEW_KEY)).toBe("1");
    setReaderView(false);
    expect(localStorage.getItem(READER_VIEW_KEY)).toBeNull();
  });
});
