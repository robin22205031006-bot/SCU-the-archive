import { useId } from "react";
import elementalAtlas from "@/assets/nexus-ability-symbols.png";
import skillAtlas from "@/assets/nexus-skill-symbols.png";
import { NEXUS_ABILITY_ART, nexusAbilityArt } from "@/lib/nexus-ability-art";
import { NexusSign } from "@/components/nexus-sign";

/** Nexus-only illustrated artwork; Descrete keeps the original registry icons. */
export function NexusAbilitySymbol({ name, iconName = "", className = "h-8 w-8", masked = false }: { name: string; iconName?: string; className?: string; masked?: boolean }) {
  const id = useId();
  if (masked) return <span aria-hidden className={`nexus-mark ${className}`} />;
  const art = nexusAbilityArt(name, iconName);
  const index = NEXUS_ABILITY_ART.indexOf(art);
  const tile = index % 16;
  const x = tile % 4 * 384, y = Math.floor(tile / 4) * 384;
  return <NexusSign className={`nexus-ability-symbol ${className}`}>
    <svg viewBox="0 0 100 100" data-ability-art={art} className="h-full w-full" aria-hidden>
      <defs><clipPath id={id}><circle cx="50" cy="50" r="43" /></clipPath></defs>
      <svg x="0" y="0" width="100" height="100" viewBox={`${x} ${y} 384 384`} className="nexus-emblem-art">
        <image href={index < 16 ? elementalAtlas : skillAtlas} width="1536" height="1536" />
      </svg>
      <g clipPath={`url(#${id})`} className="nexus-emblem-cel">
        <path className="nexus-emblem-current" d="M25 68 Q40 50 48 23 Q53 47 68 40 Q60 61 75 75 Q54 64 48 83 Q35 63 25 68Z" />
        <circle className="nexus-emblem-particle" cx="37" cy="57" r="1.6" />
        <circle className="nexus-emblem-particle" cx="63" cy="69" r="1.2" />
      </g>
      <path className="nexus-emblem-glint" d="M50 8 L52 15 L59 17 L52 19 L50 26 L48 19 L41 17 L48 15Z" />
    </svg>
  </NexusSign>;
}