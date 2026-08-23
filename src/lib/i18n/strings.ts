import type { Bi } from "@/lib/rules/types";

export type UiKey = keyof typeof UI;

/** Chrome and navigation copy. Domain copy lives with the rules, already bilingual. */
export const UI = {
  brand: { en: "Nivaaran", hi: "निवारण" },
  tagline: {
    en: "Know your PF claim will go through — before you file it.",
    hi: "दावा भरने से पहले ही जान लें कि वह मंज़ूर होगा या नहीं।",
  },
  notOfficial: {
    en: "Independent hackathon prototype. Not affiliated with EPFO or the Government of India. All data here is synthetic.",
    hi: "स्वतंत्र हैकथॉन प्रोटोटाइप। EPFO या भारत सरकार से कोई संबंध नहीं। यहाँ का सारा डेटा काल्पनिक है।",
  },
  demoData: { en: "Demonstration data", hi: "प्रदर्शन डेटा" },
  langLabel: { en: "हिंदी", hi: "English" },
  back: { en: "Back", hi: "पीछे" },
  continue: { en: "Continue", hi: "आगे बढ़ें" },
  notSure: { en: "I'm not sure", hi: "मुझे निवारण नहीं पता" },
  yes: { en: "Yes", hi: "हाँ" },
  no: { en: "No", hi: "नहीं" },
  startOver: { en: "Start over", hi: "फिर से शुरू करें" },
  whyThisMatters: { en: "Why this matters", hi: "यह क्यों ज़रूरी है" },
  howToFix: { en: "How to fix it", hi: "इसे कैसे ठीक करें" },
  whoFixes: { en: "Whose job", hi: "किसका काम" },
  source: { en: "Source", hi: "स्रोत" },
  verified: { en: "Verified", hi: "सत्यापित" },
  confidence: { en: "Confidence", hi: "विश्वसनीयता" },
  explainSimply: { en: "Explain this simply", hi: "आसान भाषा में समझाएँ" },
  step: { en: "Step", hi: "चरण" },
  of: { en: "of", hi: "में से" },
  minutes: { en: "min", hi: "मिनट" },
  free: { en: "Free", hi: "निःशुल्क" },
  owner_citizen: { en: "You can fix this", hi: "आप ठीक कर सकते हैं" },
  owner_employer: { en: "Your employer must do this", hi: "यह नियोक्ता को करना होगा" },
  owner_epfo: { en: "EPFO handles this", hi: "यह EPFO करता है" },
  owner_time: { en: "Only time fixes this", hi: "इसे सिर्फ़ समय ठीक करेगा" },
  sev_blocker: { en: "Will stop your claim", hi: "आपका दावा रोक देगा" },
  sev_warning: { en: "Worth knowing", hi: "जानना ज़रूरी" },
  sev_info: { en: "Good news", hi: "अच्छी ख़बर" },
} as const satisfies Record<string, Bi>;

export function pick(bi: Bi, lang: "en" | "hi"): string {
  return bi[lang] || bi.en;
}
