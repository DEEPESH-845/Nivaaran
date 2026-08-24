"use client";

import { ExternalLink } from "lucide-react";
import { Badge, Card, SectionLabel, type Tone } from "@/components/ui";
import { SOURCE_LIST } from "@/lib/rules/sources";
import { RULES, ENGINE_VERSION } from "@/lib/rules/rules";
import { useLang } from "@/lib/i18n/context";
import type { Confidence } from "@/lib/rules/types";

const CONF_TONE: Record<Confidence, Tone> = {
  high: "clear",
  medium: "caution",
  low: "blocked",
};

const CONF_LABEL: Record<Confidence, { en: string; hi: string }> = {
  high: { en: "High confidence", hi: "उच्च विश्वसनीयता" },
  medium: { en: "Medium confidence", hi: "मध्यम विश्वसनीयता" },
  low: { en: "Illustrative only", hi: "केवल उदाहरण" },
};

const REAL = [
  { en: "The rule engine — deterministic, versioned, unit-tested, runs with no network", hi: "नियम-इंजन — निश्चित, संस्करणबद्ध, परीक्षित, बिना नेटवर्क चलता है" },
  { en: "Name and date reconciliation, including the token-level difference you are shown", hi: "नाम और तारीख़ का मिलान, उस शब्द-स्तरीय अंतर सहित जो आपको दिखाया जाता है" },
  { en: "The IFSC format check", hi: "IFSC प्रारूप की जाँच" },
  { en: "The public Preflight API — documented and runnable at /api", hi: "सार्वजनिक प्री-फ़्लाइट API — /api पर दस्तावेज़ और चलाकर देखने योग्य" },
  { en: "Every citation, verification date and confidence level on this page", hi: "इस पृष्ठ का हर उद्धरण, सत्यापन तिथि और विश्वसनीयता स्तर" },
];

const MOCKED = [
  { en: "The member record itself — read from a synthetic file, not from EPFO", hi: "सदस्य रिकॉर्ड — काल्पनिक फ़ाइल से लिया गया, EPFO से नहीं" },
  { en: "Claim submission — nothing is sent anywhere", hi: "दावा भेजना — कुछ भी कहीं नहीं भेजा जाता" },
  { en: "Status progression — stepped by hand on the status page", hi: "स्थिति की प्रगति — स्थिति पृष्ठ पर हाथ से आगे बढ़ाई जाती है" },
  { en: "The retired-IFSC list — a demonstration set, not the live NPCI directory", hi: "बंद IFSC की सूची — प्रदर्शन के लिए, लाइव NPCI डायरेक्टरी नहीं" },
  { en: "Any payment, OTP or authentication — none exists in this build", hi: "कोई भुगतान, OTP या प्रमाणीकरण — इस बिल्ड में मौजूद ही नहीं" },
];

export default function SourcesPage() {
  const { lang, t } = useLang();

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10 sm:py-14">
      <section className="space-y-3">
        <SectionLabel>{lang === "hi" ? "स्रोत और सीमाएँ" : "Sources & limitations"}</SectionLabel>
        <h1 className="display max-w-3xl text-balance">
          {lang === "hi"
            ? "अगर हम उसका हवाला नहीं दे सकते, तो हम उसे कहते नहीं।"
            : "If we can't cite it, we don't assert it."}
        </h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">
          {lang === "hi"
            ? `इंजन के ${RULES.length} नियमों में से हर एक ठीक एक स्रोत की ओर इशारा करता है। हर स्रोत की जाँच तिथि और विश्वसनीयता यहाँ दर्ज है। सरकारी नियम बदलते हैं; जो हमने नहीं जाँचा, हम उसे नहीं गढ़ते।`
            : `Each of the engine's ${RULES.length} rules points at exactly one source. Every source carries the date we checked it and how confident we are. Government rules change; where we have not verified something, we say so rather than invent it.`}
        </p>
      </section>

      {/* --------------------------------------------------- Real vs mocked */}
      <section className="grid gap-4 md:grid-cols-2">
        {[
          { title: { en: "What actually works", hi: "जो सचमुच काम करता है" }, tone: "clear" as const, items: REAL },
          { title: { en: "What is mocked", hi: "जो नक़ली है" }, tone: "caution" as const, items: MOCKED },
        ].map((col) => (
          <Card key={col.title.en} className="space-y-3 p-5">
            <Badge tone={col.tone}>{t(col.title)}</Badge>
            <ul className="space-y-2.5">
              {col.items.map((it, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-faint" />
                  {t(it)}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      {/* ------------------------------------------------------- Registry */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "स्रोत रजिस्ट्री" : "Source registry"}
        </h2>
        <ul className="space-y-3">
          {SOURCE_LIST.map((s) => (
            <li key={s.id}>
              <Card className="space-y-2.5 p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={CONF_TONE[s.confidence]}>{CONF_LABEL[s.confidence][lang]}</Badge>
                  <span className="font-mono text-2xs text-ink-faint">{s.id}</span>
                </div>
                <p className="font-medium leading-snug text-ink">{s.title}</p>
                <p className="text-sm text-ink-mute">
                  {s.publisher} · {lang === "hi" ? "जाँचा गया" : "verified"} {s.verifiedOn}
                </p>
                {s.note ? (
                  <p className="rounded-ctl border border-caution-100 bg-caution-50 p-3 text-xs leading-relaxed text-caution-700">
                    {s.note}
                  </p>
                ) : null}
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 break-all text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {s.url}
                  <ExternalLink aria-hidden className="size-3.5 shrink-0" strokeWidth={1.8} />
                </a>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------- Privacy */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "आपका डेटा" : "Your data"}
        </h2>
        <Card className="space-y-2.5 p-5 text-sm leading-relaxed text-ink-soft">
          <p>
            {lang === "hi"
              ? "इस प्रोटोटाइप में कोई असली व्यक्तिगत जानकारी न माँगी जाती है, न सहेजी जाती है। कोई खाता नहीं, कोई सर्वर-साइड उपयोगकर्ता रिकॉर्ड नहीं। आपकी प्रगति सिर्फ़ इसी ब्राउज़र के लोकल स्टोरेज में रहती है और “फिर से शुरू करें” दबाने पर मिट जाती है।"
              : "This prototype requests and stores no real personal information. No accounts, no server-side user records. Your progress lives in this browser's local storage only, and is erased when you press “Start over”."}
          </p>
          <p>
            {lang === "hi"
              ? "कृपया कहीं भी असली आधार, PAN, UAN, बैंक विवरण, पासवर्ड या OTP न डालें। यह एक स्वतंत्र हैकथॉन प्रोटोटाइप है, कोई सरकारी सेवा नहीं।"
              : "Please do not enter a real Aadhaar, PAN, UAN, bank detail, password or OTP anywhere. This is an independent hackathon prototype, not a government service."}
          </p>
          <p className="font-mono text-xs text-ink-faint">
            {lang === "hi" ? "इंजन संस्करण" : "Engine version"} {ENGINE_VERSION} ·{" "}
            {RULES.length} {lang === "hi" ? "नियम" : "rules"} · {SOURCE_LIST.length}{" "}
            {lang === "hi" ? "स्रोत" : "sources"}
          </p>
        </Card>
      </section>
    </div>
  );
}
