import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why this is better — Nivaaran",
  description: "Before and after, counted — including where we are honestly not better.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
