export interface BackdropCanvasDimensions {
  renderWidth: number;
  renderHeight: number;
  pixelRatio: number;
}

/**
 * Scales the ambient backdrop WebGL canvas resolution down to slash shader fill-rate
 * while letting CSS upscale cleanly over the full viewport behind crisp DOM typography.
 */
export function computeBackdropCanvasDimensions(
  containerWidth: number,
  containerHeight: number,
  isSoftwareGl: boolean,
  devicePixelRatio = 1,
): BackdropCanvasDimensions {
  const scale = isSoftwareGl ? 0.28 : 0.5;
  const clampedW = Math.max(containerWidth, 320);
  const clampedH = Math.max(containerHeight, 320);
  const rawW = Math.round(clampedW * scale);
  const rawH = Math.round(clampedH * scale);
  return {
    renderWidth: isSoftwareGl ? Math.max(160, Math.min(420, rawW)) : Math.max(160, rawW),
    renderHeight: isSoftwareGl ? Math.max(160, Math.min(260, rawH)) : Math.max(160, rawH),
    pixelRatio: isSoftwareGl ? 1 : Math.min(Math.max(devicePixelRatio || 1, 1), 1),
  };
}

/** Caps WebGL backdrop tick cadence to avoid starving scroll/input compositing. */
export function getBackdropFrameIntervalMs(isSoftwareGl: boolean): number {
  return isSoftwareGl ? 240 : 42;
}

/** Idle continuous breathing animations on every card stall dense grids (>12 cards). */
export function shouldAnimateGridCardIdle(visibleCardCount: number): boolean {
  return visibleCardCount > 0 && visibleCardCount <= 12;
}
