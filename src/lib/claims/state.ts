import type { ClaimState } from "@/lib/db/store";
import type { Bi, Owner, PreflightResult } from "@/lib/rules/types";

export type { ClaimState };

/**
 * The claim lifecycle, as one pure function.
 *
 * Every screen asks the same question — "what is happening with my claim, and
 * what should I do next?" — so the answer is computed in exactly one place
 * from exactly two inputs. Booleans scattered across pages is how a product
 * ends up telling a citizen two different things on two screens.
 *
 * There is no readiness *percentage*. A number implies a precision the engine
 * does not have; a state can be explained, and every state below maps to a
 * sentence a person can act on.
 */

export interface CaseShape {
  facts?: unknown;
  preflightAt?: string;
  claim?: { stage: number };
}

/** Stage index into the simulated status timeline → lifecycle state. */
const STAGE_STATE: ClaimState[] = [
  "submitted",
  "submitted",
  "verification",
  "approved",
  "payment_released",
];

export function claimState(c: CaseShape | null | undefined, result: PreflightResult | null): ClaimState {
  if (c?.claim) return STAGE_STATE[Math.min(Math.max(c.claim.stage, 0), STAGE_STATE.length - 1)];
  if (!c?.facts) return "draft";
  if (!c.preflightAt) return "preflight_required";
  if (!result) return "preflight_required";
  return result.counts.blockers > 0 ? "blocked" : "ready";
}

export const TERMINAL: ClaimState[] = ["payment_released"];
export const FILED: ClaimState[] = ["submitted", "verification", "approved", "payment_released"];

export function isFiled(state: ClaimState): boolean {
  return FILED.includes(state);
}

/**
 * The headline, the explanation, and who is being waited on — bilingual, and
 * derived, never written down per page.
 */
export interface StateCopy {
  label: Bi;
  headline: Bi;
  detail: Bi;
  tone: "neutral" | "indigo" | "blocked" | "caution" | "clear";
  /** Null when nothing is owed by anyone right now. */
  waitingOn: Owner | null;
}

export function describe(state: ClaimState, blockers = 0, owners: Owner[] = []): StateCopy {
  switch (state) {
    case "draft":
      return {
        label: { en: "Not started", hi: "शुरू नहीं हुआ" },
        headline: { en: "You haven't checked a claim yet.", hi: "आपने अभी कोई दावा नहीं जाँचा।" },
        detail: {
          en: "Five plain questions and we run every check EPFO will run — before you file, not twenty days after.",
          hi: "पाँच आसान सवाल, और हम वही सब जाँच चलाते हैं जो EPFO चलाएगा — दावा भरने से पहले, बीस दिन बाद नहीं।",
        },
        tone: "neutral",
        waitingOn: "citizen",
      };
    case "preflight_required":
      return {
        label: { en: "Check not run", hi: "जाँच बाक़ी है" },
        headline: { en: "Your answers are saved. The check hasn't run yet.", hi: "आपके जवाब सहेजे गए हैं। जाँच अभी नहीं चली।" },
        detail: {
          en: "Pick up where you left off. Nothing is submitted anywhere until you say so.",
          hi: "जहाँ छोड़ा था वहीं से आगे बढ़ें। जब तक आप न कहें, कहीं कुछ नहीं भेजा जाता।",
        },
        tone: "indigo",
        waitingOn: "citizen",
      };
    case "blocked": {
      const external = owners.includes("employer") || owners.includes("epfo");
      return {
        label: { en: "Needs attention", hi: "ध्यान चाहिए" },
        headline: {
          en: `${blockers} ${blockers === 1 ? "thing" : "things"} will stop this claim.`,
          hi: `${blockers} चीज़ें इस दावे को रोक देंगी।`,
        },
        detail: external
          ? {
              en: "One of them is not yours to fix. Start that part today — it has the longest queue.",
              hi: "इनमें से एक आपके हाथ में नहीं है। वह हिस्सा आज ही शुरू करें — उसमें सबसे लंबा इंतज़ार है।",
            }
          : {
              en: "All of them are yours to fix, and all of them are free.",
              hi: "सभी आप ख़ुद ठीक कर सकते हैं, और सभी निःशुल्क हैं।",
            },
        tone: external ? "blocked" : "caution",
        waitingOn: external ? (owners.includes("employer") ? "employer" : "epfo") : "citizen",
      };
    }
    case "ready":
      return {
        label: { en: "Ready to file", hi: "भरने के लिए तैयार" },
        headline: { en: "Your claim is ready to file.", hi: "आपका दावा भरने के लिए तैयार है।" },
        detail: {
          en: "Nothing in your record will stop it. EPFO still makes the final decision.",
          hi: "आपके रिकॉर्ड में कुछ भी इसे नहीं रोकेगा। अंतिम निर्णय फिर भी EPFO का है।",
        },
        tone: "clear",
        waitingOn: null,
      };
    case "submitted":
      return {
        label: { en: "Submitted", hi: "भेज दिया गया" },
        headline: { en: "Your claim is in.", hi: "आपका दावा भेज दिया गया।" },
        detail: {
          en: "Nothing is needed from you. If that changes, this page will say exactly what and why.",
          hi: "आपसे कुछ नहीं चाहिए। ज़रूरत पड़ी तो यहीं साफ़ लिखा जाएगा कि क्या और क्यों।",
        },
        tone: "indigo",
        waitingOn: "epfo",
      };
    case "verification":
      return {
        label: { en: "Verification", hi: "सत्यापन" },
        headline: { en: "Your record is being matched against the claim.", hi: "आपका रिकॉर्ड दावे से मिलाया जा रहा है।" },
        detail: {
          en: "This is the step that fails when something does not match — and the step you cleared before filing.",
          hi: "कुछ न मिलने पर यही चरण फ़ेल होता है — और यही चरण आपने भरने से पहले साफ़ कर लिया था।",
        },
        tone: "indigo",
        waitingOn: "epfo",
      };
    case "approved":
      return {
        label: { en: "Approved", hi: "मंज़ूर" },
        headline: { en: "A settlement order has been passed.", hi: "निपटान आदेश पारित हो गया।" },
        detail: {
          en: "The amount is final. Payment to your verified account is the next and last step.",
          hi: "राशि तय हो गई। अगला और आख़िरी चरण आपके सत्यापित खाते में भुगतान है।",
        },
        tone: "clear",
        waitingOn: "epfo",
      };
    case "payment_released":
      return {
        label: { en: "Paid", hi: "भुगतान हो गया" },
        headline: { en: "Your money has been released.", hi: "आपका पैसा भेज दिया गया।" },
        detail: {
          en: "Banks can take one to two working days to show it. Nothing further is needed from you.",
          hi: "बैंक में दिखने में एक-दो कार्यदिवस लग सकते हैं। आपसे और कुछ नहीं चाहिए।",
        },
        tone: "clear",
        waitingOn: null,
      };
  }
}
