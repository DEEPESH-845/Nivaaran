"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { ButtonLink, Card, SectionLabel } from "@/components/ui";
import { ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/context";
import { useLang } from "@/lib/i18n/context";

/**
 * 403.
 *
 * Says which kind of account the area belongs to, because "Unauthorized" tells
 * a person nothing they can act on. It does not say what is behind the door,
 * and it is reached only by a server-side redirect from `requireRole` — the
 * refusal has already happened by the time this renders.
 */
function Forbidden() {
  const { lang } = useLang();
  const { user } = useAuth();
  const params = useSearchParams();

  const need = params.get("need");
  const needed = need && need in ROLE_LABEL ? ROLE_LABEL[need as Role] : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="space-y-4">
        <SectionLabel>403</SectionLabel>
        <h1 className="display text-balance">
          {lang === "hi" ? "इस हिस्से तक आपकी पहुँच नहीं है।" : "You don't have access to this area."}
        </h1>
        <p className="max-w-xl text-md leading-relaxed text-ink-soft">
          {needed
            ? lang === "hi"
              ? `यह भाग “${needed.hi}” खातों के लिए है। आपका खाता उस तरह का नहीं है।`
              : `This section is reserved for ${needed.en.toLowerCase()} accounts. Yours is not one.`
            : lang === "hi"
              ? "आपका खाता इस भाग के लिए नहीं है।"
              : "Your account is not the kind this section is for."}
        </p>

        <Card className="flex gap-3 p-4">
          <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-ink-mute" strokeWidth={1.7} />
          <p className="text-sm leading-relaxed text-ink-soft">
            {lang === "hi"
              ? "यह जाँच सर्वर पर होती है, सिर्फ़ मेन्यू छिपाकर नहीं। पता सीधे टाइप करने पर भी नतीजा यही रहेगा।"
              : "This check runs on the server, not by hiding a menu item. Typing the address directly gives the same answer."}
          </p>
        </Card>

        <div className="flex flex-wrap gap-3 pt-2">
          <ButtonLink href={user ? "/dashboard" : "/login"} size="lg">
            {user
              ? lang === "hi"
                ? "मेरे डैशबोर्ड पर जाएँ"
                : "Go to my dashboard"
              : lang === "hi"
                ? "साइन इन करें"
                : "Sign in"}
          </ButtonLink>
          <ButtonLink href="/" tone="secondary" size="lg">
            {lang === "hi" ? "मुख पृष्ठ" : "Return home"}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-24" />}>
      <Forbidden />
    </Suspense>
  );
}
