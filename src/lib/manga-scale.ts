/**
 * Centralized responsive scaling utility for Manga UI cards and typography.
 * Applies clamped, device-proportional sizing via CSS classes scoped under
 * `html[data-ui="manga"]` without mutating the root <html> rem scale or
 * affecting Classic / Nexus / Minimal UI modes.
 */
export const MANGA_SCALE = {
  /** Responsive card padding + internal gap utility for manga panels & entity cards */
  card: "manga-card-scale",
  /** Responsive chapter banner padding utility */
  banner: "manga-banner-scale",
  /** Responsive multi-column card grid utility */
  grid: "manga-grid-scale",
  /** Clamped chapter / dossier headline scale (never globally oversized) */
  heroTitle: "manga-type-hero",
  /** Clamped entity card / TOC plate title scale */
  cardTitle: "manga-type-card",
  /** Clamped panel caption / subsection heading scale */
  sectionTitle: "manga-type-section",
  /** Clamped description / dialogue / thought-box body copy scale */
  body: "manga-type-body",
  /** Clamped stamp / badge / chapter number metadata scale */
  meta: "manga-type-meta",
  /** Responsive compact portrait dimensions for entity cards */
  portraitCard: "manga-portrait-card",
  /** Responsive dossier portrait dimensions */
  portraitDossier: "manga-portrait-dossier",
} as const;

export type MangaScaleRole = keyof typeof MANGA_SCALE;

export function getMangaScaleClass(role: MangaScaleRole, extra = ""): string {
  return extra ? `${MANGA_SCALE[role]} ${extra}` : MANGA_SCALE[role];
}
