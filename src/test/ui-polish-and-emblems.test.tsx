import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { resolveGroupEmblem, type GroupEmblemGenre } from "@/lib/group-emblem-resolver";
import { GroupGenreEmblem } from "@/components/group-emblem";
import {
  resolveCustomAbilityEmblem,
  resolveNexusArtFromDescription,
} from "@/lib/ability-emblem-resolver";
import { AbilityBadge } from "@/components/ability-badge";
import { HeaderThemeSelect } from "@/components/header-theme-select";
import { triggerTierSwitchHitstop } from "@/lib/tier-hitstop";
import { disposeObjectTree, disposeThreeRenderer } from "@/lib/three-stage-utils";
import { Sparkles } from "lucide-react";
import { AppearanceProvider } from "@/hooks/use-appearance";
import { TypographyProvider } from "@/hooks/use-typography";
import { UI_MODE_STORAGE_KEY, UiModeProvider } from "@/hooks/use-ui-mode";
import { setUiStyle } from "@/lib/ui-style";
import { setGenreTheme } from "@/lib/genre-themes";
import { saveCustomAbility, setCustomAbilitiesCache } from "@/lib/abilities";

function TestShell({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  qc.setQueryData(["nexus-symbol-settings"], {});
  return (
    <QueryClientProvider client={qc}>
      <AppearanceProvider>
        <TypographyProvider>
          <UiModeProvider>{children}</UiModeProvider>
        </TypographyProvider>
      </AppearanceProvider>
    </QueryClientProvider>
  );
}

describe("Contextual Org/Bloodline/Ability Emblems, Header Theme Dropdown & Fluidity", () => {
  beforeEach(() => {
    localStorage.clear();
    setCustomAbilitiesCache([]);
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset["ui"];
    delete document.documentElement.dataset["uiMode"];
    delete document.documentElement.dataset["primarySystem"];
    delete document.documentElement.dataset["mangaSubtheme"];
    delete document.documentElement.dataset["tierHitstop"];
    delete document.documentElement.dataset["theme"];
    delete document.documentElement.dataset["motion"];
  });

  afterEach(() => {
    setCustomAbilitiesCache([]);
    cleanup();
    vi.restoreAllMocks();
  });

  describe("Org, Cult & Bloodline genre emblem resolution", () => {
    const cases: Array<{
      label: string;
      input: Parameters<typeof resolveGroupEmblem>[0];
      expected: GroupEmblemGenre;
    }> = [
      {
        label: "Satanism Cult via description under generic Cult category",
        input: {
          name: "Crimson Choir",
          kind: "organization",
          category: "Cult",
          description:
            "An infernal pact cult practicing Satanism, Baphomet rites, and inverted pentagram rituals.",
        },
        expected: "satanism-cult",
      },
      {
        label: "Dark Cult via abyssal/eclipse description",
        input: {
          name: "Hollow Vigil",
          kind: "organization",
          category: "Cult",
          description:
            "An occult coven devoted to forbidden ritual sacrifice beneath the void eclipse.",
        },
        expected: "dark-cult",
      },
      {
        label: "General Cult via category/name",
        input: {
          name: "Solstice Covenant",
          kind: "organization",
          category: "Cult",
          description: "Devoted initiates following radiant prophetic teachings.",
        },
        expected: "cult",
      },
      {
        label: "Black Ops Team via role/name",
        input: {
          name: "H.A.W.K.S.",
          kind: "organization",
          category: "Special Operations",
          description: "Covert strike team executing precision black ops reconnaissance missions.",
        },
        expected: "black-ops",
      },
      {
        label: "Dark Organization via D.E.W. / syndicate cue",
        input: {
          name: "D.E.W.",
          kind: "organization",
          category: "Syndicate",
          description: "Experimental warfare shadow organization and clandestine bio-weapon cabal.",
        },
        expected: "dark-org",
      },
      {
        label: "Standard Organization",
        input: {
          name: "E.C.A.P.",
          kind: "organization",
          category: "Organization",
          description: "Official paranormal oversight institute and sentinel academy council.",
        },
        expected: "organization",
      },
      {
        label: "Clan respects kind even if bio mentions ancestral bloodline",
        input: {
          name: "Kurohana Clan",
          kind: "clan",
          category: "Shinobi Clan",
          description: "Ancient shinobi house safeguarding an ancestral bloodline technique.",
        },
        expected: "clan",
      },
      {
        label: "Bloodline via Duskmoor / lineage",
        input: {
          name: "Duskmoor",
          kind: "bloodline",
          category: "Royal Bloodline",
          description: "Ancient cursed royal lineage carrying paleborne inheritance.",
        },
        expected: "bloodline",
      },
      {
        label: "Faction fallback",
        input: {
          name: "Outer Rim Coalition",
          kind: "faction",
          description: "Loose frontier coalition of independent mercenaries.",
        },
        expected: "faction",
      },
    ];

    it.each(cases)("resolves $label -> $expected", ({ input, expected }) => {
      expect(resolveGroupEmblem(input).genre).toBe(expected);
    });

    it("renders UI-native group emblems across classic, minimal, nexus, and manga sub-themes", () => {
      const entity = {
        name: "Baphomet Covenant",
        kind: "organization",
        category: "Cult",
        description: "Satanic ritual cabal with Baphomet sigils.",
      };

      // Classic
      localStorage.setItem(UI_MODE_STORAGE_KEY, "classic");
      setUiStyle("classic");
      const r1 = render(
        <TestShell>
          <GroupGenreEmblem entity={entity} variant="seal" />
        </TestShell>,
      );
      expect(
        r1.container.querySelector('[data-ui-emblem="classic"][data-group-genre="satanism-cult"]'),
      ).toBeTruthy();
      expect(r1.container.querySelector('[data-group-emblem-vector="satanism-cult"]')).toBeTruthy();
      r1.unmount();

      // Minimal
      localStorage.setItem(UI_MODE_STORAGE_KEY, "minimal");
      setUiStyle("minimal");
      const r2 = render(
        <TestShell>
          <GroupGenreEmblem entity={entity} variant="badge" />
        </TestShell>,
      );
      expect(
        r2.container.querySelector('[data-ui-emblem="minimal"][data-group-genre="satanism-cult"]'),
      ).toBeTruthy();
      r2.unmount();

      // Nexus
      localStorage.setItem(UI_MODE_STORAGE_KEY, "nexus");
      setUiStyle("nexus");
      const r3 = render(
        <TestShell>
          <GroupGenreEmblem entity={entity} variant="crest" size="lg" />
        </TestShell>,
      );
      expect(
        r3.container.querySelector('[data-ui-emblem="nexus"][data-group-genre="satanism-cult"]'),
      ).toBeTruthy();
      r3.unmount();

      // Manga (fantasy sub-theme)
      setGenreTheme("fantasy");
      localStorage.setItem(UI_MODE_STORAGE_KEY, "manga");
      setUiStyle("classic");
      const r4 = render(
        <TestShell>
          <GroupGenreEmblem entity={entity} variant="badge" />
        </TestShell>,
      );
      expect(
        r4.container.querySelector(
          '[data-ui-emblem="manga-fantasy"][data-group-genre="satanism-cult"]',
        ),
      ).toBeTruthy();
    });
  });

  describe("Context & description-aware Ability Emblems", () => {
    it.each([
      ["shishjutsu", "Corpse manipulation via stamped ofuda amulets", "ofuda", "spirit"],
      [
        "ethereal_splicing",
        "Fuses organic and synthetic traits across memories",
        "dna-splice",
        "alchemy",
      ],
      ["omen_sight", "Reads fractures in fate before a blow lands", "omen-eye", "psychic"],
      ["bloodbinding", "Oath-forged crimson binding ritual", "blood-pact", "blood"],
      ["umbra_control", "Taps surrounding darkness and shadow-forging", "umbra", "shadow"],
      ["errorcore", "Prototype anomaly destabilizing bio-electric systems", "error-glitch", "tech"],
      [
        "velocity_genome",
        "Hyper-acceleration genome active in strike squads",
        "velocity-helix",
        "speed",
      ],
      [
        "mimic_form",
        "Adaptive beast-trait mimicry across combat stances",
        "mimic-shift",
        "shapeshift",
      ],
      ["blades", "Close-quarters twin-blade slicing mastery", "twin-blades", "sword"],
      ["energy", "Compressed energy orbs and barrier counters", "energy-orb", "aether"],
      ["wind_surge", "Gale burst and agile aerial traversal", "wind-gale", "wind"],
      [
        "architect_cube_guardian",
        "Cube guardian structural authority",
        "cube-monolith",
        "cube-guardian",
      ],
      ["sentinel_frame_tech", "Kinetic repulsor hardening shimmer", "cyber-core", "tech"],
      [
        "aldercrest_arcane",
        "Ancient rune magic of the Aldercrest line",
        "arcane-sigil",
        "arcane-magic",
      ],
      ["card_magic", "Jester playing card arcana", "card-arcana", "cards"],
    ])("resolves %s -> emblem=%s art=%s", (key, desc, expectedEmblem, expectedArt) => {
      expect(resolveCustomAbilityEmblem(key, desc)).toBe(expectedEmblem);
      expect(resolveNexusArtFromDescription(key, desc)).toBe(expectedArt);
    });

    it("resolves custom admin abilities strictly from label + description even when key is arbitrary", () => {
      saveCustomAbility({
        key: "custom_ability_99",
        label: "Obsidian Eclipse",
        tier: "Rare",
        group: "power",
        color: "#6366f1",
        icon: Sparkles,
        description: "Taps surrounding darkness and shadow-forging across combat ranges.",
      });
      expect(
        resolveCustomAbilityEmblem(
          "custom_ability_99 Obsidian Eclipse",
          "Taps surrounding darkness and shadow-forging across combat ranges.",
        ),
      ).toBe("umbra");
    });

    it("renders registry Lucide icon inside AbilityBadge in Classic mode without custom SVG overrides", () => {
      localStorage.setItem(UI_MODE_STORAGE_KEY, "classic");
      setUiStyle("classic");
      const { container } = render(
        <TestShell>
          <AbilityBadge name="shishjutsu" />
        </TestShell>,
      );
      expect(container.querySelector("[data-custom-emblem]")).toBeNull();
      expect(container.querySelector("svg.lucide")).toBeTruthy();
    });

    it("renders painted Nexus crests and standalone emblems (not custom vector overrides) in Nexus mode", () => {
      localStorage.setItem(UI_MODE_STORAGE_KEY, "nexus");
      setUiStyle("nexus");

      const cases: Array<[string, string, string]> = [
        ["sky_guardian", "sky-guardian", "nexus-power-crests"],
        ["wind_guardian", "wind-guardian", "nexus-power-crests"],
        ["reality_bend", "reality-bend", "nexus-power-crests"],
        ["aether_dominion", "aether-dominion", "nexus-aether-dominion"],
        ["omni_ergon", "omni-ergon", "nexus-omni-ergon"],
        ["vampire", "vampire", "nexus-vampire"],
        ["shishjutsu", "spirit", "nexus-skill-symbols"],
      ];

      for (const [abilityKey, expectedArt, expectedAssetFragment] of cases) {
        const { container, unmount } = render(
          <TestShell>
            <AbilityBadge name={abilityKey} />
          </TestShell>,
        );
        expect(container.querySelector("[data-custom-emblem]")).toBeNull();
        const svg = container.querySelector(`svg[data-ability-art="${expectedArt}"]`);
        expect(svg, `${abilityKey} should render data-ability-art=${expectedArt}`).toBeTruthy();
        const img = svg?.querySelector("image");
        const href = img?.getAttribute("href") ?? img?.getAttribute("xlink:href") ?? "";
        expect(
          href.includes(expectedAssetFragment),
          `${abilityKey} should use asset matching ${expectedAssetFragment}, got ${href}`,
        ).toBe(true);
        unmount();
      }
    });
  });

  describe("Header Theme Dropdown, Tier Hit-Stop & Three.js Disposal", () => {
    it("renders HeaderThemeSelect and switches theme textures cleanly", async () => {
      // Stub pointer/scroll methods required by Radix Select in JSDOM
      Element.prototype.scrollIntoView = vi.fn();
      Element.prototype.hasPointerCapture = vi.fn(() => false);
      Element.prototype.releasePointerCapture = vi.fn();

      const { getByTestId } = render(
        <TestShell>
          <HeaderThemeSelect />
        </TestShell>,
      );

      const trigger = getByTestId("header-theme-select");
      expect(trigger).toBeTruthy();

      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: "ArrowDown" });

      await waitFor(() => {
        const brushedOpt = document.querySelector('[data-theme-option="brushed"]');
        const grungeOpt = document.querySelector('[data-theme-option="grunge"]');
        const inkOpt = document.querySelector('[data-theme-option="ink"]');
        const weaveOpt = document.querySelector('[data-theme-option="weave"]');
        expect(brushedOpt).toBeTruthy();
        expect(grungeOpt).toBeTruthy();
        expect(inkOpt).toBeTruthy();
        expect(weaveOpt).toBeTruthy();
      });

      const inkOption = document.querySelector('[data-theme-option="ink"]') as HTMLElement;
      fireEvent.click(inkOption);

      await waitFor(() => {
        expect(document.documentElement.getAttribute("data-theme")).toBe("ink");
      });
    });

    it("triggers tier switch hit-stop for Nexus and Shounen, and skips Minimal", () => {
      triggerTierSwitchHitstop("nexus");
      expect(document.documentElement.dataset["tierHitstop"]).toBe("true");
      expect(document.documentElement.style.getPropertyValue("--scu-hitstop-color")).toBe(
        "#38bdf8",
      );

      delete document.documentElement.dataset["tierHitstop"];
      triggerTierSwitchHitstop("manga", "shounen");
      expect(document.documentElement.dataset["tierHitstop"]).toBe("true");
      expect(document.documentElement.style.getPropertyValue("--scu-hitstop-color")).toBe(
        "#e86a33",
      );

      delete document.documentElement.dataset["tierHitstop"];
      triggerTierSwitchHitstop("minimal");
      expect(document.documentElement.dataset["tierHitstop"]).toBeUndefined();
    });

    it("disposes Three.js geometries, materials, textures, and renderer on unmount", () => {
      const scene = new THREE.Scene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const texture = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const geomSpy = vi.spyOn(geometry, "dispose");
      const matSpy = vi.spyOn(material, "dispose");
      const texSpy = vi.spyOn(texture, "dispose");

      const canvas = document.createElement("canvas");
      const container = document.createElement("div");
      container.appendChild(canvas);

      const mockRenderer = {
        domElement: canvas,
        dispose: vi.fn(),
        renderLists: { dispose: vi.fn() },
      } as unknown as THREE.WebGLRenderer;

      disposeObjectTree(scene);
      expect(geomSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
      expect(texSpy).toHaveBeenCalledTimes(1);

      scene.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
      disposeThreeRenderer(mockRenderer, scene, container);

      expect(mockRenderer.renderLists.dispose).toHaveBeenCalledTimes(1);
      expect(mockRenderer.dispose).toHaveBeenCalledTimes(1);
      expect(scene.children.length).toBe(0);
      expect(container.innerHTML).toBe("");
    });
  });
});
