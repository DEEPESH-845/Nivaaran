"use client";

import { Clock, ExternalLink, MessageSquare, User } from "lucide-react";
import { ActionFooter, Badge, Button, Card, Disclosure, SectionLabel } from "@/components/ui";
import { SourceChip } from "@/components/finding-card";
import type { LeaverReview } from "@/lib/rules/roster";
import type { Finding, Fix } from "@/lib/rules/types";
import { useLang } from "@/lib/i18n/context";

/**
 * One former employee, as their old HR department sees them.
 *
 * Two deliberate voice choices:
 *
 *   - For work the employer owns, the row shows `employerFix.summary`, not the
 *     finding title. "Your date of exit has not been recorded" is addressed to
 *     the member; an HR reader would take "your" to mean their own.
 *   - For work the member owns, it shows the citizen-voiced title unchanged,
 *     because that is precisely the message HR has to pass on.
 */

/** Findings sharing a fixKey are one action: one panel, one button, billed once. */
interface Action {
  key: string;
  fix: Fix;
  findings: Finding[];
}

function actionsFor(findings: Finding[]): Action[] {
  const byKey = new Map<string, Action>();
  for (const f of findings) {
    const fix = f.employerFix;
    if (!fix) continue;
    const key = fix.fixKey ?? f.ruleId;
    const existing = byKey.get(key);
    if (existing) existing.findings.push(f);
    else byKey.set(key, { key, fix, findings: [f] });
  }
  return [...byKey.values()];
}

export function LeaverRow({
  review,
  onFixed,
}: {
  review: LeaverReview;
  /** Marks every rule the action covers as done, and re-runs the check. */
  onFixed?: (ruleIds: string[]) => void;
}) {
  const { lang, t, ui } = useLang();
  const { leaver, yours, theirs, minutes, daysWaiting } = review;
  const actions = actionsFor(yours);
  const isYours = yours.length > 0;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 className="text-md font-semibold tracking-[-0.01em] text-ink">{leaver.name}</h3>
          <p className="text-sm text-ink-mute">
            {t(leaver.role)} · <span className="font-mono text-xs">{leaver.uan}</span>
          </p>
        </div>
        <p className="tnum shrink-0 text-sm text-ink-mute">
          {lang === "hi"
            ? `${daysWaiting} दिन से इंतज़ार`
            : `waiting ${daysWaiting} days`}
        </p>
      </div>

      {isYours ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blocked">
              <User aria-hidden className="size-3" strokeWidth={2} />
              {lang === "hi" ? "आपके ज़िम्मे" : "Yours to fix"}
            </Badge>
            <Badge tone="neutral">
              <Clock aria-hidden className="size-3" strokeWidth={2} />
              {minutes} {ui("minutes")}
            </Badge>
          </div>

          {actions.map((action) => (
            <div key={action.key} className="rounded-card border border-line bg-paper-sunk p-4">
              <p className="text-sm font-medium leading-relaxed text-ink">
                {t(action.fix.summary)}
              </p>

              <Disclosure
                summary={lang === "hi" ? "क्या करना है" : "What to do"}
                className="mt-1"
              >
                <div className="space-y-3">
                  <ol className="space-y-2.5">
                    {action.fix.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                        <span className="tnum shrink-0 font-mono text-xs text-ink-faint">
                          {i + 1}
                        </span>
                        {t(s)}
                      </li>
                    ))}
                  </ol>

                  {action.fix.waitDays ? (
                    <p className="text-xs text-ink-mute">
                      {lang === "hi"
                        ? `इसके बाद EPFO में लगभग ${action.fix.waitDays} दिन लगते हैं।`
                        : `Then about ${action.fix.waitDays} days at EPFO before it takes effect.`}
                    </p>
                  ) : null}

                  {action.fix.caveat ? (
                    <p className="rounded-ctl border border-caution-100 bg-caution-50 p-3 text-xs leading-relaxed text-caution-700">
                      {t(action.fix.caveat)}
                    </p>
                  ) : null}

                  {action.fix.officialUrl ? (
                    <a
                      href={action.fix.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {action.fix.officialLabel
                        ? t(action.fix.officialLabel)
                        : lang === "hi"
                          ? "आधिकारिक पृष्ठ"
                          : "Official page"}
                      <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.8} />
                    </a>
                  ) : null}

                  {onFixed ? (
                    <ActionFooter
                      className="border-t border-line pt-3"
                      action={
                        <Button
                          tone="secondary"
                          onClick={() => onFixed(action.findings.map((f) => f.ruleId))}
                        >
                          {lang === "hi" ? "यह हो गया — दोबारा जाँचें" : "I've filed this — re-check"}
                        </Button>
                      }
                    >
                      <p className="text-2xs leading-relaxed text-ink-faint">
                        {lang === "hi"
                          ? "प्रदर्शन के लिए: यह मान लेता है कि बदलाव EPFO में दर्ज हो गया, ताकि आप जाँच दोबारा चलती देख सकें।"
                          : "For the demo: this assumes the change has landed in EPFO so you can watch the check re-run."}
                      </p>
                    </ActionFooter>
                  ) : null}

                  <SourceChip sourceId={action.findings[0].sourceId} />
                </div>
              </Disclosure>
            </div>
          ))}
        </div>
      ) : null}

      {theirs.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare aria-hidden className="size-3.5 text-ink-faint" strokeWidth={1.8} />
            <SectionLabel>
              {isYours
                ? lang === "hi"
                  ? "उन्हें यह भी बताएँ"
                  : "Also tell them"
                : lang === "hi"
                  ? "उन्हें यह बताएँ"
                  : "Tell them this"}
            </SectionLabel>
          </div>
          {/* Quoted, because these lines are written to the member in the second
              person. Rendered as bare bullets they read as statements about the
              HR reader — "your UAN" is the wrong person. */}
          <ul className="space-y-1.5 border-l-2 border-line pl-3">
            {theirs.map((f) => (
              <li key={f.ruleId} className="text-sm leading-relaxed text-ink-soft">
                “{t(f.title)}”
              </li>
            ))}
          </ul>
          <p className="text-xs leading-relaxed text-ink-mute">
            {lang === "hi"
              ? "यह उनके लिए लिखा है, आपके लिए नहीं — जस का तस भेज दें। ये सब वे ख़ुद ठीक कर सकते हैं; उन्हें बस पता नहीं कि दिक़्क़त है।"
              : "Written to them, not to you — forward it as it stands. They can fix all of this themselves; they simply do not know it is there."}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
