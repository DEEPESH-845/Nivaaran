import { z } from "zod";

/**
 * Rejection decoding.
 *
 * EPFO's rejection messages are short, uncoded and written for a case worker.
 * The overwhelming majority match a handful of documented phrasings, so those
 * are matched deterministically here — free, instant, offline and testable.
 *
 * The model is only asked about wording the patterns do not recognise, which
 * is exactly the job determinism cannot do: open-vocabulary classification
 * into a fixed taxonomy. It can add nothing else; the enum is closed.
 */

export const RULE_IDS = [
  "R-NAME-AADHAAR",
  "R-DOB-AADHAAR",
  "R-AADHAAR-SEED",
  "R-EXIT-DATE",
  "R-BANK-NAME",
  "R-IFSC",
  "R-MULTI-UAN",
  "R-WAIT-60D",
  "R-TDS-192A",
] as const;

export type RuleId = (typeof RULE_IDS)[number];

export const DecodeSchema = z.object({
  ruleIds: z
    .array(z.enum(RULE_IDS))
    .describe("Rule ids this rejection message maps to. Empty if none apply."),
  unrecognised: z
    .boolean()
    .describe("True when the message does not clearly map to any known rule."),
});

export type Decoded = z.infer<typeof DecodeSchema>;

/** Documented phrasings, most specific first. */
const PATTERNS: { re: RegExp; ruleId: RuleId }[] = [
  { re: /multiple\s+uan|more than one uan|duplicate uan/i, ruleId: "R-MULTI-UAN" },
  { re: /date\s+of\s+(exit|leaving)|\bdoe\b\s*(not|missing)|exit\s+date\s+not/i, ruleId: "R-EXIT-DATE" },
  { re: /(d\.?o\.?b\.?|date\s+of\s+birth)[^.]*?(not|mismatch|differ|discrepan)/i, ruleId: "R-DOB-AADHAAR" },
  { re: /name[^.]*?(not as per|not matching|mismatch|differ|discrepan)/i, ruleId: "R-NAME-AADHAAR" },
  { re: /aadhaar[^.]*?(not\s+(seeded|linked|verified)|mismatch|uidai)/i, ruleId: "R-AADHAAR-SEED" },
  { re: /uidai/i, ruleId: "R-AADHAAR-SEED" },
  { re: /\bifsc\b|bank\s+(details|account)[^.]*?(wrong|invalid|incorrect|not)/i, ruleId: "R-IFSC" },
  { re: /(form\s*)?15\s*[gh]\b|\btds\b|\bpan\b[^.]*?(not|missing)/i, ruleId: "R-TDS-192A" },
  { re: /two\s+month|60\s+days?|waiting\s+period|not\s+eligible[^.]*period/i, ruleId: "R-WAIT-60D" },
];

/**
 * Match a rejection message against the documented phrasings.
 * Returns the rules it maps to; an empty array means "ask the model".
 */
export function decodeDeterministic(text: string): RuleId[] {
  const hits = new Set<RuleId>();
  for (const { re, ruleId } of PATTERNS) {
    if (re.test(text)) hits.add(ruleId);
  }
  return [...hits];
}

export const DECODE_SYSTEM = `You classify Indian EPFO provident-fund claim rejection messages into a fixed taxonomy.

You will be given the literal rejection text a member saw. Map it to the rule ids it corresponds to.

Rules:
- R-NAME-AADHAAR: the member's name differs between EPFO and Aadhaar/PAN.
- R-DOB-AADHAAR: the member's date of birth differs between EPFO and Aadhaar.
- R-AADHAAR-SEED: Aadhaar is not seeded, linked or verified against the UAN.
- R-EXIT-DATE: the date of exit / date of leaving is missing or wrong.
- R-BANK-NAME: the bank account holder name does not match the EPFO record.
- R-IFSC: the bank account or IFSC is invalid, stale or unverified.
- R-MULTI-UAN: the member has more than one UAN and service is split.
- R-WAIT-60D: the claim was filed before the required two-month unemployment period.
- R-TDS-192A: tax, PAN or Form 15G/15H related.

Return only ids you are confident about. If nothing clearly applies, return an empty list and set unrecognised to true. Never guess.`;

/** Short labels for rules the decoder may name that are not currently firing. */
export const RULE_LABELS: Record<RuleId, { en: string; hi: string }> = {
  "R-NAME-AADHAAR": { en: "Name mismatch between EPFO and Aadhaar", hi: "EPFO और आधार के नाम में अंतर" },
  "R-DOB-AADHAAR": { en: "Date of birth mismatch", hi: "जन्मतिथि में अंतर" },
  "R-AADHAAR-SEED": { en: "UAN not verified against Aadhaar", hi: "UAN आधार से सत्यापित नहीं" },
  "R-EXIT-DATE": { en: "Date of exit missing", hi: "नौकरी छोड़ने की तारीख़ दर्ज नहीं" },
  "R-BANK-NAME": { en: "Bank account name mismatch", hi: "बैंक खाते के नाम में अंतर" },
  "R-IFSC": { en: "Bank account or IFSC unusable", hi: "बैंक खाता या IFSC अनुपयोगी" },
  "R-MULTI-UAN": { en: "More than one UAN", hi: "एक से ज़्यादा UAN" },
  "R-WAIT-60D": { en: "Filed before the two-month period", hi: "दो महीने की अवधि से पहले भरा गया" },
  "R-TDS-192A": { en: "Tax, PAN or Form 15G related", hi: "कर, PAN या फ़ॉर्म 15G से संबंधित" },
};
