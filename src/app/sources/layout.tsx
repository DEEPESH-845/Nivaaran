import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sources & limitations — Nivaaran",
  description: "Every rule, its citation, the date we checked it and how confident we are.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
