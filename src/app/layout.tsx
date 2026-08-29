import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, Noto_Sans_Devanagari } from "next/font/google";
import { AuthProvider } from "@/lib/auth/context";
import { LangProvider } from "@/lib/i18n/context";
import { SessionProvider } from "@/lib/state/session";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
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

/**
 * Devanagari is the expensive one. The subset is an order of magnitude larger
 * than a Latin face — three weights of it was 200KB on the wire, on every page
 * in the product, and on a slow connection that is what the largest paint is
 * waiting for. One weight now; the browser synthesises the heavier steps, and
 * the language toggle in the header means these glyphs are on the page in both
 * languages, so this stays preloaded rather than discovered late.
 */
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: "400",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#16181f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrument.variable} ${devanagari.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies a stored theme choice before first paint. Without this the
            page renders in the OS theme and then snaps to the chosen one — a
            white flash on the way into dark, which is exactly the moment it
            hurts. Absent a stored choice the attribute stays off and the CSS
            media query decides, so this is also correct with JS disabled. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("nivaaran-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}',
          }}
        />
      </head>
      <body>
        <LangProvider>
          <AuthProvider>
            <SessionProvider>
              <SmoothScrollProvider>
                <Shell>{children}</Shell>
              </SmoothScrollProvider>
            </SessionProvider>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
