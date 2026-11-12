import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Fingerprint } from "lucide-react";
import { abilityDef } from "@/lib/abilities";
import { highestStatRadius } from "@/lib/nexus-season";
import { Button } from "@/components/ui/button";
import { NexusAbilitySymbol } from "@/components/nexus-ability-symbol";

const CENTER = { x: 238, y: 210 };
const point = (angle: number, radius: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: CENTER.x + radius * Math.cos(a), y: CENTER.y + radius * Math.sin(a) };
};
function sector(start: number, end: number, inner: number, outer: number) {
  const a = point(start, inner),
    b = point(start, outer),
    c = point(end, outer),
    d = point(end, inner);
  return `M ${a.x} ${a.y} L ${b.x} ${b.y} A ${outer} ${outer} 0 0 1 ${c.x} ${c.y} L ${d.x} ${d.y} A ${inner} ${inner} 0 0 0 ${a.x} ${a.y} Z`;
}

/** The outside arc selects a profile; the fixed inner sectors show its complete stats. */
export function NexusStatWheel({
  stats,
  abilities,
  selected,
  onSelect,
}: {
  stats: Array<{ key: string; label: string; value: number }>;
  abilities: Array<{ name: string; def: ReturnType<typeof abilityDef> }>;
  selected: string | null;
  onSelect: (name: string | null) => void;
}) {
  const options = [
    { name: null, label: "Character", icon: Fingerprint },
    ...abilities.map((a) => ({ name: a.name, label: a.def.label, icon: a.def.icon })),
  ];
  const active = Math.max(
    0,
    options.findIndex((a) => a.name === selected),
  );
  const start = Math.max(0, Math.min(active - 2, options.length - 5));
  const visible = options.slice(start, start + 5);
  const step = 130 / visible.length;
  const activeSlot = active - start;
  const average = Math.round(
    stats.reduce((sum, s) => sum + s.value, 0) / Math.max(1, stats.length),
  );
  const Icon = options[active]?.icon ?? Fingerprint;
  const statStep = 360 / Math.max(1, stats.length);
  return (
    <div
      className="nexus-stat-wheel relative mx-auto aspect-[460/420] w-full max-w-[400px]"
      role="group"
      aria-label="Ability selection and stats"
    >
      <svg viewBox="0 0 460 420" className="h-full w-full" aria-label="Selected ability stats">
        <path
          d={sector(114, 246, 172, 200)}
          fill="var(--nexus-wheel-track)"
          stroke="var(--nexus-wheel-line)"
        />
        {visible.map((a, i) => (
          <path
            key={a.name ?? "character"}
            d={sector(115 + i * step + 1, 115 + (i + 1) * step - 1, 173, 199)}
            fill="var(--nexus-wheel-track)"
            stroke="var(--nexus-wheel-line)"
          />
        ))}
        <motion.path
          initial={false}
          animate={{
            d: sector(115 + activeSlot * step + 1, 115 + (activeSlot + 1) * step - 1, 173, 199),
          }}
          transition={{ type: "spring", stiffness: 65, damping: 20 }}
          fill="var(--nexus-wheel-blue)"
          fillOpacity="0.65"
          stroke="var(--nexus-wheel-blue)"
        />
        {[32, 54, 76, 98, 108, 157].map((r) => (
          <circle
            key={r}
            cx={CENTER.x}
            cy={CENTER.y}
            r={r}
            fill="none"
            stroke="var(--nexus-wheel-line)"
            strokeWidth="0.7"
          />
        ))}
        {stats.map((s, i) => {
          const angle = -90 + i * statStep;
          const label = point(angle, 132);
          const words = s.label.split(" ");
          return (
            <g key={s.key} aria-label={`${s.label}: ${s.value}`}>
              <path
                d={sector(angle - statStep / 2 + 0.7, angle + statStep / 2 - 0.7, 32, 98)}
                fill="var(--nexus-wheel-track)"
              />
              <motion.path
                initial={false}
                animate={{
                  d: sector(
                    angle - statStep / 2 + 0.7,
                    angle + statStep / 2 - 0.7,
                    32,
                    32 + s.value * 0.66,
                  ),
                }}
                transition={{ type: "spring", stiffness: 55, damping: 19 }}
                fill="var(--nexus-wheel-blue)"
                fillOpacity={0.45 + s.value / 220}
              />
              <text
                x={label.x}
                y={label.y - (words.length > 1 ? 10 : 3)}
                textAnchor="middle"
                fill="var(--nexus-wheel-label)"
                fontSize="11"
              >
                {words.map((word, j) => (
                  <tspan key={j} x={label.x} dy={j ? 12 : 0}>
                    {word}
                  </tspan>
                ))}
                <tspan x={label.x} dy="14" fill="var(--foreground)" fontSize="12">
                  {s.value}
                </tspan>
              </text>
            </g>
          );
        })}
        <motion.circle
          aria-label="Highest stat ring"
          data-radius={highestStatRadius(stats)}
          cx={CENTER.x}
          cy={CENTER.y}
          initial={false}
          animate={{ r: highestStatRadius(stats) }}
          transition={{ type: "spring", stiffness: 65, damping: 19 }}
          fill="none"
          stroke="var(--nexus-wheel-blue)"
          strokeDasharray="1 5"
          strokeWidth="1.5"
        />
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r="29"
          fill="var(--background)"
          stroke="var(--nexus-wheel-blue)"
        />
        <text
          x={CENTER.x}
          y={CENTER.y + 9}
          textAnchor="middle"
          fontSize="20"
          fill="var(--foreground)"
        >
          {average}
        </text>
        <text
          x={CENTER.x}
          y={CENTER.y + 21}
          textAnchor="middle"
          fontSize="6"
          fill="var(--muted-foreground)"
        >
          AVERAGE
        </text>
      </svg>
      <span
        className="pointer-events-none absolute text-nexus-wheel-label"
        style={{
          left: `${(CENTER.x / 460) * 100}%`,
          top: `${((CENTER.y - 17) / 420) * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {selected ? (
          <NexusAbilitySymbol name={selected} className="h-5 w-5" />
        ) : (
          <Icon aria-hidden className="h-3 w-3" />
        )}
      </span>
      {visible.map((a, i) => {
        const p = point(115 + (i + 0.5) * step, 186);
        const AbilityIcon = a.icon;
        return (
          <Button
            key={a.name ?? "character"}
            variant="ghost"
            size="icon"
            aria-label={`Show ${a.label} stats`}
            aria-pressed={selected === a.name}
            title={a.label}
            onClick={() => onSelect(a.name)}
            className="nexus-wheel-option absolute h-9 w-9 rounded-full"
            style={{
              left: `${(p.x / 460) * 100}%`,
              top: `${(p.y / 420) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {a.name ? (
              <NexusAbilitySymbol name={a.name} className="h-7 w-7" />
            ) : (
              <AbilityIcon className="h-4 w-4" />
            )}
          </Button>
        );
      })}
      {options.length > 5 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-[18%] top-[4%] h-7 w-7"
            aria-label="Previous ability"
            disabled={active === 0}
            onClick={() => onSelect(options[active - 1]?.name ?? null)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-[4%] left-[18%] h-7 w-7"
            aria-label="Next ability"
            disabled={active === options.length - 1}
            onClick={() => onSelect(options[active + 1]?.name ?? null)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
