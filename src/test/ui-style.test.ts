import { it, expect } from "vitest";
import { resolveUiStyle, UI_STYLES } from "@/lib/ui-style";
it("keeps the original style and offers all three named setups", () => { expect(resolveUiStyle("classic")).toBe("classic"); expect(UI_STYLES.map(s => s.label)).toEqual(["Descrete", "Nexus", "Minimal"]); });
it("persists Nexus and Minimal as separate styles", () => { expect(resolveUiStyle("nexus")).toBe("nexus"); expect(resolveUiStyle("minimal")).toBe("minimal"); });