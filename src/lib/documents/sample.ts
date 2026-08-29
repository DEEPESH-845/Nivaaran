import { parseDate } from "@/lib/date";
import type { ExtractedFields } from "@/lib/ai/extract";

/**
 * Reading the specimen documents we ship, without a model.
 *
 * `/documents` demonstrates reading a photograph, and a photograph needs
 * vision. But `OPENAI_API_KEY` is optional by design (AGENTS.md gotchas), and
 * with it unset every reading returned "not available" and the citizen was
 * asked to type in, by hand, four values that were printed on the page in
 * front of them. That is the exact friction this product exists to remove, so
 * it cannot be the default experience of the product.
 *
 * The three samples in `public/samples/` are SVGs *we wrote*. Their values are
 * real text nodes with real labels, so they can be read directly and exactly —
 * this is not a lookup table pretending to be a reading, and if someone edits
 * a sample the reading changes with it. It runs only for those files, only as
 * a fallback, and the screen says which of the two paths produced the values.
 *
 * A photograph a reader supplies still needs the model. There is no offline
 * substitute for that and we do not pretend there is one.
 */

/** `<text …>DATE OF BIRTH</text>` → the string, in document order. */
function svgTextNodes(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)]
    .map((m) => m[1].replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** The label a value sits under, on our own stationery. */
const LABELS = {
  name: ["NAME", "ACCOUNT HOLDER"],
  dob: ["DATE OF BIRTH"],
  ifsc: ["IFSC"],
  account: ["ACCOUNT NUMBER"],
} as const;

function under(nodes: string[], labels: readonly string[]): string | null {
  const i = nodes.findIndex((n) => labels.includes(n.toUpperCase()));
  return i >= 0 ? (nodes[i + 1] ?? null) : null;
}

/**
 * Pull the four fields the engine compares out of one specimen. Same output
 * contract as `scrub()` — anything not clearly present is `null`, never a
 * guess, and no other field is read even though the page carries more.
 */
export function readSpecimen(svg: string): ExtractedFields {
  const nodes = svgTextNodes(svg);
  const ifsc = under(nodes, LABELS.ifsc)?.replace(/\s/g, "").toUpperCase() ?? null;
  // Printed masked — `XXXX XXXX 8842` — which is already all we ever want.
  const account = under(nodes, LABELS.account)?.replace(/\s/g, "") ?? null;
  const last4 = account?.slice(-4) ?? null;
  return {
    name: under(nodes, LABELS.name),
    // `08 / 03 / 1996` is the eighth of March. Read by position, never by
    // locale — see src/lib/date.ts.
    dob: parseDate(under(nodes, LABELS.dob)?.replace(/\s/g, "")),
    ifsc: ifsc && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) ? ifsc : null,
    accountLast4: last4 && /^\d{4}$/.test(last4) ? last4 : null,
  };
}

/** Fetch one of our own samples and read it. Never called for a user's photo. */
export async function readSampleDocument(src: string): Promise<ExtractedFields | null> {
  if (!src.startsWith("/samples/")) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const fields = readSpecimen(await res.text());
    return Object.values(fields).some(Boolean) ? fields : null;
  } catch {
    return null;
  }
}
