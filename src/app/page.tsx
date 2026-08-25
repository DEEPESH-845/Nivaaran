"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowRight, FileWarning, ShieldCheck, Wallet } from "lucide-react";

import { Badge, ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/motion/reveal";
import { MismatchScan } from "@/components/scenes/mismatch";
import { ScaleField } from "@/components/scenes/scale-field";
import { SilenceTrack } from "@/components/scenes/silence";
import { Gate } from "@/components/scenes/gate";
import { EngineLive } from "@/components/scenes/engine-live";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";
import { SOURCES } from "@/lib/rules/sources";
import { PERSONAS } from "@/content/personas";
import { authenticateWithAadhaar } from "@/lib/auth/mock";
import { useState } from "react";
/* ============================================================
   The landing page is one continuous argument, told in eight acts.

   01 the record   — one token fails a claim            (the thesis, shown)
   02 the door     — pick a situation                   (the citizen leaves here)
   03 the scale    — that token, 1.74 crore times
   04 the silence  — twenty days, then five words
   05 the machine  — why speed made it worse            (the dark act)
   06 the turn     — the fix already exists, and is free
   07 the check    — the engine, running in the page
   08 the place    — where this belongs

   Every figure traces to /sources. Nothing here is estimated for effect.
   ============================================================ */

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
    en: "Almost no claim fails because a form was filled in badly. It fails on a mismatch inside your own record that nobody ever showed you — one initial, one swapped date, one bank that no longer exists.",
    hi: "शायद ही कोई दावा इसलिए फ़ेल होता है कि फ़ॉर्म ग़लत भरा गया। वह आपके ही रिकॉर्ड की उस गड़बड़ी से फ़ेल होता है जो आपको कभी दिखाई नहीं गई — एक अक्षर, एक उलटी तारीख़, एक बैंक जो अब है ही नहीं।",
  },
  scrollCue: { en: "Why this keeps happening", hi: "यह बार-बार क्यों होता है" },

  intentQ: { en: "What do you need to get done?", hi: "आपको क्या करवाना है?" },
  intentHint: {
    en: "Pick the sentence that sounds like you. No login, nothing to download.",
    hi: "वह वाक्य चुनें जो आप पर लागू हो। न लॉगिन, न कुछ डाउनलोड करना।",
  },
  demoNote: {
    en: "Each option loads a synthetic member record so you can see the whole journey. No real data is used anywhere.",
    hi: "हर विकल्प एक काल्पनिक सदस्य रिकॉर्ड खोलता है ताकि आप पूरी यात्रा देख सकें। कहीं भी असली डेटा इस्तेमाल नहीं होता।",
  },

  scaleHeading: {
    en: "One in five. Every year. Almost all of it preventable before submission.",
    hi: "हर पाँच में से एक। हर साल। लगभग सब कुछ भरने से पहले रोका जा सकता था।",
  },

  turnLabel: { en: "EPFO circular · 16 January 2025", hi: "EPFO परिपत्र · 16 जनवरी 2025" },
  turnHeading: {
    en: "The repair already exists. It is official, it is free, and almost nobody knows it is there.",
    hi: "इसका इलाज पहले से मौजूद है। यह आधिकारिक है, मुफ़्त है, और लगभग किसी को पता नहीं कि है।",
  },
  turnBody: {
    en: "Since January 2025, an Aadhaar-verified member can correct their own name, date of birth and date of exit online — no documents, no employer sign-off, no EPFO approval. The remedy is live today. The only missing piece is that nobody can tell they need it.",
    hi: "जनवरी 2025 से, आधार-सत्यापित सदस्य अपना नाम, जन्मतिथि और नौकरी छोड़ने की तारीख़ ख़ुद ऑनलाइन ठीक कर सकता है — न दस्तावेज़, न नियोक्ता की मंज़ूरी, न EPFO की स्वीकृति। इलाज आज ही उपलब्ध है। कमी बस इतनी है कि किसी को पता ही नहीं चलता कि उसे इसकी ज़रूरत है।",
  },
  turnGap: {
    en: "That gap is the product — and it requires EPFO to change nothing.",
    hi: "वही खाई यह उत्पाद है — और इसके लिए EPFO को कुछ भी बदलना नहीं पड़ता।",
  },
  verifiedOn: { en: "verified", hi: "जाँचा गया" },
  confidence: { en: "confidence", hi: "विश्वास" },

  placeLabel: { en: "Where this check belongs", hi: "यह जाँच कहाँ होनी चाहिए" },
  placeHeading: {
    en: "The interface is the smallest part of the answer.",
    hi: "इंटरफ़ेस इस जवाब का सबसे छोटा हिस्सा है।",
  },
  placeBody: {
    en: "Because the engine is a pure function, it is already an API. It is shaped to run where the damage is actually done, not only here.",
    hi: "इंजन एक शुद्ध फ़ंक्शन है, इसलिए वह पहले से एक API है। उसे वहाँ चलने के लिए बनाया गया है जहाँ नुक़सान असल में होता है, सिर्फ़ यहाँ नहीं।",
  },
  places: [
    {
      where: { en: "In the member portal, before Submit", hi: "सदस्य पोर्टल में, Submit से पहले" },
      what: {
        en: "Every citizen-fixable mismatch, while it still costs ten minutes instead of twenty days",
        hi: "हर वह गड़बड़ी जो नागरिक ख़ुद ठीक कर सकता है — तब, जब उसकी क़ीमत बीस दिन नहीं, दस मिनट है",
      },
      who: { en: "EPFO", hi: "EPFO" },
    },
    {
      where: { en: "In an employer's HRMS, at exit", hi: "नियोक्ता के HRMS में, नौकरी छोड़ते समय" },
      what: {
        en: "The missing exit date — at source, before a member is ever blocked by it",
        hi: "छूटी हुई निकास तिथि — स्रोत पर ही, इससे पहले कि कोई सदस्य उसमें अटके",
      },
      who: { en: "Employer / payroll vendor", hi: "नियोक्ता / पेरोल वेंडर" },
    },
    {
      where: { en: "At UAN generation", hi: "UAN बनते समय" },
      what: {
        en: "Name and date-of-birth divergence on day one, before it can age",
        hi: "नाम और जन्मतिथि का अंतर पहले ही दिन, इससे पहले कि वह पुराना पड़े",
      },
      who: { en: "EPFO with the employer", hi: "EPFO और नियोक्ता मिलकर" },
    },
  ],

  closeHeading: {
    en: "Ten minutes, before. Or twenty days, after.",
    hi: "दस मिनट, पहले। या बीस दिन, बाद में।",
  },
  closeBody: {
    en: "Nothing about the record changed except the thing nobody had shown you.",
    hi: "रिकॉर्ड में कुछ नहीं बदला — सिवाय उस चीज़ के जो आपको किसी ने दिखाई नहीं थी।",
  },
  closeCta: { en: "Check a claim", hi: "एक दावा जाँचें" },
  whyLink: {
    en: "Why this is better — before and after",
    hi: "यह बेहतर क्यों है — पहले और बाद",
  },
} as const;

const ICONS = [Wallet, FileWarning, ShieldCheck];

/** Chapter mark. Carries the rhythm and keeps the page reading as one document. */
function Act({ n, title }: { n: string; title: string }) {
  return (
    <Reveal className="flex items-center gap-4 pb-8 pt-20 sm:pt-28">
      <span className="meta text-ink-faint">{n}</span>
      <span className="meta text-ink-mute">{title}</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </Reveal>
  );
}

export default function Landing() {
  const { t, lang } = useLang();
  const { begin } = useSession();
  const router = useRouter();
  const jd = SOURCES["epfo-jd-2025"];

  const [authenticating, setAuthenticating] = useState<string | null>(null);

  async function choose(id: string) {
    const persona = PERSONAS.find((p) => p.id === id);
    if (!persona) return;
    
    setAuthenticating(id);
    const user = await authenticateWithAadhaar(persona.id);
    
    // Live NPCI check before starting session
    const facts = structuredClone(persona.facts);
    const ifsc = facts.records.bank?.ifsc ?? facts.records.epfo.ifsc;
    if (ifsc) {
      try {
        const res = await fetch(`/api/ifsc?code=${ifsc}`);
        const data = await res.json();
        if (facts.records.bank) {
          facts.records.bank.ifscValid = data.valid;
          if (!data.valid && data.retiredTo) facts.records.bank.ifscRetiredTo = data.retiredTo;
        } else {
          facts.records.epfo.ifscValid = data.valid;
          if (!data.valid && data.retiredTo) facts.records.epfo.ifscRetiredTo = data.retiredTo;
        }
      } catch (e) {
        // Fallback on error
      }
    }
    
    begin(persona.id, facts, user.token);
    router.push("/check");
  }

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* ============================================ 01 · the record */}
      <section className="flex flex-col gap-7 pt-10 sm:pt-14 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-x-12 lg:gap-y-6">
        <div>
          <Badge tone="blocked">{t(COPY.eyebrow)}</Badge>

          <h1 className="display mt-6">
            <span className="text-ink-mute">{t(COPY.headline)}</span>{" "}
            <span className="block text-ink">{t(COPY.headlineTurn)}</span>
          </h1>
        </div>

        {/* On a phone the evidence comes before the elaboration: the record is
            the fastest way to understand the product, so it stays above the
            fold and the paragraph follows it. */}
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <MismatchScan />
        </div>

        <p className="max-w-xl text-md leading-relaxed text-ink-soft lg:col-start-1 lg:row-start-2">
          {t(COPY.body)}
        </p>
      </section>

      {/* ============================================== 02 · the door */}
      <section id="start" aria-labelledby="intent-q" className="scroll-mt-24 pt-16 sm:pt-20">
        <h2 id="intent-q" className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {t(COPY.intentQ)}
        </h2>
        <p className="mt-1.5 text-base text-ink-mute">{t(COPY.intentHint)}</p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {PERSONAS.map((p, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal as="li" key={p.id} delay={i * 70}>
                <button
                  type="button"
                  onClick={() => choose(p.id)}
                  className="group flex h-full w-full flex-col gap-3 rounded-card border border-line-strong bg-paper-raised p-4 text-left transition-[transform,border-color,box-shadow] duration-200 ease-(--ease-entry) hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-[0_1px_2px_rgba(30,30,60,0.06),0_10px_28px_-14px_rgba(30,30,60,0.28)]"
                >
                  <Icon
                    aria-hidden
                    className="size-5 shrink-0 text-ink-faint transition-colors group-hover:text-indigo-600"
                    strokeWidth={1.6}
                  />
                  <span className="flex-1 text-md font-medium leading-snug text-ink">
                    {authenticating === p.id ? (lang === "hi" ? "सत्यापित हो रहा है..." : "Authenticating...") : `"${t(p.saying)}"`}
                  </span>
                  <span className="flex items-center justify-between gap-2 border-t border-line-soft pt-3">
                    <span className="meta text-ink-faint">
                      {lang === "hi" ? "नमूना" : "Demo"} · {p.name.split(" ")[0]},{" "}
                      {p.age}, {p.city}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-600"
                      strokeWidth={1.8}
                    />
                  </span>
                </button>
              </Reveal>
            );
          })}
        </ul>

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          {t(COPY.demoNote)}
        </p>

        <p className="meta mt-8 flex items-center gap-2 text-ink-faint">
          <ArrowDown aria-hidden className="size-3.5" strokeWidth={1.8} />
          {t(COPY.scrollCue)}
        </p>
      </section>

      {/* ============================================= 03 · the scale */}
      <Act n="01" title={lang === "hi" ? "पैमाना" : "The scale"} />
      <Reveal as="section">
        <h2 className="display max-w-3xl text-balance text-ink">
          {t(COPY.scaleHeading)}
        </h2>
        <div className="mt-10">
          <ScaleField />
        </div>
      </Reveal>

      {/* =========================================== 04 · the silence */}
      <Act n="02" title={lang === "hi" ? "ख़ामोशी" : "The silence"} />
      <Reveal as="section">
        <SilenceTrack />
      </Reveal>

      {/* =========================================== 05 · the machine */}
      <Act n="03" title={lang === "hi" ? "मशीन" : "The machine"} />
      <Gate />

      {/* ============================================== 06 · the turn */}
      <Act n="04" title={lang === "hi" ? "मोड़" : "The turn"} />
      <Reveal as="section" className="max-w-3xl">
        <p className="meta text-indigo-600">{t(COPY.turnLabel)}</p>
        <h2 className="display mt-4 text-balance text-ink">
          {t(COPY.turnHeading)}
        </h2>
        <p className="mt-6 text-md leading-relaxed text-ink-soft">
          {t(COPY.turnBody)}
        </p>
        <p className="mt-4 text-md leading-relaxed text-ink">
          {t(COPY.turnGap)}
        </p>

        {jd ? (
          <div className="mt-7 rounded-card border border-line bg-paper-sunk p-4">
            <a
              href={jd.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-medium leading-snug text-indigo-600 hover:text-indigo-700"
            >
              {jd.title}
            </a>
            <p className="meta mt-1 text-ink-faint">
              {jd.publisher} · {t(COPY.verifiedOn)} {jd.verifiedOn} ·{" "}
              {jd.confidence} {t(COPY.confidence)}
            </p>
            {jd.note ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-mute">{jd.note}</p>
            ) : null}
          </div>
        ) : null}
      </Reveal>

      {/* ============================================= 07 · the check */}
      <Act n="05" title={lang === "hi" ? "जाँच" : "The check"} />
      <Reveal as="section">
        <EngineLive />
      </Reveal>

      {/* ============================================= 08 · the place */}
      <Act n="06" title={t(COPY.placeLabel)} />
      <Reveal as="section">
        <h2 className="display max-w-3xl text-balance text-ink">
          {t(COPY.placeHeading)}
        </h2>
        <p className="mt-5 max-w-2xl text-md leading-relaxed text-ink-soft">
          {t(COPY.placeBody)}
        </p>

        <ol className="mt-10">
          {COPY.places.map((pl, i) => (
            <li
              key={pl.who.en}
              className="grid gap-2 border-t border-ink py-6 md:grid-cols-[1.1fr_1.4fr_auto] md:gap-8"
            >
              <div className="flex gap-3">
                <span className="tnum meta text-ink-faint">0{i + 1}</span>
                <p className="text-md font-medium leading-snug text-ink">
                  {t(pl.where)}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-ink-soft md:pt-0.5">
                {t(pl.what)}
              </p>
              <p className="meta text-ink-mute md:pt-1 md:text-right">{t(pl.who)}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* ================================================== the close */}
      <Reveal as="section" className="pb-6 pt-20 sm:pt-28">
        <div className="max-w-2xl">
          <MismatchScan resolved />
        </div>

        <h2 className="display mt-10 max-w-2xl text-balance text-ink">
          {t(COPY.closeHeading)}
        </h2>
        <p className="mt-4 max-w-xl text-md leading-relaxed text-ink-soft">
          {t(COPY.closeBody)}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="#start"
            className="inline-flex min-h-13 select-none items-center justify-center gap-2 rounded-ctl bg-indigo-600 px-6 text-md font-medium text-paper shadow-[0_1px_2px_rgba(30,30,60,0.12)] transition-colors duration-150 hover:bg-indigo-700 active:bg-indigo-900"
          >
            {t(COPY.closeCta)}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
          </Link>
          <ButtonLink href="/why" tone="secondary" size="lg">
            {t(COPY.whyLink)}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
          </ButtonLink>
        </div>
      </Reveal>
    </div>
  );
}
