import { z } from "zod";
import { fail, ok, readJson } from "@/lib/api/respond";
import { aiConfigured, structuredVision } from "@/lib/ai/client";
import {
  EXTRACT_INSTRUCTION,
  EXTRACT_SYSTEM,
  ExtractSchema,
  scrub,
} from "@/lib/ai/extract";
import { clientKey, rateLimit } from "@/lib/security/ratelimit";

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
/**
 * The wire ceiling, above the decoded ceiling: base64 costs about a third
 * more, plus the JSON envelope. Enforced before the body is parsed, because
 * `request.json()` on a public endpoint will buffer whatever it is handed.
 */
const MAX_WIRE_BYTES = Math.ceil(MAX_BYTES * 1.4);

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
  const body = await readJson(request, MAX_WIRE_BYTES);
  if (body === null) return fail("PAYLOAD_TOO_LARGE");

  const parsed = Body.safeParse(body);
  // The regex above already fixed the MIME type to one of three image types;
  // a client-declared content type is never trusted here.
  if (!parsed.success || decodedBytes(parsed.data.image) > MAX_BYTES) {
    return fail("INVALID_REQUEST");
  }

  // Vision costs an order of magnitude more than a text call, so it carries
  // its own, tighter budget under its own bucket.
  if (!rateLimit("vision", clientKey(request)).ok) {
    return ok({ ok: false, reason: "rate_limited" }, { status: 429 });
  }

  if (!aiConfigured()) {
    return ok({ ok: false, reason: "not_configured" });
  }

  const result = await structuredVision(
    ExtractSchema,
    "extracted_document",
    EXTRACT_SYSTEM,
    EXTRACT_INSTRUCTION,
    parsed.data.image,
  );

  if (!result.ok) {
    return ok({ ok: false, reason: result.reason });
  }

  return ok(
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
