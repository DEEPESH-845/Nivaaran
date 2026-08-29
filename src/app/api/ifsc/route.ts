import { ok } from "@/lib/api/respond";
import { lookupIfsc } from "@/lib/bank/ifsc";

/**
 * Bank directory lookup.
 *
 * Stands in for what would be a live RBI/NPCI directory call. An unusable code
 * is a 200 with `valid: false`, not an error — "this code is dead" is an
 * answer, and the caller has to render it either way.
 *
 * Deliberately not rate limited: it is an in-memory lookup over a fixed table
 * with no I/O and no cost, so there is nothing to protect. Limiting it would
 * only mean answering "valid" for a code we never checked, and a false all-
 * clear on a bank account is the one answer this product must never give.
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  return ok(lookupIfsc(code));
}
