import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * Password hashing.
 *
 * scrypt from the Node standard library rather than a bcrypt/argon2 native
 * dependency: it is memory-hard, it is already here, and it needs no build
 * step on any platform this deploys to.
 *
 * The stored form is self-describing, so the cost parameters can be raised
 * later without invalidating existing hashes.
 */

const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;

  const expected = Buffer.from(hashB64, "base64");
  let derived: Buffer;
  try {
    derived = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  } catch {
    return false;
  }
  // Lengths are equal by construction, but timingSafeEqual throws if they are
  // not, and a malformed record must be a `false`, never a 500.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export type PasswordProblem = "too_short" | "too_long" | "too_simple" | "looks_like_email";

/**
 * Strength policy.
 *
 * Length first, because it is the only factor that reliably matters, with a
 * light variety floor to stop `aaaaaaaaaaaa`. No character-class theatre: a
 * mandatory symbol produces `Password1!` and nothing safer.
 */
export function checkPassword(password: string, email?: string): PasswordProblem | null {
  if (password.length < 10) return "too_short";
  // bcrypt's 72-byte trap does not apply to scrypt, but an unbounded password
  // is an unbounded amount of KDF work on an unauthenticated endpoint.
  if (password.length > 200) return "too_long";
  if (new Set(password).size < 5) return "too_simple";
  if (COMMON.has(password.toLowerCase())) return "too_simple";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase())) {
    return "looks_like_email";
  }
  return null;
}

/**
 * The passwords that actually show up in credential-stuffing lists, at the
 * lengths this policy would otherwise accept. Not a substitute for a breach
 * corpus — see README, "what would need to change in production".
 */
const COMMON = new Set([
  "password12", "password123", "password1234", "qwerty12345", "1234567890",
  "12345678901", "123456789012", "letmein1234", "iloveyou123", "welcome123",
  "admin12345", "abc123456789", "passw0rd123", "qwertyuiop1", "trustno1234",
]);

export function isEmail(value: string): boolean {
  // Deliberately permissive. The authority on whether an address exists is a
  // delivered mail, not a regex; this only rejects the obviously malformed.
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}
