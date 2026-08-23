import type { Bi } from "@/lib/rules/types";

/**
 * Prototype interaction analysis.
 *
 * Not user research. Counts for the EPFO journey are derived from its
 * documented public flow and official step-by-step guidance — we did not and
 * may not walk through a live government system. Counts for Nivaaran are measured
 * from this build. Nobody has been observed using either.
 *
 * The formula is published so the score can be argued with:
 *
 *   score = 10 · Σ(weightᵢ · min(countᵢ / capᵢ, 1)) / Σ weightᵢ
 */
export interface Dimension {
  id: string;
  label: Bi;
  /** What the count means, so a reader can recount it themselves. */
  definition: Bi;
  weight: number;
  cap: number;
  epfo: number;
  nivaaran: number;
  /** Nivaaran with a real record read behind a real login. */
  nivaaranReal: number;
  /** True when a higher number is better, so the table can say so. */
  higherIsBetter?: boolean;
}

export const DIMENSIONS: Dimension[] = [
  {
    id: "fields",
    label: { en: "Fields you must type", hi: "टाइप करने वाले खाने" },
    definition: {
      en: "Free-text or numeric inputs, including credentials and OTPs.",
      hi: "टाइप करके भरने वाले खाने, लॉगिन और OTP सहित।",
    },
    weight: 1.5, cap: 20, epfo: 14, nivaaran: 0, nivaaranReal: 2,
  },
  {
    id: "decisions",
    label: { en: "Decisions you must make", hi: "आपको लेने वाले निर्णय" },
    definition: {
      en: "Points where you must choose between options to proceed.",
      hi: "जहाँ आगे बढ़ने के लिए विकल्पों में से चुनना पड़े।",
    },
    weight: 1.0, cap: 10, epfo: 6, nivaaran: 5, nivaaranReal: 5,
  },
  {
    id: "terms",
    label: { en: "Terms shown without explanation", hi: "बिना समझाए दिखाए गए शब्द" },
    definition: {
      en: "Form numbers and departmental vocabulary presented with no inline definition.",
      hi: "फ़ॉर्म नंबर और विभागीय शब्द, जिनका अर्थ वहीं नहीं बताया जाता।",
    },
    weight: 1.5, cap: 10, epfo: 7, nivaaran: 0, nivaaranReal: 0,
  },
  {
    id: "auth",
    label: { en: "Authentication interruptions", hi: "लॉगिन/OTP में रुकावटें" },
    definition: {
      en: "Password, captcha and OTP gates before you can see anything.",
      hi: "कुछ भी देखने से पहले पासवर्ड, कैप्चा और OTP की बाधाएँ।",
    },
    weight: 1.5, cap: 4, epfo: 3, nivaaran: 0, nivaaranReal: 1,
  },
  {
    id: "deadends",
    label: { en: "Dead ends with no fix path", hi: "बिना रास्ते वाले मृत छोर" },
    definition: {
      en: "States where you are stopped and given no next action inside the product.",
      hi: "जहाँ आप रुक जाते हैं और उत्पाद के भीतर आगे का कोई रास्ता नहीं मिलता।",
    },
    weight: 2.5, cap: 5, epfo: 4, nivaaran: 0, nivaaranReal: 1,
  },
  {
    id: "daystoknow",
    label: { en: "Days until you learn it failed", hi: "फ़ेल होने का पता चलने में दिन" },
    definition: {
      en: "Elapsed days between submitting and being told the claim will not go through.",
      hi: "दावा भेजने और यह पता चलने के बीच के दिन कि वह मंज़ूर नहीं होगा।",
    },
    weight: 2.0, cap: 30, epfo: 20, nivaaran: 0, nivaaranReal: 0,
  },
];

export type Column = "epfo" | "nivaaran" | "nivaaranReal";

export function frictionScore(column: Column): number {
  const totalWeight = DIMENSIONS.reduce((s, d) => s + d.weight, 0);
  const weighted = DIMENSIONS.reduce(
    (s, d) => s + d.weight * Math.min(d[column] / d.cap, 1),
    0,
  );
  return Math.round((10 * weighted) / totalWeight * 10) / 10;
}

/** Dimensions where we are honestly no better, or worse. */
export const HONEST_LOSSES: { label: Bi; detail: Bi }[] = [
  {
    label: { en: "We use more screens, not fewer", hi: "हम ज़्यादा स्क्रीन इस्तेमाल करते हैं, कम नहीं" },
    detail: {
      en: "The EPFO claim path is roughly nine screens. Ours is about ten. We deliberately spend screens on explanation and on the pre-flight check, because a tenth screen today is cheaper than a twenty-day rejection later. Fewer screens is not the goal; fewer failures is.",
      hi: "EPFO का दावा रास्ता लगभग नौ स्क्रीन का है। हमारा लगभग दस का। हम जान-बूझकर स्क्रीन समझाने और प्री-फ़्लाइट जाँच पर ख़र्च करते हैं, क्योंकि आज की एक अतिरिक्त स्क्रीन बीस दिन बाद की ख़ारिजी से सस्ती है। लक्ष्य कम स्क्रीन नहीं, कम नाकामी है।",
    },
  },
  {
    label: { en: "We cannot read your real record", hi: "हम आपका असली रिकॉर्ड नहीं पढ़ सकते" },
    detail: {
      en: "A production version would need an authenticated read of your EPFO record, which adds a login we do not have here. That is why the table shows a third column with that cost added back in.",
      hi: "असली संस्करण को आपका EPFO रिकॉर्ड प्रमाणित रूप से पढ़ना होगा, जिसके लिए एक लॉगिन जोड़ना पड़ेगा जो यहाँ नहीं है। इसीलिए तालिका में तीसरा स्तंभ है, जिसमें वह लागत वापस जोड़ी गई है।",
    },
  },
  {
    label: { en: "An employer blocker still stops you", hi: "नियोक्ता वाली रुकावट अब भी रोकती है" },
    detail: {
      en: "When your exit date is missing and you are not Aadhaar-verified, we can tell you precisely what to ask for and from whom — but we cannot make it happen. That dead end is real and we count it.",
      hi: "जब एग्ज़िट तारीख़ दर्ज न हो और आप आधार-सत्यापित न हों, हम ठीक-ठीक बता सकते हैं कि किससे क्या माँगना है — पर करा नहीं सकते। वह मृत छोर असली है और हम उसे गिनते हैं।",
    },
  },
];
