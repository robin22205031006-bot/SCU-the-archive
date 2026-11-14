import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { motion } from "framer-motion";
import { useAppMotion } from "@/hooks/use-app-motion";

export interface MotionBoxProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Page-level Framer Motion wrapper tuned to the active UI shell/sub-theme.
 * Renders a static container with zero Framer Motion overhead when `minimal` is active.
 */
export function MotionPage({ children, className = "", style }: MotionBoxProps) {
  const { isMinimal, motionActive, spec } = useAppMotion();
  if (!motionActive) {
    return (
      <div
        className={className}
        {...(style ? { style } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </div>
    );
  }
  return (
    <motion.div
      data-motion-state="active"
      variants={spec.pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(style ? { style } : {})}
    >
      {children}
    </motion.div>
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
}: MotionBoxProps & { delay?: number }) {
  const { isMinimal, motionActive, spec } = useAppMotion();
  if (!motionActive) {
    return (
      <div
        className={className}
        {...(style ? { style } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </div>
    );
  }
  return (
    <motion.div
      data-motion-state="active"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spec.transition, ...(delay > 0 ? { delay } : {}) }}
      className={className}
      {...(style ? { style } : {})}
    >
      {children}
    </motion.div>
  );
}

export interface MotionCardProps extends MotionBoxProps {
  index?: number;
  interactive?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  role?: string;
  tabIndex?: number;
  "aria-label"?: string;
}

/**
 * Interactive staggered card wrapper with GPU-only hover/tap micro-physics.
 * Completely static in `minimal` mode.
 */
export function MotionCard({
  children,
  className = "",
  style,
  index = 0,
  interactive = true,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  "aria-label": ariaLabel,
}: MotionCardProps) {
  const { isMinimal, motionActive, spec } = useAppMotion();

  if (!motionActive) {
    return (
      <div
        className={className}
        {...(style ? { style } : {})}
        {...(onClick ? { onClick } : {})}
        {...(onKeyDown ? { onKeyDown } : {})}
        {...(role ? { role } : {})}
        {...(tabIndex !== undefined ? { tabIndex } : {})}
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      data-motion-state="active"
      variants={spec.cardVariants}
      initial="initial"
      animate="animate"
      {...(interactive ? { whileHover: "hover", whileTap: "tap" } : {})}
      transition={{
        ...spec.transition,
        delay: Math.min(index * 0.03, 0.36),
      }}
      className={className}
      {...(style ? { style } : {})}
      {...(onClick ? { onClick } : {})}
      {...(onKeyDown ? { onKeyDown } : {})}
      {...(role ? { role } : {})}
      {...(tabIndex !== undefined ? { tabIndex } : {})}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
    >
      {children}
    </motion.div>
  );
}

/**
 * Modal / detail overlay surface motion tuned to the active theme.
 * Instant render without animation in `minimal` mode.
 */
export function MotionModalPanel({ children, className = "", style }: MotionBoxProps) {
  const { isMinimal, motionActive, spec } = useAppMotion();
  if (!motionActive) {
    return (
      <div
        className={className}
        {...(style ? { style } : {})}
        data-motion-state={isMinimal ? "minimal-off" : "paused"}
      >
        {children}
      </div>
    );
  }
  return (
    <motion.div
      data-motion-state="active"
      variants={spec.modalVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...(style ? { style } : {})}
    >
      {children}
    </motion.div>
  );
}
