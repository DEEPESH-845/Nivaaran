import { compareDates, compareNames } from "@/lib/match/name";
import type { Bi, Facts, Finding, JdCategory } from "./types";

export const ENGINE_VERSION = "1.0.0";

/**
 * EPFO's Jan-2025 Joint Declaration categories decide the single most
 * important thing a citizen needs to know: can I fix my own record, or do I
 * need my employer?
 */
export function jdCategory(f: Facts): JdCategory {
  if (f.uanAadhaarVerified !== "yes") return "C";
  if (f.uanBeforeOct2017 === "no") return "A";
  return "B";
}

const PORTAL = "https://unifiedportal-mem.epfindia.gov.in/memberinterface/";
const EMPLOYER_PORTAL = "https://unifiedportal-emp.epfindia.gov.in/epfo/";
const IFSC_SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** A syntactically valid IFSC is always four letters, a zero, then six letters or digits. */
export function isValidIfscFormat(value: string): boolean {
  return IFSC_SHAPE.test(value.trim().toUpperCase());
}

/**
 * Employer steps are written at the level our sources actually support — the
 * action, never a click path. `epfindia.gov.in` did not resolve from our
 * network during research (see SOURCES["epfo-jd-2025"]), so every employer fix
 * carries this caveat rather than pretending to a verified navigation.
 */
const EMPLOYER_CAVEAT: Bi = {
  en: "Menu names differ by establishment and portal version. This describes the action to take, not a verified click path — we could not reach epfindia.gov.in to confirm one.",
  hi: "मेन्यू के नाम हर प्रतिष्ठान और पोर्टल संस्करण में अलग होते हैं। यहाँ किया जाने वाला काम बताया गया है, कोई सत्यापित क्लिक-पथ नहीं — हम पुष्टि के लिए epfindia.gov.in तक नहीं पहुँच सके।",
};

/**
 * One Joint Declaration covers every field it lists, so the name and the date
 * of birth share this fix and are billed once. Reached only for Category C
 * members, who cannot self-correct.
 */
function employerJdFix(field: Bi) {
  return {
    summary: {
      en: "This member's UAN is not Aadhaar-validated, so they cannot correct their own record. The correction needs a Joint Declaration that you attest and forward.",
      hi: "इस सदस्य का UAN आधार-सत्यापित नहीं है, इसलिए वे अपना रिकॉर्ड ख़ुद नहीं सुधार सकते। सुधार के लिए जॉइंट डिक्लेरेशन चाहिए, जिसे आप प्रमाणित करके आगे भेजेंगे।",
    },
    steps: [
      {
        en: `Ask them to raise the Joint Declaration for their ${field.en}, and to link and validate their Aadhaar with their UAN — that alone may move them into the self-service category and end your involvement.`,
        hi: `उनसे कहें कि वे अपने ${field.hi} के लिए जॉइंट डिक्लेरेशन दें, और अपने UAN से आधार जोड़कर सत्यापित कराएँ — सिर्फ़ इतने से ही वे ख़ुद-सुधार वाली श्रेणी में आ सकते हैं और आपका काम ख़त्म।`,
      },
      {
        en: "Attest the declaration against your own establishment records. The value EPFO will accept is the one on their Aadhaar, not the one in your HR system.",
        hi: "अपने प्रतिष्ठान के रिकॉर्ड से मिलाकर घोषणा प्रमाणित करें। EPFO वही मान स्वीकार करेगा जो उनके आधार पर है, आपके HR सिस्टम वाला नहीं।",
      },
      {
        en: "Forward it to your EPFO field office and give the member the acknowledgement number, so they can stop guessing whether it moved.",
        hi: "उसे अपने EPFO फ़ील्ड ऑफ़िस को भेजें और सदस्य को पावती संख्या दें, ताकि उन्हें अंदाज़ा न लगाना पड़े कि काम आगे बढ़ा या नहीं।",
      },
    ],
    minutes: 20,
    fixKey: "employer-jd",
    cost: { en: "Free", hi: "निःशुल्क" },
    waitDays: 20,
    officialUrl: EMPLOYER_PORTAL,
    officialLabel: {
      en: "EPFO Employer Unified Portal",
      hi: "EPFO नियोक्ता यूनिफ़ाइड पोर्टल",
    },
    caveat: EMPLOYER_CAVEAT,
  };
}

// The IFSC dictionary and regex shape are now served dynamically via /api/ifsc.
// See src/app/api/ifsc/route.ts.

/** Self-correction path, phrased by the category the member falls into. */
function correctionFix(cat: JdCategory, field: Bi) {
  if (cat === "A" || cat === "B") {
    return {
      summary: {
        en: `Correct your ${field.en} yourself on the EPFO portal. No documents, no employer approval, no fee.`,
        hi: `EPFO पोर्टल पर अपना ${field.hi} ख़ुद ठीक करें। न कोई दस्तावेज़, न नियोक्ता की मंज़ूरी, न कोई शुल्क।`,
      },
      steps: [
        {
          en: "Sign in to the EPFO Unified Member Portal with your UAN.",
          hi: "अपने UAN से EPFO यूनिफ़ाइड मेंबर पोर्टल में साइन इन करें।",
        },
        {
          en: "Open Manage → Modify Basic Details.",
          hi: "Manage → Modify Basic Details खोलें।",
        },
        {
          en: `Enter your ${field.en} exactly as it appears on your Aadhaar — every letter, every space.`,
          hi: `अपना ${field.hi} बिल्कुल वैसा ही भरें जैसा आधार पर है — हर अक्षर, हर जगह।`,
        },
        {
          en:
            cat === "A"
              ? "Submit. Your request is self-approved — nobody else has to act."
              : "Submit. Aadhaar-validated members can approve this themselves; a small number of cases still route to EPFO.",
          hi:
            cat === "A"
              ? "सबमिट करें। आपका अनुरोध ख़ुद ही मंज़ूर हो जाता है — किसी और को कुछ नहीं करना है।"
              : "सबमिट करें। आधार-सत्यापित सदस्य इसे ख़ुद मंज़ूर कर सकते हैं; कुछ मामले अब भी EPFO के पास जाते हैं।",
        },
      ],
      minutes: 10,
      fixKey: "member-basic-details",
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: cat === "A" ? 0 : 3,
      officialUrl: PORTAL,
      officialLabel: {
        en: "EPFO Unified Member Portal",
        hi: "EPFO यूनिफ़ाइड मेंबर पोर्टल",
      },
    };
  }
  return {
    summary: {
      en: `Your UAN is not Aadhaar-validated, so this correction needs a Joint Declaration with your employer.`,
      hi: `आपका UAN आधार से सत्यापित नहीं है, इसलिए इस सुधार के लिए नियोक्ता के साथ जॉइंट डिक्लेरेशन देना होगा।`,
    },
    steps: [
      {
        en: "Link and validate your Aadhaar with your UAN first — this alone may move you into the self-service category.",
        hi: "पहले अपने UAN से आधार जोड़ें और सत्यापित कराएँ — सिर्फ़ इतने से ही आप ख़ुद-सुधार वाली श्रेणी में आ सकते हैं।",
      },
      {
        en: "If it still cannot be self-corrected, file a Joint Declaration with your employer, who forwards it to EPFO.",
        hi: "अगर फिर भी ख़ुद सुधार न हो सके, तो नियोक्ता के साथ जॉइंट डिक्लेरेशन भरें, जिसे वे EPFO को भेजेंगे।",
      },
    ],
    minutes: 45,
    fixKey: "member-jd",
    cost: { en: "Free", hi: "निःशुल्क" },
    waitDays: 20,
    officialUrl: PORTAL,
    officialLabel: {
      en: "EPFO Unified Member Portal",
      hi: "EPFO यूनिफ़ाइड मेंबर पोर्टल",
    },
    caveat: {
      en: "Employer-dependent steps have no guaranteed turnaround. Start early.",
      hi: "नियोक्ता पर निर्भर चरणों की कोई तय समय-सीमा नहीं होती। जल्दी शुरू करें।",
    },
  };
}

import type { RuleFn } from "./types";

/* ------------------------------------------------------------------ *
 * The rule set. Deterministic, ordered, each one citing exactly one
 * entry in the source registry. No model is consulted here, ever.
 * ------------------------------------------------------------------ */

const nameVsAadhaar: RuleFn = (f) => {
  if (!f.records.aadhaar) return null;
  const verdict = compareNames(f.records.epfo.name, f.records.aadhaar.name);
  if (verdict.passes) return null;
  const cat = jdCategory(f);
  return {
    ruleId: "R-NAME-AADHAAR",
    gate: "identity",
    severity: "blocker",
    owner: cat === "C" ? "employer" : "citizen",
    title: {
      en: "Your name in EPFO does not match your Aadhaar",
      hi: "EPFO में दर्ज आपका नाम आधार से मेल नहीं खाता",
    },
    why: {
      en: "Auto-settlement compares these two names character by character. Any difference — even an initial standing in for a full middle name — stops the claim and pushes it to manual review, where this is one of the most common reasons for rejection.",
      hi: "ऑटो-सेटलमेंट दोनों नामों को अक्षर-दर-अक्षर मिलाता है। ज़रा-सा भी अंतर — जैसे पूरे बीच के नाम की जगह सिर्फ़ पहला अक्षर — दावे को रोक देता है और उसे मैनुअल जाँच में भेज देता है, जहाँ यह ख़ारिज होने का सबसे आम कारण है।",
    },
    evidence: {
      type: "name",
      aLabel: { en: "EPFO record", hi: "EPFO रिकॉर्ड" },
      bLabel: { en: "Your Aadhaar", hi: "आपका आधार" },
      a: f.records.epfo.name,
      b: f.records.aadhaar.name,
      verdict,
    },
    fix: correctionFix(cat, { en: "name", hi: "नाम" }),
    employerFix:
      cat === "C"
        ? employerJdFix({ en: "name", hi: "नाम" })
        : undefined,
    sourceId: "epfo-jd-2025",
  };
};

const dobVsAadhaar: RuleFn = (f) => {
  if (!f.records.aadhaar) return null;
  const verdict = compareDates(f.records.epfo.dob, f.records.aadhaar.dob);
  if (verdict.passes) return null;
  const cat = jdCategory(f);
  return {
    ruleId: "R-DOB-AADHAAR",
    gate: "identity",
    severity: "blocker",
    owner: cat === "C" ? "employer" : "citizen",
    title: {
      en:
        verdict.kind === "day_month_swap"
          ? "Your date of birth has the day and month swapped"
          : "Your date of birth in EPFO does not match your Aadhaar",
      hi:
        verdict.kind === "day_month_swap"
          ? "आपकी जन्मतिथि में दिन और महीना आपस में बदले हुए हैं"
          : "EPFO में दर्ज आपकी जन्मतिथि आधार से मेल नहीं खाती",
    },
    why: {
      en: "A date-of-birth mismatch is the single most common cause of pension-side rejection. A swapped day and month is enough — the system does not guess what you meant.",
      hi: "जन्मतिथि का मेल न खाना पेंशन से जुड़े दावे ख़ारिज होने का सबसे आम कारण है। दिन और महीने का आपस में बदल जाना ही काफ़ी है — सिस्टम अंदाज़ा नहीं लगाता।",
    },
    evidence: {
      type: "date",
      aLabel: { en: "EPFO record", hi: "EPFO रिकॉर्ड" },
      bLabel: { en: "Your Aadhaar", hi: "आपका आधार" },
      a: f.records.epfo.dob,
      b: f.records.aadhaar.dob,
      verdict,
    },
    fix: correctionFix(cat, { en: "date of birth", hi: "जन्मतिथि" }),
    employerFix:
      cat === "C"
        ? employerJdFix({ en: "date of birth", hi: "जन्मतिथि" })
        : undefined,
    sourceId: "epfo-jd-2025",
  };
};

const bankNameMatch: RuleFn = (f) => {
  if (!f.records.bank) return null;
  const verdict = compareNames(f.records.epfo.name, f.records.bank.name);
  if (verdict.passes) return null;
  return {
    ruleId: "R-BANK-NAME",
    gate: "banking",
    severity: "blocker",
    owner: "citizen",
    title: {
      en: "The name on your bank account does not match your EPFO record",
      hi: "आपके बैंक खाते का नाम EPFO रिकॉर्ड से मेल नहीं खाता",
    },
    why: {
      en: "Money is only released to an account whose holder name matches the EPFO record. If it does not, the transfer is refused even after the claim itself is approved.",
      hi: "पैसा केवल उसी खाते में भेजा जाता है जिसके खाताधारक का नाम EPFO रिकॉर्ड से मिलता हो। न मिलने पर दावा मंज़ूर होने के बाद भी ट्रांसफ़र रुक जाता है।",
    },
    evidence: {
      type: "name",
      aLabel: { en: "EPFO record", hi: "EPFO रिकॉर्ड" },
      bLabel: { en: "Bank passbook", hi: "बैंक पासबुक" },
      a: f.records.epfo.name,
      b: f.records.bank.name,
      verdict,
    },
    fix: {
      summary: {
        en: "Make the two names identical — either correct EPFO to match your Aadhaar, or ask your bank to update the account name.",
        hi: "दोनों नाम एक जैसे कराएँ — या तो EPFO में आधार के अनुसार सुधार करें, या बैंक से खाते का नाम अपडेट कराएँ।",
      },
      steps: [
        {
          en: "Decide which record is wrong by comparing both against your Aadhaar.",
          hi: "दोनों की तुलना आधार से करके तय करें कि कौन-सा रिकॉर्ड ग़लत है।",
        },
        {
          en: "Correct the EPFO side under Manage → Modify Basic Details, or visit your bank branch for the bank side.",
          hi: "EPFO वाला हिस्सा Manage → Modify Basic Details में सुधारें, या बैंक वाले हिस्से के लिए शाखा जाएँ।",
        },
        {
          en: "Re-add the corrected bank account under Manage → KYC and wait for it to show Verified.",
          hi: "सुधरा हुआ बैंक खाता Manage → KYC में दोबारा जोड़ें और Verified दिखने का इंतज़ार करें।",
        },
      ],
      minutes: 25,
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: 3,
      officialUrl: PORTAL,
      officialLabel: { en: "EPFO Unified Member Portal", hi: "EPFO यूनिफ़ाइड मेंबर पोर्टल" },
    },
    sourceId: "epfo-rejections",
  };
};

const ifscUsable: RuleFn = (f) => {
  const ifsc = (f.records.bank?.ifsc ?? f.records.epfo.ifsc ?? "").trim().toUpperCase();
  if (!ifsc) return null;

  // Format validation is intrinsic to the engine. A directory lookup can add
  // retirement information, but a missing lookup must never make bad input pass.
  if (!isValidIfscFormat(ifsc)) {
    return ifscFinding(ifsc, undefined);
  }

  // A directory lookup is optional. When available, it can additionally flag
  // a syntactically-valid IFSC that has been retired after a bank merger.
  const valid = f.records.bank?.ifsc ? (f.records.bank.ifscValid !== false) : (f.records.epfo.ifscValid !== false);
  if (valid) return null;

  const retired = f.records.bank?.ifsc ? f.records.bank.ifscRetiredTo : f.records.epfo.ifscRetiredTo;
  return ifscFinding(ifsc, retired);
};

function ifscFinding(ifsc: string, retired: string | undefined): Finding {
  const shapeBad = !retired;

  return {
    ruleId: "R-IFSC",
    gate: "banking",
    severity: "blocker",
    owner: "citizen",
    title: shapeBad
      ? {
          en: "That IFSC is not a valid code",
          hi: "यह IFSC मान्य कोड नहीं है",
        }
      : {
          en: "That IFSC belongs to a bank that no longer exists",
          hi: "यह IFSC उस बैंक का है जो अब मौजूद नहीं है",
        },
    why: shapeBad
      ? {
          en: "An IFSC is always four letters, then a zero, then six more characters. A code in any other shape will fail before the transfer is even attempted.",
          hi: "IFSC हमेशा चार अक्षर, फिर एक शून्य, फिर छह और अक्षर/अंक होता है। किसी और रूप का कोड ट्रांसफ़र की कोशिश से पहले ही फ़ेल हो जाता है।",
        }
      : {
          en: `${retired}. After a bank merger the old IFSC is retired, but EPFO keeps whatever was last saved. Claims routed to a retired code bounce, and the citizen is told only that the bank details are invalid.`,
          hi: `${retired}। बैंक विलय के बाद पुराना IFSC बंद हो जाता है, पर EPFO में वही पुराना दर्ज रहता है। बंद कोड पर भेजा गया दावा वापस आ जाता है और नागरिक को सिर्फ़ इतना बताया जाता है कि बैंक विवरण ग़लत है।`,
        },
    evidence: {
      type: "value",
      aLabel: { en: "IFSC on record", hi: "दर्ज IFSC" },
      bLabel: { en: "Status", hi: "स्थिति" },
      a: ifsc,
      b: shapeBad ? "Invalid format" : "Retired after merger",
    },
    fix: {
      summary: {
        en: "Get your current IFSC from your bank's app, a recent passbook entry or a cheque leaf, then update KYC on the portal.",
        hi: "अपना मौजूदा IFSC बैंक ऐप, हाल की पासबुक एंट्री या चेक से लें, फिर पोर्टल पर KYC अपडेट करें।",
      },
      steps: [
        {
          en: "Find the current IFSC — merged banks issue a new one even when the account number is unchanged.",
          hi: "मौजूदा IFSC पता करें — विलय वाले बैंक खाता संख्या वही रहने पर भी नया IFSC देते हैं।",
        },
        {
          en: "On the portal, open Manage → KYC, remove the old bank entry and add the account with the new IFSC.",
          hi: "पोर्टल पर Manage → KYC खोलें, पुरानी बैंक एंट्री हटाएँ और नया IFSC डालकर खाता जोड़ें।",
        },
        {
          en: "Wait for the entry to show Verified before filing your claim.",
          hi: "दावा भरने से पहले एंट्री के Verified दिखने का इंतज़ार करें।",
        },
      ],
      minutes: 15,
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: 3,
      caveat: {
        en: "Our retired-prefix list is a demonstration set, not the live NPCI directory. Always confirm with your bank.",
        hi: "बंद प्रीफ़िक्स की हमारी सूची सिर्फ़ प्रदर्शन के लिए है, लाइव NPCI डायरेक्टरी नहीं। हमेशा अपने बैंक से पुष्टि करें।",
      },
    },
    sourceId: "ifsc-mergers",
  };
}

const aadhaarSeeded: RuleFn = (f) => {
  if (f.uanAadhaarVerified === "yes") return null;
  const unsure = f.uanAadhaarVerified === "unsure";
  return {
    ruleId: "R-AADHAAR-SEED",
    gate: "kyc",
    severity: "blocker",
    owner: "citizen",
    title: unsure
      ? { en: "Check whether your UAN is Aadhaar-verified", hi: "जाँचें कि आपका UAN आधार-सत्यापित है या नहीं" }
      : { en: "Your UAN is not Aadhaar-verified", hi: "आपका UAN आधार से सत्यापित नहीं है" },
    why: {
      en: "Aadhaar verification is the gate for everything else: online claims, auto-settlement, and the ability to correct your own records without your employer. Nothing downstream works until this shows Verified.",
      hi: "आधार सत्यापन बाक़ी सब का दरवाज़ा है: ऑनलाइन दावा, ऑटो-सेटलमेंट, और नियोक्ता के बिना अपने रिकॉर्ड ख़ुद सुधारने की सुविधा। जब तक यह Verified न दिखे, आगे कुछ नहीं चलता।",
    },
    fix: {
      summary: {
        en: "Seed and verify your Aadhaar against your UAN on the member portal.",
        hi: "मेंबर पोर्टल पर अपने UAN से आधार जोड़ें और सत्यापित कराएँ।",
      },
      steps: [
        { en: "Sign in with your UAN and open Manage → KYC.", hi: "अपने UAN से साइन इन करें और Manage → KYC खोलें।" },
        { en: "Add your Aadhaar number and submit for verification.", hi: "अपना आधार नंबर जोड़ें और सत्यापन के लिए भेजें।" },
        { en: "Confirm the status reads Verified, not merely Approved by establishment.", hi: "निवारण करें कि स्थिति Verified लिखी हो, सिर्फ़ Approved by establishment नहीं।" },
      ],
      minutes: 15,
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: 3,
      officialUrl: PORTAL,
      officialLabel: { en: "EPFO Unified Member Portal", hi: "EPFO यूनिफ़ाइड मेंबर पोर्टल" },
    },
    sourceId: "epfo-jd-2025",
  };
};

const exitDateFiled: RuleFn = (f) => {
  if (f.exitDateFiled === "yes") return null;
  const cat = jdCategory(f);
  const selfServe = cat === "A" || cat === "B";
  return {
    ruleId: "R-EXIT-DATE",
    gate: "employment",
    severity: "blocker",
    owner: selfServe ? "citizen" : "employer",
    title: {
      en: "Your date of exit has not been recorded",
      hi: "आपकी नौकरी छोड़ने की तारीख़ दर्ज नहीं है",
    },
    why: {
      en: "EPFO cannot settle a final claim while your account still looks active. Until an exit date exists, the system believes you are still employed — and a final settlement for a currently-employed member is rejected by design.",
      hi: "जब तक आपका खाता चालू दिखता है, EPFO अंतिम दावा निपटा नहीं सकता। जब तक छोड़ने की तारीख़ दर्ज न हो, सिस्टम मानता है कि आप अब भी नौकरी में हैं — और कार्यरत सदस्य का अंतिम दावा नियमतः ख़ारिज होता है।",
    },
    evidence: {
      type: "note",
      text:
        f.exitDateFiled === "unsure"
          ? {
              en: "You were not sure. Sign in and check Service History — this is the single most common invisible blocker.",
              hi: "आपको निवारण नहीं पता था। साइन इन करके Service History देखें — यह सबसे आम छिपी हुई रुकावट है।",
            }
          : selfServe
            ? {
                en: "Your previous employer has not filed it — but because your UAN is Aadhaar-verified, you do not have to wait for them.",
                hi: "आपके पिछले नियोक्ता ने इसे दर्ज नहीं किया — पर चूँकि आपका UAN आधार-सत्यापित है, आपको उनका इंतज़ार नहीं करना पड़ेगा।",
              }
            : {
                en: "Your previous employer has not filed it, and on an unverified UAN only they can.",
                hi: "आपके पिछले नियोक्ता ने इसे दर्ज नहीं किया, और असत्यापित UAN पर यह केवल वही कर सकते हैं।",
              },
    },
    fix: selfServe
      ? {
          summary: {
            en: "Because your UAN is Aadhaar-verified, you can record your own date of exit — you do not have to wait for your employer.",
            hi: "चूँकि आपका UAN आधार-सत्यापित है, आप अपनी छोड़ने की तारीख़ ख़ुद दर्ज कर सकते हैं — नियोक्ता का इंतज़ार ज़रूरी नहीं।",
          },
          steps: [
            { en: "Sign in and open Manage → Mark Exit.", hi: "साइन इन करें और Manage → Mark Exit खोलें।" },
            { en: "Pick the establishment, enter your real last working day and the reason for leaving.", hi: "प्रतिष्ठान चुनें, अपना असली अंतिम कार्यदिवस और छोड़ने का कारण भरें।" },
            { en: "Verify with the Aadhaar OTP and confirm the date now shows in Service History.", hi: "आधार OTP से सत्यापित करें और देखें कि तारीख़ अब Service History में दिख रही है।" },
          ],
          minutes: 10,
          cost: { en: "Free", hi: "निःशुल्क" },
          waitDays: 0,
          officialUrl: PORTAL,
          officialLabel: { en: "EPFO Unified Member Portal", hi: "EPFO यूनिफ़ाइड मेंबर पोर्टल" },
          caveat: {
            en: "Member-side exit marking is generally available two months after leaving. If the option is greyed out, your employer must file it.",
            hi: "सदस्य द्वारा एग्ज़िट दर्ज करना आम तौर पर नौकरी छोड़ने के दो महीने बाद उपलब्ध होता है। विकल्प निष्क्रिय हो तो नियोक्ता को ही दर्ज करना होगा।",
          },
        }
      : {
          summary: {
            en: "Only your previous employer can file this. Ask them directly — this is not something you can do yourself yet.",
            hi: "यह केवल आपका पिछला नियोक्ता दर्ज कर सकता है। उनसे सीधे कहें — फ़िलहाल आप ख़ुद यह नहीं कर सकते।",
          },
          steps: [
            {
              en: "Message your previous HR: \"Please mark my date of exit in the EPFO employer portal for UAN [your UAN]. My last working day was [date].\"",
              hi: "पिछले HR को लिखें: \"कृपया EPFO नियोक्ता पोर्टल पर UAN [आपका UAN] के लिए मेरी एग्ज़िट तारीख़ दर्ज करें। मेरा अंतिम कार्यदिवस [तारीख़] था।\"",
            },
            {
              en: "Verify it in Service History yourself afterwards — do not take a verbal confirmation.",
              hi: "बाद में Service History में ख़ुद जाँचें — ज़ुबानी पुष्टि पर भरोसा न करें।",
            },
            {
              en: "If they do not act, raise a grievance on EPFiGMS naming the establishment.",
              hi: "अगर वे न करें, तो EPFiGMS पर प्रतिष्ठान का नाम देकर शिकायत दर्ज करें।",
            },
          ],
          minutes: 15,
          cost: { en: "Free", hi: "निःशुल्क" },
          waitDays: 14,
          caveat: {
            en: "This step depends on someone else and has no guaranteed turnaround. Start it before anything else.",
            hi: "यह चरण किसी और पर निर्भर है और इसकी कोई तय समय-सीमा नहीं। इसे सबसे पहले शुरू करें।",
          },
        },
    employerFix: {
      summary: {
        en: "Record this member's date of exit against their UAN. It is the most common reason a former employee's claim is rejected, and until an unverified UAN is fixed, only you can file it.",
        hi: "इस सदस्य की नौकरी छोड़ने की तारीख़ उनके UAN पर दर्ज करें। पूर्व कर्मचारी का दावा ख़ारिज होने का यह सबसे आम कारण है, और असत्यापित UAN पर यह केवल आप ही दर्ज कर सकते हैं।",
      },
      steps: [
        {
          en: "Open their record by UAN in the employer portal for your establishment.",
          hi: "अपने प्रतिष्ठान के नियोक्ता पोर्टल में उनके UAN से उनका रिकॉर्ड खोलें।",
        },
        {
          en: "Enter their real last working day and the reason for leaving. A guessed date creates a different rejection later.",
          hi: "उनका असली अंतिम कार्यदिवस और छोड़ने का कारण भरें। अंदाज़े से भरी तारीख़ आगे चलकर दूसरी ख़ारिजी बनाती है।",
        },
        {
          en: "Approve it with your establishment's digital signature or e-Sign, and tell the member it is filed.",
          hi: "अपने प्रतिष्ठान के डिजिटल हस्ताक्षर या e-Sign से मंज़ूर करें, और सदस्य को बता दें कि दर्ज हो गया।",
        },
      ],
      minutes: 3,
      fixKey: "employer-exit-date",
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: 0,
      officialUrl: EMPLOYER_PORTAL,
      officialLabel: {
        en: "EPFO Employer Unified Portal",
        hi: "EPFO नियोक्ता यूनिफ़ाइड पोर्टल",
      },
      caveat: EMPLOYER_CAVEAT,
    },
    sourceId: "epfo-jd-deloitte",
  };
};

const singleUan: RuleFn = (f) => {
  if (f.multipleUans !== "yes") return null;
  return {
    ruleId: "R-MULTI-UAN",
    gate: "kyc",
    severity: "blocker",
    owner: "citizen",
    title: { en: "You have more than one UAN", hi: "आपके एक से ज़्यादा UAN हैं" },
    why: {
      en: "A second UAN is usually created when a new employer does not find your old one. Your service is then split across two numbers, so a claim filed on either shows an incomplete history and is rejected.",
      hi: "दूसरा UAN आम तौर पर तब बनता है जब नया नियोक्ता आपका पुराना UAN नहीं ढूँढ़ पाता। आपकी सेवा दो नंबरों में बँट जाती है, इसलिए किसी भी एक पर किया गया दावा अधूरा इतिहास दिखाकर ख़ारिज हो जाता है।",
    },
    fix: {
      summary: {
        en: "Merge them: keep the Aadhaar-linked UAN and transfer the old account into it.",
        hi: "इन्हें मिलाएँ: आधार से जुड़ा UAN रखें और पुराना खाता उसी में ट्रांसफ़र कराएँ।",
      },
      steps: [
        { en: "Identify which UAN is Aadhaar-linked and currently active.", hi: "पता करें कौन-सा UAN आधार से जुड़ा और चालू है।" },
        { en: "File a transfer request (Form 13) under Online Services → One Member One EPF Account.", hi: "Online Services → One Member One EPF Account में ट्रांसफ़र अनुरोध (फ़ॉर्म 13) दर्ज करें।" },
        { en: "Wait for the passbook to show the merged balance before filing a final claim.", hi: "अंतिम दावा भरने से पहले पासबुक में मिली-जुली राशि दिखने का इंतज़ार करें।" },
      ],
      minutes: 20,
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: 20,
      officialUrl: PORTAL,
      officialLabel: { en: "EPFO Unified Member Portal", hi: "EPFO यूनिफ़ाइड मेंबर पोर्टल" },
    },
    sourceId: "epfo-rejections",
  };
};

const twoMonthWait: RuleFn = (f) => {
  if (f.intent !== "final_settlement") return null;
  if (f.daysSinceExit >= 60) return null;
  const remaining = 60 - f.daysSinceExit;
  return {
    ruleId: "R-WAIT-60D",
    gate: "eligibility",
    severity: "blocker",
    owner: "time",
    title: {
      en: `A final settlement can be filed ${remaining} more ${remaining === 1 ? "day" : "days"} from now`,
      hi: `अंतिम निपटान का दावा अब से ${remaining} दिन बाद भरा जा सकता है`,
    },
    why: {
      en: "Final settlement requires two continuous months of unemployment after your last working day. Filing earlier is the one rejection that costs you nothing to avoid — you simply wait. If you need money sooner, an advance is a different route with different rules.",
      hi: "अंतिम निपटान के लिए अंतिम कार्यदिवस के बाद लगातार दो महीने बेरोज़गार रहना ज़रूरी है। इससे पहले दावा करना वह अकेली ख़ारिजी है जिसे टालना मुफ़्त है — बस इंतज़ार करें। अगर पैसा जल्दी चाहिए तो एडवांस अलग रास्ता है, जिसके नियम अलग हैं।",
    },
    evidence: {
      type: "value",
      aLabel: { en: "Days since you left", hi: "नौकरी छोड़े दिन" },
      bLabel: { en: "Required", hi: "ज़रूरी" },
      a: String(f.daysSinceExit),
      b: "60",
    },
    fix: {
      summary: {
        en: "Wait, and use the time to clear every other blocker so the claim settles on the first attempt.",
        hi: "इंतज़ार करें, और इस दौरान बाक़ी सारी रुकावटें दूर कर लें ताकि दावा पहली ही बार में निपट जाए।",
      },
      steps: [
        { en: "Fix the record problems listed here while you wait — they take longer than the wait itself if left late.", hi: "इंतज़ार के दौरान यहाँ बताई गई रिकॉर्ड की दिक़्क़तें ठीक करें — देर से शुरू करने पर वे इंतज़ार से भी ज़्यादा समय लेती हैं।" },
        { en: "File on or after day 60.", hi: "60वें दिन या उसके बाद दावा भरें।" },
      ],
      minutes: 0,
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: remaining,
      caveat: {
        en: "Exceptions exist — retirement at 58, permanent emigration, or closure of the establishment. Confirm your case with EPFO.",
        hi: "अपवाद हैं — 58 वर्ष पर सेवानिवृत्ति, स्थायी रूप से विदेश जाना, या प्रतिष्ठान का बंद होना। अपना मामला EPFO से पुष्टि करें।",
      },
    },
    sourceId: "epf-form19-wait",
  };
};

const tdsWarning: RuleFn = (f) => {
  if (f.serviceYears >= 5 || f.claimAmount <= 50000) return null;
  return {
    ruleId: "R-TDS-192A",
    gate: "tax",
    severity: "warning",
    owner: "citizen",
    title: {
      en: "Tax will be deducted from this withdrawal",
      hi: "इस निकासी पर टैक्स कटेगा",
    },
    why: {
      en: `You have under five years of continuous service and are withdrawing more than ₹50,000, so TDS applies under Section 192A — 10% with a PAN on record, and a much higher rate without one. This is not a rejection; it is money you will not receive.`,
      hi: `आपकी लगातार सेवा पाँच वर्ष से कम है और आप ₹50,000 से ज़्यादा निकाल रहे हैं, इसलिए धारा 192A के तहत TDS लगेगा — PAN दर्ज होने पर 10%, और न होने पर कहीं ज़्यादा। यह ख़ारिजी नहीं है; यह वह पैसा है जो आपको नहीं मिलेगा।`,
    },
    evidence: {
      type: "value",
      aLabel: { en: "Continuous service", hi: "लगातार सेवा" },
      bLabel: { en: "PAN on record", hi: "PAN दर्ज" },
      a: `${f.serviceYears} yr`,
      b: f.panOnRecord ? "Yes" : "No",
    },
    fix: {
      summary: f.panOnRecord
        ? {
            en: "If your total income this year is below the taxable limit, submitting Form 15G with the claim removes the deduction.",
            hi: "अगर इस साल आपकी कुल आय कर-योग्य सीमा से कम है, तो दावे के साथ फ़ॉर्म 15G देने पर कटौती नहीं होगी।",
          }
        : {
            en: "Add your PAN to KYC first. Without it the deduction is at a much higher rate.",
            hi: "पहले KYC में अपना PAN जोड़ें। इसके बिना कटौती कहीं ऊँची दर से होगी।",
          },
      steps: f.panOnRecord
        ? [
            { en: "Check whether your total income this financial year is below the taxable limit.", hi: "देखें कि इस वित्त वर्ष में आपकी कुल आय कर-योग्य सीमा से कम है या नहीं।" },
            { en: "If it is, attach Form 15G (or 15H if you are a senior citizen) when you file.", hi: "अगर है, तो दावा भरते समय फ़ॉर्म 15G (वरिष्ठ नागरिक हों तो 15H) लगाएँ।" },
          ]
        : [
            { en: "Open Manage → KYC and add your PAN.", hi: "Manage → KYC खोलें और अपना PAN जोड़ें।" },
            { en: "Wait for it to show Verified, then file.", hi: "Verified दिखने का इंतज़ार करें, फिर दावा भरें।" },
          ],
      minutes: 10,
      cost: { en: "Free", hi: "निःशुल्क" },
      waitDays: 0,
      caveat: {
        en: "Tax thresholds change. Confirm the current rule before relying on this.",
        hi: "कर सीमाएँ बदलती रहती हैं। भरोसा करने से पहले मौजूदा नियम की पुष्टि करें।",
      },
    },
    sourceId: "tds-192a",
  };
};

export const RULES: RuleFn[] = [
  aadhaarSeeded,
  exitDateFiled,
  singleUan,
  nameVsAadhaar,
  dobVsAadhaar,
  bankNameMatch,
  ifscUsable,
  twoMonthWait,
  tdsWarning,
];

export const AUTOSETTLE_CEILING = 500000;

/**
 * The rule registry.
 *
 * Every id the engine can emit, with the source it rests on and where that
 * reading stands today. This is what /governance renders: a rule whose source
 * we could not re-verify is shown as `needs_review`, never silently presented
 * as current truth. `reviewedOn` is the date a human last read the source, not
 * the date the file changed.
 */
export type RuleStatus = "verified" | "needs_review" | "stale" | "deprecated" | "draft";

export interface RuleMeta {
  id: string;
  sourceId: string;
  status: RuleStatus;
  reviewedOn: string;
  /** Why this rule is not `verified`, when it is not. */
  note?: Bi;
}

export const RULE_META: RuleMeta[] = [
  { id: "R-AADHAAR-SEED", sourceId: "epfo-jd-2025", status: "needs_review", reviewedOn: "2026-08-23",
    note: { en: "Primary source did not resolve from our network; corroborated by a secondary tax alert.",
            hi: "मूल स्रोत हमारे नेटवर्क से नहीं खुला; एक द्वितीयक कर-सूचना से पुष्टि हुई।" } },
  { id: "R-EXIT-DATE", sourceId: "epfo-jd-2025", status: "needs_review", reviewedOn: "2026-08-23",
    note: { en: "Primary source did not resolve from our network; corroborated by a secondary tax alert.",
            hi: "मूल स्रोत हमारे नेटवर्क से नहीं खुला; एक द्वितीयक कर-सूचना से पुष्टि हुई।" } },
  { id: "R-MULTI-UAN", sourceId: "epfo-jd-2025", status: "needs_review", reviewedOn: "2026-08-23" },
  { id: "R-NAME-AADHAAR", sourceId: "epfo-jd-deloitte", status: "verified", reviewedOn: "2026-08-23" },
  { id: "R-DOB-AADHAAR", sourceId: "epfo-jd-deloitte", status: "verified", reviewedOn: "2026-08-23" },
  { id: "R-BANK-NAME", sourceId: "epfo-rejections", status: "verified", reviewedOn: "2026-08-23" },
  { id: "R-IFSC", sourceId: "ifsc-mergers", status: "verified", reviewedOn: "2026-08-23" },
  { id: "R-WAIT-60D", sourceId: "epf-form19-wait", status: "needs_review", reviewedOn: "2026-08-23",
    note: { en: "Consistent across practitioner guides but not checked against the bare text of the EPF Scheme, 1952.",
            hi: "कई व्यावसायिक मार्गदर्शिकाओं में एक जैसा, पर EPF योजना 1952 के मूल पाठ से मिलान नहीं किया गया।" } },
  { id: "R-TDS-192A", sourceId: "tds-192a", status: "needs_review", reviewedOn: "2026-08-23",
    note: { en: "Sources disagree on a legacy Rs 30,000 threshold that predates the 2016 amendment. We apply Rs 50,000.",
            hi: "2016 के संशोधन से पहले की Rs 30,000 सीमा पर स्रोत असहमत हैं। हम Rs 50,000 लागू करते हैं।" } },
  { id: "R-AUTOSETTLE", sourceId: "epfo-autosettle", status: "stale", reviewedOn: "2026-08-23",
    note: { en: "Auto-settlement ceilings change without a circular. Treat the figure as indicative.",
            hi: "ऑटो-सेटलमेंट की सीमाएँ बिना परिपत्र के बदलती रहती हैं। इस आँकड़े को सांकेतिक मानें।" } },
];

/** Every id the engine can emit, in evaluation order. */
export const RULE_IDS: string[] = RULE_META.map((r) => r.id);

/** A rule is only as fresh as the source under it. */
export function ruleMeta(id: string): RuleMeta | undefined {
  return RULE_META.find((r) => r.id === id);
}
