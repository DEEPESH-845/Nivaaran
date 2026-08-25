"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import { Badge, Card, SectionLabel } from "@/components/ui";
import { SOURCE_LIST } from "@/lib/rules/sources";
import { useLang } from "@/lib/i18n/context";

export default function GovernancePage() {
  const { lang } = useLang();

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-10 sm:py-14">
      <section className="space-y-3">
        <SectionLabel>{lang === "hi" ? "नियम प्रशासन" : "Rule Governance"}</SectionLabel>
        <h1 className="display max-w-3xl text-balance">
          {lang === "hi"
            ? "हर नियम का एक मालिक होता है।"
            : "Every rule has an owner."}
        </h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "निवारण इंजन का हर नियम, स्रोत के अनुसार किसी न किसी विभाग या संस्था के अधिकार क्षेत्र में आता है। यहाँ हम उन नियमों के स्वामित्व और बदलावों को ट्रैक करते हैं।"
            : "Every rule in the Nivaaran engine falls under the jurisdiction of a specific department or entity according to its source. Here we track the ownership and changelogs of these rules."}
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "स्वामित्व रजिस्ट्री" : "Ownership Registry"}
        </h2>
        <ul className="space-y-6">
          {SOURCE_LIST.map((s) => (
            <li key={s.id}>
              <Card className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between border-b border-line-soft pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-ink">{s.title}</h3>
                    <p className="text-sm text-ink-mute mt-1">{s.id}</p>
                  </div>
                  {s.domainOwner && (
                    <Badge tone="clear" className="flex items-center gap-1.5 px-3 py-1">
                      <ShieldCheck className="size-4" />
                      {s.domainOwner}
                    </Badge>
                  )}
                </div>
                
                {s.changelog && s.changelog.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-ink-soft uppercase tracking-wider">
                      {lang === "hi" ? "बदलाव इतिहास" : "Changelog"}
                    </h4>
                    <ul className="space-y-2">
                      {s.changelog.map((log, idx) => (
                         <li key={idx} className="flex gap-4 text-sm">
                           <span className="font-mono text-ink-mute shrink-0">{log.date}</span>
                           <span className="text-ink">{log.change}</span>
                         </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-ink-mute italic">
                    {lang === "hi" ? "कोई बदलाव दर्ज नहीं है।" : "No changes recorded."}
                  </p>
                )}

                <div className="pt-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {lang === "hi" ? "स्रोत देखें" : "View Source"}
                    <ExternalLink aria-hidden className="size-3.5 shrink-0" strokeWidth={1.8} />
                  </a>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
