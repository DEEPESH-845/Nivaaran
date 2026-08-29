"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, SectionLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { useLang } from "@/lib/i18n/context";
import type { SessionUser } from "@/lib/auth/session";

/**
 * The account area.
 *
 * Deliberately thin. It shows what Nivaaran holds about a person — which is a
 * name, an email, a language and a list of live sessions — and nothing about
 * their PF record, because an account page is not a place to restate an
 * Aadhaar number back at somebody.
 */
export function AccountClient({
  user,
  sessions,
}: {
  user: SessionUser;
  sessions: { createdAt: string; expiresAt: string; agent: string }[];
}) {
  const { lang, ui, setLang } = useLang();
  const { signOut } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const rows = [
    { k: { en: "Name", hi: "नाम" }, v: user.name },
    { k: { en: "Email", hi: "ईमेल" }, v: user.email },
    { k: { en: "Account type", hi: "खाते का प्रकार" }, v: ROLE_LABEL[user.role][lang] },
  ];

  async function out() {
    setBusy(true);
    await signOut();
    startTransition(() => {
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:py-10">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>{ui("account")}</SectionLabel>
          {user.demo ? <Badge tone="caution">{ui("demoBadge")}</Badge> : null}
        </div>
        <h1 className="display text-balance">{user.name}</h1>
      </div>

      <Card className="overflow-hidden">
        <dl className="divide-y divide-line-soft">
          {rows.map((r) => (
            <div key={r.k.en} className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
              <dt className="text-sm text-ink-mute">{r.k[lang]}</dt>
              <dd className="break-all text-right text-sm text-ink">{r.v}</dd>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <dt className="text-sm text-ink-mute">{lang === "hi" ? "भाषा" : "Language"}</dt>
            <dd>
              <Button tone="secondary" onClick={() => setLang(lang === "en" ? "hi" : "en")}>
                {ui("langLabel")}
              </Button>
            </dd>
          </div>
        </dl>
      </Card>

      <section aria-labelledby="sessions" className="space-y-3">
        <h2 id="sessions" className="text-lg font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "चालू सत्र" : "Active sessions"}
        </h2>
        <Card className="divide-y divide-line-soft">
          {sessions.map((s) => (
            <div key={s.createdAt} className="space-y-1 px-4 py-3 sm:px-5">
              <p className="text-sm text-ink">{describeAgent(s.agent, lang)}</p>
              <p className="tnum text-xs text-ink-faint">
                {lang === "hi" ? "शुरू" : "Started"}{" "}
                {new Date(s.createdAt).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")} ·{" "}
                {lang === "hi" ? "समाप्ति" : "Expires"}{" "}
                {new Date(s.expiresAt).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN")}
              </p>
            </div>
          ))}
        </Card>
        <p className="flex gap-2 text-xs leading-relaxed text-ink-faint">
          <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
          {lang === "hi"
            ? "आपका सत्र एक HttpOnly कुकी में रहता है; सर्वर पर सिर्फ़ उसका हैश रखा जाता है। पासवर्ड कभी सादा नहीं रखा जाता।"
            : "Your session lives in an HttpOnly cookie; the server keeps only its hash. Passwords are never stored in plain text."}
        </p>
      </section>

      <Button tone="secondary" size="lg" onClick={out} disabled={busy}>
        <LogOut aria-hidden className="size-4" strokeWidth={1.8} />
        {ui("signOut")}
      </Button>
    </div>
  );
}

/** Coarse and non-identifying: enough to recognise a device, not to fingerprint one. */
function describeAgent(agent: string, lang: "en" | "hi"): string {
  const mobile = /Mobile|Android|iPhone|iPad/i.test(agent);
  if (mobile) return lang === "hi" ? "मोबाइल ब्राउज़र" : "A mobile browser";
  return lang === "hi" ? "डेस्कटॉप ब्राउज़र" : "A desktop browser";
}
