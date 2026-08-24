import { AUTOSETTLE_CEILING, ENGINE_VERSION, RULES, jdCategory } from "./rules";
import type { Facts, Finding, Fix, Owner, PreflightResult, Verdict } from "./types";

export { ENGINE_VERSION, jdCategory, AUTOSETTLE_CEILING };

const SEVERITY_ORDER = { blocker: 0, warning: 1, info: 2 } as const;
/** Employer- and EPFO-owned work comes first: it has the longest queue time. */
const OWNER_ORDER: Record<Owner, number> = { employer: 0, epfo: 1, citizen: 2, time: 3 };

/**
 * Run every rule against the citizen's situation.
 *
 * Deterministic and synchronous by design: no network, no model, no clock
 * dependence beyond the timestamp we stamp on the result. The same facts
 * always produce the same verdict, which is what makes this auditable and
 * what makes it safe to expose as an API (see docs/ARCHITECTURE.md).
 */
export function preflight(facts: Facts, now = new Date()): PreflightResult {
  const findings: Finding[] = [];

  for (const rule of RULES) {
    const hit = rule(facts);
    if (hit) findings.push(hit);
  }

  findings.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      OWNER_ORDER[a.owner] - OWNER_ORDER[b.owner],
  );

  const blockers = findings.filter((f) => f.severity === "blocker");
  const externallyBlocked = blockers.some(
    (f) => f.owner === "employer" || f.owner === "epfo",
  );

  const verdict: Verdict = blockers.length === 0
    ? "clear"
    : externallyBlocked
      ? "blocked_external"
      : "fixable";

  if (verdict === "clear" && facts.claimAmount <= AUTOSETTLE_CEILING) {
    findings.push({
      ruleId: "R-AUTOSETTLE",
      gate: "eligibility",
      severity: "info",
      owner: "epfo",
      title: {
        en: "This claim is in the auto-settlement range",
        hi: "यह दावा ऑटो-सेटलमेंट की सीमा में है",
      },
      why: {
        en: "Fully KYC-compliant claims up to ₹5 lakh are settled by the system without a human reviewer, typically within about three days. Your record has no blockers, so this is the path your claim should take.",
        hi: "पूरी तरह KYC-अनुपालक ₹5 लाख तक के दावे बिना किसी मानवीय जाँच के सिस्टम से ही निपट जाते हैं, आम तौर पर लगभग तीन दिन में। आपके रिकॉर्ड में कोई रुकावट नहीं है, इसलिए आपका दावा इसी रास्ते जाना चाहिए।",
      },
      fix: {
        summary: {
          en: "Nothing to do. File the claim.",
          hi: "कुछ नहीं करना है। दावा भर दें।",
        },
        steps: [],
        minutes: 0,
        cost: { en: "Free", hi: "निःशुल्क" },
        caveat: {
          en: "EPFO makes the final decision. A clear pre-flight removes the known causes of rejection; it is not a guarantee.",
          hi: "अंतिम निर्णय EPFO का है। साफ़ प्री-फ़्लाइट ख़ारिज होने के ज्ञात कारण हटा देती है; यह गारंटी नहीं है।",
        },
      },
      sourceId: "epfo-autosettle",
    });
  }

  const minutesToFix = billableMinutes(
    blockers.filter((f) => f.owner === "citizen").map((f) => f.fix),
  );

  return {
    verdict,
    findings,
    counts: {
      blockers: blockers.length,
      warnings: findings.filter((f) => f.severity === "warning").length,
      infos: findings.filter((f) => f.severity === "info").length,
    },
    minutesToFix,
    owners: [...new Set(blockers.map((f) => f.owner))],
    engineVersion: ENGINE_VERSION,
    evaluatedAt: now.toISOString(),
  };
}

/**
 * Active effort across a set of fixes, counting each distinct action once.
 *
 * Two findings can be one trip: correcting a name and a date of birth is a
 * single visit to Modify Basic Details, and a single Joint Declaration covers
 * both fields. Summing per finding quotes the same ten minutes twice.
 */
export function billableMinutes(fixes: Fix[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const [i, fix] of fixes.entries()) {
    const key = fix.fixKey ?? `#${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    total += fix.minutes;
  }
  return total;
}

/** Longest queue time across all fixes — the honest "when can I file" answer. */
export function daysUntilFilable(result: PreflightResult): number {
  return result.findings
    .filter((f) => f.severity === "blocker")
    .reduce((max, f) => Math.max(max, f.fix.waitDays ?? 0), 0);
}
