"use client";

import clsx from "clsx";
import { compareNames, type TokenState } from "@/lib/match/name";
import { useLang } from "@/lib/i18n/context";

/**
 * The signature scene: two rows of the same name, read by a machine.
 *
 * This is not an illustration of the product — it *is* the product's matcher,
 * `compareNames`, rendered large and given a reading head. The one token that
 * diverges is the entire reason 1.74 crore claims failed last year.
 *
 * `resolved` bookends the page: the same record after a ten-minute correction,
 * every token clearing. Same primitive, opposite outcome.
 */

const FILL: Record<TokenState, "clear" | "blocked"> = {
  same: "clear",
  differs: "blocked",
  initial: "blocked",
  missing: "blocked",
  extra: "blocked",
};

const COPY = {
  epfo: { en: "EPFO record", hi: "EPFO रिकॉर्ड" },
  aadhaar: { en: "Your Aadhaar", hi: "आपका आधार" },
  reading: {
    en: "Auto-settlement · reading record",
    hi: "ऑटो-सेटलमेंट · रिकॉर्ड पढ़ा जा रहा है",
  },
  rejected: { en: "Name not as per records.", hi: "Name not as per records." },
  cleared: { en: "Every check passes.", hi: "हर जाँच पास।" },
  day20: { en: "Day 20", hi: "दिन 20" },
  now: { en: "Pre-filing check · corrected", hi: "भरने से पहले की जाँच · सुधार के बाद" },
  tenMin: { en: "10 min", hi: "10 मिनट" },
} as const;

function Row({
  label,
  tokens,
}: {
  label: string;
  tokens: { text: string; state: TokenState }[];
}) {
  return (
    <div className="grid grid-cols-[1fr] items-baseline gap-x-4 gap-y-1 sm:grid-cols-[7rem_1fr]">
      <span className="meta text-ink-mute">{label}</span>
      <span className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {tokens.map((tk, i) => (
          <span
            key={`${tk.text}-${i}`}
            className="tok text-lg text-ink sm:text-xl"
            style={{ "--i": i } as React.CSSProperties}
          >
            <span
              aria-hidden
              className={clsx("tok-fill", `tok-fill--${FILL[tk.state]}`)}
            />
            <span className="tok-text">{tk.text}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

export function MismatchScan({ resolved = false }: { resolved?: boolean }) {
  const { t } = useLang();

  const left = resolved ? "Rajesh Kumar Sharma" : "RAJESH K SHARMA";
  const verdict = compareNames(left, "Rajesh Kumar Sharma");

  return (
    <figure
      className={clsx(
        "scan relative rounded-lg border bg-paper-raised p-5 sm:p-7",
        resolved ? "border-clear-200" : "border-line",
      )}
    >
      <figcaption className="meta mb-5 flex items-center gap-2 text-ink-faint">
        <span
          aria-hidden
          className={clsx(
            "size-1.5 rounded-full",
            resolved ? "bg-clear-500" : "bg-blocked-500",
          )}
        />
        {t(resolved ? COPY.now : COPY.reading)}
      </figcaption>

      <div className="scan-track relative space-y-4">
        <span aria-hidden className="scan-line" />
        <Row label={t(COPY.epfo)} tokens={verdict.left} />
        <div className="h-px bg-line-soft" />
        <Row label={t(COPY.aadhaar)} tokens={verdict.right} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line-soft pt-5">
        <p
          className={clsx(
            "scan-verdict font-mono text-md sm:text-lg",
            resolved ? "text-clear-700" : "text-blocked-700",
          )}
        >
          {resolved ? t(COPY.cleared) : `"${t(COPY.rejected)}"`}
        </p>
        <span
          className={clsx(
            "scan-stamp meta -rotate-2 rounded border px-2 py-1",
            resolved
              ? "border-clear-200 bg-clear-50 text-clear-700"
              : "border-blocked-200 bg-blocked-50 text-blocked-700",
          )}
        >
          {t(resolved ? COPY.tenMin : COPY.day20)}
        </span>
      </div>
    </figure>
  );
}
