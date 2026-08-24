import type { Leaver } from "@/content/roster";
import { billableMinutes, preflight } from "./engine";
import type { Facts, Finding, PreflightResult } from "./types";

/**
 * The employer's view of the same engine.
 *
 * No second rule set and no employer-specific record type: this runs
 * `preflight` over the same `Facts` and re-partitions the findings by who can
 * actually act on them. Pure, like the engine — no I/O, no model, and no clock
 * at all, because "days waiting" is already in the facts.
 */

export interface LeaverReview {
  leaver: Leaver;
  /** The facts as they stand now, including any fix the employer has marked. */
  facts: Facts;
  result: PreflightResult;
  /** Blockers this employer can act on, each carrying an `employerFix`. */
  yours: Finding[];
  /** Blockers that are the member's own, which the employer can only relay. */
  theirs: Finding[];
  /** Active effort across `yours`, counting each distinct action once. */
  minutes: number;
  daysWaiting: number;
}

export interface RosterSummary {
  /** Blocked on the employer. Longest wait first. */
  blockedOnYou: LeaverReview[];
  /** Blocked, but on themselves. Longest wait first. */
  blockedOnThem: LeaverReview[];
  clear: LeaverReview[];
  counts: { total: number; blocked: number; blockedOnYou: number; clear: number };
  /** Total active effort the employer owes across every leaver. */
  minutes: number;
}

export function reviewLeaver(leaver: Leaver, facts: Facts = leaver.facts): LeaverReview {
  const result = preflight(facts);
  const blockers = result.findings.filter((f) => f.severity === "blocker");
  // A finding is the employer's only when the engine says so *and* we have
  // something for them to actually do. Ownership without steps is a dead end,
  // which is the thing this whole lens exists to remove.
  const yours = blockers.filter((f) => f.owner === "employer" && f.employerFix);
  return {
    leaver,
    facts,
    result,
    yours,
    theirs: blockers.filter((f) => !yours.includes(f)),
    minutes: billableMinutes(yours.map((f) => f.employerFix!)),
    daysWaiting: facts.daysSinceExit,
  };
}

/** Longest wait first: that is the person the delay is costing most. */
const byWait = (a: LeaverReview, b: LeaverReview) => b.daysWaiting - a.daysWaiting;

export function reviewRoster(
  leavers: Leaver[],
  /** Facts overridden by fixes the employer has marked done, keyed by id. */
  fixed: Record<string, Facts> = {},
): RosterSummary {
  const reviews = leavers.map((l) => reviewLeaver(l, fixed[l.id] ?? l.facts));

  const blockedOnYou = reviews.filter((r) => r.yours.length > 0).sort(byWait);
  const blockedOnThem = reviews
    .filter((r) => r.yours.length === 0 && r.theirs.length > 0)
    .sort(byWait);
  const clear = reviews.filter((r) => r.yours.length === 0 && r.theirs.length === 0);

  return {
    blockedOnYou,
    blockedOnThem,
    clear,
    counts: {
      total: reviews.length,
      blocked: blockedOnYou.length + blockedOnThem.length,
      blockedOnYou: blockedOnYou.length,
      clear: clear.length,
    },
    minutes: blockedOnYou.reduce((sum, r) => sum + r.minutes, 0),
  };
}
