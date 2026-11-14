import type { CSSProperties } from "react";
import { useActiveGenre } from "@/hooks/use-ui-mode";
import { useAnimationsEnabled } from "@/lib/animations";
import { LivingThemeBackdrop } from "@/components/lazy-three";

interface SparkleSpec {
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  alt?: boolean;
}

const FANTASY_MOTES: readonly SparkleSpec[] = [
  { left: "8%", top: "18%", size: 12, delay: "0s", duration: "6.5s" },
  { left: "16%", top: "68%", size: 9, delay: "1.4s", duration: "7.2s", alt: true },
  { left: "26%", top: "32%", size: 14, delay: "0.7s", duration: "8s" },
  { left: "38%", top: "82%", size: 10, delay: "2.1s", duration: "6.8s", alt: true },
  { left: "49%", top: "20%", size: 11, delay: "1.1s", duration: "7.5s" },
  { left: "61%", top: "58%", size: 15, delay: "0.3s", duration: "6.2s" },
  { left: "72%", top: "28%", size: 10, delay: "2.6s", duration: "7.8s", alt: true },
  { left: "83%", top: "74%", size: 13, delay: "1.8s", duration: "6.9s" },
  { left: "91%", top: "40%", size: 9, delay: "0.9s", duration: "7.4s", alt: true },
  { left: "12%", top: "88%", size: 12, delay: "3.0s", duration: "8.1s" },
  { left: "54%", top: "76%", size: 10, delay: "2.3s", duration: "6.4s", alt: true },
  { left: "77%", top: "14%", size: 14, delay: "1.5s", duration: "7.0s" },
];

const ISEKAI_SPARKLES: readonly SparkleSpec[] = [
  { left: "6%", top: "24%", size: 14, delay: "0.2s", duration: "4.6s" },
  { left: "15%", top: "52%", size: 10, delay: "1.2s", duration: "5.2s", alt: true },
  { left: "23%", top: "14%", size: 12, delay: "0.6s", duration: "4.8s" },
  { left: "33%", top: "78%", size: 15, delay: "1.9s", duration: "5.5s", alt: true },
  { left: "43%", top: "36%", size: 9, delay: "0.4s", duration: "4.2s" },
  { left: "52%", top: "86%", size: 13, delay: "2.4s", duration: "5.0s", alt: true },
  { left: "64%", top: "19%", size: 15, delay: "1.0s", duration: "4.9s" },
  { left: "74%", top: "62%", size: 11, delay: "2.8s", duration: "5.4s", alt: true },
  { left: "84%", top: "30%", size: 14, delay: "0.8s", duration: "4.5s" },
  { left: "92%", top: "74%", size: 10, delay: "1.6s", duration: "5.1s", alt: true },
  { left: "19%", top: "88%", size: 11, delay: "2.1s", duration: "4.7s" },
  { left: "68%", top: "82%", size: 13, delay: "0.9s", duration: "5.3s", alt: true },
];

const DARK_EMBERS: readonly SparkleSpec[] = [
  { left: "7%", top: "85%", size: 7, delay: "0s", duration: "6.0s" },
  { left: "14%", top: "92%", size: 5, delay: "1.5s", duration: "7.2s", alt: true },
  { left: "24%", top: "88%", size: 8, delay: "0.8s", duration: "5.8s" },
  { left: "36%", top: "94%", size: 6, delay: "2.4s", duration: "6.8s", alt: true },
  { left: "47%", top: "90%", size: 7, delay: "1.1s", duration: "6.4s" },
  { left: "58%", top: "86%", size: 9, delay: "3.1s", duration: "7.0s", alt: true },
  { left: "67%", top: "93%", size: 6, delay: "0.4s", duration: "5.9s" },
  { left: "76%", top: "89%", size: 8, delay: "2.0s", duration: "6.6s", alt: true },
  { left: "86%", top: "92%", size: 6, delay: "1.3s", duration: "7.4s" },
  { left: "94%", top: "87%", size: 7, delay: "2.7s", duration: "6.1s", alt: true },
];

const GHIBLI_PETALS: readonly SparkleSpec[] = [
  { left: "5%", top: "-6%", size: 14, delay: "0s", duration: "11s" },
  { left: "13%", top: "-10%", size: 11, delay: "2.2s", duration: "13s", alt: true },
  { left: "22%", top: "-5%", size: 15, delay: "4.5s", duration: "12s" },
  { left: "31%", top: "-8%", size: 12, delay: "1.1s", duration: "14s", alt: true },
  { left: "40%", top: "-6%", size: 13, delay: "6.0s", duration: "11.5s" },
  { left: "50%", top: "-11%", size: 10, delay: "3.4s", duration: "13.5s", alt: true },
  { left: "59%", top: "-5%", size: 15, delay: "0.8s", duration: "12.5s" },
  { left: "68%", top: "-9%", size: 12, delay: "5.1s", duration: "10.8s", alt: true },
  { left: "76%", top: "-6%", size: 14, delay: "2.8s", duration: "13.2s" },
  { left: "85%", top: "-10%", size: 11, delay: "7.2s", duration: "11.8s", alt: true },
  { left: "92%", top: "-5%", size: 13, delay: "4.0s", duration: "12.8s" },
  { left: "27%", top: "-12%", size: 11, delay: "8.4s", duration: "14.2s", alt: true },
];

const XIANXIA_QI_MOTES: readonly SparkleSpec[] = [
  { left: "9%", top: "72%", size: 8, delay: "0.3s", duration: "7.5s" },
  { left: "21%", top: "80%", size: 6, delay: "1.8s", duration: "8.6s", alt: true },
  { left: "34%", top: "66%", size: 9, delay: "0.9s", duration: "7.8s" },
  { left: "48%", top: "84%", size: 7, delay: "2.5s", duration: "9.0s", alt: true },
  { left: "63%", top: "74%", size: 8, delay: "1.2s", duration: "8.2s" },
  { left: "75%", top: "82%", size: 6, delay: "3.1s", duration: "7.6s", alt: true },
  { left: "88%", top: "70%", size: 9, delay: "0.6s", duration: "8.4s" },
  { left: "95%", top: "79%", size: 7, delay: "2.1s", duration: "9.2s", alt: true },
];

const SHONEN_STREAKS: readonly SparkleSpec[] = [
  { left: "10%", top: "18%", size: 110, delay: "0s", duration: "2.8s" },
  { left: "28%", top: "64%", size: 140, delay: "0.9s", duration: "3.2s", alt: true },
  { left: "46%", top: "28%", size: 95, delay: "1.7s", duration: "2.6s" },
  { left: "68%", top: "72%", size: 130, delay: "0.5s", duration: "3.0s", alt: true },
  { left: "82%", top: "22%", size: 115, delay: "1.3s", duration: "2.9s" },
];

const CYBER_STARS: readonly SparkleSpec[] = [
  { left: "9%", top: "16%", size: 11, delay: "0s", duration: "3.8s" },
  { left: "22%", top: "48%", size: 8, delay: "1.1s", duration: "4.6s", alt: true },
  { left: "36%", top: "22%", size: 13, delay: "0.5s", duration: "3.5s" },
  { left: "51%", top: "74%", size: 9, delay: "1.8s", duration: "4.4s", alt: true },
  { left: "64%", top: "34%", size: 12, delay: "0.7s", duration: "3.9s" },
  { left: "78%", top: "62%", size: 10, delay: "2.3s", duration: "4.8s", alt: true },
  { left: "88%", top: "20%", size: 14, delay: "1.4s", duration: "3.7s" },
  { left: "15%", top: "82%", size: 10, delay: "2.0s", duration: "4.2s", alt: true },
];

function FourPointSparkle({
  spec,
  colorVar,
  animClass,
}: {
  spec: SparkleSpec;
  colorVar: string;
  animClass: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`genre-vfx-sparkle absolute ${animClass}`}
      style={
        {
          left: spec.left,
          top: spec.top,
          width: `${spec.size}px`,
          height: `${spec.size}px`,
          color: colorVar,
          animationDelay: spec.delay,
          animationDuration: spec.duration,
        } as CSSProperties
      }
      fill="currentColor"
    >
      <path d="M12 0 L14.8 9.2 L24 12 L14.8 14.8 L12 24 L9.2 14.8 L0 12 L9.2 9.2 Z" />
    </svg>
  );
}

/**
 * Theme-specific live ambient visualizations & animated anime VFX for every Manga UI genre.
 * Strictly pointer-events-none and respects animations/reduced-motion settings.
 */
export function GenreBackdrop() {
  const genre = useActiveGenre();
  const animOn = useAnimationsEnabled();

  if (!genre) return null;

  return (
    <div
      aria-hidden="true"
      data-genre-viz={genre}
      data-viz-animated={animOn ? "true" : "false"}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {animOn && <LivingThemeBackdrop genre={genre} />}
      {genre === "manga-ink" && (
        <>
          <div
            className={`genre-ink-halftone-drift absolute inset-0 ${animOn ? "genre-anim" : ""}`}
          />
          <div
            className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-[0.06]"
            style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
          />
        </>
      )}

      {genre === "shonen" && (
        <>
          <div
            className={`genre-shonen-speedlines absolute inset-0 opacity-[0.14] ${
              animOn ? "genre-anim" : ""
            }`}
          />
          <div
            className={`absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl ${
              animOn ? "genre-aura-pulse" : ""
            }`}
            style={{ background: "radial-gradient(circle, var(--primary), transparent 70%)" }}
          />
          <div
            className={`absolute -bottom-24 -left-24 h-80 w-80 rounded-full opacity-20 blur-3xl ${
              animOn ? "genre-aura-pulse" : ""
            }`}
            style={{
              background: "radial-gradient(circle, var(--accent), transparent 70%)",
              animationDelay: "1.6s",
            }}
          />
          {SHONEN_STREAKS.map((s, idx) => (
            <span
              key={idx}
              className={`genre-shonen-streak absolute h-[2px] ${animOn ? "genre-anim" : ""}`}
              style={
                {
                  left: s.left,
                  top: s.top,
                  width: `${s.size}px`,
                  background: s.alt
                    ? "linear-gradient(90deg, transparent, var(--accent), transparent)"
                    : "linear-gradient(90deg, transparent, var(--genre-gold, var(--primary)), transparent)",
                  animationDelay: s.delay,
                  animationDuration: s.duration,
                } as CSSProperties
              }
            />
          ))}
        </>
      )}

      {genre === "fantasy" && (
        <>
          <div className={`genre-fantasy-aura absolute inset-0 ${animOn ? "genre-anim" : ""}`} />
          <svg
            viewBox="0 0 400 400"
            className={`absolute -right-28 top-12 h-[420px] w-[420px] text-[var(--genre-gold,#d4af37)] opacity-[0.18] ${
              animOn ? "genre-spin-slow" : ""
            }`}
            fill="none"
            stroke="currentColor"
          >
            <circle cx="200" cy="200" r="185" strokeWidth="1" strokeDasharray="6 6" />
            <circle cx="200" cy="200" r="150" strokeWidth="1.2" />
            <circle cx="200" cy="200" r="110" strokeWidth="0.8" strokeDasharray="3 5" />
            <polygon
              points="200,15 245,155 385,200 245,245 200,385 155,245 15,200 155,155"
              strokeWidth="0.9"
            />
          </svg>
          {FANTASY_MOTES.map((spec, idx) => (
            <FourPointSparkle
              key={idx}
              spec={spec}
              colorVar={spec.alt ? "var(--accent)" : "var(--genre-gold, #d4af37)"}
              animClass={animOn ? "genre-mote-rise" : ""}
            />
          ))}
        </>
      )}

      {genre === "isekai" && (
        <>
          <div
            className={`genre-isekai-grid-drift absolute inset-0 ${animOn ? "genre-anim" : ""}`}
          />
          <svg
            viewBox="0 0 320 320"
            className={`absolute -left-20 bottom-6 h-[340px] w-[340px] text-[var(--genre-gold,#e09f3e)] opacity-[0.16] ${
              animOn ? "genre-spin-slow" : ""
            }`}
            fill="none"
            stroke="currentColor"
          >
            <circle cx="160" cy="160" r="140" strokeWidth="1.2" strokeDasharray="10 5" />
            <circle cx="160" cy="160" r="95" strokeWidth="1" />
            <path
              d="M160 10 L176 144 L310 160 L176 176 L160 310 L144 176 L10 160 L144 144 Z"
              strokeWidth="1"
            />
          </svg>
          <div
            className={`absolute right-[12%] top-[18%] h-44 w-44 rounded-full opacity-20 blur-2xl ${
              animOn ? "genre-aura-pulse" : ""
            }`}
            style={{ background: "var(--accent)" }}
          />
          <div
            className={`absolute left-[18%] top-[24%] h-32 w-32 rounded-full opacity-20 blur-2xl ${
              animOn ? "genre-aura-pulse" : ""
            }`}
            style={{ background: "var(--primary)", animationDelay: "1.5s" }}
          />
          {ISEKAI_SPARKLES.map((spec, idx) => (
            <FourPointSparkle
              key={idx}
              spec={spec}
              colorVar={spec.alt ? "var(--accent)" : "var(--genre-gold, #e09f3e)"}
              animClass={animOn ? "genre-isekai-sparkle" : ""}
            />
          ))}
        </>
      )}

      {genre === "dark-fantasy" && (
        <>
          <div className={`genre-dark-miasma absolute inset-0 ${animOn ? "genre-anim" : ""}`} />
          <svg
            viewBox="0 0 360 360"
            className={`absolute left-1/2 top-1/2 h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 text-primary opacity-[0.12] ${
              animOn ? "genre-spin-slow" : ""
            }`}
            fill="none"
            stroke="currentColor"
          >
            <circle cx="180" cy="180" r="168" strokeWidth="1.2" strokeDasharray="4 6" />
            <polygon points="180,18 320,99 320,261 180,342 40,261 40,99" strokeWidth="1" />
            <polygon points="180,45 297,248 63,248" strokeWidth="0.9" />
            <polygon points="180,315 297,112 63,112" strokeWidth="0.9" />
          </svg>
          {DARK_EMBERS.map((spec, idx) => (
            <span
              key={idx}
              className={`genre-dark-ember absolute rounded-full ${animOn ? "genre-ember-ascend" : ""}`}
              style={
                {
                  left: spec.left,
                  top: spec.top,
                  width: `${spec.size}px`,
                  height: `${spec.size}px`,
                  background: spec.alt ? "var(--accent)" : "var(--primary)",
                  boxShadow: spec.alt
                    ? "0 0 10px 2px var(--accent)"
                    : "0 0 10px 2px var(--primary)",
                  animationDelay: spec.delay,
                  animationDuration: spec.duration,
                } as CSSProperties
              }
            />
          ))}
        </>
      )}

      {genre === "ghibli" && (
        <>
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 18% 12%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 48%), radial-gradient(ellipse at 85% 88%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 52%)",
            }}
          />
          <svg
            viewBox="0 0 1200 320"
            preserveAspectRatio="none"
            className={`absolute bottom-0 left-0 h-56 w-full text-primary opacity-[0.16] ${
              animOn ? "genre-breeze-float" : ""
            }`}
            fill="none"
            stroke="currentColor"
          >
            <path d="M-40 220 Q 260 120 600 200 T 1240 160" strokeWidth="2" />
            <path
              d="M-40 260 Q 340 175 680 235 T 1240 215"
              strokeWidth="1.4"
              strokeDasharray="8 6"
            />
          </svg>
          {GHIBLI_PETALS.map((spec, idx) => (
            <span
              key={idx}
              className={`genre-petal absolute ${animOn ? "genre-ghibli-petals" : ""}`}
              style={
                {
                  left: spec.left,
                  top: spec.top,
                  width: `${spec.size}px`,
                  height: `${Math.round(spec.size * 0.72)}px`,
                  background: spec.alt
                    ? "radial-gradient(circle at 30% 30%, #bbf7d0, var(--primary))"
                    : "radial-gradient(circle at 30% 30%, #ffe4e6, #f472b6)",
                  animationDelay: spec.delay,
                  animationDuration: spec.duration,
                } as CSSProperties
              }
            />
          ))}
        </>
      )}

      {genre === "xianxia" && (
        <>
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 15%, color-mix(in oklab, var(--genre-gold, #d6b26a) 24%, transparent), transparent 44%), radial-gradient(circle at 18% 82%, color-mix(in oklab, var(--accent) 20%, transparent), transparent 48%)",
            }}
          />
          {/* Flowing ink stream bands */}
          <div
            className={`genre-ink-stream-band absolute inset-0 ${animOn ? "genre-xianxia-ink-stream" : ""}`}
          />
          <svg
            viewBox="0 0 1200 280"
            preserveAspectRatio="none"
            className={`absolute bottom-0 left-0 h-56 w-full text-[var(--genre-gold,#d6b26a)] opacity-[0.18] ${
              animOn ? "genre-breeze-float" : ""
            }`}
            fill="currentColor"
          >
            <path
              d="M0 280 L0 190 Q180 110 380 175 T760 155 T1200 185 L1200 280 Z"
              fillOpacity="0.35"
            />
            <path
              d="M0 280 L0 220 Q240 165 510 210 T980 195 T1200 225 L1200 280 Z"
              fillOpacity="0.45"
            />
          </svg>
          {XIANXIA_QI_MOTES.map((spec, idx) => (
            <span
              key={idx}
              className={`genre-qi-mote absolute rounded-full ${animOn ? "genre-qi-drift" : ""}`}
              style={
                {
                  left: spec.left,
                  top: spec.top,
                  width: `${spec.size}px`,
                  height: `${spec.size}px`,
                  background: spec.alt ? "var(--accent)" : "var(--genre-gold, #d6b26a)",
                  boxShadow: spec.alt
                    ? "0 0 10px var(--accent)"
                    : "0 0 10px var(--genre-gold, #d6b26a)",
                  animationDelay: spec.delay,
                  animationDuration: spec.duration,
                } as CSSProperties
              }
            />
          ))}
        </>
      )}

      {genre === "cyber-anime" && (
        <>
          <div
            className={`genre-cyber-grid-drift absolute inset-0 ${animOn ? "genre-anim" : ""}`}
          />
          <svg
            viewBox="0 0 320 320"
            className={`absolute -right-14 top-16 h-80 w-80 text-primary opacity-[0.18] ${
              animOn ? "genre-spin-slow" : ""
            }`}
            fill="none"
            stroke="currentColor"
          >
            <circle cx="160" cy="160" r="130" strokeWidth="1" strokeDasharray="8 4" />
            <circle cx="160" cy="160" r="96" strokeWidth="0.8" />
            <path
              d="M180 55 A85 85 0 1 0 235 205 A66 66 0 1 1 180 55 Z"
              fill="currentColor"
              fillOpacity="0.22"
            />
          </svg>
          {CYBER_STARS.map((spec, idx) => (
            <FourPointSparkle
              key={idx}
              spec={spec}
              colorVar={spec.alt ? "var(--accent)" : "var(--primary)"}
              animClass={animOn ? "genre-isekai-sparkle" : ""}
            />
          ))}
          <span
            className={`genre-cyber-star-streak absolute left-[-10%] top-[28%] h-[2px] w-44 ${
              animOn ? "genre-star-streak" : ""
            }`}
          />
          <span
            className={`genre-cyber-star-streak absolute left-[-15%] top-[68%] h-[2px] w-56 ${
              animOn ? "genre-star-streak" : ""
            }`}
            style={{ animationDelay: "3.2s" }}
          />
        </>
      )}
    </div>
  );
}
