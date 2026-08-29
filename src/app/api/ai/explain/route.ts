import { z } from "zod";
import { fail, ok, readJson } from "@/lib/api/respond";
import { aiConfigured, structured } from "@/lib/ai/client";
import { clientKey, rateLimit } from "@/lib/security/ratelimit";

const Body = z.object({
  text: z.string().min(1).max(1500),
  lang: z.enum(["en", "hi"]),
});

const ExplainSchema = z.object({
  plain: z
    .string()
    .describe("The same meaning, rewritten as simply as possible. Two short sentences at most."),
});

const SYSTEM = `You rewrite explanations about Indian government provident-fund procedures into the simplest possible language, for a reader who may have limited formal education and is anxious about money they are owed.

Hard rules:
- Preserve the meaning exactly. Never add a fact, a number, a fee, a timeline or a requirement that is not in the input.
- Never remove a caveat or a limitation.
- Two short sentences at most. Everyday words. No jargon, no form numbers unless the input has them.
- Reply in the requested language only.
- If you cannot simplify without changing the meaning, return the input unchanged.`;

export async function POST(request: Request) {
  // Bounded before it is parsed; this endpoint is public.
  const parsed = Body.safeParse(await readJson(request, 8 * 1024));
  if (!parsed.success) return fail("INVALID_REQUEST");

  if (!rateLimit("ai", clientKey(request)).ok) {
    return ok(
      { plain: parsed.data.text, resolvedBy: "unavailable", reason: "rate_limited" },
      { status: 429 },
    );
  }

  if (!aiConfigured()) {
    return ok({
      plain: parsed.data.text,
      resolvedBy: "unavailable",
      reason: "not_configured",
    });
  }

  const result = await structured(
    ExplainSchema,
    "plain_explanation",
    SYSTEM,
    `Language: ${parsed.data.lang === "hi" ? "Hindi" : "English"}\n\nText:\n${parsed.data.text}`,
  );

  if (!result.ok) {
    // Never fail loudly: the original wording is already correct, just denser.
    return ok({
      plain: parsed.data.text,
      resolvedBy: "unavailable",
      reason: result.reason,
    });
  }

  return ok({
    plain: result.data.plain,
    resolvedBy: "model",
    model: result.model,
  });
}
