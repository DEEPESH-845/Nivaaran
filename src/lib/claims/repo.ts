import "server-only";
import { randomBytes } from "node:crypto";
import { db, flush, logActivity, type ActivityEntry, type CaseRecord } from "@/lib/db/store";
import { applyFix } from "@/lib/rules/apply";
import type { Facts } from "@/lib/rules/types";

/**
 * The case repository.
 *
 * Every function takes the authenticated user's id as its first argument, and
 * there is no lookup by case id anywhere in this file. That is deliberate:
 * `getCase(id)` is the shape that produces an insecure-direct-object-reference,
 * and the way to not have one is to make it impossible to write.
 */

const STAGES = 5;

export function getCase(userId: string): CaseRecord | null {
  return db.cases[userId] ?? null;
}

function touch(userId: string): CaseRecord {
  const existing = db.cases[userId];
  if (existing) {
    existing.updatedAt = new Date().toISOString();
    return existing;
  }
  return (db.cases[userId] = {
    userId,
    resolved: [],
    updatedAt: new Date().toISOString(),
  });
}

export function startCase(userId: string, personaId: string | undefined, facts: Facts): CaseRecord {
  const c = touch(userId);
  c.personaId = personaId;
  c.facts = facts;
  c.original = structuredClone(facts);
  c.resolved = [];
  c.preflightAt = undefined;
  c.claim = undefined;
  c.startedAt = new Date().toISOString();
  flush();
  logActivity(userId, "case_started", personaId);
  return c;
}

export function setFacts(
  userId: string,
  facts: Facts,
  from?: "documents",
): CaseRecord | null {
  const c = db.cases[userId];
  if (!c) return null;
  c.facts = facts;
  c.updatedAt = new Date().toISOString();
  flush();
  // Answering a question again is not an event worth a line in someone's
  // activity feed; reading a document and accepting what it said is.
  if (from === "documents") logActivity(userId, "document_compared");
  return c;
}

export function recordPreflight(userId: string): CaseRecord | null {
  const c = db.cases[userId];
  if (!c?.facts) return null;
  const first = !c.preflightAt;
  c.preflightAt = new Date().toISOString();
  c.updatedAt = c.preflightAt;
  flush();
  if (first) logActivity(userId, "preflight_run");
  return c;
}

export function markFixed(userId: string, ruleId: string): CaseRecord | null {
  const c = db.cases[userId];
  // No case, no facts, or already applied: all three are a no-op, and the
  // signature promises null rather than undefined for "nothing to return".
  if (!c?.facts || c.resolved.includes(ruleId)) return c ?? null;
  c.facts = applyFix(c.facts, ruleId);
  c.resolved = [...c.resolved, ruleId];
  c.updatedAt = new Date().toISOString();
  flush();
  logActivity(userId, "fix_marked", ruleId);
  return c;
}

export function fileClaim(userId: string, amount: number): CaseRecord | null {
  const c = db.cases[userId];
  if (!c?.facts) return null;
  // Already filed: return the existing reference rather than minting a second
  // one. A double-tapped submit button must not produce two claims.
  if (c.claim) return c;

  c.claim = {
    ref: `PKA-${randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`,
    filedAt: new Date().toISOString(),
    amount,
    state: "submitted",
    stage: 0,
  };
  c.updatedAt = c.claim.filedAt;
  flush();
  logActivity(userId, "claim_filed", c.claim.ref);
  return c;
}

/** Demo-only: step the simulated timeline. Never touches a government system. */
export function advanceStatus(userId: string): CaseRecord | null {
  const c = db.cases[userId];
  if (!c?.claim) return null;
  if (c.claim.stage >= STAGES - 1) return c;
  c.claim.stage += 1;
  c.updatedAt = new Date().toISOString();
  flush();
  logActivity(userId, "status_advanced", String(c.claim.stage));
  return c;
}

export function resetCase(userId: string): void {
  delete db.cases[userId];
  db.activity[userId] = [];
  flush();
  logActivity(userId, "demo_reset");
}

export function activityFor(userId: string): ActivityEntry[] {
  return db.activity[userId] ?? [];
}
