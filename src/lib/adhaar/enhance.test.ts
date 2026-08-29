import { describe, expect, it } from "vitest";
import { shouldEnhance, type EnhanceEnv } from "./enhance";

const ok: EnhanceEnv = {
  saveData: false,
  effectiveType: "4g",
  deviceMemory: 8,
  hardwareConcurrency: 8,
  reducedMotion: false,
  webgl: true,
  optOut: false,
};

describe("shouldEnhance", () => {
  it("allows a capable, willing, fast client", () => {
    expect(shouldEnhance(ok)).toBe(true);
  });

  it("refuses whenever the reader has said no", () => {
    expect(shouldEnhance({ ...ok, optOut: true })).toBe(false);
    expect(shouldEnhance({ ...ok, reducedMotion: true })).toBe(false);
  });

  it("refuses on a connection that cannot afford it", () => {
    expect(shouldEnhance({ ...ok, saveData: true })).toBe(false);
    for (const effectiveType of ["slow-2g", "2g", "3g"]) {
      expect(shouldEnhance({ ...ok, effectiveType })).toBe(false);
    }
  });

  it("refuses on a device that cannot afford it", () => {
    expect(shouldEnhance({ ...ok, deviceMemory: 2 })).toBe(false);
    expect(shouldEnhance({ ...ok, hardwareConcurrency: 2 })).toBe(false);
    expect(shouldEnhance({ ...ok, webgl: false })).toBe(false);
  });

  // Safari reports none of these. Absence is not evidence of a slow client,
  // and refusing on absence would mean never enhancing on a Mac.
  it("allows when the client reports nothing at all", () => {
    expect(
      shouldEnhance({ ...ok, effectiveType: null, deviceMemory: null, hardwareConcurrency: null }),
    ).toBe(true);
  });
});
