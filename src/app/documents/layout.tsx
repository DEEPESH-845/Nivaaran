import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your documents — Nivaaran",
  description:
    "Read your identity document and passbook, and compare every field against the EPFO record. A pre-check — EPFO performs final verification.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
