import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@/lib/auth/roles";
import { db, flush, sweepSessions, type UserRecord } from "@/lib/db/store";

/**
 * Server-held sessions.
 *
 * The browser holds an opaque random token in an HttpOnly cookie; the server
 * holds only its SHA-256. A stolen database therefore yields no usable
 * session, and no session state is readable or forgeable by client script.
 *
 * There is no JWT here on purpose: a bearer token that cannot be revoked is
 * the wrong trade for a product whose whole claim is trustworthiness.
 */

export const COOKIE = "nivaaran_session";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Re-issue the expiry when a session is more than a day old. */
const ROLL_AFTER_MS = 24 * 60 * 60 * 1000;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  demo: boolean;
  lang: "en" | "hi";
}

export function publicUser(u: UserRecord): SessionUser {
  // Explicit projection, never a spread: passwordHash must be impossible to
  // leak by adding a field to UserRecord later.
  return { id: u.id, email: u.email, name: u.name, role: u.role, demo: u.demo, lang: u.lang };
}

export async function createSession(userId: string, agent = ""): Promise<void> {
  sweepSessions();
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();

  db.sessions[hash(token)] = {
    tokenHash: hash(token),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + TTL_MS).toISOString(),
    agent: agent.slice(0, 120),
  };
  flush();

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

/**
 * Resolve the caller. Returns null for anonymous, which is a valid state
 * across most of this product — the no-login journey still works.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const record = db.sessions[hash(token)];
  if (!record) return null;

  if (Date.parse(record.expiresAt) <= Date.now()) {
    delete db.sessions[record.tokenHash];
    flush();
    return null;
  }

  const user = db.users[record.userId];
  if (!user) return null;

  if (Date.now() - Date.parse(record.createdAt) > ROLL_AFTER_MS) {
    record.expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    record.createdAt = new Date().toISOString();
    flush();
  }

  return publicUser(user);
}

/** Invalidate server-side first: a cleared cookie alone is not a logout. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token && db.sessions[hash(token)]) {
    delete db.sessions[hash(token)];
    flush();
  }
  jar.delete(COOKIE);
}

/** Every live session for one user, for the account page. Never another user's. */
export function sessionsFor(userId: string) {
  return Object.values(db.sessions)
    .filter((s) => s.userId === userId && Date.parse(s.expiresAt) > Date.now())
    .map((s) => ({ createdAt: s.createdAt, expiresAt: s.expiresAt, agent: s.agent }));
}
