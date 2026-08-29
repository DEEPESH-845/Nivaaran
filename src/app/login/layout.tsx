import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Nivaaran",
  description:
    "Sign in to pick your PF claim check back up. Demo accounts are published on the page.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
