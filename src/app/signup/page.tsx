"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Alert, Button, Card, Choice, Field, SectionLabel, Spinner } from "@/components/ui";
import { AuthFrame } from "@/components/auth/auth-frame";
import { DemoCredentials } from "@/components/auth/demo-credentials";
import { useAuth, type AuthFailure } from "@/lib/auth/context";
import { fieldMessage, formMessage } from "@/lib/auth/messages";
import { safeNext } from "@/lib/auth/redirect";
import { useLang } from "@/lib/i18n/context";

/**
 * Client-side validation exists to save a round trip and to say something
 * useful before the request. It is not a control: `/api/auth/signup` runs the
 * same email and password checks again, and its answer is the one that counts.
 */
function localProblem(password: string): "too_short" | "too_simple" | null {
  if (password.length > 0 && password.length < 10) return "too_short";
  if (password.length >= 10 && new Set(password).size < 5) return "too_simple";
  return null;
}

function SignUpForm() {
  const { lang, ui } = useLang();
  const { signUp } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "employer">("citizen");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<AuthFailure | null>(null);

  const local = touched ? localProblem(password) : null;
  const formError = failure ? formMessage(failure) : null;
  const emailError = fieldMessage(failure, "email");
  const serverPassword = fieldMessage(failure, "password");

  // Carry the destination across. Without this, a reader the guard sent to
  // one of these two pages loses where they were going the moment they switch
  // to the other, and lands on the dashboard instead.
  const next = params.get("next");
  const crossLink = (path: string) =>
    next ? `${path}?next=${encodeURIComponent(safeNext(next))}` : path;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setTouched(true);
    if (localProblem(password)) return;

    setBusy(true);
    setFailure(null);
    try {
      const result = await signUp({ name, email, password, role });
      if (result) {
        setFailure(result);
        return;
      }
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setFailure({ code: "INTERNAL_ERROR", fields: { form: "network" } });
    } finally {
      setBusy(false);
    }
  }

  const roles = [
    {
      value: "citizen" as const,
      label: lang === "hi" ? "मैं अपना PF निकालना चाहता/चाहती हूँ" : "I am claiming my own PF",
      hint: lang === "hi" ? "नागरिक की यात्रा और डैशबोर्ड" : "The citizen journey and dashboard",
    },
    {
      value: "employer" as const,
      label: lang === "hi" ? "मैं नियोक्ता के लिए काम करता/करती हूँ" : "I work for an employer",
      hint:
        lang === "hi"
          ? "पूर्व कर्मचारियों की सूची, इस डेमो में काल्पनिक"
          : "The leaver queue, synthetic in this demo",
    },
  ];

  return (
    <>
      <Card className="p-5 sm:p-6">
        <SectionLabel>{ui("signUp")}</SectionLabel>

        <form onSubmit={submit} noValidate className="mt-4 space-y-4">
          {formError ? <Alert>{ui(formError)}</Alert> : null}

          <Field
            label={ui("fullName")}
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            hint={
              lang === "hi"
                ? "कम से कम 10 अक्षर। कुछ असंबंधित शब्द चिह्नों से बेहतर काम करते हैं।"
                : "At least 10 characters. A few unrelated words beat a symbol you will forget."
            }
            error={
              local ? ui(`err_${local}` as never) : serverPassword ? ui(serverPassword) : undefined
            }
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

          <fieldset className="space-y-2.5">
            <legend className="mb-2 block text-sm font-medium text-ink">
              {lang === "hi" ? "आप यहाँ क्यों आए हैं?" : "Which side are you on?"}
            </legend>
            {roles.map((r) => (
              <Choice
                key={r.value}
                selected={role === r.value}
                label={r.label}
                hint={r.hint}
                onClick={() => setRole(r.value)}
              />
            ))}
          </fieldset>

          <Button type="submit" size="lg" full disabled={busy}>
            {busy ? (
              <>
                <Spinner />
                {ui("creatingAccount")}
              </>
            ) : (
              ui("signUp")
            )}
          </Button>

          <p className="text-sm text-ink-soft">
            {lang === "hi" ? "पहले से खाता है? " : "Already have an account? "}
            <Link href={crossLink("/login")} className="font-medium text-indigo-600 hover:text-indigo-700">
              {ui("signIn")}
            </Link>
          </p>

          <p className="border-t border-line pt-3 text-xs leading-relaxed text-ink-faint">
            {lang === "hi"
              ? "यहाँ कोई असली आधार, PAN, UAN या बैंक विवरण न माँगा जाता है, न रखा जाता है। खाता सिर्फ़ आपकी जाँच की प्रगति सहेजता है।"
              : "No real Aadhaar, PAN, UAN or bank details are requested or stored. An account only saves the progress of your check."}
          </p>
        </form>
      </Card>

      <DemoCredentials />
    </>
  );
}

export default function SignUpPage() {
  const { lang } = useLang();
  return (
    <AuthFrame
      title={lang === "hi" ? "एक खाता, ताकि जाँच टिकी रहे।" : "An account, so the check sticks."}
      lede={
        lang === "hi"
          ? "बिना खाते के भी सब चलता है। खाता बनाने पर आपका दावा किसी भी डिवाइस पर वापस मिल जाता है।"
          : "Everything works without one. With one, your claim comes back on any device you sign in from."
      }
      footer={null}
    >
      <Suspense fallback={<Card className="min-h-96 p-6" />}>
        <SignUpForm />
      </Suspense>
    </AuthFrame>
  );
}
