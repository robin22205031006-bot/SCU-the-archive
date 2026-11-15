import { motion } from "framer-motion";
import { useAppMotion } from "@/hooks/use-app-motion";

/** Kinetic typography: spring-staggered letter reveal (stiffness 250, damping 20). */
export function KineticText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const { motionActive } = useAppMotion();
  if (!motionActive) return <span className={className}>{text}</span>;
  let charIndex = 0;
  const tokens = text.split(/(\s+)/);
  return (
    <span className={className} aria-label={text}>
      {tokens.map((token, tIdx) => {
        if (/^\s+$/.test(token)) {
          charIndex += token.length;
          return <span key={`s-${tIdx}`}>{token}</span>;
        }
        return (
          <span key={`w-${tIdx}`} className="inline-block whitespace-nowrap">
            {token.split("").map((ch, cIdx) => {
              const idx = charIndex++;
              return (
                <motion.span
                  key={`c-${tIdx}-${cIdx}`}
                  className="inline-block"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 250,
                    damping: 20,
                    delay: delay + idx * 0.035,
                    mass: 0.7,
                  }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}
