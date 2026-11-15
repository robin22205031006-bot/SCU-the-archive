import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { useOptionalAppearance } from "@/hooks/use-appearance";
import { useUIFeedback } from "@/hooks/use-ui-feedback";
import { DEFAULT_THEME, THEMES, themeVars } from "@/lib/themes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { triggerTierSwitchHitstop } from "@/lib/tier-hitstop";

const FEATURED_TEXTURE_IDS = ["brushed", "grunge", "ink", "weave", "fabric"] as const;

const FEATURED_LABELS: Record<(typeof FEATURED_TEXTURE_IDS)[number], string> = {
  brushed: "Brushed",
  grunge: "Grunge",
  ink: "Ink",
  weave: "Weave",
  fabric: "Fabric",
};

function shortThemeLabel(id: string): string {
  if (id in FEATURED_LABELS) {
    return FEATURED_LABELS[id as (typeof FEATURED_TEXTURE_IDS)[number]];
  }
  const found = THEMES.find((t) => t.id === id);
  if (!found) return "Surface";
  const parts = found.label.split("·");
  return (parts[1] ?? parts[0] ?? found.id).trim();
}

function applyThemeFallback(nextId: string) {
  if (typeof document === "undefined") return;
  const preset = THEMES.find((x) => x.id === nextId) ?? THEMES[0];
  if (!preset) return;
  const root = document.documentElement;
  const dark = !root.classList.contains("light");
  for (const [k, v] of Object.entries(themeVars(preset, dark))) {
    root.style.setProperty(k, v);
  }
  root.setAttribute("data-theme", preset.id);
  try {
    localStorage.setItem("scu-theme-id", preset.id);
  } catch {
    /* optional */
  }
  window.dispatchEvent(new Event("scu:theme-applied"));
}

export function HeaderThemeSelect({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "nexus" | "manga";
}) {
  const appearance = useOptionalAppearance();
  const { triggerFeedback } = useUIFeedback();
  const [fallbackTheme, setFallbackTheme] = useState<string>(() => {
    if (typeof document !== "undefined") {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr && THEMES.some((t) => t.id === attr)) return attr;
    }
    try {
      const saved = localStorage.getItem("scu-theme-id");
      if (saved && THEMES.some((t) => t.id === saved)) return saved;
    } catch {
      /* ignore */
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    if (appearance) return;
    const sync = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr && THEMES.some((t) => t.id === attr)) setFallbackTheme(attr);
    };
    window.addEventListener("scu:theme-applied", sync);
    return () => window.removeEventListener("scu:theme-applied", sync);
  }, [appearance]);

  const activeTheme = appearance?.theme ?? fallbackTheme;
  const featured = FEATURED_TEXTURE_IDS.map((id) => THEMES.find((t) => t.id === id)).filter(
    (t): t is NonNullable<typeof t> => !!t,
  );
  const others = THEMES.filter(
    (t) => !FEATURED_TEXTURE_IDS.includes(t.id as (typeof FEATURED_TEXTURE_IDS)[number]),
  );

  const handleSelect = (nextId: string) => {
    triggerFeedback("switch");
    const rootMode =
      typeof document !== "undefined"
        ? (document.documentElement.dataset["primarySystem"] ?? "classic")
        : "classic";
    const subTheme =
      typeof document !== "undefined" ? document.documentElement.dataset["mangaSubtheme"] : null;
    triggerTierSwitchHitstop(rootMode, subTheme);
    if (appearance) {
      appearance.setTheme(nextId);
    } else {
      setFallbackTheme(nextId);
      applyThemeFallback(nextId);
    }
  };

  const triggerClass =
    variant === "nexus"
      ? "scu-tactile h-7 w-auto min-w-[92px] gap-1.5 rounded-full border-cyan-400/35 bg-slate-900/75 px-2.5 text-[11px] font-medium text-cyan-200 hover:border-cyan-300/60"
      : variant === "manga"
        ? "scu-tactile h-7 w-auto min-w-[88px] gap-1.5 rounded-none border border-border bg-background px-2 font-mono text-[10px] font-bold uppercase tracking-wider text-foreground hover:border-primary"
        : "scu-tactile h-7 w-auto min-w-[92px] gap-1.5 rounded-full border-border/70 bg-secondary/70 px-2.5 text-[11px] font-medium text-foreground";

  return (
    <Select value={activeTheme} onValueChange={handleSelect}>
      <SelectTrigger
        aria-label="Visual theme"
        data-testid="header-theme-select"
        className={`${triggerClass} ${className}`}
      >
        <Layers className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
        <SelectValue placeholder="Theme">{shortThemeLabel(activeTheme)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-h-72">
        <SelectGroup>
          <SelectLabel>Aesthetic Textures</SelectLabel>
          {featured.map((t) => (
            <SelectItem key={t.id} value={t.id} data-theme-option={t.id}>
              {FEATURED_LABELS[t.id as (typeof FEATURED_TEXTURE_IDS)[number]]} ·{" "}
              <span className="text-muted-foreground">{t.label.split("·")[1]?.trim()}</span>
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Archive Palettes</SelectLabel>
          {others.map((t) => (
            <SelectItem key={t.id} value={t.id} data-theme-option={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
