import { describe, expect, it } from "vitest";
import { UI, pick } from "./strings";

/**
 * Bilingual parity is a product promise, not a nice-to-have: a Hindi reader
 * who hits an English error has been dropped out of the product at the exact
 * moment they needed it. This is the check that a new string cannot be added
 * in one language only.
 */
describe("UI strings", () => {
  const entries = Object.entries(UI);

  it("has a non-empty English and Hindi form for every key", () => {
    for (const [key, bi] of entries) {
      expect(bi.en.trim().length, `${key}.en is empty`).toBeGreaterThan(0);
      expect(bi.hi.trim().length, `${key}.hi is empty`).toBeGreaterThan(0);
    }
  });

  it("never leaves Hindi as a copy of the English", () => {
    // A handful of strings are legitimately identical across languages —
    // brand names and the language toggle's own label.
    const identicalByDesign = new Set(["brand", "langLabel"]);
    for (const [key, bi] of entries) {
      if (identicalByDesign.has(key)) continue;
      expect(bi.hi, `${key} was never translated`).not.toBe(bi.en);
    }
  });

  it("writes Hindi in Devanagari", () => {
    const devanagari = /[\u0900-\u097F]/;
    const latinOnlyByDesign = new Set(["brand", "langLabel"]);
    for (const [key, bi] of entries) {
      if (latinOnlyByDesign.has(key)) continue;
      expect(devanagari.test(bi.hi), `${key}.hi has no Devanagari`).toBe(true);
    }
  });

  it("covers every error code the API can put in front of a user", () => {
    const codes = [
      "bad_credentials", "rate_limited", "already_registered", "invalid_email",
      "too_short", "too_long", "too_simple", "looks_like_email", "network", "generic",
    ];
    for (const code of codes) {
      expect(UI, `no UI string for err_${code}`).toHaveProperty(`err_${code}`);
    }
  });

  it("falls back to English rather than rendering nothing", () => {
    expect(pick({ en: "Sign in", hi: "" }, "hi")).toBe("Sign in");
    expect(pick({ en: "Sign in", hi: "साइन इन" }, "hi")).toBe("साइन इन");
  });
});
