"use client";

import { useRef, useState } from "react";
import { FileUp, RotateCcw } from "lucide-react";
import { Badge, Button, Choice, SectionLabel, type Tone } from "@/components/ui";
import { readSampleDocument } from "@/lib/documents/sample";
import { useLang } from "@/lib/i18n/context";
import type { Bi, Confidence } from "@/lib/rules/types";

/**
 * One document, acquired and read.
 *
 * Everything privacy-critical lives here and nowhere else: the image is
 * downscaled and re-encoded in the browser before it is sent — which drops
 * EXIF, GPS included — it is held for the duration of one call, and only the
 * four scrubbed fields ever leave this component. Nothing is written to
 * storage at any point.
 *
 * The slot reads; it never decides. What the values mean is `reconcile`'s job.
 *
 * Two things it must never do, both of which it once did. It must not leave a
 * reader typing in values that are printed on the page they just chose — with
 * no `OPENAI_API_KEY` every reading failed and the fallback was the keyboard,
 * so a specimen we ship is now read directly (`lib/documents/sample.ts`) when
 * the model cannot be. And a slow reading must not land on top of a newer one:
 * every call carries a sequence number and a stale answer is dropped.
 */

const MAX_EDGE = 1600;

export type SlotKind = "identity" | "bank";
export type Quality = "clear" | "blurred" | "cropped" | "glare" | "not_a_document";

export interface SlotReading {
  fields: {
    name: string | null;
    dob: string | null;
    ifsc: string | null;
    accountLast4: string | null;
  };
  confidence: Confidence;
  quality: Quality;
  /** Read by the model, or read straight off a specimen we ship. */
  source: ReadSource;
}

const SAMPLES: Record<SlotKind, { id: string; src: string; label: Bi; hint: Bi }[]> = {
  identity: [
    {
      id: "identity-rajesh",
      src: "/samples/identity-rajesh.svg",
      label: { en: "Identity record — Rajesh", hi: "पहचान पत्र — राजेश" },
      hint: { en: "Clean scan, name and date of birth", hi: "साफ़ स्कैन, नाम और जन्मतिथि" },
    },
    {
      id: "identity-sunita",
      src: "/samples/identity-sunita.svg",
      label: { en: "Identity record — Sunita", hi: "पहचान पत्र — सुनीता" },
      hint: { en: "Photographed at an angle, with glare", hi: "तिरछी तस्वीर, चमक के साथ" },
    },
  ],
  bank: [
    {
      id: "passbook-rajesh",
      src: "/samples/passbook-rajesh.svg",
      label: { en: "Bank passbook — Rajesh", hi: "बैंक पासबुक — राजेश" },
      hint: { en: "IFSC and the last four digits", hi: "IFSC और खाते के आख़िरी चार अंक" },
    },
  ],
};

const COPY = {
  identityTitle: { en: "An identity document", hi: "कोई पहचान दस्तावेज़" },
  identityBody: {
    en: "Carries the name and date of birth EPFO checks against.",
    hi: "इसमें वही नाम और जन्मतिथि होती है जिनसे EPFO मिलान करता है।",
  },
  bankTitle: { en: "A bank passbook or cheque", hi: "बैंक पासबुक या चेक" },
  bankBody: {
    en: "Carries the account name, the IFSC and the last four digits.",
    hi: "इसमें खाते का नाम, IFSC और आख़िरी चार अंक होते हैं।",
  },
  samples: { en: "Samples", hi: "नमूने" },
  or: { en: "or", hi: "या" },
  choose: { en: "Use my own photo", hi: "अपनी तस्वीर इस्तेमाल करें" },
  reading: { en: "Reading…", hi: "पढ़ा जा रहा है…" },
  previewAlt: {
    en: "The document being read, downscaled in your browser",
    hi: "पढ़ा जा रहा दस्तावेज़, आपके ब्राउज़र में छोटा किया हुआ",
  },
  again: { en: "Read another", hi: "दूसरा पढ़ें" },
  preparing: { en: "Preparing the image…", hi: "तस्वीर तैयार की जा रही है…" },
  fromSpecimen: { en: "Read from the specimen", hi: "नमूने से पढ़ा गया" },
  fromSpecimenNote: {
    en: "The document reader is not switched on, so we read this sample directly instead. Your own photograph would need the reader.",
    hi: "दस्तावेज़ पढ़ने वाली सुविधा चालू नहीं है, इसलिए यह नमूना सीधे पढ़ा गया। आपकी अपनी तस्वीर के लिए वह सुविधा ज़रूरी है।",
  },
  unavailable: {
    en: "Reading documents isn't available right now. You can still type the values in below.",
    hi: "अभी दस्तावेज़ पढ़ना उपलब्ध नहीं है। आप नीचे मान ख़ुद भी भर सकते हैं।",
  },
  advice_clear: { en: "Read clearly", hi: "साफ़ पढ़ा गया" },
  advice_check: { en: "Check these values", hi: "ये मान जाँच लें" },
  advice_checkAll: { en: "Check every value", hi: "हर मान जाँच लें" },
  q_blurred: {
    en: "This photo is blurred — check the values before using them.",
    hi: "यह तस्वीर धुंधली है — इस्तेमाल से पहले मान जाँच लें।",
  },
  q_cropped: {
    en: "Part of this document is cut off — check the values before using them.",
    hi: "दस्तावेज़ का कुछ हिस्सा कट गया है — इस्तेमाल से पहले मान जाँच लें।",
  },
  q_glare: {
    en: "There is glare on this photo — check the values before using them.",
    hi: "इस तस्वीर पर चमक है — इस्तेमाल से पहले मान जाँच लें।",
  },
  q_not_a_document: {
    en: "This does not look like a document. Check every value before using it.",
    hi: "यह दस्तावेज़ नहीं लगता। हर मान जाँचकर ही इस्तेमाल करें।",
  },
} as const satisfies Record<string, Bi>;

type Advice = "clear" | "check" | "checkAll";

const ADVICE_TONE: Record<Advice, Tone> = {
  clear: "clear",
  check: "caution",
  checkAll: "blocked",
};

/**
 * What to do about a reading, not how sure a model was about it.
 *
 * "High confidence" answers a question nobody asked — confident about what,
 * and what should I do differently if it were medium? This answers the only
 * question the reader has, and takes the photograph's own faults into account
 * rather than leaving them to a separate sentence.
 */
function adviceFor(confidence: Confidence, quality: Quality): Advice {
  if (confidence === "low" || quality === "not_a_document") return "checkAll";
  if (confidence === "high" && quality === "clear") return "clear";
  return "check";
}

/**
 * Downscale and re-encode before anything is sent. Cheaper, faster, and the
 * re-encode strips EXIF along with it.
 */
async function downscale(src: string): Promise<string> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  await img.decode();

  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (!longest) throw new Error("image has no intrinsic size");
  const scale = Math.min(1, MAX_EDGE / longest);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.fillStyle = "#ffffff"; // JPEG has no alpha; without this, transparency reads black
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Where a reading came from. The screen says which; they are not the same. */
export type ReadSource = "model" | "specimen";

type State =
  | { kind: "idle" }
  | { kind: "reading"; stage: "preparing" | "reading" }
  | { kind: "read"; confidence: Confidence; quality: Quality; source: ReadSource }
  | { kind: "unavailable" };

export function DocumentSlot({
  kind,
  onRead,
}: {
  kind: SlotKind;
  /** Fires with the scrubbed fields. The image never leaves this component. */
  onRead: (reading: SlotReading | null) => void;
}) {
  const { t } = useLang();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const latest = useRef(0);
  const inputId = `document-file-${kind}`;

  async function read(src: string, sampleId: string | null) {
    // Every reading carries a sequence number. Choose a second document while
    // the first is still in flight and the first answer is dropped on arrival
    // instead of overwriting the newer one.
    const mine = ++latest.current;
    const current = () => latest.current === mine;

    setChosen(sampleId);
    setState({ kind: "reading", stage: "preparing" });
    setPreview(null);

    /** The specimens are ours and their values are text, not pixels. */
    const fromSpecimen = async (): Promise<boolean> => {
      const fields = sampleId ? await readSampleDocument(src) : null;
      if (!fields || !current()) return false;
      setState({ kind: "read", confidence: "high", quality: "clear", source: "specimen" });
      onRead({ fields, confidence: "high", quality: "clear", source: "specimen" });
      return true;
    };

    try {
      const image = await downscale(src);
      if (!current()) return;
      setPreview(image);
      setState({ kind: "reading", stage: "reading" });

      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      if (!current()) return;

      if (!data?.ok) {
        // No key, no budget, or a refusal. A sample can still be read; a
        // reader's own photograph genuinely cannot, and says so.
        if (await fromSpecimen()) return;
        if (!current()) return;
        setState({ kind: "unavailable" });
        onRead(null);
        return;
      }
      setState({
        kind: "read",
        confidence: data.confidence,
        quality: data.quality,
        source: "model",
      });
      onRead({
        fields: {
          name: data.fields.name ?? null,
          dob: data.fields.dob ?? null,
          ifsc: data.fields.ifsc ?? null,
          accountLast4: data.fields.accountLast4 ?? null,
        },
        confidence: data.confidence,
        quality: data.quality,
        source: "model",
      });
    } catch {
      if (await fromSpecimen()) return;
      if (!current()) return;
      setState({ kind: "unavailable" });
      onRead(null);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    // The object URL is the only reference to the original bytes; revoking it
    // after the downscale leaves nothing behind but the re-encoded copy.
    void read(url, null).finally(() => URL.revokeObjectURL(url));
  }

  function reset() {
    latest.current++; // an answer still in flight belongs to a document nobody is looking at
    setState({ kind: "idle" });
    setPreview(null);
    setChosen(null);
    if (fileRef.current) fileRef.current.value = "";
    onRead(null);
  }

  const quality = state.kind === "read" ? state.quality : null;
  const qualityNote = quality && quality !== "clear" ? COPY[`q_${quality}` as const] : null;
  const advice = state.kind === "read" ? adviceFor(state.confidence, state.quality) : null;

  return (
    <div className="space-y-3">
      <div>
        <SectionLabel>
          {kind === "identity" ? t(COPY.identityTitle) : t(COPY.bankTitle)}
        </SectionLabel>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {kind === "identity" ? t(COPY.identityBody) : t(COPY.bankBody)}
        </p>
      </div>

      {state.kind === "read" || state.kind === "reading" ? (
        // A fixed box for the preview, whatever the photograph's shape. A
        // late-arriving image that sets its own height pushes the comparison
        // below it down the page, which is the one movement this screen
        // cannot afford — the reader is being sent there.
        <div className="flex min-h-20 items-start gap-3">
          {preview ? (
            // Deliberately not next/image: an in-memory data URL that lives for
            // seconds and must never reach the image optimiser.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={t(COPY.previewAlt)}
              className="h-20 w-28 shrink-0 rounded-ctl border border-line object-contain"
            />
          ) : (
            <div aria-hidden className="h-20 w-28 shrink-0 rounded-ctl bg-paper-sunk" />
          )}
          <div className="min-w-0 space-y-2">
            {state.kind === "reading" ? (
              // Two stages, because there are two: the image is resized here
              // before anything is read. A spinner that never changes says
              // nothing about whether it is still working.
              <p className="text-sm text-ink-mute">
                {state.stage === "preparing" ? t(COPY.preparing) : t(COPY.reading)}
              </p>
            ) : (
              <>
                <Badge tone={state.source === "specimen" ? "neutral" : ADVICE_TONE[advice!]}>
                  {state.source === "specimen"
                    ? t(COPY.fromSpecimen)
                    : t(COPY[`advice_${advice!}` as const])}
                </Badge>
                {state.source === "specimen" ? (
                  <p className="text-sm leading-relaxed text-ink-mute">
                    {t(COPY.fromSpecimenNote)}
                  </p>
                ) : qualityNote ? (
                  <p className="text-sm leading-relaxed text-caution-700">{t(qualityNote)}</p>
                ) : null}
                <Button tone="quiet" onClick={reset} className="whitespace-nowrap">
                  <RotateCcw aria-hidden className="size-3.5" strokeWidth={1.8} />
                  {t(COPY.again)}
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          <fieldset className="space-y-2.5">
            <legend className="mb-2 text-2xs font-semibold uppercase tracking-[0.11em] text-ink-mute">
              {t(COPY.samples)}
            </legend>
            {SAMPLES[kind].map((s) => (
              <Choice
                key={s.id}
                selected={chosen === s.id}
                label={t(s.label)}
                hint={t(s.hint)}
                onClick={() => void read(s.src, s.id)}
              />
            ))}
          </fieldset>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-mute">{t(COPY.or)}</span>
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={onFile}
              className="peer sr-only"
            />
            <label
              htmlFor={inputId}
              className={
                "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-ctl border " +
                "border-line-strong bg-paper-raised px-4 text-base font-medium text-ink " +
                "hover:border-ink-mute hover:bg-paper-sunk " +
                "peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper"
              }
            >
              <FileUp aria-hidden className="size-4" strokeWidth={1.8} />
              {t(COPY.choose)}
            </label>
          </div>
        </>
      )}

      <p aria-live="polite" className="sr-only">
        {state.kind === "reading"
          ? state.stage === "preparing"
            ? t(COPY.preparing)
            : t(COPY.reading)
          : state.kind === "read"
            ? state.source === "specimen"
              ? t(COPY.fromSpecimen)
              : t(COPY[`advice_${adviceFor(state.confidence, state.quality)}` as const])
            : state.kind === "unavailable"
              ? t(COPY.unavailable)
              : ""}
      </p>

      {state.kind === "unavailable" ? (
        <p className="text-sm leading-relaxed text-ink-mute">{t(COPY.unavailable)}</p>
      ) : null}
    </div>
  );
}
