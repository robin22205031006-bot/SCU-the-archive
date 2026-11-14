import type { ReactNode } from "react";
import { Shield, Sparkles, Swords, Wind, Flame, Droplets, Zap, Eye } from "lucide-react";
import { useAnimationsEnabled } from "@/lib/animations";

export type BotanicalCanopyVariant = "dossier" | "map" | "card";

function resolveOrbIcon(iconKey?: string) {
  const k = (iconKey ?? "").toLowerCase();
  if (k.includes("fire") || k.includes("flame") || k.includes("blaze")) return Flame;
  if (k.includes("water") || k.includes("ice") || k.includes("frost")) return Droplets;
  if (k.includes("wind") || k.includes("sky") || k.includes("tempest")) return Wind;
  if (k.includes("bolt") || k.includes("thunder") || k.includes("shock")) return Zap;
  if (k.includes("shield") || k.includes("guard") || k.includes("ward")) return Shield;
  if (k.includes("eye") || k.includes("sight") || k.includes("astral")) return Eye;
  if (k.includes("sword") || k.includes("blade") || k.includes("strike")) return Swords;
  return Sparkles;
}

/**
 * Overhanging botanical tree branches, articulated hanging ivy tendrils, and fluttering leaves
 * animated smoothly on the GPU compositor (`transform` & `opacity` only), inspired by anime botanical UI.
 */
export function BotanicalCanopyOverlay({
  variant = "dossier",
  className = "",
}: {
  variant?: BotanicalCanopyVariant;
  className?: string;
}) {
  const animOn = useAnimationsEnabled();
  const branchLeftClass = animOn ? "botanical-branch-sway" : "";
  const branchRightClass = animOn ? "botanical-branch-sway-right" : "";
  const ivySlowClass = animOn ? "ivy-pendulum-slow" : "";
  const ivyFastClass = animOn ? "ivy-pendulum-fast" : "";
  const leafFlutterClass = animOn ? "leaf-flutter" : "";
  const leafDriftClass = animOn ? "leaf-drift" : "";

  if (variant === "card") {
    return (
      <div
        aria-hidden="true"
        data-botanical-canopy="card"
        data-botanical-animated={animOn ? "true" : "false"}
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
      >
        {/* Top-left overhanging branchlet with swaying hanging ivy tendril */}
        <svg
          viewBox="0 0 110 88"
          className={`absolute -left-1 -top-1 h-20 w-24 text-[#2e5a52] ${branchLeftClass}`}
          fill="none"
        >
          <path
            d="M-4 14 Q28 8 58 22 Q74 29 94 20"
            stroke="#8a7243"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M16 14 Q36 22 50 11" stroke="#c5a869" strokeWidth="1.2" strokeLinecap="round" />
          {/* Hanging ivy vine strand */}
          <g className={ivyFastClass}>
            <path
              d="M28 15 C26 32, 32 46, 25 68"
              stroke="#5ce1b8"
              strokeOpacity="0.65"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <path
              d="M27 28 C19 25, 17 31, 22 36 C26 34, 28 31, 27 28 Z"
              fill="#2e5a52"
              stroke="#5ce1b8"
              strokeWidth="0.7"
            />
            <path
              d="M28 42 C36 39, 38 45, 33 50 C29 48, 28 45, 28 42 Z"
              fill="#3d7869"
              stroke="#c5a869"
              strokeWidth="0.7"
            />
            <path
              d="M26 57 C19 56, 18 62, 23 66 C26 63, 27 60, 26 57 Z"
              fill="#5ce1b8"
              fillOpacity="0.6"
              stroke="#c5a869"
              strokeWidth="0.6"
            />
          </g>
          {/* Fluttering leaves along upper twig */}
          <path
            d="M48 16 C45 7, 53 3, 60 9 C56 14, 52 16, 48 16 Z"
            className={leafFlutterClass}
            fill="#5ce1b8"
            fillOpacity="0.48"
            stroke="#c5a869"
            strokeWidth="0.7"
          />
          <path
            d="M72 22 C73 13, 81 11, 86 18 C81 22, 76 23, 72 22 Z"
            className={leafFlutterClass}
            style={{ animationDelay: "0.7s" }}
            fill="#2e5a52"
            stroke="#5ce1b8"
            strokeWidth="0.7"
          />
        </svg>

        {/* Top-right trailing hanging vine */}
        <svg
          viewBox="0 0 80 76"
          className={`absolute -right-1 -top-1 h-16 w-20 text-[#2e5a52] ${ivySlowClass}`}
          fill="none"
        >
          <path
            d="M78 8 C62 12, 54 24, 57 46 C58 55, 53 64, 49 70"
            stroke="#c5a869"
            strokeOpacity="0.8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M61 20 C52 17, 50 23, 55 28 C59 26, 61 23, 61 20 Z"
            fill="#3d7869"
            stroke="#5ce1b8"
            strokeWidth="0.7"
          />
          <path
            d="M56 38 C64 36, 66 42, 60 47 C56 44, 55 41, 56 38 Z"
            fill="#5ce1b8"
            fillOpacity="0.45"
            stroke="#c5a869"
            strokeWidth="0.7"
          />
        </svg>
      </div>
    );
  }

  // Full Dossier / Map Conservatory Canopy
  return (
    <div
      aria-hidden="true"
      data-botanical-canopy={variant}
      data-botanical-animated={animOn ? "true" : "false"}
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] ${className}`}
    >
      {/* Left Overhanging Gnarled Tree Branch + Clustered Leaves + Cascading Hanging Ivy */}
      <svg
        viewBox="0 0 260 220"
        className={`absolute -left-2 -top-2 h-44 w-52 sm:h-52 sm:w-64 ${branchLeftClass}`}
        fill="none"
      >
        {/* Main curved bough */}
        <path
          d="M-8 32 C34 14, 88 18, 138 38 C176 52, 214 44, 246 26"
          stroke="#7c653a"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <path
          d="M12 25 C56 18, 102 28, 152 16"
          stroke="#c5a869"
          strokeOpacity="0.65"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Leaf Clusters */}
        <g className={leafFlutterClass}>
          <path
            d="M42 22 C34 7, 50 0, 62 11 C55 18, 48 22, 42 22 Z"
            fill="#2e5a52"
            stroke="#c5a869"
            strokeWidth="0.9"
          />
          <path
            d="M66 24 C66 8, 82 4, 92 15 C84 22, 74 25, 66 24 Z"
            fill="#5ce1b8"
            fillOpacity="0.45"
            stroke="#c5a869"
            strokeWidth="0.8"
          />
          <path
            d="M112 31 C108 16, 125 10, 136 22 C127 29, 118 32, 112 31 Z"
            fill="#376e5f"
            stroke="#5ce1b8"
            strokeWidth="0.8"
          />
          <path
            d="M174 42 C174 27, 190 23, 200 34 C191 41, 182 44, 174 42 Z"
            fill="#5ce1b8"
            fillOpacity="0.4"
            stroke="#c5a869"
            strokeWidth="0.8"
          />
        </g>

        {/* Primary Long Hanging Ivy Vine 1 */}
        <g className={ivySlowClass}>
          <path
            d="M36 26 C28 66, 42 102, 30 148 C24 170, 29 188, 22 208"
            stroke="#c5a869"
            strokeOpacity="0.8"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M34 52 C21 48, 18 59, 26 65 C31 61, 34 57, 34 52 Z"
            fill="#2e5a52"
            stroke="#5ce1b8"
            strokeWidth="0.8"
          />
          <path
            d="M35 80 C47 75, 50 86, 42 93 C36 89, 34 84, 35 80 Z"
            fill="#5ce1b8"
            fillOpacity="0.52"
            stroke="#c5a869"
            strokeWidth="0.8"
          />
          <path
            d="M33 114 C20 111, 18 122, 27 128 C32 123, 34 119, 33 114 Z"
            fill="#376e5f"
            stroke="#5ce1b8"
            strokeWidth="0.8"
          />
          <path
            d="M27 152 C38 148, 40 159, 33 165 C28 161, 26 156, 27 152 Z"
            fill="#2e5a52"
            stroke="#c5a869"
            strokeWidth="0.8"
          />
          <path
            d="M24 186 C14 184, 13 194, 20 199 C24 195, 25 190, 24 186 Z"
            fill="#5ce1b8"
            fillOpacity="0.62"
            stroke="#c5a869"
            strokeWidth="0.7"
          />
        </g>

        {/* Secondary Hanging Ivy Tendril 2 */}
        <g className={ivyFastClass} style={{ animationDelay: "0.8s" }}>
          <path
            d="M84 26 C79 58, 88 86, 78 122"
            stroke="#5ce1b8"
            strokeOpacity="0.7"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M82 48 C72 45, 70 54, 77 59 C81 56, 83 52, 82 48 Z"
            fill="#376e5f"
            stroke="#c5a869"
            strokeWidth="0.75"
          />
          <path
            d="M84 78 C94 74, 96 84, 88 89 C84 86, 83 82, 84 78 Z"
            fill="#5ce1b8"
            fillOpacity="0.48"
            stroke="#c5a869"
            strokeWidth="0.75"
          />
          <circle cx="78" cy="124" r="2.2" fill="#5ce1b8" />
        </g>

        {/* Glowing Sunlit Spores */}
        <circle cx="56" cy="40" r="1.8" fill="#5ce1b8" />
        <circle cx="122" cy="54" r="1.5" fill="#c5a869" />
      </svg>

      {/* Right Overhanging Botanical Bough & Hanging Ivy Cascade */}
      <svg
        viewBox="0 0 240 200"
        className={`absolute -right-2 -top-2 h-40 w-48 sm:h-48 sm:w-56 ${branchRightClass}`}
        fill="none"
      >
        <path
          d="M248 28 C206 12, 152 20, 108 38 C76 50, 48 40, 22 24"
          stroke="#7c653a"
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <g className={leafFlutterClass} style={{ animationDelay: "0.5s" }}>
          <path
            d="M196 22 C204 8, 188 2, 177 12 C184 19, 190 22, 196 22 Z"
            fill="#2e5a52"
            stroke="#c5a869"
            strokeWidth="0.9"
          />
          <path
            d="M150 28 C154 14, 138 9, 128 20 C136 27, 144 29, 150 28 Z"
            fill="#5ce1b8"
            fillOpacity="0.44"
            stroke="#c5a869"
            strokeWidth="0.8"
          />
        </g>
        <g className={ivySlowClass} style={{ animationDelay: "1.1s" }}>
          <path
            d="M210 24 C216 62, 204 98, 214 144 C218 164, 211 180, 215 194"
            stroke="#c5a869"
            strokeOpacity="0.8"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M212 52 C224 48, 226 58, 218 64 C214 60, 212 56, 212 52 Z"
            fill="#376e5f"
            stroke="#5ce1b8"
            strokeWidth="0.8"
          />
          <path
            d="M210 88 C199 84, 197 95, 205 101 C210 96, 211 92, 210 88 Z"
            fill="#5ce1b8"
            fillOpacity="0.52"
            stroke="#c5a869"
            strokeWidth="0.8"
          />
          <path
            d="M213 132 C224 129, 225 139, 218 145 C213 140, 212 136, 213 132 Z"
            fill="#2e5a52"
            stroke="#5ce1b8"
            strokeWidth="0.8"
          />
        </g>
        <g className={ivyFastClass} style={{ animationDelay: "0.4s" }}>
          <path
            d="M168 28 C172 56, 162 80, 170 112"
            stroke="#5ce1b8"
            strokeOpacity="0.65"
            strokeWidth="1.2"
          />
          <path
            d="M169 54 C178 51, 180 60, 172 65 C169 62, 168 58, 169 54 Z"
            fill="#5ce1b8"
            fillOpacity="0.46"
            stroke="#c5a869"
            strokeWidth="0.7"
          />
        </g>
      </svg>

      {/* Drifting Botanical Leaves Caught in Breeze */}
      {animOn && (
        <>
          <svg
            viewBox="0 0 20 20"
            className={`absolute left-[18%] top-8 h-4 w-4 text-[#5ce1b8] opacity-70 ${leafDriftClass}`}
            fill="currentColor"
          >
            <path d="M10 2 C15 6, 16 13, 10 18 C4 13, 5 6, 10 2 Z" />
          </svg>
          <svg
            viewBox="0 0 20 20"
            className={`absolute right-[20%] top-12 h-3.5 w-3.5 text-[#c5a869] opacity-65 ${leafDriftClass}`}
            style={{ animationDelay: "3.4s" }}
            fill="currentColor"
          >
            <path d="M10 2 C15 6, 16 13, 10 18 C4 13, 5 6, 10 2 Z" />
          </svg>
        </>
      )}
    </div>
  );
}

/**
 * Aged Parchment Cartouche wrapped in Jade-Teal & Antique Gold Curling Cloud Scrolls
 * (directly inspired by Pic 4's ornate cloud-scroll plaques & gem clasps).
 */
export function JadeScrollCartouche({
  kicker,
  title,
  badge,
  rightSlot,
  className = "",
}: {
  kicker?: string;
  title: string;
  badge?: string;
  rightSlot?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-jade-cartouche="true"
      className={`relative overflow-hidden rounded-lg border-2 border-[#c5a869] bg-gradient-to-r from-[#1c423a] via-[#f5ebe6] to-[#1c423a] p-[2px] shadow-[0_8px_24px_rgba(0,0,0,0.45),0_0_16px_rgba(92,225,184,0.18)] ${className}`}
    >
      <div className="parchment-dot-grid relative flex flex-wrap items-center justify-between gap-2 rounded-[6px] px-4 py-2 text-[#15221b]">
        {/* Left & Right Jade Cloud-Scroll Finials */}
        <svg
          viewBox="0 0 40 44"
          aria-hidden="true"
          className="pointer-events-none absolute -left-1 top-1/2 h-11 w-9 -translate-y-1/2 text-[#2e5a52]"
          fill="none"
        >
          <path
            d="M4 22 C4 10, 14 6, 22 10 C18 14, 15 18, 16 22 C15 26, 18 30, 22 34 C14 38, 4 34, 4 22 Z"
            fill="currentColor"
            fillOpacity="0.9"
            stroke="#c5a869"
            strokeWidth="1.2"
          />
          <circle cx="11" cy="22" r="2.8" fill="#5ce1b8" stroke="#c5a869" strokeWidth="0.9" />
        </svg>
        <svg
          viewBox="0 0 40 44"
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 top-1/2 h-11 w-9 -translate-y-1/2 -scale-x-100 text-[#2e5a52]"
          fill="none"
        >
          <path
            d="M4 22 C4 10, 14 6, 22 10 C18 14, 15 18, 16 22 C15 26, 18 30, 22 34 C14 38, 4 34, 4 22 Z"
            fill="currentColor"
            fillOpacity="0.9"
            stroke="#c5a869"
            strokeWidth="1.2"
          />
          <circle cx="11" cy="22" r="2.8" fill="#5ce1b8" stroke="#c5a869" strokeWidth="0.9" />
        </svg>

        <div className="relative pl-6">
          {kicker && (
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.26em] text-[#2e5a52]">
              {kicker}
            </p>
          )}
          <h2 className="font-display text-base font-bold uppercase tracking-wider text-[#15221b] sm:text-lg">
            {title}
          </h2>
        </div>

        <div className="relative flex items-center gap-2 pr-5">
          {badge && (
            <span className="rounded-full border border-[#2e5a52]/65 bg-[#15221b] px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#5ce1b8]">
              {badge}
            </span>
          )}
          {rightSlot}
        </div>
      </div>
    </div>
  );
}

/**
 * Luminous Circular Emerald-Cyan Alchemical Ability Medallion
 * (directly modeled on Pic 1's 3 glowing circular cyan rune medallions).
 */
export function AlchemicalAbilityOrb({
  label,
  tier,
  icon,
  selected = false,
  onClick,
}: {
  label: string;
  tier?: string;
  icon?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const Icon = resolveOrbIcon(icon || label);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-ability-orb="true"
      className="group flex flex-col items-center gap-1.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5ce1b8]"
    >
      <span
        className={`relative grid h-14 w-14 place-items-center rounded-full border-2 transition-transform duration-200 group-hover:scale-105 ${
          selected
            ? "fantasy-emerald-orb border-[#f5ebe6] ring-2 ring-[#5ce1b8]/70"
            : "border-[#c5a869] bg-[radial-gradient(circle_at_35%_30%,#388a7a_0%,#1c423a_58%,#0e1915_100%)] shadow-[0_0_16px_rgba(92,225,184,0.34),inset_0_0_10px_rgba(92,225,184,0.28)]"
        }`}
      >
        <svg
          viewBox="0 0 60 60"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full text-[#c5a869]/80"
          fill="none"
        >
          <circle
            cx="30"
            cy="30"
            r="25"
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <polygon
            points="30,6 54,30 30,54 6,30"
            stroke="#5ce1b8"
            strokeOpacity="0.65"
            strokeWidth="0.9"
          />
        </svg>
        <Icon className="relative h-5 w-5 text-[#eafff7] drop-shadow-[0_0_8px_rgba(92,225,184,0.85)]" />
      </span>
      <span className="max-w-[84px] truncate font-mono text-[9px] font-bold uppercase tracking-wider text-[#f5ebe6]">
        {label}
      </span>
      {tier && (
        <span className="font-mono text-[8px] uppercase tracking-widest text-[#5ce1b8]">
          {tier}
        </span>
      )}
    </button>
  );
}
