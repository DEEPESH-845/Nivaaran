import { describe, expect, it } from "vitest";
import { preflight } from "./engine";
import { RULES } from "./rules";
import { SOURCES, SOURCE_LIST } from "./sources";
import type { Facts } from "./types";

/**
 * Source governance, enforced rather than promised.
 *
 * `docs/ARCHITECTURE.md` §10 commits to "re-verification dates enforced in
 * CI". This is that. A rule whose citation has not been re-checked in 90 days
 * fails the build, and the failure names the source, the rules that depend on
 * it, and the caveat we already knew about — so re-verifying is a task, not an
 * investigation.
 *
 * If this test is failing: open each URL below, confirm the claim still holds,
 * and move `verifiedOn` forward. Do not move the date without opening the URL.
 */

const MAX_AGE_DAYS = 90;
const DAY_MS = 86_400_000;

/** A record that trips every rule at once, so the citation map is complete. */
const BROKEN: Facts = {
  intent: "final_settlement",
  daysSinceExit: 20, // R-WAIT-60D
  exitDateFiled: "no", // R-EXIT-DATE
  uanAadhaarVerified: "no", // R-AADHAAR-SEED
  uanBeforeOct2017: "yes",
  multipleUans: "yes", // R-MULTI-UAN
  serviceYears: 3, // R-TDS-192A with the amount below
  claimAmount: 142000,
  panOnRecord: false,
  records: {
    epfo: { name: "RAJESH K SHARMA", dob: "1996-03-08", ifsc: "CORP0001234", accountLast4: "8842" },
    aadhaar: { name: "Rajesh Kumar Sharma", dob: "1996-08-03" }, // R-NAME-AADHAAR, R-DOB-AADHAAR
    bank: { name: "R K Sharma", ifsc: "CORP0001234", ifscValid: false, ifscRetiredTo: "Union Bank of India", accountLast4: "8842" }, // R-BANK-NAME, R-IFSC
  },
};

/** ruleId → sourceId, read off the engine rather than kept in a second list. */
const CITATIONS = preflight(BROKEN).findings.map((f) => ({
  ruleId: f.ruleId,
  sourceId: f.sourceId,
}));

const rulesCiting = (sourceId: string) =>
  CITATIONS.filter((c) => c.sourceId === sourceId).map((c) => c.ruleId);

const daysOld = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / DAY_MS);

describe("the citation map", () => {
  it("fires every rule, so nothing is silently uncovered by these checks", () => {
    expect(CITATIONS).toHaveLength(RULES.length);
  });

  it("cites a source that exists for every finding the engine can produce", () => {
    const dangling = CITATIONS.filter((c) => !SOURCES[c.sourceId]);
    expect(dangling).toEqual([]);
  });
});

describe("every source entry", () => {
  it.each(SOURCE_LIST)("$id is shaped like a citation", (src) => {
    expect(src.title.length).toBeGreaterThan(10);
    expect(src.publisher.length).toBeGreaterThan(2);
    expect(src.url).toMatch(/^https:\/\//);
    expect(src.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(src.verifiedOn))).toBe(false);
    expect(["high", "medium", "low"]).toContain(src.confidence);
  });

  it.each(SOURCE_LIST)("$id was not verified in the future", (src) => {
    expect(daysOld(src.verifiedOn)).toBeGreaterThanOrEqual(0);
  });

  it.each(SOURCE_LIST)("$id carries an honest caveat if it is not high confidence", (src) => {
    if (src.confidence !== "high") {
      expect(src.note, `${src.id} is ${src.confidence} confidence with no note`).toBeTruthy();
    }
  });
});

describe("re-verification", () => {
  it.each(SOURCE_LIST)(`$id was re-checked within ${MAX_AGE_DAYS} days`, (src) => {
    const age = daysOld(src.verifiedOn);
    const rules = rulesCiting(src.id);
    const message = [
      ``,
      `Source "${src.id}" was last verified ${src.verifiedOn} — ${age} days ago.`,
      `Rules depending on it: ${rules.length ? rules.join(", ") : "(none currently firing)"}`,
      `Re-check: ${src.url}`,
      `Claim: ${src.title}`,
      src.note ? `Known caveat: ${src.note}` : ``,
      `Confirm the claim still holds, then move verifiedOn in src/lib/rules/sources.ts.`,
      `Do not move the date without opening the URL.`,
    ]
      .filter(Boolean)
      .join("\n");
    expect(age, message).toBeLessThanOrEqual(MAX_AGE_DAYS);
  });
});
