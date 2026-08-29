import { z } from "zod";
import { fail, ok, readJson, sameOrigin } from "@/lib/api/respond";
import { checkPassword, isEmail, normaliseEmail } from "@/lib/auth/password";
import { ensureSeed } from "@/lib/auth/seed";
import { createSession, publicUser } from "@/lib/auth/session";
import { createUser, userByEmail } from "@/lib/auth/users";
import { rateLimit, clientKey } from "@/lib/security/ratelimit";

const Body = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().max(254),
  password: z.string().min(1).max(200),
  role: z.enum(["citizen", "employer"]).default("citizen"),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("UNAUTHORIZED");

  const limit = rateLimit("signup", clientKey(request));
  if (!limit.ok) {
    const res = fail("RATE_LIMITED");
    res.headers.set("retry-after", String(limit.retryAfter));
    return res;
  }

  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) return fail("INVALID_REQUEST");

  const { name, password, role } = parsed.data;
  const email = normaliseEmail(parsed.data.email);

  if (!isEmail(email)) return fail("INVALID_REQUEST", { fields: { email: "invalid_email" } });

  const problem = checkPassword(password, email);
  if (problem) return fail("INVALID_REQUEST", { fields: { password: problem } });

  await ensureSeed();

  // An honest 409 here does confirm the address is registered. That is the
  // right trade for a sign-up form: silently "succeeding" on a duplicate
  // strands the real owner and the new user equally, and the same fact is
  // already discoverable through any password-reset flow.
  if (userByEmail(email)) return fail("CONFLICT", { fields: { email: "already_registered" } });

  const user = await createUser({ email, name, password, role });
  await createSession(user.id, request.headers.get("user-agent") ?? "");

  return ok({ user: publicUser(user) });
}
