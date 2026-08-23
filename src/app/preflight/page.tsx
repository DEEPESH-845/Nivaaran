"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CalendarClock, RotateCcw } from "lucide-react";
import { Badge, Button, ButtonLink, Callout, Card, SectionLabel } from "@/components/ui";
import { JourneyRail } from "@/components/journey-rail";
import { FindingCard } from "@/components/finding-card";
import { RejectionDecoder } from "@/components/rejection-decoder";
import { personaById } from "@/content/personas";
import { daysUntilFilable, preflight } from "@/lib/rules/engine";
import { RULES } from "@/lib/rules/rules";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";

const TYPICAL_REJECTION_DAYS = 20;

export default function PreflightPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { session, ready, markFixed, reset } = useSession();

  useEffect(() => {
    if (ready && !session.facts) router.replace("/");
  }, [ready, session.facts, router]);

  const result = useMemo(
    () => (session.facts ? preflight(session.facts) : null),
    [session.facts],
  );

  if (!ready || !session.facts || !result) {
    return (
      <div className="mx-auto min-h-[85vh] max-w-3xl space-y-3 px-4 py-16">
        <div className="h-6 w-3/4 animate-pulse rounded bg-line" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-line-soft" />
      </div>
    );
  }

  const blockers = result.findings.filter((f) => f.severity === "blocker");
  const others = result.findings.filter((f) => f.severity !== "blocker");
  const n = blockers.length;
  const fixedCount = session.resolved.length;
  const waitDays = daysUntilFilable(result);

  const hero =
    result.verdict === "clear"
      ? {
          tone: "clear" as const,
          title: lang === "hi" ? "यह दावा मंज़ूर होना चाहिए।" : "This claim should go through.",
          sub:
            lang === "hi"
              ? `हमने आपके रिकॉर्ड पर ${RULES.length} जाँचें चलाईं। कोई भी इसे रोकने वाली नहीं मिली।`
              : `We ran ${RULES.length} checks against your record. None of them will stop it.`,
        }
      : result.verdict === "blocked_external"
        ? {
            tone: "blocked" as const,
            title:
              lang === "hi"
                ? `${n} चीज़ें इस दावे को रोक देंगी — और एक आपके हाथ में नहीं है।`
                : `${n} ${n === 1 ? "thing" : "things"} will stop this claim — and one of them is not yours to fix.`,
            sub:
              lang === "hi"
                ? "जो हिस्सा किसी और पर निर्भर है, उसे आज ही शुरू करें। बाक़ी आप ख़ुद कर सकते हैं।"
                : "Start the part that depends on someone else today. The rest you can do yourself.",
          }
        : {
            tone: "caution" as const,
            title:
              lang === "hi"
                ? `${n} चीज़ें इस दावे को रोक देंगी।`
                : `${n} ${n === 1 ? "thing" : "things"} will stop this claim.`,
            sub:
              lang === "hi"
                ? `सभी आप ख़ुद ठीक कर सकते हैं — लगभग ${result.minutesToFix} मिनट का काम, पूरी तरह निःशुल्क।`
                : `All of them are yours to fix — about ${result.minutesToFix} minutes of work, all free.`,
          };

  return (
    <>
      <JourneyRail current={fixedCount > 0 && n > 0 ? "fix" : "preflight"} />

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        {/* ------------------------------------------------------ Verdict */}
        <section className="animate-rise space-y-4">
          <SectionLabel>
            {lang === "hi" ? "प्री-फ़्लाइट नतीजा" : "Pre-flight result"}
          </SectionLabel>
          <h1
            className={`display text-balance text-3xl sm:text-4xl ${
              hero.tone === "clear" ? "text-clear-700" : hero.tone === "blocked" ? "text-blocked-700" : "text-ink"
            }`}
          >
            {hero.title}
          </h1>
          <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{hero.sub}</p>

          {n > 0 ? (
            <Callout
              tone="neutral"
              icon={<CalendarClock aria-hidden className="size-5 text-ink-mute" strokeWidth={1.7} />}
              title={
                lang === "hi"
                  ? "आपको यह कब पता चलता — और कब चला"
                  : "When you would have found out — and when you did"
              }
            >
              <p>
                {lang === "hi"
                  ? `दावा भरने के बाद यह लगभग ${TYPICAL_REJECTION_DAYS} दिन में ख़ारिजी के रूप में सामने आता। आपको अभी पता चल गया, भरने से पहले।`
                  : `Filed as-is, this would have come back as a rejection in roughly ${TYPICAL_REJECTION_DAYS} days. You know now, before filing.`}
              </p>
            </Callout>
          ) : null}
        </section>

        {/* ----------------------------------------------------- Blockers */}
        {n > 0 ? (
          <section aria-labelledby="blockers" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="blockers" className="text-lg font-semibold tracking-[-0.01em] text-ink">
                {lang === "hi" ? "इन्हें पहले ठीक करें" : "Fix these first"}
              </h2>
              {fixedCount > 0 ? (
                <Badge tone="clear">
                  {fixedCount} {lang === "hi" ? "ठीक हो गया" : "fixed"}
                </Badge>
              ) : null}
            </div>
            <ul className="space-y-3">
              {blockers.map((f, i) => (
                <li key={f.ruleId}>
                  <FindingCard finding={f} index={i} onFixed={() => markFixed(f.ruleId)} />
                </li>
              ))}
            </ul>
            {waitDays > 0 ? (
              <p className="text-sm leading-relaxed text-ink-mute">
                {lang === "hi"
                  ? `सब कुछ ठीक करने के बाद भी, सबसे लंबी प्रोसेसिंग लगभग ${waitDays} दिन लेती है। दावा उसके बाद भरें।`
                  : `Even after you act, the longest of these takes about ${waitDays} days to process. File after that.`}
              </p>
            ) : null}
          </section>
        ) : null}

        {/* -------------------------------------------------- Non-blockers */}
        {others.length > 0 ? (
          <section aria-labelledby="others" className="space-y-3">
            <h2 id="others" className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {lang === "hi" ? "यह भी जान लें" : "Also worth knowing"}
            </h2>
            <ul className="space-y-3">
              {others.map((f) => (
                <li key={f.ruleId}>
                  <FindingCard finding={f} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <RejectionDecoder
          initialText={session.personaId ? personaById(session.personaId)?.rejectionText : undefined}
          presentRuleIds={result.findings.map((f) => f.ruleId)}
        />

        {/* --------------------------------------------------------- Next */}
        <Card className="space-y-4 p-5">
          {n === 0 ? (
            <>
              <p className="text-md leading-relaxed text-ink">
                {lang === "hi"
                  ? "कोई रुकावट नहीं बची। अब दावा भरा जा सकता है।"
                  : "Nothing is blocking you. The claim is ready to file."}
              </p>
              <ButtonLink href="/claim" size="lg" full>
                {lang === "hi" ? "मेरा दावा भरें" : "File my claim"}
                <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
              </ButtonLink>
            </>
          ) : (
            <>
              <p className="text-md leading-relaxed text-ink">
                {lang === "hi"
                  ? "ऊपर हर दिक़्क़त में “इसे कैसे ठीक करें” खोलें। ठीक करने के बाद उसे चिह्नित करें — जाँच तुरंत दोबारा चलेगी।"
                  : "Open “How to fix it” on each item above. Mark one done and the check re-runs immediately."}
              </p>
              <ButtonLink href="/claim" tone="secondary" size="lg" full>
                {lang === "hi"
                  ? "फिर भी अभी भरें (यह क्यों ठीक नहीं)"
                  : "File anyway (and see why that goes wrong)"}
              </ButtonLink>
            </>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-sm">
            <Link href="/sources" className="font-medium text-indigo-600 hover:text-indigo-700">
              {lang === "hi" ? "ये नियम कहाँ से आए" : "Where these rules come from"}
            </Link>
            <button
              type="button"
              onClick={() => {
                reset();
                router.push("/");
              }}
              className="inline-flex items-center gap-1.5 font-medium text-ink-mute hover:text-ink"
            >
              <RotateCcw aria-hidden className="size-3.5" strokeWidth={1.8} />
              {lang === "hi" ? "फिर से शुरू करें" : "Start over"}
            </button>
          </div>

          <p className="text-xs leading-relaxed text-ink-faint">
            {lang === "hi"
              ? `इंजन संस्करण ${result.engineVersion} · ${RULES.length} नियम चलाए गए · अंतिम निर्णय EPFO का है। साफ़ प्री-फ़्लाइट ख़ारिज होने के ज्ञात कारण हटाती है, गारंटी नहीं देती।`
              : `Engine v${result.engineVersion} · ${RULES.length} rules evaluated · EPFO makes the final decision. A clear pre-flight removes the known causes of rejection; it is not a guarantee.`}
          </p>
        </Card>
      </div>
    </>
  );
}
