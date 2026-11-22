import fs from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  announcementId,
  DEFAULT_SITE_PUBLIC,
  sanitizeSitePublic,
  sitePublicQuery,
  splitTitle,
} from "@/lib/site-customize";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

describe("site_public settings", () => {
  it("keeps today's text when nothing is stored", () => {
    expect(sanitizeSitePublic(null)).toEqual(DEFAULT_SITE_PUBLIC);
    expect(splitTitle("Sentinels Cinematic Universe")).toEqual(["Sentinels", "Cinematic Universe"]);
  });

  it("clips text, enforces tones and only allows in-app links", () => {
    const s = sanitizeSitePublic({
      siteTitle: "x".repeat(200),
      announcement: {
        enabled: true,
        text: "Season 4!",
        tone: "nope",
        linkTo: "https://evil.example",
      },
    });
    expect(s.siteTitle).toHaveLength(60);
    expect(s.announcement.tone).toBe("info");
    expect(s.announcement.linkTo).toBe("");
    expect(
      sanitizeSitePublic({ announcement: { enabled: true, text: "Hi", linkTo: "/series" } })
        .announcement.linkTo,
    ).toBe("/series");
  });

  it("never enables an empty banner and changes id with the message", () => {
    expect(
      sanitizeSitePublic({ announcement: { enabled: true, text: "" } }).announcement.enabled,
    ).toBe(false);
    expect(announcementId("a")).not.toBe(announcementId("b"));
  });

  it("is readable by visitors through its own policy only", () => {
    const sql = fs.readFileSync("drizzle/migrations/0016_public_site_settings.sql", "utf8");
    expect(sql).toContain("TO anon, authenticated");
    expect(sql).toContain("USING (key = 'site_public')");
  });
});

describe("AnnouncementBanner", () => {
  async function renderWith(settings: unknown) {
    const { AnnouncementBanner } = await import("@/components/announcement-banner");
    const qc = new QueryClient();
    qc.setQueryData(sitePublicQuery.queryKey, sanitizeSitePublic(settings));
    const root = createRootRoute({ component: () => <AnnouncementBanner /> });
    const router = createRouter({
      routeTree: root,
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    await act(async () => {
      await router.load();
    });
    return render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
  }

  it("shows an enabled announcement with its link and can be dismissed", async () => {
    localStorage.clear();
    await renderWith({
      announcement: {
        enabled: true,
        text: "Season 4 is live",
        linkTo: "/series",
        linkLabel: "Read",
      },
    });
    expect(await screen.findByRole("region", { name: "Announcement" })).toHaveTextContent(
      "Season 4 is live",
    );
    expect(screen.getByRole("link", { name: "Read" })).toHaveAttribute("href", "/series");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss announcement" }));
    expect(screen.queryByRole("region", { name: "Announcement" })).toBeNull();
  });

  it("stays hidden when disabled", async () => {
    await renderWith({ announcement: { enabled: false, text: "Hidden" } });
    expect(screen.queryByRole("region", { name: "Announcement" })).toBeNull();
  });
});
