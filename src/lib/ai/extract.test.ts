import { describe, expect, it } from "vitest";
import { ExtractSchema, scrub, type Extracted } from "./extract";

const base: Extracted = {
  docType: "identity",
  name: "Rajesh Kumar Sharma",
  dob: "1996-03-08",
  ifsc: "CORP0001234",
  accountLast4: "8842",
  confidence: "high",
  quality: "clear",
};

describe("scrub — the server-side redaction", () => {
  it("passes a clean reading through unchanged", () => {
    expect(scrub(base)).toEqual({
      name: "Rajesh Kumar Sharma",
      dob: "1996-03-08",
      ifsc: "CORP0001234",
      accountLast4: "8842",
    });
  });

  it("strips digits from a name, so an identifier cannot ride along in it", () => {
    expect(scrub({ ...base, name: "Rajesh Kumar Sharma 2345 6789 0123" }).name).toBe(
      "Rajesh Kumar Sharma",
    );
  });

  it("caps an over-long name at 80 characters", () => {
    const long = scrub({ ...base, name: "Ram ".repeat(60) }).name;
    expect(long).not.toBeNull();
    expect(long!.length).toBeLessThanOrEqual(80);
  });

  it("keeps a name written in Devanagari", () => {
    expect(scrub({ ...base, name: "राजेश कुमार शर्मा" }).name).toBe("राजेश कुमार शर्मा");
  });

  it("nulls an IFSC that is not the documented shape", () => {
    expect(scrub({ ...base, ifsc: "CORP1234567" }).ifsc).toBeNull();
    expect(scrub({ ...base, ifsc: "NOT AN IFSC" }).ifsc).toBeNull();
    expect(scrub({ ...base, ifsc: " corp0001234 " }).ifsc).toBe("CORP0001234");
  });

  it("nulls an account fragment that is not exactly four digits", () => {
    expect(scrub({ ...base, accountLast4: "123456" }).accountLast4).toBeNull();
    expect(scrub({ ...base, accountLast4: "88A2" }).accountLast4).toBeNull();
    expect(scrub({ ...base, accountLast4: "0042" }).accountLast4).toBe("0042");
  });

  it("nulls an impossible date rather than showing it as fact", () => {
    expect(scrub({ ...base, dob: "1996-13-08" }).dob).toBeNull();
    expect(scrub({ ...base, dob: "08/03/1996" }).dob).toBeNull();
    expect(scrub({ ...base, dob: "1996-03-08" }).dob).toBe("1996-03-08");
  });

  it("returns nulls, not junk, when nothing was legible", () => {
    expect(
      scrub({ ...base, name: null, dob: null, ifsc: null, accountLast4: null }),
    ).toEqual({ name: null, dob: null, ifsc: null, accountLast4: null });
  });
});

describe("ExtractSchema — redaction by construction", () => {
  it("has no field capable of holding a government identifier", () => {
    expect(Object.keys(ExtractSchema.shape).sort()).toEqual([
      "accountLast4",
      "confidence",
      "dob",
      "docType",
      "ifsc",
      "name",
      "quality",
    ]);
  });

  it("rejects a payload that carries an extra identifier-shaped key", () => {
    const result = ExtractSchema.safeParse({ ...base, aadhaarNumber: "2345 6789 0123" });
    expect(result.success).toBe(false);
  });

  it("rejects a date that is not ISO, so the client never renders one", () => {
    expect(ExtractSchema.safeParse({ ...base, dob: "08-03-1996" }).success).toBe(false);
  });
});
