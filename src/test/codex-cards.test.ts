import { describe, expect, it } from "vitest";
import { sanitizeCodexCards, CODEX_CARD_STYLES } from "@/lib/codex-cards";

describe("sanitizeCodexCards", () => {
  it("returns empty maps for junk", () => {
    expect(sanitizeCodexCards(null)).toEqual({ chars: {}, abilities: {}, tiers: {} });
    expect(sanitizeCodexCards([1, 2])).toEqual({ chars: {}, abilities: {}, tiers: {} });
  });

  it("keeps known styles, hex colours, elements and frames only", () => {
    const out = sanitizeCodexCards({
      chars: {
        Ethan: { style: "gale", c1: "#22C55E", c2: "#BBF7D0", element: "wind", frame: 6 },
        Bad: { style: "neon", c1: "red", element: "plasma", frame: 12 },
      },
      abilities: { "Wind Guardian": { style: "regal", c1: "#3b82f6", element: "wind", frame: 8 } },
      tiers: { Godly: 7, Mythic: 9, __proto__: 3 },
    });
    expect(out.chars["Ethan"]).toEqual({
      style: "gale",
      c1: "#22c55e",
      c2: "#bbf7d0",
      element: "wind",
      frame: 6,
    });
    expect(out.chars["Bad"]).toBeUndefined();
    // abilities never carry a banner style
    expect(out.abilities["Wind Guardian"]).toEqual({ c1: "#3b82f6", element: "wind", frame: 8 });
    expect(out.tiers).toEqual({ Godly: 7 });
  });

  it("offers the eight reference styles plus extensions", () => {
    expect(CODEX_CARD_STYLES.slice(0, 8)).toEqual([
      "verdant",
      "prism",
      "ember",
      "tide",
      "bloom",
      "fae",
      "astral",
      "regal",
    ]);
  });
});
