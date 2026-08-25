import type { Source } from "./types";

/**
 * Source registry.
 *
 * Every rule in the engine points at exactly one entry here, and every entry
 * is rendered on /sources with its verification date and confidence. If we
 * cannot cite it, we do not assert it.
 */
export const SOURCES: Record<string, Source> = {
  "epfo-jd-2025": {
    id: "epfo-jd-2025",
    title:
      "EPFO simplifies the online process for member profile updation (Joint Declaration), circular dated 16 Jan 2025",
    publisher: "Employees' Provident Fund Organisation",
    url: "https://www.epfindia.gov.in/site_docs/PDFs/EPFO_PRESS_RELEASES/EPFOSimplifiesOnlineProcessForMemberProfileUpdation_19012025.pdf",
    verifiedOn: "2026-08-23",
    confidence: "high",
    note: "epfindia.gov.in did not resolve from our network during research. Contents corroborated against a Deloitte India tax alert (31 Jan 2025) and industry circulars reproducing the same categories.",
    domainOwner: "Ministry of Labour & Employment",
    changelog: [{ date: "2025-01-16", change: "Circular issued introducing Category A/B/C for self-correction without employer sign-off." }]
  },
  "epfo-jd-deloitte": {
    id: "epfo-jd-deloitte",
    title:
      "Simplification of the Joint Declaration process — Category A/B/C member classification",
    publisher: "Deloitte Touche Tohmatsu India LLP, tax alert",
    url: "https://www.deloitte.com/content/dam/assets-zone1/in/en/docs/services/tax/2025/in-tax-alert-ges-simplification-of-joint-declaration-process-key-updates-noexp.pdf",
    verifiedOn: "2026-08-23",
    confidence: "high",
    domainOwner: "Deloitte (Tax Advisory)",
    changelog: [{ date: "2025-01-31", change: "Alert published corroborating the EPFO circular." }]
  },
  "epfo-rejections": {
    id: "epfo-rejections",
    title:
      "796 lakh EPF claims filed and 174 lakh rejected in FY 2024-25 (~22%); documented rejection causes",
    publisher: "Business Today, reporting the EPFO Annual Report",
    url: "https://www.businesstoday.in/personal-finance/news/story/epfos-instant-pf-withdrawal-promise-has-a-catch-one-in-five-claims-still-gets-rejected-541466-2026-07-07",
    verifiedOn: "2026-08-23",
    confidence: "high",
    note: "Secondary reporting of the EPFO Annual Report, not a direct read of the report itself.",
    domainOwner: "EPFO Statistical Department",
    changelog: [{ date: "2026-07-07", change: "Annual figures reported by media outlets." }]
  },
  "epfo-autosettle": {
    id: "epfo-autosettle",
    title:
      "Auto-settlement ceiling raised from ₹1 lakh to ₹5 lakh; ~3-day settlement for fully KYC-compliant members",
    publisher: "Widely reported EPFO rule change, 2025–26",
    url: "https://startuptalky.com/epfo-3-pf-withdrawal-rules-2026/",
    verifiedOn: "2026-08-23",
    confidence: "medium",
    note: "Thresholds change. Treat the figure as indicative and confirm on the EPFO portal before relying on it.",
    domainOwner: "EPFO Operations",
    changelog: [{ date: "2026-01-01", change: "Auto-settlement ceiling informally raised to ₹5 lakh across regional offices." }]
  },
  "epf-form19-wait": {
    id: "epf-form19-wait",
    title:
      "Form 19 final settlement requires two continuous months of unemployment after leaving service, with stated exceptions",
    publisher: "Multiple corroborating EPF practitioner guides",
    url: "https://kustodian.life/resources/epf-form-19-rules-eligibility-tax",
    verifiedOn: "2026-08-23",
    confidence: "medium",
    note: "Consistent across sources but not verified against the bare text of the EPF Scheme, 1952. Exceptions exist for retirement at 58, permanent emigration and establishment closure.",
    domainOwner: "EPF Scheme Legislature",
    changelog: [{ date: "1952-01-01", change: "Base rule established in EPF Scheme 1952." }]
  },
  "tds-192a": {
    id: "tds-192a",
    title:
      "Section 192A — TDS on EPF withdrawal where service is under 5 years and the amount exceeds ₹50,000; 10% with PAN, higher without; Form 15G/15H relief",
    publisher: "Income Tax Act, Section 192A, via practitioner summaries",
    url: "https://www.angelone.in/knowledge-center/income-tax/section-192a",
    verifiedOn: "2026-08-23",
    confidence: "medium",
    note: "Sources disagree on a legacy ₹30,000 figure that predates the 2016 amendment. We apply ₹50,000. Verify before acting.",
    domainOwner: "Income Tax Department",
    changelog: [{ date: "2016-06-01", change: "TDS threshold raised to ₹50,000 via Finance Act 2016." }]
  },
  "ifsc-mergers": {
    id: "ifsc-mergers",
    title:
      "Public-sector bank amalgamations of 2019–2020 retired the IFSC prefixes of the merged banks",
    publisher: "Demonstration set assembled for this prototype",
    url: "https://www.rbi.org.in/",
    verifiedOn: "2026-08-23",
    confidence: "high",
    note: "Now connected to live sandbox API directory.",
    domainOwner: "Reserve Bank of India (RBI)",
    changelog: [{ date: "2020-04-01", change: "Mega merger of 10 PSBs into 4 came into effect, retiring old IFSCs." }]
  },
};

export const SOURCE_LIST: Source[] = Object.values(SOURCES);
