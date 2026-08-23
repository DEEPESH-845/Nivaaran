import type { Bi, Facts } from "@/lib/rules/types";

export interface Option {
  value: string;
  label: Bi;
  hint?: Bi;
  apply: (f: Facts) => Facts;
}

export interface Question {
  id: string;
  prompt: Bi;
  help?: Bi;
  options: Option[];
  /** Which option currently reflects the facts, so answers can be revisited. */
  current: (f: Facts) => string;
}

const set = <K extends keyof Facts>(key: K, value: Facts[K]) => (f: Facts) => ({
  ...f,
  [key]: value,
});

export const QUESTIONS: Question[] = [
  {
    id: "left",
    prompt: {
      en: "When was your last working day at that job?",
      hi: "उस नौकरी में आपका अंतिम कार्यदिवस कब था?",
    },
    help: {
      en: "A final settlement can only be filed after two continuous months of unemployment, so the date decides whether you are eligible yet.",
      hi: "अंतिम निपटान का दावा लगातार दो महीने बेरोज़गार रहने के बाद ही भरा जा सकता है, इसलिए तारीख़ से तय होता है कि आप अभी पात्र हैं या नहीं।",
    },
    options: [
      { value: "recent", label: { en: "Less than a month ago", hi: "एक महीने से कम पहले" }, apply: set("daysSinceExit", 20) },
      { value: "1to2", label: { en: "One to two months ago", hi: "एक से दो महीने पहले" }, apply: set("daysSinceExit", 45) },
      { value: "2to6", label: { en: "Two to six months ago", hi: "दो से छह महीने पहले" }, apply: set("daysSinceExit", 95) },
      { value: "older", label: { en: "More than six months ago", hi: "छह महीने से ज़्यादा पहले" }, apply: set("daysSinceExit", 240) },
    ],
    current: (f) =>
      f.daysSinceExit < 30 ? "recent" : f.daysSinceExit < 60 ? "1to2" : f.daysSinceExit < 180 ? "2to6" : "older",
  },
  {
    id: "exit",
    prompt: {
      en: "Has your employer recorded your date of exit with EPFO?",
      hi: "क्या आपके नियोक्ता ने EPFO में आपकी नौकरी छोड़ने की तारीख़ दर्ज कर दी है?",
    },
    help: {
      en: "Until an exit date exists, EPFO believes you are still employed — and a final settlement for a currently-employed member is rejected by design. Most people have no idea whether this was done.",
      hi: "जब तक एग्ज़िट तारीख़ दर्ज न हो, EPFO मानता है कि आप अब भी नौकरी में हैं — और कार्यरत सदस्य का अंतिम दावा नियमतः ख़ारिज होता है। ज़्यादातर लोगों को पता ही नहीं होता कि यह हुआ या नहीं।",
    },
    options: [
      { value: "yes", label: { en: "Yes, it shows in my service history", hi: "हाँ, यह मेरी सर्विस हिस्ट्री में दिखता है" }, apply: set("exitDateFiled", "yes") },
      { value: "no", label: { en: "No, they haven't done it", hi: "नहीं, उन्होंने नहीं किया" }, apply: set("exitDateFiled", "no") },
      { value: "unsure", label: { en: "I'm not sure", hi: "मुझे निवारण नहीं पता" }, hint: { en: "Most common answer — we'll treat it as a risk", hi: "सबसे आम जवाब — हम इसे जोखिम मानेंगे" }, apply: set("exitDateFiled", "unsure") },
    ],
    current: (f) => f.exitDateFiled,
  },
  {
    id: "aadhaar",
    prompt: {
      en: "Is your UAN linked and verified with Aadhaar?",
      hi: "क्या आपका UAN आधार से जुड़ा और सत्यापित है?",
    },
    help: {
      en: "This one answer decides whether you can correct your own records or need your employer's signature on every change. It is the difference between ten minutes and several weeks.",
      hi: "इसी एक जवाब से तय होता है कि आप अपने रिकॉर्ड ख़ुद सुधार सकते हैं या हर बदलाव पर नियोक्ता के दस्तख़त चाहिए। यही दस मिनट और कई हफ़्तों का फ़र्क़ है।",
    },
    options: [
      { value: "yes", label: { en: "Yes, KYC shows Verified", hi: "हाँ, KYC में Verified दिखता है" }, apply: set("uanAadhaarVerified", "yes") },
      { value: "no", label: { en: "No, or it was rejected", hi: "नहीं, या वह ख़ारिज हो गया था" }, apply: set("uanAadhaarVerified", "no") },
      { value: "unsure", label: { en: "I'm not sure", hi: "मुझे निवारण नहीं पता" }, apply: set("uanAadhaarVerified", "unsure") },
    ],
    current: (f) => f.uanAadhaarVerified,
  },
  {
    id: "service",
    prompt: {
      en: "How long did you contribute to PF in total?",
      hi: "कुल मिलाकर आपने कितने समय तक PF में योगदान किया?",
    },
    help: {
      en: "Five years of continuous service is the line at which withdrawal stops being taxable. Below it, tax is deducted at source from what you receive.",
      hi: "लगातार पाँच वर्ष की सेवा वह रेखा है जिसके बाद निकासी पर कर नहीं लगता। इससे कम पर मिलने वाली रक़म से स्रोत पर ही कर कट जाता है।",
    },
    options: [
      { value: "under5", label: { en: "Less than 5 years", hi: "5 वर्ष से कम" }, apply: set("serviceYears", 3) },
      { value: "over5", label: { en: "5 years or more", hi: "5 वर्ष या उससे ज़्यादा" }, apply: set("serviceYears", 8) },
    ],
    current: (f) => (f.serviceYears < 5 ? "under5" : "over5"),
  },
  {
    id: "amount",
    prompt: {
      en: "Roughly how much is in the account?",
      hi: "खाते में लगभग कितनी रक़म है?",
    },
    help: {
      en: "Claims up to ₹5 lakh can be settled automatically without a human reviewer — but only if nothing else in your record is wrong.",
      hi: "₹5 लाख तक के दावे बिना किसी मानवीय जाँच के अपने आप निपट सकते हैं — पर तभी, जब आपके रिकॉर्ड में और कुछ ग़लत न हो।",
    },
    options: [
      { value: "small", label: { en: "Under ₹50,000", hi: "₹50,000 से कम" }, apply: set("claimAmount", 35000) },
      { value: "mid", label: { en: "₹50,000 to ₹5 lakh", hi: "₹50,000 से ₹5 लाख" }, apply: set("claimAmount", 142000) },
      { value: "large", label: { en: "More than ₹5 lakh", hi: "₹5 लाख से ज़्यादा" }, apply: set("claimAmount", 700000) },
    ],
    current: (f) => (f.claimAmount <= 50000 ? "small" : f.claimAmount <= 500000 ? "mid" : "large"),
  },
];
