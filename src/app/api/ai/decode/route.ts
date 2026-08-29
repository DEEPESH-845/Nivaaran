import { z } from "zod";
import { fail, ok, readJson } from "@/lib/api/respond";
import { aiConfigured, structured } from "@/lib/ai/client";
import { DECODE_SYSTEM, DecodeSchema, decodeDeterministic } from "@/lib/ai/decode";
import { clientKey, rateLimit } from "@/lib/security/ratelimit";

const Body = z.object({ text: z.string().min(1).max(2000) });

export async function POST(request: Request) {
  // Bounded before it is parsed: `request.json()` will buffer whatever it
  // is handed, and this endpoint is public.
  const parsed = Body.safeParse(await readJson(request, 8 * 1024));
  if (!parsed.success) return fail("INVALID_REQUEST");

  const text = parsed.data.text.trim();

  // Deterministic first: free, instant, offline, and covers the documented
  // phrasings. The model is never consulted when the patterns already match.
  const matched = decodeDeterministic(text);
  if (matched.length > 0) {
    return ok({ ruleIds: matched, resolvedBy: "patterns" });
  }

  if (!rateLimit("ai", clientKey(request)).ok) {
    return ok({ ruleIds: [], resolvedBy: "unavailable", reason: "rate_limited" }, { status: 429 });
  }

  if (!aiConfigured()) {
    return ok({ ruleIds: [], resolvedBy: "unavailable", reason: "not_configured" });
  }

  const result = await structured(DecodeSchema, "decoded_rejection", DECODE_SYSTEM, text);

  if (!result.ok) {
    return ok({ ruleIds: [], resolvedBy: "unavailable", reason: result.reason });
  }

  return ok({
    ruleIds: result.data.unrecognised ? [] : result.data.ruleIds,
    resolvedBy: "model",
    model: result.model,
  });
}
