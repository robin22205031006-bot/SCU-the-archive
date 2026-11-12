import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  resolveStaticEmblems,
  resolveNexusEmblemMotion,
  useStaticNexusEmblems,
  staticEmblemPresentation,
  setStaticNexusEmblems,
  setNexusEmblemMotion,
  NEXUS_STATIC_EMBLEMS_KEY,
} from "@/hooks/use-nexus-emblem-motion";
import { useNexusMotion } from "@/hooks/use-nexus-motion";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

it("static-emblem preference replaces motion with static artwork", () => {
  expect(staticEmblemPresentation(true, true)).toBe(true);
  expect(staticEmblemPresentation(false, true)).toBe(false);
});
it("defaults to following the device and preserves existing static preferences", () => {
  expect(resolveNexusEmblemMotion(null)).toBe("system");
  expect(resolveNexusEmblemMotion("false")).toBe("system");
  expect(resolveNexusEmblemMotion("true")).toBe("static");
});
it("saves the explicit follow-device option", () => {
  setNexusEmblemMotion("system");
  expect(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY)).toBe("system");
  expect(resolveNexusEmblemMotion(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY))).toBe("system");
});
it("follow-device emblems update immediately when the device preference changes", () => {
  let reduced = false;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    media: query,
    get matches() {
      return reduced;
    },
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === "function") listeners.add(listener as () => void);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === "function") listeners.delete(listener as () => void);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  }));
  setNexusEmblemMotion("system");
  const { result, unmount } = renderHook(() =>
    staticEmblemPresentation(useStaticNexusEmblems(), useNexusMotion()),
  );
  expect(result.current).toBe(false);
  act(() => {
    reduced = true;
    listeners.forEach((notify) => notify());
  });
  expect(result.current).toBe(true);
  act(() => {
    reduced = false;
    listeners.forEach((notify) => notify());
  });
  expect(result.current).toBe(false);
  act(() => setNexusEmblemMotion("static"));
  expect(result.current).toBe(true);
  unmount();
  expect(listeners.size).toBe(0);
});
it("system reduced motion and paused animations always use static artwork", () => {
  expect(staticEmblemPresentation(false, false)).toBe(true);
  expect(staticEmblemPresentation(true, false)).toBe(true);
});
it("the reader's static-emblem preference persists without changing other motion settings", () => {
  localStorage.setItem("scu-nexus-theme", "fire");
  setStaticNexusEmblems(true);
  expect(resolveStaticEmblems(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY))).toBe(true);
  expect(localStorage.getItem("scu-nexus-theme")).toBe("fire");
  setStaticNexusEmblems(false);
  expect(resolveStaticEmblems(localStorage.getItem(NEXUS_STATIC_EMBLEMS_KEY))).toBe(false);
});
