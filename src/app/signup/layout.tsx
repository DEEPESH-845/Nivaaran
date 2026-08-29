import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account — Nivaaran",
  description:
    "Create a Nivaaran account so your PF claim check is saved across devices. No real identifiers are requested.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
