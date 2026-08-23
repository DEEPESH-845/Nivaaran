import type { Facts } from "./types";

/**
 * Apply the effect of a completed fix to the citizen's facts, so preflight can
 * be re-run and the citizen can watch a blocker disappear.
 *
 * In production this would be a fresh read of the member record. In the
 * prototype it is a pure, explicit transform — which is also what makes the
 * "mark as done → re-check" loop honest: we show exactly what we assumed.
 */
export function applyFix(facts: Facts, ruleId: string): Facts {
  const next: Facts = structuredClone(facts);
  const { records } = next;

  switch (ruleId) {
    case "R-AADHAAR-SEED":
      next.uanAadhaarVerified = "yes";
      break;
    case "R-EXIT-DATE":
      next.exitDateFiled = "yes";
      break;
    case "R-MULTI-UAN":
      next.multipleUans = "no";
      break;
    case "R-NAME-AADHAAR":
      // The citizen corrects EPFO to match Aadhaar, never the other way round.
      if (records.aadhaar) records.epfo.name = records.aadhaar.name;
      break;
    case "R-DOB-AADHAAR":
      if (records.aadhaar) records.epfo.dob = records.aadhaar.dob;
      break;
    case "R-BANK-NAME":
      if (records.bank) records.bank.name = records.epfo.name;
      break;
    case "R-IFSC": {
      // Demonstration substitution: a merged bank issues a fresh, valid code.
      const replacement = "UBIN0801234";
      if (records.bank) records.bank.ifsc = replacement;
      records.epfo.ifsc = replacement;
      break;
    }
    case "R-WAIT-60D":
      next.daysSinceExit = Math.max(next.daysSinceExit, 60);
      break;
    case "R-TDS-192A":
      next.panOnRecord = true;
      break;
    default:
      break;
  }
  return next;
}
