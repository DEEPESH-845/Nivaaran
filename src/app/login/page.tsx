"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Alert, Button, Card, Field, SectionLabel, Spinner } from "@/components/ui";
import { AuthFrame } from "@/components/auth/auth-frame";
import { DemoCredentials } from "@/components/auth/demo-credentials";
import { useAuth } from "@/lib/auth/context";
import { fieldMessage, formMessage } from "@/lib/auth/messages";
import { safeNext } from "@/lib/auth/redirect";
import { useLang } from "@/lib/i18n/context";
import type { AuthFailure } from "@/lib/auth/context";

function LoginForm() {
  const { lang, ui } = useLang();
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);

  const formError = failure ? formMessage(failure) : null;
  const emailError = fieldMessage(failure, "email");
  const passwordError = fieldMessage(failure, "password");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await signIn(email, password);
      if (result) {
        setFailure(result);
        return;
      }
      // Only ever a same-site path. See safeNext.
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setFailure({ code: "INTERNAL_ERROR", fields: { form: "network" } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card className="p-5 sm:p-6">
        <SectionLabel>{ui("signIn")}</SectionLabel>

        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          {formError ? <Alert>{ui(formError)}</Alert> : null}

          <Field
            label={ui("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError ? ui(emailError) : undefined}
          />

          <Field
            label={ui("password")}
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={passwordError ? ui(passwordError) : undefined}
            trailing={
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? ui("hidePassword") : ui("showPassword")}
                aria-pressed={reveal}
                className="grid size-11 place-items-center rounded-ctl text-ink-mute transition-colors hover:text-ink"
              >
                {reveal ? (
                  <EyeOff aria-hidden className="size-4" strokeWidth={1.8} />
                ) : (
                  <Eye aria-hidden className="size-4" strokeWidth={1.8} />
                )}
              </button>
            }
          />

          <Button type="submit" size="lg" full disabled={busy}>
            {busy ? (
              <>
                <Spinner />
                {ui("signingIn")}
              </>
            ) : (
              ui("signIn")
            )}
          </Button>

          <p className="text-sm text-ink-soft">
            {lang === "hi" ? "खाता नहीं है? " : "No account yet? "}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-700">
              {ui("signUp")}
            </Link>
          </p>

          {/* Honest rather than half-built: an unconfigured reset flow that
              claims to have sent an email is worse than no button at all. */}
          <p className="border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
            {lang === "hi"
              ? "इस डेमो परिवेश में पासवर्ड रिकवरी सेट नहीं है — कोई ईमेल नहीं भेजा जाता। नीचे दिए डेमो खातों का उपयोग करें।"
              : "Password recovery is not configured in this demo environment — no email is sent. Use a demo account below."}
          </p>
        </form>
      </Card>

      <DemoCredentials
        onUse={(e, p) => {
          setEmail(e);
          setPassword(p);
          setFailure(null);
        }}
      />
    </>
  );
}

export default function LoginPage() {
  const { lang } = useLang();
  return (
    <AuthFrame
      title={lang === "hi" ? "अपनी जाँच फिर से खोलें।" : "Pick your check back up."}
      lede={
        lang === "hi"
          ? "साइन इन करने पर आपका दावा, हर सुधार और हर चरण वहीं मिलता है जहाँ छोड़ा था।"
          : "Signing in brings back your claim, every fix you have marked, and where the whole thing stands."
      }
      footer={null}
    >
      <Suspense fallback={<Card className="min-h-80 p-6" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
