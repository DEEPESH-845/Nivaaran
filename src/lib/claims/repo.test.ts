import { beforeEach, describe, expect, it } from "vitest";
import { personaById } from "@/content/personas";
import { db } from "@/lib/db/store";
import { preflight } from "@/lib/rules/engine";
import { claimState } from "./state";
import {
  activityFor,
  advanceStatus,
  fileClaim,
  getCase,
  markFixed,
  recordPreflight,
  resetCase,
  setFacts,
  startCase,
} from "./repo";

const ALICE = "user-alice";
const BOB = "user-bob";
const facts = () => structuredClone(personaById("rajesh")!.facts);

beforeEach(() => {
  for (const key of Object.keys(db.cases)) delete db.cases[key];
  for (const key of Object.keys(db.activity)) delete db.activity[key];
});

describe("case ownership", () => {
  it("keeps one user's case entirely out of another's", () => {
    startCase(ALICE, "rajesh", facts());
    expect(getCase(ALICE)).not.toBeNull();
    expect(getCase(BOB)).toBeNull();
  });

  it("scopes every mutation to the owner passed in", () => {
    startCase(ALICE, "rajesh", facts());
    // Bob asking to fix a rule cannot touch Alice's case, because there is no
    // call shape that lets him name it.
    expect(markFixed(BOB, "R-NAME-AADHAAR")).toBeNull();
    expect(getCase(ALICE)!.resolved).toEqual([]);
  });

  it("scopes activity to the owner", () => {
    startCase(ALICE, "rajesh", facts());
    expect(activityFor(ALICE).length).toBeGreaterThan(0);
    expect(activityFor(BOB)).toEqual([]);
  });
});

describe("the fix loop", () => {
  it("re-runs the engine against the corrected record", () => {
    startCase(ALICE, "rajesh", facts());
    const before = preflight(getCase(ALICE)!.facts!).counts.blockers;

    markFixed(ALICE, "R-NAME-AADHAAR");
    const after = preflight(getCase(ALICE)!.facts!).counts.blockers;

    // One ten-minute name correction clears the bank-name check too, because
    // that check was measuring against the same wrong value.
    expect(after).toBeLessThan(before);
    expect(getCase(ALICE)!.resolved).toContain("R-NAME-AADHAAR");
  });

  it("is idempotent, so a double tap does not double-apply", () => {
    startCase(ALICE, "rajesh", facts());
    markFixed(ALICE, "R-NAME-AADHAAR");
    const once = structuredClone(getCase(ALICE)!.facts);
    markFixed(ALICE, "R-NAME-AADHAAR");
    expect(getCase(ALICE)!.facts).toEqual(once);
    expect(getCase(ALICE)!.resolved).toEqual(["R-NAME-AADHAAR"]);
  });

  it("keeps the original record, so before-and-after stays honest", () => {
    startCase(ALICE, "rajesh", facts());
    markFixed(ALICE, "R-NAME-AADHAAR");
    expect(getCase(ALICE)!.original!.records.epfo.name).toBe("RAJESH K SHARMA");
    expect(getCase(ALICE)!.facts!.records.epfo.name).not.toBe("RAJESH K SHARMA");
  });
});

describe("the claim lifecycle", () => {
  it("moves draft to preflight_required to blocked as the citizen progresses", () => {
    expect(claimState(getCase(ALICE), null)).toBe("draft");

    startCase(ALICE, "rajesh", facts());
    expect(claimState(getCase(ALICE), preflight(getCase(ALICE)!.facts!))).toBe("preflight_required");

    recordPreflight(ALICE);
    expect(claimState(getCase(ALICE), preflight(getCase(ALICE)!.facts!))).toBe("blocked");
  });

  it("reaches ready once every blocker is cleared", () => {
    startCase(ALICE, "arun", facts());
    setFacts(ALICE, structuredClone(personaById("arun")!.facts));
    recordPreflight(ALICE);
    expect(claimState(getCase(ALICE), preflight(getCase(ALICE)!.facts!))).toBe("ready");
  });

  it("mints one reference and never a second", () => {
    startCase(ALICE, "rajesh", facts());
    const first = fileClaim(ALICE, 142000)!.claim!.ref;
    const second = fileClaim(ALICE, 999999)!.claim!.ref;
    expect(second).toBe(first);
    expect(getCase(ALICE)!.claim!.amount).toBe(142000);
  });

  it("refuses to file when there is no case to file", () => {
    expect(fileClaim(BOB, 1000)).toBeNull();
  });

  it("steps the simulated timeline and stops at the end", () => {
    startCase(ALICE, "rajesh", facts());
    fileClaim(ALICE, 142000);
    for (let i = 0; i < 10; i += 1) advanceStatus(ALICE);
    expect(getCase(ALICE)!.claim!.stage).toBe(4);
    expect(claimState(getCase(ALICE), null)).toBe("payment_released");
  });

  it("will not advance a claim that was never filed", () => {
    startCase(ALICE, "rajesh", facts());
    expect(advanceStatus(ALICE)).toBeNull();
  });
});

describe("demo reset", () => {
  it("returns the account to a known state without touching anyone else", () => {
    startCase(ALICE, "rajesh", facts());
    startCase(BOB, "arun", facts());
    fileClaim(ALICE, 142000);

    resetCase(ALICE);

    expect(getCase(ALICE)).toBeNull();
    expect(claimState(getCase(ALICE), null)).toBe("draft");
    expect(getCase(BOB)).not.toBeNull();
  });
});
