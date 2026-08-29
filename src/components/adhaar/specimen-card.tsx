"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { dotMatrix, groupAadhaar, initials, maskAadhaar, seededPalette } from "@/lib/adhaar/specimen";
import { formatDate } from "@/lib/date";
import { useLang } from "@/lib/i18n/context";
import type { Bi } from "@/lib/rules/types";

/**
 * The specimen card, both faces.
 *
 * Pure presentation: it takes details and renders them, and every bit of
 * motion belongs to `card-stage.tsx`. That split is what lets the card be
 * rendered in a fixed pose under reduced motion, and what keeps the tilt
 * maths out of a file that is otherwise all layout.
 *
 * It is a **specimen**, deliberately and visibly. No national emblem, no UIDAI
 * artwork, no Government of India lockup, Nivaaran's own mark, and a
 * SPECIMEN diagonal painted above every other layer so it survives a crop.
 * The number is masked unless the reader explicitly reveals it; the reverse
 * face's matrix is a texture that encodes nothing. See AGENTS.md rule 13.
 *
 * The card keeps the `night` palette in both themes — it is an object, not a
 * surface, and an object does not repaint itself when the page does.
 */

export interface CardDetails {
  name: string;
  dob: string;
  number: string;
  gender: string;
  city: string;
  /** Stable per persona, so the portrait and matrix never reshuffle. */
  seed: string;
}

const COPY = {
  specimen: { en: "Specimen", hi: "नमूना" },
  notGov: {
    en: "Not a government document",
    hi: "यह सरकारी दस्तावेज़ नहीं है",
  },
  name: { en: "Name", hi: "नाम" },
  dob: { en: "Date of birth", hi: "जन्मतिथि" },
  gender: { en: "Gender", hi: "लिंग" },
  number: { en: "Aadhaar number", hi: "आधार संख्या" },
  unset: { en: "—", hi: "—" },
  back: { en: "Reverse", hi: "पिछला भाग" },
  address: { en: "Address", hi: "पता" },
  matrixNote: {
    en: "This pattern is decorative. It encodes nothing and scans as nothing.",
    hi: "यह पैटर्न सिर्फ़ सजावट है। इसमें कुछ दर्ज नहीं है और यह स्कैन नहीं होता।",
  },
  issuedBy: { en: "Rendered by Nivaaran", hi: "निवारण द्वारा बनाया गया" },
  neverStored: {
    en: "Nothing on this card is stored or sent anywhere.",
    hi: "इस कार्ड की कोई जानकारी कहीं सहेजी या भेजी नहीं जाती।",
  },
} as const satisfies Record<string, Bi>;

/**
 * The stage's perspective, so a surface layer can cancel the enlargement that
 * moving it towards the viewer would otherwise cause. Without this, anything
 * lifted off the card body spills past its rounded silhouette — correct for a
 * floating plane, wrong for something printed on the card.
 */
const PERSPECTIVE = 1200;
const flush = (z: number) => `translateZ(${z}px) scale(${(PERSPECTIVE - z) / PERSPECTIVE})`;

/** Three darker clones behind a face, so a tilt reveals a real edge rather
 *  than a shape with no thickness. */
function Edges() {
  return (
    <>
      {[1, 2, 3].map((d) => (
        <div
          key={d}
          aria-hidden
          className="absolute inset-0 rounded-lg bg-night"
          style={{ transform: `translateZ(-${d}px)`, filter: `brightness(${1 - d * 0.14})` }}
        />
      ))}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.5rem] font-semibold uppercase tracking-[0.14em] text-night-faint">
        {label}
      </p>
      <p className="truncate text-[0.8125rem] font-medium leading-tight text-night-ink">{value}</p>
    </div>
  );
}

export function SpecimenCard({
  details,
  revealed,
  face,
}: {
  details: CardDetails;
  revealed: boolean;
  face: "front" | "back";
}) {
  const { t } = useLang();
  // Both are pure functions of the seed, and the stage re-renders this on
  // pointer movement — 144 matrix cells per frame is not free.
  const palette = useMemo(() => seededPalette(details.seed), [details.seed]);
  const matrix = useMemo(() => dotMatrix(details.seed, 12), [details.seed]);
  const shown = revealed ? groupAadhaar(details.number) : maskAadhaar(details.number);

  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: "1.586", transformStyle: "preserve-3d" }}
    >
      {/* ------------------------------------------------------------ front */}
      <div
        aria-hidden={face === "back"}
        className="absolute inset-0 rounded-lg border border-night-line bg-night shadow-card-object"
        style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
      >
        <Edges />

        {/* z0 — the body. A quiet ground so every layer above it reads. */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-lg bg-linear-to-br from-night-rise to-night"
          style={{ transform: "translateZ(0px)" }}
        />

        {/* z12 — portrait and mark */}
        <div
          className="absolute inset-0 flex items-start gap-3 p-4 sm:gap-4 sm:p-5"
          style={{ transform: "translateZ(14px)", transformStyle: "preserve-3d" }}
        >
          <div
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-[0.5rem] font-display text-2xl text-night-ink sm:size-20 sm:text-3xl"
            style={{ background: `linear-gradient(145deg, ${palette.from}, ${palette.to})` }}
          >
            {initials(details.name)}
          </div>
          <div className="ml-auto text-right">
            <p className="text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-signal">
              {t(COPY.issuedBy)}
            </p>
            <p className="mt-0.5 text-[0.5rem] uppercase tracking-[0.14em] text-night-faint">
              {t(COPY.notGov)}
            </p>
          </div>
        </div>

        {/* z24 — the text the reader came for */}
        <div
          className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5"
          style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}
        >
          <p className="truncate font-display text-xl leading-tight text-night-ink sm:text-2xl">
            <span data-testid="card-name">{details.name || t(COPY.unset)}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-1.5">
            <Row label={t(COPY.dob)} value={formatDate(details.dob) || t(COPY.unset)} />
            {details.gender ? <Row label={t(COPY.gender)} value={details.gender} /> : null}
          </div>
          <p className="mt-2.5 text-[0.5rem] font-semibold uppercase tracking-[0.14em] text-night-faint">
            {t(COPY.number)}
          </p>
          <p
            data-testid="card-number"
            className="tnum font-mono text-lg leading-tight tracking-[0.14em] text-night-ink sm:text-xl"
          >
            {shown}
          </p>
        </div>

        {/* z40 — holographic foil, fixed. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            // No blend mode: in a real preserve-3d scene each layer composites
            // on its own, so `overlay` had the page behind it rather than the
            // card and painted the whole face black.
            //
            // And no filter. The hue used to rotate with the tilt, which meant
            // a full-card `filter` repaint on every pointer frame — the one
            // thing on this page that was not compositable. The sheen reads the
            // same at rest and the tilt now costs a transform and nothing else.
            transform: flush(6),
            opacity: 0.22,
            background:
              "conic-gradient(from 210deg at 78% 26%, #6ee7ff, #a78bfa, #f0abfc, #fde68a, #6ee7ff)",
            maskImage: "radial-gradient(95% 75% at 88% 16%, #000 0%, transparent 68%)",
            WebkitMaskImage: "radial-gradient(95% 75% at 88% 16%, #000 0%, transparent 68%)",
          }}
        />

        {/* z48 — above everything, so a crop cannot remove it */}
        <p
          className="pointer-events-none absolute right-4 top-[32%] whitespace-nowrap font-display text-2xl uppercase tracking-[0.26em] text-night-ink/45 sm:right-5 sm:text-3xl"
          style={{ transform: "translateZ(26px) rotate(-14deg)", transformOrigin: "right center" }}
        >
          {t(COPY.specimen)}
        </p>

        {/* The light. Not a palette colour — a highlight, positioned by the
            stage through --spec-x / --spec-y. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg"
          style={{
            transform: flush(32),
            background:
              "radial-gradient(24rem circle at var(--spec-x, 50%) var(--spec-y, 50%), rgba(255,255,255,0.20), rgba(255,255,255,0) 55%)",
          }}
        />
      </div>

      {/* ------------------------------------------------------------- back */}
      <div
        aria-hidden={face === "front"}
        className="absolute inset-0 rounded-lg border border-night-line bg-night p-4 sm:p-5 shadow-card-object"
        style={{
          transform: "rotateY(180deg)",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
        }}
      >
        <Edges />
        <div className="relative flex h-full flex-col" style={{ transform: "translateZ(20px)" }}>
          <p className="text-[0.5rem] font-semibold uppercase tracking-[0.2em] text-signal">
            {t(COPY.specimen)} · {t(COPY.back)}
          </p>

          <div className="mt-3 flex min-h-0 flex-1 gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              {details.city ? <Row label={t(COPY.address)} value={details.city} /> : null}
              <Row label={t(COPY.name)} value={details.name || t(COPY.unset)} />
              <p className="pt-1 text-[0.5625rem] leading-relaxed text-night-faint">
                {t(COPY.matrixNote)}
              </p>
            </div>
            <div
              aria-hidden
              className="grid aspect-square h-full shrink-0 grid-cols-12 gap-px self-start rounded-[0.375rem] bg-night-rise p-1.5"
            >
              {matrix.map((on, i) => (
                <span
                  key={i}
                  className={clsx("rounded-[1px]", on ? "bg-night-ink/80" : "bg-transparent")}
                />
              ))}
            </div>
          </div>

          <p className="mt-2 border-t border-night-line pt-2 text-[0.5625rem] leading-relaxed text-night-soft">
            {t(COPY.neverStored)}
          </p>
        </div>
      </div>
    </div>
  );
}
