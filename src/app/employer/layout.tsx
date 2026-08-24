import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For employers — Nivaaran",
  description:
    "Which of your leavers will have a PF claim rejected, and which of those only you can prevent. The same deterministic check, read from the other side.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
