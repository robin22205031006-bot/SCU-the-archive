import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { ArsenalFx } from "@/components/arsenal-fx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  let intersect: IntersectionObserverCallback | undefined;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { intersect = callback; }
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const ctx = { clearRect: vi.fn(), setTransform: vi.fn(), globalCompositeOperation: "" };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  const request = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
  const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  const setVisible = (visible: boolean) => act(() => {
    intersect?.([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver);
  });
  return { request, cancel, setVisible };
}

describe("invisible Arsenal effects", () => {
  it("schedules frames only while onscreen and cancels them when offscreen", () => {
    const { request, cancel, setVisible } = setup();
    render(<ArsenalFx layers={[]} animate />);
    expect(request).not.toHaveBeenCalled();
    setVisible(true);
    expect(request).toHaveBeenCalledTimes(1);
    setVisible(false);
    expect(cancel).toHaveBeenCalledWith(42);
    setVisible(true);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("stops frames in a hidden browser tab and resumes on return", () => {
    const { request, cancel, setVisible } = setup();
    let hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
    render(<ArsenalFx layers={[]} animate />);
    setVisible(true);
    hidden = true;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(cancel).toHaveBeenCalledWith(42);
    hidden = false;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(request).toHaveBeenCalledTimes(2);
  });
});