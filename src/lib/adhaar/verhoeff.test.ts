import { describe, expect, it } from "vitest";
import { isValidAadhaar, verhoeffCheckDigit, verhoeffValidate } from "./verhoeff";

describe("verhoeff", () => {
  // The published worked example. Not an Aadhaar — just the algorithm's own
  // vector, so a transcription error in the tables fails here rather than
  // silently rejecting real numbers.
  it("reproduces the published check digit for 236", () => {
    expect(verhoeffCheckDigit("236")).toBe(3);
    expect(verhoeffValidate("2363")).toBe(true);
  });

  it("catches the two errors it exists to catch", () => {
    expect(verhoeffValidate("2463")).toBe(false); // single-digit substitution
    expect(verhoeffValidate("3263")).toBe(false); // adjacent transposition
    expect(verhoeffValidate("2363")).toBe(true);
  });

  it("accepts a well-formed Aadhaar and rejects a mistyped one", () => {
    const body = "23456789012";
    const full = body + verhoeffCheckDigit(body);
    expect(isValidAadhaar(full)).toBe(true);
    // Swap the first two digits: still twelve digits, still starts 2-9.
    expect(isValidAadhaar(full[1] + full[0] + full.slice(2))).toBe(false);
  });

  it("rejects anything that is not twelve digits starting 2-9", () => {
    expect(isValidAadhaar("1234 5678 9012")).toBe(false);
    expect(isValidAadhaar("2345")).toBe(false);
    expect(isValidAadhaar("2345 6789 012a")).toBe(false);
  });

  it("ignores the spaces people actually type", () => {
    const body = "23456789012";
    const full = body + verhoeffCheckDigit(body);
    expect(isValidAadhaar(`${full.slice(0, 4)} ${full.slice(4, 8)} ${full.slice(8)}`)).toBe(true);
  });
});
