import { createContext, Fragment, useContext, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, FolderOpen } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useIsManga } from "@/hooks/use-ui-mode";
import { useUiStyle } from "@/lib/ui-style";
import { cn } from "@/lib/utils";

export interface LoreBreadcrumbSegment {
  id: string;
  label: string;
  onClick?: (() => void) | undefined;
  to?: string | undefined;
  search?: Record<string, unknown> | undefined;
}

const LoreBreadcrumbParentContext = createContext<LoreBreadcrumbSegment[]>([]);

export function LoreBreadcrumbProvider({
  segments,
  children,
}: {
  segments: LoreBreadcrumbSegment[];
  children: ReactNode;
}) {
  const parent = useContext(LoreBreadcrumbParentContext);
  const merged = [...parent, ...segments];
  return (
    <LoreBreadcrumbParentContext.Provider value={merged}>
      {children}
    </LoreBreadcrumbParentContext.Provider>
  );
}

export function useLoreBreadcrumbParent(): LoreBreadcrumbSegment[] {
  return useContext(LoreBreadcrumbParentContext);
}

export function LoreBreadcrumb({
  segments,
  includeParent = true,
  className = "",
}: {
  segments: LoreBreadcrumbSegment[];
  includeParent?: boolean;
  className?: string;
}) {
  const parentSegments = useLoreBreadcrumbParent();
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";

  const combined = includeParent ? [...parentSegments, ...segments] : segments;
  if (combined.length < 2) return null;

  const linkBtnClass = isManga
    ? "inline-flex min-h-[28px] items-center whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    : nexus
      ? "inline-flex min-h-[28px] items-center whitespace-nowrap font-mono text-xs text-cyan-300/85 transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      : "inline-flex min-h-[28px] items-center whitespace-nowrap text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const currentClass = isManga
    ? "max-w-[240px] truncate font-mono text-[11px] font-bold uppercase tracking-wider text-foreground sm:max-w-xs"
    : nexus
      ? "max-w-[240px] truncate font-mono text-xs font-semibold text-foreground sm:max-w-xs"
      : "max-w-[240px] truncate text-xs font-semibold text-foreground sm:max-w-xs";

  const containerClass = isManga
    ? "mb-4 flex items-center gap-2 border-2 border-foreground bg-card px-3 py-1.5"
    : nexus
      ? "mb-4 flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-slate-950/65 px-3 py-1.5 backdrop-blur-sm"
      : "mb-4 flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/35 px-3 py-1.5";

  return (
    <div data-testid="lore-breadcrumb" className={cn(containerClass, className)}>
      <FolderOpen
        aria-hidden="true"
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isManga ? "text-primary" : nexus ? "text-cyan-300" : "text-accent",
        )}
      />
      <Breadcrumb aria-label="Breadcrumb" className="min-w-0 flex-1">
        <BreadcrumbList className="gap-1 sm:gap-1.5">
          {combined.map((seg, idx) => {
            const isLast = idx === combined.length - 1;
            const clickable = !isLast && (Boolean(seg.to) || Boolean(seg.onClick));
            return (
              <Fragment key={`${seg.id}-${idx}`}>
                {idx > 0 && (
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70" />
                  </BreadcrumbSeparator>
                )}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className={currentClass}>{seg.label}</BreadcrumbPage>
                  ) : clickable && seg.to ? (
                    <BreadcrumbLink asChild>
                      <Link
                        to={seg.to as never}
                        search={seg.search as never}
                        onClick={seg.onClick}
                        className={linkBtnClass}
                      >
                        {seg.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : clickable && seg.onClick ? (
                    <button type="button" onClick={seg.onClick} className={linkBtnClass}>
                      {seg.label}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        linkBtnClass,
                        "cursor-default opacity-80 hover:text-muted-foreground",
                      )}
                    >
                      {seg.label}
                    </span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
