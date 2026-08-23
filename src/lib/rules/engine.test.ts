import { describe, expect, it } from "vitest";
import { daysUntilFilable, jdCategory, preflight } from "./engine";
import type { Facts } from "./types";

/** A member with nothing wrong. Individual tests break one thing at a time. */
const clean = (over: Partial<Facts> = {}): Facts => ({
  intent: "final_settlement",
  daysSinceExit: 90,
  exitDateFiled: "yes",
  uanAadhaarVerified: "yes",
  uanBeforeOct2017: "no",
  multipleUans: "no",
  serviceYears: 7,
  claimAmount: 142000,
  panOnRecord: true,
  records: {
    epfo: { name: "ARUN MENON", dob: "1990-06-14", ifsc: "HDFC0001234", accountLast4: "8842" },
    aadhaar: { name: "Arun Menon", dob: "1990-06-14" },
    bank: { name: "Arun Menon", ifsc: "HDFC0001234", accountLast4: "8842" },
  },
  ...over,
});

describe("jdCategory", () => {
  it("puts a post-Oct-2017 Aadhaar-verified UAN in the self-service category", () => {
    expect(jdCategory(clean())).toBe("A");
  });
  it("puts a pre-Oct-2017 but Aadhaar-verified UAN in category B", () => {
    expect(jdCategory(clean({ uanBeforeOct2017: "yes" }))).toBe("B");
  });
  it("puts an unverified UAN in category C regardless of age", () => {
    expect(jdCategory(clean({ uanAadhaarVerified: "no" }))).toBe("C");
    expect(jdCategory(clean({ uanAadhaarVerified: "unsure" }))).toBe("C");
  });
});

describe("preflight", () => {
  it("clears a fully consistent record and flags auto-settlement", () => {
    const r = preflight(clean());
    expect(r.verdict).toBe("clear");
    expect(r.counts.blockers).toBe(0);
    expect(r.findings.some((f) => f.ruleId === "R-AUTOSETTLE")).toBe(true);
  });

  it("does not promise auto-settlement above the ceiling", () => {
    const r = preflight(clean({ claimAmount: 900000 }));
    expect(r.verdict).toBe("clear");
    expect(r.findings.some((f) => f.ruleId === "R-AUTOSETTLE")).toBe(false);
  });

  it("catches the initialised middle name and calls it citizen-fixable", () => {
    const r = preflight(
      clean({
        records: {
          ...clean().records,
          aadhaar: { name: "Arun K Menon", dob: "1990-06-14" },
          epfo: { name: "ARUN KUMAR MENON", dob: "1990-06-14", ifsc: "HDFC0001234", accountLast4: "8842" },
        },
      }),
    );
    const hit = r.findings.find((f) => f.ruleId === "R-NAME-AADHAAR");
    expect(hit).toBeDefined();
    expect(hit!.owner).toBe("citizen");
    expect(r.verdict).toBe("fixable");
  });

  it("routes an unverified member's correction to the employer", () => {
    const r = preflight(
      clean({
        uanAadhaarVerified: "no",
        exitDateFiled: "no",
      }),
    );
    expect(r.verdict).toBe("blocked_external");
    expect(r.findings.find((f) => f.ruleId === "R-EXIT-DATE")!.owner).toBe("employer");
  });

  it("lets an Aadhaar-verified member mark their own exit", () => {
    const r = preflight(clean({ exitDateFiled: "no" }));
    expect(r.findings.find((f) => f.ruleId === "R-EXIT-DATE")!.owner).toBe("citizen");
    expect(r.verdict).toBe("fixable");
  });

  it("detects a retired IFSC prefix", () => {
    const r = preflight(
      clean({
        records: {
          ...clean().records,
          bank: { name: "Arun Menon", ifsc: "CORP0001234", accountLast4: "8842" },
        },
      }),
    );
    expect(r.findings.some((f) => f.ruleId === "R-IFSC")).toBe(true);
  });

  it("rejects a malformed IFSC", () => {
    const r = preflight(
      clean({
        records: {
          ...clean().records,
          bank: { name: "Arun Menon", ifsc: "HDFC1234", accountLast4: "8842" },
        },
      }),
    );
    expect(r.findings.some((f) => f.ruleId === "R-IFSC")).toBe(true);
  });

  it("blocks a final settlement filed before sixty days and says how many remain", () => {
    const r = preflight(clean({ daysSinceExit: 41 }));
    const hit = r.findings.find((f) => f.ruleId === "R-WAIT-60D");
    expect(hit).toBeDefined();
    expect(hit!.owner).toBe("time");
    expect(hit!.title.en).toContain("19");
  });

  it("does not apply the sixty-day rule when decoding a past rejection", () => {
    const r = preflight(clean({ daysSinceExit: 10, intent: "decode_rejection" }));
    expect(r.findings.some((f) => f.ruleId === "R-WAIT-60D")).toBe(false);
  });

  it("warns about TDS only under five years and above the threshold", () => {
    expect(
      preflight(clean({ serviceYears: 3, claimAmount: 142000 })).findings.some(
        (f) => f.ruleId === "R-TDS-192A",
      ),
    ).toBe(true);
    expect(
      preflight(clean({ serviceYears: 3, claimAmount: 40000 })).findings.some(
        (f) => f.ruleId === "R-TDS-192A",
      ),
    ).toBe(false);
    expect(
      preflight(clean({ serviceYears: 9, claimAmount: 900000 })).findings.some(
        (f) => f.ruleId === "R-TDS-192A",
      ),
    ).toBe(false);
  });

  it("a TDS warning alone never blocks the claim", () => {
    const r = preflight(clean({ serviceYears: 3, claimAmount: 142000 }));
    expect(r.verdict).toBe("clear");
    expect(r.counts.warnings).toBe(1);
  });

  it("orders employer-owned work ahead of citizen-owned work", () => {
    const r = preflight(clean({ uanAadhaarVerified: "no", exitDateFiled: "no" }));
    const owners = r.findings.filter((f) => f.severity === "blocker").map((f) => f.owner);
    expect(owners.indexOf("employer")).toBeLessThan(owners.lastIndexOf("citizen"));
  });

  it("sums only citizen-owned effort into minutesToFix", () => {
    const r = preflight(clean({ daysSinceExit: 20 }));
    expect(r.findings.some((f) => f.ruleId === "R-WAIT-60D")).toBe(true);
    expect(r.minutesToFix).toBe(0);
  });

  it("reports the longest queue time as the earliest filing date", () => {
    const r = preflight(clean({ multipleUans: "yes" }));
    expect(daysUntilFilable(r)).toBe(20);
  });

  it("is deterministic — identical facts give an identical verdict", () => {
    const f = clean({ exitDateFiled: "no", daysSinceExit: 30 });
    const a = preflight(f, new Date("2026-08-23T00:00:00Z"));
    const b = preflight(f, new Date("2026-08-23T00:00:00Z"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("every finding cites a source and carries both languages", () => {
    const r = preflight(clean({ uanAadhaarVerified: "no", exitDateFiled: "no", multipleUans: "yes", serviceYears: 2 }));
    expect(r.findings.length).toBeGreaterThan(2);
    for (const f of r.findings) {
      expect(f.sourceId).toBeTruthy();
      expect(f.title.en.length).toBeGreaterThan(0);
      expect(f.title.hi.length).toBeGreaterThan(0);
      expect(f.why.hi.length).toBeGreaterThan(0);
      expect(f.fix.summary.hi.length).toBeGreaterThan(0);
    }
  });
});
