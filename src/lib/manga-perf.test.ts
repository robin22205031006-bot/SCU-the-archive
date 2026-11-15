import { describe, expect, it } from "vitest";
import {
  computeBackdropCanvasDimensions,
  getBackdropFrameIntervalMs,
  shouldAnimateGridCardIdle,
} from "./manga-perf";

describe("manga-perf", () => {
  it("computeBackdropCanvasDimensions downscales WebGL backdrop buffer safely", () => {
    const gpu = computeBackdropCanvasDimensions(1440, 900, false, 2);
    expect(gpu.pixelRatio).toBe(1);
    expect(gpu.renderWidth).toBeLessThan(1440);
    expect(gpu.renderHeight).toBeLessThan(900);
    expect(gpu.renderWidth).toBeGreaterThanOrEqual(700);

    const sw = computeBackdropCanvasDimensions(100, 100, true, 2);
    expect(sw.pixelRatio).toBe(1);
    expect(sw.renderWidth).toBe(160);
    expect(sw.renderHeight).toBe(160);
  });

  it("getBackdropFrameIntervalMs paces GPU vs software GL loops", () => {
    expect(getBackdropFrameIntervalMs(false)).toBeGreaterThanOrEqual(30);
    expect(getBackdropFrameIntervalMs(true)).toBeGreaterThanOrEqual(140);
  });

  it("shouldAnimateGridCardIdle disables per-card idle loops on dense grids", () => {
    expect(shouldAnimateGridCardIdle(0)).toBe(false);
    expect(shouldAnimateGridCardIdle(6)).toBe(true);
    expect(shouldAnimateGridCardIdle(12)).toBe(true);
    expect(shouldAnimateGridCardIdle(13)).toBe(false);
  });
});
