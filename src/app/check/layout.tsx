import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your situation — Nivaaran",
  description: "Five plain-language questions. No login, no form numbers.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
