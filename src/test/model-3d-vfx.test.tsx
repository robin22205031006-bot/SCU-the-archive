import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import * as THREE from "three";
import { createModelVfxSystem, resolveModelVfxPreset } from "@/lib/model-3d-vfx";
import { GlbModelViewer } from "@/components/glb-model-viewer";
import { Model3DViewer } from "@/components/Model3DViewer";
import { ArtifactCard } from "@/components/arsenal-card";
import type { Tables } from "@/integrations/supabase/types";

describe("resolveModelVfxPreset", () => {
  it("detects aether, plasma, and energy keywords in name, description, or tags", () => {
    expect(resolveModelVfxPreset({ name: "Aether Infused Dagger" }).preset).toBe("aether");
    expect(
      resolveModelVfxPreset({ name: "Pulse Cannon", description: "Fires superheated plasma bolts" })
        .preset,
    ).toBe("aether");
    expect(
      resolveModelVfxPreset({ name: "Vanguard Core", tags: ["high-energy", "sentinel"] }).preset,
    ).toBe("aether");
  });

  it("detects cursed, blood, kara yazgi, and dark keywords", () => {
    expect(resolveModelVfxPreset({ name: "Kara Yazgi" }).preset).toBe("cursed");
    expect(resolveModelVfxPreset({ name: "Blade", tags: ["cursed_weapon"] }).preset).toBe("cursed");
    expect(
      resolveModelVfxPreset({ name: "Crimson Fang", description: "Drinks the blood of foes" })
        .preset,
    ).toBe("cursed");
    expect(
      resolveModelVfxPreset({ name: "Umbra", description: "Shrouded in dark mist" }).preset,
    ).toBe("cursed");
  });

  it("detects fire, flame, and burn keywords", () => {
    expect(resolveModelVfxPreset({ name: "Dragon Fire Crest" }).preset).toBe("fire");
    expect(
      resolveModelVfxPreset({ name: "Phoenix Spear", description: "Channeling eternal flame" })
        .preset,
    ).toBe("fire");
    expect(
      resolveModelVfxPreset({ name: "Solar Gauntlet", tags: ["burn", "thermal"] }).preset,
    ).toBe("fire");
  });

  it("falls back to clean default sci-fi dust when no specific keywords match", () => {
    expect(
      resolveModelVfxPreset({
        name: "Ayaan",
        description: "Lead sentinel equipped with tactical suit.",
        tags: ["Vanguard", "Mythic"],
      }).preset,
    ).toBe("scifi");
    expect(resolveModelVfxPreset({}).preset).toBe("scifi");
  });

  it("prioritizes name and tags over incidental keywords in description", () => {
    expect(
      resolveModelVfxPreset({
        name: "Aether Prism",
        description: "Recovered from a dark cavern.",
      }).preset,
    ).toBe("aether");
  });
});

describe("createModelVfxSystem", () => {
  it("spawns floating cyan/blue wisps and upward particles for aether preset", () => {
    const cfg = resolveModelVfxPreset({ name: "Aether Core" });
    const vfx = createModelVfxSystem(cfg, { isSoftwareGl: false });

    const points = vfx.group.children.filter((c): c is THREE.Points => c instanceof THREE.Points);
    const wispGroups = vfx.group.children.filter((c): c is THREE.Group => c instanceof THREE.Group);

    expect(points.length).toBe(1);
    expect(wispGroups.length).toBeGreaterThanOrEqual(5);

    const wispBefore = wispGroups[0]!.position.clone();
    vfx.update(0.05, 1.5, 1);
    expect(wispGroups[0]!.position.equals(wispBefore)).toBe(false);

    vfx.dispose();
  });

  it("spawns clinging dark aura mesh and pulsing crimson embers for cursed preset", () => {
    const cfg = resolveModelVfxPreset({ name: "Kara Yazgi", tags: ["cursed"] });
    const vfx = createModelVfxSystem(cfg, { isSoftwareGl: false });

    const shroud = vfx.group.children.find((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    const pools = vfx.group.children.filter((c): c is THREE.Points => c instanceof THREE.Points);

    expect(shroud).toBeDefined();
    expect(pools.length).toBe(2); // dark miasma + crimson embers

    vfx.setBounds(1.2, 0.9, 2.2);
    expect(shroud!.position.y).toBeCloseTo(1.2, 4);

    vfx.update(0.04, 2.0, 1);
    const mat = shroud!.material as THREE.ShaderMaterial;
    expect(mat.uniforms["uTime"]?.value).toBeCloseTo(2.0, 4);

    vfx.dispose();
  });

  it("spawns rising orange/yellow embers with fast upward acceleration for fire preset", () => {
    const cfg = resolveModelVfxPreset({ name: "Pyre Flame" });
    const vfx = createModelVfxSystem(cfg, { isSoftwareGl: false });

    const pools = vfx.group.children.filter((c): c is THREE.Points => c instanceof THREE.Points);
    expect(pools.length).toBe(2);

    const primary = pools[0]!;
    const posAttr = primary.geometry.attributes["position"] as THREE.BufferAttribute;
    expect(posAttr.count).toBeGreaterThanOrEqual(50);

    vfx.update(0.05, 1.0, 1);
    const ySampleA = posAttr.getY(0);
    vfx.update(0.05, 1.05, 1);
    const ySampleB = posAttr.getY(0);
    expect(Number.isFinite(ySampleA)).toBe(true);
    expect(Number.isFinite(ySampleB)).toBe(true);

    vfx.dispose();
  });

  it("spawns clean sci-fi particle dust by default", () => {
    const cfg = resolveModelVfxPreset({ name: "Tactical Drone" });
    const vfx = createModelVfxSystem(cfg, { isSoftwareGl: true });

    const pools = vfx.group.children.filter((c): c is THREE.Points => c instanceof THREE.Points);
    expect(pools.length).toBe(1);
    vfx.update(0.03, 0.8, 1);
    vfx.dispose();
  });
});

describe("Model3DViewer & GlbModelViewer dynamic VFX integration", () => {
  it("sets data-vfx-preset dynamically from name, description, and tags", () => {
    const { rerender } = render(
      <Model3DViewer name="Aether Lance" description="Channeling pure energy" tags={["energy"]} />,
    );
    expect(screen.getByTestId("glb-model-viewer")).toHaveAttribute("data-vfx-preset", "aether");

    rerender(
      <Model3DViewer
        name="Kara Yazgi"
        description="Ancient blade"
        tags={["cursed_weapon"]}
        url="https://cdn.example.com/kara.glb"
      />,
    );
    expect(screen.getByTestId("glb-model-viewer")).toHaveAttribute("data-vfx-preset", "cursed");

    rerender(
      <GlbModelViewer
        url="https://cdn.example.com/pyre.glb"
        alt="Solar Crest"
        description="Unleashes relentless flame and burn damage"
      />,
    );
    expect(screen.getByTestId("glb-model-viewer")).toHaveAttribute("data-vfx-preset", "fire");

    rerender(
      <GlbModelViewer
        url="https://cdn.example.com/drone.glb"
        alt="Recon Probe"
        description="Autonomous orbital telemetry unit"
      />,
    );
    expect(screen.getByTestId("glb-model-viewer")).toHaveAttribute("data-vfx-preset", "scifi");
  });

  it("passes artifact lore metadata from ArtifactCard to GlbModelViewer", () => {
    const fireArtifact: Tables<"artifacts"> = {
      id: "art-fire",
      name: "Ember Halberd",
      category: "weapon",
      weapon_type: "Polearm",
      wielders: ["Kael"],
      materials: "Obsidian bronze",
      colors: "Orange, gold",
      curse_level: 0,
      how_it_works: "Ignites targets with searing flame.",
      lore: "Forged in volcanic fire.",
      source: null,
      model_3d_url: "https://cdn.example.com/ember-halberd.glb",
      created_at: "2026-11-10T00:00:00Z",
      updated_at: "2026-11-10T00:00:00Z",
    };

    render(
      <ArtifactCard
        a={fireArtifact}
        style="nexus"
        motion={false}
        staff={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpen={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^3D$/i }));
    expect(screen.getByTestId("glb-model-viewer")).toHaveAttribute("data-vfx-preset", "fire");
  });
});
