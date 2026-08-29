import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beyond PF — Nivaaran",
  description:
    "Provident fund is the proof of concept. The same validation layer sits in front of any high-friction government workflow. A statement of direction, not of what is built.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
