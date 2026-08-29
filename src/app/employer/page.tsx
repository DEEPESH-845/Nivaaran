"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Users } from "lucide-react";
import { Callout, Card, SectionLabel } from "@/components/ui";
import { LeaverRow } from "@/components/leaver-row";
import { ESTABLISHMENT, ROSTER } from "@/content/roster";
import { applyFix } from "@/lib/rules/apply";
import { reviewRoster } from "@/lib/rules/roster";
import { useLang } from "@/lib/i18n/context";
import type { Bi, Facts } from "@/lib/rules/types";

/**
 * The employer lens.
 *
 * Same engine, same records, different reader. The PRD's tertiary user is
 * "the employer's HR generalist, who is the single point of failure for exit
 * dates and does not know a claim is blocked on them" — so this is a work
 * queue, not a dashboard. Every row is a person, says how long that person has
 * been waiting, and is small enough to do now.
 *
 * Every number on the page is computed from `preflight`. None is written down.
 */

const COPY = {
  eyebrow: { en: "For employers", hi: "नियोक्ताओं के लिए" },
  lede: {
    en: "When a former employee's PF claim is rejected, they are told. You are not. These are the ones where the missing piece is yours — and each takes minutes, not meetings.",
    hi: "जब किसी पूर्व कर्मचारी का PF दावा ख़ारिज होता है, उन्हें बताया जाता है — आपको नहीं। ये वे मामले हैं जहाँ छूटा हुआ हिस्सा आपका है — और हर एक में मिनट लगते हैं, बैठकें नहीं।",
  },
  yoursTitle: { en: "Only you can fix these", hi: "ये केवल आप ठीक कर सकते हैं" },
  yoursBody: {
    en: "On an unverified UAN the member has no lever at all. Until you act, they wait.",
    hi: "असत्यापित UAN पर सदस्य के पास कोई रास्ता ही नहीं होता। जब तक आप कुछ नहीं करते, वे इंतज़ार करते हैं।",
  },
  theirsTitle: { en: "They can fix these — nobody has told them", hi: "ये वे ख़ुद ठीक कर सकते हैं — किसी ने बताया ही नहीं" },
  theirsBody: {
    en: "Nothing here needs you in a portal. It needs one message, from the last people who had their contact details.",
    hi: "इनमें से किसी के लिए आपको पोर्टल पर जाने की ज़रूरत नहीं। बस एक संदेश चाहिए — उन लोगों से, जिनके पास उनका संपर्क आख़िरी बार था।",
  },
  clearTitle: { en: "Nothing blocking", hi: "कोई रुकावट नहीं" },
  clearBody: {
    en: "These records pass every check the engine runs. If they file, they should be paid.",
    hi: "ये रिकॉर्ड इंजन की हर जाँच पास करते हैं। ये दावा भरें तो भुगतान होना चाहिए।",
  },
  allClear: {
    en: "Nothing on this roster is waiting on you.",
    hi: "इस सूची में कुछ भी आप पर अटका नहीं है।",
  },
  syntheticTitle: { en: "A synthetic roster", hi: "काल्पनिक सूची" },
  synthetic: {
    en: "Every person, UAN and record on this page is invented. This roster is fixed demonstration data, not something you uploaded and not something Nivaaran holds on your behalf — the accounts in this build store only a citizen's own check. In a real deployment this same engine runs inside your HRMS at exit, against records you already hold, through the documented Preflight API.",
    hi: "इस पृष्ठ का हर व्यक्ति, UAN और रिकॉर्ड काल्पनिक है। यह सूची तय प्रदर्शन डेटा है — न आपने अपलोड की है, न निवारण इसे आपकी ओर से रखता है; इस बिल्ड के खाते सिर्फ़ नागरिक की अपनी जाँच सहेजते हैं। असली तैनाती में यही इंजन आपके HRMS में, नौकरी छोड़ते समय, आपके पास पहले से मौजूद रिकॉर्ड पर चलता है — दस्तावेज़ीकृत प्री-फ़्लाइट API से।",
  },
  apiLink: { en: "See the API", hi: "API देखें" },
} as const satisfies Record<string, Bi>;

const TYPICAL_REJECTION_DAYS = 20;

export default function EmployerPage() {
  const { lang, t } = useLang();
  const [fixed, setFixed] = useState<Record<string, Facts>>({});

  const summary = useMemo(() => reviewRoster(ROSTER, fixed), [fixed]);
  const { counts, minutes } = summary;

  function markFixed(id: string, ruleIds: string[]) {
    setFixed((prev) => {
      const base = prev[id] ?? ROSTER.find((l) => l.id === id)!.facts;
      return { ...prev, [id]: ruleIds.reduce(applyFix, base) };
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:py-14">
      {/* ----------------------------------------------------- The headline */}
      <section className="space-y-4">
        <SectionLabel>{t(COPY.eyebrow)}</SectionLabel>
        <h1 className="display max-w-3xl text-balance" aria-live="polite">
          {counts.blockedOnYou === 0
            ? t(COPY.allClear)
            : lang === "hi"
              ? `आपके ${counts.total} में से ${counts.blocked} पूर्व कर्मचारियों का दावा ख़ारिज होगा। ${counts.blockedOnYou} आप पर अटके हैं।`
              : `${counts.blocked} of your ${counts.total} leavers will have a claim rejected. ${counts.blockedOnYou} of them are waiting on you.`}
        </h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(COPY.lede)}</p>
        {minutes > 0 ? (
          <p className="max-w-2xl text-md leading-relaxed text-ink">
            {lang === "hi"
              ? `आपके हिस्से का कुल काम: ${minutes} मिनट। न करने पर उनमें से हर एक को लगभग ${TYPICAL_REJECTION_DAYS} दिन बाद ख़ारिजी मिलती है, और फिर सब कुछ दोबारा।`
              : `Your share of the work: ${minutes} minutes, in total. Left undone, each of them gets a rejection in about ${TYPICAL_REJECTION_DAYS} days, and then starts again.`}
          </p>
        ) : null}
        {/* The queue at a glance. Every number is arithmetic on `preflight`,
            computed at render; none of it is written down anywhere. */}
        <dl className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
          <Stat
            k={lang === "hi" ? "कुल पूर्व कर्मचारी" : "Leavers"}
            v={counts.total}
          />
          <Stat
            k={lang === "hi" ? "आप पर अटके" : "Waiting on you"}
            v={counts.blockedOnYou}
            tone={counts.blockedOnYou > 0 ? "blocked" : "clear"}
          />
          <Stat
            k={lang === "hi" ? "वे ख़ुद ठीक कर सकते हैं" : "Theirs to fix"}
            v={counts.blocked - counts.blockedOnYou}
            tone="caution"
          />
          <Stat
            k={lang === "hi" ? "कोई रुकावट नहीं" : "Nothing blocking"}
            v={counts.clear}
            tone="clear"
          />
        </dl>

        <p className="text-sm text-ink-mute">{t(ESTABLISHMENT)}</p>
      </section>

      {/* --------------------------------------------------------- Yours */}
      {summary.blockedOnYou.length > 0 ? (
        <section aria-labelledby="yours" className="space-y-3">
          <div>
            <h2 id="yours" className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {t(COPY.yoursTitle)}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {t(COPY.yoursBody)}
            </p>
          </div>
          <ul className="space-y-3">
            {summary.blockedOnYou.map((r) => (
              <li key={r.leaver.id}>
                <LeaverRow
                  review={r}
                  onFixed={(ruleIds) => markFixed(r.leaver.id, ruleIds)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* --------------------------------------------------------- Theirs */}
      {summary.blockedOnThem.length > 0 ? (
        <section aria-labelledby="theirs" className="space-y-3">
          <div>
            <h2 id="theirs" className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {t(COPY.theirsTitle)}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
              {t(COPY.theirsBody)}
            </p>
          </div>
          <ul className="space-y-3">
            {summary.blockedOnThem.map((r) => (
              <li key={r.leaver.id}>
                <LeaverRow review={r} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- Clear */}
      {summary.clear.length > 0 ? (
        <section aria-labelledby="clear" className="space-y-3">
          <h2 id="clear" className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {t(COPY.clearTitle)}
          </h2>
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-4 text-clear-700" strokeWidth={1.9} />
              <SectionLabel>
                {summary.clear.length} {lang === "hi" ? "में से" : "of"} {counts.total}
              </SectionLabel>
            </div>
            <ul className="mt-3 space-y-1.5">
              {summary.clear.map((r) => (
                <li
                  key={r.leaver.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm"
                >
                  <span className="text-ink">{r.leaver.name}</span>
                  <span className="text-ink-mute">{t(r.leaver.role)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t(COPY.clearBody)}</p>
          </Card>
        </section>
      ) : null}

      {/* -------------------------------------------------------- Honesty */}
      <section>
        <Callout
          tone="caution"
          icon={<Users aria-hidden className="size-5 text-caution-700" strokeWidth={1.7} />}
          title={t(COPY.syntheticTitle)}
        >
          <p>{t(COPY.synthetic)}</p>
          <p className="pt-2">
            <Link href="/api" className="font-medium text-indigo-600 hover:text-indigo-700">
              {t(COPY.apiLink)}
            </Link>
          </p>
        </Callout>
      </section>
    </div>
  );
}

/**
 * One number and what it counts. Colour is never the only signal: the label
 * says what it is, and the number says how many.
 */
function Stat({
  k,
  v,
  tone = "neutral",
}: {
  k: string;
  v: number;
  tone?: "neutral" | "blocked" | "caution" | "clear";
}) {
  const colour =
    tone === "blocked"
      ? "text-blocked-700"
      : tone === "caution"
        ? "text-caution-700"
        : tone === "clear"
          ? "text-clear-700"
          : "text-ink";
  return (
    <div className="rounded-card border border-line bg-paper-raised p-3">
      <dt className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">{k}</dt>
      <dd className={`tnum mt-1 font-mono text-2xl leading-none ${colour}`}>{v}</dd>
    </div>
  );
}
