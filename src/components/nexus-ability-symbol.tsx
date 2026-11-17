import { useId } from "react";
import elementalAtlas from "@/assets/nexus-ability-symbols.webp";
import skillAtlas from "@/assets/nexus-skill-symbols.webp";
import vampire from "@/assets/nexus-vampire.webp";
import dominion from "@/assets/nexus-aether-dominion.webp";
import omni from "@/assets/nexus-omni-ergon.webp";
import combatCrests from "@/assets/nexus-combat-crests.webp";
import techniqueCrests from "@/assets/nexus-technique-crests.webp";
import powerCrests from "@/assets/nexus-power-crests.png";
import { nexusDistinctTile } from "@/lib/nexus-distinct-art";
import { NEXUS_ABILITY_ART, nexusAbilityArt } from "@/lib/nexus-ability-art";
import { NexusSign } from "@/components/nexus-sign";
import { useNexusSymbolSettings } from "@/hooks/use-nexus-symbol-settings";
import { resolveSymbolStyle, tintMatrix } from "@/lib/nexus-symbol-settings";
import { abilityDef } from "@/lib/abilities";
import { useAbilityRegistryVersion } from "@/hooks/use-ability-registry";
import { ABILITY_RANKS, abilityRankMeta, parseAbilityRank } from "@/lib/ability-rank";
import { RoleEmblemGlyph } from "@/components/role-emblem";
import { roleEmblemDef } from "@/lib/role-emblems";

/** Nexus-only illustrated artwork; renders bespoke crests and elemental/skill atlas emblems with optional Rank 1-5 constellation ring. */
export function NexusAbilitySymbol({
  name,
  label,
  iconName = "",
  description,
  rank,
  className = "h-8 w-8",
  masked = false,
  previewColor,
  previewAnime,
}: {
  name: string;
  label?: string | undefined;
  iconName?: string | undefined;
  description?: string | undefined;
  rank?: number | undefined;
  className?: string | undefined;
  masked?: boolean | undefined;
  previewColor?: string | undefined;
  previewAnime?: boolean | undefined;
}) {
  const id = useId();
  useAbilityRegistryVersion();
  const settings = useNexusSymbolSettings();
  const appearance = resolveSymbolStyle(settings, name);
  const resolvedRank = parseAbilityRank(rank);
  const rankMeta = resolvedRank ? abilityRankMeta(resolvedRank) : null;
  if (masked) return <span aria-hidden className={`nexus-mark ${className}`} />;
  const roleDef = roleEmblemDef(name);
  if (roleDef) {
    return (
      <NexusSign
        symbolName={name}
        anime={previewAnime ?? appearance.anime}
        className={`nexus-ability-symbol inline-grid place-items-center rounded-full border ${className}`}
      >
        <span
          className="grid h-full w-full place-items-center rounded-full border"
          style={{
            borderColor: roleDef.borderTint,
            backgroundColor: roleDef.bgTint,
            color: roleDef.color,
            boxShadow: `0 0 12px ${roleDef.bgTint}`,
          }}
        >
          <RoleEmblemGlyph role={roleDef.label} className="h-[64%] w-[64%]" />
        </span>
      </NexusSign>
    );
  }
  const def = abilityDef(name);
  const effectiveDescription = description ?? def.description ?? "";
  const art = nexusAbilityArt(name, iconName, effectiveDescription);
  const distinct = nexusDistinctTile(art);
  const color =
    previewColor ??
    appearance.color ??
    (art === "lightning" || /(?:red|blue|white|purple)[_ -](?:flame|fire)/i.test(name)
      ? def.color
      : undefined);
  const index = NEXUS_ABILITY_ART.indexOf(art);
  const tile = distinct?.tile ?? index % 16;
  const x = (tile % 4) * 384,
    y = Math.floor(tile / 4) * 384;
  const special =
    art === "vampire"
      ? vampire
      : art === "aether-dominion"
        ? dominion
        : art === "omni-ergon"
          ? omni
          : null;
  const atlas = distinct
    ? [powerCrests, combatCrests, techniqueCrests][distinct.sheet]
    : index < 16
      ? elementalAtlas
      : skillAtlas;
  const emblemStage = resolvedRank ?? 0;
  const stageGlow =
    rankMeta && rankMeta.glowRadiusPx > 0
      ? `drop-shadow(0 0 ${Math.round(rankMeta.glowRadiusPx * 0.45)}px ${rankMeta.ringColor})`
      : undefined;

  return (
    <NexusSign
      symbolName={name}
      anime={previewAnime ?? appearance.anime}
      className={`nexus-ability-symbol ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        data-ability-art={art}
        data-ability-rank={resolvedRank}
        data-emblem-rank-stage={emblemStage || undefined}
        style={stageGlow ? { filter: stageGlow } : undefined}
        aria-label={
          rankMeta ? `${label ?? def.label} (${rankMeta.label})` : label ? label : undefined
        }
        className="h-full w-full"
        aria-hidden={!rankMeta && !label}
      >
        <defs>
          <clipPath id={id}>
            <circle cx="50" cy="50" r="43" />
          </clipPath>
          <clipPath id={`${id}-tile`}>
            <rect x="6" y="6" width="88" height="88" />
          </clipPath>
          <filter id={`${id}-tint`} colorInterpolationFilters="sRGB">
            <feColorMatrix
              type="matrix"
              values={color ? tintMatrix(color) : "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"}
            />
          </filter>
        </defs>
        <g filter={color ? `url(#${id}-tint)` : undefined}>
          <g clipPath={`url(#${id}-tile)`} className="nexus-emblem-art">
            {special ? (
              <image href={special} x="6" y="6" width="88" height="88" />
            ) : (
              <image
                href={atlas}
                x={6 - (x * 88) / 384}
                y={6 - (y * 88) / 384}
                width="352"
                height="352"
              />
            )}
          </g>
        </g>
        <g clipPath={`url(#${id})`} className="nexus-emblem-cel">
          <path
            className="nexus-emblem-current"
            d="M25 68 Q40 50 48 23 Q53 47 68 40 Q60 61 75 75 Q54 64 48 83 Q35 63 25 68Z"
          />
          <circle className="nexus-emblem-particle" cx="37" cy="57" r="1.6" />
          <circle className="nexus-emblem-particle" cx="63" cy="69" r="1.2" />
        </g>
        <path
          className="nexus-emblem-glint"
          opacity={emblemStage === 1 ? 0.35 : emblemStage >= 4 ? 1 : 0.7}
          d="M50 8 L52 15 L59 17 L52 19 L50 26 L48 19 L41 17 L48 15Z"
        />
        {resolvedRank && rankMeta && (
          <g data-emblem-rank-stage={resolvedRank} aria-hidden="true">
            {/* Rank 2+: Inner dashed harmonic ring */}
            {resolvedRank >= 2 && (
              <circle
                cx="50"
                cy="50"
                r="41.5"
                fill="none"
                stroke={rankMeta.ringColor}
                strokeOpacity={0.35 + resolvedRank * 0.1}
                strokeWidth={resolvedRank >= 4 ? "1.3" : "0.9"}
                strokeDasharray={resolvedRank >= 3 ? "5 3" : "3 4"}
              />
            )}
            {/* Rank 3+: 4 cardinal geometric diamond ticks */}
            {resolvedRank >= 3 &&
              [0, 90, 180, 270].map((deg) => (
                <polygon
                  key={deg}
                  points="50,1 52.8,5 50,9 47.2,5"
                  fill={rankMeta.ringColor}
                  stroke="#ffffff"
                  strokeWidth="0.4"
                  transform={`rotate(${deg} 50 50)`}
                />
              ))}
            {/* Rank 4+: Master octagonal inner bezel + 8 radial flare rays */}
            {resolvedRank >= 4 && (
              <>
                <circle
                  cx="50"
                  cy="50"
                  r="43.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.35"
                  strokeWidth="0.8"
                />
                {[45, 135, 225, 315].map((deg) => (
                  <line
                    key={deg}
                    x1="50"
                    y1="3"
                    x2="50"
                    y2="10"
                    stroke={rankMeta.ringColor}
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
              </>
            )}
            {/* Rank 5 (Apex): Sovereign crown crest + diagonal star nodes */}
            {resolvedRank >= 5 && (
              <>
                <path
                  d="M40 9 L44 2 L50 6.5 L56 2 L60 9 Z"
                  fill={rankMeta.ringColor}
                  stroke="#ffffff"
                  strokeWidth="0.7"
                  strokeLinejoin="round"
                />
                {[45, 135, 225, 315].map((deg) => (
                  <polygon
                    key={`apex-${deg}`}
                    points="50,2 52.2,5 50,8 47.8,5"
                    fill="#ffffff"
                    transform={`rotate(${deg} 50 50)`}
                  />
                ))}
              </>
            )}
          </g>
        )}
        {resolvedRank && rankMeta && (
          <g data-nexus-rank-arc={resolvedRank}>
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={rankMeta.ringColor}
              strokeOpacity={0.35 + resolvedRank * 0.12}
              strokeWidth={resolvedRank >= 4 ? "2.4" : resolvedRank >= 2 ? "1.8" : "1.2"}
            />
            {ABILITY_RANKS.map((n, idx) => {
              const deg = 54 + idx * 18;
              const rad = (deg * Math.PI) / 180;
              const cx = 50 + Math.cos(rad) * 46;
              const cy = 50 + Math.sin(rad) * 46;
              const filled = n <= resolvedRank;
              return (
                <circle
                  key={n}
                  cx={cx}
                  cy={cy}
                  r={filled ? "3.4" : "2.1"}
                  fill={filled ? rankMeta.ringColor : "#0f172a"}
                  fillOpacity={filled ? 1 : 0.7}
                  stroke={filled ? "#ffffff" : rankMeta.ringColor}
                  strokeOpacity={filled ? 0.85 : 0.45}
                  strokeWidth="0.9"
                />
              );
            })}
          </g>
        )}
      </svg>
    </NexusSign>
  );
}
