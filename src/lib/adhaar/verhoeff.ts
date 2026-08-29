/**
 * The Verhoeff checksum, which is the one UIDAI actually uses.
 *
 * It exists because the two mistakes people make when copying a number by
 * hand are mistyping one digit and swapping two adjacent ones, and a plain
 * modulo check catches neither reliably. The tables below are the published
 * dihedral group D5 multiplication, permutation and inverse tables; the tests
 * pin them against the algorithm's own worked example, because a single
 * transposed cell here would reject valid numbers with no other symptom.
 */

const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

const INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/** Strip the spaces people type in groups of four. */
export const digitsOnly = (input: string): string => input.replace(/\D/g, "");

function fold(digits: string): number {
  let c = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    c = D[c][P[i % 8][Number(reversed[i])]];
  }
  return c;
}

/** The digit that makes `digits` valid when appended to it. */
export function verhoeffCheckDigit(digits: string): number {
  if (!/^\d+$/.test(digits)) throw new Error("verhoeffCheckDigit: digits only");
  return INV[fold(`${digits}0`)];
}

/** True when `digits` already carries its own correct check digit. */
export function verhoeffValidate(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  return fold(digits) === 0;
}

/**
 * A well-formed Aadhaar number: twelve digits, never starting 0 or 1, with a
 * correct Verhoeff digit. This says "well-formed", never "real" — no offline
 * check can tell you whether a number was ever issued, and the product must
 * not imply otherwise.
 */
export function isValidAadhaar(input: string): boolean {
  const d = digitsOnly(input);
  if (!/^[2-9]\d{11}$/.test(d)) return false;
  return verhoeffValidate(d);
}
