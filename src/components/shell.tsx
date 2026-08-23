"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/i18n/context";

/** Persistent, unmissable disclosure. Required by the brief and by decency. */
function NoticeBar() {
  const { ui } = useLang();
  return (
    <div className="bg-ink text-paper">
      <p className="mx-auto max-w-5xl px-4 py-1.5 text-2xs leading-snug tracking-[0.01em] text-paper/85 sm:text-xs">
        {ui("notOfficial")}
      </p>
    </div>
  );
}

function LangToggle() {
  const { lang, setLang, ui } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-ctl border border-line-strong bg-paper-raised px-3 text-sm font-medium text-ink transition-colors hover:border-ink-mute hover:bg-paper-sunk"
      aria-label={
        lang === "en" ? "हिंदी में देखें / Switch to Hindi" : "Switch to English"
      }
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 text-ink-mute">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1.75 8h12.5M8 1.75c1.7 1.9 2.55 4 2.55 6.25S9.7 12.35 8 14.25c-1.7-1.9-2.55-4-2.55-6.25S6.3 3.65 8 1.75z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      {ui("langLabel")}
    </button>
  );
}

function Wordmark() {
  const { lang } = useLang();
  return (
    <Link
      href="/"
      className="group inline-flex items-baseline gap-2 rounded-ctl"
      aria-label="Nivaaran — home"
    >
      <span className="font-display text-2xl leading-none tracking-[-0.02em] text-ink">
        {lang === "hi" ? "निवारण" : "Nivaaran"}
      </span>
      <span className="hidden text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint sm:inline">
        {lang === "hi" ? "Nivaaran" : "निवारण"}
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { lang, ui } = useLang();
  const pathname = usePathname();
  const onLanding = pathname === "/";

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        {lang === "hi" ? "मुख्य सामग्री पर जाएँ" : "Skip to main content"}
      </a>

      <NoticeBar />

      {/* Opaque, not frosted: the landing narrative runs a full-bleed dark act
          underneath this bar, and translucency let its text bleed through. */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5">
          <Wordmark />
          <div className="flex items-center gap-2">
            {!onLanding && (
              <Link
                href="/why"
                className="hidden min-h-11 items-center rounded-ctl px-3 text-sm font-medium text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink sm:inline-flex"
              >
                {lang === "hi" ? "यह बेहतर क्यों है" : "Why this is better"}
              </Link>
            )}
            <LangToggle />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="mt-16 border-t border-line bg-paper-sunk">
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-8">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/why" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "यह बेहतर क्यों है" : "Why this is better"}
            </Link>
            <Link href="/sources" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "स्रोत और सीमाएँ" : "Sources & limitations"}
            </Link>
            <Link href="/status" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "दावे की स्थिति" : "Claim status"}
            </Link>
          </nav>
          <p className="max-w-2xl text-xs leading-relaxed text-ink-mute">
            {ui("notOfficial")}
          </p>
          <p className="max-w-2xl text-xs leading-relaxed text-ink-faint">
            {lang === "hi"
              ? "यहाँ कोई असली आधार, PAN, UAN, बैंक विवरण या OTP न डालें और न ही सहेजा जाता है। आपकी प्रगति सिर्फ़ इसी डिवाइस के ब्राउज़र में रहती है।"
              : "No real Aadhaar, PAN, UAN, bank details or OTPs are requested or stored. Your progress stays in this browser, on this device only."}
          </p>
        </div>
      </footer>
    </div>
  );
}
