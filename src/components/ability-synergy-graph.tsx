import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, Network, Plus, Sparkles, X } from "lucide-react";
import { abilityDef, allAbilityDefs } from "@/lib/abilities";
import { ABILITY_RANK_META, type AbilityEmblemRank } from "@/lib/ability-rank";
import {
  addAbilityToPinnedSet,
  removeAbilityFromPinnedSet,
  type AbilitySynergyConnection,
  type AbilitySynergySummary,
} from "@/lib/ability-synergy";
import { Button } from "@/components/ui/button";

export interface AbilitySynergyGraphProps {
  focalKey: string;
  focalRank: AbilityEmblemRank;
  summary: AbilitySynergySummary;
  onInspectPartner?: ((abilityKey: string, rank: AbilityEmblemRank) => void) | undefined;
  onSetChanged?: (() => void) | undefined;
}

const ORIGIN_LABELS = {
  character: "Character Loadout",
  "active-set": "Current Set",
  usage: "Recently Used",
} as const;

function truncateLabel(text: string, maxLen = 17): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

export function AbilitySynergyGraph({
  focalKey,
  focalRank,
  summary,
  onInspectPartner,
  onSetChanged,
}: AbilitySynergyGraphProps) {
  const focalDef = useMemo(() => abilityDef(focalKey), [focalKey]);
  const focalRankMeta = ABILITY_RANK_META[focalRank];
  const allDefs = useMemo(() => allAbilityDefs(), []);

  const visibleConnections = useMemo(() => summary.connections.slice(0, 8), [summary.connections]);

  const [selectedId, setSelectedId] = useState<string | null>(
    () => visibleConnections[0]?.id ?? null,
  );
  const [pickerKey, setPickerKey] = useState("");

  useEffect(() => {
    if (visibleConnections.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleConnections.some((c) => c.id === selectedId)) {
      setSelectedId(visibleConnections[0]!.id);
    }
  }, [visibleConnections, selectedId]);

  const selectedConnection: AbilitySynergyConnection | null = useMemo(
    () => visibleConnections.find((c) => c.id === selectedId) ?? visibleConnections[0] ?? null,
    [visibleConnections, selectedId],
  );

  const cx = 220;
  const cy = 124;
  const rx = 148;
  const ry = 80;

  const plottedNodes = useMemo(() => {
    const count = visibleConnections.length;
    return visibleConnections.map((conn, idx) => {
      const angle = -Math.PI / 2 + (idx / Math.max(1, count)) * Math.PI * 2;
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle) * ry;
      const dx = x - cx;
      const dy = y - cy;
      const len = Math.hypot(dx, dy) || 1;
      const bend = (idx % 2 === 0 ? 1 : -1) * 18;
      const ctrlX = cx + dx * 0.5 - (dy / len) * bend;
      const ctrlY = cy + dy * 0.5 + (dx / len) * bend;
      const midX = 0.25 * cx + 0.5 * ctrlX + 0.25 * x;
      const midY = 0.25 * cy + 0.5 * ctrlY + 0.25 * y;
      const labelAbove = y < cy - 30;
      const labelY = labelAbove ? y - 20 : y + 25;
      return {
        conn,
        x,
        y,
        ctrlX,
        ctrlY,
        midX,
        midY,
        labelY,
      };
    });
  }, [visibleConnections]);

  const excludedKeys = useMemo(
    () => new Set([summary.focalKey, ...summary.setMembers.map((m) => m.key)]),
    [summary.focalKey, summary.setMembers],
  );

  const availableToAdd = useMemo(
    () => allDefs.filter((d) => !excludedKeys.has(d.key)),
    [allDefs, excludedKeys],
  );

  const handleAdd = (key: string) => {
    if (!key) return;
    addAbilityToPinnedSet(key);
    onSetChanged?.();
  };

  const handleRemove = (key: string) => {
    removeAbilityFromPinnedSet(key);
    onSetChanged?.();
  };

  return (
    <section
      aria-label="Synergy connections visualization"
      data-testid="synergy-connections-section"
      className="grid gap-3 rounded-xl border border-border/80 bg-card/45 p-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Network className="h-4 w-4 text-accent" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Synergy Connections
          </h3>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {summary.connections.length === 0
            ? "0 active links"
            : `${summary.connections.length} ${summary.connections.length === 1 ? "active link" : "active links"} · +${summary.aggregateBuffs.damagePct}% Dmg · -${summary.aggregateBuffs.cooldownReductionPct}% CD`}
        </span>
      </div>

      {visibleConnections.length > 0 ? (
        <div className="grid gap-3">
          {/* Interactive SVG Node-Link Topology */}
          <div className="overflow-hidden rounded-lg border border-border/70 bg-background/65 p-2">
            <svg
              viewBox="0 0 440 248"
              role="img"
              aria-label={`Synergy connections map for ${focalDef.label} linking ${visibleConnections.length} abilities in your current set`}
              data-testid="synergy-connections-svg"
              className="h-auto w-full select-none"
            >
              <defs>
                <radialGradient id="scu-synergy-center-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={focalDef.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={focalDef.color} stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Radar / Orbital guides */}
              <circle cx={cx} cy={cy} r="58" fill="url(#scu-synergy-center-glow)" />
              <ellipse
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.16"
                strokeDasharray="3 4"
                className="text-muted-foreground"
              />
              <circle
                cx={cx}
                cy={cy}
                r="42"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.12"
                className="text-muted-foreground"
              />

              {/* Curved Synergy Paths */}
              {plottedNodes.map(({ conn, x, y, ctrlX, ctrlY, midX, midY }) => {
                const isSelected = selectedConnection?.id === conn.id;
                const strokeWidth = isSelected ? 3.2 : 1.5 + ((conn.strength - 35) / 65) * 1.4;
                const firstBuff = conn.buffs[0];
                return (
                  <g key={`edge-${conn.id}`} data-synergy-edge={conn.partnerKey}>
                    <path
                      d={`M ${cx} ${cy} Q ${ctrlX} ${ctrlY} ${x} ${y}`}
                      fill="none"
                      stroke={conn.kindColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={isSelected ? 0.96 : 0.48}
                      strokeDasharray={conn.kind === "control" ? "5 3" : undefined}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={midX}
                      cy={midY}
                      r={isSelected ? 4 : 2.5}
                      fill={conn.kindColor}
                      opacity={isSelected ? 1 : 0.65}
                    />
                    {isSelected && firstBuff && (
                      <g transform={`translate(${midX}, ${midY - 12})`}>
                        <rect
                          x="-30"
                          y="-9"
                          width="60"
                          height="16"
                          rx="4"
                          fill="#0f172a"
                          fillOpacity="0.92"
                          stroke={conn.kindColor}
                          strokeWidth="0.9"
                        />
                        <text
                          x="0"
                          y="2"
                          textAnchor="middle"
                          fill="#f8fafc"
                          fontSize="8.5"
                          fontWeight="700"
                          fontFamily="monospace"
                        >
                          {firstBuff.deltaLabel}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Center Focal Node */}
              <g data-synergy-focal={summary.focalKey}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="23"
                  fill="#0f172a"
                  stroke={focalRankMeta.ringColor}
                  strokeWidth="2.4"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r="17"
                  fill={focalDef.color}
                  fillOpacity="0.22"
                  stroke={focalDef.color}
                  strokeWidth="1"
                />
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {focalRankMeta.roman}
                </text>
                <text
                  x={cx}
                  y={cy + 36}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="10"
                  fontWeight="600"
                >
                  {truncateLabel(focalDef.label, 20)}
                </text>
              </g>

              {/* Partner Orbital Nodes */}
              {plottedNodes.map(({ conn, x, y, labelY }) => {
                const isSelected = selectedConnection?.id === conn.id;
                const partnerMeta = ABILITY_RANK_META[conn.partnerRank];
                return (
                  <g
                    key={`node-${conn.id}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${conn.partnerLabel} — ${conn.title} (${conn.strength}% synergy)`}
                    data-synergy-node={conn.partnerKey}
                    onClick={() => setSelectedId(conn.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter" || ev.key === " ") {
                        ev.preventDefault();
                        setSelectedId(conn.id);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r="20"
                        fill="none"
                        stroke={conn.kindColor}
                        strokeWidth="1.5"
                        strokeOpacity="0.7"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r="14.5"
                      fill="#0f172a"
                      stroke={isSelected ? conn.kindColor : conn.partnerColor}
                      strokeWidth={isSelected ? "2.4" : "1.8"}
                    />
                    <circle cx={x} cy={y} r="10" fill={conn.partnerColor} fillOpacity="0.22" />
                    <text
                      x={x}
                      y={y + 3.5}
                      textAnchor="middle"
                      fill="#f8fafc"
                      fontSize="9"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {partnerMeta.roman}
                    </text>
                    <text
                      x={x}
                      y={labelY}
                      textAnchor="middle"
                      fill={isSelected ? "#ffffff" : "#cbd5e1"}
                      fontSize="9.5"
                      fontWeight={isSelected ? "700" : "500"}
                    >
                      {truncateLabel(conn.partnerLabel)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Selected Connection Detail Card */}
          {selectedConnection && (
            <div
              data-testid="selected-synergy-detail"
              className="grid gap-2 rounded-lg border border-border/70 bg-background/55 p-3 text-xs"
              style={{ borderColor: `${selectedConnection.kindColor}66` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: selectedConnection.kindColor }}
                    />
                    <span className="font-semibold text-foreground">
                      {selectedConnection.title}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-medium" style={{ color: selectedConnection.kindColor }}>
                      {selectedConnection.kindLabel}
                    </span>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>{focalDef.label}</span>
                    {selectedConnection.direction === "mutual" ? (
                      <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ArrowRight
                        className={`h-3 w-3 ${
                          selectedConnection.direction === "buffed-by-partner" ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-medium text-foreground">
                      {selectedConnection.partnerLabel}
                    </span>
                    <span>·</span>
                    <span>{ORIGIN_LABELS[selectedConnection.partnerOrigin]}</span>
                  </p>
                </div>

                <span
                  className="font-mono text-xs font-bold tabular-nums"
                  style={{ color: selectedConnection.kindColor }}
                >
                  {selectedConnection.strength}% Sync
                </span>
              </div>

              <p className="leading-relaxed text-foreground/85">{selectedConnection.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums">
                  {selectedConnection.buffs.map((b) => (
                    <span key={b.metric} className="text-emerald-400">
                      <span className="text-muted-foreground">{b.metric} </span>
                      <span className="font-semibold">{b.deltaLabel}</span>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  {onInspectPartner && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() =>
                        onInspectPartner(
                          selectedConnection.partnerKey,
                          selectedConnection.partnerRank,
                        )
                      }
                    >
                      Inspect {truncateLabel(selectedConnection.partnerLabel, 14)}
                    </Button>
                  )}
                  {selectedConnection.partnerOrigin === "active-set" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${selectedConnection.partnerLabel} from current set`}
                      onClick={() => handleRemove(selectedConnection.partnerKey)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                    >
                      <X className="mr-1 h-3 w-3" aria-hidden="true" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Compact Connection Selector List */}
          {visibleConnections.length > 1 && (
            <ul className="grid gap-1 sm:grid-cols-2">
              {visibleConnections.map((conn) => {
                const isSelected = selectedConnection?.id === conn.id;
                const leadBuff = conn.buffs[0];
                return (
                  <li key={conn.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(conn.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                        isSelected
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: conn.partnerColor }}
                        />
                        <span className="truncate font-medium">{conn.partnerLabel}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-emerald-400">
                        {leadBuff
                          ? `${leadBuff.deltaLabel} ${leadBuff.metric}`
                          : `${conn.strength}%`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div
          data-testid="synergy-empty-state"
          className="grid gap-2 rounded-lg border border-dashed border-border/80 bg-background/45 p-3.5 text-xs"
        >
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">
                Add companion abilities to map live Synergy Connections
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Select a character wielder or add synergistic abilities below to visualize elemental
                amplifiers, lineage chains, and stat buffs for {focalDef.label}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recommended Synergies + Add to Current Set Control */}
      <div className="grid gap-2 border-t border-border/50 pt-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {visibleConnections.length === 0 ? "Top Registry Synergies" : "Expand Current Set"}
          </span>
          {availableToAdd.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Add ability to current set"
                value={pickerKey}
                onChange={(ev) => {
                  const next = ev.target.value;
                  if (next) {
                    handleAdd(next);
                    setPickerKey("");
                  }
                }}
                className="h-8 max-w-[13rem] rounded-md border border-input bg-background px-2 text-xs text-foreground"
              >
                <option value="">+ Add ability to set…</option>
                {availableToAdd.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label} ({entry.tier})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {summary.recommendedCandidates.map((cand) => (
            <button
              key={cand.key}
              type="button"
              data-add-synergy-candidate={cand.key}
              onClick={() => handleAdd(cand.key)}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-border/70 bg-background/55 px-2.5 py-1 text-xs text-foreground transition hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title={`${cand.title} · ${cand.primaryBuffLabel}`}
            >
              <Plus className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
              <span className="font-medium">{cand.label}</span>
              <span className="font-mono text-[10px] tabular-nums text-emerald-400">
                {cand.primaryBuffLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
