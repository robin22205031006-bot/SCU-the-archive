import { Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useIsRealStaff, useRealRoles } from "@/hooks/use-admin";
import { setReaderView, useReaderView } from "@/lib/role-view";

/** Fired when a staff member switches back from reader view (the welcome greets them again). */
export const STAFF_RETURN_EVENT = "scu:staff-return";

function roleTitle(roles: readonly string[]): string {
  if (roles.includes("superadmin")) return "superadmin";
  if (roles.includes("admin")) return "admin";
  return "moderator";
}

/** Button for admin/profile pages: preview the app as a normal reader. */
export function RoleViewToggle({ className = "" }: { className?: string }) {
  const staff = useIsRealStaff();
  const readerView = useReaderView();
  if (!staff || readerView) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      data-testid="view-as-reader"
      onClick={() => {
        setReaderView(true);
        toast.success("You are viewing the app as a reader. Use the chip to switch back.");
      }}
    >
      <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
      View as a reader
    </Button>
  );
}

/** Always-reachable way back while a staff member is viewing as a reader (every style). */
export function ReaderViewChip() {
  const staff = useIsRealStaff();
  const roles = useRealRoles();
  const readerView = useReaderView();
  if (!staff || !readerView) return null;
  const title = roleTitle(roles);
  return (
    <div className="reader-view-chip" role="status" data-testid="reader-view-chip">
      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Viewing as a reader</span>
      <button
        type="button"
        onClick={() => {
          setReaderView(false);
          window.dispatchEvent(new CustomEvent(STAFF_RETURN_EVENT));
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Back to {title}
      </button>
    </div>
  );
}
