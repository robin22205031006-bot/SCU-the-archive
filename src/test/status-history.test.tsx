import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Entity } from "@/lib/entities";

const { updateCalls, insertCalls, mockSelectData, mockEntityState } = vi.hoisted(() => ({
  updateCalls: [] as Array<{ table: string; payload: unknown }>,
  insertCalls: [] as Array<{ table: string; payload: unknown }>,
  mockEntityState: {
    stats: {
      dossier: {
        "series-sentinels:1": { roster: true, status: "Alive" },
        "series-sentinels:2": { roster: true, status: "Sealed" },
      },
    } as Record<string, unknown>,
  },
  mockSelectData: {
    artifacts: [],
    character_abilities: [
      {
        id: "ca-s1",
        entity_id: "char-grace",
        series_id: "series-sentinels",
        season_number: 1,
        ability_key: "red_lightning",
        level: 2,
        note: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
    series_characters: [
      {
        id: "sc-1",
        series_id: "series-sentinels",
        character_id: "char-grace",
        status: "Sealed",
        role_in_series: "Support",
        arc_role: "Support",
      },
    ],
    entities: [],
    timeline_events: [],
  } as Record<string, unknown[]>,
}));

vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-start")>();
  return {
    ...actual,
    useServerFn: () => vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => {
  const makeBuilder = (table: string) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      is: () => chain,
      ilike: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () =>
        Promise.resolve({
          data: {
            id: "char-grace",
            stats: mockEntityState.stats,
            locked_fields: [],
            status: "Alive",
            role: "Support",
          },
          error: null,
        }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      update: (payload: unknown) => {
        updateCalls.push({ table, payload });
        if (
          table === "entities" &&
          payload &&
          typeof payload === "object" &&
          "stats" in payload &&
          payload.stats &&
          typeof payload.stats === "object"
        ) {
          mockEntityState.stats = payload.stats as Record<string, unknown>;
        }
        return {
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: "char-grace" }, error: null }),
            }),
            then: (resolve: (val: { error: null }) => unknown) =>
              Promise.resolve({ error: null }).then(resolve),
          }),
        };
      },
      insert: (payload: unknown) => {
        insertCalls.push({ table, payload });
        return Promise.resolve({ error: null });
      },
      delete: () => chain,
      then: (resolve: (val: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: mockSelectData[table] ?? [], error: null }).then(resolve),
    };
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
    },
  };
});

import {
  appendStatusHistory,
  readStatusHistory,
  resolveCharacterStatusTimeline,
} from "@/lib/status-history";
import { readLoreStatusEvents } from "@/lib/lore-status-events";
import { StatusHistoryTimeline } from "@/components/status-history-timeline";
import { NexusRosterEditor } from "@/components/nexus-roster-editor";
import { LoreExplorer } from "@/components/LoreExplorer";

function makeGraceEntity(extraStats: Record<string, unknown> = {}): Entity {
  return {
    id: "char-grace",
    name: "Grace",
    kind: "character",
    category: "Support",
    role: "Support",
    status: "Alive",
    alias: "Angel",
    description: "Field operative",
    abilities: [],
    beast_traits: [],
    sketches: [],
    image_url: null,
    character_tier: "sentinel",
    locked_fields: [],
    stats: {
      dossier: {
        "series-sentinels:1": {
          roster: true,
          status: "Alive",
          role: "Support",
        },
        "series-sentinels:2": {
          roster: true,
          status: "Sealed",
          role: "Main Lead",
        },
        "series-sentinels:3": {
          roster: true,
          status: "Retired",
          role: "Support",
        },
      },
      ...extraStats,
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as unknown as Entity;
}

function wrapWithQc(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["artifacts"], []);
  qc.setQueryData(["entities", "bloodline,clan,faction,organization"], []);
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("Character status history tracking & Lore Explorer status update logging", () => {
  beforeEach(() => {
    localStorage.clear();
    updateCalls.length = 0;
    insertCalls.length = 0;
    mockEntityState.stats = {
      dossier: {
        "series-sentinels:1": { roster: true, status: "Alive" },
        "series-sentinels:2": { roster: true, status: "Sealed" },
      },
    };
  });

  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("records status changes chronologically and ignores identical no-op updates", () => {
    const initial = { dossier: {} };
    const first = appendStatusHistory(initial, {
      entityId: "char-grace",
      entityName: "Grace",
      fromStatus: "Alive",
      toStatus: "Retired",
      seriesId: "series-sentinels",
      seriesTitle: "The Sentinels",
      seasonNumber: 2,
      seasonLabel: "The Sentinels · S2",
      changedAt: "2026-11-10T10:00:00.000Z",
      source: "roster",
    });

    expect(first.recorded).toBe(true);
    expect(readStatusHistory(first.stats)).toHaveLength(1);
    expect(readStatusHistory(first.stats)[0]).toMatchObject({
      fromStatus: "Alive",
      toStatus: "Retired",
      seasonNumber: 2,
    });

    const noop = appendStatusHistory(first.stats, {
      entityId: "char-grace",
      entityName: "Grace",
      fromStatus: "Retired",
      toStatus: "retired",
      seriesId: "series-sentinels",
      seasonNumber: 2,
      source: "roster",
    });
    expect(noop.recorded).toBe(false);
    expect(readStatusHistory(noop.stats)).toHaveLength(1);

    const second = appendStatusHistory(first.stats, {
      entityId: "char-grace",
      entityName: "Grace",
      fromStatus: "Retired",
      toStatus: "Missing",
      seriesId: "series-sentinels",
      seriesTitle: "The Sentinels",
      seasonNumber: 3,
      seasonLabel: "The Sentinels · S3",
      changedAt: "2026-11-12T12:00:00.000Z",
      source: "roster",
    });
    expect(second.recorded).toBe(true);
    expect(readStatusHistory(second.stats).map((e) => `${e.fromStatus}->${e.toStatus}`)).toEqual([
      "Alive->Retired",
      "Retired->Missing",
    ]);
  });

  it("visualizes status transitions across seasons in StatusHistoryTimeline and supports season jump", () => {
    const grace = makeGraceEntity({
      status_history: [
        {
          id: "sh-1",
          entityId: "char-grace",
          entityName: "Grace",
          fromStatus: "Alive",
          toStatus: "Sealed",
          seriesId: "series-sentinels",
          seriesTitle: "The Sentinels",
          seasonNumber: 2,
          seasonLabel: "The Sentinels · S2",
          changedAt: "2026-11-10T09:00:00.000Z",
          source: "roster",
        },
        {
          id: "sh-2",
          entityId: "char-grace",
          entityName: "Grace",
          fromStatus: "Sealed",
          toStatus: "Retired",
          seriesId: "series-sentinels",
          seriesTitle: "The Sentinels",
          seasonNumber: 3,
          seasonLabel: "The Sentinels · S3",
          changedAt: "2026-11-15T14:30:00.000Z",
          source: "roster",
        },
      ],
    });

    const timeline = resolveCharacterStatusTimeline({
      entity: grace,
      seriesList: [
        {
          id: "series-sentinels",
          title: "The Sentinels",
          season_names: ["Season 1", "Season 2", "Season 3"],
        },
      ],
      order: ["series-sentinels"],
    });
    expect(timeline.steps.map((s) => `${s.shortLabel}:${s.status}`)).toEqual([
      "Sentinels · S1:Alive",
      "Sentinels · S2:Sealed",
      "Sentinels · S3:Retired",
    ]);
    expect(timeline.transitions).toHaveLength(2);
    expect(timeline.currentStatus).toBe("Retired");

    const onSelectSeason = vi.fn();
    render(
      wrapWithQc(
        <StatusHistoryTimeline
          entity={grace}
          seriesList={[
            {
              id: "series-sentinels",
              title: "The Sentinels",
              season_names: ["Season 1", "Season 2", "Season 3"],
            },
          ]}
          order={["series-sentinels"]}
          onSelectSeason={onSelectSeason}
        />,
      ),
    );

    const container = screen.getByTestId("status-history-timeline");
    expect(within(container).getByTestId("status-transition-count")).toHaveTextContent("2 changes");
    expect(within(container).getByTestId("status-latest-transition")).toHaveTextContent(
      "SealedRetired",
    );
    expect(screen.getByTestId("status-step-0")).toHaveAttribute("data-status", "Alive");
    expect(screen.getByTestId("status-step-1")).toHaveAttribute("data-transition", "true");
    expect(screen.getByTestId("status-step-2")).toHaveAttribute("data-status", "Retired");

    fireEvent.click(within(screen.getByTestId("status-step-2")).getByRole("button"));
    expect(onSelectSeason).toHaveBeenCalledWith({
      seriesId: "series-sentinels",
      seasonNumber: 3,
    });
  });

  it("logs a 'status update' event into Lore Explorer automatically when status changes in NexusRosterEditor", async () => {
    const grace = makeGraceEntity();
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    qc.setQueryData(["artifacts"], []);
    qc.setQueryData(["entities", "bloodline,clan,faction,organization"], []);

    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <NexusRosterEditor
          open
          onClose={vi.fn()}
          entities={[grace]}
          seriesId="series-sentinels"
          season={2}
          label="The Sentinels · S2"
        />
        <LoreExplorer />
      </QueryClientProvider>,
    );

    // Wait for roster editor abilities load so Save button enables
    const saveBtn = screen.getByRole("button", { name: /^Save season$/i });
    await waitFor(() => {
      expect(saveBtn).not.toBeDisabled();
    });

    // Change Grace's status from Sealed -> Retired and save
    const statusSelect = screen.getByLabelText("Season status") as HTMLSelectElement;
    expect(statusSelect.value).toBe("Sealed");
    fireEvent.change(statusSelect, { target: { value: "Retired" } });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateCalls.some((c) => c.table === "entities")).toBe(true);
    });

    const entityUpdate = updateCalls.find((c) => c.table === "entities");
    const updatedStats = (entityUpdate?.payload as { stats: { status_history?: unknown[] } }).stats;
    expect(updatedStats.status_history).toHaveLength(1);
    expect(updatedStats.status_history?.[0]).toMatchObject({
      entityId: "char-grace",
      entityName: "Grace",
      fromStatus: "Sealed",
      toStatus: "Retired",
      seriesId: "series-sentinels",
      seasonNumber: 2,
      source: "roster",
    });

    await waitFor(() => {
      expect(insertCalls.some((c) => c.table === "timeline_events")).toBe(true);
    });
    const timelineInsert = insertCalls.find((c) => c.table === "timeline_events");
    expect(timelineInsert?.payload).toMatchObject({
      era: "Status Update",
      source: "status update",
    });

    expect(readLoreStatusEvents()).toHaveLength(1);

    // Re-saving without modifying the status does not duplicate status history or Lore Explorer events
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(updateCalls.filter((c) => c.table === "entities")).toHaveLength(2);
    });
    expect(readLoreStatusEvents()).toHaveLength(1);

    // Close the modal so background LoreExplorer is interactive & accessible
    rerender(
      <QueryClientProvider client={qc}>
        <NexusRosterEditor
          open={false}
          onClose={vi.fn()}
          entities={[grace]}
          seriesId="series-sentinels"
          season={2}
          label="The Sentinels · S2"
        />
        <LoreExplorer />
      </QueryClientProvider>,
    );

    // LoreExplorer header now exposes Status Updates (1); clicking opens the Status Update feed
    const statusUpdatesBtn = await screen.findByRole("button", {
      name: /View status update events \(1\)/i,
    });
    fireEvent.click(statusUpdatesBtn);

    const statusUpdateSection = await screen.findByRole("region", {
      name: "Status Update section",
    });
    expect(within(statusUpdateSection).getByText("status update")).toBeInTheDocument();
    expect(within(statusUpdateSection).getByText("Sealed → Retired")).toBeInTheDocument();
    expect(
      within(statusUpdateSection).getByText(/Grace changed from Sealed to Retired/i),
    ).toBeInTheDocument();
  });
});
