"use client";

import clsx from "clsx";
import Link from "next/link";
import { Check, Circle, Dot } from "lucide-react";
import { Badge, Button, ButtonLink, Callout, Card, SectionLabel } from "@/components/ui";
import { JourneyRail } from "@/components/journey-rail";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";

const STEPS = [
  {
    en: { t: "Application submitted", d: "We received your claim and gave it a reference number." },
    hi: { t: "आवेदन भेजा गया", d: "हमें आपका दावा मिल गया और उसे एक संदर्भ संख्या दे दी गई।" },
  },
  {
    en: { t: "Documents received", d: "Your KYC records were read successfully. Nothing was missing." },
    hi: { t: "दस्तावेज़ मिल गए", d: "आपके KYC रिकॉर्ड पढ़ लिए गए। कुछ भी छूटा नहीं।" },
  },
  {
    en: { t: "Verification", d: "Your name, date of birth and bank details are being matched against EPFO's record. This is where mismatched claims fail." },
    hi: { t: "सत्यापन", d: "आपका नाम, जन्मतिथि और बैंक विवरण EPFO के रिकॉर्ड से मिलाए जा रहे हैं। बेमेल दावे यहीं फ़ेल होते हैं।" },
  },
  {
    en: { t: "Approval", d: "A settlement order is passed and the amount is finalised." },
    hi: { t: "मंज़ूरी", d: "निपटान आदेश पारित होता है और राशि तय होती है।" },
  },
  {
    en: { t: "Payment released", d: "The amount is credited to your verified bank account." },
    hi: { t: "भुगतान जारी", d: "राशि आपके सत्यापित बैंक खाते में भेज दी जाती है।" },
  },
];

export default function StatusPage() {
  const { lang } = useLang();
  const { session, ready, advanceStatus } = useSession();

  // The stage lives with the claim, not in a component. A judge who advances
  // the timeline and then navigates away should come back to where they left
  // it, and a signed-in citizen should see the same stage on another device.
  const stage = session.claim ? session.claim.stage : 2;
  const done = stage >= STEPS.length - 1;
  const filed = Boolean(session.claim);

  return (
    <>
      <JourneyRail current="track" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:py-10">
        <div className="space-y-2">
          <SectionLabel>{lang === "hi" ? "दावे की स्थिति" : "Claim status"}</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">
            {done
              ? lang === "hi"
                ? "आपका पैसा भेज दिया गया"
                : "Your money has been released"
              : lang === "hi"
                ? "आपका दावा चल रहा है"
                : "Your claim is in progress"}
          </h1>
          {ready && session.claim ? (
            <p className="tnum font-mono text-sm text-ink-mute">{session.claim.ref}</p>
          ) : (
            <p className="text-sm text-ink-mute">
              {lang === "hi"
                ? "उदाहरण के तौर पर एक दावा दिखाया जा रहा है।"
                : "Showing an example claim."}
            </p>
          )}
        </div>

        <Card className="p-5">
          <ol className="space-y-0">
            {STEPS.map((s, i) => {
              const isDone = i < stage;
              const isNow = i === stage;
              return (
                <li key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      aria-hidden
                      className={clsx(
                        "grid size-6 shrink-0 place-items-center rounded-full border-2",
                        isDone && "border-clear-500 bg-clear-500 text-paper",
                        isNow && "border-indigo-600 bg-indigo-50 text-indigo-600",
                        !isDone && !isNow && "border-line-strong bg-paper text-line-strong",
                      )}
                    >
                      {isDone ? (
                        <Check className="size-3.5" strokeWidth={3} />
                      ) : isNow ? (
                        <Dot className="size-5" strokeWidth={4} />
                      ) : (
                        <Circle className="size-2" strokeWidth={4} />
                      )}
                    </span>
                    {i < STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className={clsx(
                          "my-1 w-0.5 flex-1 rounded-full",
                          isDone ? "bg-clear-200" : "bg-line",
                        )}
                      />
                    ) : null}
                  </div>

                  <div className={clsx("min-w-0 pb-6", i === STEPS.length - 1 && "pb-0")}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={clsx(
                          "font-semibold",
                          isNow ? "text-ink" : isDone ? "text-ink-soft" : "text-ink-faint",
                        )}
                      >
                        {s[lang].t}
                      </p>
                      {isNow ? (
                        <Badge tone="indigo">
                          {lang === "hi" ? "अभी यहाँ" : "Happening now"}
                        </Badge>
                      ) : null}
                    </div>
                    <p
                      className={clsx(
                        "mt-1 text-sm leading-relaxed",
                        isNow || isDone ? "text-ink-soft" : "text-ink-faint",
                      )}
                    >
                      {s[lang].d}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <Callout tone="indigo" title={lang === "hi" ? "क्या आपको अभी कुछ करना है?" : "Do you need to do anything right now?"}>
          <p>
            {done
              ? lang === "hi"
                ? "नहीं। पैसा आपके खाते में भेजा जा चुका है। बैंक में आने में 1–2 कार्यदिवस लग सकते हैं।"
                : "No. The money has been released to your account. Banks can take one to two working days to show it."
              : lang === "hi"
                ? "नहीं। आपसे कुछ नहीं चाहिए। कुछ ज़रूरी हुआ तो यहीं साफ़ लिखा जाएगा कि क्या और क्यों।"
                : "No. Nothing is needed from you. If that changes, this page will say exactly what and why."}
          </p>
          <p className="mt-1.5 text-ink-mute">
            {lang === "hi" ? "अंतिम अपडेट: अभी" : "Last updated: just now"}
          </p>
        </Callout>

        <Card className="space-y-3 p-4">
          <SectionLabel>
            {lang === "hi" ? "प्रदर्शन नियंत्रण" : "Demonstration control"}
          </SectionLabel>
          <p className="text-sm leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "यह स्थिति किसी सरकारी सिस्टम से जुड़ी नहीं है — कोई EPFO API यहाँ नहीं बुलाया जाता। असल में हर चरण में दिन लगते हैं; यहाँ आप उसे आगे बढ़ाकर पूरी समयरेखा देख सकते हैं।"
              : "This status is not connected to any government system — no EPFO API is called here. In reality each stage takes days; here you can step it forward to see the whole timeline."}
          </p>
          {filed ? (
            <Button tone="secondary" onClick={advanceStatus} disabled={done}>
              {done
                ? lang === "hi"
                  ? "समयरेखा पूरी हुई"
                  : "Timeline complete"
                : lang === "hi"
                  ? "अगला चरण"
                  : "Advance one stage"}
            </Button>
          ) : (
            <p className="text-sm leading-relaxed text-ink-mute">
              {lang === "hi" ? (
                <>
                  यह एक उदाहरण है। अपनी असली समयरेखा देखने के लिए पहले{" "}
                  <Link href="/preflight" className="font-medium text-indigo-600 hover:text-indigo-700">
                    जाँच चलाकर दावा भरें
                  </Link>
                  ।
                </>
              ) : (
                <>
                  This is an example. To get a timeline of your own,{" "}
                  <Link href="/preflight" className="font-medium text-indigo-600 hover:text-indigo-700">
                    run the check and file a claim
                  </Link>
                  .
                </>
              )}
            </p>
          )}
        </Card>

        <ButtonLink href="/why" tone="secondary" full>
          {lang === "hi" ? "यह पुराने अनुभव से बेहतर क्यों है" : "Why this is better than the old experience"}
        </ButtonLink>
      </div>
    </>
  );
}
