import { personaById } from "@/content/personas";
import { fail, ok, readJson } from "@/lib/api/respond";
import { preflight } from "@/lib/rules/engine";
import { ENGINE_VERSION, RULES, RULE_IDS } from "@/lib/rules/rules";
import { SOURCES } from "@/lib/rules/sources";
import { clientKey, rateLimit } from "@/lib/security/ratelimit";
import { FactsSchema } from "@/lib/validation/facts";
import type { Facts } from "@/lib/rules/types";

/**
 * The Preflight API.
 *
 * This is the whole point of the rule engine being a pure function: the same
 * check that runs in our UI can run inside EPFO's member portal before Submit,
 * inside an employer's HRMS at exit, or at UAN generation. The interface is
 * the smallest part of the answer.
 *
 * Deliberately unauthenticated and side-effect free: it stores nothing, logs
 * no payload, and needs no personal identifiers — only the shape of a record.
 * It is rate limited, because an open endpoint on a public URL always is.
 */

export const API_VERSION = "v1";

/**
 * The record the /api page documents and the demo runs on. Read from the
 * persona rather than restated here, so the docs cannot drift from the
 * contract. Synthetic throughout.
 */
const EXAMPLE_RECORD = personaById("rajesh")!.facts;

export async function GET() {
  return ok({
    service: "nivaaran-preflight",
    apiVersion: API_VERSION,
    engineVersion: ENGINE_VERSION,
    description:
      "Deterministic pre-submission validation for EPF claims. POST a member record shape and receive every blocker, who owns it, how to fix it, and the source of the rule.",
    method: "POST",
    ruleCount: RULES.length,
    ruleIds: RULE_IDS,
    rateLimit: { requestsPerMinute: 30, scope: "per client address" },
    sources: Object.values(SOURCES).map((s) => ({
      id: s.id,
      url: s.url,
      verifiedOn: s.verifiedOn,
      confidence: s.confidence,
    })),
    disclaimer:
      "Independent hackathon prototype. Not affiliated with EPFO or the Government of India. Rules are best-effort readings of public sources and must be re-verified before any production use. Send synthetic data only.",
    // The same synthetic record the /api page documents and the demo runs on.
    // One literal, so the docs cannot drift from the contract.
    example: EXAMPLE_RECORD,
  });
}

export async function POST(request: Request) {
  if (!rateLimit("publicApi", clientKey(request)).ok) return fail("RATE_LIMITED");

  const body = await readJson(request, 32 * 1024);
  if (body === null) return fail("INVALID_REQUEST", { message: "Request body must be JSON under 32 KB." });

  const parsed = FactsSchema.safeParse(body);
  if (!parsed.success) {
    return fail("INVALID_REQUEST", {
      message: "The member record did not match the expected shape.",
      fields: Object.fromEntries(
        parsed.error.issues.slice(0, 12).map((i) => [i.path.join(".") || "body", i.message]),
      ),
    });
  }

  const result = preflight(parsed.data as Facts);

  return ok({
    apiVersion: API_VERSION,
    ...result,
    findings: result.findings.map((f) => ({
      ...f,
      source: {
        id: f.sourceId,
        url: SOURCES[f.sourceId]?.url,
        verifiedOn: SOURCES[f.sourceId]?.verifiedOn,
        confidence: SOURCES[f.sourceId]?.confidence,
      },
    })),
    disclaimer:
      "Advisory only. EPFO makes the final decision on any claim. Independent hackathon prototype.",
  });
}
