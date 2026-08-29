import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Aadhaar card — Nivaaran",
  description:
    "The record EPFO compares your claim against, as an object rather than a row in a table. A specimen card, built from details that stay in your browser.",
};

export default function AdhaarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
