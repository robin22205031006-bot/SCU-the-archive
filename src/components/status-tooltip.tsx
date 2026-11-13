import { useId, useState, type ReactNode } from "react";

export const BADGE_DESCRIPTIONS: Record<string, string> = {
  // Character Tiers
  mythic:
    "Apex cosmological or transcendent power tier — pinnacle entity capable of reshaping entire realms.",
  angle:
    "Celestial sovereign tier embodying ancient light, astral law, or higher-dimensional authority.",
  angel:
    "Celestial sovereign tier embodying ancient light, astral law, or higher-dimensional authority.",
  guardian:
    "Sworn protector-class tier tasked with defending realms, bloodlines, or sacred cosmic seals.",
  legendary:
    "Renowned high-tier combatant or figure whose mastery and feats define an era of the SCU.",
  heroic:
    "Proven frontline champion tier with exceptional skill, resolve, or awakened kinetic abilities.",
  exceptional:
    "Elite standout figure whose prowess surpasses standard operational classifications.",
  rare: "Uncommon specialist wielding distinct abilities, bloodline traits, or rare combat tech.",
  unique: "Singular anomaly possessing one-of-a-kind capabilities or lineage.",
  ancient: "Primordial entity or bloodline predating modern eras and conflicts.",
  common: "Baseline operative or civilian tier within the Sentinels Cinematic Universe.",
  standard: "Baseline operative or civilian tier within the Sentinels Cinematic Universe.",
  unranked: "Power tier classification has not yet been formally assigned in the archive.",

  // Character & Organization Statuses
  alive: "Confirmed living and active within the current SCU timeline.",
  active: "Operational and actively influencing ongoing universe events.",
  dead: "Confirmed fallen or killed during canon events.",
  "presumed dead":
    "Believed lost or killed in action, though definitive proof remains unconfirmed.",
  retired: "Stepped back from active combat duty or frontline leadership.",
  missing: "Current whereabouts unknown across known realms.",
  inactive: "Dormant, disbanded, or no longer operating openly.",
  legend: "Transcended active archive records — remembered through myth and legacy.",
  unknown: "Current operational or vital status has not been verified.",
};

export function getBadgeDescription(label: string | null | undefined): string {
  if (!label) return "";
  const normalized = label.trim().toLowerCase();
  if (BADGE_DESCRIPTIONS[normalized]) return BADGE_DESCRIPTIONS[normalized];
  return `Archive classification: ${label.trim()}.`;
}

/**
 * Custom accessible hover/focus tooltip for card status and tier badges.
 * Displays a concise description of what the badge classification means.
 */
export function StatusTooltip({
  label,
  description,
  children,
  className = "",
}: {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const text = description?.trim() || getBadgeDescription(label);

  if (!text) return <>{children}</>;

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      aria-describedby={open ? tooltipId : undefined}
    >
      {children}
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-[120] mb-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover/95 px-3 py-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-popover-foreground shadow-xl backdrop-blur-md"
        >
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-accent">
            {label}
          </span>
          <span className="block text-popover-foreground/90">{text}</span>
        </span>
      )}
    </span>
  );
}
