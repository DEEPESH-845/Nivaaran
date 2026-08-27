import { NextResponse } from "next/server";
import { z } from "zod";
import { personaById } from "@/content/personas";
import { preflight } from "@/lib/rules/engine";
import { RULES } from "@/lib/rules/rules";
import { SOURCES } from "@/lib/rules/sources";
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
 */

/**
 * The record the /api page documents and the demo runs on. Read from the
 * persona rather than restated here, so the docs cannot drift from the
 * contract. Synthetic throughout.
 */
const EXAMPLE_RECORD = personaById("rajesh")!.facts;

const TriState = z.enum(["yes", "no", "unsure"]);

const FactsSchema = z.object({
  intent: z.enum(["final_settlement", "decode_rejection"]).default("final_settlement"),
  daysSinceExit: z.number().int().min(0).max(20000),
  exitDateFiled: TriState,
  uanAadhaarVerified: TriState,
  uanBeforeOct2017: TriState,
  multipleUans: TriState,
  serviceYears: z.number().min(0).max(60),
  claimAmount: z.number().min(0).max(100_000_000),
  panOnRecord: z.boolean(),
  records: z.object({
    epfo: z.object({
      name: z.string().min(1).max(120),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      ifsc: z.string().max(20),
      accountLast4: z.string().max(4),
      // Optional directory metadata: the engine still validates IFSC format
      // itself, while these values can additionally flag a retired code.
      ifscValid: z.boolean().optional(),
      ifscRetiredTo: z.string().min(1).max(120).optional(),
    }),
    aadhaar: z
      .object({
        name: z.string().min(1).max(120),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .optional(),
    bank: z
      .object({
        name: z.string().min(1).max(120),
        ifsc: z.string().max(20),
        accountLast4: z.string().max(4),
        ifscValid: z.boolean().optional(),
        ifscRetiredTo: z.string().min(1).max(120).optional(),
      })
      .optional(),
  }),
});

export async function GET() {
  return NextResponse.json({
    service: "nivaaran-preflight",
    description:
      "Deterministic pre-submission validation for EPF claims. POST a member record shape and receive every blocker, who owns it, how to fix it, and the source of the rule.",
    method: "POST",
    ruleCount: RULES.length,
    ruleIds: [
      "R-AADHAAR-SEED", "R-EXIT-DATE", "R-MULTI-UAN", "R-NAME-AADHAAR",
      "R-DOB-AADHAAR", "R-BANK-NAME", "R-IFSC", "R-WAIT-60D", "R-TDS-192A",
    ],
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be JSON." },
      { status: 400 },
    );
  }

  const parsed = FactsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_request",
        message: "The member record did not match the expected shape.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const result = preflight(parsed.data as Facts);

  return NextResponse.json(
    {
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
    },
    { headers: { "cache-control": "no-store" } },
  );
}
