import { describe, expect, it } from "vitest";
import { personaById } from "@/content/personas";
import { preflight } from "@/lib/rules/engine";
import { claimState, describe as describeState, isFiled } from "./state";

const rajesh = preflight(personaById("rajesh")!.facts);
const arun = preflight(personaById("arun")!.facts);

describe("claimState", () => {
  it("is draft with no case at all", () => {
    expect(claimState(null, null)).toBe("draft");
    expect(claimState(undefined, null)).toBe("draft");
  });

  it("is draft when a case exists but has no facts", () => {
    expect(claimState({}, null)).toBe("draft");
  });

  it("distinguishes answered-but-unchecked from checked", () => {
    // The whole point of tracking preflightAt: "you have not run the check"
    // and "you ran it and nothing is wrong" need very different sentences.
    expect(claimState({ facts: {} }, rajesh)).toBe("preflight_required");
    expect(claimState({ facts: {}, preflightAt: "2026-08-29T00:00:00Z" }, rajesh)).toBe("blocked");
  });

  it("is blocked when the engine found blockers", () => {
    const state = claimState({ facts: {}, preflightAt: "2026-08-29T00:00:00Z" }, rajesh);
    expect(state).toBe("blocked");
    expect(rajesh.counts.blockers).toBeGreaterThan(0);
  });

  it("is ready when the engine found none", () => {
    expect(claimState({ facts: {}, preflightAt: "2026-08-29T00:00:00Z" }, arun)).toBe("ready");
    expect(arun.counts.blockers).toBe(0);
  });

  it("a filed claim outranks the preflight verdict", () => {
    // Filing with blockers open is allowed, and the status must then reflect
    // the claim, not the check that warned against it.
    const filed = { facts: {}, preflightAt: "2026-08-29T00:00:00Z", claim: { stage: 0 } };
    expect(claimState(filed, rajesh)).toBe("submitted");
  });

  it("walks the simulated timeline in order", () => {
    const at = (stage: number) =>
      claimState({ facts: {}, preflightAt: "x", claim: { stage } }, arun);
    expect([at(0), at(1), at(2), at(3), at(4)]).toEqual([
      "submitted",
      "submitted",
      "verification",
      "approved",
      "payment_released",
    ]);
  });

  it("clamps a stage outside the timeline rather than returning undefined", () => {
    expect(claimState({ facts: {}, preflightAt: "x", claim: { stage: 99 } }, arun)).toBe(
      "payment_released",
    );
    expect(claimState({ facts: {}, preflightAt: "x", claim: { stage: -3 } }, arun)).toBe("submitted");
  });
});

describe("isFiled", () => {
  it("is true only after submission", () => {
    expect(isFiled("draft")).toBe(false);
    expect(isFiled("blocked")).toBe(false);
    expect(isFiled("ready")).toBe(false);
    expect(isFiled("submitted")).toBe(true);
    expect(isFiled("payment_released")).toBe(true);
  });
});

describe("describe", () => {
  it("gives every state a bilingual headline and detail", () => {
    const states = [
      "draft", "preflight_required", "blocked", "ready",
      "submitted", "verification", "approved", "payment_released",
    ] as const;
    for (const s of states) {
      const copy = describeState(s, 2, ["citizen"]);
      for (const field of [copy.label, copy.headline, copy.detail]) {
        expect(field.en.length).toBeGreaterThan(0);
        expect(field.hi.length).toBeGreaterThan(0);
        expect(field.hi).not.toBe(field.en);
      }
    }
  });

  it("names the employer when an employer owns a blocker", () => {
    expect(describeState("blocked", 2, ["employer"]).waitingOn).toBe("employer");
    expect(describeState("blocked", 2, ["citizen"]).waitingOn).toBe("citizen");
  });

  it("waits on nobody once the claim is clear or paid", () => {
    expect(describeState("ready", 0, []).waitingOn).toBeNull();
    expect(describeState("payment_released", 0, []).waitingOn).toBeNull();
  });

  it("reads an employer-blocked claim as more severe than a self-fixable one", () => {
    expect(describeState("blocked", 1, ["employer"]).tone).toBe("blocked");
    expect(describeState("blocked", 1, ["citizen"]).tone).toBe("caution");
  });
});
