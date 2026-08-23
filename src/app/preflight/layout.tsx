import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pre-flight result — Nivaaran",
  description: "Every check EPFO will run, run before you file — with the source of each rule.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
