import { expect, it } from "vitest";
import { nexusAbilityArt } from "@/lib/nexus-ability-art";
import { resolveSymbolStyle, symbolKey } from "@/lib/nexus-symbol-settings";
it("vampire is not a wolf emblem", () => { expect(nexusAbilityArt("vampire", "PawPrint")).toBe("vampire"); expect(nexusAbilityArt("wolf")).toBe("beast"); });
it("Aether Dominion has its unique crest", () => { expect(nexusAbilityArt("aether_dominion")).toBe("aether-dominion"); expect(nexusAbilityArt("aether")).toBe("aether"); });
it("Omni Ergon has its own all-element crest", () => { expect(nexusAbilityArt("omni_ergon")).toBe("omni-ergon"); expect(nexusAbilityArt("omni_argon")).toBe("omni-ergon"); });
it("blood art is artwork rather than a blood or sword mismatch", () => { expect(nexusAbilityArt("blood_art", "Swords")).toBe("art"); });
it("red, white and purple lightning colors remain separate", () => {
 const settings = { symbols: { red_lightning: { color: "#ff0000" }, white_lightning: { color: "#ffffff" }, purple_lightning: { color: "#800080" } } };
 expect(resolveSymbolStyle(settings,"Red Lightning").color).toBe("#ff0000"); expect(resolveSymbolStyle(settings,"White Lightning").color).toBe("#ffffff"); expect(resolveSymbolStyle(settings,"Purple Lightning").color).toBe("#800080");
});
it("individual anime can override whole Nexus anime", () => { expect(resolveSymbolStyle({anime:true,symbols:{vampire:{anime:false}}},"vampire").anime).toBe(false); expect(resolveSymbolStyle({anime:true},"Organizations").anime).toBe(true); });
it("names and keys resolve the same settings", () => { expect(symbolKey("Aether Dominion")).toBe("aether_dominion"); });