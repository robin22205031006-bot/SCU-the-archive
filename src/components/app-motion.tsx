import type {
  ClipboardEventHandler,
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";
import { AnimatePresence, motion, type MotionStyle } from "framer-motion";
import { useAppMotion } from "@/hooks/use-app-motion";

export type MotionTagName = "div" | "section" | "article" | "main" | "header" | "footer" | "aside";

const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  main: motion.main,
  header: motion.header,
  footer: motion.footer,
  aside: motion.aside,
} as const;

export interface MotionBoxProps {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  as?: MotionTagName | undefined;
  id?: string | undefined;
  "aria-label"?: string | undefined;
  onCopy?: ClipboardEventHandler<HTMLElement> | undefined;
}

/**
 * Page-level Framer Motion wrapper tuned to the active UI shell/sub-theme.
 * Renders a static container with zero Framer Motion overhead when `minimal` is active.
 */
export function MotionPage({
  children,
  className = "",
  style,
  as = "div",
  id,
  "aria-label": ariaLabel,
  onCopy,
}: MotionBoxProps) {
  const { isMinimal, motionActive, spec } = useAppMotion();
  if (!motionActive) {
    const StaticTag = as;
    return (
      <StaticTag
        className={className}
        {...(id ? { id } : {})}
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
        {...(style ? { style } : {})}
        {...(onCopy ? { onCopy } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </StaticTag>
    );
  }
  const MotionTag = MOTION_TAGS[as];
  return (
    <MotionTag
      data-motion-state="active"
      variants={spec.pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(id ? { id } : {})}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      {...(style ? { style: style as MotionStyle } : {})}
      {...(onCopy ? { onCopy } : {})}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Section/panel entrance motion using GPU-composited opacity & transform.
 * Completely bypassed in `minimal` mode.
 */
export function MotionSection({
  children,
  className = "",
  style,
  delay = 0,
  as = "div",
  id,
  "aria-label": ariaLabel,
}: MotionBoxProps & { delay?: number }) {
  const { isMinimal, motionActive, spec } = useAppMotion();
  if (!motionActive) {
    const StaticTag = as;
    return (
      <StaticTag
        className={className}
        {...(id ? { id } : {})}
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
        {...(style ? { style } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </StaticTag>
    );
  }
  const MotionTag = MOTION_TAGS[as];
  return (
    <MotionTag
      data-motion-state="active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ ...spec.transition, ...(delay > 0 ? { delay } : {}) }}
      className={className}
      {...(id ? { id } : {})}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      {...(style ? { style: style as MotionStyle } : {})}
    >
      {children}
    </MotionTag>
  );
}

export interface MotionCardProps extends MotionBoxProps {
  index?: number;
  interactive?: boolean;
  scrollReveal?: boolean;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
  role?: string;
  tabIndex?: number;
  "data-item-key"?: string;
  "data-pinned"?: string;
  "data-highlighted"?: string;
  "data-speaking"?: string;
}

/**
 * Interactive staggered card wrapper with GPU-only hover/tap micro-physics and optional scroll reveal.
 * Completely static in `minimal` mode or when animations are disabled.
 */
export function MotionCard({
  children,
  className = "",
  style,
  index = 0,
  interactive = true,
  scrollReveal = false,
  as = "div",
  id,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  "aria-label": ariaLabel,
  "data-item-key": dataItemKey,
  "data-pinned": dataPinned,
  "data-highlighted": dataHighlighted,
  "data-speaking": dataSpeaking,
}: MotionCardProps) {
  const { isMinimal, motionActive, spec } = useAppMotion();

  if (!motionActive) {
    const StaticTag = as;
    return (
      <StaticTag
        className={className}
        {...(id ? { id } : {})}
        {...(style ? { style } : {})}
        {...(onClick ? { onClick } : {})}
        {...(onKeyDown ? { onKeyDown } : {})}
        {...(role ? { role } : {})}
        {...(tabIndex !== undefined ? { tabIndex } : {})}
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
        {...(dataItemKey !== undefined ? { "data-item-key": dataItemKey } : {})}
        {...(dataPinned !== undefined ? { "data-pinned": dataPinned } : {})}
        {...(dataHighlighted !== undefined ? { "data-highlighted": dataHighlighted } : {})}
        {...(dataSpeaking !== undefined ? { "data-speaking": dataSpeaking } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </StaticTag>
    );
  }

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const supportsIntersectionObserver = typeof IntersectionObserver === "function";
  const useScrollReveal = scrollReveal && !prefersReducedMotion && supportsIntersectionObserver;
  const resolvedVariants = useScrollReveal
    ? {
        ...(spec.cardVariants.hover ? { hover: spec.cardVariants.hover } : {}),
        ...(spec.cardVariants.tap ? { tap: spec.cardVariants.tap } : {}),
        scrollHidden: { opacity: 0, y: 18, scale: 0.98 },
        scrollVisible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.36,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
            delay: Math.min((index % 6) * 0.05, 0.25),
          },
        },
      }
    : spec.cardVariants;

  const MotionTag = MOTION_TAGS[as];
  return (
    <MotionTag
      data-motion-state="active"
      {...(useScrollReveal ? { "data-scroll-reveal": "true" } : {})}
      variants={resolvedVariants}
      initial={useScrollReveal ? "scrollHidden" : "initial"}
      {...(useScrollReveal
        ? { whileInView: "scrollVisible", viewport: { once: true, amount: "some" } }
        : {
            animate: "animate",
            transition: {
              ...spec.transition,
              delay: Math.min(index * 0.03, 0.36),
            },
          })}
      {...(interactive ? { whileHover: "hover", whileTap: "tap" } : {})}
      className={className}
      {...(id ? { id } : {})}
      {...(style ? { style: style as MotionStyle } : {})}
      {...(onClick ? { onClick } : {})}
      {...(onKeyDown ? { onKeyDown } : {})}
      {...(role ? { role } : {})}
      {...(tabIndex !== undefined ? { tabIndex } : {})}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      {...(dataItemKey !== undefined ? { "data-item-key": dataItemKey } : {})}
      {...(dataPinned !== undefined ? { "data-pinned": dataPinned } : {})}
      {...(dataHighlighted !== undefined ? { "data-highlighted": dataHighlighted } : {})}
      {...(dataSpeaking !== undefined ? { "data-speaking": dataSpeaking } : {})}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Modal / detail overlay surface motion tuned to the active theme.
 * Instant render without animation in `minimal` mode.
 */
export function MotionModalPanel({
  children,
  className = "",
  style,
  as = "div",
  id,
  "aria-label": ariaLabel,
}: MotionBoxProps) {
  const { isMinimal, motionActive, spec } = useAppMotion();
  if (!motionActive) {
    const StaticTag = as;
    return (
      <StaticTag
        className={className}
        {...(id ? { id } : {})}
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
        {...(style ? { style } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </StaticTag>
    );
  }
  const MotionTag = MOTION_TAGS[as];
  return (
    <MotionTag
      data-motion-state="active"
      variants={spec.modalVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(id ? { id } : {})}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      {...(style ? { style: style as MotionStyle } : {})}
    >
      {children}
    </MotionTag>
  );
}

/**
 * Conditional AnimatePresence wrapper that becomes a zero-overhead passthrough
 * in `minimal` mode so mount/unmount happens immediately with no exit delay.
 */
export function MotionPresence({
  children,
  mode = "sync",
  initial = true,
}: {
  children: ReactNode;
  mode?: "sync" | "wait" | "popLayout";
  initial?: boolean;
}) {
  const { motionActive } = useAppMotion();
  if (!motionActive) {
    return <>{children}</>;
  }
  return (
    <AnimatePresence mode={mode} initial={initial}>
      {children}
    </AnimatePresence>
  );
}
