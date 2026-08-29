"use client";

import Link from "next/link";
import { ButtonLink, Card, SectionLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { useLang } from "@/lib/i18n/context";

/**
 * 404.
 *
 * Part of the product, not a browser default. It says what happened, offers
 * the two destinations a lost visitor actually wants, and stays bilingual —
 * a Hindi reader who mistypes a URL should not fall out of Hindi.
 */
export default function NotFound() {
  const { lang } = useLang();
  const { user } = useAuth();

  const links = [
    { href: "/", en: "Home", hi: "मुख पृष्ठ" },
    { href: "/why", en: "Why Nivaaran", hi: "निवारण क्यों" },
    { href: "/sources", en: "Sources & limitations", hi: "स्रोत और सीमाएँ" },
    { href: "/api", en: "Preflight API", hi: "प्री-फ़्लाइट API" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="animate-rise space-y-4">
        <SectionLabel>404</SectionLabel>
        <h1 className="display text-balance">
          {lang === "hi" ? "यह पृष्ठ मौजूद नहीं है।" : "This page doesn't exist."}
        </h1>
        <p className="max-w-xl text-md leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "लिंक पुराना हो सकता है, या पृष्ठ कहीं और चला गया हो। आपका कोई डेटा नहीं खोया — जो जाँच आपने चलाई थी, वह वहीं है।"
            : "The link may be outdated, or the page may have moved. Nothing of yours is lost — any check you ran is still where you left it."}
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink href={user ? "/dashboard" : "/"} size="lg">
            {user
              ? lang === "hi"
                ? "मेरे डैशबोर्ड पर जाएँ"
                : "Go to my dashboard"
              : lang === "hi"
                ? "मुख पृष्ठ पर लौटें"
                : "Return home"}
          </ButtonLink>
          {user ? (
            <ButtonLink href="/" tone="secondary" size="lg">
              {lang === "hi" ? "मुख पृष्ठ" : "Return home"}
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <Card className="mt-10 p-4 sm:p-5">
        <SectionLabel>{lang === "hi" ? "शायद आप यह ढूँढ रहे थे" : "You may have wanted"}</SectionLabel>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="inline-flex min-h-11 items-center font-medium text-indigo-600 hover:text-indigo-700"
              >
                {lang === "hi" ? l.hi : l.en}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
