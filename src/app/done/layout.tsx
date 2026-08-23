import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim submitted — Nivaaran",
  description: "Your reference and what happens next.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
