import { z } from "zod";
import { fail, ok, readJson, sameOrigin } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/auth/session";
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
} from "@/lib/claims/repo";
import { FactsSchema } from "@/lib/validation/facts";
import { rateLimit, clientKey } from "@/lib/security/ratelimit";

/**
 * The signed-in citizen's case.
 *
 * Every handler here resolves the owner from the session cookie and passes
 * *that* id to the repository. No case id is ever accepted from the client,
 * so there is no object to reference insecurely and directly.
 *
 * The deterministic engine is not called here at all: it is a pure function
 * that ships to the browser, so a preflight needs no round trip and keeps
 * working when the network does not.
 */

const Action = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), personaId: z.string().max(40).optional(), facts: FactsSchema }),
  z.object({ action: z.literal("facts"), facts: FactsSchema, from: z.literal("documents").optional() }),
  z.object({ action: z.literal("preflight") }),
  z.object({ action: z.literal("fix"), ruleId: z.string().regex(/^R-[A-Z0-9-]{1,30}$/) }),
  z.object({ action: z.literal("file"), amount: z.number().min(0).max(100_000_000) }),
  z.object({ action: z.literal("advance") }),
  z.object({ action: z.literal("reset") }),
]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("UNAUTHENTICATED");
  return ok({ case: getCase(user.id), activity: activityFor(user.id) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("UNAUTHORIZED");

  const user = await getSessionUser();
  if (!user) return fail("UNAUTHENTICATED");

  if (!rateLimit("write", user.id).ok) return fail("RATE_LIMITED");

  const parsed = Action.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_REQUEST");

  const body = parsed.data;
  let next;

  switch (body.action) {
    case "start":
      next = startCase(user.id, body.personaId, body.facts);
      break;
    case "facts":
      next = setFacts(user.id, body.facts, body.from);
      break;
    case "preflight":
      next = recordPreflight(user.id);
      break;
    case "fix":
      next = markFixed(user.id, body.ruleId);
      break;
    case "file":
      next = fileClaim(user.id, body.amount);
      break;
    case "advance":
      next = advanceStatus(user.id);
      break;
    case "reset":
      resetCase(user.id);
      next = null;
      break;
  }

  return ok({ case: next ?? getCase(user.id), activity: activityFor(user.id) });
}
