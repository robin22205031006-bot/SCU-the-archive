import type { Transition, Variants } from "framer-motion";
import type { MangaSubTheme, PrimarySystem } from "@/context/ThemeContext";

export type MotionThemeKey = PrimarySystem | MangaSubTheme;

export interface ThemeMotionSpec {
  transition: Transition;
  pageVariants: Variants;
  cardVariants: Variants;
  tabIndicatorTransition: Transition;
  modalVariants: Variants;
}

const GPU_BEZIER_FANTASY: [number, number, number, number] = [0.25, 0.1, 0.25, 1];
const GPU_BEZIER_NEXUS: [number, number, number, number] = [0.16, 1, 0.3, 1];
const GPU_BEZIER_STANDARD: [number, number, number, number] = [0.22, 1, 0.36, 1];
const GPU_BEZIER_GHIBLI: [number, number, number, number] = [0.34, 1.26, 0.64, 1];

export const TAB_INDICATOR_SPRING: Transition = {
  type: "spring",
  stiffness: 440,
  damping: 32,
  mass: 0.7,
};

export const THEME_MOTION_REGISTRY: Record<MotionThemeKey, ThemeMotionSpec> = {
  // Primary Systems
  classic: {
    transition: { duration: 0.28, ease: GPU_BEZIER_STANDARD },
    pageVariants: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: GPU_BEZIER_STANDARD } },
      exit: { opacity: 0, y: -6, transition: { duration: 0.18, ease: GPU_BEZIER_STANDARD } },
    },
    cardVariants: {
      initial: { opacity: 0, y: 12, scale: 0.98 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.28, ease: GPU_BEZIER_STANDARD },
      },
      hover: { y: -3, transition: { duration: 0.2, ease: GPU_BEZIER_STANDARD } },
      tap: { scale: 0.985, transition: { duration: 0.1 } },
    },
    tabIndicatorTransition: TAB_INDICATOR_SPRING,
    modalVariants: {
      initial: { opacity: 0, scale: 0.96, y: 8 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.24, ease: GPU_BEZIER_STANDARD },
      },
      exit: { opacity: 0, scale: 0.96, transition: { duration: 0.16 } },
    },
  },

  nexus: {
    transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
    pageVariants: {
      initial: { opacity: 0, y: 6, scale: 0.99 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
      },
      exit: { opacity: 0, scale: 0.99, transition: { duration: 0.12, ease: GPU_BEZIER_NEXUS } },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.97, y: 8 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
      },
      hover: { y: -2, scale: 1.01, transition: { duration: 0.16, ease: GPU_BEZIER_NEXUS } },
      tap: { scale: 0.98, transition: { duration: 0.08 } },
    },
    tabIndicatorTransition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
    modalVariants: {
      initial: { opacity: 0, scale: 0.94, y: 6 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
      },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.12 } },
    },
  },

  minimal: {
    transition: { duration: 0 },
    pageVariants: {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 1, transition: { duration: 0 } },
    },
    cardVariants: {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0 } },
      hover: {},
      tap: {},
    },
    tabIndicatorTransition: { duration: 0 },
    modalVariants: {
      initial: { opacity: 1 },
      animate: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 1, transition: { duration: 0 } },
    },
  },

  manga: {
    transition: { type: "spring", stiffness: 520, damping: 28, mass: 0.72 },
    pageVariants: {
      initial: { opacity: 0, scale: 0.97, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", stiffness: 460, damping: 28, mass: 0.75 },
      },
      exit: { opacity: 0, scale: 0.98, transition: { duration: 0.14 } },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.94, y: 12 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", stiffness: 520, damping: 28, mass: 0.72 },
      },
      hover: { y: -3, scale: 1.015, transition: { type: "spring", stiffness: 560, damping: 26 } },
      tap: { scale: 0.97, transition: { type: "spring", stiffness: 620, damping: 30 } },
    },
    tabIndicatorTransition: { type: "spring", stiffness: 520, damping: 30 },
    modalVariants: {
      initial: { opacity: 0, scale: 0.92 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 500, damping: 26 },
      },
      exit: { opacity: 0, scale: 0.94, transition: { duration: 0.14 } },
    },
  },

  // Manga Sub-Themes
  fantasy: {
    // Weighted parchment unroll and ethereal floating entrance
    transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
    pageVariants: {
      initial: { opacity: 0, scale: 0.95, y: 12 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
      },
      exit: {
        opacity: 0,
        scale: 0.97,
        y: -8,
        transition: { duration: 0.24, ease: GPU_BEZIER_FANTASY },
      },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
      },
      hover: {
        y: -4,
        scale: 1.015,
        transition: { duration: 0.32, ease: GPU_BEZIER_FANTASY },
      },
      tap: { scale: 0.98, transition: { duration: 0.14, ease: GPU_BEZIER_FANTASY } },
    },
    tabIndicatorTransition: { duration: 0.38, ease: GPU_BEZIER_FANTASY },
    modalVariants: {
      initial: { opacity: 0, scale: 0.95, y: 12 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
      },
      exit: { opacity: 0, scale: 0.96, transition: { duration: 0.22 } },
    },
  },

  isekai: {
    transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
    pageVariants: {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
      },
      exit: { opacity: 0, scale: 0.97, transition: { duration: 0.2 } },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
      },
      hover: { y: -3, scale: 1.01, transition: { duration: 0.28, ease: GPU_BEZIER_FANTASY } },
      tap: { scale: 0.98, transition: { duration: 0.12 } },
    },
    tabIndicatorTransition: { duration: 0.32, ease: GPU_BEZIER_FANTASY },
    modalVariants: {
      initial: { opacity: 0, scale: 0.95 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.4, ease: GPU_BEZIER_FANTASY },
      },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    },
  },

  scifiAnime: {
    transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
    pageVariants: {
      initial: { opacity: 0, x: 10, scale: 0.99 },
      animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
      },
      exit: { opacity: 0, x: -8, transition: { duration: 0.12, ease: GPU_BEZIER_NEXUS } },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.96, y: 6 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
      },
      hover: { y: -3, scale: 1.01, transition: { duration: 0.16, ease: GPU_BEZIER_NEXUS } },
      tap: { scale: 0.98, transition: { duration: 0.08 } },
    },
    tabIndicatorTransition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
    modalVariants: {
      initial: { opacity: 0, scale: 0.94 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.18, ease: GPU_BEZIER_NEXUS },
      },
      exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12 } },
    },
  },

  shounen: {
    transition: { type: "spring", stiffness: 580, damping: 24, mass: 0.65 },
    pageVariants: {
      initial: { opacity: 0, scale: 0.94, x: 14 },
      animate: {
        opacity: 1,
        scale: 1,
        x: 0,
        transition: { type: "spring", stiffness: 540, damping: 26, mass: 0.7 },
      },
      exit: { opacity: 0, x: -12, transition: { duration: 0.14 } },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.92, y: 14 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", stiffness: 580, damping: 24, mass: 0.65 },
      },
      hover: {
        y: -4,
        scale: 1.02,
        rotate: -0.4,
        transition: { type: "spring", stiffness: 600, damping: 22 },
      },
      tap: { scale: 0.96, transition: { duration: 0.08 } },
    },
    tabIndicatorTransition: { type: "spring", stiffness: 560, damping: 26 },
    modalVariants: {
      initial: { opacity: 0, scale: 0.9, rotate: -1 },
      animate: {
        opacity: 1,
        scale: 1,
        rotate: 0,
        transition: { type: "spring", stiffness: 560, damping: 24 },
      },
      exit: { opacity: 0, scale: 0.93, transition: { duration: 0.12 } },
    },
  },

  darkFantasy: {
    transition: { duration: 0.34, ease: GPU_BEZIER_STANDARD },
    pageVariants: {
      initial: { opacity: 0, y: 14, scale: 0.97 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.34, ease: GPU_BEZIER_STANDARD },
      },
      exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
    },
    cardVariants: {
      initial: { opacity: 0, y: 14, scale: 0.96 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.34, ease: GPU_BEZIER_STANDARD },
      },
      hover: { y: -3, scale: 1.01, transition: { duration: 0.24, ease: GPU_BEZIER_STANDARD } },
      tap: { scale: 0.985, transition: { duration: 0.12 } },
    },
    tabIndicatorTransition: { duration: 0.3, ease: GPU_BEZIER_STANDARD },
    modalVariants: {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.32, ease: GPU_BEZIER_STANDARD },
      },
      exit: { opacity: 0, scale: 0.96, transition: { duration: 0.18 } },
    },
  },

  anime: {
    transition: { type: "spring", stiffness: 420, damping: 26, mass: 0.78 },
    pageVariants: {
      initial: { opacity: 0, scale: 0.97, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", stiffness: 420, damping: 26, mass: 0.78 },
      },
      exit: { opacity: 0, scale: 0.98, transition: { duration: 0.16 } },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.96, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", stiffness: 420, damping: 26, mass: 0.78 },
      },
      hover: { y: -3, scale: 1.015, transition: { duration: 0.2 } },
      tap: { scale: 0.98, transition: { duration: 0.1 } },
    },
    tabIndicatorTransition: TAB_INDICATOR_SPRING,
    modalVariants: {
      initial: { opacity: 0, scale: 0.94 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 440, damping: 28 },
      },
      exit: { opacity: 0, scale: 0.96, transition: { duration: 0.16 } },
    },
  },

  manhwa: {
    transition: { duration: 0.32, ease: [0.2, 0.9, 0.2, 1] },
    pageVariants: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0.9, 0.2, 1] } },
      exit: { opacity: 0, y: -12, transition: { duration: 0.18 } },
    },
    cardVariants: {
      initial: { opacity: 0, y: 18, scale: 0.98 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.32, ease: [0.2, 0.9, 0.2, 1] },
      },
      hover: { y: -4, transition: { duration: 0.2, ease: [0.2, 0.9, 0.2, 1] } },
      tap: { scale: 0.985, transition: { duration: 0.1 } },
    },
    tabIndicatorTransition: { duration: 0.26, ease: [0.2, 0.9, 0.2, 1] },
    modalVariants: {
      initial: { opacity: 0, y: 16, scale: 0.97 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.3, ease: [0.2, 0.9, 0.2, 1] },
      },
      exit: { opacity: 0, y: 10, transition: { duration: 0.16 } },
    },
  },

  ghibli: {
    transition: { duration: 0.44, ease: GPU_BEZIER_GHIBLI },
    pageVariants: {
      initial: { opacity: 0, y: 12, scale: 0.97 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.44, ease: GPU_BEZIER_GHIBLI },
      },
      exit: { opacity: 0, y: -8, transition: { duration: 0.24 } },
    },
    cardVariants: {
      initial: { opacity: 0, y: 12, scale: 0.96 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.44, ease: GPU_BEZIER_GHIBLI },
      },
      hover: { y: -4, rotate: 0.3, transition: { duration: 0.32, ease: GPU_BEZIER_GHIBLI } },
      tap: { scale: 0.98, transition: { duration: 0.14 } },
    },
    tabIndicatorTransition: { duration: 0.36, ease: GPU_BEZIER_GHIBLI },
    modalVariants: {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: GPU_BEZIER_GHIBLI },
      },
      exit: { opacity: 0, scale: 0.96, transition: { duration: 0.22 } },
    },
  },

  "manga-ink": {
    transition: { type: "spring", stiffness: 520, damping: 28, mass: 0.72 },
    pageVariants: {
      initial: { opacity: 0, scale: 0.97, y: 8 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", stiffness: 500, damping: 28 },
      },
      exit: { opacity: 0, transition: { duration: 0.14 } },
    },
    cardVariants: {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: "spring", stiffness: 520, damping: 28, mass: 0.72 },
      },
      hover: { y: -2, scale: 1.01, transition: { type: "spring", stiffness: 540, damping: 24 } },
      tap: { scale: 0.975, transition: { duration: 0.08 } },
    },
    tabIndicatorTransition: { type: "spring", stiffness: 520, damping: 30 },
    modalVariants: {
      initial: { opacity: 0, scale: 0.94 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 500, damping: 26 },
      },
      exit: { opacity: 0, scale: 0.95, transition: { duration: 0.12 } },
    },
  },
};

export function getThemeMotionSpec(
  primarySystem: PrimarySystem,
  mangaSubTheme?: MangaSubTheme | null,
): ThemeMotionSpec {
  if (primarySystem === "manga" && mangaSubTheme && mangaSubTheme in THEME_MOTION_REGISTRY) {
    return THEME_MOTION_REGISTRY[mangaSubTheme];
  }
  return THEME_MOTION_REGISTRY[primarySystem] ?? THEME_MOTION_REGISTRY.classic;
}
