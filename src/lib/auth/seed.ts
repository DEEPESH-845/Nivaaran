import "server-only";
import { personaById } from "@/content/personas";
import { lookupIfsc } from "@/lib/bank/ifsc";
import { db, flush, logActivity } from "@/lib/db/store";
import type { Facts } from "@/lib/rules/types";
import { createUser, userByEmail } from "./users";

/**
 * Deterministic demo accounts.
 *
 * A judge should not have to create an account to see the product, and the
 * account they do use must be visibly synthetic — every record behind these
 * users is invented, and `demo: true` puts a banner on every page they see.
 *
 * The password is a constant on purpose: it is published in the README. It is
 * still hashed with the same scrypt path as any other account, because a demo
 * account with a special-cased login is a demo account with a bypass.
 */

export const DEMO_PASSWORD = "NivaaranDemo2026!";

export const DEMO_ACCOUNTS = [
  {
    email: "demo@nivaaran.app",
    name: "Rajesh Kumar Sharma",
    role: "citizen" as const,
    /** Starts mid-journey, with the synthetic record that has four blockers. */
    personaId: "rajesh",
    blurb: "Citizen with four blockers in their record — the main journey.",
  },
  {
    email: "employer@nivaaran.app",
    name: "Priya Nair (HR, Meridian Textiles)",
    role: "employer" as const,
    personaId: undefined,
    blurb: "Employer lens: nine leavers, sorted by who is blocked on whom.",
  },
  {
    email: "admin@nivaaran.app",
    name: "Rule Governance",
    role: "admin" as const,
    personaId: undefined,
    blurb: "Rule governance: every rule, its source, freshness and changelog.",
  },
];

let seeding: Promise<void> | null = null;

/** Idempotent, and safe to call concurrently. */
export function ensureSeed(): Promise<void> {
  seeding ??= run();
  return seeding;
}

async function run(): Promise<void> {
  for (const account of DEMO_ACCOUNTS) {
    if (userByEmail(account.email)) continue;

    const user = await createUser({
      email: account.email,
      name: account.name,
      password: DEMO_PASSWORD,
      role: account.role,
      demo: true,
    });

    if (!account.personaId) continue;

    const persona = personaById(account.personaId);
    if (!persona) continue;

    const facts = withBankDirectory(structuredClone(persona.facts));

    // A signed-in demo citizen lands on a dashboard that already has something
    // to say. The check is deliberately *not* pre-run: "2 things need your
    // attention" is the moment the product exists for, and it should happen
    // in front of the judge rather than before they arrived.
    db.cases[user.id] = {
      userId: user.id,
      personaId: persona.id,
      facts,
      original: structuredClone(facts),
      resolved: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    flush();
    logActivity(user.id, "case_started", persona.id);
  }
}

/**
 * Annotate a record with the bank directory, exactly as the live journey does
 * before it starts a session. Without this the seeded case is missing one
 * blocker the same person would see coming in from the landing page, and the
 * demo would contradict itself.
 */
function withBankDirectory(facts: Facts): Facts {
  const target = facts.records.bank ?? facts.records.epfo;
  const { valid, retiredTo } = lookupIfsc(target.ifsc);
  target.ifscValid = valid;
  if (retiredTo) target.ifscRetiredTo = retiredTo;
  return facts;
}
