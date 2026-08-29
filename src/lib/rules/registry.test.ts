import { describe, expect, it } from "vitest";
import { personaById } from "@/content/personas";
import { ROSTER } from "@/content/roster";
import { preflight } from "./engine";
import { RULES, RULE_IDS, RULE_META, ruleMeta } from "./rules";
import { SOURCES } from "./sources";
import type { Facts } from "./types";

/**
 * The registry is hand-written, which means it can drift from the rules it
 * claims to describe. These tests are the thing that stops that: every id the
 * engine can actually emit must be in the registry, and the registry must not
 * invent one that no rule produces.
 */

/** A record that trips every rule at once. Synthetic, obviously. */
const EVERYTHING_WRONG: Facts = {
  intent: "final_settlement",
  daysSinceExit: 12,
  exitDateFiled: "no",
  uanAadhaarVerified: "no",
  uanBeforeOct2017: "yes",
  multipleUans: "yes",
  serviceYears: 2,
  claimAmount: 240000,
  panOnRecord: false,
  records: {
    epfo: { name: "RAJESH K SHARMA", dob: "1996-08-03", ifsc: "CORP0001234", accountLast4: "8842" },
    aadhaar: { name: "Rajesh Kumar Sharma", dob: "1996-03-08" },
    // ifscValid comes from the bank directory lookup, exactly as the live
    // journey supplies it. Format alone is not enough to trip R-IFSC.
    bank: {
      name: "R K Sharma",
      ifsc: "CORP0001234",
      accountLast4: "8842",
      ifscValid: false,
      ifscRetiredTo: "UBIN",
    },
  },
};

/** Every finding the engine can produce across every record in the repo. */
function everyEmittedId(): Set<string> {
  const ids = new Set<string>();
  const records: Facts[] = [
    EVERYTHING_WRONG,
    ...["rajesh", "sunita", "arun"].map((id) => personaById(id)!.facts),
    ...ROSTER.map((l) => l.facts),
  ];
  for (const facts of records) {
    for (const f of preflight(facts).findings) ids.add(f.ruleId);
  }
  return ids;
}

describe("rule registry", () => {
  it("trips every rule with the maximally broken record", () => {
    // If this drops, the fixture has stopped exercising the engine and the
    // coverage assertion below becomes vacuous.
    expect(preflight(EVERYTHING_WRONG).findings.length).toBe(RULES.length);
  });

  it("registers every id the engine can emit", () => {
    for (const id of everyEmittedId()) {
      expect(RULE_IDS, `${id} is emitted but not in RULE_META`).toContain(id);
    }
  });

  it("registers no id the engine cannot emit", () => {
    const emitted = everyEmittedId();
    for (const id of RULE_IDS) {
      expect(emitted, `${id} is registered but no record produces it`).toContain(id);
    }
  });

  it("covers one entry per rule, plus the auto-settlement note", () => {
    expect(RULE_META.length).toBe(RULES.length + 1);
  });

  it("has no duplicate ids", () => {
    expect(new Set(RULE_IDS).size).toBe(RULE_IDS.length);
  });

  it("points every rule at a source that exists", () => {
    for (const rule of RULE_META) {
      expect(SOURCES[rule.sourceId], `${rule.id} cites a missing source`).toBeDefined();
    }
  });

  it("dates every review, and never in the future", () => {
    const now = Date.now();
    for (const rule of RULE_META) {
      expect(rule.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Date.parse(rule.reviewedOn)).toBeLessThanOrEqual(now);
    }
  });

  it("explains itself whenever a rule is not verified", () => {
    // An unverified rule with no reason is worse than no status at all: it
    // tells a reader something is off and nothing about what.
    for (const rule of RULE_META) {
      if (rule.status === "verified") continue;
      if (rule.note) {
        expect(rule.note.en.length).toBeGreaterThan(0);
        expect(rule.note.hi.length).toBeGreaterThan(0);
      } else {
        // No note of its own is acceptable only when the source carries one.
        expect(SOURCES[rule.sourceId].note, `${rule.id} is ${rule.status} with no explanation`).toBeTruthy();
      }
    }
  });

  it("looks up by id", () => {
    expect(ruleMeta("R-IFSC")?.sourceId).toBe("ifsc-mergers");
    expect(ruleMeta("R-NOT-A-RULE")).toBeUndefined();
  });
});
