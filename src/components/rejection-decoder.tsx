"use client";

import { useState } from "react";
import { ScanSearch } from "lucide-react";
import { Badge, Button, Card, SectionLabel } from "@/components/ui";
import { RULE_LABELS, type RuleId } from "@/lib/ai/decode";
import { useLang } from "@/lib/i18n/context";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; ruleIds: RuleId[]; resolvedBy: string }
  | { kind: "unavailable" };

/**
 * AI surface: turn EPFO's five-word rejection into named, fixable causes.
 *
 * Documented phrasings are matched by pattern on the server — free, instant
 * and offline. Only unrecognised wording reaches the model, and the model can
 * only choose from a closed set of rule ids. It cannot invent a cause.
 */
export function RejectionDecoder({
  initialText,
  presentRuleIds,
}: {
  initialText?: string;
  presentRuleIds: string[];
}) {
  const { lang } = useLang();
  const [text, setText] = useState(initialText ?? "");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function decode() {
    if (!text.trim()) return;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/decode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setState({ kind: "done", ruleIds: data.ruleIds ?? [], resolvedBy: data.resolvedBy });
    } catch {
      setState({ kind: "unavailable" });
    }
  }

  return (
    <Card className="space-y-3.5 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ScanSearch aria-hidden className="size-4 text-ink-faint" strokeWidth={1.7} />
        <SectionLabel>
          {lang === "hi" ? "ख़ारिजी का संदेश समझें" : "Decode a rejection message"}
        </SectionLabel>
      </div>

      <p className="text-sm leading-relaxed text-ink-soft">
        {lang === "hi"
          ? "अगर आपका दावा पहले ख़ारिज हुआ है, तो EPFO का वही संदेश यहाँ चिपकाएँ। हम बताएँगे कि उसका असल मतलब क्या है।"
          : "If a claim of yours was rejected before, paste EPFO's exact message here. We'll name what it actually means."}
      </p>

      <label htmlFor="rejection" className="sr-only">
        {lang === "hi" ? "ख़ारिजी का संदेश" : "Rejection message"}
      </label>
      <textarea
        id="rejection"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder={
          lang === "hi"
            ? "जैसे: Claim rejected: Name not as per records."
            : "e.g. Claim rejected: Name not as per records."
        }
        className="w-full rounded-ctl border border-line-strong bg-paper-raised p-3 font-mono text-sm text-ink placeholder:text-ink-faint"
      />

      <Button tone="secondary" onClick={decode} disabled={state.kind === "loading" || !text.trim()}>
        {state.kind === "loading"
          ? lang === "hi"
            ? "पढ़ा जा रहा है…"
            : "Reading…"
          : lang === "hi"
            ? "इसका मतलब बताएँ"
            : "Tell me what this means"}
      </Button>

      {state.kind === "done" ? (
        state.ruleIds.length === 0 ? (
          <p className="rounded-card bg-paper-sunk p-3.5 text-sm leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "यह संदेश हमारे किसी ज्ञात कारण से साफ़-साफ़ नहीं जुड़ता। हम अंदाज़ा नहीं लगाएँगे — EPFiGMS पर शिकायत दर्ज करते समय यही संदेश हूबहू लिख दें।"
              : "This message doesn't map cleanly to a cause we know. We won't guess — quote it verbatim when you raise a grievance on EPFiGMS."}
          </p>
        ) : (
          <div className="space-y-2.5">
            <p className="text-sm font-medium text-ink">
              {lang === "hi"
                ? "इस संदेश का मतलब है:"
                : "That message means:"}
            </p>
            <ul className="space-y-2">
              {state.ruleIds.map((id) => {
                const present = presentRuleIds.includes(id);
                return (
                  <li
                    key={id}
                    className="flex flex-wrap items-center gap-2 rounded-card bg-paper-sunk p-3"
                  >
                    <span className="text-sm text-ink">{RULE_LABELS[id]?.[lang] ?? id}</span>
                    <Badge tone={present ? "blocked" : "clear"}>
                      {present
                        ? lang === "hi"
                          ? "आपकी सूची में है"
                          : "In your list above"
                        : lang === "hi"
                          ? "अब आपके रिकॉर्ड में नहीं दिखता"
                          : "No longer in your record"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
            <p className="text-2xs leading-relaxed text-ink-mute">
              {state.resolvedBy === "patterns"
                ? lang === "hi"
                  ? "यह ज्ञात EPFO शब्दावली से मिलान करके पहचाना गया — कोई मॉडल इस्तेमाल नहीं हुआ।"
                  : "Matched against documented EPFO phrasings — no model was used."
                : state.resolvedBy === "model"
                  ? lang === "hi"
                    ? "शब्दावली पहचानी नहीं गई, इसलिए एक OpenAI मॉडल ने इसे हमारी तय सूची में से वर्गीकृत किया। वह इस सूची के बाहर कुछ नहीं जोड़ सकता।"
                    : "The wording wasn't recognised, so an OpenAI model classified it into our fixed list. It cannot add anything outside that list."
                  : lang === "hi"
                    ? "वर्गीकरण अभी उपलब्ध नहीं।"
                    : "Classification unavailable right now."}
            </p>
          </div>
        )
      ) : null}

      {state.kind === "unavailable" ? (
        <p className="text-xs text-ink-mute">
          {lang === "hi"
            ? "अभी उपलब्ध नहीं। ऊपर दी गई जाँच पूरी तरह काम कर रही है।"
            : "Unavailable right now. The check above is unaffected."}
        </p>
      ) : null}
    </Card>
  );
}
