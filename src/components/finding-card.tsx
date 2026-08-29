"use client";

import clsx from "clsx";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Landmark,
  OctagonAlert,
  User,
} from "lucide-react";
import Link from "next/link";
import { ActionFooter, Badge, Button, Card, Disclosure, type Tone } from "@/components/ui";
import { NameDiff, ValueDiff } from "@/components/name-diff";
import { ExplainSimply } from "@/components/explain-simply";
import { formatDate } from "@/lib/date";
import { SOURCES } from "@/lib/rules/sources";
import type { Confidence, Finding, Owner, Severity } from "@/lib/rules/types";
import { EmployerHandoff } from "@/components/employer-handoff";
import { useLang } from "@/lib/i18n/context";

const SEV_TONE: Record<Severity, Tone> = {
  blocker: "blocked",
  warning: "caution",
  info: "clear",
};

const SEV_ICON: Record<Severity, typeof Info> = {
  blocker: OctagonAlert,
  warning: AlertTriangle,
  info: CheckCircle2,
};

const OWNER_ICON: Record<Owner, typeof User> = {
  citizen: User,
  employer: Building2,
  epfo: Landmark,
  time: Clock,
};

const CONF_TONE: Record<Confidence, Tone> = {
  high: "clear",
  medium: "caution",
  low: "blocked",
};

/** Every rule shows where it came from, when we checked, and how sure we are. */
export function SourceChip({
  sourceId,
  className,
}: {
  sourceId: string;
  /**
   * The chip sits in a full-width card on /preflight, where a hairline above
   * it separates the citation from the finding — and inline in a metadata row
   * on /dashboard, where that same hairline rendered as an orphan rule
   * floating over nothing. The separator belongs to the caller's layout.
   */
  className?: string;
}) {
  const { lang, ui } = useLang();
  const src = SOURCES[sourceId];
  if (!src) return null;

  const confLabel = {
    high: { en: "High confidence", hi: "उच्च विश्वसनीयता" },
    medium: { en: "Medium confidence", hi: "मध्यम विश्वसनीयता" },
    low: { en: "Illustrative only", hi: "केवल उदाहरण" },
  }[src.confidence];

  return (
    <Disclosure
      summary={
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {ui("source")}
          <Badge tone={CONF_TONE[src.confidence]}>{confLabel[lang]}</Badge>
        </span>
      }
      className={className}
    >
      <div className="space-y-1.5">
        <p className="text-sm text-ink">{src.title}</p>
        <p className="text-xs text-ink-mute">
          {src.publisher} · {ui("verified")} {src.verifiedOn}
        </p>
        {src.note ? (
          <p className="text-xs leading-relaxed text-caution-700">{src.note}</p>
        ) : null}
        <a
          href={src.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {lang === "hi" ? "मूल स्रोत खोलें" : "Open the original source"}
          <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.8} />
        </a>
      </div>
    </Disclosure>
  );
}

function Evidence({ finding }: { finding: Finding }) {
  const { lang, t } = useLang();
  const e = finding.evidence;
  if (!e) return null;

  if (e.type === "name") {
    return <NameDiff verdict={e.verdict} leftLabel={t(e.aLabel)} rightLabel={t(e.bLabel)} />;
  }
  if (e.type === "date" || e.type === "value") {
    // A date is shown the way it is shown everywhere else. The evidence and
    // the card and the table must not disagree about what a date looks like.
    const show = e.type === "date" ? formatDate : (v: string) => v;
    return (
      <ValueDiff
        leftLabel={t(e.aLabel)}
        rightLabel={t(e.bLabel)}
        left={show(e.a)}
        right={show(e.b)}
      />
    );
  }
  return (
    <p className="rounded-card bg-paper-sunk p-3.5 text-sm leading-relaxed text-ink-soft">
      {t(e.text)}
    </p>
  );
}

export function FindingCard({
  finding,
  index,
  onFixed,
  fixed,
}: {
  finding: Finding;
  index?: number;
  onFixed?: () => void;
  fixed?: boolean;
}) {
  const { lang, t, ui } = useLang();
  const [showFix, setShowFix] = useState(false);
  const SevIcon = SEV_ICON[finding.severity];
  const OwnerIcon = OWNER_ICON[finding.owner];
  const ownerLabel = ui(`owner_${finding.owner}` as const);
  const sevLabel = ui(`sev_${finding.severity}` as const);

  return (
    <Card
      className={clsx(
        "overflow-hidden transition-opacity",
        fixed && "opacity-60",
      )}
    >
      <div className="space-y-3.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={SEV_TONE[finding.severity]}>
            <SevIcon aria-hidden className="size-3" strokeWidth={2.2} />
            {fixed ? (lang === "hi" ? "ठीक हो गया" : "Fixed") : sevLabel}
          </Badge>
          <Badge tone="neutral">
            <OwnerIcon aria-hidden className="size-3" strokeWidth={2} />
            {ownerLabel}
          </Badge>
          {finding.fix.minutes > 0 && !fixed ? (
            <Badge tone="neutral">
              <Clock aria-hidden className="size-3" strokeWidth={2} />
              {finding.fix.minutes} {ui("minutes")}
            </Badge>
          ) : null}
        </div>

        <h3 className="text-lg font-semibold leading-snug tracking-[-0.01em] text-ink">
          {typeof index === "number" ? (
            <span className="tnum mr-2 font-mono text-sm text-ink-faint">
              {String(index + 1).padStart(2, "0")}
            </span>
          ) : null}
          {t(finding.title)}
        </h3>

        <Evidence finding={finding} />

        <div className="space-y-2.5">
          <p className="text-sm leading-relaxed text-ink-soft">{t(finding.why)}</p>
          <div className="print:hidden">
            <ExplainSimply text={t(finding.why)} />
          </div>
        </div>

        {finding.fix.steps.length > 0 || finding.fix.officialUrl ? (
          <div className="rounded-card border border-line bg-paper-sunk">
            <button
              type="button"
              onClick={() => setShowFix((v) => !v)}
              aria-expanded={showFix}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left"
            >
              <span className="text-sm font-semibold text-ink">{ui("howToFix")}</span>
              <span className="text-xs text-ink-mute">
                {finding.fix.minutes > 0
                  ? `${finding.fix.minutes} ${ui("minutes")} · ${t(finding.fix.cost)}`
                  : t(finding.fix.cost)}
              </span>
            </button>

            {/* Always in the DOM, hidden with `display:none` so it stays out of
                the a11y tree — and unhidden for print, because the fix plan is
                the thing a citizen carries to their employer's HR desk. */}
            <div
              className={clsx(
                "space-y-3 border-t border-line px-4 py-4",
                !showFix && "hidden print:block",
              )}
            >
                <p className="text-sm font-medium leading-relaxed text-ink">
                  {t(finding.fix.summary)}
                </p>
                {finding.fix.steps.length > 0 ? (
                  <ol className="space-y-2.5">
                    {finding.fix.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                        <span className="tnum shrink-0 font-mono text-xs text-ink-faint">
                          {i + 1}
                        </span>
                        {t(s)}
                      </li>
                    ))}
                  </ol>
                ) : null}

                {finding.fix.waitDays ? (
                  <p className="text-xs text-ink-mute">
                    {lang === "hi"
                      ? `इसके बाद लगभग ${finding.fix.waitDays} दिन प्रोसेसिंग में लगते हैं।`
                      : `Then about ${finding.fix.waitDays} days of processing before it takes effect.`}
                  </p>
                ) : null}

                {finding.fix.caveat ? (
                  <p className="rounded-ctl border border-caution-100 bg-caution-50 p-3 text-xs leading-relaxed text-caution-700">
                    {t(finding.fix.caveat)}
                  </p>
                ) : null}

                {finding.fix.officialUrl ? (
                  <a
                    href={finding.fix.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {finding.fix.officialLabel
                      ? t(finding.fix.officialLabel)
                      : lang === "hi"
                        ? "आधिकारिक पृष्ठ"
                        : "Official page"}
                    <ExternalLink aria-hidden className="size-3.5" strokeWidth={1.8} />
                  </a>
                ) : null}

                {/* A citizen cannot open the employer console — that is an
                    employer's data — so what they get instead is the thing
                    that actually moves this: a message to send. */}
                {finding.owner === "employer" ? (
                  <div className="w-full print:hidden">
                    <EmployerHandoff findings={[finding]} />
                  </div>
                ) : null}

                {onFixed && !fixed ? (
                  <ActionFooter
                    className="border-t border-line pt-3 print:hidden"
                    action={
                      <Button tone="secondary" onClick={onFixed}>
                        {lang === "hi"
                          ? "मैंने यह कर लिया — दोबारा जाँचें"
                          : "I've done this — re-check"}
                      </Button>
                    }
                  >
                    <p className="text-2xs leading-relaxed text-ink-faint">
                      {lang === "hi"
                        ? "प्रदर्शन के लिए: यह मान लेता है कि सुधार EPFO में दर्ज हो गया, ताकि आप जाँच दोबारा चलती देख सकें।"
                        : "For the demo: this assumes the correction has landed in EPFO so you can watch the check re-run."}
                    </p>
                  </ActionFooter>
                ) : null}
            </div>
          </div>
        ) : null}

        <SourceChip sourceId={finding.sourceId} className="border-t border-line-soft pt-1" />
      </div>
    </Card>
  );
}
