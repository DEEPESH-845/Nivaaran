"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/i18n/context";

/**
 * The frame both auth pages sit in.
 *
 * Deliberately not a centred card on a gradient. Nivaaran's surface is warm
 * paper and its argument is the left column: a person signing in to a product
 * about a stuck PF claim should see, while they type, what the product is for.
 * On a phone the argument moves below the form, because the form is the task.
 */
export function AuthFrame({
  title,
  lede,
  children,
  footer,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { lang } = useLang();

  const points =
    lang === "hi"
      ? [
          ["आपकी जाँच सहेजी रहती है", "एक बार जाँच चलाइए; डैशबोर्ड याद रखता है कि क्या बचा है और किसका काम है।"],
          ["एक जगह पर सब कुछ", "हर सुधार, हर दस्तावेज़, हर चरण — एक ही दावे के नीचे।"],
          ["कुछ भी असली नहीं भेजा जाता", "यह स्वतंत्र प्रोटोटाइप है। किसी सरकारी सिस्टम से संपर्क नहीं होता।"],
        ]
      : [
          ["Your check is saved", "Run the check once. The dashboard remembers what is left and whose job it is."],
          ["One claim, one place", "Every fix, every document, every stage, under a single claim."],
          ["Nothing real is submitted", "An independent prototype. No government system is ever contacted."],
        ];

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16">
      {/* The form leads on mobile; the argument leads on desktop. */}
      <div className="order-2 space-y-8 lg:order-1">
        <div className="space-y-3">
          <h1 className="display text-balance">{title}</h1>
          <p className="max-w-md text-md leading-relaxed text-ink-soft">{lede}</p>
        </div>

        <ul className="space-y-5 border-t border-line pt-6">
          {points.map(([head, body]) => (
            <li key={head} className="flex gap-3">
              <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-indigo-600" strokeWidth={1.8} />
              <div className="space-y-1">
                <p className="font-medium text-ink">{head}</p>
                <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="max-w-md text-xs leading-relaxed text-ink-faint">
          {lang === "hi"
            ? "आप बिना खाते के भी पूरी यात्रा चला सकते हैं। खाता सिर्फ़ आपकी प्रगति सहेजता है।"
            : "You can run the entire journey without an account. Signing in only saves your progress."}{" "}
          <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-700">
            {lang === "hi" ? "बिना खाते के जाँचें" : "Check without an account"}
          </Link>
        </p>
      </div>

      <div className="order-1 space-y-5 lg:order-2">
        {children}
        {footer}
      </div>
    </div>
  );
}
