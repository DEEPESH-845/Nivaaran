"use client";

import Link from "next/link";
import {
  Award,
  Building2,
  FileBadge,
  GraduationCap,
  HeartPulse,
  Landmark,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { Badge, Callout, Card, SectionLabel } from "@/components/ui";
import { useLang } from "@/lib/i18n/context";
import type { Bi } from "@/lib/rules/types";

/**
 * The platform argument.
 *
 * Everything on this page is a statement of direction. None of these
 * integrations exists, and the page says so three times — at the top, on every
 * card, and at the bottom — because a vision surface that reads like a feature
 * list is the fastest way to lose the trust the rest of the product is built
 * on.
 */

const COPY = {
  eyebrow: { en: "The wider argument", hi: "बड़ी बात" },
  h1: {
    en: "Provident fund is the proof, not the point.",
    hi: "भविष्य निधि सबूत है, मक़सद नहीं।",
  },
  lede: {
    en: "Nothing in the architecture below is specific to PF. A rule registry, a deterministic engine, an owner on every finding, and a citizen who is told before they submit rather than after — that shape fits any workflow where a form meets a record.",
    hi: "नीचे दी गई संरचना में PF के लिए ख़ास कुछ नहीं है। नियमों की रजिस्ट्री, एक निश्चित इंजन, हर नतीजे पर एक ज़िम्मेदार, और नागरिक को भरने से पहले बताना — यह ढाँचा हर उस प्रक्रिया पर बैठता है जहाँ फ़ॉर्म किसी रिकॉर्ड से मिलता है।",
  },
  notBuiltTitle: { en: "None of this is built", hi: "इनमें से कुछ भी बना नहीं है" },
  notBuilt: {
    en: "The provident fund journey in this product is real, in the sense that the engine, the rules and their citations exist and run. Every other domain on this page is a direction we are arguing for. There is no integration, no partnership and no pilot behind any of them, and we would rather say so than let a judge assume otherwise.",
    hi: "इस उत्पाद की भविष्य निधि यात्रा असली है — इंजन, नियम और उनके स्रोत मौजूद हैं और चलते हैं। इस पृष्ठ का हर दूसरा क्षेत्र सिर्फ़ एक प्रस्ताव है। उनके पीछे न कोई एकीकरण है, न साझेदारी, न कोई पायलट — और हम इसे छिपाने के बजाय साफ़ कह देना बेहतर समझते हैं।",
  },
  shapeTitle: { en: "The shape of the problem", hi: "समस्या का ढाँचा" },
  layerTitle: { en: "Where the layer sits", hi: "यह परत कहाँ बैठती है" },
  layerBody: {
    en: "The important property is that nothing behind it has to change. Nivaaran does not replace a government backend, hold the authoritative record, or make the decision. It reads the same rules the backend applies and applies them earlier, where a citizen can still act.",
    hi: "सबसे अहम बात यह है कि इसके पीछे कुछ भी बदलने की ज़रूरत नहीं। निवारण किसी सरकारी बैकएंड की जगह नहीं लेता, न आधिकारिक रिकॉर्ड रखता है, न फ़ैसला करता है। यह वही नियम पढ़ता है जो बैकएंड लगाता है, और उन्हें पहले लगाता है — जब नागरिक अब भी कुछ कर सकता है।",
  },
  domainsTitle: { en: "Where else the same shape fits", hi: "यही ढाँचा और कहाँ बैठता है" },
} as const satisfies Record<string, Bi>;

const DOMAINS: { icon: typeof Landmark; name: Bi; friction: Bi }[] = [
  {
    icon: Landmark,
    name: { en: "Pension applications", hi: "पेंशन आवेदन" },
    friction: {
      en: "Service history that does not reconcile across employers, discovered at sanction.",
      hi: "सेवा इतिहास जो अलग-अलग नियोक्ताओं के बीच नहीं मिलता — पता तब चलता है जब मंज़ूरी अटक जाती है।",
    },
  },
  {
    icon: GraduationCap,
    name: { en: "Scholarships", hi: "छात्रवृत्ति" },
    friction: {
      en: "Income and caste certificate details that must match three registers exactly.",
      hi: "आय और जाति प्रमाणपत्र का विवरण, जो तीन अलग रजिस्टरों से हूबहू मिलना चाहिए।",
    },
  },
  {
    icon: FileBadge,
    name: { en: "Certificates", hi: "प्रमाणपत्र" },
    friction: {
      en: "A name spelled one way at birth and another on every document since.",
      hi: "जन्म के समय एक तरह से लिखा नाम, और उसके बाद हर दस्तावेज़ में दूसरी तरह।",
    },
  },
  {
    icon: Award,
    name: { en: "Welfare and benefits", hi: "कल्याण और लाभ" },
    friction: {
      en: "Eligibility that turns on a threshold nobody states in the citizen's own numbers.",
      hi: "पात्रता किसी सीमा पर टिकी है, जिसे कोई नागरिक के अपने आँकड़ों में बताता ही नहीं।",
    },
  },
  {
    icon: Building2,
    name: { en: "Licensing", hi: "लाइसेंस" },
    friction: {
      en: "A document set whose completeness is only assessed after the fee is paid.",
      hi: "दस्तावेज़ों की सूची, जिसकी पूर्णता शुल्क भरने के बाद ही जाँची जाती है।",
    },
  },
  {
    icon: Receipt,
    name: { en: "Tax workflows", hi: "कर प्रक्रियाएँ" },
    friction: {
      en: "A mismatch between what was deducted and what is on record, surfaced as a notice.",
      hi: "काटी गई राशि और रिकॉर्ड में दर्ज राशि का अंतर — जो नोटिस बनकर सामने आता है।",
    },
  },
  {
    icon: HeartPulse,
    name: { en: "Health schemes", hi: "स्वास्थ्य योजनाएँ" },
    friction: {
      en: "Family composition that has to agree across a ration card, an ID and a registry.",
      hi: "परिवार का विवरण, जो राशन कार्ड, पहचान पत्र और रजिस्ट्री — तीनों में एक जैसा होना चाहिए।",
    },
  },
];

export default function BeyondPage() {
  const { lang, t } = useLang();

  return (
    <div className="mx-auto max-w-4xl space-y-14 px-4 py-10 sm:py-14">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>{t(COPY.eyebrow)}</SectionLabel>
          <Badge tone="caution">
            <ShieldAlert aria-hidden className="size-3" strokeWidth={2.2} />
            {lang === "hi" ? "प्रस्ताव, उत्पाद नहीं" : "Direction, not product"}
          </Badge>
        </div>
        <h1 className="display max-w-3xl text-balance">{t(COPY.h1)}</h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(COPY.lede)}</p>
      </section>

      <section>
        <Callout
          tone="caution"
          icon={<ShieldAlert aria-hidden className="size-5 text-caution-700" strokeWidth={1.7} />}
          title={t(COPY.notBuiltTitle)}
        >
          <p>{t(COPY.notBuilt)}</p>
        </Callout>
      </section>

      {/* ------------------------------------------------- The reordering */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {t(COPY.shapeTitle)}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Sequence
            tone="blocked"
            label={lang === "hi" ? "आज" : "Today"}
            steps={
              lang === "hi"
                ? ["फ़ॉर्म", "जमा", "इंतज़ार", "ख़ारिज", "वजह ढूँढो", "सुधार", "फिर से जमा"]
                : ["Form", "Submit", "Wait", "Rejected", "Find out why", "Fix", "Submit again"]
            }
          />
          <Sequence
            tone="clear"
            label={lang === "hi" ? "जाँच पहले हो तो" : "With validation first"}
            steps={
              lang === "hi"
                ? ["इरादा", "प्री-फ़्लाइट", "सबूत", "ज़िम्मेदारी", "सुधार", "दोबारा जाँच", "एक बार जमा"]
                : ["Intent", "Preflight", "Evidence", "Ownership", "Fix", "Re-check", "Submit once"]
            }
          />
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "दोनों तरफ़ वही नियम लगते हैं। फ़र्क़ सिर्फ़ यह है कि वे कब लगते हैं — और तब नागरिक कुछ कर सकता है या नहीं।"
            : "The same rules apply on both sides. The only difference is when they run — and therefore whether the citizen can still do anything about the answer."}
        </p>
      </section>

      {/* ------------------------------------------------- The integration */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {t(COPY.layerTitle)}
        </h2>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(COPY.layerBody)}</p>

        <Card className="overflow-x-auto p-4 sm:p-6" tabIndex={0} role="group" aria-label={t(COPY.layerTitle)}>
          <pre className="min-w-max font-mono text-xs leading-relaxed text-ink-soft sm:text-sm">
{`  citizen portal            employer HRMS
        |                         |
        +-----------+-------------+
                    |
         NIVAARAN VALIDATION LAYER      <- the only new thing
                    |
            policy / rule registry      <- sourced, versioned, reviewable
                    |
        +-----------+-------------+
        |                         |
  existing gov APIs        existing workflow      <- unchanged`}
          </pre>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="space-y-1.5 p-4">
            <p className="font-semibold text-ink">
              {lang === "hi" ? "नागरिक की तरफ़" : "On the citizen side"}
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              {lang === "hi"
                ? "पोर्टल पर “जमा करें” से पहले वही जाँच चलती है जो बाद में चलती। हर गड़बड़ी वहीं दिखती है, जहाँ अब भी ठीक की जा सकती है।"
                : "The check that would run after Submit runs before it instead. Every mismatch appears where it can still be fixed."}
            </p>
          </Card>
          <Card className="space-y-1.5 p-4">
            <p className="font-semibold text-ink">
              {lang === "hi" ? "नियोक्ता की तरफ़" : "On the employer side"}
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              {lang === "hi"
                ? "नौकरी छूटते ही HRMS में वही जाँच — छूटी हुई एग्ज़िट तारीख़ स्रोत पर ही पकड़ी जाती है, कर्मचारी के दावा भरने से महीनों पहले।"
                : "The same check inside an HRMS at exit. The missing exit date is caught at source, months before the employee files anything."}
            </p>
            <p className="pt-1 text-xs leading-relaxed text-ink-faint">
              {lang === "hi" ? "यही सबसे ज़्यादा असर वाली तैनाती है।" : "This is the highest-leverage deployment."}
            </p>
          </Card>
        </div>

        <p className="text-sm">
          <Link href="/api" className="font-medium text-indigo-600 hover:text-indigo-700">
            {lang === "hi" ? "वह एंडपॉइंट देखें जो यह करता है" : "See the endpoint that does this"}
          </Link>
        </p>
      </section>

      {/* ----------------------------------------------------- The domains */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {t(COPY.domainsTitle)}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DOMAINS.map((d) => (
            <li key={d.name.en}>
              <Card className="h-full space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <d.icon aria-hidden className="size-4 shrink-0 text-ink-faint" strokeWidth={1.7} />
                  <p className="font-semibold text-ink">{t(d.name)}</p>
                </div>
                <p className="text-sm leading-relaxed text-ink-soft">{t(d.friction)}</p>
                <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-caution-700">
                  {lang === "hi" ? "बना नहीं है" : "Not built"}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <Callout tone="neutral" title={lang === "hi" ? "एक ही वाक्य में" : "In one sentence"}>
          <p>
            {lang === "hi"
              ? "सरकारी सिस्टम नागरिकों को इंतज़ार कराने से पहले उनकी जाँच कर लें।"
              : "Government systems should validate citizens before they make them wait."}
          </p>
        </Callout>
      </section>
    </div>
  );
}

function Sequence({
  tone,
  label,
  steps,
}: {
  tone: "blocked" | "clear";
  label: string;
  steps: string[];
}) {
  return (
    <Card className="p-4">
      <SectionLabel>{label}</SectionLabel>
      <ol className="mt-3 space-y-1.5">
        {steps.map((step, i) => (
          <li key={step} className="flex items-baseline gap-3 text-sm">
            <span className="tnum shrink-0 font-mono text-2xs text-ink-faint">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className={tone === "blocked" ? "text-ink-soft" : "text-ink"}>{step}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
