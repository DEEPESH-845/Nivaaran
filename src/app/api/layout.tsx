import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Preflight API — Nivaaran",
  description:
    "The same deterministic check, as an endpoint. Request shape, response shape, a copy-paste curl, and a live run against your own session.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
