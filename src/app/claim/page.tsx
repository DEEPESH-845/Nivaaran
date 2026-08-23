"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Lock, ShieldAlert } from "lucide-react";
import { Button, Callout, Card, SectionLabel } from "@/components/ui";
import { JourneyRail } from "@/components/journey-rail";
import { preflight } from "@/lib/rules/engine";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function ClaimPage() {
  const router = useRouter();
  const { lang } = useLang();
  const { session, ready, fileClaim } = useSession();
  const [filing, setFiling] = useState(false);

  useEffect(() => {
    if (ready && !session.facts) router.replace("/");
  }, [ready, session.facts, router]);

  const result = useMemo(
    () => (session.facts ? preflight(session.facts) : null),
    [session.facts],
  );

  if (!ready || !session.facts || !result) {
    return <div className="mx-auto min-h-[80vh] max-w-3xl px-4 py-16" />;
  }

  const facts = session.facts;
  const blockers = result.findings.filter((f) => f.severity === "blocker");
  const clear = blockers.length === 0;

  async function submit() {
    setFiling(true);
    await new Promise((r) => setTimeout(r, 900));
    fileClaim(facts.claimAmount);
    router.push("/done");
  }

  const rows = [
    { k: { en: "Claim type", hi: "दावे का प्रकार" }, v: lang === "hi" ? "अंतिम निपटान (फ़ॉर्म 19 और 10C)" : "Final settlement (Form 19 & 10C)" },
    { k: { en: "Name", hi: "नाम" }, v: facts.records.epfo.name },
    { k: { en: "Date of birth", hi: "जन्मतिथि" }, v: facts.records.epfo.dob },
    { k: { en: "Bank account", hi: "बैंक खाता" }, v: `•••• ${facts.records.epfo.accountLast4}` },
    { k: { en: "IFSC", hi: "IFSC" }, v: facts.records.bank?.ifsc ?? facts.records.epfo.ifsc },
    { k: { en: "Amount", hi: "राशि" }, v: inr(facts.claimAmount) },
  ];

  return (
    <>
      <JourneyRail current="file" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        <div className="space-y-2">
          <SectionLabel>{lang === "hi" ? "दावा भरें" : "File the claim"}</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">
            {lang === "hi"
              ? "यह वही है जो भेजा जाएगा"
              : "This is exactly what gets submitted"}
          </h1>
          <p className="text-base leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "कोई छिपा हुआ फ़ॉर्म नहीं। हर मान वही है जो आपके रिकॉर्ड से लिया गया।"
              : "No hidden form. Every value here came from the records you just checked."}
          </p>
        </div>

        {!clear ? (
          <Callout
            tone="blocked"
            icon={<ShieldAlert aria-hidden className="size-5 text-blocked-500" strokeWidth={1.7} />}
            title={
              lang === "hi"
                ? `${blockers.length} रुकावटें अब भी बाक़ी हैं`
                : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} still open`
            }
          >
            <p>
              {lang === "hi"
                ? "आप फिर भी भर सकते हैं — असली पोर्टल भी आपको रोकता नहीं। यही तो दिक़्क़त है: यह लगभग बीस दिन बाद ख़ारिज होकर लौटेगा।"
                : "You can still file — the real portal will not stop you either. That is the whole problem: this comes back rejected in about twenty days."}
            </p>
          </Callout>
        ) : null}

        <Card className="overflow-hidden">
          <div className="border-b border-line bg-paper-sunk px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <Landmark aria-hidden className="size-4 text-ink-faint" strokeWidth={1.7} />
              <SectionLabel>
                {lang === "hi" ? "दावे का सार" : "Claim summary"}
              </SectionLabel>
            </div>
          </div>
          <dl className="divide-y divide-line-soft">
            {rows.map((r) => (
              <div key={r.k.en} className="flex items-baseline justify-between gap-4 px-4 py-3 sm:px-5">
                <dt className="shrink-0 text-sm text-ink-mute">{r.k[lang]}</dt>
                <dd className="tnum text-right font-mono text-sm text-ink">{r.v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Callout
          tone="indigo"
          icon={<Lock aria-hidden className="size-5 text-indigo-600" strokeWidth={1.7} />}
          title={lang === "hi" ? "यहाँ कुछ असली नहीं भेजा जाता" : "Nothing real is submitted here"}
        >
          <p>
            {lang === "hi"
              ? "यह एक प्रोटोटाइप है। कोई OTP नहीं, कोई भुगतान नहीं, किसी सरकारी सिस्टम से कोई संपर्क नहीं। दावा इसी ब्राउज़र में दर्ज होता है।"
              : "This is a prototype. No OTP, no payment, no contact with any government system. The claim is recorded in this browser only."}
          </p>
        </Callout>

        <Button size="lg" full onClick={submit} disabled={filing}>
          {filing
            ? lang === "hi"
              ? "भेजा जा रहा है…"
              : "Submitting…"
            : lang === "hi"
              ? "दावा भेजें (नक़ली)"
              : "Submit claim (simulated)"}
        </Button>
      </div>
    </>
  );
}
