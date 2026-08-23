import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";

/**
 * Server-only OpenAI wrapper.
 *
 * Three rules this file exists to enforce:
 *   1. The key never reaches the client.
 *   2. Every call has a deadline; a slow model must never hold a citizen up.
 *   3. Every failure is a value, not an exception — callers fall back to the
 *      deterministic path instead of showing an error.
 */

export const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6";
const TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS ?? 9000);

export const aiConfigured = () => Boolean(process.env.OPENAI_API_KEY);

export type AiFailure =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  | "refused"
  | "unparsable"
  | "error";

export type AiResult<T> =
  | { ok: true; data: T; model: string }
  | { ok: false; reason: AiFailure };

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!aiConfigured()) return null;
  client ??= new OpenAI({ timeout: TIMEOUT_MS, maxRetries: 1 });
  return client;
}

export async function structured<S extends z.ZodType>(
  schema: S,
  schemaName: string,
  system: string,
  user: string,
): Promise<AiResult<z.infer<S>>> {
  const openai = getClient();
  if (!openai) return { ok: false, reason: "not_configured" };

  try {
    const response = await openai.responses.parse({
      model: MODEL,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      text: { format: zodTextFormat(schema, schemaName) },
    });

    for (const output of response.output) {
      if (output.type !== "message") continue;
      for (const item of output.content) {
        if (item.type === "refusal") return { ok: false, reason: "refused" };
        if (item.type === "output_text" && item.parsed) {
          return { ok: true, data: item.parsed as z.infer<S>, model: MODEL };
        }
      }
    }
    return { ok: false, reason: "unparsable" };
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      if (err.status === 429) return { ok: false, reason: "rate_limited" };
    }
    if (err instanceof Error && /timeout|aborted/i.test(err.message)) {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "error" };
  }
}
