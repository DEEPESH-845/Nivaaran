import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@/lib/auth/roles";
import { safeNext } from "./redirect";
import { getSessionUser, type SessionUser } from "./session";

export { safeNext };

/**
 * Server-side access control.
 *
 * This is the authority. Hiding a nav link is presentation; middleware is a
 * fast redirect for the common case. Neither is a control. Every protected
 * page and every protected route calls one of these, on the server, before it
 * reads any user-owned data.
 */

export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`);
  return user;
}

export async function requireRole(roles: Role[], returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!roles.includes(user.role)) redirect(`/forbidden?need=${roles[0]}`);
  return user;
}
