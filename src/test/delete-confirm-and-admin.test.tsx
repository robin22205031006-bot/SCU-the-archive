import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

const mocks = vi.hoisted(() => ({
  user: null as { id: string; email?: string; email_confirmed_at?: string } | null,
  roles: [] as string[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: mocks.user }, error: null }),
      getSession: async () => ({
        data: { session: mocks.user ? { user: mocks.user } : null },
        error: null,
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          Promise.resolve({
            data: table === "user_roles" ? mocks.roles.map((role) => ({ role })) : [],
            error: null,
          }),
      }),
    }),
  },
}));

vi.mock("@/lib/roles.functions", () => ({
  ensureSuperadminAccess: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/roles", () => ({
  isVerifiedSuperadmin: (user: { email?: string; email_confirmed_at?: string } | null) =>
    !!user && user.email === "owner@scu.dev" && !!user.email_confirmed_at,
}));

import { useAdminPermissions, useIsAdmin, useIsStaff } from "@/hooks/use-admin";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useIsAdmin & useAdminPermissions", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.roles = [];
  });

  afterEach(() => {
    cleanup();
  });

  it("denies admin and delete access when signed out", async () => {
    const { result } = renderHook(() => ({ isAdmin: useIsAdmin(), perms: useAdminPermissions() }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.perms).toEqual({
        isAdmin: false,
        isStaff: false,
        isSuperadmin: false,
        canDelete: false,
      });
    });
  });

  it("grants staff but denies admin/canDelete to moderators", async () => {
    mocks.user = { id: "mod-1", email: "mod@scu.dev" };
    mocks.roles = ["moderator"];

    const { result } = renderHook(
      () => ({
        isAdmin: useIsAdmin(),
        isStaff: useIsStaff(),
        perms: useAdminPermissions(),
      }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isStaff).toBe(true);
    });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.perms).toEqual({
      isAdmin: false,
      isStaff: true,
      isSuperadmin: false,
      canDelete: false,
    });
  });

  it("grants admin and canDelete to admins and verified superadmins", async () => {
    mocks.user = { id: "admin-1", email: "admin@scu.dev" };
    mocks.roles = ["admin"];

    const adminHook = renderHook(() => useAdminPermissions(), { wrapper });
    await waitFor(() => {
      expect(adminHook.result.current.isAdmin).toBe(true);
    });
    expect(adminHook.result.current).toEqual({
      isAdmin: true,
      isStaff: true,
      isSuperadmin: false,
      canDelete: true,
    });
    adminHook.unmount();

    mocks.user = {
      id: "owner-1",
      email: "owner@scu.dev",
      email_confirmed_at: "2026-01-01T00:00:00.000Z",
    };
    mocks.roles = ["admin"];

    const superHook = renderHook(() => useAdminPermissions(), { wrapper });
    await waitFor(() => {
      expect(superHook.result.current.isSuperadmin).toBe(true);
    });
    expect(superHook.result.current).toEqual({
      isAdmin: true,
      isStaff: true,
      isSuperadmin: true,
      canDelete: true,
    });
  });
});

describe("DeleteConfirmDialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders title & description and confirms or cancels cleanly", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete Redline?"
        description="This permanently removes Redline."
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Delete Redline?")).toBeTruthy();
    expect(screen.getByText("This permanently removes Redline.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("disables actions and prevents closing while busy", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeleteConfirmDialog
        open
        busy
        onOpenChange={onOpenChange}
        title="Delete item?"
        busyLabel="Deleting…"
        onConfirm={onConfirm}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement;
    const confirmBtn = screen.getByRole("button", { name: "Deleting…" }) as HTMLButtonElement;

    expect(cancelBtn.disabled).toBe(true);
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

vi.mock("@/hooks/use-ui-mode", () => ({
  useIsManga: () => false,
}));

vi.mock("@/lib/artifacts", () => ({
  artFor: () => ({
    hue: 210,
    glyph: "blade",
    forms: [{ name: "Base", art: null, note: "Standard" }],
  }),
  artUrl: () => null,
}));

vi.mock("@/components/app-motion", () => ({
  MotionCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <article className={className}>{children}</article>
  ),
}));

import { ArtifactCard } from "@/components/arsenal-card";

describe("Conditional delete controls with canDelete", () => {
  afterEach(() => {
    cleanup();
  });

  const sampleArtifact = {
    id: "art-1",
    name: "Kara Yazgi",
    category: "cursed_weapon",
    weapon_type: "Katana",
    wielders: ["Arzuna"],
    materials: "Obsidian",
    colors: "Crimson",
    curse_level: 5,
    how_it_works: "Drains aura",
    lore: "Ancient blade",
    source: null,
    model_3d_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };

  it("hides Delete button from non-admin staff while showing Edit", () => {
    const onDelete = vi.fn();
    render(
      <ArtifactCard
        a={sampleArtifact}
        style="classic"
        motion={false}
        staff
        canDelete={false}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("renders Delete button for admins when canDelete is true", () => {
    const onDelete = vi.fn();
    render(
      <ArtifactCard
        a={sampleArtifact}
        style="classic"
        motion={false}
        staff
        canDelete
        onEdit={vi.fn()}
        onDelete={onDelete}
        onOpen={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
