"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Button, SectionLabel } from "@/components/ui";
import { PERSONAS } from "@/content/personas";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";

/**
 * The demo control strip.
 *
 * Two things a judge needs and cannot otherwise get: a way to jump between the
 * three synthetic scenarios without walking the whole journey again, and a way
 * back to a known state from any dead end they wander into.
 *
 * Visible rather than hidden, because "this is synthetic" is a claim the
 * product has to keep making, and tasteful rather than loud, because it is
 * scaffolding around the product, not part of it.
 */
export function DemoBar() {
  const { lang } = useLang();
  const router = useRouter();
  const { session, begin, reset } = useSession();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function load(id: string) {
    const persona = PERSONAS.find((p) => p.id === id);
    if (!persona) return;
    begin(persona.id, structuredClone(persona.facts));
    startTransition(() => router.push("/preflight"));
  }

  return (
    <section
      aria-label={lang === "hi" ? "प्रदर्शन नियंत्रण" : "Demonstration controls"}
      className="rounded-card border border-caution-100 bg-caution-50 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <FlaskConical aria-hidden className="size-4 text-caution-700" strokeWidth={1.8} />
        <SectionLabel>
          {lang === "hi" ? "डेमो मोड · काल्पनिक डेटा" : "Demo mode · synthetic data"}
        </SectionLabel>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-caution-700">
        {lang === "hi"
          ? "इस खाते के पीछे हर नाम, UAN और रिकॉर्ड गढ़ा हुआ है। कोई सरकारी सिस्टम कभी संपर्क नहीं किया जाता।"
          : "Every name, UAN and record behind this account is invented. No government system is ever contacted."}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={pending}
            onClick={() => load(p.id)}
            aria-pressed={session.personaId === p.id}
            className={`inline-flex min-h-10 items-center rounded-ctl border px-3 text-sm font-medium transition-colors disabled:opacity-50 ${
              session.personaId === p.id
                ? "border-caution-500 bg-paper-raised text-ink"
                : "border-caution-200 bg-paper-raised/60 text-ink-soft hover:border-caution-500 hover:text-ink"
            }`}
          >
            {p.name.split(" ")[0]}
            <span className="ml-1.5 text-xs font-normal text-ink-mute">
              {scenario(p.id, lang)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-caution-700">
              {lang === "hi"
                ? "आपकी जाँच, सुधार और दावा मिटा दिए जाएँगे।"
                : "This clears your check, your corrections and any filed claim."}
            </p>
            <Button
              tone="secondary"
              onClick={() => {
                reset();
                setConfirming(false);
                startTransition(() => router.push("/dashboard"));
              }}
            >
              {lang === "hi" ? "हाँ, रीसेट करें" : "Yes, reset"}
            </Button>
            <Button tone="quiet" onClick={() => setConfirming(false)}>
              {lang === "hi" ? "रहने दें" : "Cancel"}
            </Button>
          </div>
        ) : (
          <Button tone="quiet" onClick={() => setConfirming(true)}>
            <RotateCcw aria-hidden className="size-4" strokeWidth={1.8} />
            {lang === "hi" ? "डेमो डेटा रीसेट करें" : "Reset demo data"}
          </Button>
        )}
      </div>
    </section>
  );
}

function scenario(id: string, lang: "en" | "hi"): string {
  const map: Record<string, { en: string; hi: string }> = {
    rajesh: { en: "· multiple issues", hi: "· कई दिक़्क़तें" },
    sunita: { en: "· employer issue", hi: "· नियोक्ता पर निर्भर" },
    arun: { en: "· ready to file", hi: "· भरने को तैयार" },
  };
  return map[id]?.[lang] ?? "";
}
