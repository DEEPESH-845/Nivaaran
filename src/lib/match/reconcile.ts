import type { Bi, Facts } from "@/lib/rules/types";
import { compareDates, compareNames, type NameVerdict } from "./name";

/**
 * Reconcile documents against the EPFO record.
 *
 * This is the table on /documents, and it is deliberately built out of the
 * same `compareNames` and `compareDates` the rules call. If this table and
 * `/preflight` could disagree, one of them would be lying to the citizen;
 * sharing the matcher makes that impossible.
 *
 * The constraint that shapes everything here: **only some of these
 * comparisons are ones EPFO actually runs.** A row carries a `ruleId` only
 * where a rule genuinely exists. Marking an IFSC difference as a blocker would
 * invent a rejection that will not happen — see `note` instead.
 */

export type FieldId = "name" | "dob" | "ifsc" | "accountLast4";
export type Side = "identity" | "bank";
/** Against the EPFO record. `unread` means we have no document value yet. */
export type CellVerdict = "agrees" | "differs" | "unread";

export interface Cell {
  value: string | null;
  verdict: CellVerdict;
  /** Token-level detail, for names only, so the existing diff can render it. */
  nameVerdict?: NameVerdict;
}

export interface ReconcileRow {
  field: FieldId;
  label: Bi;
  epfo: string;
  /**
   * Which documents can carry this field at all. Lets the screen tell "a
   * passbook has no date of birth" apart from "not read yet" — both of which
   * are a `unread` cell, and only one of which is worth showing a box for.
   */
  sides: Side[];
  identity: Cell;
  bank: Cell;
  /**
   * The rule a difference on this row trips. Absent where the engine runs no
   * such comparison — a difference is then real information, not a blocker.
   */
  ruleId?: string;
  /** What a difference means when no rule covers it. */
  note?: Bi;
  /**
   * The two documents disagree with each other. EPFO never compares them, so
   * this is always information and never counts toward the blocker headline.
   */
  documentsDisagree: boolean;
}

/** The four fields the engine compares, and which documents can carry each. */
const FIELDS: {
  field: FieldId;
  label: Bi;
  sides: Side[];
  ruleFor: Partial<Record<Side, string>>;
  note?: Bi;
}[] = [
  {
    field: "name",
    label: { en: "Name", hi: "नाम" },
    sides: ["identity", "bank"],
    ruleFor: { identity: "R-NAME-AADHAAR", bank: "R-BANK-NAME" },
  },
  {
    field: "dob",
    label: { en: "Date of birth", hi: "जन्मतिथि" },
    sides: ["identity"],
    ruleFor: { identity: "R-DOB-AADHAAR" },
  },
  {
    field: "ifsc",
    label: { en: "Bank IFSC", hi: "बैंक IFSC" },
    sides: ["bank"],
    ruleFor: {},
    note: {
      en: "EPFO pays the account it has on file, not the one in your passbook. A difference here does not reject the claim — it sends the money somewhere else.",
      hi: "EPFO उसी खाते में भुगतान करता है जो उसके रिकॉर्ड में है, आपकी पासबुक वाले में नहीं। यहाँ अंतर होने से दावा ख़ारिज नहीं होता — पैसा कहीं और चला जाता है।",
    },
  },
  {
    field: "accountLast4",
    label: { en: "Account, last 4 digits", hi: "खाते के आख़िरी 4 अंक" },
    sides: ["bank"],
    ruleFor: {},
    note: {
      en: "EPFO pays the account it has on file, not the one in your passbook. A difference here does not reject the claim — it sends the money somewhere else.",
      hi: "EPFO उसी खाते में भुगतान करता है जो उसके रिकॉर्ड में है, आपकी पासबुक वाले में नहीं। यहाँ अंतर होने से दावा ख़ारिज नहीं होता — पैसा कहीं और चला जाता है।",
    },
  },
];

/** The one place a field is named, so a screen never invents a second label. */
export const FIELD_LABELS = Object.fromEntries(FIELDS.map((f) => [f.field, f.label])) as Record<
  FieldId,
  Bi
>;

/** What a document reading can carry. Every field optional: slots read alone. */
export interface DocumentValues {
  name?: string | null;
  dob?: string | null;
  ifsc?: string | null;
  accountLast4?: string | null;
}

const epfoValue = (epfo: Facts["records"]["epfo"], field: FieldId): string => epfo[field];

/** Names go through the government-strict matcher; everything else is exact. */
function compare(field: FieldId, epfo: string, doc: string): { agrees: boolean; nameVerdict?: NameVerdict } {
  if (field === "name") {
    const nameVerdict = compareNames(epfo, doc);
    return { agrees: nameVerdict.passes, nameVerdict };
  }
  if (field === "dob") return { agrees: compareDates(epfo, doc).passes };
  return { agrees: epfo.trim().toUpperCase() === doc.trim().toUpperCase() };
}

function cell(field: FieldId, epfo: string, raw: string | null | undefined): Cell {
  const value = raw?.trim() ? raw.trim() : null;
  if (!value) return { value: null, verdict: "unread" };
  const { agrees, nameVerdict } = compare(field, epfo, value);
  return { value, verdict: agrees ? "agrees" : "differs", nameVerdict };
}

export function reconcile(
  epfo: Facts["records"]["epfo"],
  identity: DocumentValues = {},
  bank: DocumentValues = {},
): ReconcileRow[] {
  return FIELDS.map(({ field, label, sides, ruleFor, note }) => {
    const value = epfoValue(epfo, field);
    const id = sides.includes("identity")
      ? cell(field, value, identity[field])
      : { value: null, verdict: "unread" as const };
    const bk = sides.includes("bank")
      ? cell(field, value, bank[field])
      : { value: null, verdict: "unread" as const };

    // Only meaningful when both documents actually carry the field.
    const documentsDisagree =
      id.value !== null && bk.value !== null && !compare(field, id.value, bk.value).agrees;

    // The rule that a *differing* side trips. Identity first: an Aadhaar
    // mismatch is the one that stops the claim outright.
    const ruleId =
      (id.verdict === "differs" && ruleFor.identity) ||
      (bk.verdict === "differs" && ruleFor.bank) ||
      undefined;

    return { field, label, epfo: value, sides, identity: id, bank: bk, ruleId, note, documentsDisagree };
  });
}

/**
 * Rows that will actually stop a claim.
 *
 * A row counts only when it differs *and* a rule covers that comparison.
 * Counting an IFSC difference here would promise a rejection that will not
 * happen, which is the same sin as missing one.
 */
export function blockingRows(rows: ReconcileRow[]): ReconcileRow[] {
  return rows.filter((r) => Boolean(r.ruleId));
}

/** Rows we have read at all, so the screen can say what it is still missing. */
export function readRows(rows: ReconcileRow[]): ReconcileRow[] {
  return rows.filter((r) => r.identity.value !== null || r.bank.value !== null);
}
