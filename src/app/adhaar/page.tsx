"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, ButtonLink, Callout, Card, Choice, Divider, SectionLabel } from "@/components/ui";
import { CardStage } from "@/components/adhaar/card-stage";
import { DetailsForm } from "@/components/adhaar/details-form";
import type { CardDetails } from "@/components/adhaar/specimen-card";
import {
  enhancedNow,
  enhancedOnServer,
  readOptOut,
  subscribeEnhance,
  writeOptOut,
} from "@/lib/adhaar/enhance";
import { PERSONAS, type Persona } from "@/content/personas";
import { useAuth } from "@/lib/auth/context";
import { JourneyRail } from "@/components/journey-rail";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";
import type { Bi, Facts } from "@/lib/rules/types";

/**
 * The card.
 *
 * Everywhere else in this product the citizen's record is a row in a table.
 * That is the right shape for a comparison and the wrong shape for the
 * question underneath it — *what is EPFO actually comparing my claim
 * against?* The answer is a card in a wallet, and this is the only screen
 * that shows it as one.
 *
 * It is also the manual way into `records.aadhaar`. `/documents` fills the
 * same slot from a photograph, which needs a model, a network call and a
 * legible scan; this needs a keyboard. Change a letter in the name here and
 * `/preflight` changes its verdict, which is the point: the card is not an
 * illustration of the Aadhaar side, it *is* the Aadhaar side.
 *
 * What the card is not: a replica. See `specimen-card.tsx` and AGENTS.md
 * rule 13.
 */

const COPY = {
  eyebrow: { en: "Your Aadhaar card", hi: "आपका आधार कार्ड" },
  h1: {
    en: "The record EPFO compares your claim against.",
    hi: "वही रिकॉर्ड, जिससे EPFO आपके दावे का मिलान करता है।",
  },
  lede: {
    en: "Here it is as an object rather than a row in a table. Change a detail and the card changes with it — and so does the verdict on your check, because this is the same record the nine rules read.",
    hi: "यह रहा — तालिका की एक पंक्ति नहीं, बल्कि एक चीज़। कोई जानकारी बदलिए, कार्ड भी बदलेगा — और आपकी जाँच का नतीजा भी, क्योंकि नौ नियम इसी रिकॉर्ड को पढ़ते हैं।",
  },
  specimenTitle: { en: "This is a specimen, not a card", hi: "यह नमूना है, असली कार्ड नहीं" },
  specimenBody: {
    en: "Nothing here is issued by anyone. We never ask for an Aadhaar number, so the card carries a specimen one until you type your own — and if you do, it stays in this browser, is never sent anywhere, and is gone when you reload.",
    hi: "यह किसी संस्था द्वारा जारी नहीं है। हम आधार संख्या कभी नहीं माँगते, इसलिए जब तक आप ख़ुद न भरें, कार्ड पर नमूना संख्या रहती है — और भरने पर भी वह सिर्फ़ इसी ब्राउज़र में रहती है, कहीं भेजी नहीं जाती, और पेज दोबारा खोलते ही मिट जाती है।",
  },
  pickTitle: { en: "Whose card are we building?", hi: "किसका कार्ड बनाना है?" },
  pickBody: {
    en: "A card needs a record behind it. Pick the situation you are here for and we will use that synthetic member record.",
    hi: "कार्ड के पीछे एक रिकॉर्ड चाहिए। आप जिस स्थिति के लिए आए हैं वह चुनें — वही काल्पनिक सदस्य रिकॉर्ड इस्तेमाल होगा।",
  },
  enhanced: { en: "Enhanced view", hi: "बेहतर दृश्य" },
  enhancedHint: {
    en: "Adds real lighting behind the card. Loads only after the page is ready, and never on a slow connection.",
    hi: "कार्ड के पीछे असली रोशनी जोड़ता है। पेज तैयार होने के बाद ही लोड होता है, और धीमे नेटवर्क पर कभी नहीं।",
  },
  seeVerdict: { en: "See what this changes", hi: "देखें इससे क्या बदला" },
  compare: { en: "Compare it against a document", hi: "दस्तावेज़ से मिलान करें" },
  keep: { en: "Keep this on an account", hi: "इसे खाते में रखें" },
} as const satisfies Record<string, Bi>;

/**
 * The editor. Keyed by persona in the page below, so picking a different
 * record remounts it with fresh seed values instead of an effect racing to
 * overwrite what the reader has already typed.
 */
function CardEditor({ facts, persona }: { facts: Facts; persona: Persona | null }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { setFacts } = useSession();

  // Seeded from `records.aadhaar` if a document reading already filled it,
  // otherwise from the two EPFO fields the engine compares — never the banking
  // ones. An empty card would be a form; a populated one is an object you edit.
  const [details, setDetails] = useState<CardDetails>(() => {
    const from = facts.records.aadhaar ?? facts.records.epfo;
    return {
      name: from.name,
      dob: from.dob,
      number: "",
      gender: "",
      city: persona?.city ?? "",
      seed: persona?.id ?? "specimen",
    };
  });
  const [revealed, setRevealed] = useState(false);

  const optOut = useSyncExternalStore(subscribeEnhance, readOptOut, enhancedOnServer);
  const enhanced = useSyncExternalStore(subscribeEnhance, enhancedNow, enhancedOnServer);

  // Debounced because the card repaints on the keystroke but the session does
  // not need to: a fifteen-character name is otherwise fifteen writes to
  // localStorage, fifteen re-evaluations and — for a signed-in reader —
  // fifteen requests, while a 60fps tilt is running. Only `name` and `dob`
  // travel; the number, gender and city never leave this component
  // (AGENTS.md rule 13).
  const pending = useRef<{ name: string; dob: string } | null>(null);
  const commit = useRef<() => void>(() => {});

  // The committer is rebuilt against the latest facts in an effect rather than
  // during render, so the flush below always writes onto current state.
  useEffect(() => {
    commit.current = () => {
      const p = pending.current;
      if (!p) return;
      pending.current = null;
      setFacts({ ...facts, records: { ...facts.records, aadhaar: p } });
    };
  }, [facts, setFacts]);

  useEffect(() => {
    const current = facts.records.aadhaar;
    if (current?.name === details.name && current?.dob === details.dob) return;
    pending.current = { name: details.name, dob: details.dob };
    const id = window.setTimeout(() => commit.current(), 300);
    return () => window.clearTimeout(id);
  }, [details.name, details.dob, facts]);

  // One last write on the way out. Without it, typing a name and pressing
  // "See what this changes" inside the debounce window silently discards the
  // edit and shows a verdict for what the reader typed a moment ago.
  useEffect(() => () => commit.current(), []);

  const patch = useCallback((p: Partial<CardDetails>) => setDetails((d) => ({ ...d, ...p })), []);

  return (
    <>
      <CardStage details={details} revealed={revealed} enhanced={enhanced} />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button tone="quiet" onClick={() => writeOptOut(!optOut)} aria-pressed={!optOut}>
          <Sparkles aria-hidden className="size-4" strokeWidth={1.8} />
          {t(COPY.enhanced)}
        </Button>
        <p className="max-w-sm text-xs leading-relaxed text-ink-mute">{t(COPY.enhancedHint)}</p>
      </div>

      <Callout tone="caution" title={t(COPY.specimenTitle)}>
        {t(COPY.specimenBody)}
      </Callout>

      <Card className="p-4 sm:p-5">
        <DetailsForm
          details={details}
          onChange={patch}
          onCommit={() => commit.current()}
          revealed={revealed}
          onReveal={setRevealed}
        />
      </Card>

      <section className="space-y-3">
        <Divider />
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/preflight">
            {t(COPY.seeVerdict)}
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
          </ButtonLink>
          <ButtonLink href="/documents" tone="secondary">
            {t(COPY.compare)}
          </ButtonLink>
          {user ? null : (
            <ButtonLink href="/signup?next=/adhaar" tone="quiet">
              {t(COPY.keep)}
            </ButtonLink>
          )}
        </div>
      </section>
    </>
  );
}

export default function AdhaarPage() {
  const { lang, t } = useLang();
  const { session, ready, begin } = useSession();
  const facts = session.facts;
  const persona = PERSONAS.find((p) => p.id === session.personaId) ?? null;

  /* ------------------------------------------------- no record to build */

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
    <>
      {/* Both halves of the "Your records" stage — the photograph and the card
          — used to drop the reader out of the journey they were walking. */}
      <JourneyRail current="records" />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
        <section className="space-y-3">
          <SectionLabel>{t(COPY.eyebrow)}</SectionLabel>
          <h1 className="display max-w-3xl text-balance">{t(COPY.h1)}</h1>
          <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(COPY.lede)}</p>
        </section>

        <CardEditor key={session.personaId ?? "none"} facts={facts} persona={persona} />
      </div>
    </>
  );
}
