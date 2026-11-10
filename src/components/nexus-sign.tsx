import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNexusMotion } from "@/hooks/use-nexus-motion";
import { useNexusSymbolSettings } from "@/hooks/use-nexus-symbol-settings";
import { resolveSymbolStyle } from "@/lib/nexus-symbol-settings";

/** Animates the supplied artwork, never substitutes a different symbol. */
export function NexusSign({ children, className = "", symbolName = "", anime }: { children: ReactNode; className?: string; symbolName?: string; anime?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const moving = useNexusMotion();
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
  return <span ref={ref} aria-hidden="true" data-nexus-sign data-symbol-anime={(anime ?? appearance.anime) ? "on" : "off"} data-sign-motion={moving && visible ? "on" : "off"} className={`nexus-sign ${className}`}>{children}</span>;
}