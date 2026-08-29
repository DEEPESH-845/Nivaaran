import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { sessionsFor } from "@/lib/auth/session";
import { AccountClient } from "./account-client";

export const metadata: Metadata = {
  title: "Your account — Nivaaran",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireUser("/account");
  // Scoped to the caller by construction: `sessionsFor` takes a user id and
  // there is no route that lets a client supply one.
  return <AccountClient user={user} sessions={sessionsFor(user.id)} />;
}
