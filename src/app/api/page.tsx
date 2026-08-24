"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Play } from "lucide-react";
import { Badge, Button, Callout, Card, SectionLabel } from "@/components/ui";
import { personaById } from "@/content/personas";
import { RULES, ENGINE_VERSION } from "@/lib/rules/rules";
import { SOURCE_LIST } from "@/lib/rules/sources";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";
import type { Bi, Facts } from "@/lib/rules/types";

/**
 * The Preflight API, documented.
 *
 * The endpoint has existed since the engine did, and nothing in the product
 * pointed at it. This page is the pointer — and it runs the real endpoint
 * against the reader's own session rather than showing a screenshot of one.
 */

const EXAMPLE: Facts = personaById("rajesh")!.facts;
const BODY = JSON.stringify(EXAMPLE, null, 2);

const CURL = `curl -sS https://nivaaran.app/api/preflight \\
  -H 'content-type: application/json' \\
  -d '${JSON.stringify(EXAMPLE)}'`;

const RESPONSE_SHAPE = `{
  verdict: "clear" | "fixable" | "blocked_external",
  findings: [{
    ruleId: string,               // e.g. "R-NAME-AADHAAR"
    gate: "identity" | "kyc" | "employment"
        | "eligibility" | "banking" | "tax",
    severity: "blocker" | "warning" | "info",
    owner: "citizen" | "employer" | "epfo" | "time",
    title: { en, hi },            // every string is bilingual
    why:   { en, hi },
    evidence?: { ... },           // the token-level diff, when there is one
    fix: {
      summary: { en, hi }, steps: [{ en, hi }],
      minutes: number,            // active effort
      waitDays?: number,          // queue time after you act
      cost: { en, hi }, officialUrl?: string, caveat?: { en, hi }
    },
    source: { id, url, verifiedOn, confidence }
  }],
  counts:        { blockers, warnings, infos },
  minutesToFix:  number,          // citizen-owned effort only
  owners:        Owner[],
  engineVersion: string,
  evaluatedAt:   string,          // ISO
  disclaimer:    string
}`;

const COPY = {
  eyebrow: { en: "For developers", hi: "डेवलपर्स के लिए" },
  h1: {
    en: "The interface is the smallest part of the answer.",
    hi: "इंटरफ़ेस इस जवाब का सबसे छोटा हिस्सा है।",
  },
  lede: {
    en: "The rule engine is a pure function — no network, no model, no clock. That is what makes it something other than a website: the same check can run inside EPFO's member portal before Submit, or inside an employer's HRMS at exit, where the missing exit date is actually created. This endpoint is that check, unauthenticated and side-effect free.",
    hi: "नियम-इंजन एक शुद्ध फलन है — न नेटवर्क, न मॉडल, न घड़ी। इसी वजह से यह सिर्फ़ एक वेबसाइट नहीं है: यही जाँच EPFO के मेंबर पोर्टल में सबमिट से पहले चल सकती है, या नियोक्ता के HRMS में नौकरी छोड़ते समय, जहाँ नौकरी छोड़ने की तारीख़ छूटती ही है। यह एंडपॉइंट वही जाँच है — बिना लॉगिन, बिना किसी दुष्प्रभाव के।",
  },
  getTitle: { en: "The contract", hi: "अनुबंध" },
  getBody: {
    en: "Returns the rule ids the engine can produce, the full source registry with verification dates, the disclaimer, and a worked example you can POST straight back.",
    hi: "इंजन जो नियम-आईडी दे सकता है, सत्यापन तिथियों सहित पूरा स्रोत-रजिस्टर, अस्वीकरण, और एक तैयार उदाहरण जिसे आप सीधे POST कर सकते हैं।",
  },
  postTitle: { en: "The check", hi: "जाँच" },
  postBody: {
    en: "POST the shape of a member record and get back every blocker, who owns it, how long the fix takes, and the rule it came from. It needs no identifier — not a UAN, not an Aadhaar number, not a full account number.",
    hi: "सदस्य रिकॉर्ड का ढाँचा POST करें और हर रुकावट वापस पाएँ — किसकी ज़िम्मेदारी है, सुधार में कितना समय लगेगा, और वह किस नियम से आई। इसे किसी पहचान संख्या की ज़रूरत नहीं — न UAN, न आधार संख्या, न पूरा खाता नंबर।",
  },
  request: { en: "Request body", hi: "अनुरोध की बॉडी" },
  response: { en: "Response", hi: "उत्तर" },
  copy: { en: "Copy", hi: "कॉपी करें" },
  copied: { en: "Copied", hi: "कॉपी हो गया" },
  tryTitle: { en: "Run it against your own session", hi: "अपने ही सत्र पर चलाकर देखें" },
  tryBody: {
    en: "This posts the record from the journey you are in the middle of, to the live endpoint, and prints what comes back. Nothing is stored at either end.",
    hi: "यह उस रिकॉर्ड को, जिस पर आपकी जाँच चल रही है, सजीव एंडपॉइंट पर भेजता है और जो लौटता है वही दिखाता है। किसी भी तरफ़ कुछ सहेजा नहीं जाता।",
  },
  trySession: { en: "Try it with this session's facts", hi: "इस सत्र के तथ्यों पर चलाएँ" },
  tryExample: { en: "Try it with the example record", hi: "उदाहरण रिकॉर्ड पर चलाएँ" },
  running: { en: "Running…", hi: "चल रहा है…" },
  noSession: {
    en: "You have no session yet, so this runs the example record instead. Start the check to use your own.",
    hi: "अभी आपका कोई सत्र नहीं है, इसलिए यह उदाहरण रिकॉर्ड पर चलेगा। अपना इस्तेमाल करने के लिए जाँच शुरू करें।",
  },
  startCheck: { en: "Start the check", hi: "जाँच शुरू करें" },
  failed: {
    en: "The call did not complete. The endpoint stores nothing, so nothing needs undoing — try again.",
    hi: "अनुरोध पूरा नहीं हुआ। एंडपॉइंट कुछ सहेजता नहीं, इसलिए कुछ पलटने की ज़रूरत नहीं — फिर कोशिश करें।",
  },
  honestyTitle: { en: "What this endpoint is, and is not", hi: "यह एंडपॉइंट क्या है, और क्या नहीं" },
  honesty: {
    en: "It is advisory. EPFO makes the final decision on any claim, and a clear result removes the known causes of rejection rather than guaranteeing anything. It is unauthenticated and stateless: it stores nothing, logs no payload, and touches no government system. The rules are best-effort readings of public sources, each carrying its own confidence — send synthetic data only.",
    hi: "यह सलाह है, फ़ैसला नहीं। किसी भी दावे पर अंतिम निर्णय EPFO का है; साफ़ नतीजा ख़ारिज होने के ज्ञात कारण हटाता है, गारंटी नहीं देता। यह बिना लॉगिन और बिना स्मृति के चलता है: कुछ सहेजता नहीं, कोई पेलोड लॉग नहीं करता, किसी सरकारी सिस्टम को छूता नहीं। नियम सार्वजनिक स्रोतों की ईमानदार व्याख्या हैं, हर एक अपनी विश्वसनीयता के साथ — कृपया केवल काल्पनिक डेटा भेजें।",
  },
  sources: { en: "Every rule's source", hi: "हर नियम का स्रोत" },
} as const satisfies Record<string, Bi>;

function CopyButton({ text }: { text: string }) {
  const { t } = useLang();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => setDone(true),
          () => setDone(false),
        );
      }}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-ctl px-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
    >
      {done ? (
        <Check aria-hidden className="size-3.5" strokeWidth={2} />
      ) : (
        <Copy aria-hidden className="size-3.5" strokeWidth={1.8} />
      )}
      {done ? t(COPY.copied) : t(COPY.copy)}
    </button>
  );
}

function Code({ label, children }: { label: string; children: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{label}</SectionLabel>
        <CopyButton text={children} />
      </div>
      {/* A block that scrolls has to be reachable by keyboard, or the content
          past its right edge is unreadable without a pointer. */}
      <pre
        tabIndex={0}
        role="region"
        aria-label={label}
        className="overflow-x-auto rounded-card border border-line bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink"
      >
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Method({ verb, path }: { verb: string; path: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Badge tone="indigo">{verb}</Badge>
      <code className="font-mono text-sm text-ink">{path}</code>
    </span>
  );
}

type Run =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; status: number; body: string; usedSession: boolean }
  | { kind: "failed" };

export default function ApiPage() {
  const { lang, t } = useLang();
  const { session } = useSession();
  const [run, setRun] = useState<Run>({ kind: "idle" });

  const facts = session.facts;

  async function tryIt() {
    setRun({ kind: "running" });
    try {
      const res = await fetch("/api/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(facts ?? EXAMPLE),
      });
      const json = await res.json();
      setRun({
        kind: "done",
        status: res.status,
        body: JSON.stringify(json, null, 2),
        usedSession: Boolean(facts),
      });
    } catch {
      setRun({ kind: "failed" });
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10 sm:py-14">
      <section className="space-y-3">
        <SectionLabel>{t(COPY.eyebrow)}</SectionLabel>
        <h1 className="display max-w-3xl text-balance">{t(COPY.h1)}</h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(COPY.lede)}</p>
        <p className="text-sm text-ink-mute">
          <code className="font-mono">v{ENGINE_VERSION}</code> · {RULES.length}{" "}
          {lang === "hi" ? "नियम" : "rules"} · {SOURCE_LIST.length}{" "}
          {lang === "hi" ? "स्रोत" : "sources"}
        </p>
      </section>

      {/* ------------------------------------------------------------ GET */}
      <section className="space-y-3">
        <Method verb="GET" path="/api/preflight" />
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
          {t(COPY.getTitle)}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{t(COPY.getBody)}</p>
        <Code label="curl">{"curl -sS https://nivaaran.app/api/preflight"}</Code>
      </section>

      {/* ----------------------------------------------------------- POST */}
      <section className="space-y-4">
        <Method verb="POST" path="/api/preflight" />
        <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
          {t(COPY.postTitle)}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{t(COPY.postBody)}</p>
        <Code label={t(COPY.request)}>{BODY}</Code>
        <Code label={t(COPY.response)}>{RESPONSE_SHAPE}</Code>
        <Code label="curl">{CURL}</Code>
      </section>

      {/* ---------------------------------------------------------- Try it */}
      <section className="space-y-3">
        <Card className="space-y-4 p-5">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">
              {t(COPY.tryTitle)}
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">{t(COPY.tryBody)}</p>
          </div>

          {!facts ? (
            <p className="text-sm leading-relaxed text-ink-mute">
              {t(COPY.noSession)}{" "}
              <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-700">
                {t(COPY.startCheck)}
              </Link>
            </p>
          ) : null}

          <Button onClick={tryIt} disabled={run.kind === "running"}>
            <Play aria-hidden className="size-4" strokeWidth={1.8} />
            {run.kind === "running"
              ? t(COPY.running)
              : facts
                ? t(COPY.trySession)
                : t(COPY.tryExample)}
          </Button>

          <div aria-live="polite">
            {run.kind === "done" ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={run.status === 200 ? "clear" : "blocked"}>
                    HTTP {run.status}
                  </Badge>
                  <span className="text-xs text-ink-mute">
                    {run.usedSession
                      ? lang === "hi"
                        ? "आपके सत्र के तथ्य"
                        : "your session's facts"
                      : lang === "hi"
                        ? "उदाहरण रिकॉर्ड"
                        : "the example record"}
                  </span>
                </div>
                <pre
                  tabIndex={0}
                  role="region"
                  aria-label={lang === "hi" ? "एंडपॉइंट का उत्तर" : "Endpoint response"}
                  className="max-h-96 overflow-auto rounded-card border border-line bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink"
                >
                  <code>{run.body}</code>
                </pre>
              </div>
            ) : run.kind === "failed" ? (
              <p className="text-sm leading-relaxed text-ink-mute">{t(COPY.failed)}</p>
            ) : null}
          </div>
        </Card>
      </section>

      {/* --------------------------------------------------------- Honesty */}
      <section>
        <Callout tone="caution" title={t(COPY.honestyTitle)}>
          <p>{t(COPY.honesty)}</p>
          <p className="pt-2">
            <Link href="/sources" className="font-medium text-indigo-600 hover:text-indigo-700">
              {t(COPY.sources)}
            </Link>
          </p>
        </Callout>
      </section>
    </div>
  );
}
