import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "For employers — Nivaaran",
  description:
    "The former employees whose PF claim is blocked on something only their employer can fix, and how long each has been waiting.",
  robots: { index: false, follow: true },
};

/**
 * The employer boundary.
 *
 * A layout, so it covers this route and everything nested under it — a new
 * page added below cannot forget to protect itself. A citizen who types
 * `/employer` is redirected to `/forbidden`, not shown a hidden menu item.
 *
 * The demo employer account is published on the sign-in page, so a judge is
 * one tap from the other side of this door.
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRole(["employer", "admin"], "/employer");
  return children;
}
