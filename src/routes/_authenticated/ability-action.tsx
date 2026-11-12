import { createFileRoute, redirect } from "@tanstack/react-router";

// Kept so old links keep working; content now lives under the Abilities tab.
export const Route = createFileRoute("/_authenticated/ability-action")({
  beforeLoad: () => {
    throw redirect({ to: "/abilities", search: { tab: "action" }, replace: true });
  },
});
