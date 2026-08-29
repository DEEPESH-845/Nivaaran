import { digitsOnly, verhoeffCheckDigit } from "./verhoeff";

/**
 * Everything the specimen card derives rather than stores.
 *
 * All of it is a pure function of a seed, so the same persona always gets the
 * same portrait gradient and the same reverse-face matrix — a card that
 * reshuffled itself on every render would read as noise, not as an object.
 */

/** How much of a number is ever rendered without an explicit reveal. */
const TAIL = 4;

/** FNV-1a. Small, fast, and stable across runs, which is all we need. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A deterministic 0→1 stream from one seed. */
function rng(seed: string): () => number {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
}

/**
 * The only rendering of a typed number that reaches the DOM by default.
 *
 * Eight X's, then the last four — the form every bank statement in India
 * already uses, and the reason a screenshot of this card discloses nothing.
 */
export function maskAadhaar(input: string): string {
  const d = digitsOnly(input);
  return `XXXX XXXX ${d.length >= TAIL ? d.slice(-TAIL) : "____"}`;
}

/** Full number in groups of four. Only ever called behind the reveal control. */
export function groupAadhaar(input: string): string {
  const d = digitsOnly(input);
  return [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12)].filter(Boolean).join(" ");
}

/** First and last initial. The portrait is a monogram, never a photograph. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Two stops for the portrait plate. Hues stay inside the indigo→violet arc so
 * a generated gradient can never fight the card's own palette.
 */
export function seededPalette(seed: string): { from: string; to: string } {
  const r = rng(`palette:${seed}`);
  const base = 240 + Math.floor(r() * 60);
  return {
    from: `oklch(0.42 0.13 ${base})`,
    to: `oklch(0.28 0.09 ${(base + 40) % 360})`,
  };
}

/**
 * The reverse face's matrix. It encodes nothing and scans as nothing — it is a
 * texture, and the card says so in words directly beside it.
 */
export function dotMatrix(seed: string, side: number): boolean[] {
  const r = rng(`matrix:${seed}`);
  return Array.from({ length: side * side }, () => r() > 0.45);
}

/**
 * A checksum-valid number nobody has to think about, so a judge can watch the
 * card work without typing an identifier they actually own.
 */
export function specimenNumber(seed: string): string {
  const r = rng(`number:${seed}`);
  let body = String(2 + Math.floor(r() * 8)); // never 0 or 1
  while (body.length < 11) body += String(Math.floor(r() * 10));
  return body + verhoeffCheckDigit(body);
}
