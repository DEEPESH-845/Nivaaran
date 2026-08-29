/**
 * The bank directory.
 *
 * When the public-sector banks amalgamated in 2019–20, the IFSC prefixes of
 * the merged banks were retired. A member whose EPFO record still carries an
 * old code has a claim that will fail at payment, and nothing in the portal
 * tells them — the code is still a syntactically valid IFSC.
 *
 * This is a fixed demonstration set, not a live RBI feed. It lives in its own
 * module because two callers need the same answer: the `/api/ifsc` endpoint
 * the journey queries, and the demo seed, which must produce exactly the
 * record the journey produces.
 */

const RETIRED: Record<string, string> = {
  SYNB: "CNRB", // Syndicate -> Canara
  ALLA: "IDIB", // Allahabad -> Indian
  OBCI: "PUNB", // Oriental -> PNB
  UTBI: "PUNB", // United -> PNB
  CORP: "UBIN", // Corporation -> Union
  ANDB: "UBIN", // Andhra -> Union
  VJYA: "BARB", // Vijaya -> BOB
  DENA: "BARB", // Dena -> BOB
};

/** Four letters, a zero, then six letters or digits. */
const SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export interface IfscLookup {
  valid: boolean;
  /** The prefix that replaced a retired one, when there is one. */
  retiredTo?: string;
}

export function lookupIfsc(code: string): IfscLookup {
  const normalised = code.trim().toUpperCase();
  if (!SHAPE.test(normalised)) return { valid: false };

  const replacement = RETIRED[normalised.slice(0, 4)];
  return replacement ? { valid: false, retiredTo: replacement } : { valid: true };
}
