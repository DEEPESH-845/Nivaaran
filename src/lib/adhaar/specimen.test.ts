import { describe, expect, it } from "vitest";
import { isValidAadhaar } from "./verhoeff";
import {
  dotMatrix,
  groupAadhaar,
  initials,
  maskAadhaar,
  seededPalette,
  specimenNumber,
} from "./specimen";

describe("masking", () => {
  it("shows the last four digits and hides the other eight", () => {
    expect(maskAadhaar("234567890123")).toBe("XXXX XXXX 0123");
  });

  // The property that keeps AGENTS.md rule 13 true: whatever is typed, the
  // only digits that reach the DOM are the last four.
  it("never leaks a digit of the first eight", () => {
    const typed = "298765432109";
    const rendered = maskAadhaar(typed).replace(/\D/g, "");
    expect(rendered).toBe(typed.slice(-4));
    expect(maskAadhaar(typed)).not.toContain(typed.slice(0, 8));
  });

  it("masks a partial number without inventing digits", () => {
    expect(maskAadhaar("2345")).toBe("XXXX XXXX 2345");
    expect(maskAadhaar("234")).toBe("XXXX XXXX ____");
    expect(maskAadhaar("")).toBe("XXXX XXXX ____");
  });

  it("groups a full number in fours when it is meant to be shown", () => {
    expect(groupAadhaar("234567890123")).toBe("2345 6789 0123");
    expect(groupAadhaar("2345 6789 0123")).toBe("2345 6789 0123");
  });
});

describe("derivations", () => {
  it("takes initials from the first and last name", () => {
    expect(initials("Rajesh Kumar Sharma")).toBe("RS");
    expect(initials("Sunita")).toBe("S");
    expect(initials("  ")).toBe("—");
  });

  it("is deterministic for a seed and different across seeds", () => {
    expect(seededPalette("rajesh")).toEqual(seededPalette("rajesh"));
    expect(seededPalette("rajesh")).not.toEqual(seededPalette("sunita"));
    expect(dotMatrix("rajesh", 8)).toEqual(dotMatrix("rajesh", 8));
    expect(dotMatrix("rajesh", 8)).toHaveLength(64);
    expect(dotMatrix("rajesh", 8)).not.toEqual(dotMatrix("sunita", 8));
  });

  it("generates specimen numbers its own validator accepts", () => {
    for (const seed of ["rajesh", "sunita", "arun", ""]) {
      const n = specimenNumber(seed);
      expect(n).toHaveLength(12);
      expect(isValidAadhaar(n)).toBe(true);
    }
    expect(specimenNumber("rajesh")).toBe(specimenNumber("rajesh"));
    expect(specimenNumber("rajesh")).not.toBe(specimenNumber("sunita"));
  });
});
