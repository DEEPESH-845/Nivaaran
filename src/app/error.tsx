"use client";

import { useEffect } from "react";
import { Button, ButtonLink, SectionLabel } from "@/components/ui";
import { useLang } from "@/lib/i18n/context";

/**
 * The application error boundary.
 *
 * Two promises to keep here. The first is that nothing was submitted, because
 * on a product about a claim that is the only question a person has. The
 * second is that they are not shown a stack trace: `error.digest` is a server
 * -side correlation id with no contents, and it is the only technical detail
 * that ever reaches this screen.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { lang } = useLang();

  useEffect(() => {
    // Console only, and only the digest. The message can carry values from a
    // failed render, and this is a page about somebody's PF record.
    if (error.digest) console.error(`Nivaaran render error, digest ${error.digest}`);
  }, [error.digest]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="space-y-4">
        <SectionLabel>{lang === "hi" ? "अनपेक्षित त्रुटि" : "Unexpected problem"}</SectionLabel>
        <h1 className="display text-balance">
          {lang === "hi"
            ? "निवारण में कुछ गड़बड़ हो गई।"
            : "Nivaaran hit an unexpected problem."}
        </h1>
        <p className="max-w-xl text-md leading-relaxed text-ink-soft">
          {lang === "hi"
            ? "आपकी जानकारी कहीं नहीं भेजी गई है, और कोई दावा दर्ज नहीं हुआ। दोबारा कोशिश करने पर आम तौर पर यह ठीक हो जाता है।"
            : "Your information has not been submitted anywhere and no claim was filed. Trying again usually clears it."}
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button size="lg" onClick={reset}>
            {lang === "hi" ? "फिर से कोशिश करें" : "Try again"}
          </Button>
          <ButtonLink href="/dashboard" tone="secondary" size="lg">
            {lang === "hi" ? "डैशबोर्ड पर लौटें" : "Return to dashboard"}
          </ButtonLink>
        </div>

        {error.digest ? (
          <p className="tnum pt-4 font-mono text-xs text-ink-faint">
            {lang === "hi" ? "संदर्भ" : "Reference"} {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
