import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Rule governance — Nivaaran",
  description:
    "Every rule in the engine, the government source under it, when that source was last read, and whether the reading still stands.",
  robots: { index: false, follow: true },
};

/** Governance is the engine's own record. Only an admin account reads it. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"], "/governance");
  return children;
}
