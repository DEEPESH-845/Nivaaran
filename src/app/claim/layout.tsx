import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "File your claim — Nivaaran",
  description: "Exactly what gets submitted, with nothing hidden.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
