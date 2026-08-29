import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { DashboardClient } from "./dashboard-client";

export const metadata: Metadata = {
  title: "Your claim — Nivaaran",
  description: "What is happening with your PF claim, and what to do next.",
  robots: { index: false, follow: false },
};

/**
 * The authorization boundary.
 *
 * `requireUser` runs on the server before a byte of this page is produced.
 * The middleware redirect that usually gets here first is a convenience; this
 * is the control. The client component below renders from the same session
 * store the rest of the journey uses, so the deterministic engine still runs
 * in the browser with no round trip.
 */
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  return <DashboardClient name={user.name} demo={user.demo} role={user.role} />;
}
