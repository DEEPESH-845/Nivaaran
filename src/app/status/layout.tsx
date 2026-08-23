import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim status — Nivaaran",
  description: "A status timeline that explains itself instead of saying Pending.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
