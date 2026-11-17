import { useEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { NEXUS_STATS, clampStat, type PreviousSeasonStats } from "@/lib/nexus-season";

interface SeasonStatSlidersProps {
  values: Record<string, number | undefined>;
  previousStats?: PreviousSeasonStats | null | undefined;
  onChange: (statKey: string, value: number) => void;
  ariaPrefix?: string | undefined;
  title?: string | undefined;
  layout?: "stack" | "grid" | undefined;
}

interface StatRowProps {
  statKey: (typeof NEXUS_STATS)[number]["key"];
  label: string;
  value: number;
  prevValue: number | null;
  prevSeasonNumber: number | null;
  prevSeasonLabel: string | null;
  ariaLabel: string;
  compactLabel: boolean;
  onChange: (value: number) => void;
}

function SeasonStatRow({
  statKey,
  label,
  value,
  prevValue,
  prevSeasonNumber,
  prevSeasonLabel,
  ariaLabel,
  compactLabel,
  onChange,
}: StatRowProps) {
  const focusedRef = useRef(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  const delta = prevValue !== null ? value - prevValue : null;
  const trend: "up" | "down" | "same" | null =
    delta === null ? null : delta > 0 ? "up" : delta < 0 ? "down" : "same";

  const fieldToneClass =
    trend === "up"
      ? "border-emerald-500/70 bg-emerald-500/10 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400"
      : trend === "down"
        ? "border-rose-500/70 bg-rose-500/10 focus-within:border-rose-400 focus-within:ring-1 focus-within:ring-rose-400"
        : "border-input bg-background focus-within:border-accent focus-within:ring-1 focus-within:ring-accent";

  const inputTextClass =
    trend === "up" ? "text-emerald-300" : trend === "down" ? "text-rose-300" : "text-foreground";

  return (
    <div className="flex items-center gap-2.5 text-xs">
      <div className={compactLabel ? "w-24 shrink-0 sm:w-28" : "w-28 shrink-0 sm:w-32"}>
        <span className="block leading-tight text-foreground">{label}</span>
        {prevValue !== null && prevSeasonNumber !== null && (
          <span
            data-testid={`prev-stat-${statKey}`}
            className="block font-mono text-[10px] leading-tight text-amber-300/80"
          >
            S{prevSeasonNumber}: {prevValue}
          </span>
        )}
      </div>

      <div className="relative flex h-11 min-w-0 flex-1 items-center sm:h-8">
        <div className="relative h-2 w-full rounded-full bg-muted/75">
          {prevValue !== null && prevValue > 0 && (
            <div
              data-testid={`prev-bar-${statKey}`}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-[1] rounded-full bg-amber-400/35 transition-[width] duration-150"
              style={{ width: `${prevValue}%` }}
            />
          )}

          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 z-[2] rounded-full bg-[var(--accent)] opacity-85 transition-[width] duration-75"
            style={{ width: `${value}%` }}
          />

          {prevValue !== null && prevValue > 0 && (
            <div
              data-testid={`prev-marker-${statKey}`}
              aria-hidden
              title={`${prevSeasonLabel ?? `S${prevSeasonNumber}`}: ${prevValue}`}
              className="pointer-events-none absolute top-1/2 z-[5] h-3.5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/90 shadow-[0_0_6px_rgba(251,191,36,0.55)]"
              style={{ left: `${prevValue}%` }}
            />
          )}

          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[var(--accent)] shadow-sm"
            style={{ left: `${value}%` }}
          />
        </div>

        <input
          aria-label={ariaLabel}
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(ev) => onChange(clampStat(Number(ev.target.value)))}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
        />
      </div>

      <div
        data-testid={`stat-input-wrap-${statKey}`}
        data-trend={trend ?? "none"}
        className={`flex h-8 shrink-0 items-center rounded-md border transition-colors ${
          trend === "up" || trend === "down" ? "gap-1 px-1.5" : "px-1"
        } ${fieldToneClass}`}
      >
        {delta !== null && delta !== 0 && (
          <span
            data-testid={`stat-delta-${statKey}`}
            data-trend={trend}
            title={`${delta > 0 ? `+${delta}` : delta} vs ${prevSeasonLabel ?? `S${prevSeasonNumber}`} (${prevValue})`}
            aria-label={`${delta > 0 ? "Increased" : "Decreased"} by ${Math.abs(delta)} from previous season`}
            className={`inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] font-semibold tabular-nums ${
              delta > 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {delta > 0 ? (
              <TrendingUp className="h-3 w-3 shrink-0" aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3 shrink-0" aria-hidden />
            )}
            <span>{delta > 0 ? `+${delta}` : delta}</span>
          </span>
        )}
        <input
          aria-label={`${ariaLabel} value`}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={draft}
          onFocus={(ev) => {
            focusedRef.current = true;
            ev.currentTarget.select();
          }}
          onBlur={() => {
            focusedRef.current = false;
            const clamped = draft === "" ? 0 : clampStat(Math.round(Number(draft)));
            setDraft(String(clamped));
            if (clamped !== value) {
              onChange(clamped);
            }
          }}
          onChange={(ev) => {
            const raw = ev.target.value;
            if (raw === "") {
              setDraft("");
              onChange(0);
              return;
            }
            const parsed = Number(raw);
            if (!Number.isFinite(parsed)) return;
            const clamped = clampStat(Math.round(parsed));
            setDraft(String(clamped));
            onChange(clamped);
          }}
          className={`h-full w-11 bg-transparent text-center font-mono text-xs font-semibold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${inputTextClass}`}
        />
      </div>
    </div>
  );
}

export function SeasonStatSliders({
  values,
  previousStats = null,
  onChange,
  ariaPrefix = "",
  title,
  layout = "stack",
}: SeasonStatSlidersProps) {
  return (
    <div className="space-y-2">
      {(title || previousStats) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <p className="text-sm">{title}</p>}
          {previousStats && (
            <span
              data-testid="previous-season-legend"
              className="inline-flex items-center gap-1.5 rounded border border-amber-400/35 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300/90"
            >
              <span
                aria-hidden
                className="inline-block h-2 w-3.5 rounded-full bg-amber-400/45 ring-1 ring-amber-400/75"
              />
              Previous: {previousStats.label}
            </span>
          )}
        </div>
      )}

      <div className={layout === "grid" ? "grid gap-2.5 md:grid-cols-2" : "space-y-1.5"}>
        {NEXUS_STATS.map(({ key: k, label }) => (
          <SeasonStatRow
            key={k}
            statKey={k}
            label={label}
            value={clampStat(values[k])}
            prevValue={previousStats ? previousStats.values[k] : null}
            prevSeasonNumber={previousStats ? previousStats.seasonNumber : null}
            prevSeasonLabel={previousStats ? previousStats.label : null}
            ariaLabel={`${ariaPrefix}${label}`}
            compactLabel={layout === "grid"}
            onChange={(nextVal) => onChange(k, nextVal)}
          />
        ))}
      </div>
    </div>
  );
}
