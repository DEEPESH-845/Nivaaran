import { randomBytes } from "node:crypto";
import { z } from "zod";
import { fail, ok, readJson, sameOrigin } from "@/lib/api/respond";
import { hashPassword, normaliseEmail, verifyPassword } from "@/lib/auth/password";
import { ensureSeed } from "@/lib/auth/seed";
import { createSession, publicUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/db/store";
import { userByEmail } from "@/lib/auth/users";
import { rateLimit, clientKey } from "@/lib/security/ratelimit";

const Body = z.object({
  email: z.string().trim().max(254),
  password: z.string().min(1).max(200),
});

/**
 * A wrong password and an unknown address must be indistinguishable, in the
 * response *and* in the time taken. Without this, the endpoint is an account
 * enumeration oracle: a miss returns instantly, a hit pays for scrypt.
 */
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword(randomBytes(24).toString("hex")));

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("UNAUTHORIZED");

  const ip = clientKey(request);

  // The spray limit: many accounts from one address. Checked before the body
  // is read, because an enumeration attempt should cost us nothing.
  const spray = rateLimit("loginIp", ip);
  if (!spray.ok) {
    const res = fail("RATE_LIMITED");
    res.headers.set("retry-after", String(spray.retryAfter));
    return res;
  }

  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_REQUEST");

  await ensureSeed();

  const email = normaliseEmail(parsed.data.email);

  // The guessing limit: one account from one address.
  const limit = rateLimit("login", `${ip}:${email}`);
  if (!limit.ok) {
    const res = fail("RATE_LIMITED");
    res.headers.set("retry-after", String(limit.retryAfter));
    return res;
  }

  const user = userByEmail(email);

  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid) {
    // One message for both cases, deliberately.
    return fail("UNAUTHENTICATED", { fields: { form: "bad_credentials" } });
  }

  await createSession(user.id, request.headers.get("user-agent") ?? "");
  logActivity(user.id, "signed_in");

  return ok({ user: publicUser(user) });
}
