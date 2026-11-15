import test from "node:test";
import assert from "node:assert/strict";
import {
  computeBackdropCanvasDimensions,
  getBackdropFrameIntervalMs,
  shouldAnimateGridCardIdle,
} from "./manga-perf";

test("computeBackdropCanvasDimensions downscales WebGL backdrop buffer safely", () => {
  const gpu = computeBackdropCanvasDimensions(1440, 900, false, 2);
  assert.equal(gpu.pixelRatio, 1);
  assert.ok(gpu.renderWidth < 1440);
  assert.ok(gpu.renderHeight < 900);
  assert.ok(gpu.renderWidth >= 700);

  const sw = computeBackdropCanvasDimensions(100, 100, true, 2);
  assert.equal(sw.pixelRatio, 1);
  assert.equal(sw.renderWidth, 160);
  assert.equal(sw.renderHeight, 160);
});

test("getBackdropFrameIntervalMs paces GPU vs software GL loops", () => {
  assert.ok(getBackdropFrameIntervalMs(false) >= 30);
  assert.ok(getBackdropFrameIntervalMs(true) >= 140);
});

test("shouldAnimateGridCardIdle disables per-card idle loops on dense grids", () => {
  assert.equal(shouldAnimateGridCardIdle(0), false);
  assert.equal(shouldAnimateGridCardIdle(6), true);
  assert.equal(shouldAnimateGridCardIdle(12), true);
  assert.equal(shouldAnimateGridCardIdle(13), false);
});
