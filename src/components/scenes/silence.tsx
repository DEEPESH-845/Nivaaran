"use client";

import clsx from "clsx";
import { useRef } from "react";

import { useLang } from "@/lib/i18n/context";
import { useSceneProgress } from "@/components/motion/reveal";

/**
 * The twenty days.
 *
 * The scene is mostly empty on purpose — the emptiness is the finding. Nothing
 * arrives, day after day, and then five words arrive. Scrubbed by scroll so the
 * reader spends real time in the silence rather than reading a claim about it.
 */

const DAYS = 20;

const COPY = {
  label: {
    en: "Between filing and finding out",
    hi: "दावा भरने और पता चलने के बीच",
  },
  day: { en: "Day", hi: "दिन" },
  nothing: { en: "no update", hi: "कोई ख़बर नहीं" },
  verdict: { en: "Name not as per records.", hi: "Name not as per records." },
  heading: {
    en: "Twenty days of nothing, then five words you cannot act on.",
    hi: "बीस दिन ख़ामोशी, फिर पाँच ऐसे शब्द जिन पर आप कुछ नहीं कर सकते।",
  },
  toKnow: { en: "20 days · to be told", hi: "20 दिन · पता चलने में" },
  toFix: { en: "10 minutes · to fix it", hi: "10 मिनट · ठीक करने में" },
  scale: {
    en: "Both bars are to scale. Ten minutes would be a third of one pixel — we drew it at one pixel so you could see it at all.",
    hi: "दोनों पट्टियाँ एक ही पैमाने पर हैं। दस मिनट एक पिक्सेल का एक-तिहाई होता — दिखाई दे सके इसलिए इसे एक पिक्सेल पर बनाया है।",
  },
} as const;

export function SilenceTrack() {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const step = useSceneProgress(ref, { steps: DAYS });
  const told = step >= DAYS;

  return (
    <div ref={ref}>
      <p className="meta text-ink-faint">{t(COPY.label)}</p>

      <div className="mt-6 flex items-baseline gap-3">
        <span className="meta text-ink-mute">{t(COPY.day)}</span>
        <span className="tnum font-mono text-3xl leading-none text-ink">
          {String(step).padStart(2, "0")}
        </span>
        <span
          className={clsx(
            "meta transition-colors",
            told ? "text-blocked-700" : "text-ink-faint",
          )}
        >
          {told ? `"${t(COPY.verdict)}"` : `— ${t(COPY.nothing)} —`}
        </span>
      </div>

      {/* The track. --p is written on the scene root and inherits down here. */}
      <div className="@container relative mt-6 h-12">
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-line-strong" />
        <ol className="absolute inset-x-0 top-0 flex justify-between">
          {Array.from({ length: DAYS + 1 }, (_, d) => (
            <li
              key={d}
              className={clsx(
                "w-px transition-colors duration-150",
                d % 5 === 0 ? "h-7" : "h-3.5",
                d <= step ? "bg-ink-faint" : "bg-line",
              )}
            >
              <span className="sr-only">{`${t(COPY.day)} ${d}`}</span>
            </li>
          ))}
        </ol>
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5 bg-blocked-500"
          style={{ transform: "translateX(calc(var(--p, 0) * 100cqw))" }}
        />
      </div>

      <h2 className="display mt-10 max-w-2xl text-balance text-ink">
        {t(COPY.heading)}
      </h2>

      {/* The ratio, drawn honestly. */}
      <div className="mt-10 space-y-4">
        <div>
          <p className="meta mb-2 text-blocked-700">{t(COPY.toKnow)}</p>
          <div className="h-3 w-full rounded-[2px] bg-blocked-500" />
        </div>
        <div>
          <p className="meta mb-2 text-clear-700">{t(COPY.toFix)}</p>
          <div className="h-3 w-px rounded-[2px] bg-clear-500" />
        </div>
        <p className="max-w-lg text-sm leading-relaxed text-ink-mute">
          {t(COPY.scale)}
        </p>
      </div>
    </div>
  );
}
