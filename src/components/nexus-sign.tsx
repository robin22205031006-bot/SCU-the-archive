import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNexusMotion } from "@/hooks/use-nexus-motion";

/** Animates the supplied artwork, never substitutes a different symbol. */
export function NexusSign({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const moving = useNexusMotion();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} aria-hidden="true" data-nexus-sign data-sign-motion={moving && visible ? "on" : "off"} className={`nexus-sign ${className}`}>{children}</span>;
}