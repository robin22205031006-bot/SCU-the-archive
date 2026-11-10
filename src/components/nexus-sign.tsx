import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { useNexusSymbolSettings } from "@/hooks/use-nexus-symbol-settings";
import { resolveSymbolStyle } from "@/lib/nexus-symbol-settings";
import { useStaticNexusEmblems, staticEmblemPresentation } from "@/hooks/use-nexus-emblem-motion";

/** Animates the supplied artwork, never substitutes a different symbol. */
export function NexusSign({ children, className = "", symbolName = "", anime }: { children: ReactNode; className?: string; symbolName?: string; anime?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const moving = useNexusMotion();
  const staticPreference = useStaticNexusEmblems();
  const staticArtwork = staticEmblemPresentation(staticPreference, moving);
  const settings = useNexusSymbolSettings();
  const appearance = resolveSymbolStyle(settings, symbolName);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} aria-hidden="true" style={appearance.color ? { "--symbol-color": appearance.color } as CSSProperties : undefined} data-nexus-sign data-sign-static={staticArtwork ? "on" : "off"} data-symbol-anime={(anime ?? appearance.anime) ? "on" : "off"} data-sign-motion={!staticArtwork && visible ? "on" : "off"} className={`nexus-sign ${className}`}>{children}</span>;
}