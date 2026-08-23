"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui";
import { PERSONAS } from "@/content/personas";
import { useLang } from "@/lib/i18n/context";
import { applyFix } from "@/lib/rules/apply";
import { preflight } from "@/lib/rules/engine";
import { SOURCES } from "@/lib/rules/sources";

/**
 * The credibility beat: this is not a mock-up of the engine, it is the engine.
 *
 * `preflight` is a pure function, so it runs here in the browser with no
 * network call, no model and no server. Marking the name correction as done
 * re-runs it and two blockers clear — the second one because the bank-name
 * check had been measuring against the same wrong value all along.
 *
 * The cascade is why we show the resolved rows struck through rather than
 * removing them. Watching a fix you did not make disappear is the point.
 */

const FIX = "R-NAME-AADHAAR";
const DEMO = PERSONAS[0];

const COPY = {
  label: { en: "The engine, running in this page", hi: "इंजन, इसी पेज में चलता हुआ" },
  heading: {
    en: "Nine rules. Each one names an owner and cites the circular it came from.",
    hi: "नौ नियम। हर एक बताता है कि यह किसका काम है, और किस परिपत्र से आया है।",
  },
  blockers: { en: "blockers", hi: "रुकावटें" },
  apply: {
    en: "I've corrected my name — re-check",
    hi: "मैंने अपना नाम ठीक कर लिया — दोबारा जाँचें",
  },
  reset: { en: "Start over", hi: "फिर से शुरू" },
  resolved: { en: "resolved", hi: "हल हो गया" },
  cascade: {
    en: "One ten-minute correction cleared two blockers. The bank-name check was never a separate problem — it had been comparing against the same wrong value.",
    hi: "दस मिनट के एक सुधार ने दो रुकावटें हटा दीं। बैंक-नाम की जाँच अलग दिक़्क़त थी ही नहीं — वह उसी ग़लत मान से मिलान कर रही थी।",
  },
  pure: {
    en: "No network call, no model, no server. preflight() is a pure function — the same record always produces the same verdict, which is what makes it auditable.",
    hi: "न कोई नेटवर्क कॉल, न मॉडल, न सर्वर। preflight() एक शुद्ध फ़ंक्शन है — वही रिकॉर्ड हमेशा वही नतीजा देता है, इसी से यह जाँचने-योग्य बनता है।",
  },
  minutes: { en: "min", hi: "मिनट" },
  cites: { en: "Cites", hi: "स्रोत" },
} as const;

export function EngineLive() {
  const { t, ui, lang } = useLang();
  const [applied, setApplied] = useState(false);

  const before = useMemo(() => preflight(DEMO.facts), []);
  const after = useMemo(() => preflight(applyFix(DEMO.facts, FIX)), []);

  const rows = before.findings.filter((f) => f.severity === "blocker");
  const stillOpen = new Set(
    after.findings.filter((f) => f.severity === "blocker").map((f) => f.ruleId),
  );
  const count = applied ? stillOpen.size : rows.length;

  return (
    <div>
      <p className="meta text-ink-faint">{t(COPY.label)}</p>
      <h2 className="display mt-4 max-w-3xl text-balance text-ink">
        {t(COPY.heading)}
      </h2>

      <div className="mt-8 overflow-hidden rounded-lg border border-line bg-paper-raised">
        <div className="flex items-baseline gap-3 border-b border-line px-5 py-4 sm:px-6">
          <span
            className={clsx(
              "tnum font-mono text-4xl leading-none transition-colors duration-300",
              count === rows.length ? "text-blocked-700" : "text-caution-700",
            )}
          >
            {count}
          </span>
          <span className="meta text-ink-mute">{t(COPY.blockers)}</span>
        </div>

        <ul>
          {rows.map((f) => {
            const done = applied && !stillOpen.has(f.ruleId);
            const source = SOURCES[f.sourceId];
            return (
              <li
                key={f.ruleId}
                className={clsx(
                  "border-b border-line-soft px-5 py-4 transition-colors duration-300 sm:px-6",
                  done && "bg-clear-50",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={clsx(
                      "mt-1.5 size-2 shrink-0 rounded-full transition-colors duration-300",
                      done ? "bg-clear-500" : "bg-blocked-500",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={clsx(
                        "text-md font-medium leading-snug transition-colors duration-300",
                        done
                          ? "text-clear-700 line-through decoration-clear-500/50"
                          : "text-ink",
                      )}
                    >
                      {t(f.title)}
                    </p>
                    <p className="meta mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-faint">
                      <span>{ui(`owner_${f.owner}` as const)}</span>
                      <span aria-hidden>·</span>
                      <span className="tnum">
                        {f.fix.minutes} {t(COPY.minutes)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{f.ruleId}</span>
                      {done ? (
                        <span className="text-clear-700">
                          ✓ {t(COPY.resolved)}
                        </span>
                      ) : null}
                    </p>
                    {source ? (
                      <p className="mt-1 line-clamp-1 text-xs text-ink-faint">
                        {t(COPY.cites)}: {source.title}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
          {applied ? (
            <Button tone="secondary" onClick={() => setApplied(false)}>
              <RotateCcw aria-hidden className="size-4" strokeWidth={1.8} />
              {t(COPY.reset)}
            </Button>
          ) : (
            <Button onClick={() => setApplied(true)}>
              <Check aria-hidden className="size-4" strokeWidth={2} />
              {t(COPY.apply)}
            </Button>
          )}
          <p
            aria-live="polite"
            className={clsx(
              "min-w-0 flex-1 text-sm leading-relaxed",
              applied ? "text-clear-700" : "text-ink-faint",
            )}
          >
            {applied
              ? t(COPY.cascade)
              : lang === "hi"
                ? "इसे दबाकर इंजन को दोबारा चलते देखें।"
                : "Press it to watch the engine re-run."}
          </p>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-mute">
        {t(COPY.pure)}
      </p>
    </div>
  );
}
