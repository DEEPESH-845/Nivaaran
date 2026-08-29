"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/context";
import { LogOut, Menu, User, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Persistent, unmissable disclosure. Required by the brief and by decency.
 * It survives printing too — inverted to ink-on-paper, because a dark bar
 * either wastes toner or vanishes entirely depending on the browser.
 */
function NoticeBar() {
  const { ui } = useLang();
  return (
    <div className="bg-transparent text-ink-mute print:border-b print:border-line print:bg-transparent print:text-ink">
      <p className="mx-auto max-w-5xl px-4 py-1.5 text-2xs leading-snug tracking-[0.01em] print:px-0 print:text-ink-soft sm:text-xs text-center">
        {ui("notOfficial")}
      </p>
    </div>
  );
}

function LangToggle({ isDark = false }: { isDark?: boolean }) {
  const { lang, setLang, ui } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "hi" : "en")}
      className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-ctl border px-3 text-sm font-medium transition-colors ${
        isDark
          ? "border-white/20 bg-white/5 text-white hover:bg-white/10"
          : "border-line-strong bg-paper-raised text-ink hover:border-ink-mute hover:bg-paper-sunk"
      }`}
      aria-label={
        lang === "en" ? "हिंदी में देखें / Switch to Hindi" : "Switch to English"
      }
    >
      <svg aria-hidden viewBox="0 0 16 16" className="size-4 opacity-70">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1.75 8h12.5M8 1.75c1.7 1.9 2.55 4 2.55 6.25S9.7 12.35 8 14.25c-1.7-1.9-2.55-4-2.55-6.25S6.3 3.65 8 1.75z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
      {ui("langLabel")}
    </button>
  );
}

function Wordmark({ isDark = false }: { isDark?: boolean }) {
  const { lang } = useLang();
  return (
    <Link
      href="/"
      className="group inline-flex shrink-0 items-baseline gap-2 whitespace-nowrap rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label="Nivaaran — home"
    >
      <span className={`font-display text-2xl leading-none tracking-[-0.02em] transition-colors ${isDark ? "text-white" : "text-ink"}`}>
        {lang === "hi" ? "निवारण" : "Nivaaran"}
      </span>
      <span className={`hidden text-2xs font-medium uppercase tracking-[0.12em] transition-colors sm:inline ${isDark ? "text-white/60" : "text-ink-faint"}`}>
        {lang === "hi" ? "Nivaaran" : "निवारण"}
      </span>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { lang, ui } = useLang();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Which route the menu was opened on. Deriving `open` from it closes the
  // menu on navigation without an effect that fires a cascading render.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const mobileMenuOpen = menuFor === pathname;
  const setMobileMenuOpen = (open: boolean) => setMenuFor(open ? pathname : null);

  // /story has a completely dark background
  const isCinematic = pathname === "/story";

  // Lock scroll while the drawer is open, and let Escape close it — a panel
  // that covers the page and can only be dismissed by pointing at the right
  // 44 pixels is not navigable by keyboard.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuFor(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  // Navigation follows the account, so nobody is shown a door they cannot
  // open. This is presentation only: /employer and /governance are enforced
  // server-side in their layouts, and typing the address changes nothing.
  const navLinks = user
    ? [
        { href: "/dashboard", label: lang === "hi" ? "डैशबोर्ड" : "Dashboard" },
        { href: "/preflight", label: lang === "hi" ? "मेरी जाँच" : "My check" },
        { href: "/documents", label: lang === "hi" ? "दस्तावेज़" : "Documents" },
        { href: "/adhaar", label: lang === "hi" ? "आधार कार्ड" : "Aadhaar card" },
        ...(user.role === "employer" || user.role === "admin"
          ? [{ href: "/employer", label: lang === "hi" ? "पूर्व कर्मचारी" : "Leavers" }]
          : []),
        ...(user.role === "admin"
          ? [{ href: "/governance", label: lang === "hi" ? "नियम प्रशासन" : "Governance" }]
          : []),
        { href: "/why", label: lang === "hi" ? "यह बेहतर क्यों है" : "Why this is better" },
      ]
    : [
        { href: "/story", label: lang === "hi" ? "अनुभव करें" : "Experience" },
        { href: "/why", label: lang === "hi" ? "यह बेहतर क्यों है" : "Why this is better" },
        { href: "/documents", label: lang === "hi" ? "दस्तावेज़ मिलान" : "Compare documents" },
      ];

  const headerClass = isCinematic 
    ? "bg-black/85 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-black/75 border-white/10" 
    : "bg-paper/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-paper/60 border-line/40";
    
  const mobileBgClass = isCinematic 
    ? "bg-black/80 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-black/70" 
    : "bg-paper/90 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-paper/70";

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        {lang === "hi" ? "मुख्य सामग्री पर जाएँ" : "Skip to main content"}
      </a>

      <NoticeBar />

      <header className={`sticky top-0 z-40 border-b print:hidden transition-colors duration-300 ${headerClass}`}>
        {/* Three regions, sized on purpose: the brand and the utilities are
            fixed-size bookends, the navigation takes the slack between them.
            The bar gets a wider column than the page body — chrome is not
            content, and at max-w-5xl the desktop navigation needed 1052px of
            a 992px line, which is why the brand sat flush against "Dashboard"
            and every two-word label wrapped onto a second line. */}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8 xl:gap-8">
          <div className="shrink-0">
            <Wordmark isDark={isCinematic} />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden min-w-0 flex-1 xl:flex items-center gap-6">
            <nav className="flex flex-1 items-center gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className={`whitespace-nowrap text-sm font-medium transition-colors ${
                    isCinematic ? "text-white/80 hover:text-white" : "text-ink-soft hover:text-ink"
                  } ${pathname === link.href ? (isCinematic ? 'text-white' : 'text-ink') : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className={`h-4 w-px shrink-0 ${isCinematic ? 'bg-white/20' : 'bg-line-strong'}`}></div>
            <LangToggle isDark={isCinematic} />
            <ThemeToggle isDark={isCinematic} />
            {user ? (
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/account"
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-ctl px-3 text-sm font-medium transition-colors ${
                    isCinematic ? "text-white/85 hover:text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <User aria-hidden className="size-4" strokeWidth={1.8} />
                  {user.name.split(" ")[0]}
                  {user.demo ? (
                    <span className="shrink-0 whitespace-nowrap rounded-full border border-caution-200 bg-caution-50 px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.05em] text-caution-700">
                      {lang === "hi" ? "डेमो" : "Demo"}
                    </span>
                  ) : null}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut().then(() => router.push("/"))}
                  className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-ctl border px-3 text-sm font-medium transition-colors ${
                    isCinematic
                      ? "border-white/20 text-white hover:bg-white/10"
                      : "border-line-strong text-ink hover:bg-paper-sunk"
                  }`}
                >
                  <LogOut aria-hidden className="size-4" strokeWidth={1.8} />
                  {ui("signOut")}
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/login"
                  className={`inline-flex min-h-[40px] items-center rounded-ctl px-3 text-sm font-medium transition-colors ${
                    isCinematic ? "text-white/85 hover:text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {ui("signIn")}
                </Link>
                <Link
                  href="/#start"
                  className={`inline-flex min-h-[40px] items-center justify-center rounded-ctl px-4 text-sm font-medium transition-transform active:scale-95 ${
                    isCinematic
                      ? "bg-white text-black hover:bg-gray-100"
                      : "bg-indigo-600 text-paper hover:bg-indigo-700"
                  }`}
                >
                  {lang === "hi" ? "दावा जाँचें" : "Check a claim"}
                </Link>
              </div>
            )}
          </div>

          {/* Tablet + mobile: the drawer, not a squeezed desktop bar. */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3 xl:hidden">
            <LangToggle isDark={isCinematic} />
            <ThemeToggle isDark={isCinematic} />
            <button
              type="button"
              className={`-mr-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors ${
                isCinematic ? "text-white hover:bg-white/10" : "text-ink hover:bg-paper-sunk"
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav"
              aria-label={
                mobileMenuOpen
                  ? lang === "hi" ? "मेन्यू बंद करें" : "Close menu"
                  : lang === "hi" ? "मेन्यू खोलें" : "Open menu"
              }
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div id="mobile-nav" className={`absolute inset-x-0 top-full z-30 flex max-h-[calc(100dvh-4rem)] flex-col overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 xl:hidden ${mobileBgClass}`}>
          <nav aria-label={lang === "hi" ? "मुख्य मेन्यू" : "Main menu"} className="flex flex-col gap-4 text-lg">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={`block py-3 font-medium border-b ${
                  isCinematic ? "border-white/10 text-white/90" : "border-line text-ink"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href="/account"
                  className={`block py-3 font-medium border-b ${
                    isCinematic ? "border-white/10 text-white/90" : "border-line text-ink"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {ui("account")} · {user.name.split(" ")[0]}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void signOut().then(() => router.push("/"));
                  }}
                  className={`mt-4 flex w-full min-h-[48px] items-center justify-center rounded-ctl border px-4 text-base font-medium ${
                    isCinematic ? "border-white/25 text-white" : "border-line-strong text-ink"
                  }`}
                >
                  {ui("signOut")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`block py-3 font-medium border-b ${
                    isCinematic ? "border-white/10 text-white/90" : "border-line text-ink"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {ui("signIn")}
                </Link>
                <Link
                  href="/#start"
                  className={`mt-4 flex w-full min-h-[48px] items-center justify-center rounded-ctl px-4 text-base font-medium transition-transform active:scale-95 ${
                    isCinematic ? "bg-white text-black" : "bg-indigo-600 text-paper"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {lang === "hi" ? "दावा जाँचें" : "Check a claim"}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="mt-16 bg-paper-sunk/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-paper-sunk/50 print:mt-6 print:bg-transparent">
        <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 print:px-0 print:py-4">
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm print:hidden">
            <Link href="/story" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "कहानी अनुभव करें" : "Experience the story"}
            </Link>
            <Link href="/why" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "यह बेहतर क्यों है" : "Why this is better"}
            </Link>
            <Link href="/beyond" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "PF से आगे" : "Beyond PF"}
            </Link>
            <Link href="/sources" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "स्रोत, गोपनीयता और सीमाएँ" : "Sources, privacy & limits"}
            </Link>
            <Link href="/status" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "दावे की स्थिति" : "Claim status"}
            </Link>
            <Link href="/documents" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "दस्तावेज़ मिलान" : "Compare documents"}
            </Link>
            <Link href="/adhaar" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "आधार कार्ड" : "Your Aadhaar card"}
            </Link>
            {!user || user.role !== "citizen" ? (
              <Link href="/employer" className="font-medium text-indigo-600 hover:text-indigo-700">
                {lang === "hi" ? "नियोक्ताओं के लिए" : "For employers"}
              </Link>
            ) : null}
            <Link href="/api" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "प्री-फ़्लाइट API" : "Preflight API"}
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
