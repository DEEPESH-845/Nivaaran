"use client";

import { AlertTriangle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Badge, Card, SectionLabel, type Tone } from "@/components/ui";
import { ENGINE_VERSION, RULE_META, type RuleStatus } from "@/lib/rules/rules";
import { SOURCES, SOURCE_LIST } from "@/lib/rules/sources";
import { useLang } from "@/lib/i18n/context";
import type { Bi } from "@/lib/rules/types";

/**
 * Rule governance.
 *
 * A rule engine that asserts government policy is only as trustworthy as its
 * weakest citation, and the honest thing to do with that is publish it. Every
 * rule here shows the source under it, when a human last read that source, and
 * whether the reading still stands.
 *
 * `needs_review` is not a defect to hide. Silently presenting a stale reading
 * as current truth would be the defect.
 */

const STATUS: Record<RuleStatus, { label: Bi; tone: Tone; icon: typeof CheckCircle2 }> = {
  verified: {
    label: { en: "Verified", hi: "सत्यापित" },
    tone: "clear",
    icon: CheckCircle2,
  },
  needs_review: {
    label: { en: "Needs review", hi: "पुनरीक्षण चाहिए" },
    tone: "caution",
    icon: AlertTriangle,
  },
  stale: {
    label: { en: "Stale", hi: "पुराना" },
    tone: "blocked",
    icon: Clock,
  },
  deprecated: {
    label: { en: "Deprecated", hi: "वापस लिया गया" },
    tone: "neutral",
    icon: Clock,
  },
  draft: { label: { en: "Draft", hi: "मसौदा" }, tone: "neutral", icon: Clock },
};

const CONFIDENCE: Record<string, Bi> = {
  high: { en: "High confidence", hi: "उच्च विश्वसनीयता" },
  medium: { en: "Medium confidence", hi: "मध्यम विश्वसनीयता" },
  low: { en: "Low confidence", hi: "कम विश्वसनीयता" },
};

export default function GovernancePage() {
  const { lang, t } = useLang();

  const counts = RULE_META.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10 sm:py-14">
      <section className="space-y-3">
        <SectionLabel>{lang === "hi" ? "नियम प्रशासन" : "Rule governance"}</SectionLabel>
        <h1 className="display max-w-3xl text-balance">
          {lang === "hi"
            ? "हर नियम के पीछे एक स्रोत है, और हर स्रोत की एक तारीख़।"
            : "Every rule has a source, and every source has a date."}
        </h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "इंजन जो कुछ भी दावा करता है, वह किसी सार्वजनिक सरकारी स्रोत का हमारा पाठ है। यहाँ हर नियम के साथ लिखा है कि वह पाठ कब जाँचा गया और आज कितना भरोसेमंद है। जहाँ पुष्टि नहीं हो सकी, वह साफ़ लिखा है।"
            : "Everything the engine asserts is our reading of a public government source. Each rule below carries the date that reading was last checked and where it stands today. Where we could not confirm something, it says so."}
        </p>

        <dl className="grid gap-3 pt-2 sm:grid-cols-4">
          <Stat k={lang === "hi" ? "इंजन संस्करण" : "Engine version"} v={`v${ENGINE_VERSION}`} />
          <Stat k={lang === "hi" ? "नियम" : "Rules"} v={String(RULE_META.length)} />
          <Stat k={lang === "hi" ? "सत्यापित" : "Verified"} v={String(counts.verified ?? 0)} />
          <Stat
            k={lang === "hi" ? "पुनरीक्षण चाहिए" : "Needing review"}
            v={String((counts.needs_review ?? 0) + (counts.stale ?? 0))}
          />
        </dl>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "नियम रजिस्ट्री" : "Rule registry"}
        </h2>
        <ul className="space-y-3">
          {RULE_META.map((rule) => {
            const source = SOURCES[rule.sourceId];
            const status = STATUS[rule.status];
            const Icon = status.icon;
            return (
              <li key={rule.id}>
                <Card className="space-y-3 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tnum font-mono text-sm font-semibold text-ink">{rule.id}</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        {source?.title ?? rule.sourceId}
                      </p>
                    </div>
                    {/* Status is a word and an icon, never a colour alone. */}
                    <Badge tone={status.tone}>
                      <Icon aria-hidden className="size-3" strokeWidth={2.2} />
                      {t(status.label)}
                    </Badge>
                  </div>

                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    <Pair
                      k={lang === "hi" ? "प्रकाशक" : "Publisher"}
                      v={source?.publisher ?? "—"}
                    />
                    <Pair
                      k={lang === "hi" ? "अंतिम जाँच" : "Last read"}
                      v={rule.reviewedOn}
                    />
                    <Pair
                      k={lang === "hi" ? "भरोसा" : "Confidence"}
                      v={source ? t(CONFIDENCE[source.confidence]) : "—"}
                    />
                  </dl>

                  {rule.note ? (
                    <p className="rounded-ctl border border-caution-100 bg-caution-50 p-3 text-xs leading-relaxed text-caution-700">
                      {t(rule.note)}
                    </p>
                  ) : null}

                  {source?.changelog?.length ? (
                    <details className="group">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-indigo-600 [&::-webkit-details-marker]:hidden">
                        {lang === "hi" ? "बदलाव इतिहास" : "Changelog"} ({source.changelog.length})
                      </summary>
                      <ul className="mt-1 space-y-1.5">
                        {source.changelog.map((log) => (
                          <li key={log.date} className="flex gap-3 text-sm">
                            <span className="tnum shrink-0 font-mono text-ink-faint">{log.date}</span>
                            <span className="text-ink-soft">{log.change}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}

                  {source ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {lang === "hi" ? "स्रोत खोलें" : "Open the source"}
                      <ExternalLink aria-hidden className="size-3.5 shrink-0" strokeWidth={1.8} />
                    </a>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "स्रोत स्वामित्व" : "Source ownership"}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "असली तैनाती में हर स्रोत का एक ज़िम्मेदार विभाग होता, जिसे नियम बदलने पर सूचित करना होता। अभी यह मानचित्र सिर्फ़ दिशा दिखाता है।"
            : "In a real deployment each source would have a department accountable for telling us when the rule changes. For now this map only shows where that responsibility would sit."}
        </p>
        <Card className="divide-y divide-line-soft">
          {SOURCE_LIST.map((s) => (
            <div key={s.id} className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3">
              <p className="tnum min-w-0 font-mono text-sm text-ink">{s.id}</p>
              <p className="text-sm text-ink-mute">{s.domainOwner ?? "—"}</p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-card border border-line bg-paper-raised p-3">
      <dt className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">{k}</dt>
      <dd className="tnum mt-1 font-mono text-lg text-ink">{v}</dd>
    </div>
  );
}

function Pair({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-semibold uppercase tracking-[0.09em] text-ink-mute">{k}</dt>
      <dd className="mt-0.5 truncate text-ink-soft" title={v}>
        {v}
      </dd>
    </div>
  );
}
