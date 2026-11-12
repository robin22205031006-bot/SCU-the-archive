import { useEffect, useRef, useState, type ReactNode } from "react";
import { List, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNexusMotion } from "@/hooks/use-nexus-motion";

/** Reads the current tool's headings without replacing forms, readers or chat controls. */
export function NexusSectionRail({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<{ title: string; element: HTMLElement }[]>([]);
  const moving = useNexusMotion();
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const update = () =>
      setSections(
        Array.from(
          root.querySelectorAll<HTMLElement>("h2, h3, button[aria-expanded][aria-controls]"),
        )
          .filter((e) => e.textContent?.trim() && !e.querySelector("button[aria-expanded]"))
          .slice(0, 20)
          .map((element) => ({ title: element.textContent?.trim() ?? "", element })),
      );
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <div className="nexus-tool-layout mx-auto max-w-7xl lg:grid lg:grid-cols-[180px_minmax(0,1fr)]">
      <aside
        className="nexus-section-rail min-w-0 px-4 pt-24 lg:sticky lg:top-0 lg:max-h-dvh lg:overflow-y-auto"
        aria-label="Page sections"
      >
        <div className="mb-3 flex items-center gap-2 text-xs text-accent">
          <List className="h-4 w-4" /> Sections
        </div>
        <div className="flex gap-1 overflow-x-auto lg:flex-col">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 justify-start"
            onClick={() => window.scrollTo({ top: 0, behavior: moving ? "smooth" : "instant" })}
          >
            <ArrowUp className="h-3 w-3" /> Overview
          </Button>
          {sections.map((section, i) => (
            <Button
              key={`${section.title}-${i}`}
              variant="ghost"
              size="sm"
              className="h-auto min-h-9 shrink-0 justify-start whitespace-normal text-left text-xs lg:shrink"
              onClick={() => {
                if (section.element.getAttribute("aria-expanded") === "false")
                  section.element.click();
                section.element.scrollIntoView({
                  behavior: moving ? "smooth" : "instant",
                  block: "center",
                });
              }}
            >
              {section.title}
            </Button>
          ))}
        </div>
      </aside>
      <div ref={container} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
