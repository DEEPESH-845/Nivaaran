import { NextResponse } from "next/server";
import { z } from "zod";
import { aiConfigured, structuredVision } from "@/lib/ai/client";
import {
  EXTRACT_INSTRUCTION,
  EXTRACT_SYSTEM,
  ExtractSchema,
  scrub,
} from "@/lib/ai/extract";
import { allow, clientKey } from "@/lib/ai/limit";

/**
 * Document pre-check.
 *
 * The image is held for the duration of one model call and then dropped: it is
 * never written to disk, never logged, never returned. The response carries
 * only the four fields the engine compares, after `scrub` has run.
 *
 * Vision costs roughly an order of magnitude more than a text call, so this
 * endpoint carries its own, tighter budget under its own key prefix.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const VISION_PER_MINUTE = 5;

const Body = z.object({
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "expected an image data URL"),
});

/** Bytes the base64 payload decodes to, without decoding it. */
function decodedBytes(dataUrl: string): number {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || decodedBytes(parsed.data.image) > MAX_BYTES) {
    return NextResponse.json({ error: "invalid_request" }, { status: 422 });
  }

  if (!allow(`vision:${clientKey(request)}`, VISION_PER_MINUTE)) {
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  if (!aiConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const result = await structuredVision(
    ExtractSchema,
    "extracted_document",
    EXTRACT_SYSTEM,
    EXTRACT_INSTRUCTION,
    parsed.data.image,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason });
  }

  return NextResponse.json(
    {
      ok: true,
      docType: result.data.docType,
      fields: scrub(result.data),
      confidence: result.data.confidence,
      quality: result.data.quality,
      model: result.model,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
