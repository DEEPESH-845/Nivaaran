"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useLang } from "@/lib/i18n/context";

export const STAGES = [
  { id: "situation", en: "Your situation", hi: "आपकी स्थिति" },
  { id: "records", en: "Your records", hi: "आपके रिकॉर्ड" },
  { id: "preflight", en: "The check", hi: "जाँच" },
  { id: "fix", en: "Fix what's broken", hi: "सुधार" },
  { id: "file", en: "File once", hi: "दावा भरें" },
  { id: "track", en: "Track", hi: "स्थिति" },
] as const;

export type StageId = (typeof STAGES)[number]["id"];

/**
 * The persistent "where am I" indicator.
 *
 * Government portals expose tasks. This exposes progress: what is done, where
 * you are, and what is still ahead — visible on every screen of the journey.
 */
export function JourneyRail({ current }: { current: StageId }) {
  const { lang } = useLang();
  const index = STAGES.findIndex((s) => s.id === current);

  return (
    <nav
      aria-label={lang === "hi" ? "आपकी प्रगति" : "Your progress"}
      className="border-b border-line bg-paper-sunk print:hidden"
    >
      <div className="mx-auto max-w-3xl px-4 py-3">
        <p className="mb-2 text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">
          {lang === "hi" ? "चरण" : "Step"} {index + 1} {lang === "hi" ? "/" : "of"}{" "}
          {STAGES.length} · {STAGES[index][lang]}
        </p>
        <ol className="flex items-center gap-1.5">
          {STAGES.map((s, i) => {
            const done = i < index;
            const now = i === index;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-1.5">
                <span
                  aria-hidden
                  className={clsx(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    done && "bg-indigo-400",
                    now && "bg-indigo-600",
                    !done && !now && "bg-line",
                  )}
                />
                <span className="sr-only">
                  {s[lang]}
                  {done ? (lang === "hi" ? " — पूरा" : " — done") : null}
                  {now ? (lang === "hi" ? " — अभी यहाँ" : " — you are here") : null}
                </span>
                {done ? (
                  <Check aria-hidden className="size-3 shrink-0 text-indigo-400" strokeWidth={2.5} />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
