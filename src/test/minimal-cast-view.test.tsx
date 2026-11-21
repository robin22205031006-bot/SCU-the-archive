import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MinimalCastView } from "@/components/minimal-cast-view";
import type { Entity } from "@/lib/entities";

const ent = (id: string, name: string, extra: Partial<Entity> = {}) =>
  ({
    id,
    name,
    kind: "character",
    status: "Alive",
    alias: null,
    image_url: null,
    ...extra,
  }) as Entity;

describe("MinimalCastView", () => {
  it("renders cast cards with real name, title, bloodline and abilities", () => {
    render(
      <MinimalCastView
        list={[ent("1", "Elizah"), ent("2", "Uncharted One", { description: "Archive bio." })]}
        total={2}
        query=""
        onQuery={() => {}}
        group="all"
        onGroup={() => {}}
        onOpen={() => {}}
        loading={false}
      />,
    );
    expect(screen.getByRole("heading", { name: "The SCU Cast" })).toBeInTheDocument();
    expect(screen.getByText("2 of 2 characters")).toBeInTheDocument();
    const card = screen.getByRole("button", { name: "Open Elizah" });
    expect(card).toHaveAttribute("data-cast-group", "sentinels");
    expect(card).toHaveTextContent("Omen");
    expect(card).toHaveTextContent("Real name: Robin");
    expect(card).toHaveTextContent("Zaan’s line (mother)");
    // Characters not on the chart fall back to their archive card.
    expect(screen.getByRole("button", { name: "Open Uncharted One" })).toHaveTextContent(
      "Archive bio.",
    );
    expect(card.querySelector("h2")?.closest('[data-spoiler="char"]')).not.toBeNull();
  });

  it("highlights search hits and filters by group", () => {
    const onGroup = vi.fn();
    const onOpen = vi.fn();
    render(
      <MinimalCastView
        list={[ent("1", "Khalid")]}
        total={131}
        query="blood"
        onQuery={() => {}}
        group="all"
        onGroup={onGroup}
        onOpen={onOpen}
        loading={false}
      />,
    );
    expect(document.querySelector("mark")?.textContent?.toLowerCase()).toBe("blood");
    fireEvent.click(screen.getByRole("button", { name: /Villains and demons/ }));
    expect(onGroup).toHaveBeenCalledWith("villains");
    fireEvent.click(screen.getByRole("button", { name: "Open Khalid" }));
    expect(onOpen).toHaveBeenCalled();
  });
});
