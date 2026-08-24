import { describe, expect, it } from "vitest";
import { ROSTER } from "@/content/roster";
import { applyFix } from "./apply";
import { billableMinutes } from "./engine";
import { reviewLeaver, reviewRoster } from "./roster";
import type { Fix } from "./types";

const summary = reviewRoster(ROSTER);
const fix = (over: Partial<Fix>): Fix => ({
  summary: { en: "", hi: "" },
  steps: [],
  minutes: 10,
  cost: { en: "Free", hi: "निःशुल्क" },
  ...over,
});

describe("billableMinutes", () => {
  it("bills two separate actions separately", () => {
    expect(billableMinutes([fix({ minutes: 3 }), fix({ minutes: 20 })])).toBe(23);
  });

  it("bills one action once, however many findings point at it", () => {
    const jd = { fixKey: "employer-jd", minutes: 20 };
    expect(billableMinutes([fix(jd), fix(jd), fix({ minutes: 3 })])).toBe(23);
  });

  it("does not merge untagged fixes that happen to cost the same", () => {
    expect(billableMinutes([fix({ minutes: 10 }), fix({ minutes: 10 })])).toBe(20);
  });
});

describe("reviewRoster", () => {
  it("accounts for every leaver exactly once", () => {
    const seen = [...summary.blockedOnYou, ...summary.blockedOnThem, ...summary.clear];
    expect(seen).toHaveLength(ROSTER.length);
    expect(new Set(seen.map((r) => r.leaver.id)).size).toBe(ROSTER.length);
    expect(summary.counts.total).toBe(ROSTER.length);
    expect(summary.counts.blocked + summary.counts.clear).toBe(ROSTER.length);
  });

  it("puts the leavers the employer is blocking in their own group", () => {
    expect(summary.counts.blockedOnYou).toBeGreaterThan(0);
    for (const r of summary.blockedOnYou) {
      expect(r.yours.length).toBeGreaterThan(0);
      // Ownership without steps is the dead end this lens exists to remove.
      for (const f of r.yours) {
        expect(f.owner).toBe("employer");
        expect(f.employerFix).toBeDefined();
        expect(f.employerFix!.steps.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps leavers the employer cannot help out of that group", () => {
    for (const r of summary.blockedOnThem) {
      expect(r.yours).toHaveLength(0);
      expect(r.theirs.length).toBeGreaterThan(0);
      expect(r.minutes).toBe(0);
    }
  });

  it("orders both blocked groups by who has waited longest", () => {
    for (const group of [summary.blockedOnYou, summary.blockedOnThem]) {
      const waits = group.map((r) => r.daysWaiting);
      expect(waits).toEqual([...waits].sort((a, b) => b - a));
    }
  });

  it("reports clear leavers as genuinely clear", () => {
    for (const r of summary.clear) {
      expect(r.result.counts.blockers).toBe(0);
      expect(r.result.verdict).toBe("clear");
    }
  });

  it("totals the employer's own effort, not the member's", () => {
    expect(summary.minutes).toBe(
      summary.blockedOnYou.reduce((s, r) => s + r.minutes, 0),
    );
    expect(summary.minutes).toBeGreaterThan(0);
  });

  it("bills one Joint Declaration once even when it covers two fields", () => {
    // Sunita's name and date of birth both need the same declaration.
    const sunita = summary.blockedOnYou.find((r) => r.leaver.id === "sunita");
    expect(sunita).toBeDefined();
    const jd = sunita!.yours.filter((f) => f.employerFix?.fixKey === "employer-jd");
    expect(jd.length).toBeGreaterThan(1);
    const naive = sunita!.yours.reduce((s, f) => s + f.employerFix!.minutes, 0);
    expect(sunita!.minutes).toBeLessThan(naive);
  });
});

describe("the roster fixture", () => {
  it("carries a masked, obviously fake UAN for everyone", () => {
    for (const l of ROSTER) expect(l.uan).toMatch(/^\d{4} XXXX \d{4}$/);
  });

  it("exercises all three groups, or the screen proves nothing", () => {
    expect(summary.counts.blockedOnYou).toBeGreaterThanOrEqual(2);
    expect(summary.blockedOnThem.length).toBeGreaterThanOrEqual(2);
    expect(summary.clear.length).toBeGreaterThanOrEqual(2);
  });
});

describe("marking an employer fix done", () => {
  it("re-runs the check and moves the leaver out of the employer's queue", () => {
    const target = summary.blockedOnYou.find((r) =>
      r.yours.some((f) => f.ruleId === "R-EXIT-DATE"),
    );
    expect(target).toBeDefined();

    const after = reviewLeaver(
      target!.leaver,
      applyFix(target!.facts, "R-EXIT-DATE"),
    );
    expect(after.yours.some((f) => f.ruleId === "R-EXIT-DATE")).toBe(false);
    expect(after.minutes).toBeLessThan(target!.minutes);
  });

  it("does not silently clear anything the employer did not act on", () => {
    const target = summary.blockedOnYou[0];
    const after = reviewLeaver(target.leaver, applyFix(target.facts, "R-EXIT-DATE"));
    const stillBlocked = after.result.counts.blockers;
    expect(stillBlocked).toBe(target.result.counts.blockers - 1);
  });
});
