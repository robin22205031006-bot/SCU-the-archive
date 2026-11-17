import { QueryClient } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ABILITY_REGISTRY, abilityDef } from "@/lib/abilities";
import type { Entity } from "@/lib/entities";
import {
  ROLE_EMBLEM_DEFS,
  ROLE_EMBLEM_LABELS,
  emblemRoleFromAbilityKey,
  formatEmblemRolesText,
  normalizeEmblemRole,
  parseEmblemRoles,
  resolveEntityEmblemRoles,
} from "@/lib/role-emblems";
import {
  RoleEmblemBadge,
  RoleEmblemGlyph,
  RoleEmblemStrip,
  RoleMultiPicker,
} from "@/components/role-emblem";
import { syncEntityRoles } from "@/lib/role-sync";

const { updateCalls, insertCalls, mockEntityState } = vi.hoisted(() => ({
  updateCalls: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  insertCalls: [] as Array<{ table: string; payload: Record<string, unknown> }>,
  mockEntityState: {
    id: "char-1",
    kind: "character",
    role: "Support",
    status: "Alive",
    locked_fields: [] as string[],
    stats: {
      roles: ["Support"],
      teamRoles: { "team-alpha": ["Captain"] },
      dossier: {
        "series-sentinels:1": { role: "Support", roles: ["Support"] },
      },
    } as Record<string, unknown>,
  },
}));

vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (table: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      limit: () => chain,
      single: () =>
        Promise.resolve({
          data: { ...mockEntityState, stats: structuredClone(mockEntityState.stats) },
          error: null,
        }),
      update: (payload: Record<string, unknown>) => {
        updateCalls.push({ table, payload });
        return {
          eq: () => Promise.resolve({ error: null }),
        };
      },
      insert: (payload: Record<string, unknown>) => {
        insertCalls.push({ table, payload });
        return Promise.resolve({ error: null });
      },
      then: (resolve: (val: { data: unknown[]; error: null }) => unknown) => {
        const rows = table === "series_characters" ? [{ id: "sc-1" }] : [];
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
    },
  };
});

function makeChar(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "char-1",
    name: "Ethan",
    kind: "character",
    category: "Vanguard",
    role: "Captain, Main Lead",
    status: "Alive",
    alias: null,
    description: "Sentinel vanguard",
    abilities: ["Fire"],
    beast_traits: [],
    sketches: [],
    image_url: null,
    character_tier: "S",
    locked_fields: [],
    stats: {
      roles: ["Captain", "Main Lead"],
      teamRoles: {
        "org-vanguard": ["Captain", "Founder"],
      },
      dossier: {
        "series-sentinels:2": {
          role: "Leader, Anti-Hero",
          roles: ["Leader", "Anti-Hero"],
        },
      },
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as unknown as Entity;
}

describe("Role Emblems System", () => {
  beforeEach(() => {
    updateCalls.length = 0;
    insertCalls.length = 0;
    mockEntityState.role = "Support";
    mockEntityState.stats = {
      roles: ["Support"],
      teamRoles: { "team-alpha": ["Captain"] },
      dossier: {
        "series-sentinels:1": { role: "Support", roles: ["Support"] },
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("registers all 10 required roles with distinct colors and bespoke SVG emblems", () => {
    expect(ROLE_EMBLEM_LABELS).toEqual([
      "Captain",
      "Leader",
      "Director",
      "Founder",
      "Support",
      "Main Lead",
      "Main Antagonist",
      "Antagonist",
      "Anti-Villain",
      "Anti-Hero",
    ]);

    const colors = ROLE_EMBLEM_DEFS.map((d) => d.color.toLowerCase());
    expect(new Set(colors).size).toBe(10);

    for (const def of ROLE_EMBLEM_DEFS) {
      const reg = ABILITY_REGISTRY.find((a) => a.key === def.abilityKey);
      expect(reg).toBeTruthy();
      expect(reg?.tier).toBe("Role");
      expect(reg?.group).toBe("role");
      expect(reg?.color.toLowerCase()).toBe(def.color.toLowerCase());
      expect(abilityDef(def.abilityKey).label).toBe(def.label);
    }

    const { container } = render(
      <div>
        {ROLE_EMBLEM_DEFS.map((d) => (
          <RoleEmblemGlyph key={d.abilityKey} role={d.label} />
        ))}
      </div>,
    );
    const glyphs = container.querySelectorAll("[data-role-emblem-glyph]");
    expect(glyphs.length).toBe(10);
  });

  it("normalizes spacing/case variants and parses multiple roles without breaking hyphens", () => {
    expect(normalizeEmblemRole("Main lead")).toBe("Main Lead");
    expect(normalizeEmblemRole("Main antagonist")).toBe("Main Antagonist");
    expect(normalizeEmblemRole("Anti villain")).toBe("Anti-Villain");
    expect(normalizeEmblemRole("Anti Hero")).toBe("Anti-Hero");
    expect(normalizeEmblemRole("role_director")).toBe("Director");
    expect(emblemRoleFromAbilityKey("anti_villain")).toBe("Anti-Villain");

    expect(parseEmblemRoles("Captain, Leader, Anti-Hero | Main lead")).toEqual([
      "Captain",
      "Leader",
      "Anti-Hero",
      "Main Lead",
    ]);

    expect(formatEmblemRolesText(["Founder", "Anti-Villain"], "Support")).toBe(
      "Founder, Anti-Villain",
    );
    expect(formatEmblemRolesText([], "Captain")).toBe("");
    expect(formatEmblemRolesText([], "Cameo")).toBe("Cameo");
  });

  it("resolves merged roles globally, per team, and per series/season", () => {
    const ethan = makeChar();

    expect(resolveEntityEmblemRoles(ethan)).toEqual([
      "Captain",
      "Main Lead",
      "Founder",
      "Leader",
      "Anti-Hero",
    ]);

    expect(resolveEntityEmblemRoles(ethan, { groupId: "org-vanguard" })).toEqual([
      "Captain",
      "Founder",
    ]);

    expect(
      resolveEntityEmblemRoles(ethan, {
        seriesId: "series-sentinels",
        seasonNumber: 2,
      }),
    ).toEqual(["Leader", "Anti-Hero", "Captain", "Founder", "Main Lead"]);
  });

  it("renders multi-role emblem strips with colors, honors spoiler masking, and supports multi-select toggling", () => {
    render(
      <>
        <RoleEmblemBadge role="Director" />
        <RoleEmblemStrip roles={["Captain", "Leader", "Anti-Hero"]} showLabels />
      </>,
    );

    expect(screen.getByText("Director")).toBeTruthy();
    expect(screen.getByText("Captain")).toBeTruthy();
    expect(screen.getByText("Leader")).toBeTruthy();
    expect(screen.getByText("Anti-Hero")).toBeTruthy();

    cleanup();

    render(<RoleEmblemStrip roles={["Founder", "Main Antagonist"]} masked />);
    expect(screen.getByText("Roles Hidden")).toBeTruthy();
    expect(screen.queryByText("Founder")).toBeNull();

    cleanup();

    const onChange = vi.fn();
    render(<RoleMultiPicker selected={["Captain", "Support"]} onChange={onChange} />);

    const captainBtn = screen.getByRole("button", { name: "Captain" });
    const antiVillainBtn = screen.getByRole("button", { name: "Anti-Villain" });
    expect(captainBtn.getAttribute("aria-pressed")).toBe("true");
    expect(antiVillainBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(antiVillainBtn);
    expect(onChange).toHaveBeenCalledWith(["Captain", "Support", "Anti-Villain"]);
  });

  it("synchronizes role attachments across team, series, global stats, and invalidates archive queries", async () => {
    const qc = new QueryClient();
    const invSpy = vi.spyOn(qc, "invalidateQueries");

    // 1. Attach multiple roles from a Series context -> updates dossier, entity.role, stats.roles, and series_characters
    const afterSeries = await syncEntityRoles({
      qc,
      entityId: "char-1",
      roles: ["Captain", "Main Lead", "Anti-Hero"],
      scope: { type: "series", seriesId: "series-sentinels", seasonNumber: 2 },
    });

    expect(afterSeries).toEqual(["Captain", "Support", "Main Lead", "Anti-Hero"]);
    const entUpdate = updateCalls.find((c) => c.table === "entities");
    expect(entUpdate).toBeTruthy();
    expect(entUpdate?.payload["role"]).toBe("Captain, Support, Main Lead, Anti-Hero");

    const scUpdate = updateCalls.find((c) => c.table === "series_characters");
    expect(scUpdate?.payload["arc_role"]).toBe("Captain, Main Lead, Anti-Hero");
    expect(scUpdate?.payload["role_in_series"]).toBe("Captain, Main Lead, Anti-Hero");

    // 2. Attach team role from Teams context -> updates stats.teamRoles[groupId] + global roles
    updateCalls.length = 0;
    const afterTeam = await syncEntityRoles({
      qc,
      entityId: "char-1",
      roles: ["Director", "Founder"],
      scope: { type: "team", groupId: "org-vanguard" },
    });
    expect(afterTeam).toEqual(["Director", "Founder", "Support"]);
    const teamEntUpdate = updateCalls.find((c) => c.table === "entities");
    const updatedStats = teamEntUpdate?.payload["stats"] as {
      teamRoles: Record<string, string[]>;
    };
    expect(updatedStats.teamRoles["org-vanguard"]).toEqual(["Director", "Founder"]);

    expect(invSpy).toHaveBeenCalled();
  });
});
