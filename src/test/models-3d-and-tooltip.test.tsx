import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { StatusTooltip } from "@/components/status-tooltip";
import { ArtifactCard } from "@/components/arsenal-card";
import { Character3dFrame } from "@/components/character-3d-frame";
import { AdminUiToggles } from "@/components/admin-ui-toggles";
import { EntityDialog } from "@/components/entity-dialog";
import { labelFromModelFilename, readCharacter3dAvatars, uploadModel3d } from "@/lib/models-3d";
import {
  createConfiguredGltfLoader,
  createSafeWebGLRenderer,
  normalizeThreeColor,
} from "@/lib/three-stage-utils";
import { setUiStyle } from "@/lib/ui-style";
import type { Entity } from "@/lib/entities";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

const mockStorageUpload = vi.fn();
const mockStorageGetPublicUrl = vi.fn();
const mockEntitiesUpdate = vi.fn();
const mockAppSettingsSelect = vi.fn();
const mockAppSettingsUpsert = vi.fn();

let mockUiTogglesValue = {
  showJourneyGraph: true,
  showArcRoles: true,
  showRosterRoles: true,
  showSeriesAppearances: true,
  showNexus3dCharacters: true,
};

vi.mock("@/integrations/supabase/client", () => {
  const chainableEmpty = () => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      in: () => Promise.resolve({ data: [], error: null }),
      or: () => Promise.resolve({ data: [], error: null }),
      eq: () => chain,
      order: () => Promise.resolve({ data: [], error: null }),
      maybeSingle: () => Promise.resolve({ data: { value: mockUiTogglesValue }, error: null }),
    };
    return chain;
  };

  return {
    supabase: {
      storage: {
        from: () => ({
          upload: (...args: unknown[]) => mockStorageUpload(...args),
          getPublicUrl: (...args: unknown[]) => mockStorageGetPublicUrl(...args),
        }),
      },
      from: (table: string) => {
        if (table === "app_settings") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => mockAppSettingsSelect(),
              }),
              in: () => Promise.resolve({ data: [], error: null }),
            }),
            upsert: (...args: unknown[]) => mockAppSettingsUpsert(...args),
          };
        }
        if (table === "entities") {
          return {
            select: () => chainableEmpty(),
            update: (payload: unknown) => ({
              eq: (col: string, id: string) => mockEntitiesUpdate(payload, col, id),
            }),
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return chainableEmpty();
      },
    },
  };
});

function withQueryClient(ui: ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["app-settings", "ui_toggles"], mockUiTogglesValue);
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const sampleArtifact: Tables<"artifacts"> = {
  id: "art-kara",
  name: "Kara Yazgi",
  category: "cursed_weapon",
  weapon_type: "Katana",
  wielders: ["Valeria"],
  materials: "Ancient forged steel",
  colors: "Crimson, black",
  curse_level: 5,
  how_it_works: "Unleashes crescent shadow slashes.",
  lore: "A cursed blade.",
  source: null,
  model_3d_url: "https://cdn.example.com/models-3d/arsenals/kara-yazgi.glb",
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
};

const sampleCharacter: Entity = {
  id: "char-1",
  kind: "character",
  name: "Ayaan",
  alias: "Chronos",
  role: "Vanguard",
  status: "Alive",
  category: "Protagonist",
  description: "Lead sentinel.",
  image_url: "https://cdn.example.com/ayaan.png",
  model_3d_url: "https://cdn.example.com/models-3d/characters/ayaan-base.glb",
  abilities: ["Astrapo"],
  beast_traits: [],
  character_tier: "Mythic",
  animation_style: null,
  theme_color: "#38bdf8",
  accent_glow: "#38bdf8",
  theme_song_url: null,
  card_theme: null,
  parent_id: null,
  sketches: [],
  locked_fields: [],
  stats: {
    avatars_3d: [
      {
        id: "base",
        label: "Base Suit",
        url: "https://cdn.example.com/models-3d/characters/ayaan-base.glb",
      },
      {
        id: "awakened",
        label: "Awakened Form",
        url: "https://cdn.example.com/models-3d/characters/ayaan-awakened.glb",
      },
    ],
  },
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z",
};

describe("StatusTooltip", () => {
  it("shows a descriptive tooltip on hover and hides on mouse leave", () => {
    render(
      <StatusTooltip label="Mythic">
        <span>Mythic</span>
      </StatusTooltip>,
    );

    expect(screen.queryByRole("tooltip")).toBeNull();
    const trigger = screen.getByText("Mythic").closest("span[tabindex]")!;
    fireEvent.mouseEnter(trigger);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toMatch(/Mythic/i);
    expect(tooltip.textContent).toMatch(/Apex cosmological|transcendent/i);

    fireEvent.mouseLeave(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("supports keyboard focus and status descriptions like Presumed Dead and Legendary", () => {
    render(
      <div>
        <StatusTooltip label="Legendary">
          <span>Legendary</span>
        </StatusTooltip>
        <StatusTooltip label="Presumed Dead">
          <span>Presumed Dead</span>
        </StatusTooltip>
      </div>,
    );

    const legTrigger = screen.getByText("Legendary").closest("span[tabindex]")!;
    fireEvent.focus(legTrigger);
    expect(screen.getByRole("tooltip").textContent).toMatch(/high-tier combatant/i);
    fireEvent.blur(legTrigger);

    const pdTrigger = screen.getByText("Presumed Dead").closest("span[tabindex]")!;
    fireEvent.mouseEnter(pdTrigger);
    expect(screen.getByRole("tooltip").textContent).toMatch(
      /definitive proof remains unconfirmed/i,
    );
  });
});

describe("3D model storage helper & multi-avatar normalization", () => {
  beforeEach(() => {
    mockStorageUpload.mockReset();
    mockStorageGetPublicUrl.mockReset();
  });

  it("validates .glb/.gltf extension and uploads into models-3d folder", async () => {
    const badFile = new File(["bad"], "portrait.png", { type: "image/png" });
    await expect(uploadModel3d(badFile, "characters", "Ayaan")).rejects.toThrow(/\.glb or \.gltf/i);

    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/models-3d/characters/ayaan-123.glb" },
    });

    const glbFile = new File([new Uint8Array([1, 2, 3])], "Ayaan Nano.glb", {
      type: "model/gltf-binary",
    });
    const url = await uploadModel3d(glbFile, "characters", "Ayaan");
    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    const [uploadedPath] = mockStorageUpload.mock.calls[0] as [string];
    expect(uploadedPath).toMatch(/^characters\/ayaan-\d+-[a-z0-9]+\.glb$/);
    expect(url).toBe("https://cdn.example.com/models-3d/characters/ayaan-123.glb");
    expect(labelFromModelFilename("Ayaan_Awakened.glb", 1)).toBe("Ayaan Awakened");
  });

  it("reads normalized multi-avatar entries without duplicate URLs", () => {
    const list = readCharacter3dAvatars(sampleCharacter);
    expect(list).toHaveLength(2);
    expect(list.map((a) => a.label)).toEqual(["Base Suit", "Awakened Form"]);

    const single = readCharacter3dAvatars({
      model_3d_url: "https://cdn.example.com/solo.glb",
      stats: {},
    });
    expect(single).toEqual([
      { id: "primary", label: "Primary 3D", url: "https://cdn.example.com/solo.glb" },
    ]);
  });
});

describe("Arsenal 2D/3D card toggle", () => {
  it("switches between 2D artwork and Three.js viewer when model_3d_url exists", () => {
    render(
      <ArtifactCard
        a={sampleArtifact}
        style="nexus"
        motion={false}
        staff={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("glb-model-viewer")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^3D$/i }));

    const viewer = screen.getByTestId("glb-model-viewer");
    expect(viewer.getAttribute("data-model-url")).toBe(sampleArtifact.model_3d_url);

    fireEvent.click(screen.getByRole("button", { name: /^2D$/i }));
    expect(screen.queryByTestId("glb-model-viewer")).toBeNull();
  });

  it("falls back cleanly to 2D image when model_3d_url is empty", () => {
    render(
      <ArtifactCard
        a={{ ...sampleArtifact, model_3d_url: null }}
        style="classic"
        motion={false}
        staff={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^3D$/i }));
    expect(screen.queryByTestId("glb-model-viewer")).toBeNull();
    expect(screen.getByText(/No 3D model uploaded — showing 2D/i)).toBeInTheDocument();
  });
});

describe("Character 3D avatars Nexus-only & admin-toggle gating", () => {
  beforeEach(() => {
    mockUiTogglesValue = {
      showJourneyGraph: true,
      showArcRoles: true,
      showRosterRoles: true,
      showSeriesAppearances: true,
      showNexus3dCharacters: true,
    };
    mockAppSettingsSelect.mockResolvedValue({ data: { value: mockUiTogglesValue }, error: null });
    mockAppSettingsUpsert.mockResolvedValue({ error: null });
  });

  it("hides 2D/3D toggle and multiple 3D avatars in Classic and Minimal UI modes", () => {
    setUiStyle("classic");
    const { rerender } = render(
      withQueryClient(
        <Character3dFrame
          entity={sampleCharacter}
          fallback={<img src={sampleCharacter.image_url!} alt="2D portrait" />}
        />,
      ),
    );
    expect(screen.getByAltText("2D portrait")).toBeInTheDocument();
    expect(screen.queryByTestId("character-3d-frame")).toBeNull();
    expect(screen.queryByRole("button", { name: /Awakened Form/i })).toBeNull();

    setUiStyle("minimal");
    rerender(
      withQueryClient(
        <Character3dFrame
          entity={sampleCharacter}
          fallback={<img src={sampleCharacter.image_url!} alt="2D portrait" />}
        />,
      ),
    );
    expect(screen.queryByTestId("character-3d-frame")).toBeNull();
  });

  it("shows 2D/3D toggle and multiple avatars in Nexus mode and switches models", () => {
    setUiStyle("nexus");
    render(
      withQueryClient(
        <Character3dFrame
          entity={sampleCharacter}
          fallback={<img src={sampleCharacter.image_url!} alt="2D portrait" />}
        />,
      ),
    );

    expect(screen.getByTestId("character-3d-frame")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Base Suit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Awakened Form" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^3D$/i }));
    expect(screen.getByTestId("glb-model-viewer").getAttribute("data-model-url")).toBe(
      "https://cdn.example.com/models-3d/characters/ayaan-base.glb",
    );

    fireEvent.click(screen.getByRole("button", { name: "Awakened Form" }));
    expect(screen.getByTestId("glb-model-viewer").getAttribute("data-model-url")).toBe(
      "https://cdn.example.com/models-3d/characters/ayaan-awakened.glb",
    );
  });

  it("disables Nexus 3D character models when admin turns off showNexus3dCharacters", () => {
    setUiStyle("nexus");
    mockUiTogglesValue = { ...mockUiTogglesValue, showNexus3dCharacters: false };

    render(
      withQueryClient(
        <Character3dFrame
          entity={sampleCharacter}
          fallback={<img src={sampleCharacter.image_url!} alt="2D portrait" />}
        />,
      ),
    );

    expect(screen.getByAltText("2D portrait")).toBeInTheDocument();
    expect(screen.queryByTestId("character-3d-frame")).toBeNull();
    expect(screen.queryByRole("button", { name: /Awakened Form/i })).toBeNull();
  });

  it("lets admins toggle Nexus 3D character models in AdminUiToggles", async () => {
    render(withQueryClient(<AdminUiToggles />));
    expect(screen.getByText(/Nexus 3D character models/i)).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    const lastCheckbox = checkboxes[checkboxes.length - 1] as HTMLInputElement;
    expect(lastCheckbox.checked).toBe(true);
    fireEvent.click(lastCheckbox);
    expect(lastCheckbox.checked).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /Save toggles/i }));
    await waitFor(() => expect(mockAppSettingsUpsert).toHaveBeenCalled());
    const [payload] = mockAppSettingsUpsert.mock.calls[0] as [
      { value: { showNexus3dCharacters: boolean } },
    ];
    expect(payload.value.showNexus3dCharacters).toBe(false);
  });
});

describe("Character Edit Modal .glb multi-avatar upload", () => {
  beforeEach(() => {
    mockStorageUpload.mockReset();
    mockStorageGetPublicUrl.mockReset();
    mockEntitiesUpdate.mockReset();
    mockStorageUpload.mockResolvedValue({ error: null });
    mockEntitiesUpdate.mockResolvedValue({ error: null });
  });

  it("uploads a new .glb avatar to models-3d and saves model_3d_url + avatars_3d", async () => {
    mockStorageGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/models-3d/characters/ayaan-overdrive.glb" },
    });

    render(
      withQueryClient(
        <EntityDialog
          open
          onOpenChange={vi.fn()}
          entity={sampleCharacter}
          defaultKind="character"
          allowedKinds={["character"]}
        />,
      ),
    );

    const fileInput = document.querySelector('input[accept*=".glb"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const glb = new File([new Uint8Array([1, 2, 3])], "Overdrive.glb", {
      type: "model/gltf-binary",
    });
    fireEvent.change(fileInput, { target: { files: [glb] } });

    await waitFor(() => expect(screen.getByDisplayValue("Overdrive")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /^Save$/i }));
    await waitFor(() => expect(mockEntitiesUpdate).toHaveBeenCalled());
    const [savedRow] = mockEntitiesUpdate.mock.calls[0] as [
      {
        model_3d_url: string;
        stats: { avatars_3d: Array<{ label: string; url: string }> };
      },
    ];
    expect(savedRow.model_3d_url).toBe(sampleCharacter.model_3d_url);
    expect(savedRow.stats.avatars_3d.map((a) => a.label)).toEqual([
      "Base Suit",
      "Awakened Form",
      "Overdrive",
    ]);
  });
});

describe("3D viewer robustness & Three.js utility fixes", () => {
  it("normalizes CSS Color 4 space-separated hsl() strings without falling back to white", () => {
    const c = normalizeThreeColor("hsl(210 85% 60%)");
    expect(c.r).toBeLessThan(0.2);
    expect(c.b).toBeGreaterThan(0.7);
  });

  it("configures GLTFLoader with local /draco/ decoder, MeshoptDecoder, and anonymous CORS", () => {
    const loader = createConfiguredGltfLoader();
    expect(loader.crossOrigin).toBe("anonymous");
    expect(loader.dracoLoader).not.toBeNull();
  });

  it("returns null safely from createSafeWebGLRenderer when WebGL context creation fails", () => {
    expect(createSafeWebGLRenderer({ canvas: document.createElement("canvas") })).toBeNull();
  });

  it("does not apply backdrop-blur overlays over the active WebGL frame in Character3dFrame", () => {
    setUiStyle("nexus");
    const { container } = render(
      withQueryClient(
        <Character3dFrame
          entity={sampleCharacter}
          fallback={<img src={sampleCharacter.image_url!} alt="2D portrait" />}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: /^3D$/i }));
    const frame = screen.getByTestId("character-3d-frame");
    expect(frame.innerHTML).not.toMatch(/backdrop-blur/);
    expect(container.querySelector('[data-testid="glb-model-viewer"]')).toBeInTheDocument();
  });
});
