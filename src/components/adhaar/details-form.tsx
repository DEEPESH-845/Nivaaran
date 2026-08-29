"use client";

import { Eye, EyeOff, Wand2 } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { isValidAadhaar } from "@/lib/adhaar/verhoeff";
import { specimenNumber } from "@/lib/adhaar/specimen";
import { useLang } from "@/lib/i18n/context";
import type { Bi } from "@/lib/rules/types";
import type { CardDetails } from "./specimen-card";

/**
 * The capture side.
 *
 * Two of these five fields reach the rule engine — the name and the date of
 * birth EPFO compares. The other three exist because a card without them is
 * not a card, and they stay in this page's memory: gender and city because no
 * rule reads them, and the number because of AGENTS.md rule 13. Nothing here
 * is written to storage or sent anywhere; the note under the number field
 * says so in the reader's own language rather than in a privacy policy.
 */

const COPY = {
  legend: { en: "Your details", hi: "आपकी जानकारी" },
  name: { en: "Name", hi: "नाम" },
  nameHint: {
    en: "Spelled the way it appears on your Aadhaar — that spelling is what EPFO compares.",
    hi: "जैसा आपके आधार पर लिखा है — EPFO उसी वर्तनी से मिलान करता है।",
  },
  dob: { en: "Date of birth", hi: "जन्मतिथि" },
  number: { en: "Aadhaar number", hi: "आधार संख्या" },
  numberHint: {
    en: "This stays in your browser. It is never sent anywhere and never saved — reloading this page clears it.",
    hi: "यह सिर्फ़ आपके ब्राउज़र में रहती है। कहीं भेजी या सहेजी नहीं जाती — पेज दोबारा खोलने पर मिट जाती है।",
  },
  numberBad: {
    en: "That is not a valid Aadhaar number — check the digits.",
    hi: "यह मान्य आधार संख्या नहीं है — अंक जाँच लें।",
  },
  reveal: { en: "Show the number", hi: "संख्या दिखाएँ" },
  hide: { en: "Hide the number", hi: "संख्या छिपाएँ" },
  specimen: { en: "Use a specimen number", hi: "नमूना संख्या भरें" },
  gender: { en: "Gender", hi: "लिंग" },
  genderUnset: { en: "Not stated", hi: "नहीं बताया" },
  female: { en: "Female", hi: "महिला" },
  male: { en: "Male", hi: "पुरुष" },
  other: { en: "Other", hi: "अन्य" },
  city: { en: "City", hi: "शहर" },
  cityHint: { en: "Shown on the reverse.", hi: "पिछले भाग पर दिखता है।" },
} as const satisfies Record<string, Bi>;

/** Groups of four, the way the number is printed and the way people read it. */
function group(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 12);
  return [d.slice(0, 4), d.slice(4, 8), d.slice(8, 12)].filter(Boolean).join(" ");
}

export function DetailsForm({
  details,
  onChange,
  onCommit,
  revealed,
  onReveal,
}: {
  details: CardDetails;
  onChange: (patch: Partial<CardDetails>) => void;
  /** Settle the debounced session write now, before focus goes elsewhere. */
  onCommit: () => void;
  revealed: boolean;
  onReveal: (next: boolean) => void;
}) {
  const { t } = useLang();
  const digits = details.number.replace(/\D/g, "");
  // Empty is not an error — it is the starting state, and scolding someone for
  // not yet having typed is the thing government forms do.
  const numberError = digits.length > 0 && !isValidAadhaar(digits) ? t(COPY.numberBad) : undefined;

  return (
    <section aria-labelledby="adhaar-details" className="space-y-4">
      <h2
        id="adhaar-details"
        className="text-2xs font-semibold uppercase tracking-[0.11em] text-ink-mute"
      >
        {t(COPY.legend)}
      </h2>

      <Field
        label={t(COPY.name)}
        hint={t(COPY.nameHint)}
        name="name"
        value={details.name}
        autoComplete="off"
        onBlur={onCommit}
        onChange={(e) => onChange({ name: e.target.value })}
      />

      <Field
        label={t(COPY.dob)}
        type="date"
        name="dob"
        value={details.dob}
        onBlur={onCommit}
        onChange={(e) => onChange({ dob: e.target.value })}
      />

      <div className="space-y-2">
        <Field
          label={t(COPY.number)}
          hint={t(COPY.numberHint)}
          error={numberError}
          name="aadhaar-number"
          inputMode="numeric"
          autoComplete="off"
          maxLength={14}
          value={group(details.number)}
          onChange={(e) => onChange({ number: e.target.value.replace(/\D/g, "").slice(0, 12) })}
          trailing={
            <button
              type="button"
              onClick={() => onReveal(!revealed)}
              aria-pressed={revealed}
              className="inline-flex size-11 items-center justify-center rounded-ctl text-ink-mute transition-colors hover:text-ink"
            >
              {revealed ? (
                <EyeOff aria-hidden className="size-4" strokeWidth={1.8} />
              ) : (
                <Eye aria-hidden className="size-4" strokeWidth={1.8} />
              )}
              <span className="sr-only">{revealed ? t(COPY.hide) : t(COPY.reveal)}</span>
            </button>
          }
        />
        <Button
          tone="quiet"
          onClick={() => onChange({ number: specimenNumber(details.seed) })}
        >
          <Wand2 aria-hidden className="size-4" strokeWidth={1.8} />
          {t(COPY.specimen)}
        </Button>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="adhaar-gender" className="block text-sm font-medium text-ink">
          {t(COPY.gender)}
        </label>
        <select
          id="adhaar-gender"
          value={details.gender}
          onChange={(e) => onChange({ gender: e.target.value })}
          className="min-h-12 w-full rounded-ctl border border-line-strong bg-paper-raised px-3.5 text-md text-ink transition-colors duration-150 hover:border-ink-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <option value="">{t(COPY.genderUnset)}</option>
          <option value={t(COPY.female)}>{t(COPY.female)}</option>
          <option value={t(COPY.male)}>{t(COPY.male)}</option>
          <option value={t(COPY.other)}>{t(COPY.other)}</option>
        </select>
      </div>

      <Field
        label={t(COPY.city)}
        hint={t(COPY.cityHint)}
        name="city"
        value={details.city}
        autoComplete="off"
        onChange={(e) => onChange({ city: e.target.value })}
      />
    </section>
  );
}
