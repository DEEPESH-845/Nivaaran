import { ok } from "@/lib/api/respond";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  // Anonymous is a valid answer, not an error: most of this product works
  // without an account and the client needs to know which mode it is in.
  return ok({ user: await getSessionUser() });
}
