import type { Glyph } from "@/lib/arsenal-art";
import { useIsManga } from "@/hooks/use-ui-mode";
import { MangaWoodblockCrest } from "@/components/manga-emblem";

/** Stroke paths on a 48x48 grid, one per item type. */
const G: Record<Glyph, string> = {
  sword: "M24 6 L27 30 L21 30 Z M16 30 H32 M24 30 V40 M21 42 H27",
  katana: "M34 6 Q30 22 18 34 M14 32 L20 38 M18 34 L12 40",
  greatsword: "M24 4 L30 10 L28 30 H20 L18 10 Z M14 30 H34 M24 30 V42",
  dagger: "M16 8 Q20 20 18 30 M32 8 Q28 20 30 30 M14 30 H22 M26 30 H34 M18 30 V40 M30 30 V40",
  gun: "M8 18 H36 V24 H22 L20 34 H14 L16 24 H8 Z M36 20 H42",
  shotgun: "M6 16 H40 M6 21 H40 M40 14 V23 M20 21 L16 36 H24 L26 26",
  book: "M10 10 H34 Q38 10 38 14 V40 H14 Q10 40 10 36 Z M14 36 H38 M24 18 L27 24 L24 30 L21 24 Z",
  cube: "M24 6 L40 15 V33 L24 42 L8 33 V15 Z M8 15 L24 24 L40 15 M24 24 V42",
  gem: "M24 4 L34 16 L24 44 L14 16 Z M14 16 H34 M20 16 L24 44 L28 16",
  mask: "M10 10 Q24 4 38 10 Q38 30 24 44 Q10 30 10 10 Z M15 20 Q19 17 22 21 M26 21 Q29 17 33 20",
  chain: "M12 36 A5 5 0 1 1 18 30 M18 30 L22 26 M22 26 A5 5 0 1 1 28 20 M28 20 L32 16 Q38 8 40 14",
  helm: "M12 22 Q12 8 24 6 Q36 8 36 22 V34 L24 42 L12 34 Z M15 22 L22 25 M26 25 L33 22",
  drone: "M24 18 A6 6 0 1 1 24 30 A6 6 0 1 1 24 18 M18 24 H6 L4 36 M30 24 H42 L44 36",
  wolf: "M8 30 L14 16 L20 22 H30 L36 14 L40 26 L34 34 H16 Z M30 26 H32",
  orb: "M24 8 A16 16 0 1 1 24 40 A16 16 0 1 1 24 8 M24 24 L24 9 M24 24 L11 32 M24 24 L37 32",
  vial: "M16 6 H32 M18 6 V12 H30 V6 M18 12 V38 Q18 42 24 42 Q30 42 30 38 V12 M18 26 Q24 22 30 26",
  bow: "M14 6 Q34 24 14 42 M14 6 V42 M10 24 H40 M36 20 L40 24 L36 28",
  egg: "M24 6 Q38 16 36 30 Q34 42 24 42 Q14 42 12 30 Q10 16 24 6 Z M18 24 L22 28 L26 22 L30 26",
  chip: "M14 14 H34 V34 H14 Z M19 19 H29 V29 H19 Z M18 14 V8 M24 14 V8 M30 14 V8 M18 34 V40 M24 34 V40 M30 34 V40",
  fist: "M14 22 V14 H34 V30 Q34 40 24 40 Q14 40 14 30 Z M20 14 V22 M26 14 V22 M14 22 H30",
  star: "M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z",
  kunai: "M24 4 L29 20 L24 24 L19 20 Z M24 24 V38 M24 42 A3 3 0 1 1 24 36",
  tie: "M20 6 H28 L26 12 L30 36 L24 42 L18 36 L22 12 Z",
};

/** Hex emblem for an Arsenal card. Nexus adds a rotating rune ring and glow. */
export function ArsenalEmblem({
  glyph,
  hue,
  nexus = false,
  animate = false,
  className = "size-10",
}: {
  glyph: Glyph;
  hue: number;
  nexus?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const isManga = useIsManga();
  if (isManga) {
    return (
      <MangaWoodblockCrest
        code={glyph}
        pathD={G[glyph]}
        crimson={hue < 30 || hue > 320}
        className={className}
      />
    );
  }
  const c = `hsl(${hue} 85% 65%)`,
    dim = `hsl(${hue} 60% 20% / .85)`;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden
      style={{ filter: nexus ? `drop-shadow(0 0 6px hsl(${hue} 90% 60% / .7))` : undefined }}
    >
      <polygon
        points="32,3 57,17.5 57,46.5 32,61 7,46.5 7,17.5"
        fill={dim}
        stroke={c}
        strokeWidth="1.5"
      />
      {nexus && (
        <g
          className={animate ? "arsenal-emblem-spin" : undefined}
          style={{ transformOrigin: "32px 32px" }}
        >
          <circle
            cx="32"
            cy="32"
            r="25"
            fill="none"
            stroke={c}
            strokeOpacity=".5"
            strokeWidth="1"
            strokeDasharray="2 5"
          />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle
              key={a}
              cx={32 + 25 * Math.cos((a * Math.PI) / 180)}
              cy={32 + 25 * Math.sin((a * Math.PI) / 180)}
              r="1.4"
              fill={c}
            />
          ))}
        </g>
      )}
      <g
        transform="translate(8 8)"
        fill="none"
        stroke={c}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={nexus && animate ? "arsenal-emblem-glow" : undefined}
      >
        <path d={G[glyph]} />
      </g>
    </svg>
  );
}
