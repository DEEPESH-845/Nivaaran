"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Info, X } from "lucide-react";
import { Badge, Button, Callout, Card, Choice, Divider, SectionLabel } from "@/components/ui";
import { DocumentSlot, type SlotKind, type SlotReading } from "@/components/document-slot";
import { PERSONAS } from "@/content/personas";
import {
  blockingRows,
  readRows,
  reconcile,
  type DocumentValues,
  type ReconcileRow,
} from "@/lib/match/reconcile";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";
import { isValidIfscFormat } from "@/lib/rules/rules";
import type { Bi, Facts } from "@/lib/rules/types";

/**
 * The reconciliation desk.
 *
 * The verb on this page is **compare**, never "verify". We cannot authenticate
 * a government document — there is no API, no authority, and claiming
 * otherwise would send someone to file on the strength of a promise we invented.
 * What we can do is read the four fields EPFO checks and show, field by field,
 * where the record and the paper disagree.
 *
 * The table is built by `reconcile`, which calls the same matchers the rule
 * engine calls. If this screen and /preflight could disagree, one of them
 * would be lying.
 */

const COPY = {
  eyebrow: { en: "Your documents", hi: "आपके दस्तावेज़" },
  h1: {
    en: "Read your documents. Compare them, field by field.",
    hi: "अपने दस्तावेज़ पढ़वाएँ। हर जानकारी का मिलान देखें।",
  },
  lede: {
    en: "EPFO compares four things between your record and your documents. This reads them off a photograph and shows you the same comparison, before you file rather than twenty days after.",
    hi: "EPFO आपके रिकॉर्ड और दस्तावेज़ों के बीच चार बातें मिलाता है। यह उन्हें तस्वीर से पढ़कर वही तुलना दिखाता है — दावा भरने से पहले, बीस दिन बाद नहीं।",
  },
  notVerify: {
    en: "This is not verification. We cannot check whether a document is genuine — nobody outside the issuing authority can. We read what it says and compare it. EPFO performs the final verification.",
    hi: "यह सत्यापन नहीं है। कोई दस्तावेज़ असली है या नहीं, यह हम नहीं जाँच सकते — जारी करने वाली संस्था के बाहर कोई नहीं जाँच सकता। हम बस पढ़ते हैं और मिलान करते हैं। अंतिम सत्यापन EPFO करता है।",
  },
  warningTitle: { en: "Use a sample, not a real document", hi: "असली दस्तावेज़ नहीं, नमूना इस्तेमाल करें" },
  warning: {
    en: "Do not upload a real Aadhaar, PAN or passbook. This is a prototype — use a sample below. Any image you choose is sent to OpenAI to read the four fields we need. We never ask for, extract or store an Aadhaar, PAN or account number, and the image is not saved anywhere.",
    hi: "असली आधार, PAN या पासबुक अपलोड न करें। यह एक प्रोटोटाइप है — नीचे दिया गया नमूना इस्तेमाल करें। आप जो भी तस्वीर चुनेंगे वह OpenAI को भेजी जाती है ताकि ज़रूरी चार जानकारियाँ पढ़ी जा सकें। हम आधार, PAN या खाता संख्या न माँगते हैं, न निकालते हैं, न सहेजते हैं, और तस्वीर कहीं भी नहीं रखी जाती।",
  },
  pickTitle: { en: "Whose record are we comparing against?", hi: "किसके रिकॉर्ड से मिलान करना है?" },
  pickBody: {
    en: "A comparison needs two sides. Pick the situation you are here for and we will use that synthetic member record as the other one.",
    hi: "मिलान के लिए दो पक्ष चाहिए। आप जिस स्थिति के लिए आए हैं वह चुनें — दूसरा पक्ष वही काल्पनिक सदस्य रिकॉर्ड होगा।",
  },
  epfoLabel: { en: "EPFO record", hi: "EPFO रिकॉर्ड" },
  identityLabel: { en: "Identity document", hi: "पहचान दस्तावेज़" },
  bankLabel: { en: "Bank passbook", hi: "बैंक पासबुक" },
  tableTitle: { en: "What we read, against what EPFO has", hi: "जो पढ़ा गया, बनाम EPFO के पास जो है" },
  nothingRead: {
    en: "Read a document above and the comparison appears here. If reading does not work, type the values in yourself — the comparison is the same either way.",
    hi: "ऊपर कोई दस्तावेज़ पढ़वाएँ, तुलना यहीं दिखेगी। अगर पढ़ना काम न करे, तो मान ख़ुद भर दें — तुलना दोनों तरह से वही रहती है।",
  },
  typeInstead: { en: "Type the values in instead", hi: "मान ख़ुद भरें" },
  missingBank: {
    en: "The passbook carries the other two — the IFSC and the last four digits.",
    hi: "बाक़ी दो पासबुक में हैं — IFSC और खाते के आख़िरी चार अंक।",
  },
  missingIdentity: {
    en: "An identity document carries the other two — the name and the date of birth.",
    hi: "बाक़ी दो पहचान दस्तावेज़ में हैं — नाम और जन्मतिथि।",
  },
  agrees: { en: "Matches", hi: "मेल खाता है" },
  differs: { en: "Will stop your claim", hi: "दावा रोक देगा" },
  differsNoRule: { en: "Won't stop your claim", hi: "दावा नहीं रोकेगा" },
  notRead: { en: "Not read yet", hi: "अभी पढ़ा नहीं" },
  disagree: {
    en: "Your two documents disagree with each other here. EPFO does not compare them, so this will not reject the claim — but it matters if you correct the wrong one.",
    hi: "यहाँ आपके दोनों दस्तावेज़ आपस में मेल नहीं खाते। EPFO इनकी आपस में तुलना नहीं करता, इसलिए दावा ख़ारिज नहीं होगा — पर ग़लत वाले को सुधारने से फ़र्क़ पड़ेगा।",
  },
  precheck: {
    en: "Pre-check only — EPFO performs final verification.",
    hi: "सिर्फ़ पूर्व-जाँच — अंतिम सत्यापन EPFO ही करता है।",
  },
  editHint: {
    en: "Every value is editable. Reading a photograph is not perfect — correct anything that is wrong before you use it.",
    hi: "हर मान बदला जा सकता है। तस्वीर से पढ़ना पूरी तरह सही नहीं होता — इस्तेमाल से पहले जो ग़लत हो सुधार लें।",
  },
  use: { en: "Use these and re-run my check", hi: "इन्हें लेकर जाँच दोबारा चलाएँ" },
  backToCheck: { en: "Back to the check", hi: "जाँच पर वापस" },
} as const satisfies Record<string, Bi>;

/** Merge the edited document values into the facts. Only on a button press. */
function merge(facts: Facts, identity: DocumentValues, bank: DocumentValues): Facts {
  const next = structuredClone(facts);
  const r = next.records;
  if (identity.name || identity.dob) {
    r.aadhaar = {
      name: identity.name?.trim() || r.aadhaar?.name || r.epfo.name,
      dob: identity.dob?.trim() || r.aadhaar?.dob || r.epfo.dob,
    };
  }
  if (bank.name || bank.ifsc || bank.accountLast4) {
    const ifsc = bank.ifsc?.trim().toUpperCase() || r.bank?.ifsc || r.epfo.ifsc;
    r.bank = {
      name: bank.name?.trim() || r.bank?.name || r.epfo.name,
      ifsc,
      accountLast4: bank.accountLast4?.trim() || r.bank?.accountLast4 || r.epfo.accountLast4,
    };
    // A newly read or edited code has no directory result yet. Do not carry a
    // previous IFSC's lookup status forward; malformed values are marked false
    // here and are also caught directly by the rule engine.
    if (bank.ifsc?.trim()) r.bank.ifscValid = isValidIfscFormat(ifsc) ? undefined : false;
  }
  return next;
}

function Verdict({ row }: { row: ReconcileRow }) {
  const { t } = useLang();
  const read = row.identity.value !== null || row.bank.value !== null;
  const differs = row.identity.verdict === "differs" || row.bank.verdict === "differs";
  if (!read) return <Badge tone="neutral">{t(COPY.notRead)}</Badge>;
  if (!differs)
    return (
      <Badge tone="clear">
        <Check aria-hidden className="size-3" strokeWidth={2.4} />
        {t(COPY.agrees)}
      </Badge>
    );
  // A difference only stops a claim where a rule actually covers the comparison.
  return row.ruleId ? (
    <Badge tone="blocked">
      <X aria-hidden className="size-3" strokeWidth={2.4} />
      {t(COPY.differs)}
    </Badge>
  ) : (
    <Badge tone="caution">{t(COPY.differsNoRule)}</Badge>
  );
}

function ValueInput({
  label,
  value,
  verdict,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  verdict: "agrees" | "differs" | "unread";
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = `doc-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={id} className="shrink-0 text-sm text-ink-mute sm:w-40">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className={
          "min-h-11 w-full rounded-ctl border bg-paper-raised px-3 font-mono text-sm text-ink " +
          (verdict === "differs" ? "border-blocked-200" : "border-line-strong")
        }
      />
    </div>
  );
}

export default function DocumentsPage() {
  const { lang, t } = useLang();
  const router = useRouter();
  const { session, ready, begin, setFacts } = useSession();
  const [values, setValues] = useState<Record<SlotKind, DocumentValues>>({
    identity: {},
    bank: {},
  });
  // Manual entry is revealed on request rather than shown by default: this is
  // a comparison, not a form, and four empty inputs would say otherwise. It is
  // also the only path left when the reader fails, which the slot promises.
  const [typing, setTyping] = useState(false);
  // Bumped on every successful reading, to move the reader to the answer.
  const [reads, setReads] = useState(0);
  const comparisonRef = useRef<HTMLHeadingElement>(null);

  const facts = session.facts;
  const rows = useMemo(
    () => (facts ? reconcile(facts.records.epfo, values.identity, values.bank) : []),
    [facts, values],
  );

  function onRead(kind: SlotKind, reading: SlotReading | null) {
    setValues((prev) => ({ ...prev, [kind]: reading?.fields ?? {} }));
    if (reading) setReads((n) => n + 1);
  }

  function edit(kind: SlotKind, field: keyof DocumentValues, v: string) {
    setValues((prev) => ({ ...prev, [kind]: { ...prev[kind], [field]: v } }));
  }

  // The answer renders below the fold, and nothing used to point at it: the
  // slot showed a badge and the comparison the reader came for sat off-screen.
  useEffect(() => {
    if (reads === 0) return;
    const heading = comparisonRef.current;
    if (!heading) return;
    heading.focus();
    // Instant, not smooth: Lenis owns the scroll position here and resyncs to
    // a jump. Two smooth animations for one movement is the drift the
    // scroll provider exists to prevent.
    heading.scrollIntoView({ block: "start" });
  }, [reads]);

  const read = readRows(rows);
  const blocking = blockingRows(rows);
  const hasIdentity = Object.values(values.identity).some(Boolean);
  const hasBank = Object.values(values.bank).some(Boolean);
  // Name the document still missing rather than counting to two: "the passbook
  // carries the IFSC" tells you why to bother, "1 of 2" does not.
  const missing =
    hasIdentity && !hasBank ? COPY.missingBank : hasBank && !hasIdentity ? COPY.missingIdentity : null;

  /* -------------------------------------------------- No record to compare */
  if (ready && !facts) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:py-14">
        <div className="space-y-3">
          <SectionLabel>{t(COPY.eyebrow)}</SectionLabel>
          <h1 className="display max-w-3xl text-balance">{t(COPY.pickTitle)}</h1>
          <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(COPY.pickBody)}</p>
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

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
      <section className="space-y-3">
        <SectionLabel>{t(COPY.eyebrow)}</SectionLabel>
        <h1 className="display max-w-3xl text-balance">{t(COPY.h1)}</h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(COPY.lede)}</p>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-mute">{t(COPY.notVerify)}</p>
      </section>

      <Callout tone="caution" title={t(COPY.warningTitle)}>
        {t(COPY.warning)}
      </Callout>

      {/* ------------------------------------------------------------ Slots */}
      <section className="grid gap-6 sm:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <DocumentSlot kind="identity" onRead={(r) => onRead("identity", r)} />
        </Card>
        <Card className="p-4 sm:p-5">
          <DocumentSlot kind="bank" onRead={(r) => onRead("bank", r)} />
        </Card>
      </section>

      {missing ? (
        <p className="-mt-4 text-sm leading-relaxed text-ink-mute">{t(missing)}</p>
      ) : null}

      {/* ------------------------------------------------------------ Table */}
      <section aria-labelledby="comparison" className="space-y-3">
        <h2
          id="comparison"
          ref={comparisonRef}
          tabIndex={-1}
          className="scroll-mt-24 text-lg font-semibold tracking-[-0.01em] text-ink outline-none"
        >
          {t(COPY.tableTitle)}
        </h2>

        {read.length === 0 && !typing ? (
          <div className="space-y-3 rounded-card bg-paper-sunk p-4">
            <p className="text-sm leading-relaxed text-ink-soft">{t(COPY.nothingRead)}</p>
            <Button tone="secondary" onClick={() => setTyping(true)}>
              {t(COPY.typeInstead)}
            </Button>
          </div>
        ) : (
          <>
            {read.length > 0 ? (
              <p aria-live="polite" className="text-md leading-relaxed text-ink">
                {lang === "hi"
                  ? `चार में से ${read.length} जानकारियाँ मिलाई गईं। `
                  : `${read.length} of the four fields compared. `}
                {blocking.length === 0
                  ? lang === "hi"
                    ? "इनमें से कोई भी दावा नहीं रोकेगी।"
                    : "Nothing here will stop your claim."
                  : lang === "hi"
                    ? `${blocking.length} आपका दावा रोक देंगी।`
                    : `${blocking.length} will stop your claim.`}
              </p>
            ) : null}

            <ul className="space-y-3">
              {rows.map((row) => (
                <li key={row.field}>
                  <Card className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <SectionLabel>{t(row.label)}</SectionLabel>
                      <Verdict row={row} />
                    </div>

                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="shrink-0 text-sm text-ink-mute sm:w-40">
                        {t(COPY.epfoLabel)}
                      </span>
                      <span className="tnum font-mono text-sm text-ink">{row.epfo}</span>
                    </div>

                    {row.sides.includes("identity") ? (
                      <ValueInput
                        label={t(COPY.identityLabel)}
                        value={values.identity[row.field] ?? ""}
                        verdict={row.identity.verdict}
                        type={row.field === "dob" ? "date" : "text"}
                        onChange={(v) => edit("identity", row.field, v)}
                      />
                    ) : null}

                    {row.sides.includes("bank") ? (
                      <ValueInput
                        label={t(COPY.bankLabel)}
                        value={values.bank[row.field] ?? ""}
                        verdict={row.bank.verdict}
                        onChange={(v) => edit("bank", row.field, v)}
                      />
                    ) : null}

                    {row.documentsDisagree ? (
                      <p className="flex gap-2 rounded-ctl bg-paper-sunk p-3 text-xs leading-relaxed text-ink-soft">
                        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-faint" strokeWidth={1.8} />
                        {t(COPY.disagree)}
                      </p>
                    ) : null}

                    {/* A difference with no rule behind it is information, not a
                        rejection. Saying otherwise would invent a blocker. */}
                    {row.note &&
                    !row.ruleId &&
                    (row.identity.verdict === "differs" || row.bank.verdict === "differs") ? (
                      <p className="rounded-ctl border border-caution-100 bg-caution-50 p-3 text-xs leading-relaxed text-caution-700">
                        {t(row.note)}
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>

            <p className="text-xs leading-relaxed text-ink-mute">{t(COPY.editHint)}</p>
            <p className="text-xs leading-relaxed text-ink-mute">{t(COPY.precheck)}</p>
          </>
        )}
      </section>

      {/* Always reachable, including when nothing could be read. A failed
          reading loses a convenience; it must never strand anyone here. */}
      <section className="space-y-3">
        <Divider />
        <div className="flex flex-wrap items-center gap-3">
          {read.length > 0 ? (
            <Button
              onClick={() => {
                setFacts(merge(facts, values.identity, values.bank), "documents");
                router.push("/preflight");
              }}
            >
              {t(COPY.use)}
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
            </Button>
          ) : null}
          <Button tone="secondary" onClick={() => router.push("/check?q=5")}>
            {t(COPY.backToCheck)}
          </Button>
        </div>
      </section>
    </div>
  );
}
