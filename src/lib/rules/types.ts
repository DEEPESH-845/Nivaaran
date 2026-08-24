import type { DateVerdict, NameVerdict } from "@/lib/match/name";

export type Lang = "en" | "hi";
/** Every citizen-visible string in the engine is bilingual by construction. */
export type Bi = { en: string; hi: string };

export type Confidence = "high" | "medium" | "low";

/** Who can actually fix this. Naming the owner is a core UX principle. */
export type Owner = "citizen" | "employer" | "epfo" | "time";

export type Severity = "blocker" | "warning" | "info";

export type Gate =
  | "identity"
  | "kyc"
  | "employment"
  | "eligibility"
  | "banking"
  | "tax";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  /** ISO date we last checked this claim. */
  verifiedOn: string;
  confidence: Confidence;
  /** Honest caveat shown alongside the citation. */
  note?: string;
}

export type Evidence =
  | { type: "name"; aLabel: Bi; bLabel: Bi; a: string; b: string; verdict: NameVerdict }
  | { type: "date"; aLabel: Bi; bLabel: Bi; a: string; b: string; verdict: DateVerdict }
  | { type: "value"; aLabel: Bi; bLabel: Bi; a: string; b: string }
  | { type: "note"; text: Bi };

export interface Fix {
  summary: Bi;
  steps: Bi[];
  /** Realistic active effort, not queue time. */
  minutes: number;
  /**
   * Fixes sharing a key are one action, and are billed once.
   * Correcting a name and a date of birth is one visit to Modify Basic
   * Details, and one Joint Declaration covers both fields — summing them
   * would quote a member twice for a single trip.
   */
  fixKey?: string;
  cost: Bi;
  /** Queue/processing time the citizen must wait after acting. */
  waitDays?: number;
  officialUrl?: string;
  officialLabel?: Bi;
  caveat?: Bi;
}

export interface Finding {
  ruleId: string;
  gate: Gate;
  severity: Severity;
  owner: Owner;
  title: Bi;
  why: Bi;
  evidence?: Evidence;
  fix: Fix;
  /**
   * The same problem, addressed to the other party. Present only on rules an
   * employer can actually act on — the citizen's steps ("sign in with your
   * UAN") are wrong advice for an HR desk. See src/app/employer.
   */
  employerFix?: Fix;
  sourceId: string;
}

/** The citizen's situation. Everything the engine is allowed to look at. */
export interface Facts {
  intent: "final_settlement" | "decode_rejection";
  daysSinceExit: number;
  exitDateFiled: "yes" | "no" | "unsure";
  uanAadhaarVerified: "yes" | "no" | "unsure";
  uanBeforeOct2017: "yes" | "no" | "unsure";
  multipleUans: "yes" | "no" | "unsure";
  serviceYears: number;
  claimAmount: number;
  panOnRecord: boolean;
  records: {
    epfo: { name: string; dob: string; ifsc: string; accountLast4: string };
    aadhaar?: { name: string; dob: string };
    bank?: { name: string; ifsc: string; accountLast4: string };
  };
}

export type Verdict = "clear" | "fixable" | "blocked_external";

export interface PreflightResult {
  verdict: Verdict;
  findings: Finding[];
  counts: { blockers: number; warnings: number; infos: number };
  /** Active effort across all citizen-owned fixes. */
  minutesToFix: number;
  owners: Owner[];
  engineVersion: string;
  evaluatedAt: string;
}

/**
 * EPFO's Jan-2025 Joint Declaration categories. Determines whether a citizen
 * can self-correct their own record or must route through an employer.
 */
export type JdCategory = "A" | "B" | "C";
