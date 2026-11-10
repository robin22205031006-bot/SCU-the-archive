import { useId } from "react";
import elementalAtlas from "@/assets/nexus-ability-symbols.png";
import skillAtlas from "@/assets/nexus-skill-symbols.png";
import vampire from "@/assets/nexus-vampire.png";
import dominion from "@/assets/nexus-aether-dominion.png";
import omni from "@/assets/nexus-omni-ergon.png";
import { NEXUS_ABILITY_ART, nexusAbilityArt } from "@/lib/nexus-ability-art";
import { NexusSign } from "@/components/nexus-sign";
import { useNexusSymbolSettings } from "@/hooks/use-nexus-symbol-settings";
import { resolveSymbolStyle, tintMatrix } from "@/lib/nexus-symbol-settings";
import { abilityDef } from "@/lib/abilities";

/** Nexus-only illustrated artwork; Descrete keeps the original registry icons. */
export function NexusAbilitySymbol({ name, iconName = "", className = "h-8 w-8", masked = false, previewColor, previewAnime }: { name: string; iconName?: string; className?: string; masked?: boolean; previewColor?: string; previewAnime?: boolean }) {
  const id = useId();
  const settings = useNexusSymbolSettings();
  const appearance = resolveSymbolStyle(settings, name);
  if (masked) return <span aria-hidden className={`nexus-mark ${className}`} />;
  const art = nexusAbilityArt(name, iconName);
  const color = previewColor ?? appearance.color ?? (art === "lightning" || /(?:red|blue|white|purple)[_ -](?:flame|fire)/i.test(name) ? abilityDef(name).color : undefined);
  const index = NEXUS_ABILITY_ART.indexOf(art);
  const tile = index % 16;
  const x = tile % 4 * 384, y = Math.floor(tile / 4) * 384;
  const special = art === "vampire" ? vampire : art === "aether-dominion" ? dominion : art === "omni-ergon" ? omni : null;
  return <NexusSign symbolName={name} anime={previewAnime ?? appearance.anime} className={`nexus-ability-symbol ${className}`}>
    <svg viewBox="0 0 100 100" data-ability-art={art} className="h-full w-full" aria-hidden>
      <defs><clipPath id={id}><circle cx="50" cy="50" r="43" /></clipPath><clipPath id={`${id}-tile`}><rect x="6" y="6" width="88" height="88" /></clipPath><filter id={`${id}-tint`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={color ? tintMatrix(color) : "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"} /></filter></defs>
      <g filter={color ? `url(#${id}-tint)` : undefined}>
        <g clipPath={`url(#${id}-tile)`} className="nexus-emblem-art">{special ? <image href={special} x="6" y="6" width="88" height="88" /> : <image href={index < 16 ? elementalAtlas : skillAtlas} x={6 - x * 88 / 384} y={6 - y * 88 / 384} width="352" height="352" />}</g>
      </g>
      <g clipPath={`url(#${id})`} className="nexus-emblem-cel">
        <path className="nexus-emblem-current" d="M25 68 Q40 50 48 23 Q53 47 68 40 Q60 61 75 75 Q54 64 48 83 Q35 63 25 68Z" />
        <circle className="nexus-emblem-particle" cx="37" cy="57" r="1.6" />
        <circle className="nexus-emblem-particle" cx="63" cy="69" r="1.2" />
      </g>
      <path className="nexus-emblem-glint" d="M50 8 L52 15 L59 17 L52 19 L50 26 L48 19 L41 17 L48 15Z" />
    </svg>
  </NexusSign>;
}