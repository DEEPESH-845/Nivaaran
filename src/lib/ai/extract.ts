import { z } from "zod";

/**
 * Document pre-check: read the four fields the engine actually compares.
 *
 * The privacy design is the schema. `Facts` needs a name, a date of birth, an
 * IFSC and the last four digits of an account — and nothing else. There is
 * deliberately no field here capable of holding an Aadhaar number, a PAN, a
 * full account number or free text, so the model has nowhere to put one even
 * if it reads one. Same principle as the rejection decoder's closed list of
 * rule ids: refusal by construction, not by prompt.
 *
 * `scrub()` then runs on the server regardless, because a schema constrains
 * shape and not content.
 */

export const ExtractSchema = z.strictObject({
  docType: z
    .enum(["identity", "passbook", "cheque", "unknown"])
    .describe("What kind of document this appears to be."),
  name: z
    .string()
    .max(80)
    .nullable()
    .describe("The person's full name exactly as printed. Null if not legible."),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .describe("Date of birth as YYYY-MM-DD. Null if absent or not legible."),
  ifsc: z
    .string()
    .nullable()
    .describe("The 11-character bank IFSC code. Null if absent or not legible."),
  accountLast4: z
    .string()
    .nullable()
    .describe("ONLY the last four digits of the bank account number. Never more."),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("How sure you are that the values above are read correctly."),
  quality: z
    .enum(["clear", "blurred", "cropped", "glare", "not_a_document"])
    .describe("The legibility of the image itself."),
});

export type Extracted = z.infer<typeof ExtractSchema>;

/** The four fields the engine compares. Everything else is dropped. */
export interface ExtractedFields {
  name: string | null;
  dob: string | null;
  ifsc: string | null;
  accountLast4: string | null;
}

const IFSC_SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Names carry no digits. Stripping them means a model that tried to append an
 * identifier to the name field returns letters and nothing else.
 *
 * `\p{M}` is not decoration: Devanagari vowel signs are combining marks, and
 * dropping them turns राजेश into र ज श.
 */
function scrubName(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[^\p{L}\p{M}\s.'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return cleaned.length >= 2 ? cleaned : null;
}

function scrubDate(raw: string | null): string | null {
  const m = raw?.match(ISO_DATE);
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return raw as string;
}

/**
 * Last line of defence, run on the server before anything leaves the route.
 * Anything that is not exactly the shape we asked for becomes null rather than
 * being passed through and shown to a citizen as fact.
 */
export function scrub(raw: Extracted): ExtractedFields {
  const ifsc = raw.ifsc?.replace(/\s/g, "").toUpperCase() ?? null;
  const last4 = raw.accountLast4?.replace(/\s/g, "") ?? null;
  return {
    name: scrubName(raw.name),
    dob: scrubDate(raw.dob),
    ifsc: ifsc && IFSC_SHAPE.test(ifsc) ? ifsc : null,
    accountLast4: last4 && /^\d{4}$/.test(last4) ? last4 : null,
  };
}

export const EXTRACT_SYSTEM = `You read four fields off a photograph of a document, for an Indian provident-fund pre-check tool. The reader is a citizen checking their own record before filing a claim.

Read only:
- name: the person's full name, exactly as printed, in the script it is printed in.
- dob: their date of birth, as YYYY-MM-DD. Indian documents usually print DD/MM/YYYY or DD-MM-YYYY — convert carefully; never guess between day and month.
- ifsc: the 11-character bank IFSC code, if the document shows one.
- accountLast4: the LAST FOUR DIGITS ONLY of a bank account number, if the document shows one.

Hard rules:
- NEVER return an Aadhaar number, a PAN, a UAN, a full bank account number, a phone number, an address or any other identifier. There is no field for one; do not put one anywhere else either.
- Return null for anything you cannot read confidently. A null is correct; a guess is harmful — this feeds a comparison a citizen will act on.
- Set quality honestly. If the image is blurred, cropped, glared or is not a document at all, say so.
- Set confidence low whenever any character was ambiguous.`;

export const EXTRACT_INSTRUCTION =
  "Read the four fields from this document image. Return null for anything not clearly legible.";
