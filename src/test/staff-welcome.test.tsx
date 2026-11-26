import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AdminWelcome from "@/components/admin-welcome";

describe("Staff welcome", () => {
  afterEach(() => cleanup());

  it("greets moderators by name with their role, in every flavour", () => {
    for (const flavor of ["classic", "nexus", "codex", "manga", "minimal"] as const) {
      render(
        <AdminWelcome
          name="Ada Archivist"
          role="Moderator"
          greeting="Welcome back"
          flavor={flavor}
          motion="animated"
          onDone={() => {}}
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(
        "Welcome back, Ada Archivist. Signed in as Moderator.",
      );
      cleanup();
    }
  });
});
