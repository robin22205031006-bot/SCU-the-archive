import { useMemo } from "react";
import {
  ROLE_EMBLEM_DEFS,
  STORY_EMBLEM_ROLE_DEFS,
  TEAM_EMBLEM_ROLE_DEFS,
  mergeEmblemRoles,
  roleEmblemDef,
  type EmblemRoleCategory,
  type EmblemRoleLabel,
} from "@/lib/role-emblems";
import { useIsManga } from "@/hooks/use-ui-mode";
import { useUiStyle } from "@/lib/ui-style";

export type RoleEmblemSize = "xs" | "sm" | "md" | "lg";

const GLYPH_SIZE: Record<RoleEmblemSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

/**
 * Bespoke crisp multi-layered vector emblems for the 10 SCU narrative & team roles:
 * Captain, Leader, Director, Founder, Support, Main Lead, Main Antagonist, Antagonist, Anti-Villain, Anti-Hero.
 */
export function RoleEmblemGlyph({
  role,
  className = "h-4 w-4",
  colored = true,
}: {
  role: string;
  className?: string;
  colored?: boolean;
}) {
  const def = roleEmblemDef(role);
  if (!def) return null;
  const strokeColor = colored ? def.color : "currentColor";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke={strokeColor}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-role-emblem-glyph={def.abilityKey}
      className={className}
    >
      {def.label === "Captain" && (
        <>
          <path d="M6 19l10-6 10 6" />
          <path d="M6 25l10-6 10 6" opacity="0.82" />
          <polygon
            points="16,4 18.2,8.4 23,9.1 19.5,12.5 20.3,17.2 16,15 11.7,17.2 12.5,12.5 9,9.1 13.8,8.4"
            fill={strokeColor}
            fillOpacity="0.24"
            strokeWidth="1.5"
          />
        </>
      )}
      {def.label === "Leader" && (
        <>
          <path d="M4.5 22L7 9l6 6 3-9.5 3 9.5 6-6 2.5 13Z" fill={strokeColor} fillOpacity="0.24" />
          <path d="M5.5 26.5h21" />
          <circle cx="16" cy="17.5" r="1.7" fill={strokeColor} stroke="none" />
        </>
      )}
      {def.label === "Director" && (
        <>
          <polygon points="16,3.5 28.5,16 16,28.5 3.5,16" fill={strokeColor} fillOpacity="0.14" />
          <circle cx="16" cy="16" r="5" fill={strokeColor} fillOpacity="0.22" />
          <circle cx="16" cy="16" r="1.8" fill={strokeColor} stroke="none" />
          <path d="M16 2v4.5M16 25.5V30M2 16h4.5M25.5 16H30" opacity="0.85" />
        </>
      )}
      {def.label === "Founder" && (
        <>
          <path d="M9.5 26.5C5.5 23 4.5 16 7.5 10" opacity="0.85" />
          <path d="M22.5 26.5c4-3.5 5-10.5 2-16.5" opacity="0.85" />
          <polygon
            points="16,4.5 21,11.5 19,24.5 13,24.5 11,11.5"
            fill={strokeColor}
            fillOpacity="0.22"
          />
          <path d="M16 4.5V24.5M11 27.5h10" />
        </>
      )}
      {def.label === "Support" && (
        <>
          <path
            d="M16 3.5L26.5 8v7c0 6.8-4.4 11.4-10.5 13.8C9.9 26.4 5.5 21.8 5.5 15V8Z"
            fill={strokeColor}
            fillOpacity="0.2"
          />
          <path d="M16 10.5v11M10.5 16h11" strokeWidth="2.4" />
        </>
      )}
      {def.label === "Main Lead" && (
        <>
          <circle cx="16" cy="16" r="11.5" strokeDasharray="3 2.5" opacity="0.6" />
          <polygon
            points="16,2.5 19.3,12.7 29.5,16 19.3,19.3 16,29.5 12.7,19.3 2.5,16 12.7,12.7"
            fill={strokeColor}
            fillOpacity="0.28"
          />
          <circle cx="16" cy="16" r="2.2" fill={strokeColor} stroke="none" />
        </>
      )}
      {def.label === "Main Antagonist" && (
        <>
          <path d="M6.5 6.5c-2 4.5 0 9 3.5 11.5M25.5 6.5c2 4.5 0 9-3.5 11.5" />
          <path
            d="M7 24.5l2.5-10 4.5 4.5 2-6.5 2 6.5 4.5-4.5 2.5 10Z"
            fill={strokeColor}
            fillOpacity="0.26"
          />
          <circle cx="16" cy="9.5" r="3" fill={strokeColor} fillOpacity="0.3" />
        </>
      )}
      {def.label === "Antagonist" && (
        <>
          <polygon points="16,4 27,16 16,28 5,16" fill={strokeColor} fillOpacity="0.14" />
          <path d="M9.5 9.5l13 13M22.5 9.5l-13 13" strokeWidth="2.2" />
          <polygon points="16,12 19,16 16,20 13,16" fill={strokeColor} stroke="none" />
        </>
      )}
      {def.label === "Anti-Villain" && (
        <>
          <path
            d="M21 5.5A11 11 0 1 0 26.5 21 8.5 8.5 0 0 1 21 5.5Z"
            fill={strokeColor}
            fillOpacity="0.22"
          />
          <polygon points="18.5,9 26,13.5 22,22 15,17" fill={strokeColor} fillOpacity="0.18" />
          <path d="M16 4v24" strokeDasharray="2.5 2.5" opacity="0.7" />
        </>
      )}
      {def.label === "Anti-Hero" && (
        <>
          <circle cx="16" cy="16" r="10.5" strokeDasharray="16 5" opacity="0.65" />
          <path d="M5 24L22.5 5l4 4L10 27Z" fill={strokeColor} fillOpacity="0.26" />
          <path d="M8.5 10.5L13 15M18 19l5.5 5.5" />
        </>
      )}
    </svg>
  );
}

/**
 * Renders a role emblem badge in its exact role-specific color across Classic, Nexus, and Manga modes.
 */
export function RoleEmblemBadge({
  role,
  size = "sm",
  showLabel = true,
  className = "",
}: {
  role: string;
  size?: RoleEmblemSize;
  showLabel?: boolean;
  className?: string;
}) {
  const isManga = useIsManga();
  const uiStyle = useUiStyle();
  const nexus = !isManga && uiStyle === "nexus";
  const def = roleEmblemDef(role);
  if (!def) return null;

  const pad =
    size === "xs"
      ? "px-1.5 py-0.5 text-[9px] gap-1"
      : size === "lg"
        ? "px-3 py-1.5 text-xs gap-2"
        : "px-2 py-0.5 text-[10px] gap-1.5";

  return (
    <span
      title={`${def.label} — ${def.description}`}
      data-role-emblem={def.abilityKey}
      data-role-label={def.label}
      data-role-color={def.color}
      style={{
        borderColor: def.borderTint,
        backgroundColor: isManga ? "rgba(15, 23, 42, 0.9)" : def.bgTint,
        color: def.color,
        boxShadow: nexus ? `0 0 12px ${def.bgTint}` : undefined,
      }}
      className={`inline-flex items-center font-semibold uppercase tracking-wider ${
        isManga ? "border-2 font-mono" : "rounded-full border"
      } ${pad} ${className}`}
    >
      <RoleEmblemGlyph role={def.label} className={`${GLYPH_SIZE[size]} shrink-0`} />
      {showLabel && <span className="leading-none">{def.label}</span>}
    </span>
  );
}

/**
 * Renders multiple role emblems attached to a character or team member.
 * Honors spoiler masking cleanly.
 */
export function RoleEmblemStrip({
  roles,
  masked = false,
  size = "sm",
  showLabels = true,
  max,
  emptyLabel,
  className = "",
}: {
  roles: readonly string[];
  masked?: boolean;
  size?: RoleEmblemSize;
  showLabels?: boolean;
  max?: number;
  emptyLabel?: string;
  className?: string;
}) {
  const resolved = useMemo(
    () =>
      mergeEmblemRoles(
        roles.map((r) => roleEmblemDef(r)?.label).filter((x): x is EmblemRoleLabel => !!x),
      ),
    [roles],
  );

  if (masked) {
    if (!resolved.length) return null;
    return (
      <span
        data-spoiler="char"
        className={`inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground ${className}`}
      >
        Roles Hidden
      </span>
    );
  }

  if (resolved.length === 0) {
    return emptyLabel ? (
      <span className={`text-xs text-muted-foreground ${className}`}>{emptyLabel}</span>
    ) : null;
  }

  const visible = typeof max === "number" && max > 0 ? resolved.slice(0, max) : resolved;
  const overflow = resolved.length - visible.length;

  return (
    <div
      data-spoiler="char"
      data-role-emblem-strip="true"
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
    >
      {visible.map((r) => (
        <RoleEmblemBadge key={r} role={r} size={size} showLabel={showLabels} />
      ))}
      {overflow > 0 && (
        <span className="rounded-full border border-border/60 bg-secondary/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
}

/**
 * Interactive multi-role selector allowing admins/staff to attach multiple role emblems
 * (Captain, Leader, Director, Founder, Support, Main Lead, Main Antagonist, Antagonist, Anti-Villain, Anti-Hero).
 */
export function RoleMultiPicker({
  selected,
  onChange,
  categories,
  disabled = false,
  compact = false,
  title = "Role Emblems (multiple allowed)",
}: {
  selected: readonly string[];
  onChange: (nextRoles: EmblemRoleLabel[]) => void;
  categories?: readonly EmblemRoleCategory[];
  disabled?: boolean;
  compact?: boolean;
  title?: string;
}) {
  const activeSet = useMemo(() => {
    const s = new Set<EmblemRoleLabel>();
    for (const r of selected) {
      const def = roleEmblemDef(r);
      if (def) s.add(def.label);
    }
    return s;
  }, [selected]);

  const defs = useMemo(() => {
    if (!categories || categories.length === 0) return ROLE_EMBLEM_DEFS;
    return ROLE_EMBLEM_DEFS.filter((d) => categories.includes(d.category));
  }, [categories]);

  const groups = useMemo(() => {
    const team = defs.filter((d) => d.category === "team");
    const story = defs.filter((d) => d.category !== "team");
    return [
      ...(team.length ? [{ id: "team", heading: "Team & Command Roles", items: team }] : []),
      ...(story.length ? [{ id: "story", heading: "Series & Alignment Roles", items: story }] : []),
    ];
  }, [defs]);

  const toggle = (label: EmblemRoleLabel) => {
    if (disabled) return;
    const next = new Set(activeSet);
    if (next.has(label)) next.delete(label);
    else next.add(label);
    const ordered = ROLE_EMBLEM_DEFS.map((d) => d.label).filter((l) => next.has(l));
    onChange(ordered);
  };

  return (
    <div className={`space-y-2 ${compact ? "text-xs" : "text-sm"}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          {activeSet.size > 0 && (
            <span className="font-mono text-[10px] text-accent">{activeSet.size} attached</span>
          )}
        </div>
      )}
      <div className="space-y-2 rounded-lg border border-border/70 bg-background/40 p-2.5">
        {groups.map((grp) => (
          <div key={grp.id} className="space-y-1">
            {groups.length > 1 && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/80">
                {grp.heading}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {grp.items.map((def) => {
                const on = activeSet.has(def.label);
                return (
                  <button
                    key={def.abilityKey}
                    type="button"
                    disabled={disabled}
                    aria-pressed={on}
                    title={def.description}
                    onClick={() => toggle(def.label)}
                    style={
                      on
                        ? {
                            borderColor: def.color,
                            backgroundColor: def.bgTint,
                            color: def.color,
                            boxShadow: `0 0 12px ${def.bgTint}`,
                          }
                        : undefined
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border transition ${
                      compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
                    } ${
                      on
                        ? "font-semibold"
                        : "border-border/70 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
                    } disabled:opacity-50`}
                  >
                    <RoleEmblemGlyph
                      role={def.label}
                      className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"}
                      colored={on}
                    />
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { TEAM_EMBLEM_ROLE_DEFS, STORY_EMBLEM_ROLE_DEFS };
