import { useMemo } from "react";
import { ArrowRight, History } from "lucide-react";
import {
  resolveCharacterStatusTimeline,
  statusToneCategory,
  type StatusTimelineStep,
} from "@/lib/status-history";
import { useTimelineOrder } from "@/lib/series-order";
import { StatusTooltip } from "@/components/status-tooltip";

function statusToneStyles(
  status: string,
  variant: "nexus" | "classic" | "manga",
): { pill: string; dot: string; ring: string } {
  const tone = statusToneCategory(status);
  if (variant === "manga") {
    if (tone === "alive") {
      return {
        pill: "border-emerald-500/70 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        dot: "bg-emerald-500",
        ring: "border-emerald-500",
      };
    }
    if (tone === "retired") {
      return {
        pill: "border-slate-400/70 bg-slate-500/15 text-slate-700 dark:text-slate-300",
        dot: "bg-slate-400",
        ring: "border-slate-400",
      };
    }
    if (tone === "missing" || tone === "sealed") {
      return {
        pill: "border-amber-500/70 bg-amber-500/15 text-amber-700 dark:text-amber-300",
        dot: "bg-amber-400",
        ring: "border-amber-400",
      };
    }
    if (tone === "dead" || tone === "presumed") {
      return {
        pill: "border-rose-500/70 bg-rose-500/15 text-rose-700 dark:text-rose-300",
        dot: "bg-rose-500",
        ring: "border-rose-500",
      };
    }
    return {
      pill: "border-border bg-secondary/40 text-foreground",
      dot: "bg-muted-foreground",
      ring: "border-border",
    };
  }

  if (tone === "alive") {
    return {
      pill: "border-emerald-400/45 bg-emerald-500/15 text-emerald-200",
      dot: "bg-emerald-400",
      ring: "border-emerald-400",
    };
  }
  if (tone === "retired") {
    return {
      pill: "border-slate-400/45 bg-slate-500/15 text-slate-200",
      dot: "bg-slate-300",
      ring: "border-slate-300",
    };
  }
  if (tone === "missing" || tone === "sealed") {
    return {
      pill: "border-amber-400/45 bg-amber-500/15 text-amber-200",
      dot: "bg-amber-400",
      ring: "border-amber-400",
    };
  }
  if (tone === "dead" || tone === "presumed") {
    return {
      pill: "border-rose-400/45 bg-rose-500/15 text-rose-200",
      dot: "bg-rose-400",
      ring: "border-rose-400",
    };
  }
  return {
    pill: "border-border bg-muted/40 text-foreground",
    dot: "bg-muted-foreground",
    ring: "border-border",
  };
}

function formatDateTag(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function StatusHistoryTimeline({
  entity,
  memberships,
  seriesList,
  order: explicitOrder,
  variant = "nexus",
  onSelectSeason,
  className = "",
}: {
  entity: {
    id: string;
    name: string;
    status?: string | null | undefined;
    stats?: unknown;
  };
  memberships?:
    | ReadonlyArray<{
        series_id?: string | null | undefined;
        status?: string | null | undefined;
        series?:
          { id?: string | null | undefined; title?: string | null | undefined } | null | undefined;
      }>
    | null
    | undefined;
  seriesList?:
    | ReadonlyArray<{
        id: string;
        title: string;
        season_names?: string[] | null | undefined;
      }>
    | null
    | undefined;
  order?: readonly string[] | undefined;
  variant?: "nexus" | "classic" | "manga" | undefined;
  onSelectSeason?:
    ((target: { seriesId: string; seasonNumber: number | null }) => void) | undefined;
  className?: string | undefined;
}) {
  const timelineOrder = useTimelineOrder();
  const order = explicitOrder ?? timelineOrder;

  const { steps, transitions, currentStatus } = useMemo(
    () =>
      resolveCharacterStatusTimeline({
        entity,
        memberships,
        seriesList,
        order,
      }),
    [entity, memberships, seriesList, order],
  );

  if (steps.length === 0) return null;

  const isManga = variant === "manga";
  const latestTransition = transitions[transitions.length - 1];

  const handleSelectStep = (step: StatusTimelineStep) => {
    if (!onSelectSeason || !step.seriesId) return;
    onSelectSeason({
      seriesId: step.seriesId,
      seasonNumber: step.seasonNumber ?? null,
    });
  };

  return (
    <section
      data-testid="status-history-timeline"
      data-spoiler="char"
      aria-label="Character status history"
      className={
        isManga
          ? `border-2 border-border bg-card p-3 shadow-[2px_2px_0_currentColor] ${className}`
          : variant === "classic"
            ? `rounded-xl border border-white/10 bg-black/40 p-3 ${className}`
            : `rounded-xl border border-cyan-400/25 bg-slate-950/75 p-3.5 ${className}`
      }
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History
            className={`h-3.5 w-3.5 ${isManga ? "text-primary" : "text-accent"}`}
            aria-hidden="true"
          />
          <h4
            className={
              isManga
                ? "font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
                : "text-[10px] font-semibold uppercase tracking-[0.28em] text-accent"
            }
          >
            Status history
          </h4>
          {transitions.length > 0 && (
            <span
              data-testid="status-transition-count"
              className={
                isManga
                  ? "border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase"
                  : "rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground"
              }
            >
              {transitions.length} {transitions.length === 1 ? "change" : "changes"}
            </span>
          )}
        </div>

        {latestTransition ? (
          <span
            data-testid="status-latest-transition"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
          >
            <span>Latest:</span>
            <span className="text-foreground">{latestTransition.fromStatus}</span>
            <ArrowRight className="h-3 w-3 text-accent" aria-hidden="true" />
            <span className="text-foreground">{latestTransition.status}</span>
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Current: <span className="font-medium text-foreground">{currentStatus}</span>
          </span>
        )}
      </div>

      <ol className="flex flex-wrap items-stretch gap-2" aria-label="Status timeline steps">
        {steps.map((step, idx) => {
          const styles = statusToneStyles(step.status, variant);
          const dateTag = formatDateTag(step.changedAt);
          const clickable = Boolean(onSelectSeason && step.seriesId);

          return (
            <li
              key={step.id}
              data-testid={`status-step-${idx}`}
              data-status={step.status}
              data-transition={step.isTransition ? "true" : "false"}
              className="flex items-center gap-2"
            >
              {idx > 0 && (
                <ArrowRight
                  className={`h-3.5 w-3.5 shrink-0 ${
                    step.isTransition ? "text-accent" : "text-muted-foreground/60"
                  }`}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                disabled={!clickable}
                onClick={() => handleSelectStep(step)}
                title={
                  clickable
                    ? `Jump to ${step.label} (${step.status})`
                    : `${step.label}: ${step.status}`
                }
                className={`group flex flex-col items-start gap-1 text-left transition ${
                  isManga
                    ? `border px-2.5 py-1.5 ${step.isTransition ? "border-primary bg-primary/5" : "border-border bg-background/80"}`
                    : `rounded-lg border px-2.5 py-1.5 ${
                        step.isTransition
                          ? "border-accent/45 bg-accent/10"
                          : "border-border/70 bg-background/60"
                      }`
                } ${clickable ? "cursor-pointer hover:border-accent" : "cursor-default"}`}
              >
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      step.isTransition
                        ? `${styles.dot} ring-2 ring-offset-1 ring-offset-background`
                        : styles.dot
                    }`}
                  />
                  <span>{step.shortLabel}</span>
                </span>

                <div className="flex flex-wrap items-center gap-1">
                  {step.isTransition && step.fromStatus && (
                    <span className="text-[10px] text-muted-foreground line-through decoration-muted-foreground/60">
                      {step.fromStatus}
                    </span>
                  )}
                  <StatusTooltip label={step.status}>
                    <span
                      className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
                        isManga ? "font-mono uppercase" : "rounded-md"
                      } ${styles.pill}`}
                    >
                      {step.status}
                    </span>
                  </StatusTooltip>
                </div>

                {dateTag && (
                  <span className="font-mono text-[9px] text-muted-foreground/80">{dateTag}</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
