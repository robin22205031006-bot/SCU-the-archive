import { useId } from "react";

/**
 * Pure monochrome & crimson hanko/woodblock vector emblem library for Manga UI mode.
 * Zero smooth CSS gradients, zero neon drop-shadows — strictly ink strokes & halftone stipples.
 */

export function HankoStamp({
  kanji,
  label,
  tilt = -4,
  className = "",
}: {
  kanji: string;
  label?: string;
  tilt?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex flex-col items-center justify-center border-2 border-[#b91c1c] bg-transparent px-1.5 py-0.5 text-[#b91c1c] dark:border-[#dc2626] dark:text-[#dc2626] select-none ${className}`}
      style={{
        transform: `rotate(${tilt}deg)`,
        boxShadow: "inset 0 0 0 1px currentColor",
      }}
      title={label ?? kanji}
    >
      <span className="font-serif text-xs font-black leading-none tracking-tight">{kanji}</span>
      {label && (
        <span className="mt-0.5 border-t border-current pt-[1px] font-mono text-[8px] font-bold uppercase leading-none tracking-widest">
          {label}
        </span>
      )}
    </span>
  );
}

/** Registration corner crop marks inspired by manga manuscript boards (原稿用紙). */
export function MangaCornerMarks({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none fixed inset-2 z-20 hidden sm:block ${className}`}
      aria-hidden="true"
    >
      <svg
        className="absolute left-0 top-0 h-5 w-5 text-foreground/45"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 14V2h12M6 18V6h12" />
      </svg>
      <svg
        className="absolute right-0 top-0 h-5 w-5 text-foreground/45"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M22 14V2H10M18 18V6H6" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 h-5 w-5 text-foreground/45"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 10v12h12M6 6v12h12" />
      </svg>
      <svg
        className="absolute bottom-0 right-0 h-5 w-5 text-foreground/45"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M22 10v12H10M18 6v12H6" />
      </svg>
    </div>
  );
}

type CrestFlavor =
  | "adventure"
  | "fantasy"
  | "dark"
  | "sentinel"
  | "villain"
  | "bloodline"
  | "arsenal"
  | "chronicler";

function resolveCrestFlavor(raw?: string | null): CrestFlavor {
  const s = (raw ?? "").toLowerCase();
  if (/dark|curse|demon|shadow|villain|antagonist|obsidian|diablo|blood/.test(s)) return "dark";
  if (/bloodline|clan|lineage|kurohana|kazumi|al-mansur/.test(s)) return "bloodline";
  if (/fantasy|myth|divine|aether|cosmic|celestial|magic|arcane/.test(s)) return "fantasy";
  if (/adventure|protagonist|hero|explorer|rogue|scout/.test(s)) return "adventure";
  if (/weapon|sword|blade|arsenal|relic|armor/.test(s)) return "arsenal";
  if (/sentinel|guardian|order|warden/.test(s)) return "sentinel";
  return "chronicler";
}

const CREST_PATHS: Record<CrestFlavor, { seal: string; d: string }> = {
  adventure: {
    seal: "ADV",
    d: "M16 4 L19 13 L28 16 L19 19 L16 28 L13 19 L4 16 L13 13 Z M16 11 L16 21 M11 16 L21 16",
  },
  fantasy: {
    seal: "ARC",
    d: "M16 4 C22 8 27 12 27 18 C27 24 21 28 16 28 C11 28 5 24 5 18 C5 12 10 8 16 4 Z M16 9 L20 17 L16 23 L12 17 Z",
  },
  dark: {
    seal: "DRK",
    d: "M6 8 L16 4 L26 8 L22 21 L16 28 L10 21 Z M11 13 L16 16 L21 13 M16 16 L16 24",
  },
  sentinel: {
    seal: "SNT",
    d: "M7 6 H25 V17 C25 23 16 28 16 28 C16 28 7 23 7 17 Z M16 9 V23 M11 14 H21",
  },
  villain: {
    seal: "EXT",
    d: "M5 7 L16 15 L27 7 M5 25 L16 17 L27 25 M16 4 V28",
  },
  bloodline: {
    seal: "LIN",
    d: "M16 4 L25 13 L16 28 L7 13 Z M16 9 V22 M12 14 H20",
  },
  arsenal: {
    seal: "ARM",
    d: "M24 5 L12 17 M9 14 L15 20 M12 17 L7 22 M19 25 H26",
  },
  chronicler: {
    seal: "ARC",
    d: "M7 6 H22 Q25 6 25 9 V26 H10 Q7 26 7 23 Z M10 23 H25 M13 11 H20 M13 15 H20",
  },
};

/**
 * Monochrome halftone issue stamp badge for categories, roles, and factions in Manga mode.
 */
export function MangaCategorySeal({
  label,
  flavor,
  size = "sm",
  inverted = false,
}: {
  label: string;
  flavor?: string | null;
  size?: "xs" | "sm" | "md";
  inverted?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const resolved = resolveCrestFlavor(flavor ?? label);
  const { d } = CREST_PATHS[resolved];
  const iconSize = size === "md" ? "h-5 w-5" : size === "sm" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span
      className={`inline-flex items-center gap-1.5 border-2 border-foreground px-2 py-0.5 font-mono font-bold uppercase tracking-wider select-none ${
        inverted ? "bg-foreground text-background" : "bg-card text-foreground"
      } ${size === "xs" ? "text-[9px]" : size === "md" ? "text-xs" : "text-[10px]"}`}
      style={{ boxShadow: "2px 2px 0 currentColor" }}
    >
      <svg viewBox="0 0 32 32" className={`${iconSize} shrink-0`} aria-hidden="true">
        <defs>
          <pattern id={`seal-dot-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="0.7" fill="currentColor" fillOpacity="0.28" />
          </pattern>
        </defs>
        <rect
          x="2"
          y="2"
          width="28"
          height="28"
          fill={`url(#seal-dot-${uid})`}
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Stamped geometric hex/diamond issue crest for weapons, factions, or series cards. */
export function MangaWoodblockCrest({
  code,
  pathD,
  crimson = false,
  className = "size-10",
}: {
  code: string;
  pathD?: string;
  crimson?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 64 64" className={`${className} shrink-0`} aria-hidden="true">
      <defs>
        <pattern id={`wb-dots-${uid}`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.85" fill="currentColor" fillOpacity="0.2" />
        </pattern>
      </defs>
      <polygon
        points="32,3 59,18 59,46 32,61 5,46 5,18"
        className={
          crimson
            ? "fill-[#b91c1c]/15 stroke-[#b91c1c] dark:stroke-[#dc2626]"
            : "fill-card stroke-foreground"
        }
        strokeWidth="3"
      />
      <polygon
        points="32,8 54,20.5 54,43.5 32,56 10,43.5 10,20.5"
        fill={`url(#wb-dots-${uid})`}
        stroke="currentColor"
        strokeWidth="1.2"
      />
      {pathD ? (
        <g
          transform="translate(8 8)"
          fill="none"
          stroke={crimson ? "#b91c1c" : "currentColor"}
          strokeWidth="2.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d={pathD} />
        </g>
      ) : (
        <text
          x="32"
          y="36"
          textAnchor="middle"
          className="fill-current font-mono text-[13px] font-black uppercase"
        >
          {code.slice(0, 3)}
        </text>
      )}
    </svg>
  );
}
