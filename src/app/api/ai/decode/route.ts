import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, structured } from "@/lib/ai/client";
import { DECODE_SYSTEM, DecodeSchema, decodeDeterministic } from "@/lib/ai/decode";
import { allow, clientKey } from "@/lib/ai/limit";

const Body = z.object({ text: z.string().min(1).max(2000) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 422 });
  }

  const text = parsed.data.text.trim();

  // Deterministic first: free, instant, offline, and covers the documented
  // phrasings. The model is never consulted when the patterns already match.
  const matched = decodeDeterministic(text);
  if (matched.length > 0) {
    return NextResponse.json({ ruleIds: matched, resolvedBy: "patterns" });
  }

  if (!allow(clientKey(request))) {
    return NextResponse.json(
      { ruleIds: [], resolvedBy: "unavailable", reason: "rate_limited" },
      { status: 429 },
    );
  }

  if (!aiConfigured()) {
    return NextResponse.json({ ruleIds: [], resolvedBy: "unavailable", reason: "not_configured" });
  }

  const result = await structured(DecodeSchema, "decoded_rejection", DECODE_SYSTEM, text);

  if (!result.ok) {
    return NextResponse.json({ ruleIds: [], resolvedBy: "unavailable", reason: result.reason });
  }

  return NextResponse.json({
    ruleIds: result.data.unrecognised ? [] : result.data.ruleIds,
    resolvedBy: "model",
    model: result.model,
  });
}
