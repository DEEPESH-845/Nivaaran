import { fail, ok, sameOrigin } from "@/lib/api/respond";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("UNAUTHORIZED");
  // Invalidates the server record, then clears the cookie. Idempotent: logging
  // out twice, or with no session at all, is a success.
  await destroySession();
  return ok({ ok: true });
}
