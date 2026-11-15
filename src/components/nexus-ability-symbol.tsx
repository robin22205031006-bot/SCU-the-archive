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
          d="M50 8 L52 15 L59 17 L52 19 L50 26 L48 19 L41 17 L48 15Z"
        />
        {resolvedRank && rankMeta && (
          <g data-nexus-rank-arc={resolvedRank}>
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke={rankMeta.ringColor}
              strokeOpacity={0.35 + resolvedRank * 0.11}
              strokeWidth={resolvedRank >= 4 ? "2.4" : "1.6"}
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
