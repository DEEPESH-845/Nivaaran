import { describe, expect, it } from "vitest";
import { DIMENSIONS, frictionScore } from "./friction";

describe("friction score", () => {
  it("stays inside the published 0–10 range for every column", () => {
    for (const col of ["epfo", "nivaaran", "nivaaranReal"] as const) {
      const s = frictionScore(col);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(10);
    }
  });

  it("scores the current experience as worse than either of ours", () => {
    expect(frictionScore("epfo")).toBeGreaterThan(frictionScore("nivaaranReal"));
    expect(frictionScore("nivaaranReal")).toBeGreaterThanOrEqual(frictionScore("nivaaran"));
  });

  it("never counts a dimension above its cap", () => {
    for (const d of DIMENSIONS) {
      expect(d.epfo).toBeLessThanOrEqual(d.cap);
      expect(d.nivaaranReal).toBeLessThanOrEqual(d.cap);
    }
  });

  it("keeps every dimension defined in both languages", () => {
    for (const d of DIMENSIONS) {
      expect(d.label.hi.length).toBeGreaterThan(0);
      expect(d.definition.hi.length).toBeGreaterThan(0);
    }
  });
});
