"use client";

import { Suspense, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CreditCard, FileText, Landmark, ScanLine } from "lucide-react";
import Link from "next/link";
import { Button, Card, Choice, Disclosure, Divider, SectionLabel } from "@/components/ui";
import { PERSONAS } from "@/content/personas";
import { JourneyRail } from "@/components/journey-rail";
import { QUESTIONS } from "@/lib/questions";
import { formatDate } from "@/lib/date";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";

const LAST = QUESTIONS.length; // the records step sits after the questions

function RecordsStep() {
  const { lang, t } = useLang();
  const { session } = useSession();
  const facts = session.facts;
  if (!facts) return null;

  const { epfo, aadhaar, bank } = facts.records;

  const rows = [
    {
      title: { en: "What EPFO has on file", hi: "EPFO के रिकॉर्ड में क्या है" },
      icon: Landmark,
      items: [
        { k: { en: "Name", hi: "नाम" }, v: epfo.name },
        { k: { en: "Date of birth", hi: "जन्मतिथि" }, v: formatDate(epfo.dob) },
        { k: { en: "Bank IFSC", hi: "बैंक IFSC" }, v: epfo.ifsc },
        { k: { en: "Account", hi: "खाता" }, v: `•••• ${epfo.accountLast4}` },
      ],
    },
    {
      title: { en: "What your documents say", hi: "आपके दस्तावेज़ क्या कहते हैं" },
      icon: FileText,
      items: [
        { k: { en: "Aadhaar name", hi: "आधार का नाम" }, v: aadhaar?.name ?? "—" },
        { k: { en: "Aadhaar date of birth", hi: "आधार की जन्मतिथि" }, v: formatDate(aadhaar?.dob) || "—" },
        { k: { en: "Passbook name", hi: "पासबुक का नाम" }, v: bank?.name ?? "—" },
        { k: { en: "Passbook IFSC", hi: "पासबुक का IFSC" }, v: bank?.ifsc ?? "—" },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.015em] text-ink">
          {lang === "hi" ? "अब हम आपके रिकॉर्ड मिलाएँगे" : "Now we compare your records"}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "यही वह तुलना है जो EPFO आपके दावा भरने के बाद करता है। हम इसे पहले कर रहे हैं।"
            : "This is the comparison EPFO runs after you file. We are running it before."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <Card key={r.title.en} className="p-4">
            <div className="flex items-center gap-2">
              <r.icon aria-hidden className="size-4 text-ink-faint" strokeWidth={1.7} />
              <SectionLabel>{t(r.title)}</SectionLabel>
            </div>
            <dl className="mt-3 space-y-2.5">
              {r.items.map((it) => (
                <div key={it.k.en} className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-sm text-ink-mute">{t(it.k)}</dt>
                  <dd className="tnum text-right font-mono text-sm text-ink">{it.v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      {/* A door, not the machinery. The reader used to live here inside a
          <details>, where almost nobody opened it — the capability was never
          the problem, the burial was. */}
      <Card className="p-4 sm:p-5">
        <Link
          href="/documents"
          className="group flex min-h-11 items-start gap-3 rounded-ctl text-left"
        >
          <ScanLine
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-faint transition-colors group-hover:text-indigo-600"
            strokeWidth={1.7}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-md font-medium text-ink">
              {lang === "hi"
                ? "इन्हें अपने दस्तावेज़ों से पढ़वाएँ"
                : "Read these from your documents instead"}
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
              {lang === "hi"
                ? "पहचान दस्तावेज़ और पासबुक की तस्वीर से चारों जानकारियाँ पढ़ी जाती हैं, और हर एक का EPFO रिकॉर्ड से मिलान दिखता है।"
                : "Photograph an identity document and a passbook; we read the four fields EPFO checks and compare each one against the record above."}
            </span>
          </span>
          <ArrowRight
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-600"
            strokeWidth={1.8}
          />
        </Link>

        <Divider className="my-4" />

        {/* The second door into the same two fields. A photograph needs a
            model, a network call and a legible scan; this needs a keyboard,
            and it is the only screen that shows the reader what the record
            they are arguing with actually looks like. */}
        <Link
          href="/adhaar"
          className="group flex min-h-11 items-start gap-3 rounded-ctl text-left"
        >
          <CreditCard
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-faint transition-colors group-hover:text-indigo-600"
            strokeWidth={1.7}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-md font-medium text-ink">
              {lang === "hi"
                ? "या इन्हें अपने आधार कार्ड पर देखें"
                : "Or see them on your Aadhaar card"}
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-ink-soft">
              {lang === "hi"
                ? "वही नाम और जन्मतिथि, एक कार्ड की तरह — घुमाकर देखिए, बदलिए, और जाँच का नतीजा तुरंत बदलता देखिए। कोई तस्वीर नहीं चाहिए।"
                : "The same name and date of birth, as a card you can turn over and edit. No photograph, no model — and the verdict changes as you type."}
            </span>
          </span>
          <ArrowRight
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-indigo-600"
            strokeWidth={1.8}
          />
        </Link>
      </Card>

      <p className="rounded-card border border-caution-100 bg-caution-50 p-3.5 text-xs leading-relaxed text-caution-700">
        {lang === "hi"
          ? "प्रदर्शन डेटा। ये मान एक काल्पनिक सदस्य फ़ाइल से आते हैं। आप इन्हें ऊपर दिए दस्तावेज़ पृष्ठ से बदल सकते हैं; असली उत्पाद में इनकी तुलना आपके सजीव EPFO रिकॉर्ड से होती।"
          : "Demonstration data. These values come from a synthetic member file. You can replace them from the documents page above; in a real product they would be compared against your live EPFO record."}
      </p>
    </div>
  );
}

function CheckFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang, t, ui } = useLang();
  const { session, ready, begin, setFacts } = useSession();
  const [navigating, startNavigation] = useTransition();

  const raw = Number(params.get("q") ?? "0");
  const step = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), LAST) : 0;

  const facts = session.facts;

  // Arriving here without a case — a bookmark, a reload with storage cleared —
  // used to bounce to the landing page. A client-side redirect replaces the
  // whole document a beat after the first paint, which is a layout shift the
  // reader sees and Lighthouse counts, and it drops someone who asked for the
  // check onto a page that is an argument. The other two entrances to the
  // journey (/documents, /adhaar) already ask the question here; so does this.
  if (ready && !facts) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:py-14">
        <div className="space-y-3">
          <SectionLabel>{lang === "hi" ? "जाँच" : "The check"}</SectionLabel>
          <h1 className="display max-w-3xl text-balance">
            {lang === "hi" ? "आप किस स्थिति में हैं?" : "Which of these is you?"}
          </h1>
          <p className="max-w-2xl text-md leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "जाँच के लिए एक रिकॉर्ड चाहिए। जिस स्थिति के लिए आप आए हैं वह चुनें — वही काल्पनिक सदस्य रिकॉर्ड इस्तेमाल होगा।"
              : "The check needs a record to run against. Pick the situation you are here for and we will use that synthetic member record."}
          </p>
        </div>
        <div className="space-y-2.5">
          {PERSONAS.map((p) => (
            <Choice
              key={p.id}
              label={`“${t(p.saying)}”`}
              hint={`${lang === "hi" ? "नमूना" : "Demo"} · ${p.name}, ${p.age}, ${p.city}`}
              onClick={() => begin(p.id, p.facts)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!ready || !facts) {
    return (
      <div className="mx-auto min-h-[70vh] max-w-3xl px-4 py-16">
        <div className="h-4 w-32 animate-pulse rounded bg-line" />
      </div>
    );
  }

  const onRecords = step === LAST;
  const q = onRecords ? null : QUESTIONS[step];
  const selected = q ? q.current(facts) : "";

  // Navigation is wrapped in a transition so the button can be disabled while
  // it is in flight. Without this, a double tap reads a stale step and skips a
  // question — which on a slow phone is exactly what a hurried user does.
  const go = (next: number) =>
    startNavigation(() => {
      if (next < 0) router.push("/");
      else router.push(`/check?q=${next}`);
    });

  return (
    <>
      <JourneyRail current={onRecords ? "records" : "situation"} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <div key={step} className="animate-rise">
          {onRecords ? (
            <RecordsStep />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">
                  {ui("step")} {step + 1} {ui("of")} {QUESTIONS.length}
                </p>
                <h1 className="mt-2 text-2xl font-semibold leading-snug tracking-[-0.015em] text-ink">
                  {t(q!.prompt)}
                </h1>
              </div>

              <div className="space-y-2.5">
                {q!.options.map((opt) => (
                  <Choice
                    key={opt.value}
                    selected={selected === opt.value}
                    label={t(opt.label)}
                    hint={opt.hint ? t(opt.hint) : undefined}
                    onClick={() => setFacts(opt.apply(facts))}
                  />
                ))}
              </div>

              {q!.help ? (
                <Disclosure summary={ui("whyThisMatters")}>{t(q!.help)}</Disclosure>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
          <Button tone="secondary" onClick={() => go(step - 1)} disabled={navigating}>
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.8} />
            {ui("back")}
          </Button>
          <Button
            size="lg"
            className="flex-1 sm:flex-none"
            disabled={navigating}
            onClick={() =>
              onRecords
                ? startNavigation(() => router.push("/preflight"))
                : go(step + 1)
            }
          >
            {onRecords
              ? lang === "hi"
                ? "मेरा दावा जाँचें"
                : "Check my claim"
              : ui("continue")}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
          </Button>
        </div>
      </div>
    </>
  );
}

export default function CheckPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-16" />}>
      <CheckFlow />
    </Suspense>
  );
}
