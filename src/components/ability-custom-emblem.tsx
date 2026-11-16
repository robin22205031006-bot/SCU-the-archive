import type { AbilityCustomEmblemKind } from "@/lib/ability-emblem-resolver";
import { parseAbilityRank } from "@/lib/ability-rank";

/**
 * Crisp geometric vector crests for abilities and features resolved by name/description.
 * Visually upgrades progressively across Ranks 1–5 (clean crest -> outer ring -> cardinal filigree -> apex crown).
 * Styled with `currentColor` so it inherits exact tier/element palette across Classic, Minimal, Manga & Nexus.
 */
export function AbilityCustomEmblem({
  kind,
  rank,
  className = "h-5 w-5",
}: {
  kind: AbilityCustomEmblemKind;
  rank?: number | undefined;
  className?: string;
}) {
  const rk = parseAbilityRank(rank);
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-custom-emblem={kind}
      data-emblem-rank={rk}
      className={className}
    >
      {rk && rk >= 2 && (
        <g data-emblem-rank-stage={rk}>
          <circle
            cx="16"
            cy="16"
            r="14.75"
            strokeWidth={rk >= 4 ? "1.1" : "0.85"}
            strokeOpacity={rk >= 4 ? "0.8" : "0.5"}
            strokeDasharray={rk >= 3 ? undefined : "2.4 2"}
          />
          {rk >= 3 && (
            <path
              d="M16 0.8v2.2M16 29v2.2M0.8 16h2.2M29 16h2.2"
              strokeWidth="1.3"
              strokeOpacity="0.85"
            />
          )}
          {rk >= 4 && (
            <>
              <circle cx="16" cy="16" r="12.6" strokeWidth="0.65" strokeOpacity="0.45" />
              <polygon points="16,0.6 17.5,2.4 16,4.2 14.5,2.4" fill="currentColor" stroke="none" />
              <polygon
                points="16,27.8 17.5,29.6 16,31.4 14.5,29.6"
                fill="currentColor"
                stroke="none"
              />
            </>
          )}
          {rk === 5 && (
            <>
              <polygon points="0.6,16 2.4,14.5 4.2,16 2.4,17.5" fill="currentColor" stroke="none" />
              <polygon
                points="27.8,16 29.6,14.5 31.4,16 29.6,17.5"
                fill="currentColor"
                stroke="none"
              />
              <circle cx="5.2" cy="5.2" r="1" fill="currentColor" stroke="none" />
              <circle cx="26.8" cy="5.2" r="1" fill="currentColor" stroke="none" />
              <circle cx="5.2" cy="26.8" r="1" fill="currentColor" stroke="none" />
              <circle cx="26.8" cy="26.8" r="1" fill="currentColor" stroke="none" />
            </>
          )}
        </g>
      )}
      {kind === "ofuda" && (
        <>
          <rect
            x="9"
            y="4"
            width="14"
            height="24"
            rx="1.5"
            fill="currentColor"
            fillOpacity="0.12"
          />
          <path d="M12 9h8M16 9v14M12.5 14.5l7-2M12.5 19.5l7-2" />
          <circle cx="16" cy="24" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "dna-splice" && (
        <>
          <path d="M9 5c0 6 14 6 14 11s-14 5-14 11" />
          <path d="M23 5c0 6-14 6-14 11s14 5 14 11" opacity="0.72" />
          <path d="M11 8h10M11 24h10M13 16h6" />
          <circle cx="16" cy="16" r="2.2" fill="currentColor" fillOpacity="0.35" />
        </>
      )}
      {kind === "omen-eye" && (
        <>
          <path d="M3 16s5-8 13-8 13 8 13 8-5 8-13 8-13-8-13-8Z" />
          <circle cx="16" cy="16" r="4.5" fill="currentColor" fillOpacity="0.18" />
          <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
          <path d="M16 3v3M16 26v3" opacity="0.65" />
        </>
      )}
      {kind === "blood-pact" && (
        <>
          <path
            d="M16 4c4 6 8 10 8 15a8 8 0 1 1-16 0c0-5 4-9 8-15Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <circle cx="16" cy="18.5" r="4.5" strokeDasharray="2 2" />
          <path d="M16 14v9M11.5 18.5h9" />
        </>
      )}
      {kind === "umbra" && (
        <>
          <path
            d="M21.5 6.5A10.5 10.5 0 1 0 26 21a8.5 8.5 0 0 1-4.5-14.5Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <path d="M7 26l6-6M19 8l5-3M22 25l4 2" opacity="0.7" />
        </>
      )}
      {kind === "error-glitch" && (
        <>
          <polygon
            points="16,4 28,11 28,21 16,28 4,21 4,11"
            fill="currentColor"
            fillOpacity="0.12"
          />
          <path d="M11 12l4 4-4 4M16 20h6M13 8h6" />
          <path d="M3 15h4M25 17h4" opacity="0.75" />
        </>
      )}
      {kind === "velocity-helix" && (
        <>
          <path d="M5 12h13a4 4 0 1 0-4-4" />
          <path d="M4 17h20a3.5 3.5 0 1 1-3.5 3.5" />
          <path d="M8 22h10" opacity="0.7" />
          <polygon points="24,10 29,13 24,16" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "mimic-shift" && (
        <>
          <polygon points="16,4 27,16 16,28 5,16" opacity="0.5" />
          <circle cx="16" cy="16" r="6" fill="currentColor" fillOpacity="0.18" />
          <path d="M10 10l3 3M22 22l-3-3M22 10l-3 3M10 22l3-3" />
        </>
      )}
      {kind === "twin-blades" && (
        <>
          <path d="M6 25 23 6l3 3L10 27Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M26 25 9 6 6 9l16 18Z" fill="currentColor" fillOpacity="0.12" />
          <path d="M8 21l4 4M24 21l-4 4" />
        </>
      )}
      {kind === "energy-orb" && (
        <>
          <circle cx="16" cy="16" r="5" fill="currentColor" fillOpacity="0.28" />
          <ellipse cx="16" cy="16" rx="12" ry="5" transform="rotate(-32 16 16)" />
          <ellipse cx="16" cy="16" rx="12" ry="5" transform="rotate(32 16 16)" opacity="0.75" />
        </>
      )}
      {kind === "wind-gale" && (
        <>
          <path d="M4 12h16a3.5 3.5 0 1 0-3.5-3.5" />
          <path d="M5 17h20a3 3 0 1 1-3 3" />
          <path d="M8 22h9" opacity="0.7" />
        </>
      )}
      {kind === "time-hourglass" && (
        <>
          <path d="M9 5h14M9 27h14M10 5c0 6 6 7 6 11s-6 5-6 11M22 5c0 6-6 7-6 11s6 5 6 11" />
          <path d="M13 24h6l-3-4-3 4Z" fill="currentColor" fillOpacity="0.3" stroke="none" />
        </>
      )}
      {kind === "portal-rift" && (
        <>
          <ellipse cx="16" cy="16" rx="7" ry="12" fill="currentColor" fillOpacity="0.14" />
          <ellipse cx="16" cy="16" rx="3.5" ry="7" strokeDasharray="3 2" />
          <path d="M4 16h4M24 16h4" opacity="0.7" />
        </>
      )}
      {kind === "judgement-scales" && (
        <>
          <path d="M16 5v22M10 27h12M7 10h18" />
          <path d="M7 10l-3 7h6Z" fill="currentColor" fillOpacity="0.18" />
          <path d="M25 10l-3 7h6Z" fill="currentColor" fillOpacity="0.18" />
        </>
      )}
      {kind === "authority-crown" && (
        <>
          <path d="M5 23 7 10l6 6 3-9 3 9 6-6 2 13Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M6 26h20" />
        </>
      )}
      {kind === "sound-wave" && (
        <>
          <circle cx="16" cy="16" r="3" fill="currentColor" />
          <path d="M10 11a8 8 0 0 0 0 10M22 11a8 8 0 0 1 0 10" />
          <path d="M6.5 7.5a13 13 0 0 0 0 17M25.5 7.5a13 13 0 0 1 0 17" opacity="0.6" />
        </>
      )}
      {kind === "shield-ward" && (
        <>
          <path
            d="M16 4 27 8.5v7c0 6.5-4.5 11-11 13.5C9.5 26.5 5 22 5 15.5v-7Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M16 9v14M10.5 14.5h11" opacity="0.75" />
        </>
      )}
      {kind === "cosmic-prism" && (
        <>
          <polygon points="16,4 28,25 4,25" fill="currentColor" fillOpacity="0.16" />
          <polygon points="16,10 22,22 10,22" opacity="0.7" />
          <circle cx="16" cy="17.5" r="2" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "alchemy-flask" && (
        <>
          <path d="M13 5h6M14 5v5l-6.5 12a3 3 0 0 0 2.6 4.5h11.8a3 3 0 0 0 2.6-4.5L18 10V5" />
          <path d="M9.5 20h13" opacity="0.7" />
        </>
      )}
      {kind === "ember-sigil" && (
        <>
          <path
            d="M16 4c2 5 7 7 7 13a7 7 0 1 1-14 0c0-3.5 2-6 3.5-8 .5 2.5 2 3.5 3.5 2-.5-2.5 0-5 0-7Z"
            fill="currentColor"
            fillOpacity="0.2"
          />
          <circle cx="16" cy="19" r="2" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "volt-coil" && (
        <polygon
          points="17,3 7,17 15,17 13,29 25,14 17,14"
          fill="currentColor"
          fillOpacity="0.22"
        />
      )}
      {kind === "frost-crystal" && (
        <>
          <path d="M16 4v24M5.6 10l20.8 12M26.4 10 5.6 22" />
          <circle cx="16" cy="16" r="3" fill="currentColor" fillOpacity="0.25" />
        </>
      )}
      {kind === "cube-monolith" && (
        <>
          <polygon
            points="16,4 27,10 27,22 16,28 5,22 5,10"
            fill="currentColor"
            fillOpacity="0.15"
          />
          <path d="M16 16V28M16 16L5 10M16 16L27 10" />
          <rect x="13" y="13" width="6" height="6" opacity="0.65" />
        </>
      )}
      {kind === "demonic-sigil" && (
        <>
          <path d="M8 6c-2 5 1 9 4 11M24 6c2 5-1 9-4 11" />
          <polygon points="16,27 7,11 25,11" fill="currentColor" fillOpacity="0.18" />
          <path d="M16 9v18M11 19h10" />
        </>
      )}
      {kind === "arcane-sigil" && (
        <>
          <circle cx="16" cy="16" r="11" strokeDasharray="3 2" />
          <polygon points="16,6 25,22 7,22" fill="currentColor" fillOpacity="0.14" />
          <polygon points="16,26 7,10 25,10" opacity="0.6" />
        </>
      )}
      {kind === "card-arcana" && (
        <>
          <rect
            x="8"
            y="4"
            width="14"
            height="22"
            rx="1.5"
            fill="currentColor"
            fillOpacity="0.14"
          />
          <path d="M22 8h3v19H11" opacity="0.65" />
          <polygon points="15,11 18,15 15,19 12,15" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "dragon-crest" && (
        <>
          <path
            d="M16 5c4 2 9 4 10 10-3-1-5 1-6 4 1 3-1 6-4 8-3-2-5-5-4-8-1-3-3-5-6-4 1-6 6-8 10-10Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path d="M13 14l3 4 3-4" />
        </>
      )}
      {kind === "serpent-fang" && (
        <>
          <path d="M7 25c0-6 5-7 9-9s8-3 8-9c0-2-2-3-5-3-4 0-7 2-7 5" />
          <path d="M19 9l4-4M21 12l5 1" opacity="0.7" />
          <circle cx="16" cy="7" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "beast-claw" && (
        <>
          <path d="M7 24C9 15 13 9 18 5M13 26c2-8 5-14 10-18M20 26c1.5-6 4-10 7-13" />
          <circle cx="16" cy="21" r="2.2" fill="currentColor" fillOpacity="0.3" />
        </>
      )}
      {kind === "domain-mandala" && (
        <>
          <circle cx="16" cy="16" r="11" />
          <rect
            x="9"
            y="9"
            width="14"
            height="14"
            transform="rotate(45 16 16)"
            fill="currentColor"
            fillOpacity="0.14"
          />
          <circle cx="16" cy="16" r="3" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "cyber-core" && (
        <>
          <rect x="7" y="7" width="18" height="18" rx="3" fill="currentColor" fillOpacity="0.14" />
          <rect x="12" y="12" width="8" height="8" rx="1" />
          <path d="M12 4v3M20 4v3M12 25v3M20 25v3M4 12h3M4 20h3M25 12h3M25 20h3" />
        </>
      )}
      {kind === "tactical-reticle" && (
        <>
          <circle cx="16" cy="16" r="9" />
          <circle cx="16" cy="16" r="3" fill="currentColor" fillOpacity="0.22" />
          <path d="M16 3v5M16 24v5M3 16h5M24 16h5" />
        </>
      )}
      {kind === "vital-lotus" && (
        <>
          <path d="M16 6c3 4 4 9 0 14-4-5-3-10 0-14Z" fill="currentColor" fillOpacity="0.2" />
          <path d="M16 20c-4-4-9-4-11 0 3 4 7 5 11 0Zm0 0c4-4 9-4 11 0-3 4-7 5-11 0Z" />
          <path d="M10 26h12" opacity="0.7" />
        </>
      )}
      {kind === "tidal-crest" && (
        <>
          <path d="M4 17c4-6 10-8 14-4 2 2 1 5-2 5-2 0-3-2-2-4" />
          <path d="M5 23c4-2 8 2 12 0s7-2 11 0" opacity="0.8" />
          <path d="M12 7c3 2 6 2 9 0" opacity="0.6" />
        </>
      )}
      {kind === "terra-bastion" && (
        <>
          <polygon points="5,25 13,9 19,17 23,12 27,25" fill="currentColor" fillOpacity="0.18" />
          <path d="M4 26h24" />
        </>
      )}
      {kind === "spatial-dagger" && (
        <>
          <ellipse cx="10" cy="22" rx="4" ry="7" transform="rotate(45 10 22)" opacity="0.55" />
          <path d="M10 22L26 6l-3 9-7 7Z" fill="currentColor" fillOpacity="0.24" />
          <path d="M14 14l4 4" />
        </>
      )}
      {kind === "chaos-vortex" && (
        <>
          <path d="M16 16c0-4 5-6 8-3 4 4 2 11-5 13-8 2-14-5-12-13 1.5-6 8-9 14-7" />
          <circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" />
        </>
      )}
      {kind === "yin-yang-order" && (
        <>
          <circle cx="16" cy="16" r="11" />
          <path d="M16 5a5.5 5.5 0 0 1 0 11 5.5 5.5 0 0 0 0 11" />
          <circle cx="16" cy="10.5" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="16" cy="21.5" r="1.5" />
        </>
      )}
    </svg>
  );
}
