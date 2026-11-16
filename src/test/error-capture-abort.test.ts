import { describe, expect, it, vi } from "vitest";
import { consumeLastCapturedError, describeError, isClientAbortError } from "@/lib/error-capture";

describe("error-capture client abort handling", () => {
  it("identifies aborted request and stream errors including nested causes", () => {
    const plainAbort = new Error("aborted");
    expect(isClientAbortError(plainAbort)).toBe(true);

    const wrappedAbort = new Error("aborted", { cause: new Error("aborted") });
    expect(isClientAbortError(wrappedAbort)).toBe(true);

    const domAbort = new Error("The user aborted a request.");
    domAbort.name = "AbortError";
    expect(isClientAbortError(domAbort)).toBe(true);

    const streamClose = Object.assign(new Error("Premature close"), {
      code: "ERR_STREAM_PREMATURE_CLOSE",
    });
    expect(isClientAbortError(streamClose)).toBe(true);

    expect(isClientAbortError(new Error("Database offline"))).toBe(false);
    const timeout = new Error("Request timed out");
    timeout.name = "TimeoutError";
    expect(isClientAbortError(timeout)).toBe(false);
    expect(isClientAbortError(null)).toBe(false);
  });

  it("formats genuine error cause chains while skipping aborted errors", () => {
    const root = new Error("root failure");
    const outer = new Error("outer failure", { cause: root });
    const described = describeError(outer);
    expect(described).toContain("outer failure");
    expect(described).toContain("caused by:");
    expect(described).toContain("root failure");

    // Client abort errors should not be recorded as lastCapturedError
    consumeLastCapturedError();
    console.error(new Error("aborted", { cause: new Error("aborted") }));
    expect(consumeLastCapturedError()).toBeUndefined();
  });

  it("returns 499 cleanly in server entry when a request signal is already aborted", async () => {
    const { default: server } = await import("@/server");
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const controller = new AbortController();
      controller.abort(new Error("aborted"));
      const req = new Request("http://localhost:3000/abilities", { signal: controller.signal });
      const res = await server.fetch(req, {}, {});
      expect(res.status).toBe(499);
      expect(errSpy).not.toHaveBeenCalled();
    } finally {
      errSpy.mockRestore();
    }
  });
});
