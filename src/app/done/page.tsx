"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Badge, ButtonLink, Callout, Card, SectionLabel } from "@/components/ui";
import { JourneyRail } from "@/components/journey-rail";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";

export default function DonePage() {
  const router = useRouter();
  const { lang } = useLang();
  const { session, ready } = useSession();

  useEffect(() => {
    if (ready && !session.claim) router.replace("/");
  }, [ready, session.claim, router]);

  if (!ready || !session.claim)
    return <div className="mx-auto min-h-[80vh] max-w-3xl px-4 py-16" />;

  const next = [
    {
      en: { t: "Verification", d: "EPFO checks your record against the claim. This is the step that fails when something does not match — and the step you just cleared." },
      hi: { t: "सत्यापन", d: "EPFO आपके रिकॉर्ड को दावे से मिलाता है। कुछ न मिलने पर यही चरण फ़ेल होता है — और यही चरण आपने अभी साफ़ किया है।" },
    },
    {
      en: { t: "Approval", d: "Fully compliant claims up to ₹5 lakh can clear without a human reviewer." },
      hi: { t: "मंज़ूरी", d: "पूरी तरह अनुपालक ₹5 लाख तक के दावे बिना किसी मानवीय जाँच के पास हो सकते हैं।" },
    },
    {
      en: { t: "Payment", d: "Money is credited to the verified bank account on your record — the one you just confirmed." },
      hi: { t: "भुगतान", d: "पैसा आपके रिकॉर्ड के सत्यापित बैंक खाते में आता है — वही जो आपने अभी निवारण किया।" },
    },
  ];

  return (
    <>
      <JourneyRail current="track" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        <div className="animate-rise space-y-3">
          <Badge tone="clear">
            <CheckCircle2 aria-hidden className="size-3" strokeWidth={2.2} />
            {lang === "hi" ? "भेज दिया गया" : "Submitted"}
          </Badge>
          <h1 className="display text-3xl text-ink sm:text-4xl">
            {lang === "hi" ? "दावा भेज दिया गया।" : "Your claim is in."}
          </h1>
          <p className="max-w-2xl text-md leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "पहली ही बार में — बिना किसी ऐसी गड़बड़ी के जो बीस दिन बाद इसे लौटा देती।"
              : "On the first attempt, with none of the mismatches that would have sent it back twenty days from now."}
          </p>
        </div>

        <Card className="space-y-1 p-5">
          <SectionLabel>{lang === "hi" ? "संदर्भ संख्या" : "Reference"}</SectionLabel>
          <p className="tnum font-mono text-2xl tracking-tight text-ink">
            {session.claim.ref}
          </p>
          <p className="text-sm text-ink-mute">
            {lang === "hi" ? "भेजा गया" : "Filed"}{" "}
            {new Date(session.claim.filedAt).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")}
          </p>
        </Card>

        <section aria-labelledby="next" className="space-y-3">
          <h2 id="next" className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {lang === "hi" ? "अब आगे क्या होगा" : "What happens next"}
          </h2>
          <ol className="space-y-3">
            {next.map((s, i) => (
              <li key={i} className="flex gap-4 border-t border-line pt-3">
                <span className="tnum shrink-0 font-mono text-sm text-ink-faint">
                  0{i + 1}
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-ink">{s[lang].t}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">{s[lang].d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Callout tone="indigo" title={lang === "hi" ? "क्या आपको कुछ करना है?" : "Do you need to do anything?"}>
          <p>
            {lang === "hi"
              ? "अभी नहीं। कुछ ज़रूरी हुआ तो स्थिति पृष्ठ पर साफ़ लिखा होगा कि क्या करना है — “लंबित” जैसा एक शब्द नहीं।"
              : "Not right now. If anything is ever needed from you, the status page will say what it is — not a single word like “Pending”."}
          </p>
        </Callout>

        <ButtonLink href="/status" size="lg" full>
          {lang === "hi" ? "अपने दावे की स्थिति देखें" : "Track this claim"}
        </ButtonLink>
      </div>
    </>
  );
}
