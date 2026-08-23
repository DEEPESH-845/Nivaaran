"use client";

import clsx from "clsx";
import Link from "next/link";
import { ArrowRight, Building2, Landmark, UserCheck } from "lucide-react";
import { Badge, ButtonLink, Card, Disclosure, SectionLabel } from "@/components/ui";
import { DIMENSIONS, HONEST_LOSSES, frictionScore } from "@/content/friction";
import { RULES } from "@/lib/rules/rules";
import { useLang } from "@/lib/i18n/context";

const BEFORE = [
  { en: "Login before you can see anything at all", hi: "कुछ भी देखने से पहले लॉगिन" },
  { en: "Choose between Form 19, 10C, 31 and 13", hi: "फ़ॉर्म 19, 10C, 31 और 13 में से चुनें" },
  { en: "No check that your record is even consistent", hi: "यह जाँच ही नहीं कि आपका रिकॉर्ड आपस में मेल खाता है" },
  { en: "Submit, then wait", hi: "भेजें, फिर इंतज़ार करें" },
  { en: "“Name not as per records.”", hi: "“Name not as per records.”" },
  { en: "No link to the fix. No mention of whose job it is.", hi: "न सुधार का लिंक, न यह कि किसका काम है।" },
  { en: "Ask HR, a friend, YouTube, or pay an agent", hi: "HR, दोस्त, YouTube से पूछें या एजेंट को पैसे दें" },
  { en: "Refile. Sometimes fail again.", hi: "दोबारा भरें। कभी-कभी फिर फ़ेल।" },
];

const AFTER = [
  { en: "Start from a sentence you would actually say", hi: "उस वाक्य से शुरू करें जो आप सचमुच कहते हैं" },
  { en: "Five questions, no login, no form numbers", hi: "पाँच सवाल, न लॉगिन, न फ़ॉर्म नंबर" },
  { en: "Every check EPFO will run, run now", hi: "EPFO जो भी जाँच करेगा, वह अभी चलती है" },
  { en: "See the exact token that breaks the match", hi: "वह ठीक शब्द दिखे जिससे मेल टूटता है" },
  { en: "Each problem names its owner: you, employer, or EPFO", hi: "हर दिक़्क़त बताती है वह किसका काम है: आपका, नियोक्ता का, या EPFO का" },
  { en: "Each fix carries its time, its cost and its source", hi: "हर सुधार के साथ उसका समय, ख़र्च और स्रोत" },
  { en: "Fix, re-check, watch the blocker disappear", hi: "ठीक करें, दोबारा जाँचें, रुकावट को ग़ायब होते देखें" },
  { en: "File once. Track a status that explains itself.", hi: "एक ही बार भरें। ऐसी स्थिति देखें जो ख़ुद समझाती है।" },
];

const INTEGRATIONS = [
  {
    icon: Landmark,
    where: { en: "Inside the member portal, before Submit", hi: "मेंबर पोर्टल में, Submit से पहले" },
    catches: { en: "Every citizen-fixable mismatch, at the moment it still costs ten minutes instead of twenty days.", hi: "हर वह गड़बड़ी जो नागरिक ख़ुद ठीक कर सकता है — उस वक़्त, जब उसकी क़ीमत बीस दिन नहीं, दस मिनट है।" },
    who: { en: "EPFO", hi: "EPFO" },
  },
  {
    icon: Building2,
    where: { en: "In the employer's HRMS, at exit", hi: "नियोक्ता के HRMS में, नौकरी छूटते समय" },
    catches: { en: "The missing exit date — caught at source, before the member is ever blocked by it.", hi: "छूटी हुई एग्ज़िट तारीख़ — जड़ पर ही पकड़ी जाए, इससे पहले कि सदस्य उसमें फँसे।" },
    who: { en: "Employer or payroll vendor", hi: "नियोक्ता या पेरोल वेंडर" },
  },
  {
    icon: UserCheck,
    where: { en: "At UAN generation", hi: "UAN बनते समय" },
    catches: { en: "Name and date-of-birth divergence on day one, before it is baked into a lifetime of records.", hi: "नाम और जन्मतिथि का अंतर पहले ही दिन, इससे पहले कि वह जीवन भर के रिकॉर्ड में बैठ जाए।" },
    who: { en: "EPFO with the employer", hi: "EPFO और नियोक्ता" },
  },
];

function ScoreCard({
  label,
  score,
  tone,
}: {
  label: string;
  score: string;
  tone: "blocked" | "clear";
}) {
  return (
    <div
      className={clsx(
        "rounded-card border p-4",
        tone === "blocked" ? "border-blocked-100 bg-blocked-50" : "border-clear-100 bg-clear-50",
      )}
    >
      <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">
        {label}
      </p>
      <p
        className={clsx(
          "tnum mt-1.5 font-display text-4xl leading-none",
          tone === "blocked" ? "text-blocked-700" : "text-clear-700",
        )}
      >
        {score}
      </p>
    </div>
  );
}

export default function WhyPage() {
  const { lang, t } = useLang();
  const epfo = frictionScore("epfo");
  const real = frictionScore("nivaaranReal");

  return (
    <div className="mx-auto max-w-4xl space-y-14 px-4 py-10 sm:py-14">
      {/* ------------------------------------------------------ Thesis */}
      <section className="space-y-4">
        <SectionLabel>{lang === "hi" ? "यह बेहतर क्यों है" : "Why this is better"}</SectionLabel>
        <h1 className="display max-w-3xl text-balance">
          {lang === "hi"
            ? "हमने फ़ॉर्म दोबारा नहीं बनाया। दिक़्क़त कभी फ़ॉर्म थी ही नहीं।"
            : "We didn't redesign the form. The form was never the problem."}
        </h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "EPFO ने रफ़्तार की समस्या हल कर ली है — ₹5 लाख तक के दावे लगभग तीन दिन में, बिना किसी मानवीय जाँच के। फिर भी हर पाँच में से एक दावा ख़ारिज होता है, क्योंकि मशीन आपको तब जाँचती है जब आप भर चुके होते हैं। मशीन जितनी तेज़ हुई, ख़ारिज करना उतना ही निर्मम।"
            : "EPFO has solved speed — claims up to ₹5 lakh settle in about three days with no human reviewer. One in five still fails, because the machine only checks you after you apply. The faster it got, the more mercilessly it rejects."}
        </p>
      </section>

      {/* ------------------------------------------------ Headline metric */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">
            {lang === "hi" ? "फ़ेल होने का पता चलने में दिन" : "Days until you learn it failed"}
          </p>
          <p className="tnum mt-2 font-display text-4xl leading-none text-ink">
            <span className="text-blocked-700">~20</span>
            <span className="mx-3 text-ink-faint">→</span>
            <span className="text-clear-700">0</span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "यही अकेला आँकड़ा है जिसे हम बिना किसी शर्त के कह सकते हैं। बाक़ी सब नीचे तालिका में गिना गया है।"
              : "This is the one number we can state without qualification. Everything else is counted in the table below."}
          </p>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard
            label={lang === "hi" ? "मौजूदा अनुभव" : "Current experience"}
            score={`${epfo}`}
            tone="blocked"
          />
          <ScoreCard
            label={lang === "hi" ? "निवारण (असली संस्करण)" : "Nivaaran (production-realistic)"}
            score={`${real}`}
            tone="clear"
          />
        </div>
      </section>

      {/* --------------------------------------------------- Before/after */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "एक ही काम, दो रास्ते" : "The same task, two journeys"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: { en: "Today", hi: "आज" }, tone: "blocked" as const, items: BEFORE },
            { title: { en: "With Nivaaran", hi: "निवारण के साथ" }, tone: "clear" as const, items: AFTER },
          ].map((col) => (
            <Card key={col.title.en} className="overflow-hidden">
              <div
                className={clsx(
                  "border-b px-4 py-3",
                  col.tone === "blocked"
                    ? "border-blocked-100 bg-blocked-50"
                    : "border-clear-100 bg-clear-50",
                )}
              >
                <Badge tone={col.tone}>{t(col.title)}</Badge>
              </div>
              <ol className="divide-y divide-line-soft">
                {col.items.map((it, i) => (
                  <li key={i} className="flex gap-3 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                    <span className="tnum shrink-0 font-mono text-xs text-ink-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {t(it)}
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Friction */}
      <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
            {lang === "hi" ? "नागरिक घर्षण, गिनकर" : "Citizen friction, counted"}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "यह उपयोगकर्ता शोध नहीं है। यह प्रोटोटाइप इंटरैक्शन विश्लेषण है — नीचे इसकी पूरी विधि दी गई है ताकि आप इससे असहमत हो सकें।"
              : "This is not user research. It is a prototype interaction analysis, and the full method is printed below so you can disagree with it."}
          </p>
        </div>

        <Card
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label={lang === "hi" ? "घर्षण तुलना तालिका" : "Friction comparison table"}
        >
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper-sunk">
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  {lang === "hi" ? "आयाम" : "Dimension"}
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold text-blocked-700">
                  {lang === "hi" ? "EPFO आज" : "EPFO today"}
                </th>
                <th scope="col" className="px-3 py-3 text-right font-semibold text-clear-700">
                  {lang === "hi" ? "निवारण (प्रोटोटाइप)" : "Nivaaran (prototype)"}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-clear-700">
                  {lang === "hi" ? "निवारण (असली)" : "Nivaaran (real)"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {DIMENSIONS.map((d) => (
                <tr key={d.id}>
                  <th scope="row" className="px-4 py-3 font-normal text-ink">
                    {t(d.label)}
                    <span className="mt-0.5 block text-xs text-ink-mute">{t(d.definition)}</span>
                  </th>
                  <td className="tnum px-3 py-3 text-right font-mono text-blocked-700">{d.epfo}</td>
                  <td className="tnum px-3 py-3 text-right font-mono text-clear-700">{d.nivaaran}</td>
                  <td className="tnum px-4 py-3 text-right font-mono text-clear-700">{d.nivaaranReal}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink bg-paper-sunk">
                <th scope="row" className="px-4 py-3 font-semibold text-ink">
                  {lang === "hi" ? "घर्षण स्कोर (0–10)" : "Friction score (0–10)"}
                </th>
                <td className="tnum px-3 py-3 text-right font-mono font-semibold text-blocked-700">
                  {epfo}
                </td>
                <td className="tnum px-3 py-3 text-right font-mono font-semibold text-clear-700">
                  {frictionScore("nivaaran")}
                </td>
                <td className="tnum px-4 py-3 text-right font-mono font-semibold text-clear-700">
                  {real}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <Disclosure summary={lang === "hi" ? "पूरी विधि" : "The full method"}>
            <div className="space-y-2">
              <p>
                {lang === "hi"
                  ? "स्कोर = 10 × Σ(भारᵢ × min(गिनतीᵢ ÷ सीमाᵢ, 1)) ÷ Σ भारᵢ"
                  : "score = 10 × Σ(weightᵢ × min(countᵢ ÷ capᵢ, 1)) ÷ Σ weightᵢ"}
              </p>
              <p>
                {lang === "hi"
                  ? "EPFO की गिनती उसके सार्वजनिक रूप से प्रलेखित रास्ते और आधिकारिक चरण-दर-चरण मार्गदर्शन से ली गई है। हमने किसी जीवित सरकारी सिस्टम पर न तो यात्रा की और न कर सकते हैं — नियम इसकी अनुमति नहीं देते। निवारण की गिनती इसी बिल्ड से मापी गई है। किसी उपयोगकर्ता का अवलोकन नहीं किया गया।"
                  : "The EPFO counts are derived from its publicly documented flow and official step-by-step guidance. We did not and may not walk through a live government system — the rules forbid it. The Nivaaran counts are measured from this build. No user has been observed using either."}
              </p>
              <p>
                {lang === "hi"
                  ? "भार हमारे निर्णय हैं, कोई नाप नहीं। हमने मृत छोर (2.5) और देरी से पता चलना (2.0) को सबसे ऊँचा भार दिया, क्योंकि यही वे चीज़ें हैं जो लोगों को हार मानने या एजेंट को पैसे देने पर मजबूर करती हैं।"
                  : "The weights are our judgement, not a measurement. We weight dead ends (2.5) and delayed failure (2.0) highest because those are what make people give up or pay an agent."}
              </p>
            </div>
          </Disclosure>
        </Card>
      </section>

      {/* -------------------------------------------------- Honest losses */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "जहाँ हम ईमानदारी से बेहतर नहीं हैं" : "Where we are honestly not better"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {HONEST_LOSSES.map((l) => (
            <Card key={l.label.en} className="space-y-2 p-4">
              <p className="font-semibold leading-snug text-ink">{t(l.label)}</p>
              <p className="text-sm leading-relaxed text-ink-soft">{t(l.detail)}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- End-to-end */}
      <section className="space-y-4">
        <div className="space-y-2">
          <SectionLabel>
            {lang === "hi" ? "सिर्फ़ इंटरफ़ेस नहीं" : "Not just the interface"}
          </SectionLabel>
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
            {lang === "hi"
              ? "यही जाँच वहाँ चलनी चाहिए जहाँ दिक़्क़त पैदा होती है"
              : "The same check belongs where the problem is created"}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
            {lang === "hi"
              ? `हमारा नियम-इंजन एक वेबसाइट नहीं, एक फ़ंक्शन है — ${RULES.length} निश्चित नियम, हर एक अपने स्रोत के साथ, एक ऐसे API के पीछे जिसे कोई भी बुला सके। यह उत्पाद उस API का सिर्फ़ पहला उपभोक्ता है।`
              : `Our rule engine is a function, not a website — ${RULES.length} deterministic rules, each carrying its source, behind an API anyone could call. This product is merely its first consumer.`}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {INTEGRATIONS.map((it) => (
            <Card key={it.where.en} className="space-y-2.5 p-4">
              <it.icon aria-hidden className="size-5 text-ink-faint" strokeWidth={1.6} />
              <p className="font-semibold leading-snug text-ink">{t(it.where)}</p>
              <p className="text-sm leading-relaxed text-ink-soft">{t(it.catches)}</p>
              <Badge tone="indigo">{t(it.who)}</Badge>
            </Card>
          ))}
        </div>

        <Card className="space-y-3 p-5">
          <p className="text-sm leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "प्रकाशित आँकड़ों पर सीधा अंकगणित: FY 2024-25 में 1.74 करोड़ दावे ख़ारिज हुए। अगर भेजने से पहले की जाँच नागरिक द्वारा ठीक की जा सकने वाली आधी गड़बड़ियाँ भी रोक ले, तो हर साल लाखों नाकाम दावे और उनसे पैदा होने वाली शिकायतें टल जाती हैं। यह अनुमान है, कोई मापा गया नतीजा नहीं।"
              : "Straight arithmetic on published figures: 1.74 crore claims were rejected in FY 2024-25. If pre-submission validation prevented even half of the citizen-fixable ones, that is on the order of tens of lakhs of failed claims avoided each year, plus the grievance volume they generate. This is a projection, not a measured outcome."}
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/sources" tone="secondary">
              {lang === "hi" ? "स्रोत और सीमाएँ" : "Sources & limitations"}
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
            </ButtonLink>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              {lang === "hi" ? "ख़ुद चलाकर देखें" : "Run it yourself"}
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
