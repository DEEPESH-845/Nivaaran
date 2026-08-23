/**
 * Deterministic name reconciliation.
 *
 * Government auto-settlement compares names after light normalisation and
 * then demands an exact token match. Anything less stops the claim. This
 * module reproduces that judgement locally so a citizen can see the verdict
 * BEFORE submitting, and — unlike the portal — see *which token* broke it.
 *
 * No model is involved in the verdict. A model may later be asked to phrase
 * the explanation, never to decide it.
 */

export type MismatchKind =
  | "exact"
  | "initial_expansion"
  | "missing_token"
  | "extra_token"
  | "order"
  | "spelling"
  | "unrelated";

export type TokenState = "same" | "differs" | "missing" | "extra" | "initial";

export interface TokenDiff {
  text: string;
  state: TokenState;
}

export interface NameVerdict {
  /** Would a strict government matcher let this through? */
  passes: boolean;
  kind: MismatchKind;
  left: TokenDiff[];
  right: TokenDiff[];
  /** Human-readable, language-neutral summary key */
  summary: string;
}

const HONORIFICS = new Set([
  "MR", "MRS", "MS", "MISS", "SHRI", "SHRIMATI", "SMT", "SRI", "DR", "PROF", "M/S",
]);

/** Uppercase, strip punctuation and diacritics, collapse whitespace. */
export function normalise(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[.\-_,']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenise(raw: string): string[] {
  return normalise(raw)
    .split(" ")
    .filter((t) => t.length > 0 && !HONORIFICS.has(t));
}

/** Classic Levenshtein, small inputs only. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

const isInitialOf = (short: string, long: string) =>
  short.length === 1 && long.length > 1 && long[0] === short;

/**
 * Compare two names the way a strict matcher would, but report *why* it fails.
 */
export function compareNames(leftRaw: string, rightRaw: string): NameVerdict {
  const L = tokenise(leftRaw);
  const R = tokenise(rightRaw);

  if (L.join(" ") === R.join(" ") && L.length > 0) {
    return {
      passes: true,
      kind: "exact",
      left: L.map((t) => ({ text: t, state: "same" as TokenState })),
      right: R.map((t) => ({ text: t, state: "same" as TokenState })),
      summary: "exact",
    };
  }

  // Same multiset, different order — a documented failure mode when a portal
  // stores "SURNAME FIRSTNAME" and a document reads "FIRSTNAME SURNAME".
  const sortedL = [...L].sort().join(" ");
  const sortedR = [...R].sort().join(" ");
  if (L.length > 0 && sortedL === sortedR) {
    return {
      passes: false,
      kind: "order",
      left: L.map((t) => ({ text: t, state: "differs" as TokenState })),
      right: R.map((t) => ({ text: t, state: "differs" as TokenState })),
      summary: "order",
    };
  }

  // Greedy alignment, left-to-right.
  const left: TokenDiff[] = [];
  const right: TokenDiff[] = [];
  let i = 0;
  let j = 0;
  let sawInitial = false;
  let sawSpelling = false;
  let sawMissing = false;
  let sawExtra = false;

  while (i < L.length || j < R.length) {
    const a = L[i];
    const b = R[j];

    if (a === undefined) {
      right.push({ text: b, state: "extra" });
      sawExtra = true;
      j++;
      continue;
    }
    if (b === undefined) {
      left.push({ text: a, state: "extra" });
      sawMissing = true;
      i++;
      continue;
    }
    if (a === b) {
      left.push({ text: a, state: "same" });
      right.push({ text: b, state: "same" });
      i++; j++;
      continue;
    }
    if (isInitialOf(b, a) || isInitialOf(a, b)) {
      left.push({ text: a, state: "initial" });
      right.push({ text: b, state: "initial" });
      sawInitial = true;
      i++; j++;
      continue;
    }
    // Token dropped on one side entirely (middle name absent from a document)
    if (R.includes(a) && !L.includes(b)) {
      right.push({ text: b, state: "extra" });
      sawExtra = true;
      j++;
      continue;
    }
    if (L.includes(b) && !R.includes(a)) {
      left.push({ text: a, state: "missing" });
      sawMissing = true;
      i++;
      continue;
    }
    const dist = editDistance(a, b);
    if (dist <= Math.max(1, Math.floor(Math.min(a.length, b.length) / 4))) {
      left.push({ text: a, state: "differs" });
      right.push({ text: b, state: "differs" });
      sawSpelling = true;
      i++; j++;
      continue;
    }
    left.push({ text: a, state: "differs" });
    right.push({ text: b, state: "differs" });
    i++; j++;
    sawSpelling = true;
  }

  const kind: MismatchKind = sawInitial
    ? "initial_expansion"
    : sawMissing
      ? "missing_token"
      : sawExtra
        ? "extra_token"
        : sawSpelling
          ? "spelling"
          : "unrelated";

  return { passes: false, kind, left, right, summary: kind };
}

/* ---------------- Dates ---------------- */

export type DateMismatchKind = "exact" | "day_month_swap" | "year" | "different";

export interface DateVerdict {
  passes: boolean;
  kind: DateMismatchKind;
}

/** Accepts ISO `YYYY-MM-DD`. */
export function compareDates(left: string, right: string): DateVerdict {
  if (left === right) return { passes: true, kind: "exact" };
  const [ly, lm, ld] = left.split("-");
  const [ry, rm, rd] = right.split("-");
  if (ly === ry && lm === rd && ld === rm) {
    return { passes: false, kind: "day_month_swap" };
  }
  if (lm === rm && ld === rd) return { passes: false, kind: "year" };
  return { passes: false, kind: "different" };
}
