"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  ScanLine,
  ShieldCheck,
  Users,
} from "lucide-react";
import clsx from "clsx";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  SectionLabel,
  Skeleton,
} from "@/components/ui";
import { SourceChip } from "@/components/finding-card";
import { EmployerHandoff } from "@/components/employer-handoff";
import { DemoBar } from "@/components/demo-bar";
import { claimState, describe, isFiled } from "@/lib/claims/state";
import { billableMinutes, daysUntilFilable, preflight } from "@/lib/rules/engine";
import { RULES } from "@/lib/rules/rules";
import { SOURCE_LIST } from "@/lib/rules/sources";
import { useLang } from "@/lib/i18n/context";
import { useSession } from "@/lib/state/session";
import type { Role } from "@/lib/auth/roles";
import type { Finding, Owner } from "@/lib/rules/types";

/**
 * The citizen action dashboard.
 *
 * It answers one question in the first screenful — *what is happening with my
 * claim, and what should I do next* — and everything below is evidence for
 * that answer. Not an analytics surface: there is no chart here, no vanity
 * count, and no readiness percentage. A percentage implies a precision the
 * engine does not have; a state can be explained in a sentence, and every
 * state below is.
 *
 * Everything on this page is derived from `preflight(facts)`. Nothing is
 * written down twice.
 */

const OWNER_LABEL: Record<Owner, { en: string; hi: string }> = {
  citizen: { en: "You", hi: "आप" },
  employer: { en: "Your employer", hi: "आपका नियोक्ता" },
  epfo: { en: "EPFO", hi: "EPFO" },
  time: { en: "Time", hi: "समय" },
};

/**
 * One trip, not one row per symptom.
 *
 * Findings that share a `fixKey` are a single action — correcting a name and a
 * date of birth is one visit to Modify Basic Details, under one Joint
 * Declaration. Listing them separately tells a member to make the same journey
 * twice and quotes them double the time.
 */
interface FixGroup {
  key: string;
  owner: Owner;
  findings: Finding[];
  minutes: number;
  waitDays: number;
}

function groupFixes(findings: Finding[]): FixGroup[] {
  const groups = new Map<string, FixGroup>();
  for (const f of findings) {
    const key = f.fix.fixKey ?? f.ruleId;
    const existing = groups.get(key);
    if (existing) {
      existing.findings.push(f);
      existing.waitDays = Math.max(existing.waitDays, f.fix.waitDays ?? 0);
      continue;
    }
    groups.set(key, {
      key,
      owner: f.owner,
      findings: [f],
      minutes: f.fix.minutes,
      waitDays: f.fix.waitDays ?? 0,
    });
  }
  // Whoever has the longest queue goes first: employer and EPFO work has to
  // start today, citizen work can be done in ten minutes whenever.
  const order: Record<Owner, number> = { employer: 0, epfo: 1, citizen: 2, time: 3 };
  return [...groups.values()].sort((a, b) => order[a.owner] - order[b.owner]);
}

const STAGES = [
  { id: "preflight", en: "Check", hi: "जाँच" },
  { id: "fix", en: "Corrections", hi: "सुधार" },
  { id: "ready", en: "Ready to file", hi: "भरने को तैयार" },
  { id: "submitted", en: "Submitted", hi: "भेजा गया" },
  { id: "verification", en: "Verification", hi: "सत्यापन" },
  { id: "approved", en: "Approval", hi: "मंज़ूरी" },
  { id: "payment_released", en: "Payment", hi: "भुगतान" },
] as const;

function stageIndex(state: string, blockers: number): number {
  switch (state) {
    case "draft":
    case "preflight_required":
      return 0;
    case "blocked":
      return 1;
    case "ready":
      return 2;
    case "submitted":
      return 3;
    case "verification":
      return 4;
    case "approved":
      return 5;
    case "payment_released":
      return 6;
    default:
      return blockers > 0 ? 1 : 2;
  }
}

const ACTIVITY_LABEL: Record<string, { en: string; hi: string }> = {
  signed_up: { en: "Account created", hi: "खाता बनाया गया" },
  signed_in: { en: "Signed in", hi: "साइन इन किया" },
  case_started: { en: "Claim check started", hi: "दावा जाँच शुरू हुई" },
  preflight_run: { en: "Pre-flight completed", hi: "प्री-फ़्लाइट पूरी हुई" },
  fix_marked: { en: "Correction marked done", hi: "सुधार पूरा चिह्नित" },
  document_compared: { en: "Document compared", hi: "दस्तावेज़ मिलान हुआ" },
  claim_filed: { en: "Claim submitted", hi: "दावा भेजा गया" },
  status_advanced: { en: "Status moved forward", hi: "स्थिति आगे बढ़ी" },
  demo_reset: { en: "Demo data reset", hi: "डेमो डेटा रीसेट" },
};

export function DashboardClient({
  name,
  demo,
  role,
}: {
  name: string;
  demo: boolean;
  role: Role;
}) {
  const { lang, t, ui } = useLang();
  const { session, ready, activity } = useSession();

  const result = useMemo(
    () => (session.facts ? preflight(session.facts) : null),
    [session.facts],
  );

  if (!ready) return <DashboardSkeleton />;

  const state = claimState(session, result);
  const blockers = result?.findings.filter((f) => f.severity === "blocker") ?? [];
  const copy = describe(state, blockers.length, result?.owners ?? []);
  const groups = groupFixes(blockers);
  const citizenMinutes = billableMinutes(
    blockers.filter((f) => f.owner === "citizen").map((f) => f.fix),
  );
  const waitDays = result ? daysUntilFilable(result) : 0;
  const filed = isFiled(state);
  const current = stageIndex(state, blockers.length);
  const firstName = name.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-10">
      {demo ? <DemoBar /> : null}

      {/* --------------------------------------------------------- Hero */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SectionLabel>
            {lang === "hi" ? `नमस्ते, ${firstName}` : `Hello, ${firstName}`}
          </SectionLabel>
          <Badge tone={copy.tone}>{t(copy.label)}</Badge>
        </div>

        {/* Never colour alone: the badge carries a word, the heading carries
            the meaning, and the paragraph carries the consequence. */}
        <h1
          className={clsx(
            "display text-balance",
            copy.tone === "clear" && "text-clear-700",
            copy.tone === "blocked" && "text-blocked-700",
          )}
        >
          {t(copy.headline)}
        </h1>
        <p className="max-w-2xl text-md leading-relaxed text-ink-soft">{t(copy.detail)}</p>

        <div className="flex flex-wrap gap-3">
          <PrimaryAction state={state} />
          {state === "blocked" && citizenMinutes > 0 ? (
            <p className="flex items-center gap-2 self-center text-sm text-ink-mute">
              <Clock aria-hidden className="size-4" strokeWidth={1.8} />
              {lang === "hi"
                ? `आपका हिस्सा: लगभग ${citizenMinutes} मिनट, निःशुल्क`
                : `Your share: about ${citizenMinutes} minutes, free`}
            </p>
          ) : null}
        </div>
      </section>

      {/* ----------------------------------------------- The action centre */}
      {state === "draft" ? (
        <EmptyState
          icon={<ClipboardList aria-hidden className="size-6" strokeWidth={1.6} />}
          title={lang === "hi" ? "आपने अभी कोई दावा नहीं जाँचा।" : "You haven't started a claim yet."}
          body={
            lang === "hi"
              ? "पाँच आसान सवाल, फिर वही नौ जाँचें जो EPFO चलाता है — भरने से पहले।"
              : "Five plain questions, then the same nine checks EPFO runs — before you file."
          }
          action={
            <ButtonLink href="/#start" size="lg">
              {lang === "hi" ? "मेरा दावा जाँचें" : "Check my claim"}
              <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
            </ButtonLink>
          }
        />
      ) : null}

      {groups.length > 0 && !filed ? (
        <section aria-labelledby="actions" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="actions" className="text-xl font-semibold tracking-[-0.01em] text-ink">
              {lang === "hi"
                ? `${groups.length} काम आपके ध्यान का इंतज़ार कर रहे हैं`
                : `${groups.length} ${groups.length === 1 ? "action needs" : "actions need"} attention`}
            </h2>
            {session.resolved.length > 0 ? (
              <Badge tone="clear">
                <CheckCircle2 aria-hidden className="size-3" strokeWidth={2.2} />
                {session.resolved.length} {lang === "hi" ? "ठीक हो गया" : "fixed"}
              </Badge>
            ) : null}
          </div>

          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.key}>
                <ActionRow group={g} />
              </li>
            ))}
          </ul>

          {waitDays > 0 ? (
            <p className="text-sm leading-relaxed text-ink-mute">
              {lang === "hi"
                ? `सब ठीक करने के बाद भी सबसे लंबी प्रोसेसिंग लगभग ${waitDays} दिन लेती है। दावा उसके बाद भरें।`
                : `Even after you act, the longest of these takes about ${waitDays} days to process. File after that.`}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ------------------------------------------------------- Timeline */}
      {state !== "draft" ? (
        <section aria-labelledby="timeline" className="space-y-3">
          <h2 id="timeline" className="text-xl font-semibold tracking-[-0.01em] text-ink">
            {lang === "hi" ? "यह दावा कहाँ तक पहुँचा" : "Where this claim stands"}
          </h2>
          {/* The timeline scrolls sideways on a narrow phone, so it has to be
              reachable by keyboard — a scroll container nobody can focus is a
              region a keyboard user simply cannot read. */}
          <Card
            className="overflow-x-auto p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:p-5"
            tabIndex={0}
            role="group"
            aria-label={lang === "hi" ? "दावे की समयरेखा" : "Claim timeline"}
          >
            <ol className="flex min-w-max gap-1 sm:min-w-0">
              {STAGES.map((s, i) => {
                const done = i < current;
                const now = i === current;
                return (
                  <li key={s.id} className="flex min-w-0 flex-1 flex-col gap-2">
                    <span
                      aria-hidden
                      className={clsx(
                        "h-1 rounded-full transition-colors",
                        done && "bg-clear-500",
                        now && "bg-indigo-600",
                        !done && !now && "bg-line",
                      )}
                    />
                    <span
                      className={clsx(
                        "px-0.5 text-2xs font-medium leading-tight",
                        now ? "text-ink" : done ? "text-ink-soft" : "text-ink-faint",
                      )}
                    >
                      {s[lang]}
                      {now ? (
                        <span className="mt-0.5 block font-semibold uppercase tracking-[0.06em] text-indigo-600">
                          {lang === "hi" ? "अभी यहाँ" : "You are here"}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------------------------------------------------- Documents */}
        <section aria-labelledby="documents" className="space-y-3">
          <h2 id="documents" className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {lang === "hi" ? "दस्तावेज़" : "Documents"}
          </h2>
          <Card className="p-4 sm:p-5">
            <p className="text-sm leading-relaxed text-ink-soft">
              {lang === "hi"
                ? "अपनी पहचान का दस्तावेज़ और पासबुक दिखाइए; हम वही चार जानकारियाँ पढ़कर आपके EPFO रिकॉर्ड से मिलाते हैं जिन पर दावा फँसता है।"
                : "Show an identity document and a passbook. We read the four fields the check compares and put each one next to your EPFO record."}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              {lang === "hi"
                ? "हम मिलान करते हैं, प्रमाणित नहीं। तस्वीरें सहेजी नहीं जातीं।"
                : "We compare, we do not verify. Images are not stored."}
            </p>
            <Link
              href="/documents"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <ScanLine aria-hidden className="size-4" strokeWidth={1.8} />
              {lang === "hi" ? "दस्तावेज़ मिलाएँ" : "Compare documents"}
            </Link>
          </Card>
        </section>

        {/* ----------------------------------------------------- Activity */}
        <section aria-labelledby="activity" className="space-y-3">
          <h2 id="activity" className="text-lg font-semibold tracking-[-0.01em] text-ink">
            {lang === "hi" ? "हाल की गतिविधि" : "Recent activity"}
          </h2>
          {activity.length === 0 ? (
            <EmptyState
              icon={<Activity aria-hidden className="size-5" strokeWidth={1.6} />}
              title={lang === "hi" ? "अभी कुछ नहीं" : "Nothing yet"}
              body={
                lang === "hi"
                  ? "निवारण इस्तेमाल करते ही आपकी गतिविधि यहाँ दिखने लगेगी।"
                  : "Your activity will appear here as you use Nivaaran."
              }
            />
          ) : (
            <Card className="divide-y divide-line-soft">
              {activity.slice(0, 6).map((a, i) => (
                <div key={`${a.at}-${i}`} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                  <p className="min-w-0 text-sm text-ink">
                    {ACTIVITY_LABEL[a.kind]?.[lang] ?? a.kind}
                    {a.detail ? (
                      <span className="ml-1.5 font-mono text-xs text-ink-faint">{a.detail}</span>
                    ) : null}
                  </p>
                  <time
                    dateTime={a.at}
                    className="tnum shrink-0 text-xs text-ink-faint"
                  >
                    {new Date(a.at).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </time>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------- Employer lens */}
      {role === "employer" ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="font-semibold text-ink">
              {lang === "hi" ? "नियोक्ता दृश्य" : "The employer lens"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {lang === "hi"
                ? "वे पूर्व कर्मचारी जिनका दावा सिर्फ़ आप पर अटका है।"
                : "The former employees whose claim is blocked on something only you can fix."}
            </p>
          </div>
          <ButtonLink href="/employer" tone="secondary">
            <Users aria-hidden className="size-4" strokeWidth={1.8} />
            {lang === "hi" ? "सूची खोलें" : "Open the queue"}
          </ButtonLink>
        </Card>
      ) : null}

      {/* -------------------------------------------------------- Trust */}
      <section aria-labelledby="trust" className="space-y-3">
        <h2 id="trust" className="text-lg font-semibold tracking-[-0.01em] text-ink">
          {lang === "hi" ? "आप इस नतीजे पर भरोसा क्यों करें?" : "Why can you trust this result?"}
        </h2>
        <Card className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
          <Fact
            icon={<ShieldCheck aria-hidden className="size-4" strokeWidth={1.8} />}
            head={`${RULES.length} ${lang === "hi" ? "निश्चित जाँचें" : "deterministic checks"}`}
            body={
              lang === "hi"
                ? "कोई मॉडल पात्रता तय नहीं करता। वही तथ्य, वही नतीजा, हर बार।"
                : "No model decides eligibility. The same facts give the same verdict, every time."
            }
          />
          <Fact
            icon={<FileText aria-hidden className="size-4" strokeWidth={1.8} />}
            head={`${SOURCE_LIST.length} ${lang === "hi" ? "उद्धृत स्रोत" : "cited sources"}`}
            body={
              lang === "hi"
                ? "हर नियम के साथ स्रोत, जाँच की तारीख़ और भरोसे का स्तर दर्ज है।"
                : "Every rule carries its source, the date we last checked it, and how confident we are."
            }
          />
          <Fact
            icon={<Clock aria-hidden className="size-4" strokeWidth={1.8} />}
            head={lang === "hi" ? "कोई सरकारी संबंध नहीं" : "No government affiliation"}
            body={
              lang === "hi"
                ? "यह स्वतंत्र प्रोटोटाइप है। अंतिम निर्णय हमेशा EPFO का है।"
                : "An independent prototype. EPFO always makes the final decision."
            }
          />
        </Card>
        <p className="text-xs leading-relaxed text-ink-faint">
          <Link href="/sources" className="font-medium text-indigo-600 hover:text-indigo-700">
            {lang === "hi" ? "हर स्रोत देखें" : "See every source"}
          </Link>
          {result ? (
            <>
              {" · "}
              {lang === "hi" ? "इंजन संस्करण" : "Engine"} v{result.engineVersion}
            </>
          ) : null}
        </p>
      </section>
      <span className="sr-only" aria-live="polite">
        {ready ? t(copy.headline) : ui("loading")}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- Pieces */

function Fact({ icon, head, body }: { icon: React.ReactNode; head: string; body: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-indigo-600">{icon}</div>
      <p className="font-semibold text-ink">{head}</p>
      <p className="text-sm leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function PrimaryAction({ state }: { state: ReturnType<typeof claimState> }) {
  const { lang } = useLang();

  const map: Record<string, { href: string; label: string }> = {
    draft: { href: "/#start", label: lang === "hi" ? "मेरा दावा जाँचें" : "Check my claim" },
    preflight_required: {
      href: "/preflight",
      label: lang === "hi" ? "जाँच चलाएँ" : "Run the check",
    },
    blocked: {
      href: "/preflight",
      label: lang === "hi" ? "जो रुकावटें हैं, वे देखें" : "See what is blocking it",
    },
    ready: { href: "/claim", label: lang === "hi" ? "मेरा दावा भरें" : "File my claim" },
    submitted: { href: "/status", label: lang === "hi" ? "स्थिति देखें" : "Track this claim" },
    verification: { href: "/status", label: lang === "hi" ? "स्थिति देखें" : "Track this claim" },
    approved: { href: "/status", label: lang === "hi" ? "स्थिति देखें" : "Track this claim" },
    payment_released: {
      href: "/status",
      label: lang === "hi" ? "पूरा विवरण देखें" : "See the full record",
    },
  };

  const action = map[state];
  if (!action) return null;

  return (
    <ButtonLink href={action.href} size="lg">
      {action.label}
      <ArrowRight aria-hidden className="size-4" strokeWidth={1.8} />
    </ButtonLink>
  );
}

function ActionRow({ group }: { group: FixGroup }) {
  const { lang, t } = useLang();
  const lead = group.findings[0];
  const fix = group.owner === "employer" && lead.employerFix ? lead.employerFix : lead.fix;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-ink">{t(fix.summary)}</p>
          <p className="text-sm leading-relaxed text-ink-soft">
            {group.findings.map((f) => t(f.title)).join(lang === "hi" ? " · " : " · ")}
          </p>
        </div>
        <Badge tone={group.owner === "citizen" ? "caution" : "blocked"}>
          {lang === "hi" ? "किसका काम" : "Owner"}: {OWNER_LABEL[group.owner][lang]}
        </Badge>
      </div>

      {group.findings.length > 1 ? (
        <p className="mt-3 rounded-ctl border border-clear-100 bg-clear-50 p-2.5 text-xs leading-relaxed text-clear-700">
          {lang === "hi"
            ? `${group.findings.length} दिक़्क़तें, एक ही काम। एक बार में दोनों ठीक होंगी — समय दो बार नहीं लगेगा।`
            : `${group.findings.length} findings, one action. Both are corrected in the same visit, so the time is counted once.`}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-mute">
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-3.5" strokeWidth={1.8} />
          {group.minutes} {lang === "hi" ? "मिनट" : "min"}
        </span>
        <span>{t(fix.cost)}</span>
        {group.waitDays > 0 ? (
          <span>
            {lang === "hi"
              ? `फिर लगभग ${group.waitDays} दिन प्रोसेसिंग`
              : `then about ${group.waitDays} days of processing`}
          </span>
        ) : null}
        <SourceChip sourceId={lead.sourceId} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/preflight"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {lang === "hi" ? "इसे कैसे ठीक करें" : "How to fix it"}
          <ArrowRight aria-hidden className="size-3.5" strokeWidth={1.8} />
        </Link>
        {group.owner === "employer" ? <EmployerHandoff findings={group.findings} /> : null}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-10">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-13 w-48 rounded-ctl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    </div>
  );
}
