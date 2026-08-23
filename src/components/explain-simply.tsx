"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useLang } from "@/lib/i18n/context";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; plain: string; byModel: boolean }
  | { kind: "unavailable" };

/**
 * AI surface: rewrite one explanation into the simplest possible language.
 *
 * This is additive by construction. The original wording is already correct
 * and always visible above; if the model is unavailable the citizen loses a
 * convenience, never information.
 */
export function ExplainSimply({ text }: { text: string }) {
  const { lang } = useLang();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function run() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });
      const data = await res.json();
      if (data.resolvedBy === "model") {
        setState({ kind: "done", plain: data.plain, byModel: true });
      } else {
        setState({ kind: "unavailable" });
      }
    } catch {
      setState({ kind: "unavailable" });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="rounded-card border border-indigo-100 bg-indigo-50 p-3.5">
        <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-indigo-700">
          <Sparkles aria-hidden className="size-3" strokeWidth={2} />
          {lang === "hi" ? "आसान भाषा में" : "In simple words"}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink">{state.plain}</p>
        <p className="mt-2 text-2xs leading-relaxed text-indigo-700/80">
          {lang === "hi"
            ? "एक OpenAI मॉडल ने ऊपर वाली बात को आसान शब्दों में लिखा है। अर्थ वही है; नियम और शर्तें नहीं बदली गईं।"
            : "Rewritten by an OpenAI model. Same meaning; no rule or caveat was changed."}
        </p>
      </div>
    );
  }

  if (state.kind === "unavailable") {
    return (
      <p className="text-xs leading-relaxed text-ink-mute">
        {lang === "hi"
          ? "आसान भाषा अभी उपलब्ध नहीं है। ऊपर दी गई व्याख्या ही पूरी और सही है।"
          : "Simple language isn't available right now. The explanation above is the full and correct one."}
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={state.kind === "loading"}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 disabled:opacity-60"
    >
      <Sparkles aria-hidden className="size-3.5" strokeWidth={1.9} />
      {state.kind === "loading"
        ? lang === "hi"
          ? "आसान भाषा में लिखा जा रहा है…"
          : "Rewriting…"
        : lang === "hi"
          ? "आसान भाषा में समझाएँ"
          : "Explain this simply"}
    </button>
  );
}
