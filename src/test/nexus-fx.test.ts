import { expect, it } from "vitest";
import { nexusEffect, NEXUS_THEMES, resolveNexusTheme, nexusThemeBase } from "@/lib/nexus-fx";
it("fire ability symbols resolve to a fire simulation", () => { expect(nexusEffect("Fire ability")).toBe("fire"); });
it("bloodline symbols resolve to a lineage simulation", () => { expect(nexusEffect("Bloodlines")).toBe("bloodline"); });
it("organization symbols resolve to an organization simulation", () => { expect(nexusEffect("Organizations")).toBe("organization"); });
it("Nexus theme selection rejects Descrete theme ids", () => { expect(resolveNexusTheme("blackops")).toBe("storm"); expect(NEXUS_THEMES.some(t => t.id as string === "blackops")).toBe(false); });
it("Nexus retains its selected ability theme", () => { expect(resolveNexusTheme("fire")).toBe("fire"); });it("lore themes keep their own id and borrow a background simulation", () => { expect(resolveNexusTheme("duskmoor")).toBe("duskmoor"); expect(nexusThemeBase("duskmoor")).toBe("fire"); expect(nexusThemeBase("aethmos")).toBe("nature"); expect(NEXUS_THEMES.length).toBe(18); });
