"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card, SectionLabel } from "@/components/ui";
import { useLang } from "@/lib/i18n/context";

/**
 * The judge affordance.
 *
 * Every published account and its password, one tap from the sign-in form.
 * These are seeded accounts backed entirely by invented records; the password
 * is in the README for the same reason it is here.
 */

export const DEMO_PASSWORD = "NivaaranDemo2026!";

const ACCOUNTS = [
  {
    email: "demo@nivaaran.app",
    what: { en: "Citizen · four blockers in the record", hi: "नागरिक · रिकॉर्ड में चार रुकावटें" },
  },
  {
    email: "employer@nivaaran.app",
    what: { en: "Employer · nine leavers, sorted by owner", hi: "नियोक्ता · नौ पूर्व कर्मचारी, मालिक के अनुसार" },
  },
  {
    email: "admin@nivaaran.app",
    what: { en: "Rule governance · every rule and its source", hi: "नियम प्रशासन · हर नियम और उसका स्रोत" },
  },
];

export function DemoCredentials({ onUse }: { onUse?: (email: string, password: string) => void }) {
  const { lang, t } = useLang();
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(email: string) {
    try {
      await navigator.clipboard.writeText(`${email}\n${DEMO_PASSWORD}`);
      setCopied(email);
      setTimeout(() => setCopied((c) => (c === email ? null : c)), 2000);
    } catch {
      // Clipboard blocked (insecure context, or a permission prompt declined).
      // The credentials are visible on screen regardless, so nothing is lost.
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <SectionLabel>{lang === "hi" ? "डेमो खाते" : "Demo accounts"}</SectionLabel>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {lang === "hi"
          ? "सभी का पासवर्ड एक ही है। हर खाते के पीछे पूरी तरह काल्पनिक रिकॉर्ड हैं।"
          : "All three share one password. Every record behind them is invented."}
      </p>

      <p className="tnum mt-3 select-all rounded-ctl border border-line bg-paper-sunk px-3 py-2 font-mono text-sm text-ink">
        {DEMO_PASSWORD}
      </p>

      <ul className="mt-3 space-y-2">
        {ACCOUNTS.map((a) => (
          <li key={a.email} className="rounded-ctl border border-line p-3">
            <p className="tnum break-all font-mono text-sm text-ink">{a.email}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-mute">{t(a.what)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {onUse ? (
                <button
                  type="button"
                  onClick={() => onUse(a.email, DEMO_PASSWORD)}
                  className="inline-flex min-h-9 items-center rounded-ctl bg-indigo-50 px-3 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                >
                  {lang === "hi" ? "इससे भरें" : "Fill this in"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => copy(a.email)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-ctl px-2 text-xs font-medium text-ink-mute transition-colors hover:text-ink"
              >
                {copied === a.email ? (
                  <>
                    <Check aria-hidden className="size-3.5" strokeWidth={2.2} />
                    {lang === "hi" ? "कॉपी हो गया" : "Copied"}
                  </>
                ) : (
                  <>
                    <Copy aria-hidden className="size-3.5" strokeWidth={1.8} />
                    {lang === "hi" ? "कॉपी करें" : "Copy"}
                  </>
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
