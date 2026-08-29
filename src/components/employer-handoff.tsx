"use client";

import { useState } from "react";
import { Check, Copy, Printer, Send } from "lucide-react";
import { Button, Card, SectionLabel } from "@/components/ui";
import { SOURCES } from "@/lib/rules/sources";
import { useLang } from "@/lib/i18n/context";
import type { Finding, Lang } from "@/lib/rules/types";

/**
 * The citizen → employer handoff.
 *
 * A finding the member cannot act on is, today, a dead end: the portal says
 * "rejected", the member does not know an employer is the blocker, and the
 * employer does not know a claim exists. This turns the finding into the one
 * artefact that moves it — a message the member can send to the last people
 * who had their contact details.
 *
 * It composes text and hands it over. It does not send anything: there is no
 * mail integration in this build, and a button that implies delivery it cannot
 * perform is worse than no button.
 *
 * The message carries the issue, the action, and the source. It carries no
 * Aadhaar number, no bank account, and no date of birth — an HR desk needs
 * none of those to file an exit date.
 */
export function EmployerHandoff({ findings }: { findings: Finding[] }) {
  const { lang, ui } = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const message = compose(findings, lang);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable. The text is selectable on screen and the print
      // route still works, so nothing is lost.
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <Send aria-hidden className="size-3.5" strokeWidth={1.8} />
        {lang === "hi" ? "नियोक्ता के लिए संदेश तैयार करें" : "Prepare a message for your employer"}
      </button>
    );
  }

  return (
    <Card className="w-full space-y-3 p-4">
      <div className="space-y-1">
        <SectionLabel>
          {lang === "hi" ? "यह आपका काम नहीं है" : "This isn't yours to fix"}
        </SectionLabel>
        <p className="text-sm leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "यह संदेश अपने पुराने नियोक्ता के HR को भेजें। इसमें वही है जो उन्हें चाहिए — आपका आधार, खाता संख्या या जन्मतिथि नहीं।"
            : "Send this to your former employer's HR. It contains what they need and nothing else — no Aadhaar, no account number, no date of birth."}
        </p>
      </div>

      <label htmlFor="handoff-message" className="sr-only">
        {lang === "hi" ? "नियोक्ता के लिए संदेश" : "Message for your employer"}
      </label>
      <textarea
        id="handoff-message"
        readOnly
        rows={10}
        value={message}
        className="w-full resize-y rounded-ctl border border-line bg-paper-sunk p-3 font-mono text-xs leading-relaxed text-ink"
      />

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button tone="secondary" onClick={copy}>
          {copied ? (
            <>
              <Check aria-hidden className="size-4" strokeWidth={2.2} />
              {lang === "hi" ? "कॉपी हो गया" : "Copied"}
            </>
          ) : (
            <>
              <Copy aria-hidden className="size-4" strokeWidth={1.8} />
              {lang === "hi" ? "संदेश कॉपी करें" : "Copy message"}
            </>
          )}
        </Button>
        <Button tone="quiet" onClick={() => window.print()}>
          <Printer aria-hidden className="size-4" strokeWidth={1.8} />
          {lang === "hi" ? "प्रिंट करें" : "Print"}
        </Button>
        <Button tone="quiet" onClick={() => setOpen(false)}>
          {ui("back")}
        </Button>
      </div>
    </Card>
  );
}

function compose(findings: Finding[], lang: Lang): string {
  const t = (bi: { en: string; hi: string }) => bi[lang] || bi.en;

  const head =
    lang === "hi"
      ? "विषय: मेरे EPF रिकॉर्ड में सुधार का अनुरोध\n\nनमस्ते,\n\nमैं अपना अंतिम PF निपटान दावा भरने वाला/वाली हूँ। भरने से पहले जाँच में पता चला कि नीचे लिखी बात मेरे रिकॉर्ड में ठीक होनी है, और यह केवल नियोक्ता ही कर सकता है।"
      : "Subject: Request to correct my EPF record before I file\n\nHello,\n\nI am about to file my final PF settlement. A pre-submission check found the following in my record, and it is something only the employer can put right.";

  const blocks = findings.map((f, i) => {
    const fix = f.employerFix ?? f.fix;
    const source = SOURCES[f.sourceId];
    const steps = fix.steps.map((s) => `   - ${t(s)}`).join("\n");
    return [
      `${i + 1}. ${t(f.title)}`,
      `   ${lang === "hi" ? "क्यों ज़रूरी है" : "Why it matters"}: ${t(f.why)}`,
      `   ${lang === "hi" ? "क्या करना है" : "What is needed"}: ${t(fix.summary)}`,
      steps,
      `   ${lang === "hi" ? "अनुमानित समय" : "Estimated effort"}: ${fix.minutes} ${lang === "hi" ? "मिनट" : "minutes"}`,
      source ? `   ${lang === "hi" ? "स्रोत" : "Source"}: ${source.title} — ${source.url}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const tail =
    lang === "hi"
      ? "जब तक यह ठीक नहीं होता, मेरा दावा भरने पर लगभग बीस दिन बाद ख़ारिज होकर लौटेगा। आपका बहुत धन्यवाद।\n\n— \n\n(यह संदेश निवारण से बनाया गया है, एक स्वतंत्र प्रोटोटाइप, जिसका EPFO या भारत सरकार से कोई संबंध नहीं।)"
      : "Until this is corrected, a claim I file will come back rejected roughly twenty days later. Thank you for your help.\n\n— \n\n(Composed with Nivaaran, an independent prototype not affiliated with EPFO or the Government of India.)";

  return [head, "", ...blocks, "", tail].join("\n");
}
