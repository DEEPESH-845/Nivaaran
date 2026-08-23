import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, Noto_Sans_Devanagari } from "next/font/google";
import { LangProvider } from "@/lib/i18n/context";
import { SessionProvider } from "@/lib/state/session";
import { Shell } from "@/components/shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument",
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-deva",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nivaaran — know your PF claim will go through, before you file it",
  description:
    "One in five EPF claims is rejected, usually for a record mismatch the citizen could not see. Nivaaran runs the checks before you apply, explains what is wrong, and says whose job it is to fix. An independent hackathon prototype.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} ${devanagari.variable}`}>
      <body>
        <LangProvider>
          <SessionProvider>
            <Shell>{children}</Shell>
          </SessionProvider>
        </LangProvider>
      </body>
    </html>
  );
}
