"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, FileWarning, ShieldCheck, Wallet } from "lucide-react";
import { Badge, ButtonLink, Card, SectionLabel } from "@/components/ui";
import { NameDiff } from "@/components/name-diff";
import { compareNames } from "@/lib/match/name";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";
import { PERSONAS } from "@/content/personas";

const COPY = {
  eyebrow: {
    en: "EPF withdrawal · 1 in 5 claims is rejected",
    hi: "PF निकासी · हर पाँच में से एक दावा ख़ारिज",
  },
  headline: {
    en: "The system checks your claim after you file it.",
    hi: "सिस्टम आपका दावा भरने के बाद जाँचता है।",
  },
  headlineTurn: { en: "We check it before.", hi: "हम पहले जाँचते हैं।" },
  body: {
    en: "Last year 7.96 crore EPF claims were filed and 1.74 crore were rejected — almost always for a mismatch inside your own record that nobody ever showed you. You find out on day twenty, in five words you cannot act on.",
    hi: "पिछले साल 7.96 करोड़ EPF दावे भरे गए और 1.74 करोड़ ख़ारिज हो गए — लगभग हमेशा आपके ही रिकॉर्ड की ऐसी गड़बड़ी से जो आपको कभी दिखाई नहीं गई। पता बीसवें दिन चलता है, पाँच ऐसे शब्दों में जिन पर आप कुछ कर ही नहीं सकते।",
  },
  intentQ: {
    en: "What do you need to get done?",
    hi: "आपको क्या करवाना है?",
  },
  intentHint: {
    en: "Pick the sentence that sounds like you. No login, nothing to download.",
    hi: "वह वाक्य चुनें जो आप पर लागू हो। न लॉगिन, न कुछ डाउनलोड करना।",
  },
  proofLabel: { en: "What a rejection actually looks like", hi: "ख़ारिजी असल में ऐसी दिखती है" },
  proofQuote: { en: "“Name not as per records.”", hi: "“Name not as per records.”" },
  proofBody: {
    en: "That is the entire message EPFO sends. It does not say which name, or which record. Here is what it meant for one member:",
    hi: "EPFO का पूरा संदेश बस इतना ही होता है। यह नहीं बताता कि कौन-सा नाम, या कौन-सा रिकॉर्ड। एक सदस्य के लिए इसका मतलब यह था:",
  },
  proofCaption: {
    en: "One initial instead of a full middle name. Twenty days to discover it. About ten minutes to fix — if somebody tells you.",
    hi: "पूरे बीच के नाम की जगह सिर्फ़ एक अक्षर। पता चलने में बीस दिन। ठीक करने में लगभग दस मिनट — बशर्ते कोई बता दे।",
  },
  howLabel: { en: "How it works", hi: "यह कैसे काम करता है" },
  steps: [
    {
      en: { t: "Tell us your situation", d: "Five questions in plain language. No UAN password, no OTP, no login." },
      hi: { t: "अपनी स्थिति बताएँ", d: "आसान भाषा में पाँच सवाल। न UAN पासवर्ड, न OTP, न लॉगिन।" },
    },
    {
      en: { t: "We run the checks EPFO will run", d: "A deterministic rule engine, not a chatbot. Every rule cites the government source it came from." },
      hi: { t: "हम वही जाँच चलाते हैं जो EPFO चलाएगा", d: "एक निश्चित नियम-इंजन, चैटबॉट नहीं। हर नियम अपना सरकारी स्रोत बताता है।" },
    },
    {
      en: { t: "Fix what is broken, then file once", d: "Every problem says whose job it is — yours, your employer's, or EPFO's — and how long it takes." },
      hi: { t: "जो ख़राब है उसे ठीक करें, फिर एक ही बार भरें", d: "हर दिक़्क़त बताती है कि वह किसका काम है — आपका, नियोक्ता का, या EPFO का — और कितना समय लगेगा।" },
    },
  ],
  demoNote: {
    en: "Each option loads a synthetic member record so you can see the whole journey. No real data is used anywhere.",
    hi: "हर विकल्प एक काल्पनिक सदस्य रिकॉर्ड खोलता है ताकि आप पूरी यात्रा देख सकें। कहीं भी असली डेटा इस्तेमाल नहीं होता।",
  },
} as const;

const ICONS = [Wallet, FileWarning, ShieldCheck];

export default function Landing() {
  const { t, lang } = useLang();
  const { begin } = useSession();
  const router = useRouter();

  const demo = compareNames("RAJESH K SHARMA", "Rajesh Kumar Sharma");

  function choose(id: string) {
    const persona = PERSONAS.find((p) => p.id === id);
    if (!persona) return;
    begin(persona.id, persona.facts);
    router.push("/check");
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* ---------------------------------------------------------- Hero */}
      <section className="pb-10 pt-10 sm:pt-16">
        <Badge tone="blocked">{t(COPY.eyebrow)}</Badge>

        <h1 className="display mt-5 max-w-3xl text-balance">
          <span className="text-ink-mute">{t(COPY.headline)}</span>{" "}
          <span className="text-ink">{t(COPY.headlineTurn)}</span>
        </h1>

        <p className="mt-5 max-w-2xl text-md leading-relaxed text-ink-soft">
          {t(COPY.body)}
        </p>
      </section>

      {/* ------------------------------------------------------- Intent */}
      <section aria-labelledby="intent-q" className="pb-4">
        <h2 id="intent-q" className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {t(COPY.intentQ)}
        </h2>
        <p className="mt-1.5 text-base text-ink-mute">{t(COPY.intentHint)}</p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {PERSONAS.map((p, i) => {
            const Icon = ICONS[i];
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => choose(p.id)}
                  className="group flex h-full w-full flex-col gap-3 rounded-card border border-line-strong bg-paper-raised p-4 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-[0_1px_2px_rgba(30,30,60,0.06),0_10px_28px_-14px_rgba(30,30,60,0.28)]"
                >
                  <Icon
                    aria-hidden
                    className="size-5 shrink-0 text-ink-faint transition-colors group-hover:text-indigo-600"
                    strokeWidth={1.6}
                  />
                  <span className="flex-1 text-md font-medium leading-snug text-ink">
                    &ldquo;{t(p.saying)}&rdquo;
                  </span>
                  <span className="flex items-center justify-between gap-2 border-t border-line-soft pt-3">
                    <span className="text-2xs uppercase tracking-[0.08em] text-ink-faint">
                      {lang === "hi" ? "नमूना" : "Demo"} · {p.name.split(" ")[0]}, {p.age}, {p.city}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-600"
                      strokeWidth={1.8}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">{t(COPY.demoNote)}</p>
      </section>

      {/* -------------------------------------------------------- Proof */}
      <section className="py-12 sm:py-16">
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[1fr_1.15fr] md:gap-8">
            <div className="space-y-3">
              <SectionLabel>{t(COPY.proofLabel)}</SectionLabel>
              <p className="font-mono text-lg leading-snug text-blocked-700">
                {t(COPY.proofQuote)}
              </p>
              <p className="text-sm leading-relaxed text-ink-soft">{t(COPY.proofBody)}</p>
            </div>
            <div className="space-y-3">
              <NameDiff
                verdict={demo}
                leftLabel={lang === "hi" ? "EPFO रिकॉर्ड" : "EPFO record"}
                rightLabel={lang === "hi" ? "आधार" : "Aadhaar"}
              />
              <p className="text-sm leading-relaxed text-ink-soft">
                {t(COPY.proofCaption)}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ---------------------------------------------------- How it works */}
      <section aria-labelledby="how" className="pb-14">
        <h2 id="how" className="sr-only">
          {t(COPY.howLabel)}
        </h2>
        <SectionLabel>{t(COPY.howLabel)}</SectionLabel>
        <ol className="mt-4 grid gap-6 sm:grid-cols-3 sm:gap-7">
          {COPY.steps.map((s, i) => (
            <li key={i} className="border-t-2 border-ink pt-4">
              <span className="tnum font-mono text-sm text-ink-faint">
                0{i + 1}
              </span>
              <h3 className="mt-1.5 text-md font-semibold leading-snug text-ink">
                {s[lang].t}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {s[lang].d}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="pb-8">
        <ButtonLink href="/why" tone="secondary" size="lg">
          {lang === "hi" ? "यह बेहतर क्यों है — पहले और बाद" : "Why this is better — before and after"}
          <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
        </ButtonLink>
      </section>
    </div>
  );
}
